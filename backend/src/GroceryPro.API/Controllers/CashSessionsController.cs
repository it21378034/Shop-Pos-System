using GroceryPro.Domain.Entities;
using GroceryPro.Domain.Enums;
using GroceryPro.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace GroceryPro.API.Controllers;

public class OpenSessionRequestDto
{
    [Range(0, 10000000)]
    public decimal OpeningCash { get; set; }
    public string TerminalId { get; set; } = "POS-01";
    public string? Notes { get; set; }
}

public class CloseSessionRequestDto
{
    [Range(0, 10000000)]
    public decimal ClosingCashDeclared { get; set; }
    public string? Notes { get; set; }
}

public class CashMovementRequestDto
{
    public CashMovementType MovementType { get; set; }
    [Range(0.01, 10000000)]
    public decimal Amount { get; set; }
    [Required]
    public string Reason { get; set; } = string.Empty;
}

[Authorize]
public class CashSessionsController : BaseApiController
{
    private readonly GroceryProDbContext _context;

    public CashSessionsController(GroceryProDbContext context)
    {
        _context = context;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentSession()
    {
        var session = await _context.CashSessions
            .Include(cs => cs.Cashier)
            .Include(cs => cs.CashMovements)
            .Where(cs => cs.CashierId == CurrentUserId && cs.Status == CashSessionStatus.Open)
            .OrderByDescending(cs => cs.OpenedAtUtc)
            .FirstOrDefaultAsync();

        return Ok(session);
    }

    [HttpPost("open")]
    public async Task<IActionResult> OpenSession([FromBody] OpenSessionRequestDto request)
    {
        // Check if there is already an open session for this user
        var existing = await _context.CashSessions
            .FirstOrDefaultAsync(cs => cs.CashierId == CurrentUserId && cs.Status == CashSessionStatus.Open);

        if (existing != null)
        {
            return BadRequest(new { message = "You already have an active open session." });
        }

        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        string datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        int count = await _context.CashSessions.CountAsync(cs => cs.SessionNumber.StartsWith($"CS-{datePrefix}-"));
        string sessionNumber = $"CS-{datePrefix}-{(count + 1):D3}";

        var session = new CashSession
        {
            SessionNumber = sessionNumber,
            CashierId = CurrentUserId,
            LocationId = locationId,
            TerminalId = request.TerminalId,
            OpeningCash = request.OpeningCash,
            Status = CashSessionStatus.Open,
            Notes = request.Notes
        };

        _context.CashSessions.Add(session);
        await _context.SaveChangesAsync();

        return Ok(session);
    }

    [HttpPost("{id}/close")]
    public async Task<IActionResult> CloseSession(Guid id, [FromBody] CloseSessionRequestDto request)
    {
        var session = await _context.CashSessions
            .Include(cs => cs.Sales)
                .ThenInclude(s => s.Payments)
            .Include(cs => cs.CashMovements)
            .FirstOrDefaultAsync(cs => cs.Id == id);

        if (session == null) return NotFound();
        if (session.Status == CashSessionStatus.Closed)
        {
            return BadRequest(new { message = "Session is already closed." });
        }

        session.ClosedAtUtc = DateTime.UtcNow;
        session.ClosingCashDeclared = request.ClosingCashDeclared;
        session.Status = CashSessionStatus.Closed;
        session.Notes = string.IsNullOrWhiteSpace(session.Notes) ? request.Notes : $"{session.Notes} | {request.Notes}";

        await _context.SaveChangesAsync();

        return Ok(new
        {
            session.Id,
            session.SessionNumber,
            session.OpenedAtUtc,
            session.ClosedAtUtc,
            session.OpeningCash,
            session.TotalCashSales,
            session.TotalCashIn,
            session.TotalCashOut,
            session.ExpectedCash,
            session.ClosingCashDeclared,
            session.CashDifference,
            session.Notes
        });
    }

    [HttpPost("{id}/movements")]
    public async Task<IActionResult> RecordMovement(Guid id, [FromBody] CashMovementRequestDto request)
    {
        var session = await _context.CashSessions.FindAsync(id);
        if (session == null) return NotFound();
        if (session.Status != CashSessionStatus.Open)
        {
            return BadRequest(new { message = "Cannot add cash movement to a closed session." });
        }

        var movement = new CashMovement
        {
            CashSessionId = session.Id,
            MovementType = request.MovementType,
            Amount = request.Amount,
            Reason = request.Reason,
            AuthorizedBy = User.Identity?.Name ?? "Cashier"
        };

        if (request.MovementType == CashMovementType.CashIn)
        {
            session.TotalCashIn += request.Amount;
        }
        else
        {
            session.TotalCashOut += request.Amount;
        }

        _context.CashMovements.Add(movement);
        await _context.SaveChangesAsync();

        return Ok(movement);
    }

    [HttpGet]
    public async Task<IActionResult> GetSessionHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _context.CashSessions
            .Include(cs => cs.Cashier)
            .OrderByDescending(cs => cs.OpenedAtUtc);

        int total = await query.CountAsync();
        var list = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(cs => new
            {
                cs.Id,
                cs.SessionNumber,
                CashierName = cs.Cashier.FullName,
                cs.TerminalId,
                cs.OpenedAtUtc,
                cs.ClosedAtUtc,
                cs.OpeningCash,
                cs.TotalCashSales,
                cs.TotalCashIn,
                cs.TotalCashOut,
                cs.ExpectedCash,
                cs.ClosingCashDeclared,
                cs.CashDifference,
                cs.Status
            })
            .ToListAsync();

        return Ok(new { total, page, pageSize, list });
    }
}
