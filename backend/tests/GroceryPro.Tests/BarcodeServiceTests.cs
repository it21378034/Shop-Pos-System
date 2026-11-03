using FluentAssertions;
using GroceryPro.Application.Interfaces;
using GroceryPro.Domain.Enums;
using GroceryPro.Infrastructure.Services;
using Xunit;

namespace GroceryPro.Tests;

public class BarcodeServiceTests
{
    private readonly BarcodeService _service = new();

    [Fact]
    public void ParseBarcode_WhenScaleBarcode_ShouldExtractItemCodeAndWeight()
    {
        // Arrange: Prefix 21, Item code 00101 (White Raw Rice), Weight 01250 (1250g = 1.250kg), CheckDigit 5
        string barcode = "2100101012505";
        var config = new ScaleBarcodeConfig { Prefix = "21", ItemCodeLength = 5, FormatType = "WEIGHT" };

        // Act
        var result = _service.ParseBarcode(barcode, config);

        // Assert
        result.Should().NotBeNull();
        result.IsWeighingScaleBarcode.Should().BeTrue();
        result.ItemCode.Should().Be("00101");
        result.WeightInKg.Should().Be(1.250m);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void ParseBarcode_WhenStandardEan13_ShouldIdentifyAsEan13()
    {
        // Arrange
        string barcode = "4791001001015";

        // Act
        var result = _service.ParseBarcode(barcode);

        // Assert
        result.IsWeighingScaleBarcode.Should().BeFalse();
        result.RawBarcode.Should().Be("4791001001015");
        result.BarcodeType.Should().Be(BarcodeType.EAN13);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void ValidateEan13CheckDigit_WithValidBarcode_ShouldReturnTrue()
    {
        // 479100100101 + check digit 6 = 4791001001016
        bool isValid = _service.ValidateEan13CheckDigit("4791001001016");
        isValid.Should().BeTrue();
    }

    [Fact]
    public void GenerateCode128Svg_ShouldProduceValidSvgElement()
    {
        string svg = _service.GenerateCode128Svg("INV-20261101-0001");
        svg.Should().StartWith("<svg");
        svg.Should().EndWith("</svg>\r\n");
        svg.Should().Contain("INV-20261101-0001");
    }
}
