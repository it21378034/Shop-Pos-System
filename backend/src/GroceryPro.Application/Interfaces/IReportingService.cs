using GroceryPro.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GroceryPro.Application.Interfaces;

public interface IReportingService
{
    Task<DashboardStatsDto> GetDashboardStatsAsync(Guid locationId);
    Task<List<ProductSalesReportDto>> GetProductWiseSalesAsync(Guid locationId, DateTime fromDateUtc, DateTime toDateUtc);
    Task<List<CashierPerformanceDto>> GetCashierPerformanceAsync(Guid locationId, DateTime fromDateUtc, DateTime toDateUtc);
    Task<byte[]> ExportProductSalesCsvAsync(Guid locationId, DateTime fromDateUtc, DateTime toDateUtc);
    Task<byte[]> ExportInventoryCsvAsync(Guid locationId);
}
