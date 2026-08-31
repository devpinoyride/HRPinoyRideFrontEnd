import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader, StatusBadge, peso, fmtDate, fmtISO } from '../components/ui.jsx';

const CUTOFFS = [
  { value: 1, label: 'Cutoff 1 · 11th – 25th' },
  { value: 2, label: 'Cutoff 2 · 26th – 10th (next month)' }
];

const DAY_STATUS_LABEL = {
  present: 'Present',
  paid_leave: 'Paid leave',
  absent: 'Absent',
  upcoming: 'Upcoming'
};

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
    try {
      setPayslip(await api.payslip({ staffId, year: y, month: m, cutoff }));
    } catch (err) {
      setPayslip(null);
      setSlipError(err.message || 'Could not load the payslip.');
    } finally {
      setSlipBusy(false);
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
            Period: {periodLabel(period)} · Daily rate = basic ÷ 22 · Semi-monthly basic = basic ÷ 2
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
        <p className="muted">Staff without a basic salary show no computation — set it on the Staff page (Edit → Basic salary).</p>
      </section>

      {selectedId ? (
        <section className="card payslip-card">
          <div className="payslip-head">
            <img src="/logo-full.png" alt="Pinoy Ride Transport Corporation" className="payslip-logo" />
            <div>
              <h2>Payslip</h2>
              <p className="muted">
                {payslip ? periodLabel(payslip.period) : ''} · Cutoff period {periodLabel(period)}
              </p>
            </div>
            <button className="btn btn-secondary no-print" type="button" onClick={() => window.print()}>
              Print
            </button>
          </div>

          {slipBusy ? <p className="muted">Loading payslip…</p> : null}
          {slipError ? <div className="alert alert-error">{slipError}</div> : null}

          {payslip ? (
            <>
              <div className="payslip-grid">
                <div><span>Employee</span><strong>{payslip.staff.fullName}</strong></div>
                <div><span>Position</span><strong>{payslip.staff.position || '—'}</strong></div>
                <div><span>Department</span><strong>{payslip.staff.department || '—'}</strong></div>
                <div><span>Role</span><strong>{payslip.staff.role}</strong></div>
                <div><span>Email</span><strong>{payslip.staff.email || '—'}</strong></div>
              </div>

              {payslip.computation ? (
                <table className="table payslip-computation">
                  <tbody>
                    <tr><td>Monthly basic salary</td><td>{peso(payslip.computation.basicSalary)}</td></tr>
                    <tr><td>Semi-monthly basic (÷ 2)</td><td>{peso(payslip.computation.semiMonthlyBasic)}</td></tr>
                    <tr><td>Daily rate (÷ 22)</td><td>{peso(payslip.computation.dailyRate)}</td></tr>
                    <tr><td>Workdays in period</td><td>{payslip.computation.workdays}</td></tr>
                    <tr><td>Days worked</td><td>{payslip.computation.workedDays}</td></tr>
                    <tr><td>Paid leave days</td><td>{payslip.computation.paidLeaveDays}</td></tr>
                    <tr><td>Absent days</td><td>{payslip.computation.absentDays}</td></tr>
                    <tr>
                      <td>Absence deduction ({payslip.computation.absentDays} × {peso(payslip.computation.dailyRate)})</td>
                      <td>− {peso(payslip.computation.absenceDeduction)}</td>
                    </tr>
                    <tr><td>Overtime hours (approved OT, beyond 8h/day)</td><td>{payslip.computation.overtimeHours}</td></tr>
                    <tr>
                      <td>Overtime pay ({payslip.computation.overtimeHours} × hourly {peso(payslip.computation.dailyRate / 8)} × 1.25)</td>
                      <td>+ {peso(payslip.computation.overtimePay)}</td>
                    </tr>
                    <tr className="netpay">
                      <td><strong>NET PAY</strong></td>
                      <td><strong>{peso(payslip.computation.netPay)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="alert alert-error">
                  No basic salary set for this staff member yet — set it on the Staff page (Edit → Basic salary) to compute pay.
                </div>
              )}

              <h3>Attendance detail</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Status</th>
                      <th>Time in</th>
                      <th>Time out</th>
                      <th>Hours</th>
                      <th>Setup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payslip.days.map((d) => (
                      <tr key={d.date}>
                        <td>{fmtDate(d.date)}</td>
                        <td>{d.weekday}</td>
                        <td><StatusBadge value={d.status} /></td>
                        <td>{fmtISO(d.timeIn)}</td>
                        <td>{fmtISO(d.timeOut)}</td>
                        <td>{d.hours != null ? d.hours + (d.overtimeHours ? ` (+${d.overtimeHours} OT)` : '') : '—'}</td>
                        <td><span className={'badge ' + (d.workSetup === 'wfh' ? 'badge-wfh' : 'badge-office')}>{d.workSetup === 'wfh' ? 'WFH' : 'Office'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="muted payslip-foot">
                System-computed from time logs (Mon–Fri workdays, future days excluded, approved OT beyond 8h/day paid at +25%) ·
                Generated {new Date().toLocaleString('en-PH')} · Subject to HR validation.
              </p>
            </>
          ) : null}
        </section>
      ) : null}
    </>
  );
}