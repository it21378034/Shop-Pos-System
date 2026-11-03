using GroceryPro.Domain.Entities;
using GroceryPro.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace GroceryPro.Infrastructure.Data;

public static class DbInitializer
{
    public static string HashPassword(string password)
    {
        // PBKDF2 / SHA256 secure hash
        byte[] salt = Encoding.UTF8.GetBytes("GroceryPro_Secure_Salt_2026#!");
        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 100000, HashAlgorithmName.SHA256);
        byte[] hash = pbkdf2.GetBytes(32);
        return Convert.ToBase64String(hash);
    }

    public static async Task SeedAsync(GroceryProDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        if (await context.Users.AnyAsync())
        {
            return; // Already seeded
        }

        // 1. Locations
        var mainLocation = new Location
        {
            Code = "MAIN",
            NameEn = "Main Branch - Colombo",
            NameSi = "ප්‍රධාන ශාඛාව - කොළඹ",
            Address = "No 120, Galle Road, Colombo 03, Sri Lanka",
            Phone = "+94 11 234 5678",
            IsMain = true,
            IsActive = true
        };
        await context.Locations.AddAsync(mainLocation);

        // 2. Units
        var unitPcs = new Unit { Code = "pcs", NameEn = "Pieces", NameSi = "කෑලි", UnitType = UnitType.Count, IsBaseUnit = true, ConversionFactorToBase = 1m, DecimalPlaces = 0 };
        var unitPkt = new Unit { Code = "pkt", NameEn = "Packet", NameSi = "පැකට්", UnitType = UnitType.Count, IsBaseUnit = true, ConversionFactorToBase = 1m, DecimalPlaces = 0 };
        var unitBtl = new Unit { Code = "btl", NameEn = "Bottle", NameSi = "බෝතල්", UnitType = UnitType.Count, IsBaseUnit = true, ConversionFactorToBase = 1m, DecimalPlaces = 0 };
        var unitG = new Unit { Code = "g", NameEn = "Grams", NameSi = "ග්‍රෑම්", UnitType = UnitType.Weight, IsBaseUnit = true, ConversionFactorToBase = 1m, DecimalPlaces = 0 };
        var unitKg = new Unit { Code = "kg", NameEn = "Kilograms", NameSi = "කිලෝග්‍රෑම්", UnitType = UnitType.Weight, IsBaseUnit = false, ConversionFactorToBase = 1000m, DecimalPlaces = 3 };
        var unitMl = new Unit { Code = "ml", NameEn = "Millilitres", NameSi = "මිලිලීටර්", UnitType = UnitType.Volume, IsBaseUnit = true, ConversionFactorToBase = 1m, DecimalPlaces = 0 };
        var unitL = new Unit { Code = "l", NameEn = "Litres", NameSi = "ලීටර්", UnitType = UnitType.Volume, IsBaseUnit = false, ConversionFactorToBase = 1000m, DecimalPlaces = 2 };

        await context.Units.AddRangeAsync(unitPcs, unitPkt, unitBtl, unitG, unitKg, unitMl, unitL);

        // 3. Roles
        var superAdminRole = new Role { Name = "SuperAdmin", Description = "System Owner with full access", RoleType = RoleType.SuperAdmin };
        var adminRole = new Role { Name = "Admin", Description = "Store Administrator", RoleType = RoleType.Admin };
        var managerRole = new Role { Name = "Manager", Description = "Store Inventory & Cash Manager", RoleType = RoleType.Manager };
        var cashierRole = new Role { Name = "Cashier", Description = "Point of Sale Cashier", RoleType = RoleType.Cashier };

        await context.Roles.AddRangeAsync(superAdminRole, adminRole, managerRole, cashierRole);

        // 4. Permissions
        var permissions = new List<Permission>
        {
            new() { Code = "POS.Access", Name = "Access POS Terminal", Module = "POS" },
            new() { Code = "POS.Checkout", Name = "Process Sales & Checkout", Module = "POS" },
            new() { Code = "POS.Discount", Name = "Apply Manual Discounts", Module = "POS" },
            new() { Code = "POS.Returns", Name = "Process Sales Returns", Module = "POS" },
            new() { Code = "Products.View", Name = "View Products", Module = "Products" },
            new() { Code = "Products.Manage", Name = "Create & Edit Products", Module = "Products" },
            new() { Code = "Inventory.View", Name = "View Stock Levels", Module = "Inventory" },
            new() { Code = "Inventory.Adjust", Name = "Adjust Stock Balances", Module = "Inventory" },
            new() { Code = "Purchases.Manage", Name = "Manage Purchases & Suppliers", Module = "Purchasing" },
            new() { Code = "Reports.View", Name = "View Business Reports", Module = "Reports" },
            new() { Code = "Cash.Manage", Name = "Manage Register Sessions & Expenses", Module = "Cash" },
            new() { Code = "Users.Manage", Name = "Manage Users & Permissions", Module = "Users" },
            new() { Code = "Settings.Manage", Name = "Configure Store Settings", Module = "Settings" }
        };
        await context.Permissions.AddRangeAsync(permissions);

        foreach (var perm in permissions)
        {
            await context.RolePermissions.AddAsync(new RolePermission { Role = superAdminRole, Permission = perm });
            await context.RolePermissions.AddAsync(new RolePermission { Role = adminRole, Permission = perm });
            if (perm.Module != "Users" && perm.Module != "Settings")
            {
                await context.RolePermissions.AddAsync(new RolePermission { Role = managerRole, Permission = perm });
            }
            if (perm.Module == "POS" || perm.Code == "Products.View" || perm.Code == "Cash.Manage")
            {
                await context.RolePermissions.AddAsync(new RolePermission { Role = cashierRole, Permission = perm });
            }
        }

        // 5. Users
        var superAdminUser = new User
        {
            Username = "admin",
            Email = "admin@grocerypro.lk",
            FullName = "Store Administrator",
            PasswordHash = HashPassword("Admin@123"),
            PhoneNumber = "+94 77 123 4567",
            IsActive = true,
            DefaultLocation = mainLocation
        };

        var cashierUser = new User
        {
            Username = "cashier1",
            Email = "cashier1@grocerypro.lk",
            FullName = "Sunil Perera (Cashier 01)",
            PasswordHash = HashPassword("Cashier@123"),
            PhoneNumber = "+94 71 987 6543",
            IsActive = true,
            DefaultLocation = mainLocation
        };

        await context.Users.AddRangeAsync(superAdminUser, cashierUser);
        await context.UserRoles.AddAsync(new UserRole { User = superAdminUser, Role = superAdminRole });
        await context.UserRoles.AddAsync(new UserRole { User = cashierUser, Role = cashierRole });

        // 6. Categories
        var catRice = new Category { Code = "RICE", NameEn = "Rice & Grains", NameSi = "සහල් සහ ධාන්‍ය", Description = "Staple rice varieties, flour and grains" };
        var catVeg = new Category { Code = "VEG", NameEn = "Fresh Vegetables", NameSi = "නැවුම් එළවළු", Description = "Daily fresh farm vegetables" };
        var catDairy = new Category { Code = "DAIRY", NameEn = "Dairy & Milk", NameSi = "කිරි නිෂ්පාදන", Description = "Fresh milk, milk powder, butter and cheese" };
        var catBeverages = new Category { Code = "BEV", NameEn = "Tea & Beverages", NameSi = "තේ සහ බීම වර්ග", Description = "Ceylon tea, coffee, juices and soft drinks" };
        var catSnacks = new Category { Code = "SNACK", NameEn = "Snacks & Biscuits", NameSi = "කෙටි ආහාර සහ බිස්කට්", Description = "Biscuits, wafers and confectionery" };
        var catHousehold = new Category { Code = "HOUSE", NameEn = "Household & Cleaning", NameSi = "ගෘහ හා පිරිසිදුකාරක", Description = "Soaps, detergents and household essentials" };
        var catSpices = new Category { Code = "SPICE", NameEn = "Spices & Condiments", NameSi = "කුළුබඩු සහ රසකාරක", Description = "Curry powders, chili, cinnamon and salt" };

        await context.Categories.AddRangeAsync(catRice, catVeg, catDairy, catBeverages, catSnacks, catHousehold, catSpices);

        // 7. Suppliers
        var supCargills = new Supplier { Code = "SUP-01", CompanyName = "Ceylon Agro Distributors", ContactPerson = "Kamal Gunaratne", Phone = "+94 11 445 5667", Email = "kamal@ceylonagro.lk", Address = "Peliyagoda, Kelaniya", IsActive = true };
        var supFonterra = new Supplier { Code = "SUP-02", CompanyName = "Lanka Dairy & Beverage Ltd", ContactPerson = "Ruwan Silva", Phone = "+94 11 289 1234", Email = "orders@lankadairy.lk", Address = "Biyagama Export Zone", IsActive = true };
        var supMunchee = new Supplier { Code = "SUP-03", CompanyName = "Ceylon Confectionery Distributors", ContactPerson = "Anura Dissanayake", Phone = "+94 11 889 0011", Email = "sales@ceylonbiscuits.lk", Address = "Pannipitiya, Colombo", IsActive = true };

        await context.Suppliers.AddRangeAsync(supCargills, supFonterra, supMunchee);

        // 8. Sample Products
        var p1 = new Product
        {
            Sku = "RIC-KS-05K",
            NameEn = "Araliya Keeri Samba Rice 5kg",
            NameSi = "අරලිය කීරි සම්බා 5kg",
            Category = catRice,
            Unit = unitPkt,
            IsWeightBased = false,
            CostPrice = 1450.00m,
            SellingPrice = 1680.00m,
            ReorderLevel = 15m,
            Status = ProductStatus.Active
        };
        p1.Barcodes.Add(new ProductBarcode { Barcode = "4791001001015", BarcodeType = BarcodeType.EAN13, IsPrimary = true, Description = "Manufacturer EAN-13" });

        var p2 = new Product
        {
            Sku = "RIC-WR-KG",
            NameEn = "White Raw Rice (Loose)",
            NameSi = "සුදු කැකුළු සහල් (තොග)",
            Category = catRice,
            Unit = unitKg,
            IsWeightBased = true,
            ScaleItemCode = "00101", // Scales encode as: 21 + 00101 + WWWWW + C
            CostPrice = 195.00m,
            SellingPrice = 230.00m,
            ReorderLevel = 100m,
            Status = ProductStatus.Active
        };
        p2.Barcodes.Add(new ProductBarcode { Barcode = "2100101000000", BarcodeType = BarcodeType.WeighingScale, IsPrimary = true, Description = "Scale Base Barcode" });
        p2.Barcodes.Add(new ProductBarcode { Barcode = "RAW-RICE-01", BarcodeType = BarcodeType.Code128, IsPrimary = false, Description = "Manual POS Code" });

        var p3 = new Product
        {
            Sku = "VEG-RON-KG",
            NameEn = "Red Onions (Local)",
            NameSi = "රතු ළූණු (දේශීය)",
            Category = catVeg,
            Unit = unitKg,
            IsWeightBased = true,
            ScaleItemCode = "00102",
            CostPrice = 380.00m,
            SellingPrice = 450.00m,
            ReorderLevel = 40m,
            Status = ProductStatus.Active
        };
        p3.Barcodes.Add(new ProductBarcode { Barcode = "2100102000000", BarcodeType = BarcodeType.WeighingScale, IsPrimary = true, Description = "Scale Barcode" });

        var p4 = new Product
        {
            Sku = "VEG-POT-KG",
            NameEn = "Nuwara Eliya Potatoes",
            NameSi = "නුවරඑළිය අල",
            Category = catVeg,
            Unit = unitKg,
            IsWeightBased = true,
            ScaleItemCode = "00103",
            CostPrice = 280.00m,
            SellingPrice = 340.00m,
            ReorderLevel = 50m,
            Status = ProductStatus.Active
        };
        p4.Barcodes.Add(new ProductBarcode { Barcode = "2100103000000", BarcodeType = BarcodeType.WeighingScale, IsPrimary = true, Description = "Scale Barcode" });

        var p5 = new Product
        {
            Sku = "DRY-ANC-400",
            NameEn = "Anchor Full Cream Milk Powder 400g",
            NameSi = "ඇන්කර් සම්පූර්ණ යොදය සහිත කිරිපිටි 400g",
            Category = catDairy,
            Unit = unitPkt,
            IsWeightBased = false,
            CostPrice = 980.00m,
            SellingPrice = 1120.00m,
            ReorderLevel = 25m,
            Status = ProductStatus.Active
        };
        p5.Barcodes.Add(new ProductBarcode { Barcode = "9414200115024", BarcodeType = BarcodeType.EAN13, IsPrimary = true, Description = "Manufacturer EAN-13" });

        var p6 = new Product
        {
            Sku = "DRY-HGH-01L",
            NameEn = "Highland Fresh Milk 1 Litre",
            NameSi = "හයිලන්ඩ් නැවුම් කිරි 1L",
            Category = catDairy,
            Unit = unitL,
            IsWeightBased = false,
            CostPrice = 440.00m,
            SellingPrice = 520.00m,
            ReorderLevel = 20m,
            Status = ProductStatus.Active
        };
        p6.Barcodes.Add(new ProductBarcode { Barcode = "4792024010023", BarcodeType = BarcodeType.EAN13, IsPrimary = true, Description = "EAN Barcode" });

        var p7 = new Product
        {
            Sku = "BEV-DLM-200",
            NameEn = "Dilmah Premium Ceylon Tea 200g",
            NameSi = "දිල්මා වාරික ලංකා තේ 200g",
            Category = catBeverages,
            Unit = unitPkt,
            IsWeightBased = false,
            CostPrice = 620.00m,
            SellingPrice = 740.00m,
            ReorderLevel = 20m,
            Status = ProductStatus.Active
        };
        p7.Barcodes.Add(new ProductBarcode { Barcode = "9312631131109", BarcodeType = BarcodeType.EAN13, IsPrimary = true, Description = "EAN-13 Barcode" });

        var p8 = new Product
        {
            Sku = "SNK-MNC-500",
            NameEn = "Munchee Super Cream Cracker 500g",
            NameSi = "මැන්චී සුපර් ක්‍රීම් ක්‍රැකර් 500g",
            Category = catSnacks,
            Unit = unitPkt,
            IsWeightBased = false,
            CostPrice = 420.00m,
            SellingPrice = 490.00m,
            ReorderLevel = 30m,
            Status = ProductStatus.Active
        };
        p8.Barcodes.Add(new ProductBarcode { Barcode = "4792011002017", BarcodeType = BarcodeType.EAN13, IsPrimary = true, Description = "Manufacturer Barcode" });

        var p9 = new Product
        {
            Sku = "HOU-SUN-120",
            NameEn = "Sunlight Washing Soap 120g",
            NameSi = "සන්ලයිට් රෙදි සෝදන සබන් 120g",
            Category = catHousehold,
            Unit = unitPcs,
            IsWeightBased = false,
            CostPrice = 110.00m,
            SellingPrice = 135.00m,
            ReorderLevel = 50m,
            Status = ProductStatus.Active
        };
        p9.Barcodes.Add(new ProductBarcode { Barcode = "8901030018234", BarcodeType = BarcodeType.EAN13, IsPrimary = true, Description = "Standard Soap Barcode" });

        var p10 = new Product
        {
            Sku = "SPC-DHL-KG",
            NameEn = "Red Dhal / Mysore Lentils (Loose)",
            NameSi = "රතු පරිප්පු (තොග)",
            Category = catSpices,
            Unit = unitKg,
            IsWeightBased = true,
            ScaleItemCode = "00104",
            CostPrice = 290.00m,
            SellingPrice = 360.00m,
            ReorderLevel = 80m,
            Status = ProductStatus.Active
        };
        p10.Barcodes.Add(new ProductBarcode { Barcode = "2100104000000", BarcodeType = BarcodeType.WeighingScale, IsPrimary = true, Description = "Scale Barcode" });

        var p11 = new Product
        {
            Sku = "SPC-SUG-KG",
            NameEn = "Brown Sugar 1kg Pack",
            NameSi = "දුඹුරු සීනි 1kg",
            Category = catSpices,
            Unit = unitPkt,
            IsWeightBased = false,
            CostPrice = 285.00m,
            SellingPrice = 330.00m,
            ReorderLevel = 40m,
            Status = ProductStatus.Active
        };
        p11.Barcodes.Add(new ProductBarcode { Barcode = "4796000010041", BarcodeType = BarcodeType.EAN13, IsPrimary = true, Description = "Sugar Pack Barcode" });

        var p12 = new Product
        {
            Sku = "VEG-COC-PCS",
            NameEn = "Fresh Coconut (Large)",
            NameSi = "පොල් (විශාල)",
            Category = catVeg,
            Unit = unitPcs,
            IsWeightBased = false,
            CostPrice = 115.00m,
            SellingPrice = 140.00m,
            ReorderLevel = 50m,
            Status = ProductStatus.Active
        };
        p12.Barcodes.Add(new ProductBarcode { Barcode = "COC-LG-01", BarcodeType = BarcodeType.Code128, IsPrimary = true, Description = "POS Barcode" });

        var products = new List<Product> { p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12 };
        await context.Products.AddRangeAsync(products);

        // 9. Initial Stock Balances & Ledger Transactions
        var initialStockQuantities = new Dictionary<string, decimal>
        {
            { p1.Sku, 50m },
            { p2.Sku, 250m },
            { p3.Sku, 120m },
            { p4.Sku, 150m },
            { p5.Sku, 80m },
            { p6.Sku, 45m },
            { p7.Sku, 60m },
            { p8.Sku, 90m },
            { p9.Sku, 200m },
            { p10.Sku, 180m },
            { p11.Sku, 100m },
            { p12.Sku, 120m }
        };

        foreach (var p in products)
        {
            decimal qty = initialStockQuantities[p.Sku];
            var stockBal = new StockBalance
            {
                Location = mainLocation,
                Product = p,
                BatchNumber = "INIT-BATCH-01",
                ExpiryDate = DateTime.UtcNow.AddMonths(12),
                QuantityOnHand = qty,
                AverageCostPrice = p.CostPrice,
                LastRestockedAtUtc = DateTime.UtcNow
            };
            await context.StockBalances.AddAsync(stockBal);

            var stockTx = new StockTransaction
            {
                Location = mainLocation,
                Product = p,
                BatchNumber = "INIT-BATCH-01",
                TransactionType = StockTransactionType.OpeningStock,
                QuantityChange = qty,
                ResultingBalance = qty,
                UnitCost = p.CostPrice,
                ReferenceType = "OpeningStock",
                ReferenceNumber = "OPN-20261101",
                Notes = "Initial inventory setup"
            };
            await context.StockTransactions.AddAsync(stockTx);
        }

        // 10. Sample Customer
        var customer1 = new Customer
        {
            Name = "Nimal Jayawardena",
            PhoneNumber = "+94 77 555 1234",
            Email = "nimal@gmail.com",
            Address = "No 45, Duplication Road, Colombo 04",
            CreditLimit = 25000.00m,
            CurrentCreditBalance = 0m,
            LoyaltyPoints = 120
        };
        await context.Customers.AddAsync(customer1);

        // 11. Settings
        var settings = new List<ShopSetting>
        {
            new() { Key = "ShopName", Value = "GroceryPro Supermarket", Group = "General", Description = "Store Display Name" },
            new() { Key = "ShopNameSi", Value = "ග්‍රොසරිප්‍රෝ සුපිරි වෙළඳසැල", Group = "General", Description = "Store Display Name in Sinhala" },
            new() { Key = "Address", Value = "No 120, Galle Road, Colombo 03, Sri Lanka", Group = "General" },
            new() { Key = "Phone", Value = "+94 11 234 5678", Group = "General" },
            new() { Key = "Currency", Value = "LKR", Group = "General" },
            new() { Key = "CurrencySymbol", Value = "Rs.", Group = "General" },
            new() { Key = "TaxPercentage", Value = "0", Group = "Tax", Description = "Local sales tax percentage (VAT/SSCL)" },
            new() { Key = "ScaleBarcodePrefix", Value = "21", Group = "ScaleBarcode", Description = "Weighing scale EAN-13 2-digit prefix" },
            new() { Key = "ScaleItemCodeLength", Value = "5", Group = "ScaleBarcode", Description = "Length of scale item identifier digits" },
            new() { Key = "ScaleWeightFormat", Value = "WWWWW", Group = "ScaleBarcode", Description = "Weight format (WWWWW in grams, e.g. 01250 = 1.250kg)" },
            new() { Key = "ReceiptHeader", Value = "Thank you for shopping at GroceryPro!", Group = "Receipt" },
            new() { Key = "ReceiptHeaderSi", Value = "ග්‍රොසරිප්‍රෝ වෙතින් සාප්පු සවාරි ගියාට ස්තුතියි!", Group = "Receipt" },
            new() { Key = "ReceiptFooter", Value = "Exchange possible within 7 days with this receipt.", Group = "Receipt" },
            new() { Key = "ReceiptFooterSi", Value = "දින 7ක් ඇතුළත බිල්පත සමඟ භාණ්ඩ මාරු කළ හැක.", Group = "Receipt" }
        };
        await context.ShopSettings.AddRangeAsync(settings);

        await context.SaveChangesAsync();
    }
}
