using GroceryPro.Application.Interfaces;
using GroceryPro.Domain.Entities;
using GroceryPro.Domain.Enums;
using GroceryPro.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace GroceryPro.API.Controllers;

public class ProductUpsertDto
{
    [Required]
    public string Sku { get; set; } = string.Empty;

    [Required]
    public string NameEn { get; set; } = string.Empty;

    [Required]
    public string NameSi { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public Guid CategoryId { get; set; }

    [Required]
    public Guid UnitId { get; set; }

    public bool IsWeightBased { get; set; } = false;
    public string? ScaleItemCode { get; set; }

    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal ReorderLevel { get; set; } = 10m;
    public ProductStatus Status { get; set; } = ProductStatus.Active;
    public bool AllowNegativeStock { get; set; } = false;

    public List<string> Barcodes { get; set; } = new();
    public decimal InitialStockQuantity { get; set; } = 0m;
}

[Authorize]
public class ProductsController : BaseApiController
{
    private readonly GroceryProDbContext _context;
    private readonly IBarcodeService _barcodeService;

    public ProductsController(GroceryProDbContext context, IBarcodeService barcodeService)
    {
        _context = context;
        _barcodeService = barcodeService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] Guid? categoryId,
        [FromQuery] bool? isWeightBased,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .Include(p => p.Unit)
            .Include(p => p.Barcodes)
            .Where(p => !p.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            string s = search.Trim().ToLower();
            query = query.Where(p => p.Sku.ToLower().Contains(s)
                                  || p.NameEn.ToLower().Contains(s)
                                  || p.NameSi.ToLower().Contains(s)
                                  || (p.ScaleItemCode != null && p.ScaleItemCode.Contains(s))
                                  || p.Barcodes.Any(b => b.Barcode.Contains(s)));
        }

        if (categoryId.HasValue)
        {
            query = query.Where(p => p.CategoryId == categoryId.Value);
        }

        if (isWeightBased.HasValue)
        {
            query = query.Where(p => p.IsWeightBased == isWeightBased.Value);
        }

        int total = await query.CountAsync();
        var items = await query
            .OrderBy(p => p.NameEn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.Sku,
                p.NameEn,
                p.NameSi,
                p.Description,
                p.CategoryId,
                CategoryName = p.Category.NameEn,
                CategoryNameSi = p.Category.NameSi,
                p.UnitId,
                UnitCode = p.Unit.Code,
                UnitNameEn = p.Unit.NameEn,
                p.IsWeightBased,
                p.ScaleItemCode,
                p.CostPrice,
                p.SellingPrice,
                p.ReorderLevel,
                p.Status,
                p.AllowNegativeStock,
                Barcodes = p.Barcodes.Select(b => new { b.Id, b.Barcode, b.BarcodeType, b.IsPrimary }).ToList()
            })
            .ToListAsync();

        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var productIds = items.Select(p => p.Id).ToList();
        var stockMap = await _context.StockBalances
            .Where(sb => sb.LocationId == locationId && productIds.Contains(sb.ProductId))
            .GroupBy(sb => sb.ProductId)
            .Select(g => new { ProductId = g.Key, Stock = g.Sum(sb => sb.QuantityOnHand) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Stock);

        var resultItems = items.Select(p => new
        {
            p.Id,
            p.Sku,
            p.NameEn,
            p.NameSi,
            p.Description,
            p.CategoryId,
            p.CategoryName,
            p.CategoryNameSi,
            p.UnitId,
            p.UnitCode,
            p.UnitNameEn,
            p.IsWeightBased,
            p.ScaleItemCode,
            p.CostPrice,
            p.SellingPrice,
            p.ReorderLevel,
            p.Status,
            p.AllowNegativeStock,
            p.Barcodes,
            StockOnHand = stockMap.TryGetValue(p.Id, out var s) ? s : 0m
        }).ToList();

        return Ok(new { total, page, pageSize, items = resultItems });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Unit)
            .Include(p => p.Barcodes)
            .Include(p => p.StockBalances)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (product == null) return NotFound();

        return Ok(product);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin,Manager")]
    public async Task<IActionResult> Create([FromBody] ProductUpsertDto dto)
    {
        if (await _context.Products.AnyAsync(p => p.Sku == dto.Sku.Trim() && !p.IsDeleted))
        {
            return BadRequest(new { message = $"SKU '{dto.Sku}' already exists." });
        }

        var product = new Product
        {
            Sku = dto.Sku.Trim().ToUpper(),
            NameEn = dto.NameEn.Trim(),
            NameSi = dto.NameSi.Trim(),
            Description = dto.Description,
            CategoryId = dto.CategoryId,
            UnitId = dto.UnitId,
            IsWeightBased = dto.IsWeightBased,
            ScaleItemCode = dto.ScaleItemCode?.Trim(),
            CostPrice = dto.CostPrice,
            SellingPrice = dto.SellingPrice,
            ReorderLevel = dto.ReorderLevel,
            Status = dto.Status,
            AllowNegativeStock = dto.AllowNegativeStock
        };

        // If no barcode provided, generate custom Code128 barcode
        if (dto.Barcodes == null || !dto.Barcodes.Any())
        {
            product.Barcodes.Add(new ProductBarcode
            {
                Barcode = product.Sku,
                BarcodeType = BarcodeType.Code128,
                IsPrimary = true
            });
        }
        else
        {
            bool first = true;
            foreach (var b in dto.Barcodes.Where(b => !string.IsNullOrWhiteSpace(b)))
            {
                product.Barcodes.Add(new ProductBarcode
                {
                    Barcode = b.Trim(),
                    BarcodeType = b.Length == 13 ? BarcodeType.EAN13 : BarcodeType.Code128,
                    IsPrimary = first
                });
                first = false;
            }
        }

        _context.Products.Add(product);

        // Initial stock setup if specified
        if (dto.InitialStockQuantity > 0)
        {
            var location = await _context.Locations.FirstOrDefaultAsync(l => l.IsMain)
                        ?? await _context.Locations.FirstAsync();

            var stockBal = new StockBalance
            {
                Location = location,
                Product = product,
                BatchNumber = "INIT-STOCK",
                QuantityOnHand = dto.InitialStockQuantity,
                AverageCostPrice = dto.CostPrice
            };
            _context.StockBalances.Add(stockBal);

            var stockTx = new StockTransaction
            {
                Location = location,
                Product = product,
                BatchNumber = "INIT-STOCK",
                TransactionType = StockTransactionType.OpeningStock,
                QuantityChange = dto.InitialStockQuantity,
                ResultingBalance = dto.InitialStockQuantity,
                UnitCost = dto.CostPrice,
                ReferenceType = "InitialStock",
                ReferenceNumber = product.Sku,
                Notes = "Added on product creation"
            };
            _context.StockTransactions.Add(stockTx);
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin,Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ProductUpsertDto dto)
    {
        var product = await _context.Products
            .Include(p => p.Barcodes)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (product == null) return NotFound();

        product.NameEn = dto.NameEn.Trim();
        product.NameSi = dto.NameSi.Trim();
        product.Description = dto.Description;
        product.CategoryId = dto.CategoryId;
        product.UnitId = dto.UnitId;
        product.IsWeightBased = dto.IsWeightBased;
        product.ScaleItemCode = dto.ScaleItemCode?.Trim();
        product.CostPrice = dto.CostPrice;
        product.SellingPrice = dto.SellingPrice;
        product.ReorderLevel = dto.ReorderLevel;
        product.Status = dto.Status;
        product.AllowNegativeStock = dto.AllowNegativeStock;
        product.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(product);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null || product.IsDeleted) return NotFound();

        product.IsDeleted = true;
        product.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id}/barcode-label")]
    public async Task<IActionResult> GetBarcodeLabel(Guid id)
    {
        var product = await _context.Products
            .Include(p => p.Barcodes)
            .Include(p => p.Unit)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null) return NotFound();

        var primaryBarcode = product.Barcodes.FirstOrDefault(b => b.IsPrimary)?.Barcode
                          ?? product.Barcodes.FirstOrDefault()?.Barcode
                          ?? product.Sku;

        string svg = _barcodeService.GenerateCode128Svg(primaryBarcode, height: 45, width: 2);

        return Ok(new
        {
            product.Sku,
            product.NameEn,
            product.NameSi,
            product.SellingPrice,
            UnitCode = product.Unit.Code,
            Barcode = primaryBarcode,
            Svg = svg
        });
    }
}
