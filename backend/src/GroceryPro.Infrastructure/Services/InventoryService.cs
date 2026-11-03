using GroceryPro.Application.DTOs;
using GroceryPro.Application.Interfaces;
using GroceryPro.Domain.Entities;
using GroceryPro.Domain.Enums;
using GroceryPro.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GroceryPro.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly GroceryProDbContext _context;

    public InventoryService(GroceryProDbContext context)
    {
        _context = context;
    }

    public async Task<List<StockBalanceDto>> GetStockBalancesAsync(Guid locationId, string? search = null, bool lowStockOnly = false)
    {
        var query = _context.StockBalances
            .Include(sb => sb.Location)
            .Include(sb => sb.Product)
                .ThenInclude(p => p.Category)
            .Include(sb => sb.Product)
                .ThenInclude(p => p.Unit)
            .Where(sb => sb.LocationId == locationId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            string term = search.Trim().ToLower();
            query = query.Where(sb => sb.Product.Sku.ToLower().Contains(term)
                                   || sb.Product.NameEn.ToLower().Contains(term)
                                   || sb.Product.NameSi.ToLower().Contains(term)
                                   || sb.Product.Barcodes.Any(b => b.Barcode.Contains(term)));
        }

        if (lowStockOnly)
        {
            query = query.Where(sb => sb.QuantityOnHand <= sb.Product.ReorderLevel);
        }

        var list = await query
            .OrderBy(sb => sb.Product.NameEn)
            .ToListAsync();

        return list.Select(sb => new StockBalanceDto
        {
            Id = sb.Id,
            LocationId = sb.LocationId,
            LocationName = sb.Location.NameEn,
            ProductId = sb.ProductId,
            Sku = sb.Product.Sku,
            NameEn = sb.Product.NameEn,
            NameSi = sb.Product.NameSi,
            CategoryName = sb.Product.Category?.NameEn ?? "General",
            UnitCode = sb.Product.Unit.Code,
            QuantityOnHand = sb.QuantityOnHand,
            ReorderLevel = sb.Product.ReorderLevel,
            AverageCostPrice = sb.AverageCostPrice,
            BatchNumber = sb.BatchNumber,
            ExpiryDate = sb.ExpiryDate
        }).ToList();
    }

    public async Task<List<StockTransactionDto>> GetStockLedgerAsync(Guid locationId, Guid? productId = null, DateTime? fromDate = null, DateTime? toDate = null)
    {
        var query = _context.StockTransactions
            .Include(st => st.Product)
            .Where(st => st.LocationId == locationId);

        if (productId.HasValue)
        {
            query = query.Where(st => st.ProductId == productId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(st => st.CreatedAtUtc >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(st => st.CreatedAtUtc <= toDate.Value);
        }

        var list = await query
            .OrderByDescending(st => st.CreatedAtUtc)
            .Take(500)
            .ToListAsync();

        return list.Select(st => new StockTransactionDto
        {
            Id = st.Id,
            CreatedAtUtc = st.CreatedAtUtc,
            Sku = st.Product.Sku,
            ProductNameEn = st.Product.NameEn,
            TransactionType = st.TransactionType.ToString(),
            QuantityChange = st.QuantityChange,
            ResultingBalance = st.ResultingBalance,
            UnitCost = st.UnitCost,
            TotalCost = st.TotalCost,
            ReferenceType = st.ReferenceType,
            ReferenceNumber = st.ReferenceNumber,
            Notes = st.Notes
        }).ToList();
    }

    public async Task<StockAdjustment> ProcessStockAdjustmentAsync(StockAdjustmentRequestDto request, Guid userId, Guid locationId)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var tx = await _context.Database.BeginTransactionAsync();

        string datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        int count = await _context.StockAdjustments.CountAsync(sa => sa.AdjustmentNumber.StartsWith($"ADJ-{datePrefix}-"));
        string adjNumber = $"ADJ-{datePrefix}-{(count + 1):D4}";

        var user = await _context.Users.FindAsync(userId);

        var adjustment = new StockAdjustment
        {
            AdjustmentNumber = adjNumber,
            LocationId = locationId,
            Reason = request.Reason,
            Notes = request.Notes,
            IsApproved = true,
            ApprovedAtUtc = DateTime.UtcNow,
            ApprovedBy = user?.Username ?? "System"
        };

        foreach (var item in request.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId)
                ?? throw new KeyNotFoundException($"Product {item.ProductId} not found");

            var stockBalance = await _context.StockBalances
                .FirstOrDefaultAsync(sb => sb.LocationId == locationId && sb.ProductId == item.ProductId && sb.BatchNumber == item.BatchNumber);

            decimal systemQty = stockBalance?.QuantityOnHand ?? 0m;
            decimal diff = item.PhysicalQuantity - systemQty;

            var adjItem = new StockAdjustmentItem
            {
                StockAdjustment = adjustment,
                ProductId = item.ProductId,
                BatchNumber = item.BatchNumber,
                SystemQuantity = systemQty,
                PhysicalQuantity = item.PhysicalQuantity,
                UnitCost = stockBalance?.AverageCostPrice ?? product.CostPrice,
                ReasonDetails = item.ReasonDetails
            };
            adjustment.Items.Add(adjItem);

            if (stockBalance == null)
            {
                stockBalance = new StockBalance
                {
                    LocationId = locationId,
                    ProductId = item.ProductId,
                    BatchNumber = item.BatchNumber,
                    QuantityOnHand = item.PhysicalQuantity,
                    AverageCostPrice = product.CostPrice
                };
                _context.StockBalances.Add(stockBalance);
            }
            else
            {
                stockBalance.QuantityOnHand = item.PhysicalQuantity;
            }

            var transactionType = diff >= 0
                ? StockTransactionType.AdjustmentIncrease
                : (request.Reason == StockAdjustmentReason.Damage ? StockTransactionType.Damage : StockTransactionType.AdjustmentDecrease);

            var stockTx = new StockTransaction
            {
                LocationId = locationId,
                ProductId = item.ProductId,
                BatchNumber = item.BatchNumber,
                TransactionType = transactionType,
                QuantityChange = diff,
                ResultingBalance = stockBalance.QuantityOnHand,
                UnitCost = stockBalance.AverageCostPrice,
                ReferenceType = "Adjustment",
                ReferenceNumber = adjNumber,
                Notes = $"{request.Reason}: {item.ReasonDetails}"
            };
            _context.StockTransactions.Add(stockTx);
        }

        _context.StockAdjustments.Add(adjustment);
        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        return adjustment;
        });
    }

    public async Task<StockBalanceDto> RecordStockIntakeAsync(StockIntakeRequestDto request, Guid userId, Guid locationId)
    {
        if (request.QuantityReceived <= 0)
        {
            throw new ArgumentException("Quantity received must be greater than zero.");
        }

        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Unit)
            .FirstOrDefaultAsync(p => p.Id == request.ProductId)
            ?? throw new KeyNotFoundException($"Product {request.ProductId} not found.");

        string batch = string.IsNullOrWhiteSpace(request.BatchNumber)
            ? $"INTAKE-{DateTime.UtcNow:yyyyMMdd}"
            : request.BatchNumber.Trim();

        decimal unitCost = request.UnitCost.HasValue && request.UnitCost.Value > 0
            ? request.UnitCost.Value
            : product.CostPrice;

        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var tx = await _context.Database.BeginTransactionAsync();

            var balance = await _context.StockBalances
                .FirstOrDefaultAsync(sb => sb.LocationId == locationId && sb.ProductId == request.ProductId && sb.BatchNumber == batch);

            if (balance == null)
            {
                balance = new StockBalance
                {
                    LocationId = locationId,
                    ProductId = product.Id,
                    BatchNumber = batch,
                    ExpiryDate = request.ExpiryDate,
                    QuantityOnHand = request.QuantityReceived,
                    AverageCostPrice = unitCost,
                    LastRestockedAtUtc = DateTime.UtcNow
                };
                _context.StockBalances.Add(balance);
            }
            else
            {
                decimal currentTotalCost = balance.QuantityOnHand * balance.AverageCostPrice;
                decimal newCost = request.QuantityReceived * unitCost;
                decimal totalQty = balance.QuantityOnHand + request.QuantityReceived;

                if (totalQty > 0)
                {
                    balance.AverageCostPrice = (currentTotalCost + newCost) / totalQty;
                }
                balance.QuantityOnHand += request.QuantityReceived;
                if (request.ExpiryDate.HasValue) balance.ExpiryDate = request.ExpiryDate.Value;
                balance.LastRestockedAtUtc = DateTime.UtcNow;
            }

            if (request.UnitCost.HasValue && request.UnitCost.Value > 0)
            {
                product.CostPrice = request.UnitCost.Value;
            }

            string refNumber = $"RCV-{DateTime.UtcNow:yyyyMMdd-HHmmss}";
            var stockTx = new StockTransaction
            {
                LocationId = locationId,
                ProductId = product.Id,
                BatchNumber = batch,
                ExpiryDate = balance.ExpiryDate,
                TransactionType = StockTransactionType.PurchaseReceived,
                QuantityChange = request.QuantityReceived,
                ResultingBalance = balance.QuantityOnHand,
                UnitCost = unitCost,
                ReferenceType = "StockIntake",
                ReferenceNumber = refNumber,
                Notes = string.IsNullOrWhiteSpace(request.Notes)
                    ? $"Scanned barcode intake of {request.QuantityReceived} {product.Unit.Code}"
                    : request.Notes
            };
            _context.StockTransactions.Add(stockTx);

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            var location = await _context.Locations.FindAsync(locationId);

            return new StockBalanceDto
            {
                Id = balance.Id,
                LocationId = locationId,
                LocationName = location?.NameEn ?? "Store",
                ProductId = product.Id,
                Sku = product.Sku,
                NameEn = product.NameEn,
                NameSi = product.NameSi,
                CategoryName = product.Category?.NameEn ?? string.Empty,
                UnitCode = product.Unit?.Code ?? string.Empty,
                QuantityOnHand = balance.QuantityOnHand,
                ReorderLevel = product.ReorderLevel,
                AverageCostPrice = balance.AverageCostPrice,
                BatchNumber = balance.BatchNumber,
                ExpiryDate = balance.ExpiryDate
            };
        });
    }

    public async Task<List<StockBalanceDto>> GetLowStockAlertsAsync(Guid locationId)
    {
        return await GetStockBalancesAsync(locationId, null, lowStockOnly: true);
    }
}
