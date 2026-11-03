import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import type { Product, CartItem, Receipt, Category } from '../../types';
import { Navbar } from '../../components/layout/Navbar';

export const PosPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [billDiscount, setBillDiscount] = useState<number>(0);

  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<number>(1); // 1 = Cash, 2 = Card, 3 = LankaQR, 4 = Credit
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Receipt Modal State
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Held Bills State
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);
  const [heldBills, setHeldBills] = useState<any[]>([]);

  // Returns Modal State
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [returnInvoiceInput, setReturnInvoiceInput] = useState('');
  const [lookupSale, setLookupSale] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<{ [key: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Customer Request');
  const [returnToStock, setReturnToStock] = useState(true);

  // Scanner Input Focus Reference
  const scannerRef = useRef<HTMLInputElement>(null);

  // Initial Data Load
  useEffect(() => {
    fetchCategories();
    fetchCatalogProducts();
    focusScanner();
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        focusScanner();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0) openCheckoutModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  const focusScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.focus();
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get<Category[]>('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchCatalogProducts = async (catId?: string | null) => {
    try {
      const params: any = { pageSize: 24 };
      if (catId) params.categoryId = catId;
      const res = await api.get('/products', { params });
      setCatalogProducts(res.data.items);
    } catch (err) {
      console.error('Failed to load products', err);
    }
  };

  // Barcode Scanning Handler
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    try {
      const res = await api.get(`/barcode/lookup/${encodeURIComponent(barcode)}`);
      const { product, isScaleBarcode, detectedWeightInKg, defaultQuantity } = res.data;

      addProductToCart(product, barcode, defaultQuantity, isScaleBarcode, detectedWeightInKg);
      setBarcodeInput('');
    } catch (err: any) {
      alert(err.response?.data?.message || `Barcode '${barcode}' not found.`);
      setBarcodeInput('');
    }
  };

  const addProductToCart = (
    product: Product,
    scannedBarcode?: string,
    quantity: number = 1,
    isScaleBarcode: boolean = false,
    weightInKg?: number
  ) => {
    setCart((prevCart) => {
      // If non-weighted item already in cart, increment quantity
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === product.id && !product.isWeightBased && !isScaleBarcode
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        const item = updated[existingIndex];
        const newQty = item.quantity + quantity;
        const lineGross = newQty * item.unitPrice;
        const lineTotal = lineGross - item.discountAmount;
        updated[existingIndex] = { ...item, quantity: newQty, lineTotal };
        return updated;
      }

      // Add new cart line
      const qty = weightInKg ? weightInKg : quantity;
      const lineTotal = Math.round(qty * product.sellingPrice * 100) / 100;

      const newItem: CartItem = {
        product,
        scannedBarcode,
        quantity: qty,
        unitPrice: product.sellingPrice,
        discountPercentage: 0,
        discountAmount: 0,
        lineTotal,
        isWeightBased: product.isWeightBased || isScaleBarcode,
      };

      return [newItem, ...prevCart];
    });
  };

  const updateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const lineGross = newQty * item.unitPrice;
      const lineTotal = lineGross - item.discountAmount;
      updated[index] = { ...item, quantity: newQty, lineTotal };
      return updated;
    });
  };

  const _updateItemDiscount = (index: number, discAmount: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const lineGross = item.quantity * item.unitPrice;
      const lineTotal = Math.max(0, lineGross - discAmount);
      updated[index] = { ...item, discountAmount: discAmount, lineTotal };
      return updated;
    });
  };
  void _updateItemDiscount;

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (cart.length > 0 && window.confirm('Clear all items from the current cart?')) {
      setCart([]);
      setBillDiscount(0);
      focusScanner();
    }
  };

  // Calculations
  const subTotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalItemDiscounts = cart.reduce((sum, item) => sum + item.discountAmount, 0);
  const grandTotal = Math.max(0, subTotal - totalItemDiscounts - billDiscount);

  // Open Checkout Modal
  const openCheckoutModal = () => {
    setTenderAmount(grandTotal.toString());
    setPaymentMethod(1);
    setCheckoutError(null);
    setShowCheckout(true);
  };

  const handleCheckoutSubmit = async () => {
    setIsProcessing(true);
    setCheckoutError(null);

    const tenderedNum = parseFloat(tenderAmount) || grandTotal;

    const checkoutPayload = {
      idempotencyKey: `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      terminalId: 'POS-01',
      overallDiscountAmount: billDiscount,
      items: cart.map((item) => ({
        productId: item.product.id,
        scannedBarcode: item.scannedBarcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        isWeightBased: item.isWeightBased,
      })),
      payments: [
        {
          paymentMethod,
          amount: grandTotal,
          tenderAmount: tenderedNum,
        },
      ],
    };

    try {
      const res = await api.post<Receipt>('/pos/checkout', checkoutPayload);
      setReceipt(res.data);
      setShowCheckout(false);
      setCart([]);
      setBillDiscount(0);
      setShowReceiptModal(true);
      fetchCatalogProducts(selectedCategory);
    } catch (err: any) {
      setCheckoutError(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Hold Bill
  const handleHoldBill = async () => {
    if (cart.length === 0) return;
    try {
      await api.post('/pos/suspend', {
        terminalId: 'POS-01',
        items: cart.map((item) => ({
          productId: item.product.id,
          scannedBarcode: item.scannedBarcode,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          isWeightBased: item.isWeightBased,
        })),
      });
      setCart([]);
      setBillDiscount(0);
      alert('Bill held successfully! (F8)');
      focusScanner();
    } catch (err) {
      alert('Failed to hold bill.');
    }
  };

  const fetchHeldBills = async () => {
    try {
      const res = await api.get('/pos/suspended');
      setHeldBills(res.data);
      setShowHeldBillsModal(true);
    } catch (err) {
      alert('Failed to load held bills.');
    }
  };

  const resumeHeldBill = async (bill: any) => {
    // Restore items to cart
    const restoredCart: CartItem[] = bill.items.map((i: any) => ({
      product: {
        id: i.productId,
        sku: i.sku,
        nameEn: i.nameEn,
        nameSi: i.nameSi,
        sellingPrice: i.unitPrice,
        unitCode: 'pcs',
        isWeightBased: i.isWeightBased,
      } as any,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discountPercentage: i.discountPercentage,
      discountAmount: i.discountAmount,
      lineTotal: i.lineTotal,
      isWeightBased: i.isWeightBased,
    }));

    setCart(restoredCart);
    setShowHeldBillsModal(false);

    // Delete suspended bill from backend
    try {
      await api.delete(`/pos/suspended/${bill.id}`);
    } catch (e) {
      console.error(e);
    }
    focusScanner();
  };

  // Returns / Refund Lookup
  const handleLookupReturnInvoice = async () => {
    if (!returnInvoiceInput.trim()) return;
    try {
      const res = await api.get(`/pos/return-lookup/${encodeURIComponent(returnInvoiceInput.trim())}`);
      setLookupSale(res.data);
      setReturnItems({});
    } catch (err: any) {
      alert(err.response?.data?.message || 'Invoice not found.');
    }
  };

  const handleProcessReturn = async () => {
    if (!lookupSale) return;

    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([saleItemId, qty]) => ({
        saleItemId,
        quantityToReturn: qty,
        returnToStock,
      }));

    if (itemsToReturn.length === 0) {
      alert('Please select at least one item and quantity to return.');
      return;
    }

    try {
      const res = await api.post('/pos/return', {
        originalSaleId: lookupSale.id,
        reason: returnReason,
        refundPaymentMethod: 1, // Cash refund
        items: itemsToReturn,
      });

      alert('Return processed successfully!');
      setShowReturnsModal(false);
      setReceipt(res.data);
      setShowReceiptModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process return.');
    }
  };

  const changeDue = Math.max(0, (parseFloat(tenderAmount) || grandTotal) - grandTotal);

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <Navbar />

      <div className="pos-container">
        {/* Left Cart Panel */}
        <div className="pos-cart-panel">
          {/* Top Barcode Scanner & Quick Action Bar */}
          <div className="p-3 bg-white border-bottom shadow-sm">
            <form onSubmit={handleBarcodeSubmit} className="d-flex gap-2">
              <div className="input-group">
                <span className="input-group-text bg-success text-white border-success">
                  <i className="bi bi-upc-scan fs-5"></i>
                </span>
                <input
                  ref={scannerRef}
                  type="text"
                  className="form-control pos-scanner-input"
                  placeholder={t('pos.scanPlaceholder')}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-success px-4 fw-bold">
                Scan
              </button>
            </form>

            {/* Quick Action Buttons */}
            <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top">
              <div className="d-flex gap-2">
                <button
                  type="button"
                  onClick={handleHoldBill}
                  className="btn btn-outline-warning btn-sm fw-semibold d-flex align-items-center gap-1"
                  disabled={cart.length === 0}
                >
                  <i className="bi bi-pause-circle"></i>
                  <span>{t('pos.holdBill')}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchHeldBills}
                  className="btn btn-outline-secondary btn-sm fw-semibold d-flex align-items-center gap-1"
                >
                  <i className="bi bi-collection"></i>
                  <span>{t('pos.retrieveBill')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReturnsModal(true)}
                  className="btn btn-outline-danger btn-sm fw-semibold d-flex align-items-center gap-1"
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                  <span>{t('pos.salesReturn')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/bills')}
                  className="btn btn-outline-primary btn-sm fw-semibold d-flex align-items-center gap-1"
                  title="View Generated Bills and Sales History"
                >
                  <i className="bi bi-receipt-cutoff"></i>
                  <span>{t('nav.bills')}</span>
                </button>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="btn btn-link text-danger text-decoration-none btn-sm p-0 fw-semibold"
                >
                  <i className="bi bi-trash"></i> {t('pos.clearCart')}
                </button>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <div className="pos-cart-table-wrap">
            {cart.length === 0 ? (
              <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted p-5">
                <div className="bg-light rounded-circle p-4 mb-3 border">
                  <i className="bi bi-cart-x fs-1 text-secondary opacity-50"></i>
                </div>
                <h5 className="fw-semibold text-secondary">{t('pos.cartEmpty')}</h5>
                <p className="small text-muted text-center" style={{ maxWidth: '360px' }}>
                  Use any USB HID barcode scanner, enter SKU or scale barcode, or select items from the catalog on the right.
                </p>
              </div>
            ) : (
              <table className="table pos-cart-table">
                <thead>
                  <tr>
                    <th style={{ width: '42%' }}>{t('pos.item')}</th>
                    <th className="text-end" style={{ width: '16%' }}>{t('pos.price')}</th>
                    <th className="text-center" style={{ width: '20%' }}>{t('pos.qty')}</th>
                    <th className="text-end" style={{ width: '16%' }}>{t('pos.total')}</th>
                    <th style={{ width: '6%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={`${item.product.id}-${index}`} className="pos-cart-row">
                      <td>
                        <div className="fw-bold text-dark">
                          {i18n.language === 'si' && item.product.nameSi ? item.product.nameSi : item.product.nameEn}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <span className="badge bg-light text-muted border small">{item.product.sku}</span>
                          {item.isWeightBased && (
                            <span className="badge-weight">
                              <i className="bi bi-speedometer2 me-1"></i>SCALE
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="text-end fw-semibold">
                        Rs. {item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td>
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          {!item.isWeightBased && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary px-2 py-0"
                              onClick={() => updateItemQuantity(index, item.quantity - 1)}
                            >
                              -
                            </button>
                          )}
                          <input
                            type="number"
                            step={item.isWeightBased ? '0.001' : '1'}
                            min="0.001"
                            className="form-control form-control-sm text-center fw-bold px-1"
                            style={{ width: '70px' }}
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 0)}
                          />
                          {!item.isWeightBased && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary px-2 py-0"
                              onClick={() => updateItemQuantity(index, item.quantity + 1)}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="text-end fw-bold text-success fs-6">
                        Rs. {item.lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm text-danger p-0"
                          onClick={() => removeItem(index)}
                          title="Remove item"
                        >
                          <i className="bi bi-x-circle fs-5"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Summary Box & Pay Now */}
          <div className="pos-summary-box">
            <div className="d-flex justify-content-between align-items-end mb-2">
              <div>
                <div className="text-muted small text-uppercase fw-semibold">{t('pos.subtotal')}</div>
                <div className="fs-5 fw-bold text-white">
                  Rs. {subTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {totalItemDiscounts > 0 && (
                <div className="text-end">
                  <div className="text-danger small fw-semibold">Discount</div>
                  <div className="text-danger fw-bold">- Rs. {totalItemDiscounts.toFixed(2)}</div>
                </div>
              )}

              <div className="text-end">
                <div className="text-muted small text-uppercase fw-semibold">{t('pos.grandTotal')}</div>
                <div className="pos-total-display">
                  Rs. {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 mt-3">
              <button
                type="button"
                className="btn btn-success flex-grow-1 py-3 fw-bold fs-5 d-flex align-items-center justify-content-center gap-2 shadow"
                disabled={cart.length === 0}
                onClick={openCheckoutModal}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                <i className="bi bi-credit-card-2-front fs-4"></i>
                <span>{t('pos.payNow')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Catalog & Quick Touch Panel */}
        <div className="pos-catalog-panel">
          {/* Search Catalog */}
          <div className="p-3 bg-white border-bottom">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder={t('pos.searchProduct')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="category-scroll-container px-3 bg-light border-bottom d-flex align-items-center gap-2">
            <button
              type="button"
              className={`btn ${selectedCategory === null ? 'btn-dark' : 'btn-outline-secondary bg-white'} category-pill-btn`}
              onClick={() => {
                setSelectedCategory(null);
                fetchCatalogProducts(null);
              }}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`btn ${selectedCategory === cat.id ? 'btn-dark' : 'btn-outline-secondary bg-white'} category-pill-btn`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  fetchCatalogProducts(cat.id);
                }}
              >
                {i18n.language === 'si' && cat.nameSi ? cat.nameSi : cat.nameEn}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="p-3 flex-grow-1 overflow-auto">
            <div className="row g-2">
              {catalogProducts
                .filter((p) => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    p.nameEn.toLowerCase().includes(q) ||
                    p.nameSi.toLowerCase().includes(q) ||
                    p.sku.toLowerCase().includes(q)
                  );
                })
                .map((product) => (
                  <div key={product.id} className="col-6">
                    <div
                      className="quick-product-card"
                      onClick={() => addProductToCart(product, undefined, 1)}
                    >
                      <div className="fw-semibold text-dark text-truncate" title={product.nameEn}>
                        {i18n.language === 'si' && product.nameSi ? product.nameSi : product.nameEn}
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className={`badge ${product.stockOnHand !== undefined && product.stockOnHand > (product.reorderLevel || 5) ? 'bg-success-subtle text-success' : (product.stockOnHand && product.stockOnHand > 0 ? 'bg-warning-subtle text-warning-emphasis' : 'bg-danger-subtle text-danger')} small border`}>
                          <i className="bi bi-box-seam me-1"></i>
                          {product.stockOnHand !== undefined ? `${product.stockOnHand} ${product.unitCode}` : product.unitCode}
                        </span>
                        <span className="fw-bold text-success fs-6">Rs. {product.sellingPrice}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-wallet2 text-success"></i>
                  <span>Checkout & Settlement</span>
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCheckout(false)}></button>
              </div>

              <div className="modal-body p-4">
                {checkoutError && (
                  <div className="alert alert-danger py-2 small mb-3">{checkoutError}</div>
                )}

                {/* Amount Due Big Display */}
                <div className="bg-light p-3 rounded-3 text-center mb-3 border">
                  <span className="text-muted small text-uppercase fw-semibold">{t('pos.grandTotal')}</span>
                  <div className="display-6 fw-bold text-success">
                    Rs. {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">{t('pos.paymentMethod')}</label>
                  <div className="btn-group w-100" role="group">
                    <button
                      type="button"
                      className={`btn ${paymentMethod === 1 ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => setPaymentMethod(1)}
                    >
                      💵 {t('pos.cash')}
                    </button>
                    <button
                      type="button"
                      className={`btn ${paymentMethod === 2 ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => setPaymentMethod(2)}
                    >
                      💳 {t('pos.card')}
                    </button>
                    <button
                      type="button"
                      className={`btn ${paymentMethod === 3 ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => setPaymentMethod(3)}
                    >
                      📱 {t('pos.qr')}
                    </button>
                    <button
                      type="button"
                      className={`btn ${paymentMethod === 4 ? 'btn-success' : 'btn-outline-secondary'}`}
                      onClick={() => setPaymentMethod(4)}
                    >
                      📋 {t('pos.credit')}
                    </button>
                  </div>
                </div>

                {/* Tender Input (for Cash) */}
                {paymentMethod === 1 && (
                  <>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted">{t('pos.tendered')}</label>
                      <div className="input-group">
                        <span className="input-group-text">Rs.</span>
                        <input
                          type="number"
                          className="form-control form-control-lg fw-bold"
                          value={tenderAmount}
                          onChange={(e) => setTenderAmount(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Quick Tender Buttons */}
                    <div className="mb-3">
                      <div className="d-flex gap-2">
                        {[500, 1000, 2000, 5000].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            className="btn btn-outline-dark btn-sm flex-grow-1 fw-semibold"
                            onClick={() => setTenderAmount(amount.toString())}
                          >
                            + {amount}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Change Display */}
                    <div className="p-3 bg-success bg-opacity-10 border border-success rounded-3 d-flex justify-content-between align-items-center mb-3">
                      <span className="fw-semibold text-success">{t('pos.change')}</span>
                      <span className="fs-4 fw-bold text-success">
                        Rs. {changeDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCheckout(false)}>
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-success fw-bold px-4 d-flex align-items-center gap-2"
                  disabled={isProcessing}
                  onClick={handleCheckoutSubmit}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                >
                  {isProcessing ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-printer"></i>
                      <span>{t('pos.finishCheckout')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal & Printable View */}
      {showReceiptModal && receipt && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Receipt Preview</h5>
                <button type="button" className="btn-close" onClick={() => setShowReceiptModal(false)}></button>
              </div>

              <div className="modal-body p-3 text-center">
                <div id="thermal-receipt-printable" className="receipt-view text-start">
                  <div className="text-center mb-2">
                    <h5 className="fw-bold mb-0">{receipt.storeName}</h5>
                    <div className="small fw-semibold">{receipt.storeNameSi}</div>
                    <div className="small text-muted">{receipt.storeAddress}</div>
                    <div className="small text-muted">Tel: {receipt.storePhone}</div>
                  </div>

                  <div className="receipt-divider"></div>

                  <div className="d-flex justify-content-between small">
                    <span>Inv: {receipt.invoiceNumber}</span>
                    <span>{new Date(receipt.dateUtc).toLocaleTimeString()}</span>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span>Cashier: {receipt.cashierName}</span>
                    <span>Term: {receipt.terminalId}</span>
                  </div>

                  <div className="receipt-divider"></div>

                  <table className="w-100 small mb-2">
                    <thead>
                      <tr>
                        <th className="text-start">Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="text-start text-truncate" style={{ maxWidth: '140px' }}>
                            {item.nameEn}
                          </td>
                          <td className="text-center">
                            {item.quantity} {item.unitCode}
                          </td>
                          <td className="text-end">Rs. {item.lineTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="receipt-divider"></div>

                  <div className="d-flex justify-content-between small">
                    <span>Subtotal</span>
                    <span>Rs. {receipt.subTotal.toFixed(2)}</span>
                  </div>
                  {receipt.discountAmount > 0 && (
                    <div className="d-flex justify-content-between small text-danger">
                      <span>Discount</span>
                      <span>-Rs. {receipt.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="d-flex justify-content-between fw-bold fs-6 my-1">
                    <span>TOTAL</span>
                    <span>Rs. {receipt.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span>Paid</span>
                    <span>Rs. {receipt.paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span>Change</span>
                    <span>Rs. {receipt.changeAmount.toFixed(2)}</span>
                  </div>

                  <div className="receipt-divider"></div>

                  <div className="receipt-barcode-wrapper text-center my-2 d-flex justify-content-center overflow-hidden" dangerouslySetInnerHTML={{ __html: receipt.barcodeSvg }} />

                  <div className="text-center small text-muted mt-2">
                    <div>{receipt.headerNotes}</div>
                    <div>{receipt.footerNotes}</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowReceiptModal(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center gap-2"
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

      {/* Held Bills Modal */}
      {showHeldBillsModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">Held Suspended Bills</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowHeldBillsModal(false)}></button>
              </div>
              <div className="modal-body p-3">
                {heldBills.length === 0 ? (
                  <p className="text-muted text-center py-4">No held bills found.</p>
                ) : (
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Hold Number</th>
                        <th>Time</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heldBills.map((b) => (
                        <tr key={b.id}>
                          <td className="fw-bold">{b.invoiceNumber}</td>
                          <td>{new Date(b.createdAtUtc).toLocaleTimeString()}</td>
                          <td>{b.itemCount} items</td>
                          <td className="fw-bold text-success">Rs. {b.grandTotal.toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-success fw-semibold"
                              onClick={() => resumeHeldBill(b)}
                            >
                              Resume to Cart
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Return Modal */}
      {showReturnsModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-arrow-counterclockwise"></i>
                  <span>Sales Return & Refund</span>
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowReturnsModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Enter Invoice Number to Return</label>
                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. INV-20261101-0001"
                      value={returnInvoiceInput}
                      onChange={(e) => setReturnInvoiceInput(e.target.value)}
                    />
                    <button type="button" className="btn btn-danger px-4 fw-bold" onClick={handleLookupReturnInvoice}>
                      Search
                    </button>
                  </div>
                </div>

                {lookupSale && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between p-2 bg-light rounded border mb-3">
                      <span><strong>Invoice:</strong> {lookupSale.invoiceNumber}</span>
                      <span><strong>Date:</strong> {new Date(lookupSale.createdAtUtc).toLocaleDateString()}</span>
                      <span><strong>Cashier:</strong> {lookupSale.cashierName}</span>
                    </div>

                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Purchased Qty</th>
                          <th>Available to Return</th>
                          <th>Price</th>
                          <th style={{ width: '130px' }}>Return Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lookupSale.items.map((it: any) => (
                          <tr key={it.saleItemId}>
                            <td>{it.nameEn} ({it.sku})</td>
                            <td>{it.originalQuantity}</td>
                            <td>{it.availableToReturn}</td>
                            <td>Rs. {it.unitPrice.toFixed(2)}</td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max={it.availableToReturn}
                                step="any"
                                className="form-control form-control-sm"
                                value={returnItems[it.saleItemId] || ''}
                                onChange={(e) =>
                                  setReturnItems({ ...returnItems, [it.saleItemId]: parseFloat(e.target.value) || 0 })
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Reason for Return</label>
                        <input
                          type="text"
                          className="form-control"
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6 d-flex align-items-center mt-4">
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="returnRestock"
                            checked={returnToStock}
                            onChange={(e) => setReturnToStock(e.target.checked)}
                          />
                          <label className="form-check-label fw-semibold" htmlFor="returnRestock">
                            Return items back to available inventory stock
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowReturnsModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger fw-bold"
                  disabled={!lookupSale}
                  onClick={handleProcessReturn}
                >
                  Process Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
