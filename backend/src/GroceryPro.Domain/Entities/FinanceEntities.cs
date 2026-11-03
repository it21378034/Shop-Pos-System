using GroceryPro.Domain.Common;
using GroceryPro.Domain.Enums;
using System;
using System.Collections.Generic;

namespace GroceryPro.Domain.Entities;

public class CashSession : BaseEntity
{
    public string SessionNumber { get; set; } = string.Empty; // e.g. "CS-20261101-01"

    public Guid CashierId { get; set; }
    public User Cashier { get; set; } = null!;

    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public string TerminalId { get; set; } = "POS-01";

    public DateTime OpenedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAtUtc { get; set; }

    public decimal OpeningCash { get; set; }
    public decimal TotalCashSales { get; set; } = 0m;
    public decimal TotalCashIn { get; set; } = 0m;
    public decimal TotalCashOut { get; set; } = 0m;
    public decimal ExpectedCash => OpeningCash + TotalCashSales + TotalCashIn - TotalCashOut;
    public decimal? ClosingCashDeclared { get; set; }
    public decimal? CashDifference => ClosingCashDeclared.HasValue ? ClosingCashDeclared.Value - ExpectedCash : null;

    public CashSessionStatus Status { get; set; } = CashSessionStatus.Open;
    public string? Notes { get; set; }

    public ICollection<CashMovement> CashMovements { get; set; } = new List<CashMovement>();
    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
}

public class CashMovement : BaseEntity
{
    public Guid CashSessionId { get; set; }
    public CashSession CashSession { get; set; } = null!;

    public CashMovementType MovementType { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? AuthorizedBy { get; set; }
}

public class Expense : BaseEntity
{
    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public string ExpenseCategory { get; set; } = string.Empty; // "Utility", "Transport", "Maintenance", "Meals", "Staff"
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? PaidTo { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime ExpenseDateUtc { get; set; } = DateTime.UtcNow;
    public string? ReceiptNumber { get; set; }
}
