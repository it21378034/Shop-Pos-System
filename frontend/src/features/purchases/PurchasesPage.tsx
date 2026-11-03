import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import type { Purchase, Supplier, Product } from '../../types';

export const PurchasesPage: React.FC = () => {
  const { t } = useTranslation();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New PO Modal
  const [showPoModal, setShowPoModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([]);

  // Receive Goods Modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivePurchase, setReceivePurchase] = useState<Purchase | null>(null);
  const [receivedQtys, setReceivedQtys] = useState<{ [key: string]: number }>({});
  const [receivedBatches, setReceivedBatches] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, prRes] = await Promise.all([
        api.get<Purchase[]>('/purchases'),
        api.get<Supplier[]>('/suppliers'),
        api.get('/products', { params: { pageSize: 100 } }),
      ]);
      setPurchases(pRes.data);
      setSuppliers(sRes.data);
      setProducts(prRes.data.items);
      if (sRes.data.length > 0) setSelectedSupplierId(sRes.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoItem = () => {
    if (products.length === 0) return;
    setPoItems([...poItems, { productId: products[0].id, quantity: 10, unitCost: products[0].costPrice }]);
  };

  const handleRemovePoItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      alert('Please add at least one item to the purchase order.');
      return;
    }

    try {
      await api.post('/purchases', {
        supplierId: selectedSupplierId,
        notes: poNotes,
        items: poItems.map((i) => ({
          productId: i.productId,
          quantityOrdered: i.quantity,
          unitCost: i.unitCost,
        })),
      });
      setShowPoModal(false);
      setPoItems([]);
      loadData();
      alert('Purchase order created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create purchase order.');
    }
  };

  const handleOpenReceiveModal = (p: Purchase) => {
    setReceivePurchase(p);
    const qtys: { [key: string]: number } = {};
    const batches: { [key: string]: string } = {};
    p.items.forEach((it) => {
      qtys[it.id] = it.quantityOrdered;
      batches[it.id] = `GRN-${Date.now().toString().slice(-4)}`;
    });
    setReceivedQtys(qtys);
    setReceivedBatches(batches);
    setShowReceiveModal(true);
  };

  const handleConfirmReceive = async () => {
    if (!receivePurchase) return;

    const payload = {
      notes: 'Received and verified at warehouse',
      items: receivePurchase.items.map((it) => ({
        purchaseItemId: it.id,
        quantityReceived: receivedQtys[it.id] || it.quantityOrdered,
        unitCost: it.unitCost,
        batchNumber: receivedBatches[it.id] || 'DEFAULT',
      })),
    };

    try {
      await api.post(`/purchases/${receivePurchase.id}/receive`, payload);
      setShowReceiveModal(false);
      loadData();
      alert('Goods Received Note (GRN) processed! Stock balances and average costs updated.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process goods receipt.');
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">{t('purchases.title')}</h3>
          <p className="text-muted small mb-0">Manage supplier purchase orders, goods receiving (GRN), and inventory cost updates.</p>
        </div>
        <button
          type="button"
          className="btn btn-success fw-bold d-flex align-items-center gap-2 shadow-sm"
          onClick={() => {
            setPoItems([]);
            handleAddPoItem();
            setShowPoModal(true);
          }}
          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
        >
          <i className="bi bi-cart-plus"></i>
          <span>{t('purchases.newOrder')}</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-3 bg-white overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Items Count</th>
                <th className="text-end">Total Amount</th>
                <th className="text-center">{t('purchases.status')}</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-bold">{p.purchaseNumber}</td>
                    <td>
                      <div className="fw-semibold text-dark">{p.supplier?.companyName || 'Supplier'}</div>
                      <div className="text-muted small">{p.supplier?.phone}</div>
                    </td>
                    <td>{new Date(p.invoiceDate).toLocaleDateString()}</td>
                    <td>{p.items?.length || 0} items</td>
                    <td className="text-end fw-bold text-success fs-6">
                      Rs. {p.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      {p.status === 3 ? (
                        <span className="badge bg-success bg-opacity-25 text-success">Received (GRN)</span>
                      ) : (
                        <span className="badge bg-warning bg-opacity-25 text-warning-emphasis">Pending Receipt</span>
                      )}
                    </td>
                    <td className="text-end">
                      {p.status !== 3 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-success fw-semibold d-inline-flex align-items-center gap-1"
                          onClick={() => handleOpenReceiveModal(p)}
                        >
                          <i className="bi bi-box-arrow-in-down"></i>
                          <span>{t('purchases.receiveGoods')}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New PO Modal */}
      {showPoModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">Create Purchase Order</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPoModal(false)}></button>
              </div>

              <form onSubmit={handleCreatePo}>
                <div className="modal-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Select Supplier</label>
                      <select
                        className="form-select"
                        value={selectedSupplierId}
                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                        required
                      >
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.companyName} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Notes / Memo</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Weekly bulk staple stock delivery"
                        value={poNotes}
                        onChange={(e) => setPoNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">Order Line Items</h6>
                    <button type="button" className="btn btn-sm btn-outline-success fw-bold" onClick={handleAddPoItem}>
                      + Add Item
                    </button>
                  </div>

                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>Product</th>
                        <th style={{ width: '130px' }}>Quantity</th>
                        <th style={{ width: '150px' }}>Unit Cost (Rs.)</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.productId}
                              onChange={(e) => {
                                const prod = products.find((p) => p.id === e.target.value);
                                const updated = [...poItems];
                                updated[idx].productId = e.target.value;
                                if (prod) updated[idx].unitCost = prod.costPrice;
                                setPoItems(updated);
                              }}
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nameEn} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              className="form-control form-control-sm"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...poItems];
                                updated[idx].quantity = parseFloat(e.target.value) || 0;
                                setPoItems(updated);
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              value={item.unitCost}
                              onChange={(e) => {
                                const updated = [...poItems];
                                updated[idx].unitCost = parseFloat(e.target.value) || 0;
                                setPoItems(updated);
                              }}
                            />
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-sm text-danger p-0"
                              onClick={() => handleRemovePoItem(idx)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPoModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success fw-bold px-4" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                    Save Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Receive Goods GRN Modal */}
      {showReceiveModal && receivePurchase && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">Goods Receiving Note (GRN)</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowReceiveModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                <div className="alert alert-info py-2 small mb-3">
                  Confirming this GRN will immediately add items to available stock balances and update weighted-average costing.
                </div>

                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Product</th>
                      <th>Ordered</th>
                      <th style={{ width: '130px' }}>Received Qty</th>
                      <th style={{ width: '150px' }}>Batch Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivePurchase.items.map((it) => (
                      <tr key={it.id}>
                        <td>
                          <div className="fw-bold">{it.product?.nameEn || 'Item'}</div>
                          <div className="small text-muted">{it.product?.sku}</div>
                        </td>
                        <td>{it.quantityOrdered}</td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="form-control form-control-sm fw-bold"
                            value={receivedQtys[it.id] ?? it.quantityOrdered}
                            onChange={(e) =>
                              setReceivedQtys({ ...receivedQtys, [it.id]: parseFloat(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={receivedBatches[it.id] || ''}
                            onChange={(e) =>
                              setReceivedBatches({ ...receivedBatches, [it.id]: e.target.value })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowReceiveModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success fw-bold px-4" onClick={handleConfirmReceive}>
                  Confirm & Restock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
