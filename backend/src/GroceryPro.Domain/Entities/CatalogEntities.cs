using GroceryPro.Domain.Common;
using GroceryPro.Domain.Enums;
using System;
using System.Collections.Generic;

namespace GroceryPro.Domain.Entities;

public class Location : BaseEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "MAIN", "BRANCH-01"
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public bool IsMain { get; set; } = false;
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<StockBalance> StockBalances { get; set; } = new List<StockBalance>();
    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
    public ICollection<CashSession> CashSessions { get; set; } = new List<CashSession>();
}

public class Category : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ParentCategoryId { get; set; }
    public Category? ParentCategory { get; set; }
    public ICollection<Category> SubCategories { get; set; } = new List<Category>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Unit : BaseEntity
{
    public string Code { get; set; } = string.Empty; // e.g., "g", "kg", "pcs", "pkt", "btl", "ml", "l"
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public UnitType UnitType { get; set; }
    public bool IsBaseUnit { get; set; } = false;
    public decimal ConversionFactorToBase { get; set; } = 1.0m; // e.g., 1 kg = 1000 g
    public Guid? BaseUnitId { get; set; }
    public Unit? BaseUnit { get; set; }
    public int DecimalPlaces { get; set; } = 0; // 0 for pcs, 3 for kg/g
}

public class Product : BaseEntity
{
    public string Sku { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameSi { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public Guid UnitId { get; set; } // Default/Display Unit
    public Unit Unit { get; set; } = null!;

    public bool IsWeightBased { get; set; } = false; // Weighing scale item
    public string? ScaleItemCode { get; set; } // 4-5 digit item code parsed from weighing barcode (e.g. 00123)

    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal ReorderLevel { get; set; } = 10m;
    public ProductStatus Status { get; set; } = ProductStatus.Active;
    public bool AllowNegativeStock { get; set; } = false;
    public bool TrackExpiry { get; set; } = true;

    // Navigation
    public ICollection<ProductBarcode> Barcodes { get; set; } = new List<ProductBarcode>();
    public ICollection<ProductUnit> ProductUnits { get; set; } = new List<ProductUnit>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<StockBalance> StockBalances { get; set; } = new List<StockBalance>();
    public ICollection<StockTransaction> StockTransactions { get; set; } = new List<StockTransaction>();
    public ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();
    public ICollection<PurchaseItem> PurchaseItems { get; set; } = new List<PurchaseItem>();
}

public class ProductBarcode : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string Barcode { get; set; } = string.Empty;
    public BarcodeType BarcodeType { get; set; } = BarcodeType.Code128;
    public bool IsPrimary { get; set; } = false;
    public string? Description { get; set; } // e.g., "Outer carton", "Manufacturer pack"
}

public class ProductUnit : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public Guid UnitId { get; set; }
    public Unit Unit { get; set; } = null!;

    public decimal ConversionFactor { get; set; } = 1.0m;
    public decimal SellingPrice { get; set; }
}

public class ProductImage : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; } = false;
    public string? Caption { get; set; }
}
