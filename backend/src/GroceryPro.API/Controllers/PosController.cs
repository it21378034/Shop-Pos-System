using GroceryPro.Application.DTOs;
using GroceryPro.Application.Interfaces;
using GroceryPro.Domain.Entities;
using GroceryPro.Domain.Enums;
using GroceryPro.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GroceryPro.API.Controllers;

[Authorize]
public class PosController : BaseApiController
{
    private readonly IPosService _posService;
    private readonly GroceryProDbContext _context;

    public PosController(IPosService posService, GroceryProDbContext context)
    {
        _posService = posService;
        _context = context;
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequestDto request)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        if (locationId == Guid.Empty)
        {
            return BadRequest(new { message = "No valid store location assigned." });
        }

        try
        {
            var receipt = await _posService.ProcessCheckoutAsync(request, CurrentUserId, locationId);
            return Ok(receipt);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("receipt/{saleId}")]
    public async Task<IActionResult> GetReceipt(Guid saleId)
    {
        try
        {
            var receipt = await _posService.GetReceiptAsync(saleId);
            return Ok(receipt);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("return-lookup/{invoiceNumber}")]
    public async Task<IActionResult> LookupForReturn(string invoiceNumber)
    {
        var result = await _posService.LookupSaleForReturnAsync(invoiceNumber);
        if (result == null)
        {
            return NotFound(new { message = $"Invoice '{invoiceNumber}' not found" });
        }
        return Ok(result);
    }

    [HttpPost("return")]
    public async Task<IActionResult> ProcessReturn([FromBody] ReturnRequestDto request)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        try
        {
            var receipt = await _posService.ProcessReturnAsync(request, CurrentUserId, locationId);
            return Ok(receipt);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("suspended")]
    public async Task<IActionResult> GetSuspendedBills()
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var suspendedSales = await _context.Sales
            .Include(s => s.Customer)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
            .Where(s => s.LocationId == locationId && s.Status == SaleStatus.Suspended)
            .OrderByDescending(s => s.CreatedAtUtc)
            .Select(s => new
            {
                s.Id,
                s.InvoiceNumber,
                s.CreatedAtUtc,
                s.GrandTotal,
                s.Notes,
                CustomerName = s.Customer != null ? s.Customer.Name : null,
                ItemCount = s.Items.Count,
                Items = s.Items.Select(i => new
                {
                    i.ProductId,
                    i.Product.Sku,
                    i.Product.NameEn,
                    i.Product.NameSi,
                    i.Quantity,
                    i.UnitPrice,
                    i.DiscountPercentage,
                    i.DiscountAmount,
                    i.LineTotal,
                    i.IsWeightBased
                }).ToList()
            })
            .ToListAsync();

        return Ok(suspendedSales);
    }

    [HttpPost("suspend")]
    public async Task<IActionResult> SuspendBill([FromBody] CheckoutRequestDto request)
    {
        if (request.Items == null || !request.Items.Any())
        {
            return BadRequest(new { message = "Cart cannot be empty to hold bill." });
        }

        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        string datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        int count = await _context.Sales.CountAsync(s => s.InvoiceNumber.StartsWith($"HOLD-{datePrefix}-"));
        string holdNumber = $"HOLD-{datePrefix}-{(count + 1):D3}";

        var sale = new Sale
        {
            InvoiceNumber = holdNumber,
            IdempotencyKey = Guid.NewGuid().ToString(),
            LocationId = locationId,
            CashierId = CurrentUserId,
            CustomerId = request.CustomerId,
            TerminalId = request.TerminalId,
            Status = SaleStatus.Suspended,
            Notes = request.Notes ?? "Suspended Bill"
        };

        decimal subtotal = 0m;
        foreach (var item in request.Items)
        {
            var product = await _context.Products.FindAsync(item.ProductId)
                ?? throw new KeyNotFoundException($"Product {item.ProductId} not found");

            decimal lineTotal = (item.Quantity * item.UnitPrice) - item.DiscountAmount;
            subtotal += lineTotal;

            sale.Items.Add(new SaleItem
            {
                Sale = sale,
                ProductId = product.Id,
                ScannedBarcode = item.ScannedBarcode,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                UnitCost = product.CostPrice,
                DiscountPercentage = item.DiscountPercentage,
                DiscountAmount = item.DiscountAmount,
                LineTotal = lineTotal,
                IsWeightBased = item.IsWeightBased
            });
        }

        sale.SubTotal = subtotal;
        sale.GrandTotal = subtotal;

        _context.Sales.Add(sale);
        await _context.SaveChangesAsync();

        return Ok(new { sale.Id, sale.InvoiceNumber, message = "Bill held successfully" });
    }

    [HttpDelete("suspended/{id}")]
    public async Task<IActionResult> DiscardSuspendedBill(Guid id)
    {
        var sale = await _context.Sales
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id && s.Status == SaleStatus.Suspended);

        if (sale == null) return NotFound();

        _context.Sales.Remove(sale);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("bills")]
    public async Task<IActionResult> GetBills(
        [FromQuery] string? period = "today",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? search = null)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        DateTime startUtc;
        DateTime endUtc;
        var nowUtc = DateTime.UtcNow;

        if (fromDate.HasValue && toDate.HasValue)
        {
            startUtc = fromDate.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(fromDate.Value, DateTimeKind.Utc)
                : fromDate.Value.ToUniversalTime();

            endUtc = toDate.Value.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(toDate.Value, DateTimeKind.Utc)
                : toDate.Value.ToUniversalTime();
        }
        else if (string.Equals(period, "yesterday", StringComparison.OrdinalIgnoreCase))
        {
            var yesterday = nowUtc.Date.AddDays(-1);
            startUtc = yesterday;
            endUtc = yesterday.AddDays(1).AddTicks(-1);
        }
        else if (string.Equals(period, "month", StringComparison.OrdinalIgnoreCase) || string.Equals(period, "thisMonth", StringComparison.OrdinalIgnoreCase))
        {
            startUtc = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            endUtc = nowUtc.Date.AddDays(1).AddTicks(-1);
        }
        else // default: today
        {
            startUtc = nowUtc.Date;
            endUtc = nowUtc.Date.AddDays(1).AddTicks(-1);
        }

        var query = _context.Sales
            .AsNoTracking()
            .Include(s => s.Cashier)
            .Include(s => s.Customer)
            .Include(s => s.Payments)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Category)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Unit)
            .Where(s => s.LocationId == locationId && s.CreatedAtUtc >= startUtc && s.CreatedAtUtc <= endUtc);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.InvoiceNumber.ToLower().Contains(term)
                || (s.Cashier != null && s.Cashier.FullName.ToLower().Contains(term))
                || (s.Customer != null && s.Customer.Name.ToLower().Contains(term)));
        }

        var sales = await query
            .OrderByDescending(s => s.CreatedAtUtc)
            .ToListAsync();

        var completedSales = sales.Where(s => s.Status == SaleStatus.Completed).ToList();

        var summary = new BillsSummaryDto
        {
            TotalBills = sales.Count,
            TotalRevenue = completedSales.Sum(s => s.GrandTotal),
            TotalItemsSold = completedSales.SelectMany(s => s.Items).Sum(i => i.Quantity),
            TotalDiscounts = completedSales.Sum(s => s.DiscountAmount),
            CashCollected = completedSales.SelectMany(s => s.Payments).Where(p => p.PaymentMethod == PaymentMethod.Cash).Sum(p => p.Amount),
            CardCollected = completedSales.SelectMany(s => s.Payments).Where(p => p.PaymentMethod == PaymentMethod.Card).Sum(p => p.Amount),
            OtherCollected = completedSales.SelectMany(s => s.Payments).Where(p => p.PaymentMethod != PaymentMethod.Cash && p.PaymentMethod != PaymentMethod.Card).Sum(p => p.Amount)
        };

        var billList = sales.Select(s => new BillListItemDto
        {
            Id = s.Id,
            InvoiceNumber = s.InvoiceNumber,
            CreatedAtUtc = s.CreatedAtUtc,
            CashierName = s.Cashier?.FullName ?? "Staff",
            CustomerName = s.Customer?.Name,
            TerminalId = s.TerminalId,
            ItemCount = s.Items.Count,
            SubTotal = s.SubTotal,
            DiscountAmount = s.DiscountAmount,
            TaxAmount = s.TaxAmount,
            GrandTotal = s.GrandTotal,
            PaidAmount = s.PaidAmount,
            ChangeAmount = s.ChangeAmount,
            Status = s.Status.ToString(),
            PaymentMethods = s.Payments.Select(p => p.PaymentMethod.ToString()).Distinct().ToList(),
            Items = s.Items.Select(i => new BillItemDetailDto
            {
                ProductId = i.ProductId,
                Sku = i.Product?.Sku ?? "",
                NameEn = i.Product?.NameEn ?? "",
                NameSi = i.Product?.NameSi ?? "",
                CategoryName = i.Product?.Category?.NameEn ?? "General",
                UnitCode = i.Product?.Unit?.Code ?? "",
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                DiscountAmount = i.DiscountAmount,
                LineTotal = i.LineTotal,
                IsWeightBased = i.IsWeightBased
            }).ToList()
        }).ToList();

        var completedSaleItems = completedSales
            .SelectMany(s => s.Items)
            .ToList();

        var soldProducts = completedSaleItems
            .GroupBy(i => new
            {
                i.ProductId,
                Sku = i.Product?.Sku ?? "",
                NameEn = i.Product?.NameEn ?? "Unknown",
                NameSi = i.Product?.NameSi ?? "",
                CategoryName = i.Product?.Category?.NameEn ?? "General",
                UnitCode = i.Product?.Unit?.Code ?? "pcs"
            })
            .Select(g => new SoldProductDto
            {
                ProductId = g.Key.ProductId,
                Sku = g.Key.Sku,
                NameEn = g.Key.NameEn,
                NameSi = g.Key.NameSi,
                CategoryName = g.Key.CategoryName,
                UnitCode = g.Key.UnitCode,
                QuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.LineTotal),
                BillsCount = g.Select(x => x.SaleId).Distinct().Count()
            })
            .OrderByDescending(p => p.QuantitySold)
            .ToList();

        var categorySales = completedSaleItems
            .GroupBy(i => new
            {
                CategoryId = i.Product?.CategoryId,
                CategoryNameEn = i.Product?.Category?.NameEn ?? "General",
                CategoryNameSi = i.Product?.Category?.NameSi ?? ""
            })
            .Select(cg => new CategorySalesBreakdownDto
            {
                CategoryId = cg.Key.CategoryId,
                CategoryName = cg.Key.CategoryNameEn,
                CategoryNameSi = cg.Key.CategoryNameSi,
                TotalQuantitySold = cg.Sum(x => x.Quantity),
                TotalRevenue = cg.Sum(x => x.LineTotal),
                BillsCount = cg.Select(x => x.SaleId).Distinct().Count(),
                Products = cg.GroupBy(pi => new
                {
                    pi.ProductId,
                    Sku = pi.Product?.Sku ?? "",
                    NameEn = pi.Product?.NameEn ?? "",
                    NameSi = pi.Product?.NameSi ?? "",
                    UnitCode = pi.Product?.Unit?.Code ?? "pcs"
                })
                .Select(pg => new CategoryProductSoldDto
                {
                    ProductId = pg.Key.ProductId,
                    Sku = pg.Key.Sku,
                    NameEn = pg.Key.NameEn,
                    NameSi = pg.Key.NameSi,
                    UnitCode = pg.Key.UnitCode,
                    QuantitySold = pg.Sum(x => x.Quantity),
                    TotalRevenue = pg.Sum(x => x.LineTotal)
                })
                .OrderByDescending(x => x.QuantitySold)
                .ToList()
            })
            .OrderByDescending(c => c.TotalRevenue)
            .ToList();

        return Ok(new BillsResponseDto
        {
            Summary = summary,
            Bills = billList,
            SoldProducts = soldProducts,
            CategorySales = categorySales
        });
    }
}
