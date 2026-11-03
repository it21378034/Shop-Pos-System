using GroceryPro.Application.Interfaces;
using GroceryPro.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace GroceryPro.Infrastructure.Services;

public class BarcodeService : IBarcodeService
{
    public ParsedBarcodeResult ParseBarcode(string barcode, ScaleBarcodeConfig? config = null)
    {
        if (string.IsNullOrWhiteSpace(barcode))
        {
            return new ParsedBarcodeResult { IsValid = false, ErrorMessage = "Empty barcode" };
        }

        barcode = barcode.Trim();
        config ??= new ScaleBarcodeConfig();

        // Check if barcode matches scale format (starts with prefix and length == 13)
        if (barcode.Length == 13 && barcode.StartsWith(config.Prefix))
        {
            try
            {
                int prefixLen = config.Prefix.Length;
                int itemCodeLen = config.ItemCodeLength;

                if (barcode.Length >= prefixLen + itemCodeLen + 5)
                {
                    string itemCode = barcode.Substring(prefixLen, itemCodeLen);
                    string payloadStr = barcode.Substring(prefixLen + itemCodeLen, 5);

                    if (decimal.TryParse(payloadStr, out decimal payloadVal))
                    {
                        var result = new ParsedBarcodeResult
                        {
                            IsWeighingScaleBarcode = true,
                            RawBarcode = barcode,
                            ItemCode = itemCode,
                            BarcodeType = BarcodeType.WeighingScale,
                            IsValid = true
                        };

                        if (config.FormatType.Equals("PRICE", StringComparison.OrdinalIgnoreCase))
                        {
                            result.EmbeddedPrice = payloadVal / 100m; // cents to price
                        }
                        else
                        {
                            // Weight in grams converted to kg
                            result.WeightInKg = payloadVal / 1000m;
                        }

                        return result;
                    }
                }
            }
            catch (Exception ex)
            {
                return new ParsedBarcodeResult
                {
                    RawBarcode = barcode,
                    IsValid = false,
                    ErrorMessage = $"Scale parsing error: {ex.Message}"
                };
            }
        }

        // Standard barcode (EAN-13, UPC-A, Code 128)
        BarcodeType detectedType = BarcodeType.Code128;
        if (barcode.Length == 13 && long.TryParse(barcode, out _))
        {
            detectedType = BarcodeType.EAN13;
        }
        else if (barcode.Length == 12 && long.TryParse(barcode, out _))
        {
            detectedType = BarcodeType.UPC_A;
        }

        return new ParsedBarcodeResult
        {
            IsWeighingScaleBarcode = false,
            RawBarcode = barcode,
            ItemCode = barcode,
            BarcodeType = detectedType,
            IsValid = true
        };
    }

    public bool ValidateEan13CheckDigit(string ean13)
    {
        if (string.IsNullOrWhiteSpace(ean13) || ean13.Length != 13 || !long.TryParse(ean13, out _))
            return false;

        string calculated = CalculateEan13CheckDigit(ean13.Substring(0, 12));
        return calculated == ean13.Substring(12, 1);
    }

    public string CalculateEan13CheckDigit(string first12Digits)
    {
        if (first12Digits.Length != 12)
            throw new ArgumentException("Requires exactly 12 digits", nameof(first12Digits));

        int sum = 0;
        for (int i = 0; i < 12; i++)
        {
            int digit = first12Digits[i] - '0';
            sum += (i % 2 == 0) ? digit : digit * 3;
        }

        int remainder = sum % 10;
        int checkDigit = (remainder == 0) ? 0 : 10 - remainder;
        return checkDigit.ToString();
    }

    public string GenerateCode128Svg(string content, int height = 50, int width = 2)
    {
        if (string.IsNullOrEmpty(content))
            content = "GROCERYPRO";

        // Generate Code 128 (Subset B) pattern
        var patterns = GetCode128Patterns();
        int checkSum = 104; // Start code B value
        var symbols = new List<int> { 104 };

        for (int i = 0; i < content.Length; i++)
        {
            int ascii = content[i];
            int val = ascii - 32;
            symbols.Add(val);
            checkSum += val * (i + 1);
        }

        int checkDigitValue = checkSum % 103;
        symbols.Add(checkDigitValue);
        symbols.Add(106); // Stop code

        var bars = new StringBuilder();
        foreach (int sym in symbols)
        {
            if (patterns.TryGetValue(sym, out string? pat))
            {
                bars.Append(pat);
            }
        }
        // Stop code extra 2 bar
        bars.Append("11");

        int totalWidth = bars.Length * width + 20; // 10px quiet zone each side
        var svg = new StringBuilder();
        svg.AppendLine($"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {totalWidth} {height + 25}\" width=\"100%\" height=\"auto\" style=\"max-width: 100%; height: auto; display: block; margin: 0 auto;\">");
        svg.AppendLine($"  <rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>");

        int currentX = 10;
        for (int i = 0; i < bars.Length; i++)
        {
            if (bars[i] == '1')
            {
                svg.AppendLine($"  <rect x=\"{currentX}\" y=\"5\" width=\"{width}\" height=\"{height}\" fill=\"#000000\"/>");
            }
            currentX += width;
        }

        svg.AppendLine($"  <text x=\"{totalWidth / 2}\" y=\"{height + 20}\" font-family=\"Courier, monospace\" font-size=\"13\" font-weight=\"bold\" text-anchor=\"middle\" fill=\"#222222\">{content}</text>");
        svg.AppendLine("</svg>");

        return svg.ToString();
    }

    public string GenerateEan13Svg(string ean13Code)
    {
        if (ean13Code.Length == 12)
        {
            ean13Code += CalculateEan13CheckDigit(ean13Code);
        }
        // Fallback or render with code 128 wrapper for SVG clarity
        return GenerateCode128Svg(ean13Code);
    }

    private static Dictionary<int, string> GetCode128Patterns()
    {
        // Code 128 subset B standard bar-space patterns (11 modules each)
        return new Dictionary<int, string>
        {
            { 0, "11011001100" }, { 1, "11001101100" }, { 2, "11001100110" }, { 3, "10010011000" },
            { 4, "10010001100" }, { 5, "10001001100" }, { 6, "10011001000" }, { 7, "10011000100" },
            { 8, "10001100100" }, { 9, "11001001000" }, { 10, "11001000100" }, { 11, "11000100100" },
            { 12, "10110011100" }, { 13, "10011011100" }, { 14, "10011001110" }, { 15, "10111001100" },
            { 16, "10011101100" }, { 17, "10011100110" }, { 18, "11001110010" }, { 19, "11001011100" },
            { 20, "11001001110" }, { 21, "11011100100" }, { 22, "11001110100" }, { 23, "11101101110" },
            { 24, "11101001100" }, { 25, "11100101100" }, { 26, "11100100110" }, { 27, "11101100100" },
            { 28, "11100110100" }, { 29, "11100110010" }, { 30, "11011011000" }, { 31, "11011000110" },
            { 32, "11000110110" }, { 33, "10100011000" }, { 34, "10001011000" }, { 35, "10001000110" },
            { 36, "10110001000" }, { 37, "10001101000" }, { 38, "10001100010" }, { 39, "11010001000" },
            { 40, "11000101000" }, { 41, "11000100010" }, { 42, "10110111000" }, { 43, "10110001110" },
            { 44, "10001101110" }, { 45, "10111011000" }, { 46, "10111000110" }, { 47, "10001110110" },
            { 48, "11101110110" }, { 49, "11010001110" }, { 50, "11000101110" }, { 51, "11011101000" },
            { 52, "11011100010" }, { 53, "11011101110" }, { 54, "11101011000" }, { 55, "11101000110" },
            { 56, "11100010110" }, { 57, "11101101000" }, { 58, "11101100010" }, { 59, "11100011010" },
            { 60, "11101111010" }, { 61, "11001000010" }, { 62, "11110001010" }, { 63, "10100110000" },
            { 64, "10100001100" }, { 65, "10010110000" }, { 66, "10010000110" }, { 67, "10000101100" },
            { 68, "10000100110" }, { 69, "10110010000" }, { 70, "10110000100" }, { 71, "10011010000" },
            { 72, "10011000010" }, { 73, "10000110100" }, { 74, "10000110010" }, { 75, "11000010010" },
            { 76, "11001010000" }, { 77, "11110111010" }, { 78, "11000010100" }, { 79, "10001111010" },
            { 80, "10100111100" }, { 81, "10010111100" }, { 82, "10010011110" }, { 83, "10111100100" },
            { 84, "10011110100" }, { 85, "10011110010" }, { 86, "11110100100" }, { 87, "11110010100" },
            { 88, "11110010010" }, { 89, "11011011110" }, { 90, "11011110110" }, { 91, "11110110110" },
            { 92, "10101111000" }, { 93, "10100011110" }, { 94, "10001011110" }, { 95, "10111101000" },
            { 96, "10111100010" }, { 97, "11110101000" }, { 98, "11110100010" }, { 99, "10111011110" },
            { 100, "10111101110" }, { 101, "11101011110" }, { 102, "11110101110" }, { 103, "11010000100" },
            { 104, "11010010000" }, { 105, "11010011100" }, { 106, "11000111010" }
        };
    }
}
