using GroceryPro.Domain.Entities;
using GroceryPro.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System;

namespace GroceryPro.Infrastructure.Data;

public class GroceryProDbContext : DbContext
{
    public GroceryProDbContext(DbContextOptions<GroceryProDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductBarcode> ProductBarcodes => Set<ProductBarcode>();
    public DbSet<ProductUnit> ProductUnits => Set<ProductUnit>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();

    public DbSet<StockBalance> StockBalances => Set<StockBalance>();
    public DbSet<StockTransaction> StockTransactions => Set<StockTransaction>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();
    public DbSet<StockAdjustmentItem> StockAdjustmentItems => Set<StockAdjustmentItem>();

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<SalesReturn> SalesReturns => Set<SalesReturn>();
    public DbSet<SalesReturnItem> SalesReturnItems => Set<SalesReturnItem>();

    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();
    public DbSet<SupplierPayment> SupplierPayments => Set<SupplierPayment>();

    public DbSet<CashSession> CashSessions => Set<CashSession>();
    public DbSet<CashMovement> CashMovements => Set<CashMovement>();
    public DbSet<Expense> Expenses => Set<Expense>();

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ShopSetting> ShopSettings => Set<ShopSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Avoid multiple cascade paths in SQL Server
        foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            relationship.DeleteBehavior = DeleteBehavior.Restrict;
        }

        // Many-to-many: UserRole
        modelBuilder.Entity<UserRole>(b =>
        {
            b.HasKey(ur => new { ur.UserId, ur.RoleId });
            b.HasOne(ur => ur.User)
             .WithMany(u => u.UserRoles)
             .HasForeignKey(ur => ur.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(ur => ur.Role)
             .WithMany(r => r.UserRoles)
             .HasForeignKey(ur => ur.RoleId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Many-to-many: RolePermission
        modelBuilder.Entity<RolePermission>(b =>
        {
            b.HasKey(rp => new { rp.RoleId, rp.PermissionId });
            b.HasOne(rp => rp.Role)
             .WithMany(r => r.RolePermissions)
             .HasForeignKey(rp => rp.RoleId)
             .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(rp => rp.Permission)
             .WithMany(p => p.RolePermissions)
             .HasForeignKey(rp => rp.PermissionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Unique indexes
        modelBuilder.Entity<User>(b =>
        {
            b.HasIndex(u => u.Username).IsUnique();
            b.HasIndex(u => u.Email).IsUnique();
            b.Property(u => u.Username).HasMaxLength(100).IsRequired();
            b.Property(u => u.Email).HasMaxLength(150).IsRequired();
        });

        modelBuilder.Entity<Product>(b =>
        {
            b.HasIndex(p => p.Sku).IsUnique();
            b.HasIndex(p => p.ScaleItemCode);
            b.Property(p => p.Sku).HasMaxLength(50).IsRequired();
            b.Property(p => p.NameEn).HasMaxLength(200).IsRequired();
            b.Property(p => p.NameSi).HasMaxLength(200).IsRequired();
            b.Property(p => p.CostPrice).HasPrecision(18, 2);
            b.Property(p => p.SellingPrice).HasPrecision(18, 2);
            b.Property(p => p.ReorderLevel).HasPrecision(18, 3);
        });

        modelBuilder.Entity<ProductBarcode>(b =>
        {
            b.HasIndex(pb => pb.Barcode).IsUnique();
            b.Property(pb => pb.Barcode).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<StockBalance>(b =>
        {
            b.HasIndex(sb => new { sb.LocationId, sb.ProductId, sb.BatchNumber }).IsUnique();
            b.Property(sb => sb.QuantityOnHand).HasPrecision(18, 4);
            b.Property(sb => sb.ReservedQuantity).HasPrecision(18, 4);
            b.Property(sb => sb.AverageCostPrice).HasPrecision(18, 2);
            b.Property(sb => sb.RowVersion).IsRowVersion();
        });

        modelBuilder.Entity<StockTransaction>(b =>
        {
            b.HasIndex(st => new { st.LocationId, st.ProductId, st.CreatedAtUtc });
            b.Property(st => st.QuantityChange).HasPrecision(18, 4);
            b.Property(st => st.ResultingBalance).HasPrecision(18, 4);
            b.Property(st => st.UnitCost).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Sale>(b =>
        {
            b.HasIndex(s => s.InvoiceNumber).IsUnique();
            b.HasIndex(s => s.IdempotencyKey);
            b.HasIndex(s => new { s.LocationId, s.CreatedAtUtc });
            b.Property(s => s.SubTotal).HasPrecision(18, 2);
            b.Property(s => s.DiscountAmount).HasPrecision(18, 2);
            b.Property(s => s.TaxAmount).HasPrecision(18, 2);
            b.Property(s => s.GrandTotal).HasPrecision(18, 2);
            b.Property(s => s.PaidAmount).HasPrecision(18, 2);
            b.Property(s => s.ChangeAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<SaleItem>(b =>
        {
            b.Property(si => si.Quantity).HasPrecision(18, 4);
            b.Property(si => si.UnitPrice).HasPrecision(18, 2);
            b.Property(si => si.UnitCost).HasPrecision(18, 2);
            b.Property(si => si.DiscountPercentage).HasPrecision(5, 2);
            b.Property(si => si.DiscountAmount).HasPrecision(18, 2);
            b.Property(si => si.LineTotal).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Payment>(b =>
        {
            b.Property(p => p.Amount).HasPrecision(18, 2);
            b.Property(p => p.TenderAmount).HasPrecision(18, 2);
            b.Property(p => p.ChangeAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Purchase>(b =>
        {
            b.HasIndex(p => p.PurchaseNumber).IsUnique();
            b.Property(p => p.SubTotal).HasPrecision(18, 2);
            b.Property(p => p.DiscountAmount).HasPrecision(18, 2);
            b.Property(p => p.TaxAmount).HasPrecision(18, 2);
            b.Property(p => p.GrandTotal).HasPrecision(18, 2);
            b.Property(p => p.PaidAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<PurchaseItem>(b =>
        {
            b.Property(pi => pi.QuantityOrdered).HasPrecision(18, 4);
            b.Property(pi => pi.QuantityReceived).HasPrecision(18, 4);
            b.Property(pi => pi.UnitCost).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Customer>(b =>
        {
            b.Property(c => c.CreditLimit).HasPrecision(18, 2);
            b.Property(c => c.CurrentCreditBalance).HasPrecision(18, 2);
        });

        modelBuilder.Entity<SalesReturn>(b =>
        {
            b.Property(sr => sr.TotalRefundAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<SalesReturnItem>(b =>
        {
            b.Property(sri => sri.QuantityReturned).HasPrecision(18, 4);
            b.Property(sri => sri.RefundAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<SupplierPayment>(b =>
        {
            b.Property(sp => sp.Amount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Supplier>(b =>
        {
            b.Property(s => s.CurrentBalance).HasPrecision(18, 2);
        });

        modelBuilder.Entity<CashSession>(b =>
        {
            b.HasIndex(cs => cs.SessionNumber).IsUnique();
            b.Property(cs => cs.OpeningCash).HasPrecision(18, 2);
            b.Property(cs => cs.TotalCashSales).HasPrecision(18, 2);
            b.Property(cs => cs.TotalCashIn).HasPrecision(18, 2);
            b.Property(cs => cs.TotalCashOut).HasPrecision(18, 2);
            b.Property(cs => cs.ClosingCashDeclared).HasPrecision(18, 2);
        });

        modelBuilder.Entity<CashMovement>(b =>
        {
            b.Property(cm => cm.Amount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Expense>(b =>
        {
            b.Property(e => e.Amount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<StockAdjustmentItem>(b =>
        {
            b.Property(sai => sai.SystemQuantity).HasPrecision(18, 4);
            b.Property(sai => sai.PhysicalQuantity).HasPrecision(18, 4);
            b.Property(sai => sai.UnitCost).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Unit>(b =>
        {
            b.Property(u => u.ConversionFactorToBase).HasPrecision(18, 6);
        });

        modelBuilder.Entity<ProductUnit>(b =>
        {
            b.Property(pu => pu.ConversionFactor).HasPrecision(18, 6);
            b.Property(pu => pu.SellingPrice).HasPrecision(18, 2);
        });

        modelBuilder.Entity<ShopSetting>(b =>
        {
            b.HasIndex(s => s.Key).IsUnique();
        });
    }
}
