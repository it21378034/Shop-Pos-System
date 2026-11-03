import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import type { BillsResponse, Receipt } from '../../types';

export const BillsHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [period, setPeriod] = useState<'today' | 'yesterday' | 'month' | 'custom'>('today');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'bills' | 'products' | 'categories'>('bills');

  const [data, setData] = useState<BillsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Initialize dates
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setFromDate(todayStr);
    setToDate(todayStr);
    fetchBills('today', todayStr, todayStr);
  }, []);

  const fetchBills = async (
    filterPeriod: 'today' | 'yesterday' | 'month' | 'custom',
    customFrom?: string,
    customTo?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/pos/bills?period=${filterPeriod}`;
      if (filterPeriod === 'custom' && customFrom && customTo) {
        // Adjust for full day coverage in ISO format
        const start = new Date(`${customFrom}T00:00:00`).toISOString();
        const end = new Date(`${customTo}T23:59:59.999`).toISOString();
        url += `&fromDate=${encodeURIComponent(start)}&toDate=${encodeURIComponent(end)}`;
      }
      const res = await api.get<BillsResponse>(url);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load bills data', err);
      setError(err.response?.data?.message || 'Failed to load bills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: 'today' | 'yesterday' | 'month' | 'custom') => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      fetchBills(newPeriod);
    }
  };

  const handleCustomFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) return;
    fetchBills('custom', fromDate, toDate);
  };

  const handleViewReceipt = async (saleId: string) => {
    setLoadingReceipt(true);
    setShowReceiptModal(true);
    try {
      const res = await api.get<Receipt>(`/pos/receipt/${saleId}`);
      setSelectedReceipt(res.data);
    } catch (err) {
      console.error('Failed to fetch receipt', err);
      alert('Could not load receipt preview.');
      setShowReceiptModal(false);
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Filter bills by search term
  const filteredBills = (data?.bills || []).filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.invoiceNumber.toLowerCase().includes(term) ||
      b.cashierName.toLowerCase().includes(term) ||
      (b.customerName && b.customerName.toLowerCase().includes(term)) ||
      b.items.some(
        (item) =>
          item.nameEn.toLowerCase().includes(term) ||
          item.nameSi.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term)
      )
    );
  });

  // Filter sold products by search term
  const filteredSoldProducts = (data?.soldProducts || []).filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.nameEn.toLowerCase().includes(term) ||
      p.nameSi.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.categoryName.toLowerCase().includes(term)
    );
  });

  // Filter category sales by search term
  const filteredCategorySales = (data?.categorySales || []).filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.categoryName.toLowerCase().includes(term) ||
      c.categoryNameSi.toLowerCase().includes(term) ||
      c.products.some(
        (p) =>
          p.nameEn.toLowerCase().includes(term) ||
          p.nameSi.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term)
      )
    );
  });

  return (
    <div className="container-fluid px-0">
      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <i className="bi bi-receipt-cutoff text-success"></i>
            <span>{t('bills.title')}</span>
          </h3>
          <p className="text-muted small mb-0">{t('bills.subtitle')}</p>
        </div>

        {/* Date Filter Buttons */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="btn-group shadow-sm" role="group">
            <button
              type="button"
              className={`btn btn-sm ${period === 'today' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => handlePeriodChange('today')}
            >
              <i className="bi bi-calendar-event me-1"></i>
              {t('bills.today')}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${period === 'yesterday' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => handlePeriodChange('yesterday')}
            >
              <i className="bi bi-clock-history me-1"></i>
              {t('bills.yesterday')}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${period === 'month' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => handlePeriodChange('month')}
            >
              <i className="bi bi-calendar3 me-1"></i>
              {t('bills.thisMonth')}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${period === 'custom' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => handlePeriodChange('custom')}
            >
              <i className="bi bi-calendar-range me-1"></i>
              {t('bills.customDate')}
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1 shadow-sm"
            onClick={() => fetchBills(period, fromDate, toDate)}
            title="Refresh"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {/* Custom Date Filter Picker (Shown if 'custom' selected) */}
      {period === 'custom' && (
        <div className="card border-0 shadow-sm rounded-3 p-3 mb-4 bg-light">
          <form onSubmit={handleCustomFilterSubmit} className="row g-2 align-items-end">
            <div className="col-sm-5 col-md-4">
              <label className="form-label small fw-semibold text-muted mb-1">{t('bills.fromDate')}</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
            </div>
            <div className="col-sm-5 col-md-4">
              <label className="form-label small fw-semibold text-muted mb-1">{t('bills.toDate')}</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
              />
            </div>
            <div className="col-sm-2 col-md-2">
              <button type="submit" className="btn btn-sm btn-success w-100 fw-bold">
                <i className="bi bi-funnel me-1"></i>
                {t('bills.applyFilter')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="stat-card">
            <span className="text-muted small fw-semibold text-uppercase">{t('bills.totalRevenue')}</span>
            <h3 className="fw-bold text-success mt-1 mb-0">
              Rs. {(data?.summary.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <div className="small text-muted mt-1">
              Cash: Rs. {(data?.summary.cashCollected || 0).toFixed(0)} | Card: Rs. {(data?.summary.cardCollected || 0).toFixed(0)}
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="stat-card">
            <span className="text-muted small fw-semibold text-uppercase">{t('bills.totalBills')}</span>
            <h3 className="fw-bold text-dark mt-1 mb-0">{data?.summary.totalBills || 0}</h3>
            <div className="small text-muted mt-1">
              Discount: Rs. {(data?.summary.totalDiscounts || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="stat-card">
            <span className="text-muted small fw-semibold text-uppercase">{t('bills.itemsSold')}</span>
            <h3 className="fw-bold text-primary mt-1 mb-0">
              {(data?.summary.totalItemsSold || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </h3>
            <div className="small text-muted mt-1">Across all categories</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="stat-card">
            <span className="text-muted small fw-semibold text-uppercase">Categories Active</span>
            <h3 className="fw-bold text-dark mt-1 mb-0">{data?.categorySales.length || 0}</h3>
            <div className="small text-muted mt-1">{data?.soldProducts.length || 0} distinct products</div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Navigation Bar */}
      <div className="card border-0 shadow-sm rounded-3 mb-4 bg-white overflow-hidden">
        <div className="p-3 border-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          {/* Tabs */}
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn-sm d-flex align-items-center gap-2 ${activeTab === 'bills' ? 'active bg-success' : 'text-dark bg-light'}`}
                onClick={() => setActiveTab('bills')}
              >
                <i className="bi bi-receipt"></i>
                <span className="fw-semibold">{t('bills.allBillsTab')}</span>
                <span className="badge bg-white text-dark rounded-pill ms-1">{filteredBills.length}</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn-sm d-flex align-items-center gap-2 ${activeTab === 'products' ? 'active bg-success' : 'text-dark bg-light'}`}
                onClick={() => setActiveTab('products')}
              >
                <i className="bi bi-box-seam"></i>
                <span className="fw-semibold">{t('bills.soldProductsTab')}</span>
                <span className="badge bg-white text-dark rounded-pill ms-1">{filteredSoldProducts.length}</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn-sm d-flex align-items-center gap-2 ${activeTab === 'categories' ? 'active bg-success' : 'text-dark bg-light'}`}
                onClick={() => setActiveTab('categories')}
              >
                <i className="bi bi-diagram-3"></i>
                <span className="fw-semibold">{t('bills.categoryWiseTab')}</span>
                <span className="badge bg-white text-dark rounded-pill ms-1">{filteredCategorySales.length}</span>
              </button>
            </li>
          </ul>

          {/* Search Box */}
          <div className="input-group input-group-sm" style={{ maxWidth: '320px' }}>
            <span className="input-group-text bg-light border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder={t('bills.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchTerm('')}>
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Generated Bills Table */}
        {activeTab === 'bills' && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{t('bills.invoiceNo')}</th>
                  <th>{t('bills.dateTime')}</th>
                  <th>{t('bills.cashier')}</th>
                  <th>{t('bills.customer')}</th>
                  <th className="text-center">{t('bills.items')}</th>
                  <th>{t('bills.payment')}</th>
                  <th className="text-end">{t('bills.grandTotal')}</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">{t('bills.action')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                      {t('bills.noBillsFound')}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id}>
                      <td>
                        <span className="fw-bold font-monospace text-dark">{bill.invoiceNumber}</span>
                        <div className="small text-muted">{bill.terminalId}</div>
                      </td>
                      <td>
                        <div className="small fw-semibold">
                          {new Date(bill.createdAtUtc).toLocaleDateString()}
                        </div>
                        <div className="small text-muted">
                          {new Date(bill.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <span className="small fw-medium">{bill.cashierName}</span>
                      </td>
                      <td>
                        <span className="small text-muted">{bill.customerName || 'Walk-in Customer'}</span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-light text-dark border">{bill.itemCount} items</span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {bill.paymentMethods.map((pm, idx) => (
                            <span key={idx} className="badge bg-secondary bg-opacity-10 text-secondary border small">
                              {pm}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-end">
                        <span className="fw-bold text-success fs-6">
                          Rs. {bill.grandTotal.toFixed(2)}
                        </span>
                        {bill.discountAmount > 0 && (
                          <div className="small text-danger">Disc: -Rs. {bill.discountAmount.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="text-center">
                        <span
                          className={`badge ${
                            bill.status === 'Completed'
                              ? 'bg-success-subtle text-success border border-success-subtle'
                              : 'bg-warning-subtle text-warning border border-warning-subtle'
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1"
                          onClick={() => handleViewReceipt(bill.id)}
                          title="View Bill Details"
                        >
                          <i className="bi bi-eye"></i>
                          <span>{t('bills.viewBill')}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Sold Products Table */}
        {activeTab === 'products' && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Product SKU</th>
                  <th>{t('bills.product')} (EN / SI)</th>
                  <th>{t('bills.category')}</th>
                  <th className="text-center">{t('bills.quantitySold')}</th>
                  <th className="text-center">{t('bills.billCount')}</th>
                  <th className="text-end">{t('bills.revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSoldProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-muted">
                      <i className="bi bi-box-seam fs-2 d-block mb-2 text-secondary"></i>
                      {t('bills.noProductsSold')}
                    </td>
                  </tr>
                ) : (
                  filteredSoldProducts.map((p) => (
                    <tr key={p.productId}>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace">{p.sku}</span>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{p.nameEn}</div>
                        {p.nameSi && <div className="small text-muted">{p.nameSi}</div>}
                      </td>
                      <td>
                        <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">
                          {p.categoryName}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="fw-bold fs-6 text-dark">
                          {p.quantitySold} <span className="small fw-normal text-muted">{p.unitCode}</span>
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-secondary-subtle text-secondary">{p.billsCount} bills</span>
                      </td>
                      <td className="text-end">
                        <span className="fw-bold text-success fs-6">
                          Rs. {p.totalRevenue.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Category-wise Sales Breakdown */}
        {activeTab === 'categories' && (
          <div className="p-3">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : filteredCategorySales.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-tags fs-2 d-block mb-2 text-secondary"></i>
                {t('bills.noProductsSold')}
              </div>
            ) : (
              <div className="row g-4">
                {filteredCategorySales.map((cat, idx) => (
                  <div className="col-12 col-lg-6" key={cat.categoryId || idx}>
                    <div className="card h-100 border shadow-sm rounded-3 overflow-hidden">
                      {/* Category Header */}
                      <div className="card-header bg-light d-flex justify-content-between align-items-center py-2 px-3 border-bottom">
                        <div>
                          <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                            <i className="bi bi-tag-fill text-success"></i>
                            <span>{i18n.language === 'si' && cat.categoryNameSi ? cat.categoryNameSi : cat.categoryName}</span>
                            {cat.categoryNameSi && i18n.language !== 'si' && (
                              <span className="text-muted fw-normal small">({cat.categoryNameSi})</span>
                            )}
                          </h6>
                        </div>
                        <div className="text-end">
                          <span className="badge bg-success fs-6 fw-bold">
                            Rs. {cat.totalRevenue.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Category Metric Badges */}
                      <div className="bg-white px-3 py-2 border-bottom d-flex justify-content-between align-items-center small text-muted">
                        <div>
                          <strong>{t('bills.totalBills')}:</strong> {cat.billsCount}
                        </div>
                        <div>
                          <span className="badge bg-primary-subtle text-primary fw-bold">
                            {cat.totalQuantitySold} total items sold
                          </span>
                        </div>
                      </div>

                      {/* Sold Products inside this Category */}
                      <div className="table-responsive">
                        <table className="table table-sm table-hover align-middle mb-0">
                          <thead className="table-light small">
                            <tr>
                              <th>Product</th>
                              <th className="text-center">Quantity Sold</th>
                              <th className="text-end">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cat.products.map((prod) => (
                              <tr key={prod.productId}>
                                <td>
                                  <div className="fw-semibold text-dark small">{prod.nameEn}</div>
                                  {prod.nameSi && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{prod.nameSi}</div>}
                                </td>
                                <td className="text-center">
                                  <span className="badge bg-light text-dark border fw-bold">
                                    {prod.quantitySold} {prod.unitCode}
                                  </span>
                                </td>
                                <td className="text-end fw-semibold text-success small">
                                  Rs. {prod.totalRevenue.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bill Receipt Preview & Print Modal */}
      {showReceiptModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-receipt text-success"></i>
                  <span>Receipt Details</span>
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowReceiptModal(false)}
                ></button>
              </div>

              <div className="modal-body p-3 text-center">
                {loadingReceipt ? (
                  <div className="py-5">
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Loading receipt...</span>
                    </div>
                  </div>
                ) : selectedReceipt ? (
                  <div id="bill-receipt-printable" className="receipt-view text-start mx-auto p-3 border rounded bg-white">
                    <div className="text-center mb-2">
                      <h5 className="fw-bold mb-0">{selectedReceipt.storeName}</h5>
                      <div className="small fw-semibold">{selectedReceipt.storeNameSi}</div>
                      <div className="small text-muted">{selectedReceipt.storeAddress}</div>
                      <div className="small text-muted">Tel: {selectedReceipt.storePhone}</div>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Inv: <strong>{selectedReceipt.invoiceNumber}</strong></span>
                      <span>{new Date(selectedReceipt.dateUtc).toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between small text-muted mb-2">
                      <span>Cashier: {selectedReceipt.cashierName}</span>
                      <span>Term: {selectedReceipt.terminalId}</span>
                    </div>

                    {selectedReceipt.customerName && (
                      <div className="small text-muted mb-2">
                        Customer: <strong>{selectedReceipt.customerName}</strong>
                      </div>
                    )}

                    <table className="table table-borderless table-sm small mb-2">
                      <thead>
                        <tr className="border-bottom">
                          <th>Item</th>
                          <th className="text-center">Qty</th>
                          <th className="text-end">Price</th>
                          <th className="text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReceipt.items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ maxWidth: '140px' }}>{item.nameEn}</td>
                            <td className="text-center">
                              {item.quantity} {item.unitCode}
                            </td>
                            <td className="text-end">{item.unitPrice.toFixed(2)}</td>
                            <td className="text-end">{item.lineTotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="receipt-divider"></div>

                    <div className="d-flex justify-content-between small">
                      <span>Subtotal</span>
                      <span>Rs. {selectedReceipt.subTotal.toFixed(2)}</span>
                    </div>
                    {selectedReceipt.discountAmount > 0 && (
                      <div className="d-flex justify-content-between small text-danger">
                        <span>Discount</span>
                        <span>-Rs. {selectedReceipt.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between fw-bold fs-6 my-1">
                      <span>TOTAL</span>
                      <span className="text-success">Rs. {selectedReceipt.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>Paid</span>
                      <span>Rs. {selectedReceipt.paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>Change</span>
                      <span>Rs. {selectedReceipt.changeAmount.toFixed(2)}</span>
                    </div>

                    {selectedReceipt.barcodeSvg && (
                      <>
                        <div className="receipt-divider"></div>
                        <div
                          className="receipt-barcode-wrapper text-center my-2 d-flex justify-content-center overflow-hidden"
                          dangerouslySetInnerHTML={{ __html: selectedReceipt.barcodeSvg }}
                        />
                      </>
                    )}

                    <div className="text-center small text-muted mt-2">
                      <div>{selectedReceipt.headerNotes}</div>
                      <div>{selectedReceipt.footerNotes}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-danger py-4">Receipt data unavailable.</div>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowReceiptModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-success d-flex align-items-center gap-2"
                  onClick={() => window.print()}
                >
                  <i className="bi bi-printer"></i>
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
