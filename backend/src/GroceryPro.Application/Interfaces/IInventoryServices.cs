using GroceryPro.Application.DTOs;
using GroceryPro.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GroceryPro.Application.Interfaces;

public interface IInventoryService
{
    Task<List<StockBalanceDto>> GetStockBalancesAsync(Guid locationId, string? search = null, bool lowStockOnly = false);
    Task<List<StockTransactionDto>> GetStockLedgerAsync(Guid locationId, Guid? productId = null, DateTime? fromDate = null, DateTime? toDate = null);
    Task<StockAdjustment> ProcessStockAdjustmentAsync(StockAdjustmentRequestDto request, Guid userId, Guid locationId);
    Task<StockBalanceDto> RecordStockIntakeAsync(StockIntakeRequestDto request, Guid userId, Guid locationId);
    Task<List<StockBalanceDto>> GetLowStockAlertsAsync(Guid locationId);
}

public interface IPurchasingService
{
    Task<Purchase> CreatePurchaseOrderAsync(PurchaseCreateDto dto, Guid userId, Guid locationId);
    Task<Purchase> ReceiveGoodsAsync(Guid purchaseId, GoodsReceivedDto dto, Guid userId, Guid locationId);
    Task<SupplierPayment> RecordSupplierPaymentAsync(SupplierPaymentCreateDto dto, Guid userId);
    Task<List<Purchase>> GetPurchasesAsync(Guid locationId, Guid? supplierId = null);
    Task<Purchase?> GetPurchaseByIdAsync(Guid purchaseId);
}
