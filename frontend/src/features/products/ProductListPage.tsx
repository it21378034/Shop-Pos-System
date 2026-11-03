import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import type { Product, Category, Unit } from '../../types';

export const ProductListPage: React.FC = () => {
  const { t } = useTranslation();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    nameEn: '',
    nameSi: '',
    description: '',
    categoryId: '',
    unitId: '',
    isWeightBased: false,
    scaleItemCode: '',
    costPrice: 0,
    sellingPrice: 0,
    reorderLevel: 10,
    initialStockQuantity: 0,
    barcode: '',
  });

  // Edit form state (separate so add/edit don't conflict)
  const [editFormData, setEditFormData] = useState({
    sku: '',
    nameEn: '',
    nameSi: '',
    description: '',
    categoryId: '',
    unitId: '',
    isWeightBased: false,
    scaleItemCode: '',
    costPrice: 0,
    sellingPrice: 0,
    reorderLevel: 10,
    barcode: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, unitRes] = await Promise.all([
        api.get('/products', { params: { pageSize: 100 } }),
        api.get('/categories'),
        api.get('/units'),
      ]);
      setProducts(prodRes.data.items);
      setCategories(catRes.data);
      setUnits(unitRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', {
        ...formData,
        barcodes: formData.barcode ? [formData.barcode] : [],
      });
      setShowAddModal(false);
      resetForm();
      loadData();
      alert('Product created successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create product.');
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      nameEn: '',
      nameSi: '',
      description: '',
      categoryId: '',
      unitId: '',
      isWeightBased: false,
      scaleItemCode: '',
      costPrice: 0,
      sellingPrice: 0,
      reorderLevel: 10,
      initialStockQuantity: 0,
      barcode: '',
    });
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setEditFormData({
      sku: product.sku,
      nameEn: product.nameEn,
      nameSi: product.nameSi,
      description: product.description || '',
      categoryId: product.categoryId,
      unitId: product.unitId,
      isWeightBased: product.isWeightBased,
      scaleItemCode: product.scaleItemCode || '',
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      reorderLevel: product.reorderLevel,
      barcode: product.barcodes?.[0]?.barcode || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;
    setIsSavingEdit(true);
    try {
      await api.put(`/products/${editingProductId}`, {
        ...editFormData,
        barcodes: editFormData.barcode ? [editFormData.barcode] : [],
      });
      setShowEditModal(false);
      setEditingProductId(null);
      loadData();
      alert('Product updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update product.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.nameEn}" (${product.sku})? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/products/${product.id}`);
      loadData();
      alert('Product deleted successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete product.');
    }
  };

  const handleOpenLabelModal = async (product: Product) => {
    try {
      const res = await api.get(`/products/${product.id}/barcode-label`);
      setSelectedProductForLabel(res.data);
      setShowLabelModal(true);
    } catch (err) {
      alert('Failed to load barcode label.');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      p.nameSi.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container-fluid px-0">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">{t('products.title')}</h3>
          <p className="text-muted small mb-0">Manage grocery catalog, dual-language names, barcodes, and electronic scale PLUs.</p>
        </div>
        <button
          type="button"
          className="btn btn-success fw-bold d-flex align-items-center gap-2 shadow-sm"
          onClick={() => {
            resetForm();
            if (categories.length > 0) setFormData((prev) => ({ ...prev, categoryId: categories[0].id }));
            if (units.length > 0) setFormData((prev) => ({ ...prev, unitId: units[0].id }));
            setShowAddModal(true);
          }}
          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
        >
          <i className="bi bi-plus-circle"></i>
          <span>{t('products.addProduct')}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm rounded-3 p-3 mb-4 bg-white">
        <div className="row g-2">
          <div className="col-12 col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search SKU, English or Sinhala name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-4">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories (සියලු කාණ්ඩ)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn} ({c.nameSi})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card border-0 shadow-sm rounded-3 bg-white overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>{t('products.sku')}</th>
                <th>Product Name (EN / SI)</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Live Stock</th>
                <th className="text-end">{t('products.costPrice')}</th>
                <th className="text-end">{t('products.sellingPrice')}</th>
                <th className="text-center">Scale PLU</th>
                <th className="text-end">{t('products.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="badge bg-light text-dark border fw-bold">{p.sku}</span>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{p.nameEn}</div>
                      <div className="text-muted small">{p.nameSi}</div>
                    </td>
                    <td>
                      <span className="badge bg-info bg-opacity-10 text-primary">{p.categoryName}</span>
                    </td>
                    <td>
                      <span className="fw-semibold text-secondary">{p.unitCode}</span>
                    </td>
                    <td>
                      <span className={`badge ${p.stockOnHand !== undefined && p.stockOnHand > (p.reorderLevel || 5) ? 'bg-success-subtle text-success' : (p.stockOnHand && p.stockOnHand > 0 ? 'bg-warning-subtle text-warning-emphasis' : 'bg-danger-subtle text-danger')} fw-bold border`}>
                        <i className="bi bi-box-seam me-1"></i>
                        {p.stockOnHand !== undefined ? `${p.stockOnHand} ${p.unitCode}` : '0'}
                      </span>
                    </td>
                    <td className="text-end fw-semibold text-muted">Rs. {p.costPrice.toFixed(2)}</td>
                    <td className="text-end fw-bold text-success fs-6">Rs. {p.sellingPrice.toFixed(2)}</td>
                    <td className="text-center">
                      {p.isWeightBased ? (
                        <span className="badge-weight">
                          PLU: {p.scaleItemCode || 'Scale'}
                        </span>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                          onClick={() => handleOpenEditModal(p)}
                          title="Edit Product"
                        >
                          <i className="bi bi-pencil-square"></i>
                          <span className="d-none d-lg-inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark d-inline-flex align-items-center gap-1"
                          onClick={() => handleOpenLabelModal(p)}
                          title="Print Barcode"
                        >
                          <i className="bi bi-printer"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                          onClick={() => handleDeleteProduct(p)}
                          title="Delete Product"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">Add New Product</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddModal(false)}></button>
              </div>

              <form onSubmit={handleCreateProduct}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">SKU (Unique Item Code)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. RIC-SAM-05K"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Barcode (EAN-13 / Code-128)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 4791001001016"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Category</label>
                      <select
                        className="form-select"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        required
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">English Product Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Keeri Samba Rice 5kg"
                        value={formData.nameEn}
                        onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Sinhala Product Name (සිංහල නම)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="උදා: කීරි සම්බා 5kg"
                        value={formData.nameSi}
                        onChange={(e) => setFormData({ ...formData, nameSi: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Unit of Measure</label>
                      <select
                        className="form-select"
                        value={formData.unitId}
                        onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                        required
                      >
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nameEn} ({u.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Cost Price (Rs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Selling Price (Rs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    {/* Scale Configuration */}
                    <div className="col-12 p-3 bg-light rounded-3 border">
                      <div className="form-check form-switch mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isWeightBasedCheck"
                          checked={formData.isWeightBased}
                          onChange={(e) => setFormData({ ...formData, isWeightBased: e.target.checked })}
                        />
                        <label className="form-check-label fw-bold" htmlFor="isWeightBasedCheck">
                          Weighing Scale / Weight-encoded Item
                        </label>
                      </div>

                      {formData.isWeightBased && (
                        <div className="row g-2 mt-1">
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Scale Item Code / PLU (e.g. 00101)</label>
                            <input
                              type="text"
                              maxLength={5}
                              className="form-control"
                              placeholder="5-digit code e.g. 00101"
                              value={formData.scaleItemCode}
                              onChange={(e) => setFormData({ ...formData, scaleItemCode: e.target.value })}
                            />
                            <div className="form-text small">
                              Scales encode barcodes as <code>21 + PLU + WWWWW + CheckDigit</code>.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Reorder Threshold Level</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.reorderLevel}
                        onChange={(e) => setFormData({ ...formData, reorderLevel: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Opening Stock Quantity</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control"
                        value={formData.initialStockQuantity}
                        onChange={(e) => setFormData({ ...formData, initialStockQuantity: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-success fw-bold px-4" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white' }}>
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-pencil-square fs-5"></i>
                  Edit Product — <span className="fw-normal">{editFormData.sku}</span>
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
              </div>

              <form onSubmit={handleUpdateProduct}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* SKU - read only */}
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">SKU (Item Code)</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={editFormData.sku}
                        readOnly
                      />
                      <div className="form-text small text-muted">SKU cannot be changed</div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Barcode (EAN-13 / Code-128)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 4791001001016"
                        value={editFormData.barcode}
                        onChange={(e) => setEditFormData({ ...editFormData, barcode: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Category</label>
                      <select
                        className="form-select"
                        value={editFormData.categoryId}
                        onChange={(e) => setEditFormData({ ...editFormData, categoryId: e.target.value })}
                        required
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">English Product Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.nameEn}
                        onChange={(e) => setEditFormData({ ...editFormData, nameEn: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Sinhala Product Name (සිංහල නම)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.nameSi}
                        onChange={(e) => setEditFormData({ ...editFormData, nameSi: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Unit of Measure</label>
                      <select
                        className="form-select"
                        value={editFormData.unitId}
                        onChange={(e) => setEditFormData({ ...editFormData, unitId: e.target.value })}
                        required
                      >
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nameEn} ({u.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PRICE SECTION - Highlighted */}
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">Cost Price (Rs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={editFormData.costPrice}
                        onChange={(e) => setEditFormData({ ...editFormData, costPrice: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-success d-flex align-items-center gap-1">
                        <i className="bi bi-tag-fill"></i>
                        Selling Price (Rs.)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control form-control-lg fw-bold border-success"
                        style={{ fontSize: '1.2rem', backgroundColor: '#f0fdf4', borderWidth: '2px' }}
                        value={editFormData.sellingPrice}
                        onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: parseFloat(e.target.value) || 0 })}
                        required
                      />
                      {editFormData.costPrice > 0 && editFormData.sellingPrice > 0 && (
                        <div className="form-text small mt-1">
                          <span className="text-success fw-semibold">
                            Margin: {((editFormData.sellingPrice - editFormData.costPrice) / editFormData.sellingPrice * 100).toFixed(1)}%
                          </span>
                          {' · '}
                          <span className="text-muted">
                            Profit: Rs. {(editFormData.sellingPrice - editFormData.costPrice).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Scale Configuration */}
                    <div className="col-12 p-3 bg-light rounded-3 border">
                      <div className="form-check form-switch mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="editIsWeightBasedCheck"
                          checked={editFormData.isWeightBased}
                          onChange={(e) => setEditFormData({ ...editFormData, isWeightBased: e.target.checked })}
                        />
                        <label className="form-check-label fw-bold" htmlFor="editIsWeightBasedCheck">
                          Weighing Scale / Weight-encoded Item
                        </label>
                      </div>

                      {editFormData.isWeightBased && (
                        <div className="row g-2 mt-1">
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Scale Item Code / PLU (e.g. 00101)</label>
                            <input
                              type="text"
                              maxLength={5}
                              className="form-control"
                              placeholder="5-digit code e.g. 00101"
                              value={editFormData.scaleItemCode}
                              onChange={(e) => setEditFormData({ ...editFormData, scaleItemCode: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Reorder Threshold Level</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editFormData.reorderLevel}
                        onChange={(e) => setEditFormData({ ...editFormData, reorderLevel: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">Description</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Optional product description"
                        value={editFormData.description}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowEditModal(false)}>
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary fw-bold px-4 d-flex align-items-center gap-2"
                    disabled={isSavingEdit}
                    style={{ backgroundColor: '#1e40af', borderColor: '#1e40af' }}
                  >
                    {isSavingEdit ? (
                      <>
                        <span className="spinner-border spinner-border-sm"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg"></i>
                        Update Product
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Label Modal */}
      {showLabelModal && selectedProductForLabel && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Barcode Label Sheet</h5>
                <button type="button" className="btn-close" onClick={() => setShowLabelModal(false)}></button>
              </div>

              <div className="modal-body p-4 text-center">
                <div
                  className="p-3 bg-white border border-dark rounded mx-auto"
                  style={{ width: '280px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                >
                  <div className="fw-bold fs-6 text-truncate">{selectedProductForLabel.nameEn}</div>
                  <div className="text-muted small">{selectedProductForLabel.nameSi}</div>
                  <div className="my-2" dangerouslySetInnerHTML={{ __html: selectedProductForLabel.svg }} />
                  <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                    <span className="small text-muted">SKU: {selectedProductForLabel.sku}</span>
                    <span className="fw-bold fs-5 text-dark">Rs. {selectedProductForLabel.sellingPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowLabelModal(false)}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  <i className="bi bi-printer me-2"></i>Print Sticker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
