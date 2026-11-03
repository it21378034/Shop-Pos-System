using GroceryPro.Domain.Enums;
using System;

namespace GroceryPro.Application.Interfaces;

public class ParsedBarcodeResult
{
    public bool IsWeighingScaleBarcode { get; set; }
    public string RawBarcode { get; set; } = string.Empty;
    public string ItemCode { get; set; } = string.Empty;
    public decimal? WeightInKg { get; set; }
    public decimal? EmbeddedPrice { get; set; }
    public BarcodeType BarcodeType { get; set; }
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
}

public class ScaleBarcodeConfig
{
    public string Prefix { get; set; } = "21"; // e.g., "21" or "20"
    public int ItemCodeLength { get; set; } = 5; // e.g., 5 digits
    public string FormatType { get; set; } = "WEIGHT"; // "WEIGHT" (in grams) or "PRICE" (in currency units/cents)
    public int WeightDecimals { get; set; } = 3; // e.g. 1250g -> 1.250kg
}

public interface IBarcodeService
{
    ParsedBarcodeResult ParseBarcode(string barcode, ScaleBarcodeConfig? config = null);
    string GenerateCode128Svg(string content, int height = 50, int width = 2);
    string GenerateEan13Svg(string ean13Code);
    bool ValidateEan13CheckDigit(string ean13);
    string CalculateEan13CheckDigit(string first12Digits);
}
