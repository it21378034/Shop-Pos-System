using GroceryPro.Application.DTOs;
using GroceryPro.Application.Interfaces;
using GroceryPro.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace GroceryPro.API.Controllers;

[Authorize(Roles = "SuperAdmin,Admin,Manager")]
public class PurchasesController : BaseApiController
{
    private readonly IPurchasingService _purchasingService;
    private readonly GroceryProDbContext _context;

    public PurchasesController(IPurchasingService purchasingService, GroceryProDbContext context)
    {
        _purchasingService = purchasingService;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? supplierId)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var list = await _purchasingService.GetPurchasesAsync(locationId, supplierId);
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var purchase = await _purchasingService.GetPurchaseByIdAsync(id);
        if (purchase == null) return NotFound();
        return Ok(purchase);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PurchaseCreateDto dto)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var purchase = await _purchasingService.CreatePurchaseOrderAsync(dto, CurrentUserId, locationId);
        return CreatedAtAction(nameof(GetById), new { id = purchase.Id }, purchase);
    }

    [HttpPost("{id}/receive")]
    public async Task<IActionResult> Receive(Guid id, [FromBody] GoodsReceivedDto dto)
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        try
        {
            var purchase = await _purchasingService.ReceiveGoodsAsync(id, dto, CurrentUserId, locationId);
            return Ok(purchase);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("payments")]
    public async Task<IActionResult> RecordPayment([FromBody] SupplierPaymentCreateDto dto)
    {
        try
        {
            var payment = await _purchasingService.RecordSupplierPaymentAsync(dto, CurrentUserId);
            return Ok(payment);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
