using GroceryPro.Application.DTOs;
using GroceryPro.Application.Interfaces;
using GroceryPro.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace GroceryPro.API.Controllers;

[Authorize]
public class InventoryController : BaseApiController
{
    private readonly IInventoryService _inventoryService;
    private readonly GroceryProDbContext _context;

    public InventoryController(IInventoryService inventoryService, GroceryProDbContext context)
    {
        _inventoryService = inventoryService;
        _context = context;
    }

    [HttpGet("balances")]
    public async Task<IActionResult> GetBalances([FromQuery] string? search, [FromQuery] bool lowStockOnly = false)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var balances = await _inventoryService.GetStockBalancesAsync(locationId, search, lowStockOnly);
        return Ok(balances);
    }

    [HttpGet("ledger")]
    public async Task<IActionResult> GetLedger([FromQuery] Guid? productId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var ledger = await _inventoryService.GetStockLedgerAsync(locationId, productId, fromDate, toDate);
        return Ok(ledger);
    }

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStock()
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var alerts = await _inventoryService.GetLowStockAlertsAsync(locationId);
        return Ok(alerts);
    }

    [HttpPost("adjustments")]
    [Authorize(Roles = "SuperAdmin,Admin,Manager")]
    public async Task<IActionResult> CreateAdjustment([FromBody] StockAdjustmentRequestDto request)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        try
        {
            var adj = await _inventoryService.ProcessStockAdjustmentAsync(request, CurrentUserId, locationId);
            return Ok(adj);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("intake")]
    [Authorize(Roles = "SuperAdmin,Admin,Manager")]
    public async Task<IActionResult> RecordStockIntake([FromBody] StockIntakeRequestDto request)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        try
        {
            var balance = await _inventoryService.RecordStockIntakeAsync(request, CurrentUserId, locationId);
            return Ok(balance);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
