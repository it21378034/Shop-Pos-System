import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { CashSession } from '../../types';

export const CashSessionsPage: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);

  // Form Inputs
  const [openingCash, setOpeningCash] = useState<number>(5000);
  const [closingCashDeclared, setClosingCashDeclared] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [movementType, setMovementType] = useState<number>(1); // 1 = Cash In, 2 = Cash Out
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const [curRes, histRes] = await Promise.all([
        api.get<CashSession | null>('/cashsessions/current'),
        api.get('/cashsessions'),
      ]);
      setCurrentSession(curRes.data);
      setHistory(histRes.data.list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/cashsessions/open', {
        openingCash,
        terminalId: 'POS-01',
      });
      setCurrentSession(res.data);
      setShowOpenModal(false);
      loadSessions();
      alert('Register session opened!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to open session.');
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    try {
      const res = await api.post(`/cashsessions/${currentSession.id}/close`, {
        closingCashDeclared,
        notes: closeNotes,
      });
      alert(`Session closed. Cash Difference: Rs. ${res.data.cashDifference}`);
      setShowCloseModal(false);
      setCurrentSession(null);
      loadSessions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to close session.');
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    try {
      await api.post(`/cashsessions/${currentSession.id}/movements`, {
        movementType,
        amount: movementAmount,
        reason: movementReason,
      });
      setShowMovementModal(false);
      setMovementAmount(0);
      setMovementReason('');
      loadSessions();
      alert('Cash movement recorded!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record cash movement.');
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">Cash Register & Drawer Management</h3>
          <p className="text-muted small mb-0">Manage cashier drawer shifts, opening floats, cash-in/out movements, and closing reconciliation.</p>
        </div>
      </div>

      {loading && (
        <div className="d-flex justify-content-center p-3 mb-3">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Active Session Status Card */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
        {currentSession ? (
          <div>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center pb-3 border-bottom mb-3 gap-2">
              <div>
                <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-2 fs-6">
                  <i className="bi bi-circle-fill me-2 small"></i>Active Register Shift (Open)
                </span>
                <div className="text-muted small mt-1">
                  Session No: <strong>{currentSession.sessionNumber}</strong> | Terminal: <strong>{currentSession.terminalId}</strong>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary fw-semibold d-flex align-items-center gap-1"
                  onClick={() => setShowMovementModal(true)}
                >
                  <i className="bi bi-arrow-left-right"></i>
                  <span>Cash In / Cash Out</span>
                </button>

                <button
                  type="button"
                  className="btn btn-danger fw-bold d-flex align-items-center gap-1"
                  onClick={() => {
                    setClosingCashDeclared(currentSession.expectedCash || 0);
                    setShowCloseModal(true);
                  }}
                >
                  <i className="bi bi-lock-fill"></i>
                  <span>Close Register & Reconcile</span>
                </button>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-6 col-md-3">
                <div className="p-3 bg-light rounded-3">
                  <span className="text-muted small fw-semibold">Opening Float</span>
                  <div className="fs-5 fw-bold text-dark mt-1">
                    Rs. {currentSession.openingCash.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="p-3 bg-light rounded-3">
                  <span className="text-muted small fw-semibold">Total Cash Sales</span>
                  <div className="fs-5 fw-bold text-success mt-1">
                    + Rs. {currentSession.totalCashSales.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="p-3 bg-light rounded-3">
                  <span className="text-muted small fw-semibold">Cash In / Cash Out</span>
                  <div className="fs-5 fw-bold text-secondary mt-1">
                    +Rs. {currentSession.totalCashIn.toFixed(2)} / -Rs. {currentSession.totalCashOut.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="p-3 bg-success bg-opacity-10 border border-success rounded-3">
                  <span className="text-success small fw-bold">Expected In Drawer</span>
                  <div className="fs-4 fw-bold text-success mt-1">
                    Rs. {currentSession.expectedCash.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="bg-light d-inline-flex p-3 rounded-circle mb-3 border">
              <i className="bi bi-cash-coin fs-2 text-muted"></i>
            </div>
            <h5 className="fw-bold text-dark mb-1">No Active Register Session</h5>
            <p className="text-muted small mb-3">Open a cash drawer session to start taking cash payments at the POS.</p>
            <button
              type="button"
              className="btn btn-success fw-bold px-4 py-2"
              onClick={() => setShowOpenModal(true)}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
            >
              <i className="bi bi-unlock-fill me-2"></i>Open Register Shift
            </button>
          </div>
        )}
      </div>

      {/* Past Shifts History */}
      <div className="card border-0 shadow-sm rounded-3 bg-white overflow-hidden">
        <div className="p-3 border-bottom">
          <h6 className="fw-bold mb-0">Past Shift Reconciliation History</h6>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Session No</th>
                <th>Cashier</th>
                <th>Opened</th>
                <th>Closed</th>
                <th className="text-end">Opening</th>
                <th className="text-end">Cash Sales</th>
                <th className="text-end">Expected</th>
                <th className="text-end">Declared</th>
                <th className="text-end">Discrepancy</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id}>
                  <td className="fw-bold">{s.sessionNumber}</td>
                  <td>{s.cashierName}</td>
                  <td className="small text-muted">{new Date(s.openedAtUtc).toLocaleString()}</td>
                  <td className="small text-muted">
                    {s.closedAtUtc ? new Date(s.closedAtUtc).toLocaleString() : 'Open'}
                  </td>
                  <td className="text-end">Rs. {s.openingCash.toFixed(2)}</td>
                  <td className="text-end text-success fw-semibold">Rs. {s.totalCashSales.toFixed(2)}</td>
                  <td className="text-end fw-semibold">Rs. {s.expectedCash.toFixed(2)}</td>
                  <td className="text-end fw-semibold">
                    {s.closingCashDeclared ? `Rs. ${s.closingCashDeclared.toFixed(2)}` : '—'}
                  </td>
                  <td className="text-end">
                    {s.cashDifference != null ? (
                      <span className={`badge ${s.cashDifference === 0 ? 'bg-success' : s.cashDifference > 0 ? 'bg-info' : 'bg-danger'}`}>
                        {s.cashDifference >= 0 ? `+Rs. ${s.cashDifference.toFixed(2)}` : `-Rs. ${Math.abs(s.cashDifference).toFixed(2)}`}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Session Modal */}
      {showOpenModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">Open Register Shift</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowOpenModal(false)}></button>
              </div>

              <form onSubmit={handleOpenSession}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Opening Cash Float in Drawer (LKR)</label>
                    <div className="input-group">
                      <span className="input-group-text">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-control form-control-lg fw-bold"
                        value={openingCash}
                        onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowOpenModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success fw-bold px-4" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
                    Open Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Close Session Modal */}
      {showCloseModal && currentSession && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">Close Shift & Reconcile Cash</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCloseModal(false)}></button>
              </div>

              <form onSubmit={handleCloseSession}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Expected Cash:</span>
                      <strong className="text-dark">Rs. {currentSession.expectedCash.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Physically Counted Closing Cash (LKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-control form-control-lg fw-bold"
                      value={closingCashDeclared}
                      onChange={(e) => setClosingCashDeclared(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Closing Notes / Discrepancy Reason</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCloseModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger fw-bold px-4">
                    Confirm & Close Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovementModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">Record Cash In / Cash Out</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowMovementModal(false)}></button>
              </div>

              <form onSubmit={handleRecordMovement}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Movement Type</label>
                    <select
                      className="form-select"
                      value={movementType}
                      onChange={(e) => setMovementType(parseInt(e.target.value))}
                    >
                      <option value={1}>Cash In (Float Addition / Petty Cash)</option>
                      <option value={2}>Cash Out (Expense / Owner Draw)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Amount (Rs.)</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      className="form-control form-control-lg fw-bold"
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-muted">Reason / Paid To</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Paid transport driver or lunch allowance"
                      value={movementReason}
                      onChange={(e) => setMovementReason(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowMovementModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold px-4">
                    Record Movement
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
