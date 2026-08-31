import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader, StatusBadge, fmtISO, hoursBetween, fmtDate } from '../components/ui.jsx';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [setup, setSetup] = useState('office');

  const load = useCallback(async () => {
    try {
      const d = await api.clockToday();
      setData(d);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your time entries.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function clockIn() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.clockIn(setup);
      setNotice('You have clocked in. Have a great day!');
      await load();
    } catch (err) {
      setError(err.message || 'Could not clock in.');
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.clockOut();
      setNotice('You have clocked out. See you tomorrow!');
      await load();
    } catch (err) {
      setError(err.message || 'Could not clock out.');
    } finally {
      setBusy(false);
    }
  }

  const today = data?.today || null;
  const week = data?.week || [];

  const status = !today ? 'none' : today.timeOut ? 'done' : 'open';

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Time in / time out and your current week." />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      <section className="clock-card">
        <div className="clock-info">
          <span className="clock-date">{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          {status === 'none' && <p>You have not clocked in today yet.</p>}
          {status === 'open' && (
            <p>
              Clocked in at <strong>{fmtISO(today.timeIn)}</strong> — {hoursBetween(today.timeIn, today.timeOut) ?? '—'} hrs so far · {today.workSetup === 'wfh' ? 'WFH' : 'Office'}.
            </p>
          )}
          {status === 'done' && (
            <p>
              {fmtISO(today.timeIn)} → {fmtISO(today.timeOut)} · <strong>{hoursBetween(today.timeIn, today.timeOut)} hrs</strong> · {today.workSetup === 'wfh' ? 'WFH' : 'Office'}
            </p>
          )}
        </div>

        <div className="clock-actions">
          {status === 'none' ? (
            <div className="setup-toggle" role="group" aria-label="Work setup for today">
              <button type="button" className={setup === 'office' ? 'active' : ''} onClick={() => setSetup('office')}>
                Office
              </button>
              <button type="button" className={setup === 'wfh' ? 'active' : ''} onClick={() => setSetup('wfh')}>
                WFH
              </button>
            </div>
          ) : null}
          <button className="btn btn-primary" onClick={clockIn} disabled={busy || status !== 'none'}>
            Clock In
          </button>
          <button className="btn btn-secondary" onClick={clockOut} disabled={busy || status !== 'open'}>
            Clock Out
          </button>
        </div>
      </section>

      <section className="card">
        <h2>This week</h2>
        {week.length === 0 ? (
          <p className="muted">No entries yet this week.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time in</th>
                  <th>Time out</th>
                  <th>Hours</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Setup</th>
                </tr>
              </thead>
              <tbody>
                {week.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.workDate)}</td>
                    <td>{fmtISO(e.timeIn)}</td>
                    <td>{fmtISO(e.timeOut)}</td>
                    <td>{hoursBetween(e.timeIn, e.timeOut) ?? '—'}</td>
                    <td><StatusBadge value={e.source} /></td>
                    <td><StatusBadge value={e.status} /></td>
                    <td>{e.workSetup === 'wfh' ? 'WFH' : 'Office'}</td>
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