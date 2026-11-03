using GroceryPro.Domain.Common;
using GroceryPro.Domain.Enums;
using System;
using System.Collections.Generic;

namespace GroceryPro.Domain.Entities;

public class StockBalance : BaseEntity
{
    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string BatchNumber { get; set; } = "DEFAULT";
    public DateTime? ExpiryDate { get; set; }

    public decimal QuantityOnHand { get; set; } = 0m;
    public decimal ReservedQuantity { get; set; } = 0m;
    public decimal AvailableQuantity => QuantityOnHand - ReservedQuantity;

    public decimal AverageCostPrice { get; set; } = 0m;
    public DateTime LastRestockedAtUtc { get; set; } = DateTime.UtcNow;

    // Optimistic concurrency token
    public byte[]? RowVersion { get; set; }
}

public class StockTransaction : BaseEntity
{
    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string BatchNumber { get; set; } = "DEFAULT";
    public DateTime? ExpiryDate { get; set; }

    public StockTransactionType TransactionType { get; set; }
    public decimal QuantityChange { get; set; } // Positive for inbound, negative for outbound
    public decimal ResultingBalance { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost => Math.Abs(QuantityChange) * UnitCost;

    public string ReferenceType { get; set; } = string.Empty; // "Sale", "Purchase", "Adjustment", "Return"
    public Guid? ReferenceId { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
}

public class StockAdjustment : BaseEntity
{
    public string AdjustmentNumber { get; set; } = string.Empty;
    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public StockAdjustmentReason Reason { get; set; }
    public string? Notes { get; set; }
    public bool IsApproved { get; set; } = false;
    public DateTime? ApprovedAtUtc { get; set; }
    public string? ApprovedBy { get; set; }

    public ICollection<StockAdjustmentItem> Items { get; set; } = new List<StockAdjustmentItem>();
}

public class StockAdjustmentItem : BaseEntity
{
    public Guid StockAdjustmentId { get; set; }
    public StockAdjustment StockAdjustment { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string BatchNumber { get; set; } = "DEFAULT";
    public DateTime? ExpiryDate { get; set; }

    public decimal SystemQuantity { get; set; }
    public decimal PhysicalQuantity { get; set; }
    public decimal QuantityDifference => PhysicalQuantity - SystemQuantity;
    public decimal UnitCost { get; set; }
    public string? ReasonDetails { get; set; }
}
