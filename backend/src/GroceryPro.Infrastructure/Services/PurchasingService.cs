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

public class PurchasingService : IPurchasingService
{
    private readonly GroceryProDbContext _context;

    public PurchasingService(GroceryProDbContext context)
    {
        _context = context;
    }

    public async Task<Purchase> CreatePurchaseOrderAsync(PurchaseCreateDto dto, Guid userId, Guid locationId)
    {
        string datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        int count = await _context.Purchases.CountAsync(p => p.PurchaseNumber.StartsWith($"PO-{datePrefix}-"));
        string poNumber = $"PO-{datePrefix}-{(count + 1):D4}";

        var purchase = new Purchase
        {
            PurchaseNumber = poNumber,
            SupplierInvoiceNumber = dto.SupplierInvoiceNumber,
            SupplierId = dto.SupplierId,
            LocationId = locationId,
            InvoiceDate = dto.InvoiceDate,
            DiscountAmount = dto.DiscountAmount,
            Notes = dto.Notes,
            Status = PurchaseStatus.Draft
        };

        decimal subtotal = 0m;
        foreach (var item in dto.Items)
        {
            var pItem = new PurchaseItem
            {
                Purchase = purchase,
                ProductId = item.ProductId,
                QuantityOrdered = item.QuantityOrdered,
                QuantityReceived = 0m,
                UnitCost = item.UnitCost,
                BatchNumber = string.IsNullOrWhiteSpace(item.BatchNumber) ? "DEFAULT" : item.BatchNumber,
                ExpiryDate = item.ExpiryDate
            };
            purchase.Items.Add(pItem);
            subtotal += item.QuantityOrdered * item.UnitCost;
        }

        purchase.SubTotal = subtotal;
        purchase.GrandTotal = Math.Max(0m, subtotal - dto.DiscountAmount);

        _context.Purchases.Add(purchase);
        await _context.SaveChangesAsync();

        return purchase;
    }

    public async Task<Purchase> ReceiveGoodsAsync(Guid purchaseId, GoodsReceivedDto dto, Guid userId, Guid locationId)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var tx = await _context.Database.BeginTransactionAsync();

        var purchase = await _context.Purchases
            .Include(p => p.Items)
                .ThenInclude(i => i.Product)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == purchaseId)
            ?? throw new KeyNotFoundException($"Purchase {purchaseId} not found");

        if (purchase.Status == PurchaseStatus.Received)
        {
            throw new InvalidOperationException("This purchase order has already been marked as received.");
        }

        decimal actualSubTotal = 0m;

        foreach (var recItem in dto.Items)
        {
            var pItem = purchase.Items.FirstOrDefault(i => i.Id == recItem.PurchaseItemId)
                ?? throw new KeyNotFoundException($"Purchase item {recItem.PurchaseItemId} not found");

            pItem.QuantityReceived = recItem.QuantityReceived;
            pItem.UnitCost = recItem.UnitCost;
            pItem.BatchNumber = string.IsNullOrWhiteSpace(recItem.BatchNumber) ? pItem.BatchNumber : recItem.BatchNumber;
            pItem.ExpiryDate = recItem.ExpiryDate ?? pItem.ExpiryDate;

            actualSubTotal += pItem.QuantityReceived * pItem.UnitCost;

            if (pItem.QuantityReceived > 0)
            {
                // Update stock balance
                var balance = await _context.StockBalances
                    .FirstOrDefaultAsync(sb => sb.LocationId == locationId && sb.ProductId == pItem.ProductId && sb.BatchNumber == pItem.BatchNumber);

                if (balance == null)
                {
                    balance = new StockBalance
                    {
                        LocationId = locationId,
                        ProductId = pItem.ProductId,
                        BatchNumber = pItem.BatchNumber,
                        ExpiryDate = pItem.ExpiryDate,
                        QuantityOnHand = pItem.QuantityReceived,
                        AverageCostPrice = pItem.UnitCost,
                        LastRestockedAtUtc = DateTime.UtcNow
                    };
                    _context.StockBalances.Add(balance);
                }
                else
                {
                    // Weighted-average cost update
                    decimal currentTotalCost = balance.QuantityOnHand * balance.AverageCostPrice;
                    decimal newTotalCost = pItem.QuantityReceived * pItem.UnitCost;
                    decimal totalQuantity = balance.QuantityOnHand + pItem.QuantityReceived;

                    if (totalQuantity > 0)
                    {
                        balance.AverageCostPrice = (currentTotalCost + newTotalCost) / totalQuantity;
                    }
                    balance.QuantityOnHand += pItem.QuantityReceived;
                    balance.ExpiryDate = pItem.ExpiryDate ?? balance.ExpiryDate;
                    balance.LastRestockedAtUtc = DateTime.UtcNow;
                }

                // Update product master CostPrice
                pItem.Product.CostPrice = pItem.UnitCost;

                // Record StockTransaction
                var stockTx = new StockTransaction
                {
                    LocationId = locationId,
                    ProductId = pItem.ProductId,
                    BatchNumber = pItem.BatchNumber,
                    ExpiryDate = pItem.ExpiryDate,
                    TransactionType = StockTransactionType.PurchaseReceived,
                    QuantityChange = pItem.QuantityReceived,
                    ResultingBalance = balance.QuantityOnHand,
                    UnitCost = pItem.UnitCost,
                    ReferenceType = "Purchase",
                    ReferenceNumber = purchase.PurchaseNumber,
                    Notes = $"GRN received against {purchase.PurchaseNumber}"
                };
                _context.StockTransactions.Add(stockTx);
            }
        }

        purchase.SubTotal = actualSubTotal;
        purchase.GrandTotal = Math.Max(0, actualSubTotal - purchase.DiscountAmount);
        purchase.Status = PurchaseStatus.Received;
        purchase.ReceivedDateUtc = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
        {
            purchase.Notes = string.IsNullOrWhiteSpace(purchase.Notes) ? dto.Notes : $"{purchase.Notes} | {dto.Notes}";
        }

        // Increment supplier balance
        purchase.Supplier.CurrentBalance += purchase.GrandTotal;

        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        return purchase;
        });
    }

    public async Task<SupplierPayment> RecordSupplierPaymentAsync(SupplierPaymentCreateDto dto, Guid userId)
    {
        var supplier = await _context.Suppliers.FindAsync(dto.SupplierId)
            ?? throw new KeyNotFoundException($"Supplier {dto.SupplierId} not found");

        var payment = new SupplierPayment
        {
            SupplierId = dto.SupplierId,
            PurchaseId = dto.PurchaseId,
            Amount = dto.Amount,
            PaymentMethod = dto.PaymentMethod,
            ReferenceNumber = dto.ReferenceNumber,
            Notes = dto.Notes,
            PaymentDateUtc = DateTime.UtcNow
        };

        supplier.CurrentBalance = Math.Max(0m, supplier.CurrentBalance - dto.Amount);

        if (dto.PurchaseId.HasValue)
        {
            var purchase = await _context.Purchases.FindAsync(dto.PurchaseId.Value);
            if (purchase != null)
            {
                purchase.PaidAmount += dto.Amount;
            }
        }

        _context.SupplierPayments.Add(payment);
        await _context.SaveChangesAsync();

        return payment;
    }

    public async Task<List<Purchase>> GetPurchasesAsync(Guid locationId, Guid? supplierId = null)
    {
        var query = _context.Purchases
            .Include(p => p.Supplier)
            .Include(p => p.Items)
                .ThenInclude(i => i.Product)
            .Where(p => p.LocationId == locationId);

        if (supplierId.HasValue)
        {
            query = query.Where(p => p.SupplierId == supplierId.Value);
        }

        return await query.OrderByDescending(p => p.CreatedAtUtc).ToListAsync();
    }

    public async Task<Purchase?> GetPurchaseByIdAsync(Guid purchaseId)
    {
        return await _context.Purchases
            .Include(p => p.Supplier)
            .Include(p => p.Items)
                .ThenInclude(i => i.Product)
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.Id == purchaseId);
    }
}
