using GroceryPro.Domain.Common;
using GroceryPro.Domain.Enums;
using System;
using System.Collections.Generic;

namespace GroceryPro.Domain.Entities;

public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal CreditLimit { get; set; } = 0m;
    public decimal CurrentCreditBalance { get; set; } = 0m;
    public int LoyaltyPoints { get; set; } = 0;

    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
}

public class Sale : BaseEntity
{
    public string InvoiceNumber { get; set; } = string.Empty; // e.g. "INV-20261101-0001"
    public string IdempotencyKey { get; set; } = string.Empty;

    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public Guid CashierId { get; set; }
    public User Cashier { get; set; } = null!;

    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public Guid? CashSessionId { get; set; }
    public CashSession? CashSession { get; set; }

    public string TerminalId { get; set; } = "POS-01";

    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal GrandTotal { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }

    public SaleStatus Status { get; set; } = SaleStatus.Completed;
    public string? Notes { get; set; }

    public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<SalesReturn> Returns { get; set; } = new List<SalesReturn>();
}

public class SaleItem : BaseEntity
{
    public Guid SaleId { get; set; }
    public Sale Sale { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string? ScannedBarcode { get; set; }
    public string BatchNumber { get; set; } = "DEFAULT";
    public DateTime? ExpiryDate { get; set; }

    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal UnitCost { get; set; } // Retains weighted-average cost at sale time
    public decimal DiscountPercentage { get; set; } = 0m;
    public decimal DiscountAmount { get; set; } = 0m;
    public decimal LineTotal { get; set; }
    public decimal Profit => LineTotal - (Quantity * UnitCost);

    public bool IsWeightBased { get; set; } = false;
}

public class Payment : BaseEntity
{
    public Guid SaleId { get; set; }
    public Sale Sale { get; set; } = null!;

    public PaymentMethod PaymentMethod { get; set; }
    public decimal Amount { get; set; }
    public decimal TenderAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public string? ReferenceNumber { get; set; } // Card auth code or bank transfer ref
    public string? Notes { get; set; }
}

public class SalesReturn : BaseEntity
{
    public string ReturnNumber { get; set; } = string.Empty;

    public Guid OriginalSaleId { get; set; }
    public Sale OriginalSale { get; set; } = null!;

    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public Guid CashierId { get; set; }
    public User Cashier { get; set; } = null!;

    public decimal TotalRefundAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public PaymentMethod RefundPaymentMethod { get; set; } = PaymentMethod.Cash;

    public ICollection<SalesReturnItem> Items { get; set; } = new List<SalesReturnItem>();
}

public class SalesReturnItem : BaseEntity
{
    public Guid SalesReturnId { get; set; }
    public SalesReturn SalesReturn { get; set; } = null!;

    public Guid SaleItemId { get; set; }
    public SaleItem SaleItem { get; set; } = null!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public decimal QuantityReturned { get; set; }
    public decimal RefundAmount { get; set; }
    public bool ReturnToStock { get; set; } = true;
    public string? ConditionNotes { get; set; }
}
