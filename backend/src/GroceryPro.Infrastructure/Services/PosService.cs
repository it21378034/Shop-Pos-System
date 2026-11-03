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

public class PosService : IPosService
{
    private readonly GroceryProDbContext _context;
    private readonly IBarcodeService _barcodeService;

    public PosService(GroceryProDbContext context, IBarcodeService barcodeService)
    {
        _context = context;
        _barcodeService = barcodeService;
    }

    public async Task<ReceiptDto> ProcessCheckoutAsync(CheckoutRequestDto request, Guid cashierId, Guid locationId)
    {
        if (request.Items == null || !request.Items.Any())
        {
            throw new ArgumentException("Cart cannot be empty for checkout.");
        }

        // 1. Check idempotency key
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existingSale = await _context.Sales
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.IdempotencyKey == request.IdempotencyKey);

            if (existingSale != null)
            {
                return await GetReceiptAsync(existingSale.Id);
            }
        }

        // 2. Begin database transaction with execution strategy
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
            var location = await _context.Locations.FindAsync(locationId)
                ?? throw new KeyNotFoundException("Location not found");

            var cashier = await _context.Users.FindAsync(cashierId)
                ?? throw new KeyNotFoundException("Cashier not found");

            // Generate next invoice number: INV-YYYYMMDD-XXXX
            string datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
            int todaySaleCount = await _context.Sales
                .CountAsync(s => s.InvoiceNumber.StartsWith($"INV-{datePrefix}-"));
            string invoiceNumber = $"INV-{datePrefix}-{(todaySaleCount + 1):D4}";

            var sale = new Sale
            {
                InvoiceNumber = invoiceNumber,
                IdempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? Guid.NewGuid().ToString() : request.IdempotencyKey,
                LocationId = locationId,
                CashierId = cashierId,
                CustomerId = request.CustomerId,
                CashSessionId = request.CashSessionId,
                TerminalId = request.TerminalId,
                DiscountAmount = request.OverallDiscountAmount,
                Notes = request.Notes,
                Status = SaleStatus.Completed
            };

            decimal calculatedSubTotal = 0m;
            decimal totalLineDiscounts = 0m;

            var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Include(p => p.Unit)
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            foreach (var cartItem in request.Items)
            {
                if (!products.TryGetValue(cartItem.ProductId, out var product))
                {
                    throw new KeyNotFoundException($"Product with ID {cartItem.ProductId} not found.");
                }

                if (cartItem.Quantity <= 0)
                {
                    throw new ArgumentException($"Invalid quantity {cartItem.Quantity} for product {product.NameEn}");
                }

                decimal unitPrice = cartItem.UnitPrice > 0 ? cartItem.UnitPrice : product.SellingPrice;
                decimal grossLine = cartItem.Quantity * unitPrice;
                decimal lineDiscount = cartItem.DiscountAmount;
                if (cartItem.DiscountPercentage > 0)
                {
                    lineDiscount += (grossLine * (cartItem.DiscountPercentage / 100m));
                }
                decimal lineTotal = Math.Max(0, grossLine - lineDiscount);

                calculatedSubTotal += grossLine;
                totalLineDiscounts += lineDiscount;

                // FEFO stock deduction: query stock balances for product at location
                var stockBalances = await _context.StockBalances
                    .Where(sb => sb.LocationId == locationId && sb.ProductId == product.Id && sb.QuantityOnHand > 0)
                    .OrderBy(sb => sb.ExpiryDate ?? DateTime.MaxValue)
                    .ThenBy(sb => sb.CreatedAtUtc)
                    .ToListAsync();

                decimal totalAvailableStock = stockBalances.Sum(sb => sb.QuantityOnHand);

                if (totalAvailableStock < cartItem.Quantity && !product.AllowNegativeStock)
                {
                    throw new InvalidOperationException($"Insufficient stock for '{product.NameEn}'. Available: {totalAvailableStock}, Requested: {cartItem.Quantity}. Negative stock is disabled for this product.");
                }

                decimal remainingToDeduct = cartItem.Quantity;
                decimal weightedUnitCost = product.CostPrice; // default fallback

                if (stockBalances.Any())
                {
                    decimal accumulatedCost = 0m;
                    decimal deductedFromBatches = 0m;

                    foreach (var balance in stockBalances)
                    {
                        if (remainingToDeduct <= 0) break;

                        decimal deductFromThisBatch = Math.Min(balance.QuantityOnHand, remainingToDeduct);
                        balance.QuantityOnHand -= deductFromThisBatch;
                        remainingToDeduct -= deductFromThisBatch;

                        accumulatedCost += deductFromThisBatch * balance.AverageCostPrice;
                        deductedFromBatches += deductFromThisBatch;

                        // Record StockTransaction ledger movement
                        var tx = new StockTransaction
                        {
                            LocationId = locationId,
                            ProductId = product.Id,
                            BatchNumber = balance.BatchNumber,
                            ExpiryDate = balance.ExpiryDate,
                            TransactionType = StockTransactionType.SaleDeduction,
                            QuantityChange = -deductFromThisBatch,
                            ResultingBalance = balance.QuantityOnHand,
                            UnitCost = balance.AverageCostPrice,
                            ReferenceType = "Sale",
                            ReferenceNumber = invoiceNumber,
                            Notes = $"POS sale {invoiceNumber} item {product.Sku}"
                        };
                        _context.StockTransactions.Add(tx);
                    }

                    if (deductedFromBatches > 0)
                    {
                        weightedUnitCost = accumulatedCost / deductedFromBatches;
                    }
                }

                // If negative stock is allowed and remainingToDeduct > 0
                if (remainingToDeduct > 0 && product.AllowNegativeStock)
                {
                    var defaultBalance = await _context.StockBalances
                        .FirstOrDefaultAsync(sb => sb.LocationId == locationId && sb.ProductId == product.Id);

                    if (defaultBalance == null)
                    {
                        defaultBalance = new StockBalance
                        {
                            LocationId = locationId,
                            ProductId = product.Id,
                            BatchNumber = "DEFAULT",
                            QuantityOnHand = -remainingToDeduct,
                            AverageCostPrice = product.CostPrice
                        };
                        _context.StockBalances.Add(defaultBalance);
                    }
                    else
                    {
                        defaultBalance.QuantityOnHand -= remainingToDeduct;
                    }

                    var tx = new StockTransaction
                    {
                        LocationId = locationId,
                        ProductId = product.Id,
                        BatchNumber = defaultBalance.BatchNumber,
                        TransactionType = StockTransactionType.SaleDeduction,
                        QuantityChange = -remainingToDeduct,
                        ResultingBalance = defaultBalance.QuantityOnHand,
                        UnitCost = product.CostPrice,
                        ReferenceType = "Sale",
                        ReferenceNumber = invoiceNumber,
                        Notes = $"POS sale negative stock deduction {invoiceNumber}"
                    };
                    _context.StockTransactions.Add(tx);
                }

                var saleItem = new SaleItem
                {
                    Sale = sale,
                    ProductId = product.Id,
                    ScannedBarcode = cartItem.ScannedBarcode,
                    Quantity = cartItem.Quantity,
                    UnitPrice = unitPrice,
                    UnitCost = weightedUnitCost,
                    DiscountPercentage = cartItem.DiscountPercentage,
                    DiscountAmount = lineDiscount,
                    LineTotal = lineTotal,
                    IsWeightBased = cartItem.IsWeightBased || product.IsWeightBased
                };
                sale.Items.Add(saleItem);
            }

            sale.SubTotal = calculatedSubTotal;
            sale.DiscountAmount = totalLineDiscounts + request.OverallDiscountAmount;

            // Retrieve Tax Percentage setting
            var taxSetting = await _context.ShopSettings.FirstOrDefaultAsync(s => s.Key == "TaxPercentage");
            decimal taxPct = 0m;
            if (taxSetting != null && decimal.TryParse(taxSetting.Value, out decimal parsedTax))
            {
                taxPct = parsedTax;
            }

            decimal netBeforeTax = Math.Max(0, sale.SubTotal - sale.DiscountAmount);
            sale.TaxAmount = netBeforeTax * (taxPct / 100m);
            sale.GrandTotal = Math.Round(netBeforeTax + sale.TaxAmount, 2);

            decimal totalPaid = 0m;
            decimal totalTendered = 0m;

            if (request.Payments != null && request.Payments.Any())
            {
                foreach (var p in request.Payments)
                {
                    decimal tender = p.TenderAmount > 0 ? p.TenderAmount : p.Amount;
                    decimal change = tender > p.Amount ? tender - p.Amount : 0m;

                    var payment = new Payment
                    {
                        Sale = sale,
                        PaymentMethod = p.PaymentMethod,
                        Amount = p.Amount,
                        TenderAmount = tender,
                        ChangeAmount = change,
                        ReferenceNumber = p.ReferenceNumber
                    };
                    sale.Payments.Add(payment);

                    totalPaid += p.Amount;
                    totalTendered += tender;
                }
            }
            else
            {
                // Default to cash payment of exact grand total
                sale.Payments.Add(new Payment
                {
                    Sale = sale,
                    PaymentMethod = PaymentMethod.Cash,
                    Amount = sale.GrandTotal,
                    TenderAmount = sale.GrandTotal,
                    ChangeAmount = 0m
                });
                totalPaid = sale.GrandTotal;
                totalTendered = sale.GrandTotal;
            }

            sale.PaidAmount = totalPaid;
            sale.ChangeAmount = totalTendered > totalPaid ? totalTendered - totalPaid : 0m;

            // Update CashSession if applicable
            if (request.CashSessionId.HasValue)
            {
                var session = await _context.CashSessions.FindAsync(request.CashSessionId.Value);
                if (session != null && session.Status == CashSessionStatus.Open)
                {
                    decimal cashFromThisSale = sale.Payments
                        .Where(p => p.PaymentMethod == PaymentMethod.Cash)
                        .Sum(p => p.Amount);

                    session.TotalCashSales += cashFromThisSale;
                }
            }

            // Customer loyalty update
            if (sale.CustomerId.HasValue)
            {
                var customer = await _context.Customers.FindAsync(sale.CustomerId.Value);
                if (customer != null)
                {
                    // 1 point per 100 LKR spent
                    customer.LoyaltyPoints += (int)(sale.GrandTotal / 100m);
                }
            }

            await _context.Sales.AddAsync(sale);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return await GetReceiptAsync(sale.Id);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
        });
    }

    public async Task<ReceiptDto> GetReceiptAsync(Guid saleId)
    {
        var sale = await _context.Sales
            .Include(s => s.Location)
            .Include(s => s.Cashier)
            .Include(s => s.Customer)
            .Include(s => s.Payments)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Unit)
            .FirstOrDefaultAsync(s => s.Id == saleId)
            ?? throw new KeyNotFoundException($"Sale {saleId} not found");

        var settings = await _context.ShopSettings.ToDictionaryAsync(s => s.Key, s => s.Value);

        string storeName = settings.GetValueOrDefault("ShopName", "GroceryPro Supermarket");
        string storeNameSi = settings.GetValueOrDefault("ShopNameSi", "ග්‍රොසරිප්‍රෝ සුපිරි වෙළඳසැල");
        string storeAddress = settings.GetValueOrDefault("Address", sale.Location.Address ?? "Colombo, Sri Lanka");
        string storePhone = settings.GetValueOrDefault("Phone", sale.Location.Phone ?? "+94 11 234 5678");
        string headerNotes = settings.GetValueOrDefault("ReceiptHeader", "Thank you for shopping with us!");
        string footerNotes = settings.GetValueOrDefault("ReceiptFooter", "Goods once sold can only be exchanged within 7 days with original receipt.");
        string currencySymbol = settings.GetValueOrDefault("CurrencySymbol", "Rs.");

        string barcodeSvg = _barcodeService.GenerateCode128Svg(sale.InvoiceNumber, height: 40, width: 2);

        var receipt = new ReceiptDto
        {
            SaleId = sale.Id,
            InvoiceNumber = sale.InvoiceNumber,
            DateUtc = sale.CreatedAtUtc,
            StoreName = storeName,
            StoreNameSi = storeNameSi,
            StoreAddress = storeAddress,
            StorePhone = storePhone,
            CashierName = sale.Cashier.FullName,
            CustomerName = sale.Customer?.Name,
            TerminalId = sale.TerminalId,
            SubTotal = sale.SubTotal,
            DiscountAmount = sale.DiscountAmount,
            TaxAmount = sale.TaxAmount,
            GrandTotal = sale.GrandTotal,
            PaidAmount = sale.PaidAmount,
            ChangeAmount = sale.ChangeAmount,
            CurrencySymbol = currencySymbol,
            HeaderNotes = headerNotes,
            FooterNotes = footerNotes,
            BarcodeSvg = barcodeSvg,
            Items = sale.Items.Select(item => new ReceiptItemDto
            {
                Sku = item.Product.Sku,
                NameEn = item.Product.NameEn,
                NameSi = item.Product.NameSi,
                Quantity = item.Quantity,
                UnitCode = item.Product.Unit.Code,
                UnitPrice = item.UnitPrice,
                DiscountAmount = item.DiscountAmount,
                LineTotal = item.LineTotal,
                IsWeightBased = item.IsWeightBased
            }).ToList(),
            Payments = sale.Payments.Select(p => new PaymentSummaryDto
            {
                Method = p.PaymentMethod.ToString(),
                Amount = p.Amount,
                TenderAmount = p.TenderAmount,
                ChangeAmount = p.ChangeAmount,
                ReferenceNumber = p.ReferenceNumber
            }).ToList()
        };

        return receipt;
    }

    public async Task<SaleLookupDto?> LookupSaleForReturnAsync(string invoiceNumber)
    {
        if (string.IsNullOrWhiteSpace(invoiceNumber)) return null;

        var sale = await _context.Sales
            .Include(s => s.Cashier)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
            .Include(s => s.Returns)
                .ThenInclude(r => r.Items)
            .FirstOrDefaultAsync(s => s.InvoiceNumber == invoiceNumber.Trim());

        if (sale == null) return null;

        var returnedQuantities = sale.Returns
            .SelectMany(r => r.Items)
            .GroupBy(ri => ri.SaleItemId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.QuantityReturned));

        return new SaleLookupDto
        {
            Id = sale.Id,
            InvoiceNumber = sale.InvoiceNumber,
            CreatedAtUtc = sale.CreatedAtUtc,
            GrandTotal = sale.GrandTotal,
            CashierName = sale.Cashier.FullName,
            Items = sale.Items.Select(i => new SaleLookupItemDto
            {
                SaleItemId = i.Id,
                ProductId = i.ProductId,
                Sku = i.Product.Sku,
                NameEn = i.Product.NameEn,
                NameSi = i.Product.NameSi,
                OriginalQuantity = i.Quantity,
                AlreadyReturnedQuantity = returnedQuantities.GetValueOrDefault(i.Id, 0m),
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal
            }).ToList()
        };
    }

    public async Task<ReceiptDto> ProcessReturnAsync(ReturnRequestDto request, Guid cashierId, Guid locationId)
    {
        if (request.Items == null || !request.Items.Any())
        {
            throw new ArgumentException("No return items specified.");
        }

        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
            var originalSale = await _context.Sales
                .Include(s => s.Items)
                    .ThenInclude(i => i.Product)
                .Include(s => s.Returns)
                    .ThenInclude(r => r.Items)
                .FirstOrDefaultAsync(s => s.Id == request.OriginalSaleId)
                ?? throw new KeyNotFoundException("Original sale not found");

            string datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
            int todayReturnCount = await _context.SalesReturns
                .CountAsync(r => r.ReturnNumber.StartsWith($"RET-{datePrefix}-"));
            string returnNumber = $"RET-{datePrefix}-{(todayReturnCount + 1):D4}";

            var salesReturn = new SalesReturn
            {
                ReturnNumber = returnNumber,
                OriginalSaleId = originalSale.Id,
                LocationId = locationId,
                CashierId = cashierId,
                Reason = request.Reason,
                RefundPaymentMethod = request.RefundPaymentMethod
            };

            decimal totalRefund = 0m;

            var returnedQuantities = originalSale.Returns
                .SelectMany(r => r.Items)
                .GroupBy(ri => ri.SaleItemId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.QuantityReturned));

            foreach (var retItem in request.Items)
            {
                var saleItem = originalSale.Items.FirstOrDefault(si => si.Id == retItem.SaleItemId)
                    ?? throw new KeyNotFoundException($"Sale item {retItem.SaleItemId} not found in original invoice");

                decimal alreadyReturned = returnedQuantities.GetValueOrDefault(saleItem.Id, 0m);
                decimal maxAllowed = saleItem.Quantity - alreadyReturned;

                if (retItem.QuantityToReturn <= 0 || retItem.QuantityToReturn > maxAllowed)
                {
                    throw new ArgumentException($"Invalid return quantity {retItem.QuantityToReturn} for {saleItem.Product.NameEn}. Maximum eligible: {maxAllowed}");
                }

                decimal refundAmount = retItem.QuantityToReturn * saleItem.UnitPrice;
                totalRefund += refundAmount;

                var returnItemEntity = new SalesReturnItem
                {
                    SalesReturn = salesReturn,
                    SaleItemId = saleItem.Id,
                    ProductId = saleItem.ProductId,
                    QuantityReturned = retItem.QuantityToReturn,
                    RefundAmount = refundAmount,
                    ReturnToStock = retItem.ReturnToStock,
                    ConditionNotes = retItem.ConditionNotes
                };
                salesReturn.Items.Add(returnItemEntity);

                // If return to stock, increment stock balance and record StockTransaction
                if (retItem.ReturnToStock)
                {
                    var balance = await _context.StockBalances
                        .FirstOrDefaultAsync(sb => sb.LocationId == locationId && sb.ProductId == saleItem.ProductId);

                    if (balance == null)
                    {
                        balance = new StockBalance
                        {
                            LocationId = locationId,
                            ProductId = saleItem.ProductId,
                            BatchNumber = "RETURN-RESTOCK",
                            QuantityOnHand = retItem.QuantityToReturn,
                            AverageCostPrice = saleItem.UnitCost
                        };
                        _context.StockBalances.Add(balance);
                    }
                    else
                    {
                        balance.QuantityOnHand += retItem.QuantityToReturn;
                    }

                    var tx = new StockTransaction
                    {
                        LocationId = locationId,
                        ProductId = saleItem.ProductId,
                        BatchNumber = balance.BatchNumber,
                        TransactionType = StockTransactionType.SaleReturn,
                        QuantityChange = retItem.QuantityToReturn,
                        ResultingBalance = balance.QuantityOnHand,
                        UnitCost = saleItem.UnitCost,
                        ReferenceType = "SalesReturn",
                        ReferenceNumber = returnNumber,
                        Notes = $"Return from {originalSale.InvoiceNumber} - {request.Reason}"
                    };
                    _context.StockTransactions.Add(tx);
                }
            }

            salesReturn.TotalRefundAmount = totalRefund;

            // Check if original sale is fully or partially refunded
            decimal totalOriginalSaleQuantity = originalSale.Items.Sum(i => i.Quantity);
            decimal totalReturnedQuantityAll = returnedQuantities.Values.Sum() + request.Items.Sum(i => i.QuantityToReturn);

            originalSale.Status = (totalReturnedQuantityAll >= totalOriginalSaleQuantity)
                ? SaleStatus.Refunded
                : SaleStatus.PartiallyRefunded;

            _context.SalesReturns.Add(salesReturn);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return await GetReceiptAsync(originalSale.Id);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
        });
    }
}
