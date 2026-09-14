import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageHeader, fmtDate, fmtTime, fmtISO, peso } from '../components/ui.jsx';

function leaveDurationLabel(v) {
  if (v === 'half_am') return 'Half day (AM)';
  if (v === 'half_pm') return 'Half day (PM)';
  return 'Whole day';
}

export default function ApprovalsPage() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openId, setOpenId] = useState(null);
  const [notes, setNotes] = useState('');
  // Two-step guard before any approve/reject fires, so a note typed for one
  // action can't be silently attached to the other (both buttons used to sit
  // side by side and acted immediately).
  const [confirm, setConfirm] = useState(null);            // { id, action } for timekeeping requests

  // Pending reimbursements / additional incentives.
  const [reimbs, setReimbs] = useState([]);
  const [reimbBusy, setReimbBusy] = useState(false);
  const [reimbOpenId, setReimbOpenId] = useState(null);
  const [reimbNotes, setReimbNotes] = useState('');
  const [confirmReimb, setConfirmReimb] = useState(null);  // { id, action } for reimbursements

  // Pending cash advances / deductions (subtracted from the payslip).
  const [deds, setDeds] = useState([]);
  const [dedBusy, setDedBusy] = useState(false);
  const [dedOpenId, setDedOpenId] = useState(null);
  const [dedNotes, setDedNotes] = useState('');
  const [confirmDed, setConfirmDed] = useState(null);      // { id, action } for deductions

  const load = useCallback(async () => {
    try {
      setItems(await api.approvals());
      setReimbs(await api.pendingReimbursements());
      setDeds(await api.pendingDeductions());
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load pending approvals.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // First step: validate the note and show a confirmation prompt for the chosen
  // action. The actual API call only happens after the user confirms it.
  function askAct(id, action) {
    if (action === 'reject' && !notes.trim()) {
      setError('A note is required to reject a request.');
      return;
    }
    setError('');
    setNotice('');
    setConfirm({ id, action });
  }

  async function act(id, action) {
    if (action === 'reject' && !notes.trim()) {
      setError('A note is required to reject a request.');
      setConfirm(null);
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (action === 'approve') {
        await api.approve(id, notes || '');
        setNotice('Request approved. The time entry has been adjusted.');
      } else {
        await api.reject(id, notes);
        setNotice('Request rejected.');
      }
      setConfirm(null);
      setOpenId(null);
      setNotes('');
      await load();
    } catch (err) {
      setError(err.message || `Could not ${action} the request.`);
    } finally {
      setBusy(false);
    }
  }

  // Reimbursement equivalent of askAct — confirm between "Approve" and "Reject".
  function askReimb(id, action) {
    if (action === 'reject' && !reimbNotes.trim()) {
      setError('A note is required to reject a reimbursement.');
      return;
    }
    setError('');
    setNotice('');
    setConfirmReimb({ id, action });
  }

  async function actReimb(id, action) {
    if (action === 'reject' && !reimbNotes.trim()) {
      setError('A note is required to reject a reimbursement.');
      setConfirmReimb(null);
      return;
    }
    setReimbBusy(true);
    setError('');
    setNotice('');
    try {
      if (action === 'approve') {
        await api.approveReimbursement(id, reimbNotes || '');
        setNotice('Reimbursement approved. The amount will be added to the staff member\'s payslip.');
      } else {
        await api.rejectReimbursement(id, reimbNotes);
        setNotice('Reimbursement rejected and excluded from the payslip.');
      }
      setConfirmReimb(null);
      setReimbOpenId(null);
      setReimbNotes('');
      await load();
    } catch (err) {
      setError(err.message || `Could not ${action} the reimbursement.`);
    } finally {
      setReimbBusy(false);
    }
  }

  // Cash advance / deduction equivalent of askReimb — confirm before acting.
  function askDed(id, action) {
    if (action === 'reject' && !dedNotes.trim()) {
      setError('A note is required to reject a cash advance.');
      return;
    }
    setError('');
    setNotice('');
    setConfirmDed({ id, action });
  }

  async function actDed(id, action) {
    if (action === 'reject' && !dedNotes.trim()) {
      setError('A note is required to reject a cash advance.');
      setConfirmDed(null);
      return;
    }
    setDedBusy(true);
    setError('');
    setNotice('');
    try {
      if (action === 'approve') {
        await api.approveDeduction(id, dedNotes || '');
        setNotice('Cash advance approved. The amount will be subtracted from the staff member\'s payslip.');
      } else {
        await api.rejectDeduction(id, dedNotes);
        setNotice('Cash advance rejected and excluded from the payslip.');
      }
      setConfirmDed(null);
      setDedOpenId(null);
      setDedNotes('');
      await load();
    } catch (err) {
      setError(err.message || `Could not ${action} the cash advance.`);
    } finally {
      setDedBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Approvals" subtitle="Pending timekeeping requests, reimbursements and cash advances assigned to you." />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      <section className="card">
        {items.length === 0 ? (
          <p className="muted">No pending requests right now.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Date</th>
                  <th>Requested</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.fullName || r.userId}</td>
                    <td>{fmtDate(r.workDate)}</td>
                    <td>{fmtTime(r.requestedTimeIn)} → {fmtTime(r.requestedTimeOut)}</td>
                    <td>
                      {r.requestType}
                      {r.requestType === 'leave' && r.leaveDuration ? ` · ${leaveDurationLabel(r.leaveDuration)}` : ''}
                      {r.workSetup ? ` · ${r.workSetup === 'wfh' ? 'WFH' : 'Office'}` : ''}
                    </td>
                    <td>{r.reason}</td>
                    <td>
                      {openId === r.id ? (
                        <div className="approve-box">
                          <input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Note (required to reject)"
                          />
                          {confirm && confirm.id === r.id ? (
                            <div className={confirm.action === 'approve' ? 'alert alert-warning' : 'alert alert-error'}>
                              <p className="muted">
                                {confirm.action === 'approve'
                                  ? 'Approve this request? The time entry will be adjusted to the requested times.'
                                  : `Reject this request? It will NOT change any time entry.${notes.trim() ? ` Note: “${notes.trim()}” will be saved with it.` : ''}`}
                              </p>
                              <div className="approve-actions">
                                <button
                                  className={'btn ' + (confirm.action === 'approve' ? 'btn-success' : 'btn-danger') + ' btn-sm'}
                                  disabled={busy}
                                  onClick={() => act(r.id, confirm.action)}
                                >
                                  Yes, {confirm.action}
                                </button>
                                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setConfirm(null)}>
                                  No, go back
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="approve-actions">
                              <button className="btn btn-success btn-sm" disabled={busy} onClick={() => askAct(r.id, 'approve')}>
                                Approve
                              </button>
                              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => askAct(r.id, 'reject')}>
                                Reject
                              </button>
                              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setOpenId(null); setNotes(''); }}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setOpenId(r.id); setNotes(''); setConfirm(null); setError(''); }}>
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Pending reimbursements &amp; incentives</h2>
        <p className="muted">
          Approving adds the amount to the staff member's payslip for the current payoff period.
        </p>
        {reimbs.length === 0 ? (
          <p className="muted">No pending reimbursements right now.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Submitted</th>
                  <th>Note</th>
                  <th className="num">Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reimbs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.fullName || r.userId}</td>
                    <td>{fmtISO(r.createdAt)}</td>
                    <td>{r.note}</td>
                    <td className="num"><strong>{peso(r.amount)}</strong></td>
                    <td>
                      {reimbOpenId === r.id ? (
                        <div className="approve-box">
                          <input
                            value={reimbNotes}
                            onChange={(e) => setReimbNotes(e.target.value)}
                            placeholder="Note (required to reject)"
                          />
                          {confirmReimb && confirmReimb.id === r.id ? (
                            <div className={confirmReimb.action === 'approve' ? 'alert alert-warning' : 'alert alert-error'}>
                              <p className="muted">
                                {confirmReimb.action === 'approve'
                                  ? `Approve this reimbursement? ${peso(r.amount)} will be added to the payslip.`
                                  : `Reject this reimbursement? ${peso(r.amount)} will NOT be added to the payslip.${reimbNotes.trim() ? ` Note: “${reimbNotes.trim()}” will be saved with it.` : ''}`}
                              </p>
                              <div className="approve-actions">
                                <button
                                  className={'btn ' + (confirmReimb.action === 'approve' ? 'btn-success' : 'btn-danger') + ' btn-sm'}
                                  disabled={reimbBusy}
                                  onClick={() => actReimb(r.id, confirmReimb.action)}
                                >
                                  Yes, {confirmReimb.action}
                                </button>
                                <button className="btn btn-ghost btn-sm" disabled={reimbBusy} onClick={() => setConfirmReimb(null)}>
                                  No, go back
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="approve-actions">
                              <button className="btn btn-success btn-sm" disabled={reimbBusy} onClick={() => askReimb(r.id, 'approve')}>
                                Approve
                              </button>
                              <button className="btn btn-danger btn-sm" disabled={reimbBusy} onClick={() => askReimb(r.id, 'reject')}>
                                Reject
                              </button>
                              <button className="btn btn-ghost btn-sm" disabled={reimbBusy} onClick={() => { setReimbOpenId(null); setReimbNotes(''); }}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setReimbOpenId(r.id); setReimbNotes(''); setConfirmReimb(null); setError(''); }}>
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Pending cash advances &amp; deductions</h2>
        <p className="muted">
          Approving SUBTRACTS the amount from the staff member's payslip for the current payoff period.
        </p>
        {deds.length === 0 ? (
          <p className="muted">No pending cash advances right now.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Submitted</th>
                  <th>Note</th>
                  <th className="num">Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deds.map((d) => (
                  <tr key={d.id}>
                    <td>{d.fullName || d.userId}</td>
                    <td>{fmtISO(d.createdAt)}</td>
                    <td>{d.note}</td>
                    <td className="num"><strong>{peso(d.amount)}</strong></td>
                    <td>
                      {dedOpenId === d.id ? (
                        <div className="approve-box">
                          <input
                            value={dedNotes}
                            onChange={(e) => setDedNotes(e.target.value)}
                            placeholder="Note (required to reject)"
                          />
                          {confirmDed && confirmDed.id === d.id ? (
                            <div className={confirmDed.action === 'approve' ? 'alert alert-warning' : 'alert alert-error'}>
                              <p className="muted">
                                {confirmDed.action === 'approve'
                                  ? `Approve this cash advance? ${peso(d.amount)} will be SUBTRACTED from the payslip.`
                                  : `Reject this cash advance? ${peso(d.amount)} will NOT be subtracted from the payslip.${dedNotes.trim() ? ` Note: “${dedNotes.trim()}” will be saved with it.` : ''}`}
                              </p>
                              <div className="approve-actions">
                                <button
                                  className={'btn ' + (confirmDed.action === 'approve' ? 'btn-success' : 'btn-danger') + ' btn-sm'}
                                  disabled={dedBusy}
                                  onClick={() => actDed(d.id, confirmDed.action)}
                                >
                                  Yes, {confirmDed.action}
                                </button>
                                <button className="btn btn-ghost btn-sm" disabled={dedBusy} onClick={() => setConfirmDed(null)}>
                                  No, go back
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="approve-actions">
                              <button className="btn btn-success btn-sm" disabled={dedBusy} onClick={() => askDed(d.id, 'approve')}>
                                Approve
                              </button>
                              <button className="btn btn-danger btn-sm" disabled={dedBusy} onClick={() => askDed(d.id, 'reject')}>
                                Reject
                              </button>
                              <button className="btn btn-ghost btn-sm" disabled={dedBusy} onClick={() => { setDedOpenId(null); setDedNotes(''); }}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setDedOpenId(d.id); setDedNotes(''); setConfirmDed(null); setError(''); }}>
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}