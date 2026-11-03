using GroceryPro.Domain.Common;
using System;

namespace GroceryPro.Domain.Entities;

public class AuditLog : BaseEntity
{
    public Guid? UserId { get; set; }
    public string? Username { get; set; }
    public string Action { get; set; } = string.Empty; // e.g. "CREATE_PRODUCT", "POS_CHECKOUT", "STOCK_ADJUSTMENT"
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}

public class ShopSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty; // e.g. "ShopName", "ScaleBarcodePrefix", "TaxPercentage"
    public string Value { get; set; } = string.Empty;
    public string Group { get; set; } = "General"; // "General", "ScaleBarcode", "POS", "Tax", "Receipt"
    public string? Description { get; set; }
    public bool IsSystem { get; set; } = false;
}
