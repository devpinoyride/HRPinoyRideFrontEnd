import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader, StatusBadge, fmtDate, fmtISO, hoursBetween } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

function lastMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportsPage() {
  const { can } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [filters, setFilters] = useState({ from: lastMonthStr(), to: todayStr(), staffId: '' });
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (can('hr_admin')) {
      api
        .staff()
        .then(setStaffList)
        .catch(() => setStaffList([]));
    }
  }, [can]);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const params = { from: filters.from, to: filters.to, staffId: filters.staffId || undefined };
      setData(await api.reports(params));
    } catch (err) {
      setError(err.message || 'Could not load the report.');
    } finally {
      setBusy(false);
    }
  }, [filters.from, filters.to, filters.staffId]);

  useEffect(() => {
    load();
  }, [load]);

  function setFilter(name, value) {
    setFilters((f) => ({ ...f, [name]: value }));
  }

  async function exportCsv() {
    setError('');
    try {
      await api.downloadReport({ from: filters.from, to: filters.to, staffId: filters.staffId || undefined });
    } catch (err) {
      setError(err.message || 'Could not export the report.');
    }
  }

  const summary = data?.summary;

  return (
    <>
      <PageHeader title="Reports" subtitle="Time entries and timekeeping requests for the selected window." />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="card">
        <form
          className="form-grid form-grid-inline"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <Field label="From">
            <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
          </Field>
          {can('hr_admin') ? (
            <Field label="Staff member">
              <select value={filters.staffId} onChange={(e) => setFilter('staffId', e.target.value)}>
                <option value="">All staff</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </Field>
          ) : null}
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Loading…' : 'Run report'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={exportCsv} disabled={busy || !data}>
              Export CSV
            </button>
          </div>
        </form>
      </section>

      {data ? (
        <>
          <section className="stat-grid">
            <div className="stat-card">
              <span className="stat-value">{summary?.total_entries ?? 0}</span>
              <span className="stat-label">Time entries</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{summary?.total_requests ?? 0}</span>
              <span className="stat-label">Requests</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{Number(summary?.total_hours ?? 0).toFixed(2)}</span>
              <span className="stat-label">Total hours</span>
            </div>
          </section>

          <section className="card">
            <h2>Time entries ({data.entries.length})</h2>
            {data.entries.length === 0 ? (
              <p className="muted">No time entries in this window.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Staff</th>
                      <th>Time in</th>
                      <th>Time out</th>
                      <th>Hours</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Setup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((e) => (
                      <tr key={e.id}>
                        <td>{fmtDate(e.workDate)}</td>
                        <td>{e.fullName || e.email || '—'}</td>
                        <td>{fmtISO(e.timeIn)}</td>
                        <td>{fmtISO(e.timeOut)}</td>
                        <td>{hoursBetween(e.timeIn, e.timeOut) ?? '—'}</td>
                        <td><StatusBadge value={e.source} /></td>
                        <td><StatusBadge value={e.status} /></td>
                        <td>{e.workSetup === 'wfh' ? 'WFH' : e.workSetup ? 'Office' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Requests ({data.requests.length})</h2>
            {data.requests.length === 0 ? (
              <p className="muted">No requests in this window.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Staff</th>
                      <th>Requested</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requests.map((r) => (
                      <tr key={r.id}>
                        <td>{fmtDate(r.workDate)}</td>
                        <td>{r.fullName || r.email || '—'}</td>
                        <td>{r.requestedTimeIn?.slice(0, 5) || '—'} → {r.requestedTimeOut?.slice(0, 5) || '—'}</td>
                        <td>{r.requestType}</td>
                        <td><StatusBadge value={r.status} /></td>
                        <td>{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}