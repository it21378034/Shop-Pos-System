using GroceryPro.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GroceryPro.Application.Interfaces;

public interface IPosService
{
    Task<ReceiptDto> ProcessCheckoutAsync(CheckoutRequestDto request, Guid cashierId, Guid locationId);
    Task<ReceiptDto> GetReceiptAsync(Guid saleId);
    Task<ReceiptDto> ProcessReturnAsync(ReturnRequestDto request, Guid cashierId, Guid locationId);
    Task<SaleLookupDto?> LookupSaleForReturnAsync(string invoiceNumber);
}

public class SaleLookupDto
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public decimal GrandTotal { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public List<SaleLookupItemDto> Items { get; set; } = new();
}

public class SaleLookupItemDto
{
    public Guid SaleItemId { get; set; }
    public Guid ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public decimal OriginalQuantity { get; set; }
    public decimal AlreadyReturnedQuantity { get; set; }
    public decimal AvailableToReturn => OriginalQuantity - AlreadyReturnedQuantity;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
