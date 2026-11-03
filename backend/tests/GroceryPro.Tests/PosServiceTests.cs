using FluentAssertions;
using GroceryPro.Application.DTOs;
using GroceryPro.Domain.Entities;
using GroceryPro.Domain.Enums;
using GroceryPro.Infrastructure.Data;
using GroceryPro.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace GroceryPro.Tests;

public class PosServiceTests
{
    private GroceryProDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<GroceryProDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new GroceryProDbContext(options);
    }

    [Fact]
    public async Task ProcessCheckoutAsync_ShouldDeductStockAndCalculateCorrectTotals()
    {
        // Arrange
        using var context = CreateDbContext();
        var barcodeService = new BarcodeService();
        var posService = new PosService(context, barcodeService);

        var location = new Location { Code = "MAIN", NameEn = "Main Branch", NameSi = "ප්‍රධාන ශාඛාව" };
        var cashier = new User { Username = "cashier", Email = "c@test.com", FullName = "Test Cashier" };
        var unit = new Unit { Code = "pkt", NameEn = "Packet", NameSi = "පැකට්", UnitType = UnitType.Count };
        var category = new Category { Code = "RICE", NameEn = "Rice", NameSi = "සහල්" };

        var product = new Product
        {
            Sku = "TEST-RICE-01",
            NameEn = "Test Samba Rice 5kg",
            NameSi = "ටෙස්ට් සම්බා 5kg",
            Category = category,
            Unit = unit,
            CostPrice = 1000m,
            SellingPrice = 1200m,
            AllowNegativeStock = false
        };

        var stockBalance = new StockBalance
        {
            Location = location,
            Product = product,
            BatchNumber = "BATCH-01",
            QuantityOnHand = 10m,
            AverageCostPrice = 1000m
        };

        await context.Locations.AddAsync(location);
        await context.Users.AddAsync(cashier);
        await context.Units.AddAsync(unit);
        await context.Categories.AddAsync(category);
        await context.Products.AddAsync(product);
        await context.StockBalances.AddAsync(stockBalance);
        await context.SaveChangesAsync();

        var request = new CheckoutRequestDto
        {
            IdempotencyKey = "TEST-CHECKOUT-KEY-001",
            TerminalId = "POS-01",
            Items = new List<CartItemDto>
            {
                new()
                {
                    ProductId = product.Id,
                    Quantity = 2m,
                    UnitPrice = 1200m
                }
            },
            Payments = new List<PaymentItemDto>
            {
                new()
                {
                    PaymentMethod = PaymentMethod.Cash,
                    Amount = 2400m,
                    TenderAmount = 3000m
                }
            }
        };

        // Act
        var receipt = await posService.ProcessCheckoutAsync(request, cashier.Id, location.Id);

        // Assert
        receipt.Should().NotBeNull();
        receipt.GrandTotal.Should().Be(2400m);
        receipt.PaidAmount.Should().Be(2400m);
        receipt.ChangeAmount.Should().Be(600m); // 3000 - 2400
        receipt.Items.Should().HaveCount(1);
        receipt.Items[0].Quantity.Should().Be(2m);

        // Verify database stock balance was deducted
        var updatedStock = await context.StockBalances.FirstAsync(sb => sb.Id == stockBalance.Id);
        updatedStock.QuantityOnHand.Should().Be(8m); // 10 - 2

        // Verify stock transaction ledger record
        var stockTx = await context.StockTransactions.FirstOrDefaultAsync(tx => tx.ProductId == product.Id);
        stockTx.Should().NotBeNull();
        stockTx!.QuantityChange.Should().Be(-2m);
        stockTx.TransactionType.Should().Be(StockTransactionType.SaleDeduction);
    }

    [Fact]
    public async Task ProcessCheckoutAsync_WhenInsufficientStockAndNegativeStockDisallowed_ShouldThrowException()
    {
        // Arrange
        using var context = CreateDbContext();
        var barcodeService = new BarcodeService();
        var posService = new PosService(context, barcodeService);

        var location = new Location { Code = "MAIN", NameEn = "Main Branch", NameSi = "ප්‍රධාන ශාඛාව" };
        var cashier = new User { Username = "cashier", Email = "c@test.com", FullName = "Test Cashier" };
        var unit = new Unit { Code = "pcs", NameEn = "Piece", NameSi = "කෑලි", UnitType = UnitType.Count };
        var category = new Category { Code = "SNACK", NameEn = "Snack", NameSi = "කෑම" };

        var product = new Product
        {
            Sku = "TEST-SNACK",
            NameEn = "Test Snack",
            NameSi = "ටෙස්ට් ස්නැක්",
            Category = category,
            Unit = unit,
            CostPrice = 50m,
            SellingPrice = 80m,
            AllowNegativeStock = false
        };

        var stockBalance = new StockBalance
        {
            Location = location,
            Product = product,
            BatchNumber = "BATCH-01",
            QuantityOnHand = 2m,
            AverageCostPrice = 50m
        };

        await context.Locations.AddAsync(location);
        await context.Users.AddAsync(cashier);
        await context.Units.AddAsync(unit);
        await context.Categories.AddAsync(category);
        await context.Products.AddAsync(product);
        await context.StockBalances.AddAsync(stockBalance);
        await context.SaveChangesAsync();

        var request = new CheckoutRequestDto
        {
            Items = new List<CartItemDto>
            {
                new() { ProductId = product.Id, Quantity = 5m, UnitPrice = 80m } // Wants 5, only 2 available
            }
        };

        // Act & Assert
        Func<Task> act = async () => await posService.ProcessCheckoutAsync(request, cashier.Id, location.Id);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Insufficient stock*");
    }
}
