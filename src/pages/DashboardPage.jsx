import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Field, PageHeader, StatusBadge, fmtISO, hoursBetween, fmtDate } from '../components/ui.jsx';
import ChangePasswordCard from '../components/ChangePasswordCard.jsx';

const GRACE_PERIOD_MINUTES = 5;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [setup, setSetup] = useState('office');
  const [confirming, setConfirming] = useState(false);
  const isDev = import.meta.env.DEV;

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

  function askClockOut() {
    setConfirming(true);
  }

  async function confirmClockOut() {
    setConfirming(false);
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

  async function undoClockOut() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.undoClockOut();
      setNotice('Clock-out undone. You are now clocked in again.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not undo clock out.');
    } finally {
      setBusy(false);
    }
  }

  async function resetToday() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.resetToday();
      setNotice('Today\'s entry has been reset. You can now clock in again.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not reset today\'s entry.');
    } finally {
      setBusy(false);
    }
  }

  const today = data?.today || null;
  const week = data?.week || [];

  const status = !today ? 'none' : today.timeOut ? 'done' : 'open';

  const gracePeriodActive = (() => {
    if (status !== 'done' || !today?.timeOut) return false;
    const elapsed = (Date.now() - new Date(today.timeOut).getTime()) / 60000;
    return elapsed >= 0 && elapsed <= GRACE_PERIOD_MINUTES;
  })();

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Time in / time out and your current week." />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      {confirming && (
        <div className="alert alert-warning">
          <strong>Clock out now?</strong> This can't be undone after {GRACE_PERIOD_MINUTES} minutes without submitting a correction request.
          <div className="confirm-actions">
            <button className="btn btn-primary" onClick={confirmClockOut} disabled={busy}>Yes, clock out</button>
            <button className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}

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
          {status === 'done' && !gracePeriodActive && (
            <span className="clock-done-msg">✓ Already clocked out for today</span>
          )}
          {gracePeriodActive && (
            <span className="clock-grace-msg">Within {GRACE_PERIOD_MINUTES}-min grace period</span>
          )}
          <button className="btn btn-primary" onClick={clockIn} disabled={busy || status !== 'none'}>
            Clock In
          </button>
          {status === 'open' && !confirming && (
            <button className="btn btn-secondary" onClick={askClockOut} disabled={busy}>
              Clock Out
            </button>
          )}
          {gracePeriodActive && (
            <button className="btn btn-warning" onClick={undoClockOut} disabled={busy}>
              Undo Clock Out
            </button>
          )}
          {status === 'done' && !gracePeriodActive && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/requests', { state: { prefill: { requestType: 'adjustment', workDate: today?.workDate || '' } } })}
            >
              Request Correction
            </button>
          )}
          {isDev && status === 'done' && (
            <button className="btn btn-danger" onClick={resetToday} disabled={busy}>
              Reset Today
            </button>
          )}
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

      <ChangePasswordCard />
    </>
  );
}