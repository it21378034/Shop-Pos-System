using GroceryPro.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GroceryPro.Application.DTOs;

public class StockBalanceDto
{
    public Guid Id { get; set; }
    public Guid LocationId { get; set; }
    public string LocationName { get; set; } = string.Empty;
    public Guid ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitCode { get; set; } = string.Empty;
    public decimal QuantityOnHand { get; set; }
    public decimal ReorderLevel { get; set; }
    public bool IsLowStock => QuantityOnHand <= ReorderLevel;
    public decimal AverageCostPrice { get; set; }
    public decimal TotalValue => QuantityOnHand * AverageCostPrice;
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime? ExpiryDate { get; set; }
}

public class StockTransactionDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductNameEn { get; set; } = string.Empty;
    public string TransactionType { get; set; } = string.Empty;
    public decimal QuantityChange { get; set; }
    public decimal ResultingBalance { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost { get; set; }
    public string ReferenceType { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
}

public class StockAdjustmentRequestDto
{
    public StockAdjustmentReason Reason { get; set; }
    public string? Notes { get; set; }
    public List<StockAdjustmentItemDto> Items { get; set; } = new();
}

public class StockAdjustmentItemDto
{
    public Guid ProductId { get; set; }
    public string BatchNumber { get; set; } = "DEFAULT";
    public decimal PhysicalQuantity { get; set; }
    public string? ReasonDetails { get; set; }
}

public class StockIntakeRequestDto
{
    public Guid ProductId { get; set; }
    public decimal QuantityReceived { get; set; }
    public decimal? UnitCost { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? Notes { get; set; }
}

public class PurchaseCreateDto
{
    public Guid SupplierId { get; set; }
    public string? SupplierInvoiceNumber { get; set; }
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public decimal DiscountAmount { get; set; } = 0m;
    public string? Notes { get; set; }
    public List<PurchaseItemCreateDto> Items { get; set; } = new();
}

public class PurchaseItemCreateDto
{
    public Guid ProductId { get; set; }
    public decimal QuantityOrdered { get; set; }
    public decimal UnitCost { get; set; }
    public string BatchNumber { get; set; } = "DEFAULT";
    public DateTime? ExpiryDate { get; set; }
}

public class GoodsReceivedDto
{
    public List<GoodsReceivedItemDto> Items { get; set; } = new();
    public string? Notes { get; set; }
}

public class GoodsReceivedItemDto
{
    public Guid PurchaseItemId { get; set; }
    public decimal QuantityReceived { get; set; }
    public decimal UnitCost { get; set; }
    public string BatchNumber { get; set; } = "DEFAULT";
    public DateTime? ExpiryDate { get; set; }
}

public class SupplierPaymentCreateDto
{
    public Guid SupplierId { get; set; }
    public Guid? PurchaseId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.BankTransfer;
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
}
