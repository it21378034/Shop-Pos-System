import React, { useState } from 'react';
import { api } from '../../services/api';

export const BarcodeToolsPage: React.FC = () => {

  // Scale Barcode Simulator
  const [scalePrefix, setScalePrefix] = useState('21');
  const [scaleItemCode, setScaleItemCode] = useState('00101');
  const [scaleWeightGrams, setScaleWeightGrams] = useState('1250');
  const [simulatedBarcode, setSimulatedBarcode] = useState('');
  const [parsedSimResult, setParsedSimResult] = useState<any>(null);

  // Custom Barcode Generator
  const [customText, setCustomText] = useState('PRO-INV-2026');
  const [generatedSvg, setGeneratedSvg] = useState<string>('');

  const handleSimulateScaleBarcode = async () => {
    // 2-digit prefix + 5-digit PLU + 5-digit weight = 12 digits
    const prefix = scalePrefix.padEnd(2, '0').substring(0, 2);
    const plu = scaleItemCode.padStart(5, '0').substring(0, 5);
    const weight = scaleWeightGrams.padStart(5, '0').substring(0, 5);
    const first12 = `${prefix}${plu}${weight}`;

    // Calculate EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(first12[i]);
      sum += i % 2 === 0 ? d : d * 3;
    }
    const rem = sum % 10;
    const checkDigit = rem === 0 ? 0 : 10 - rem;
    const fullBarcode = `${first12}${checkDigit}`;

    setSimulatedBarcode(fullBarcode);

    // Call backend API to test parsing
    try {
      const res = await api.post('/barcode/parse-test', {
        barcode: fullBarcode,
        prefix: scalePrefix,
        itemCodeLength: 5,
        formatType: 'WEIGHT',
      });
      setParsedSimResult(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateCustomBarcode = async () => {
    if (!customText.trim()) return;
    try {
      const res = await api.get(`/barcode/generate/${encodeURIComponent(customText.trim())}`);
      setGeneratedSvg(res.data);
    } catch (err) {
      alert('Failed to generate barcode');
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">Barcode & Weighing Scale Management</h3>
        <p className="text-muted small mb-0">
          Configure weighing scale EAN-13 prefixes, simulate scale weight-encoded barcodes, and print custom barcode stickers.
        </p>
      </div>

      <div className="row g-4">
        {/* Scale Barcode Simulator */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-speedometer2 text-success"></i>
              <span>Electronic Scale Barcode Simulator</span>
            </h5>
            <p className="text-muted small">
              Supermarket electronic scales print EAN-13 barcodes containing the item identifier and weighed weight in grams.
            </p>

            <div className="row g-3">
              <div className="col-4">
                <label className="form-label small fw-semibold">Scale Prefix</label>
                <input
                  type="text"
                  maxLength={2}
                  className="form-control fw-bold"
                  value={scalePrefix}
                  onChange={(e) => setScalePrefix(e.target.value)}
                />
                <div className="form-text small">e.g. 21 or 20</div>
              </div>

              <div className="col-4">
                <label className="form-label small fw-semibold">Item PLU</label>
                <input
                  type="text"
                  maxLength={5}
                  className="form-control fw-bold"
                  value={scaleItemCode}
                  onChange={(e) => setScaleItemCode(e.target.value)}
                />
                <div className="form-text small">5-digit code</div>
              </div>

              <div className="col-4">
                <label className="form-label small fw-semibold">Weight (g)</label>
                <input
                  type="number"
                  className="form-control fw-bold"
                  value={scaleWeightGrams}
                  onChange={(e) => setScaleWeightGrams(e.target.value)}
                />
                <div className="form-text small">e.g. 1250g = 1.25kg</div>
              </div>

              <div className="col-12">
                <button
                  type="button"
                  className="btn btn-success fw-bold w-100 py-2"
                  onClick={handleSimulateScaleBarcode}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                >
                  Generate & Parse Scale Barcode
                </button>
              </div>
            </div>

            {simulatedBarcode && (
              <div className="mt-4 p-3 bg-light rounded-3 border">
                <div className="small text-muted fw-semibold mb-1">Generated Scale Barcode:</div>
                <div className="fs-4 fw-bold font-monospace text-dark text-center my-2 p-2 bg-white rounded border">
                  {simulatedBarcode}
                </div>

                {parsedSimResult && (
                  <div className="row g-2 mt-2 pt-2 border-top small">
                    <div className="col-6">
                      <span className="text-muted">Item PLU Detected:</span>
                      <div className="fw-bold">{parsedSimResult.itemCode}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Detected Weight:</span>
                      <div className="fw-bold text-success">{parsedSimResult.weightInKg} Kilograms</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Custom Barcode Generator */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-upc text-primary"></i>
              <span>Custom Code-128 Generator</span>
            </h5>
            <p className="text-muted small">
              Generate crisp, scannable Code-128 SVG barcodes for product packaging, shelves, or internal invoices.
            </p>

            <div className="mb-3">
              <label className="form-label small fw-semibold">Content / Text to Encode</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter SKU, Invoice or custom code..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                />
                <button type="button" className="btn btn-primary fw-bold" onClick={handleGenerateCustomBarcode}>
                  Generate
                </button>
              </div>
            </div>

            {generatedSvg ? (
              <div className="text-center p-4 bg-light rounded-3 border mt-3">
                <div dangerouslySetInnerHTML={{ __html: generatedSvg }} />
                <div className="mt-3">
                  <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => window.print()}>
                    <i className="bi bi-printer me-1"></i> Print Barcode
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-light rounded-3 border text-center text-muted small mt-3">
                Click "Generate" to preview barcode.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
