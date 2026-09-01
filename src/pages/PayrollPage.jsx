import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader, peso, fmtDate } from '../components/ui.jsx';
import PayslipView from '../components/PayslipView.jsx';
import BulkPayslipsPrint from '../components/BulkPayslipsPrint.jsx';

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

  const [exporting, setExporting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkPayslips, setBulkPayslips] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [slipBusy, setSlipBusy] = useState(false);
  const [slipError, setSlipError] = useState('');
  const payslipRef = useRef(null);

  const exportPayrollCsv = useCallback(async () => {
    const [y, m] = month.split('-').map(Number);
    setExporting(true);
    setError('');
    try {
      await api.exportPayroll({ year: y, month: m, cutoff });
    } catch (err) {
      setError(err.message || 'Could not export the payroll CSV.');
    } finally {
      setExporting(false);
    }
  }, [month, cutoff]);

  // Bulk payslip PDF: fetch every staff member's full payslip, render them all
  // into the hidden print container, then print (one payslip per page).
  const exportPayslipsPdf = useCallback(async () => {
    const [y, m] = month.split('-').map(Number);
    setBulkBusy(true);
    setError('');
    try {
      const slips = await Promise.all(
        rows.map((r) => api.payslip({ staffId: r.staffId, year: y, month: m, cutoff }))
      );
      setBulkPayslips(slips);
      // Wait for the print container to render before invoking print.
      await new Promise((resolve) => setTimeout(resolve, 100));
      const cleanup = () => {
        document.body.classList.remove('printing-bulk-payslips');
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      document.body.classList.add('printing-bulk-payslips');
      window.print();
      setTimeout(cleanup, 1000);
    } catch (err) {
      setError(err.message || 'Could not export the payslips PDF.');
    } finally {
      setBulkBusy(false);
    }
  }, [month, cutoff, rows]);

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
        <div className="section-head">
          <h2>Payroll summary ({rows.length})</h2>
          <div className="section-actions">
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={exportPayslipsPdf}
              disabled={bulkBusy || busy || rows.length === 0}
              title="Print all staff payslips as one PDF (one per page)"
            >
              {bulkBusy ? 'Preparing…' : 'Export all payslips PDF'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={exportPayrollCsv}
              disabled={exporting || busy || rows.length === 0}
              title="Download all staff payroll for this cutoff as CSV"
            >
              {exporting ? 'Exporting…' : 'Export payslips CSV'}
            </button>
          </div>
        </div>
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

      <BulkPayslipsPrint payslips={bulkPayslips} period={period} />
    </>
  );
}