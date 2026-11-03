using GroceryPro.Application.Interfaces;
using GroceryPro.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace GroceryPro.API.Controllers;

[Authorize(Roles = "SuperAdmin,Admin,Manager")]
public class ReportsController : BaseApiController
{
    private readonly IReportingService _reportingService;
    private readonly GroceryProDbContext _context;

    public ReportsController(IReportingService reportingService, GroceryProDbContext context)
    {
        _reportingService = reportingService;
        _context = context;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var stats = await _reportingService.GetDashboardStatsAsync(locationId);
        return Ok(stats);
    }

    [HttpGet("product-sales")]
    public async Task<IActionResult> GetProductSales([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;

        var report = await _reportingService.GetProductWiseSalesAsync(locationId, fromDate, toDate);
        return Ok(report);
    }

    [HttpGet("cashier-performance")]
    public async Task<IActionResult> GetCashierPerformance([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;

        var report = await _reportingService.GetCashierPerformanceAsync(locationId, fromDate, toDate);
        return Ok(report);
    }

    [HttpGet("export/product-sales-csv")]
    public async Task<IActionResult> ExportProductSalesCsv([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var fromDate = from ?? DateTime.UtcNow.AddDays(-30);
        var toDate = to ?? DateTime.UtcNow;

        var bytes = await _reportingService.ExportProductSalesCsvAsync(locationId, fromDate, toDate);
        return File(bytes, "text/csv", $"product_sales_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpGet("export/inventory-csv")]
    public async Task<IActionResult> ExportInventoryCsv()
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var bytes = await _reportingService.ExportInventoryCsvAsync(locationId);
        return File(bytes, "text/csv", $"inventory_valuation_{DateTime.UtcNow:yyyyMMdd}.csv");
    }
}
