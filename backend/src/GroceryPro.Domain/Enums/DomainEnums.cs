namespace GroceryPro.Domain.Enums;

public enum RoleType
{
    SuperAdmin = 1,
    Admin = 2,
    Manager = 3,
    Cashier = 4
}

public enum UnitType
{
    Count = 1,    // pieces, packets, bottles
    Weight = 2,   // grams, kilograms
    Volume = 3    // millilitres, litres
}

public enum ProductStatus
{
    Active = 1,
    Inactive = 2,
    Discontinued = 3
}

public enum BarcodeType
{
    EAN13 = 1,
    UPC_A = 2,
    Code128 = 3,
    WeighingScale = 4
}

public enum SaleStatus
{
    Completed = 1,
    Suspended = 2,
    Cancelled = 3,
    Refunded = 4,
    PartiallyRefunded = 5
}

public enum PaymentMethod
{
    Cash = 1,
    Card = 2,
    BankTransfer = 3,
    Credit = 4
}

public enum PurchaseStatus
{
    Draft = 1,
    Ordered = 2,
    Received = 3,
    Cancelled = 4
}

public enum StockTransactionType
{
    OpeningStock = 1,
    PurchaseReceived = 2,
    SaleDeduction = 3,
    SaleReturn = 4,
    AdjustmentIncrease = 5,
    AdjustmentDecrease = 6,
    TransferIn = 7,
    TransferOut = 8,
    Damage = 9,
    ExpiryDiscard = 10
}

public enum StockAdjustmentReason
{
    Damage = 1,
    Expiry = 2,
    Theft = 3,
    Found = 4,
    CountCorrection = 5,
    Other = 6
}

public enum CashSessionStatus
{
    Open = 1,
    Closed = 2
}

public enum CashMovementType
{
    CashIn = 1,
    CashOut = 2
}
