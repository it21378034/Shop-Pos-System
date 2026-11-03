import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import type { StockBalance, StockTransaction, Product } from '../../types';

export const InventoryPage: React.FC = () => {
  const { t } = useTranslation();
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'balances' | 'ledger'>('balances');
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [ledger, setLedger] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Quick Barcode Stock Intake Modal
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanBarcodeInput, setScanBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [receiveQuantity, setReceiveQuantity] = useState<number>(300);
  const [receiveBatchNumber, setReceiveBatchNumber] = useState<string>('');
  const [receiveExpiryDate, setReceiveExpiryDate] = useState<string>('');
  const [receiveUnitCost, setReceiveUnitCost] = useState<number>(0);
  const [receiveNotes, setReceiveNotes] = useState<string>('');
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [barcodeSearchError, setBarcodeSearchError] = useState<string | null>(null);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [physicalQty, setPhysicalQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<number>(5); // 5 = CountCorrection, 1 = Damage, 2 = Expiry
  const [adjustNotes, setAdjustNotes] = useState('');

  useEffect(() => {
    if (activeTab === 'balances') {
      fetchBalances();
    } else {
      fetchLedger();
    }
  }, [activeTab, lowStockOnly]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await api.get<StockBalance[]>('/inventory/balances', {
        params: { search, lowStockOnly },
      });
      setBalances(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get<StockTransaction[]>('/inventory/ledger');
      setLedger(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjustModal = async (balance?: StockBalance) => {
    try {
      const res = await api.get('/products', { params: { pageSize: 100 } });
      setProducts(res.data.items);
      if (balance) {
        setAdjustProductId(balance.productId);
        setPhysicalQty(balance.quantityOnHand);
      } else if (res.data.items.length > 0) {
        setAdjustProductId(res.data.items[0].id);
        setPhysicalQty(0);
      }
      setShowAdjustModal(true);
    } catch (err) {
      alert('Failed to load products.');
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory/adjustments', {
        reason: adjustReason,
        notes: adjustNotes,
        items: [
          {
            productId: adjustProductId,
            physicalQuantity: physicalQty,
            reasonDetails: adjustNotes,
          },
        ],
      });
      setShowAdjustModal(false);
      fetchBalances();
      alert('Stock adjustment posted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to adjust stock.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/reports/export/inventory-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download CSV export.');
    }
  };

  const handleOpenScanReceiveModal = () => {
    setScanBarcodeInput('');
    setScannedProduct(null);
    setReceiveQuantity(300);
    setReceiveBatchNumber(`BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
    setReceiveExpiryDate('');
    setReceiveUnitCost(0);
    setReceiveNotes('');
    setBarcodeSearchError(null);
    setShowScanModal(true);
    setTimeout(() => scanInputRef.current?.focus(), 150);
  };

  const handleBarcodeLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const bc = scanBarcodeInput.trim();
    if (!bc) return;

    setIsSearchingBarcode(true);
    setBarcodeSearchError(null);
    try {
      const res = await api.get(`/barcode/lookup/${encodeURIComponent(bc)}`);
      const prod = res.data.product as Product;
      setScannedProduct(prod);
      setReceiveUnitCost(prod.costPrice);
    } catch (err: any) {
      setBarcodeSearchError(err.response?.data?.message || `Barcode '${bc}' not found. Please check or register product.`);
      setScannedProduct(null);
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  const handleConfirmStockIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProduct) return;
    if (receiveQuantity <= 0) {
      alert('Please enter a valid received quantity greater than 0.');
      return;
    }

    setIsSubmittingIntake(true);
    try {
      await api.post('/inventory/intake', {
        productId: scannedProduct.id,
        quantityReceived: receiveQuantity,
        unitCost: receiveUnitCost > 0 ? receiveUnitCost : scannedProduct.costPrice,
        batchNumber: receiveBatchNumber || undefined,
        expiryDate: receiveExpiryDate ? new Date(receiveExpiryDate).toISOString() : undefined,
        notes: receiveNotes || `Scanned receiving of ${receiveQuantity} ${scannedProduct.unitCode}`
      });

      alert(`Successfully added +${receiveQuantity} ${scannedProduct.unitCode} to ${scannedProduct.nameEn}!`);
      setShowScanModal(false);
      fetchBalances();
      if (activeTab === 'ledger') fetchLedger();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record stock intake.');
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">{t('inventory.title')}</h3>
          <p className="text-muted small mb-0">Track real-time stock balances, batch expiry dates, and audit ledger transactions.</p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary fw-bold d-flex align-items-center gap-2 shadow-sm"
            onClick={handleOpenScanReceiveModal}
            style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}
          >
            <i className="bi bi-upc-scan fs-5"></i>
            <span>Scan & Receive Stock</span>
          </button>
          <button type="button" className="btn btn-outline-dark d-flex align-items-center gap-2" onClick={handleExportCsv}>
            <i className="bi bi-file-earmark-spreadsheet"></i>
            <span>{t('reports.exportCsv')}</span>
          </button>
          <button
            type="button"
            className="btn btn-success fw-bold d-flex align-items-center gap-2 shadow-sm"
            onClick={() => handleOpenAdjustModal()}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            <i className="bi bi-sliders"></i>
            <span>{t('inventory.adjustStock')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 bg-white p-2 rounded-3 shadow-sm border">
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${activeTab === 'balances' ? 'active bg-success' : 'text-dark'}`}
            onClick={() => setActiveTab('balances')}
          >
            <i className="bi bi-boxes me-2"></i>
            {t('inventory.stockBalances')}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${activeTab === 'ledger' ? 'active bg-success' : 'text-dark'}`}
            onClick={() => setActiveTab('ledger')}
          >
            <i className="bi bi-journal-text me-2"></i>
            {t('inventory.ledger')}
          </button>
        </li>
      </ul>

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <>
          <div className="card border-0 shadow-sm rounded-3 p-3 mb-4 bg-white">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-6">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Filter by SKU, name or barcode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchBalances()}
                  />
                  <button type="button" className="btn btn-outline-secondary" onClick={fetchBalances}>
                    Filter
                  </button>
                </div>
              </div>
              <div className="col-12 col-md-6 text-md-end">
                <div className="form-check form-switch d-inline-block">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="lowStockCheck"
                    checked={lowStockOnly}
                    onChange={(e) => setLowStockOnly(e.target.checked)}
                  />
                  <label className="form-check-label fw-bold text-danger" htmlFor="lowStockCheck">
                    {t('inventory.lowStockOnly')}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-3 bg-white overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Product SKU</th>
                    <th>Product Name (EN / SI)</th>
                    <th>Category</th>
                    <th className="text-center">On Hand</th>
                    <th className="text-center">Reorder Level</th>
                    <th className="text-end">Avg Cost</th>
                    <th className="text-end">Total Valuation</th>
                    <th>Batch / Expiry</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-4 text-muted">
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : balances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-4 text-muted">
                        No stock records found.
                      </td>
                    </tr>
                  ) : (
                    balances.map((b) => (
                      <tr key={b.id} className={b.isLowStock ? 'table-danger bg-opacity-25' : ''}>
                        <td className="fw-bold">{b.sku}</td>
                        <td>
                          <div className="fw-bold text-dark">{b.nameEn}</div>
                          <div className="text-muted small">{b.nameSi}</div>
                        </td>
                        <td>
                          <span className="badge bg-light text-muted border">{b.categoryName}</span>
                        </td>
                        <td className="text-center">
                          <span className={`fw-bold fs-6 ${b.isLowStock ? 'text-danger' : 'text-dark'}`}>
                            {b.quantityOnHand} {b.unitCode}
                          </span>
                        </td>
                        <td className="text-center text-muted">{b.reorderLevel}</td>
                        <td className="text-end text-muted">Rs. {b.averageCostPrice.toFixed(2)}</td>
                        <td className="text-end fw-bold text-success">
                          Rs. {b.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <div className="small fw-semibold">{b.batchNumber}</div>
                          <div className="small text-muted">
                            {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleOpenAdjustModal(b)}
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="card border-0 shadow-sm rounded-3 bg-white overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>Movement Type</th>
                  <th className="text-center">Change</th>
                  <th className="text-center">Resulting Balance</th>
                  <th>Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  ledger.map((tx) => (
                    <tr key={tx.id}>
                      <td className="small text-muted">{new Date(tx.createdAtUtc).toLocaleString()}</td>
                      <td>
                        <div className="fw-bold">{tx.productNameEn}</div>
                        <div className="small text-muted">{tx.sku}</div>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{tx.transactionType}</span>
                      </td>
                      <td className="text-center">
                        <span className={`fw-bold ${tx.quantityChange >= 0 ? 'text-success' : 'text-danger'}`}>
                          {tx.quantityChange >= 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                        </span>
                      </td>
                      <td className="text-center fw-bold">{tx.resultingBalance}</td>
                      <td>
                        <span className="small text-muted">{tx.referenceType}: </span>
                        <span className="fw-semibold small">{tx.referenceNumber}</span>
                      </td>
                      <td className="small text-muted">{tx.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">Stock Adjustment</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAdjustModal(false)}></button>
              </div>

              <form onSubmit={handleSaveAdjustment}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Select Product</label>
                    <select
                      className="form-select"
                      value={adjustProductId}
                      onChange={(e) => setAdjustProductId(e.target.value)}
                      required
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nameEn} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Actual Physical Counted Quantity</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control form-control-lg fw-bold"
                      value={physicalQty}
                      onChange={(e) => setPhysicalQty(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Adjustment Reason</label>
                    <select
                      className="form-select"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(parseInt(e.target.value))}
                    >
                      <option value={5}>Stock Count Correction</option>
                      <option value={1}>Damaged Goods</option>
                      <option value={2}>Expired Product Discard</option>
                      <option value={3}>Theft / Loss</option>
                      <option value={4}>Found Inventory</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Audit Notes / Justification</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="e.g. Physical inventory count verified by store manager"
                      value={adjustNotes}
                      onChange={(e) => setAdjustNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAdjustModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success fw-bold px-4" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                    Post Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Scan & Receive Stock Modal */}
      {showScanModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-upc-scan text-primary fs-4"></i>
                  <span>Scan Barcode & Receive Stock</span>
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowScanModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                {/* Barcode Scan Input */}
                <form onSubmit={handleBarcodeLookup} className="mb-4">
                  <label className="form-label fw-bold text-dark d-flex align-items-center gap-2">
                    <i className="bi bi-qr-code-scan text-primary"></i>
                    <span>Scan Product Barcode:</span>
                  </label>
                  <div className="input-group input-group-lg shadow-sm">
                    <span className="input-group-text bg-white border-primary text-primary">
                      <i className="bi bi-upc"></i>
                    </span>
                    <input
                      ref={scanInputRef}
                      type="text"
                      className="form-control border-primary"
                      placeholder="Scan milk packet or type barcode (e.g. 4791001001015) & hit Enter..."
                      value={scanBarcodeInput}
                      onChange={(e) => setScanBarcodeInput(e.target.value)}
                      disabled={isSearchingBarcode}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary fw-bold px-4"
                      disabled={isSearchingBarcode || !scanBarcodeInput.trim()}
                    >
                      {isSearchingBarcode ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : (
                        <>
                          <i className="bi bi-search me-1"></i>
                          <span>Lookup</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="form-text text-muted small mt-1">
                    Point your barcode scanner at any item (or type barcode) to identify the product immediately.
                  </div>
                </form>

                {barcodeSearchError && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <div>{barcodeSearchError}</div>
                  </div>
                )}

                {/* Detected Product Card & Quantity Entry Form */}
                {scannedProduct ? (
                  <form onSubmit={handleConfirmStockIntake}>
                    <div className="card border-0 bg-success bg-opacity-10 rounded-3 p-3 mb-4">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <span className="badge bg-success mb-1">Product Identified</span>
                          <h5 className="fw-bold text-dark mb-0">{scannedProduct.nameEn}</h5>
                          <div className="text-secondary small fw-semibold">{scannedProduct.nameSi}</div>
                          <div className="text-muted small mt-1">
                            SKU: <strong>{scannedProduct.sku}</strong> | Unit: <strong>{scannedProduct.unitCode}</strong> | Selling Price: <strong>Rs. {scannedProduct.sellingPrice.toFixed(2)}</strong>
                          </div>
                        </div>
                        <div className="text-end">
                          <span className="text-muted small d-block">Current Live Stock:</span>
                          <span className="fs-5 fw-bold text-dark">
                            {balances.find((b) => b.productId === scannedProduct.id)?.quantityOnHand ?? 0} {scannedProduct.unitCode}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="row g-3">
                      {/* Received Quantity Input */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold text-dark">
                          Quantity Received from Supplier <span className="text-danger">*</span>
                        </label>
                        <div className="input-group input-group-lg shadow-sm">
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            className="form-control form-control-lg fw-bold text-success border-success"
                            value={receiveQuantity}
                            onChange={(e) => setReceiveQuantity(parseFloat(e.target.value) || 0)}
                            required
                            autoFocus
                          />
                          <span className="input-group-text bg-success bg-opacity-10 text-success fw-bold">
                            {scannedProduct.unitCode}
                          </span>
                        </div>
                        <div className="small text-muted mt-1">
                          Type manual intake count (e.g. <strong>300</strong> packets).
                        </div>
                      </div>

                      {/* Unit Cost */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-semibold text-muted">
                          Purchase / Unit Cost (Rs.)
                        </label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text">Rs.</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control"
                            value={receiveUnitCost}
                            onChange={(e) => setReceiveUnitCost(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="small text-muted mt-1">
                          Default supplier cost price per unit.
                        </div>
                      </div>

                      {/* Batch & Expiry */}
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-muted">Batch / Lot Number</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. BATCH-2026-001"
                          value={receiveBatchNumber}
                          onChange={(e) => setReceiveBatchNumber(e.target.value)}
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold text-muted">Expiry Date (FEFO Tracking)</label>
                        <input
                          type="date"
                          className="form-control"
                          value={receiveExpiryDate}
                          onChange={(e) => setReceiveExpiryDate(e.target.value)}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label small fw-semibold text-muted">Delivery Notes / Supplier Invoice No.</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Supplier GRN from Ceylon Agro Distributors / Invoice #98231"
                          value={receiveNotes}
                          onChange={(e) => setReceiveNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="alert alert-info d-flex justify-content-between align-items-center mt-3 py-2 mb-0">
                      <div>
                        <i className="bi bi-info-circle me-1"></i>
                        <span>New resulting stock will be:</span>
                      </div>
                      <strong className="fs-6">
                        {((balances.find((b) => b.productId === scannedProduct.id)?.quantityOnHand ?? 0) + (receiveQuantity || 0))} {scannedProduct.unitCode}
                      </strong>
                    </div>

                    <div className="modal-footer px-0 pb-0 mt-4 border-top pt-3">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowScanModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success fw-bold px-4 d-flex align-items-center gap-2 shadow-sm"
                        disabled={isSubmittingIntake || receiveQuantity <= 0}
                        style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                      >
                        {isSubmittingIntake ? (
                          <span className="spinner-border spinner-border-sm"></span>
                        ) : (
                          <>
                            <i className="bi bi-check-circle-fill"></i>
                            <span>Confirm & Add +{receiveQuantity} {scannedProduct.unitCode} to Stock</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4 border rounded-3 bg-light">
                    <i className="bi bi-upc-scan display-4 text-muted d-block mb-2"></i>
                    <p className="text-muted fw-semibold mb-0">
                      Scan product barcode above to populate product details and enter incoming quantities.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
