import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PageHeader, fmtDate, fmtTime } from '../components/ui.jsx';

export default function ApprovalsPage() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [openId, setOpenId] = useState(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await api.approvals());
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load pending approvals.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id, action) {
    if (action === 'reject' && !notes.trim()) {
      setError('A note is required to reject a request.');
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
      setOpenId(null);
      setNotes('');
      await load();
    } catch (err) {
      setError(err.message || `Could not ${action} the request.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Approvals" subtitle="Pending timekeeping requests assigned to you." />

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
                    <td>{r.requestType}</td>
                    <td>{r.reason}</td>
                    <td>
                      {openId === r.id ? (
                        <div className="approve-box">
                          <input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Note (required to reject)"
                          />
                          <div className="approve-actions">
                            <button className="btn btn-success btn-sm" disabled={busy} onClick={() => act(r.id, 'approve')}>
                              Approve
                            </button>
                            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => act(r.id, 'reject')}>
                              Reject
                            </button>
                            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setOpenId(null); setNotes(''); }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setOpenId(r.id); setNotes(''); setError(''); }}>
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