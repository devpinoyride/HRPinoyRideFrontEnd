import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader, StatusBadge, fmtDate, fmtTime } from '../components/ui.jsx';

const REQUEST_TYPES = ['adjustment', 'leave', 'overtime', 'other'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function RequestsPage() {
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    workDate: todayStr(),
    requestedTimeIn: '09:00',
    requestedTimeOut: '18:00',
    requestType: 'adjustment',
    reason: ''
  });

  const load = useCallback(async () => {
    try {
      setMine(await api.myRequests());
    } catch (err) {
      setError(err.message || 'Could not load your requests.');
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.createRequest(form);
      setNotice('Request submitted for approval.');
      setForm((f) => ({ ...f, reason: '' }));
      await load();
    } catch (err) {
      setError(err.message || 'Could not submit your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="My Requests" subtitle="Submit time adjustments, leaves or overtime requests." />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      <section className="card">
        <h2>New request</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <Field label="Work date">
            <input type="date" required value={form.workDate} min="2020-01-01" max={todayStr()} onChange={(e) => setField('workDate', e.target.value)} />
          </Field>
          <Field label="Requested time in">
            <input type="time" required value={form.requestedTimeIn} onChange={(e) => setField('requestedTimeIn', e.target.value)} />
          </Field>
          <Field label="Requested time out">
            <input type="time" required value={form.requestedTimeOut} onChange={(e) => setField('requestedTimeOut', e.target.value)} />
          </Field>
          <Field label="Type">
            <select value={form.requestType} onChange={(e) => setField('requestType', e.target.value)}>
              {REQUEST_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Reason">
            <textarea rows={3} required value={form.reason} onChange={(e) => setField('reason', e.target.value)} placeholder="Why are you requesting this adjustment?" />
          </Field>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>My request history</h2>
        {mine.length === 0 ? (
          <p className="muted">You have not submitted any requests yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Requested</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.workDate)}</td>
                    <td>{fmtTime(r.requestedTimeIn)} → {fmtTime(r.requestedTimeOut)}</td>
                    <td>{r.requestType}</td>
                    <td>{r.reason}</td>
                    <td><StatusBadge value={r.status} /></td>
                    <td>{r.approverNotes || '—'}</td>
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