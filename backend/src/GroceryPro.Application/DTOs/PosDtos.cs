using GroceryPro.Domain.Enums;
using System;
using System.Collections.Generic;

namespace GroceryPro.Application.DTOs;

public class CheckoutRequestDto
{
    public string IdempotencyKey { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public Guid? CashSessionId { get; set; }
    public string TerminalId { get; set; } = "POS-01";
    public decimal OverallDiscountAmount { get; set; } = 0m;
    public string? Notes { get; set; }

    public List<CartItemDto> Items { get; set; } = new();
    public List<PaymentItemDto> Payments { get; set; } = new();
}

public class CartItemDto
{
    public Guid ProductId { get; set; }
    public string? ScannedBarcode { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountPercentage { get; set; } = 0m;
    public decimal DiscountAmount { get; set; } = 0m;
    public bool IsWeightBased { get; set; } = false;
}

public class PaymentItemDto
{
    public PaymentMethod PaymentMethod { get; set; }
    public decimal Amount { get; set; }
    public decimal TenderAmount { get; set; }
    public string? ReferenceNumber { get; set; }
}

public class ReceiptDto
{
    public Guid SaleId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime DateUtc { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreNameSi { get; set; } = string.Empty;
    public string StoreAddress { get; set; } = string.Empty;
    public string StorePhone { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string TerminalId { get; set; } = string.Empty;

    public List<ReceiptItemDto> Items { get; set; } = new();
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public string CurrencySymbol { get; set; } = "Rs.";

    public List<PaymentSummaryDto> Payments { get; set; } = new();
    public string HeaderNotes { get; set; } = string.Empty;
    public string FooterNotes { get; set; } = string.Empty;
    public string BarcodeSvg { get; set; } = string.Empty;
}

public class ReceiptItemDto
{
    public string Sku { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string UnitCode { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineTotal { get; set; }
    public bool IsWeightBased { get; set; }
}

public class PaymentSummaryDto
{
    public string Method { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal TenderAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public string? ReferenceNumber { get; set; }
}

public class ReturnRequestDto
{
    public Guid OriginalSaleId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public PaymentMethod RefundPaymentMethod { get; set; } = PaymentMethod.Cash;
    public List<ReturnItemDto> Items { get; set; } = new();
}

public class ReturnItemDto
{
    public Guid SaleItemId { get; set; }
    public decimal QuantityToReturn { get; set; }
    public bool ReturnToStock { get; set; } = true;
    public string? ConditionNotes { get; set; }
}

public class BillsResponseDto
{
    public BillsSummaryDto Summary { get; set; } = new();
    public List<BillListItemDto> Bills { get; set; } = new();
    public List<SoldProductDto> SoldProducts { get; set; } = new();
    public List<CategorySalesBreakdownDto> CategorySales { get; set; } = new();
}

public class BillsSummaryDto
{
    public int TotalBills { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalItemsSold { get; set; }
    public decimal TotalDiscounts { get; set; }
    public decimal CashCollected { get; set; }
    public decimal CardCollected { get; set; }
    public decimal OtherCollected { get; set; }
}

public class BillListItemDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string TerminalId { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<string> PaymentMethods { get; set; } = new();
    public List<BillItemDetailDto> Items { get; set; } = new();
}

public class BillItemDetailDto
{
    public Guid ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitCode { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal LineTotal { get; set; }
    public bool IsWeightBased { get; set; }
}

public class SoldProductDto
{
    public Guid ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string UnitCode { get; set; } = string.Empty;
    public decimal QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
    public int BillsCount { get; set; }
}

public class CategorySalesBreakdownDto
{
    public Guid? CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryNameSi { get; set; } = string.Empty;
    public decimal TotalQuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
    public int BillsCount { get; set; }
    public List<CategoryProductSoldDto> Products { get; set; } = new();
}

public class CategoryProductSoldDto
{
    public Guid ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public string UnitCode { get; set; } = string.Empty;
    public decimal QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}
