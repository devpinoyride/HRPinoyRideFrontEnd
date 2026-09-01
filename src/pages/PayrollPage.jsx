import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader, peso, fmtDate } from '../components/ui.jsx';
import PayslipView from '../components/PayslipView.jsx';

const CUTOFFS = [
  { value: 1, label: 'Cutoff 1 · 11th – 25th' },
  { value: 2, label: 'Cutoff 2 · 26th – 10th (next month)' }
];

function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function defaultCutoff() {
  return new Date().getDate() >= 26 ? 2 : 1;
}

function periodLabel(p) {
  if (!p) return '';
  return `${fmtDate(p.start)} to ${fmtDate(p.end)} (cutoff ${p.cutoff})`;
}

export default function PayrollPage() {
  const [month, setMonth] = useState(monthStr());
  const [cutoff, setCutoff] = useState(defaultCutoff());
  const [period, setPeriod] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [slipBusy, setSlipBusy] = useState(false);
  const [slipError, setSlipError] = useState('');
  const payslipRef = useRef(null);

  const load = useCallback(async () => {
    const [y, m] = month.split('-').map(Number);
    setBusy(true);
    setError('');
    try {
      const data = await api.payrollSummary({ year: y, month: m, cutoff });
      setRows(data.rows || []);
      setPeriod(data.period || null);
    } catch (err) {
      setError(err.message || 'Could not load the payroll summary.');
    } finally {
      setBusy(false);
    }
  }, [month, cutoff]);

  useEffect(() => {
    load();
  }, [load]);

  const openPayslip = useCallback(async (staffId) => {
    const [y, m] = month.split('-').map(Number);
    setSelectedId(staffId);
    setSlipBusy(true);
    setSlipError('');
    // Scroll the payslip card into view as soon as it mounts.
    requestAnimationFrame(() => {
      payslipRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    try {
      setPayslip(await api.payslip({ staffId, year: y, month: m, cutoff }));
    } catch (err) {
      setPayslip(null);
      setSlipError(err.message || 'Could not load the payslip.');
    } finally {
      setSlipBusy(false);
      // Re-scroll after content renders, in case layout shifted while loading.
      requestAnimationFrame(() => {
        payslipRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [month, cutoff]);

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle="Semi-monthly payroll (11–25 and 26–10). Net pay = semi-monthly basic − absence deduction + approved overtime."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="card no-print">
        <form
          className="form-grid form-grid-inline"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <Field label="Payroll month">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <Field label="Cutoff">
            <select value={cutoff} onChange={(e) => setCutoff(Number(e.target.value))}>
              {CUTOFFS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Computing…' : 'Run payroll'}
            </button>
          </div>
        </form>
        {period ? (
          <p className="muted">
            Period: {periodLabel(period)} · Monthly: daily rate = basic ÷ 22 · semi-monthly = basic ÷ 2 · Daily mode: paid per day worked at the daily rate (no absence deduction)
          </p>
        ) : null}
      </section>

      <section className="card no-print">
        <h2>Payroll summary ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="muted">No staff found.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Salary mode</th>
                  <th>Basic salary</th>
                  <th>Daily rate</th>
                  <th>Workdays</th>
                  <th>Worked</th>
                  <th>Absent</th>
                  <th>OT hrs</th>
                  <th>Deduction</th>
                  <th>OT pay</th>
                  <th>Net pay</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.staffId} className={r.status === 'inactive' ? 'row-inactive' : ''}>
                    <td>{r.fullName}</td>
                    <td>{r.role}</td>
                    <td>
                      {r.salaryMode === 'daily' ? (
                        <span className="badge badge-orange">Daily</span>
                      ) : (
                        <span className="badge">Monthly</span>
                      )}
                    </td>
                    <td>{r.basicSalary != null ? peso(r.basicSalary) : '—'}</td>
                    <td>{r.dailyRate != null ? peso(r.dailyRate) : '—'}</td>
                    <td>{r.workdays}</td>
                    <td>{r.workedDays}</td>
                    <td>{r.absentDays}</td>
                    <td>{r.overtimeHours || 0}</td>
                    <td>{r.absenceDeduction != null ? peso(r.absenceDeduction) : '—'}</td>
                    <td>{r.overtimePay != null ? peso(r.overtimePay) : '—'}</td>
                    <td><strong>{r.netPay != null ? peso(r.netPay) : '—'}</strong></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openPayslip(r.staffId)}
                      >
                        View payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">Staff without a salary set show no computation — set it on the Staff page (Edit → Basic salary or Daily rate + Salary mode).</p>
      </section>

      {selectedId ? (
        <PayslipView
          ref={payslipRef}
          payslip={payslip}
          period={period}
          busy={slipBusy}
          error={slipError}
        />
      ) : null}
    </>
  );
}