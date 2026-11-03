import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const SettingsPage: React.FC = () => {

  const [settings, setSettings] = useState<{ [key: string]: string }>({
    ShopName: '',
    ShopNameSi: '',
    Address: '',
    Phone: '',
    Currency: 'LKR',
    CurrencySymbol: 'Rs.',
    TaxPercentage: '0',
    ScaleBarcodePrefix: '21',
    ScaleItemCodeLength: '5',
    ScaleWeightFormat: 'WEIGHT',
    ReceiptHeader: '',
    ReceiptHeaderSi: '',
    ReceiptFooter: '',
    ReceiptFooterSi: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get<any[]>('/settings');
      const map: { [key: string]: string } = {};
      res.data.forEach((s) => {
        map[s.key] = s.value;
      });
      setSettings((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', settings);
      alert('Shop and hardware scale settings saved successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  if (loading) {
    return <div className="p-4 text-center text-muted">Loading settings...</div>;
  }

  return (
    <div className="container-fluid px-0" style={{ maxWidth: '900px' }}>
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">System & Store Settings</h3>
        <p className="text-muted small mb-0">Configure store branding, weighing scale barcode specifications, local tax, and receipt formats.</p>
      </div>

      <form onSubmit={handleSave}>
        {/* Store Profile */}
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
          <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-shop text-success"></i>
            <span>Grocery Store Profile</span>
          </h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Store Name (English)</label>
              <input
                type="text"
                className="form-control"
                value={settings.ShopName || ''}
                onChange={(e) => handleChange('ShopName', e.target.value)}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Store Name (Sinhala / සිංහල නම)</label>
              <input
                type="text"
                className="form-control"
                value={settings.ShopNameSi || ''}
                onChange={(e) => handleChange('ShopNameSi', e.target.value)}
                required
              />
            </div>

            <div className="col-md-8">
              <label className="form-label small fw-semibold text-muted">Address</label>
              <input
                type="text"
                className="form-control"
                value={settings.Address || ''}
                onChange={(e) => handleChange('Address', e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-muted">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={settings.Phone || ''}
                onChange={(e) => handleChange('Phone', e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-muted">Currency Code</label>
              <input
                type="text"
                className="form-control fw-bold"
                value={settings.Currency || 'LKR'}
                onChange={(e) => handleChange('Currency', e.target.value)}
                readOnly
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-muted">Currency Symbol</label>
              <input
                type="text"
                className="form-control fw-bold"
                value={settings.CurrencySymbol || 'Rs.'}
                onChange={(e) => handleChange('CurrencySymbol', e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-muted">Sales Tax % (VAT/SSCL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={settings.TaxPercentage || '0'}
                onChange={(e) => handleChange('TaxPercentage', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Weighing Scale Barcode Configuration */}
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
          <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-speedometer2 text-primary"></i>
            <span>Electronic Weighing Scale Barcode Specifications</span>
          </h5>
          <p className="text-muted small">
            Supermarket scales print variable barcodes encoding the item identifier and weighed weight. Configure the format matching your barcode scale model.
          </p>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold text-muted">Scale Barcode 2-Digit Prefix</label>
              <input
                type="text"
                maxLength={2}
                className="form-control font-monospace fw-bold"
                value={settings.ScaleBarcodePrefix || '21'}
                onChange={(e) => handleChange('ScaleBarcodePrefix', e.target.value)}
                required
              />
              <div className="form-text small">Standard Sri Lankan scales use <code>21</code> or <code>20</code></div>
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-muted">Item PLU Code Length (Digits)</label>
              <input
                type="number"
                min="3"
                max="6"
                className="form-control fw-bold"
                value={settings.ScaleItemCodeLength || '5'}
                onChange={(e) => handleChange('ScaleItemCodeLength', e.target.value)}
                required
              />
              <div className="form-text small">e.g. 5 digits: 00101</div>
            </div>

            <div className="col-md-4">
              <label className="form-label small fw-semibold text-muted">Payload Encoding Mode</label>
              <select
                className="form-select fw-bold"
                value={settings.ScaleWeightFormat || 'WEIGHT'}
                onChange={(e) => handleChange('ScaleWeightFormat', e.target.value)}
              >
                <option value="WEIGHT">Weight in Grams (WWWWW)</option>
                <option value="PRICE">Price Embedded in Cents (PPPPP)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Receipt Header & Footer */}
        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
          <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-receipt text-warning"></i>
            <span>Thermal Receipt Customization</span>
          </h5>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Receipt Header (English)</label>
              <input
                type="text"
                className="form-control"
                value={settings.ReceiptHeader || ''}
                onChange={(e) => handleChange('ReceiptHeader', e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Receipt Header (Sinhala)</label>
              <input
                type="text"
                className="form-control"
                value={settings.ReceiptHeaderSi || ''}
                onChange={(e) => handleChange('ReceiptHeaderSi', e.target.value)}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Receipt Footer / Policy (English)</label>
              <textarea
                className="form-control"
                rows={2}
                value={settings.ReceiptFooter || ''}
                onChange={(e) => handleChange('ReceiptFooter', e.target.value)}
              ></textarea>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted">Receipt Footer / Policy (Sinhala)</label>
              <textarea
                className="form-control"
                rows={2}
                value={settings.ReceiptFooterSi || ''}
                onChange={(e) => handleChange('ReceiptFooterSi', e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-success fw-bold px-5 py-2 shadow-sm d-flex align-items-center gap-2"
          disabled={saving}
          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
};
