using GroceryPro.Application.Interfaces;
using GroceryPro.Domain.Entities;
using GroceryPro.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace GroceryPro.API.Controllers;

[Authorize]
public class BarcodeController : BaseApiController
{
    private readonly GroceryProDbContext _context;
    private readonly IBarcodeService _barcodeService;

    public BarcodeController(GroceryProDbContext context, IBarcodeService barcodeService)
    {
        _context = context;
        _barcodeService = barcodeService;
    }

    [HttpGet("lookup/{barcode}")]
    public async Task<IActionResult> LookupBarcode(string barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode))
        {
            return BadRequest(new { message = "Barcode cannot be empty" });
        }

        barcode = barcode.Trim();

        // 1. Fetch Scale Barcode configurations
        var settings = await _context.ShopSettings
            .Where(s => s.Group == "ScaleBarcode")
            .ToDictionaryAsync(s => s.Key, s => s.Value);

        var config = new ScaleBarcodeConfig
        {
            Prefix = settings.GetValueOrDefault("ScaleBarcodePrefix", "21"),
            ItemCodeLength = int.TryParse(settings.GetValueOrDefault("ScaleItemCodeLength", "5"), out int len) ? len : 5,
            FormatType = settings.GetValueOrDefault("ScaleWeightFormat", "WEIGHT")
        };

        // 2. Parse barcode
        var parseResult = _barcodeService.ParseBarcode(barcode, config);

        Product? product = null;

        if (parseResult.IsWeighingScaleBarcode && !string.IsNullOrEmpty(parseResult.ItemCode))
        {
            // Match by ScaleItemCode or primary scale barcode prefix
            product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Unit)
                .Include(p => p.Barcodes)
                .FirstOrDefaultAsync(p => !p.IsDeleted && (p.ScaleItemCode == parseResult.ItemCode
                                       || p.Barcodes.Any(b => b.Barcode.StartsWith(config.Prefix + parseResult.ItemCode))));
        }

        // Fallback: match by direct barcode or SKU
        if (product == null)
        {
            product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Unit)
                .Include(p => p.Barcodes)
                .FirstOrDefaultAsync(p => !p.IsDeleted && (p.Barcodes.Any(b => b.Barcode == barcode) || p.Sku == barcode));
        }

        if (product == null)
        {
            return NotFound(new
            {
                message = $"No product found for barcode '{barcode}'",
                barcode,
                isScaleBarcode = parseResult.IsWeighingScaleBarcode,
                itemCode = parseResult.ItemCode
            });
        }

        decimal defaultQuantity = 1.0m;
        if (parseResult.IsWeighingScaleBarcode && parseResult.WeightInKg.HasValue)
        {
            defaultQuantity = parseResult.WeightInKg.Value;
        }

        // Fetch current stock at current location
        decimal stockOnHand = 0m;
        if (CurrentLocationId != System.Guid.Empty)
        {
            stockOnHand = await _context.StockBalances
                .Where(sb => sb.LocationId == CurrentLocationId && sb.ProductId == product.Id)
                .SumAsync(sb => sb.QuantityOnHand);
        }

        return Ok(new
        {
            Product = new
            {
                product.Id,
                product.Sku,
                product.NameEn,
                product.NameSi,
                CategoryName = product.Category?.NameEn,
                product.UnitId,
                UnitCode = product.Unit.Code,
                UnitNameEn = product.Unit.NameEn,
                product.SellingPrice,
                product.CostPrice,
                product.IsWeightBased,
                StockOnHand = stockOnHand
            },
            ScannedBarcode = barcode,
            IsScaleBarcode = parseResult.IsWeighingScaleBarcode,
            DetectedWeightInKg = parseResult.WeightInKg,
            DetectedPrice = parseResult.EmbeddedPrice,
            DefaultQuantity = defaultQuantity,
            CalculatedLineTotal = Math.Round(defaultQuantity * product.SellingPrice, 2)
        });
    }

    [HttpGet("generate/{content}")]
    [AllowAnonymous]
    public IActionResult GenerateBarcodeSvg(string content, [FromQuery] int height = 50, [FromQuery] int width = 2)
    {
        string svg = _barcodeService.GenerateCode128Svg(content, height, width);
        return Content(svg, "image/svg+xml");
    }

    [HttpPost("parse-test")]
    public IActionResult ParseTest([FromBody] ScaleBarcodeTestRequestDto request)
    {
        var config = new ScaleBarcodeConfig
        {
            Prefix = request.Prefix ?? "21",
            ItemCodeLength = request.ItemCodeLength > 0 ? request.ItemCodeLength : 5,
            FormatType = request.FormatType ?? "WEIGHT"
        };

        var result = _barcodeService.ParseBarcode(request.Barcode, config);
        return Ok(result);
    }
}

public class ScaleBarcodeTestRequestDto
{
    public string Barcode { get; set; } = string.Empty;
    public string? Prefix { get; set; }
    public int ItemCodeLength { get; set; }
    public string? FormatType { get; set; }
}
