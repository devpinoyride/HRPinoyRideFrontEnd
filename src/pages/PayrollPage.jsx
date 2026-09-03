import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader, peso, fmtDate } from '../components/ui.jsx';
import PayslipView from '../components/PayslipView.jsx';
import BulkPayslipsPrint from '../components/BulkPayslipsPrint.jsx';
import BulkAttendancePrint from '../components/BulkAttendancePrint.jsx';

const CUTOFFS = [
  { value: 1, label: 'Cutoff 1 · 1st – 15th' },
  { value: 2, label: 'Cutoff 2 · 16th – end of month' }
];

function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function defaultCutoff() {
  return new Date().getDate() >= 16 ? 2 : 1;
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
  const [notice, setNotice] = useState('');
  const [finalized, setFinalized] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

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
      setError(err.message || 'Could not export the payslips CSV.');
    } finally {
      setExporting(false);
    }
  }, [month, cutoff]);

  const exportAttendanceCsv = useCallback(async () => {
    const [y, m] = month.split('-').map(Number);
    setExporting(true);
    setError('');
    try {
      await api.exportAttendance({ year: y, month: m, cutoff });
    } catch (err) {
      setError(err.message || 'Could not export the attendance CSV.');
    } finally {
      setExporting(false);
    }
  }, [month, cutoff]);

  // Fetch every staff member's payslip (used by both bulk PDF exports), render
  // it into the matching hidden print container, then print. `bodyClass`
  // selects which container the print stylesheet reveals.
  const printBulk = useCallback(async (bodyClass, failMessage) => {
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
        document.body.classList.remove(bodyClass);
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      document.body.classList.add(bodyClass);
      window.print();
      setTimeout(cleanup, 1000);
    } catch (err) {
      setError(err.message || failMessage);
    } finally {
      setBulkBusy(false);
    }
  }, [month, cutoff, rows]);

  const exportPayslipsPdf = useCallback(
    () => printBulk('printing-bulk-payslips', 'Could not export the payslips PDF.'),
    [printBulk]
  );
  const exportAttendancePdf = useCallback(
    () => printBulk('printing-bulk-attendance', 'Could not export the attendance PDF.'),
    [printBulk]
  );

  const load = useCallback(async () => {
    const [y, m] = month.split('-').map(Number);
    setBusy(true);
    setError('');
    try {
      const data = await api.payrollSummary({ year: y, month: m, cutoff });
      setRows(data.rows || []);
      setPeriod(data.period || null);
      setFinalized(!!data.finalized);
    } catch (err) {
      setError(err.message || 'Could not load the payroll summary.');
    } finally {
      setBusy(false);
    }
  }, [month, cutoff]);

  useEffect(() => {
    load();
  }, [load]);

  const finalizeCutoff = useCallback(async () => {
    if (!window.confirm(
      'Finalize this cutoff? This locks and saves every staff payslip as paid. ' +
      'It CANNOT be reopened — later changes to salary, incentives, or time will not affect this period.'
    )) return;
    const [y, m] = month.split('-').map(Number);
    setFinalizing(true);
    setError('');
    setNotice('');
    try {
      await api.finalizePayroll({ year: y, month: m, cutoff });
      setNotice('Cutoff finalized. Payslips for this period are now locked.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not finalize the cutoff.');
    } finally {
      setFinalizing(false);
    }
  }, [month, cutoff, load]);

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
        subtitle="Semi-monthly payroll (1–15 and 16–end of month). Net pay = semi-monthly basic − absence deduction + approved overtime."
      />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

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
          <h2>
            Payroll summary ({rows.length})
            {finalized ? <span className="badge badge-active staff-flag">Paid / Finalized</span> : null}
          </h2>
          <div className="section-actions">
            {finalized ? null : (
              <button
                className="btn btn-primary btn-sm"
                type="button"
                onClick={finalizeCutoff}
                disabled={finalizing || busy || rows.length === 0}
                title="Lock this cutoff and save all payslips as paid (cannot be reopened)"
              >
                {finalizing ? 'Finalizing…' : 'Finalize / Mark as paid'}
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={exportPayslipsPdf}
              disabled={bulkBusy || busy || rows.length === 0}
              title="Print all staff payslips as one PDF (one per page)"
            >
              {bulkBusy ? 'Preparing…' : 'Payslips PDF'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={exportPayrollCsv}
              disabled={exporting || busy || rows.length === 0}
              title="Download all staff payroll for this cutoff as CSV"
            >
              Payslips CSV
            </button>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={exportAttendancePdf}
              disabled={bulkBusy || busy || rows.length === 0}
              title="Print all staff attendance detail as one PDF (one per page)"
            >
              {bulkBusy ? 'Preparing…' : 'Attendance PDF'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={exportAttendanceCsv}
              disabled={exporting || busy || rows.length === 0}
              title="Download all staff attendance detail for this cutoff as CSV"
            >
              Attendance CSV
            </button>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted">No staff found.</p>
        ) : (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mode</th>
                  <th className="num">Basic</th>
                  <th className="num">Days</th>
                  <th className="num">Absent</th>
                  <th className="num">Deduction</th>
                  <th className="num">OT pay</th>
                  <th className="num">Net pay</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.staffId} className={r.status === 'inactive' ? 'row-inactive' : ''}>
                    <td>{r.fullName}</td>
                    <td>
                      {r.salaryMode === 'daily' ? (
                        <span className="badge badge-orange">Daily</span>
                      ) : r.fixedSalary ? (
                        <span className="badge badge-orange">Fixed</span>
                      ) : (
                        <span className="badge">Monthly</span>
                      )}
                    </td>
                    <td className="num">{r.basicSalary != null ? peso(r.basicSalary) : '—'}</td>
                    <td className="num">{r.workedDays}/{r.workdays}</td>
                    <td className="num">{r.absentDays}</td>
                    <td className="num">{r.absenceDeduction != null ? peso(r.absenceDeduction) : '—'}</td>
                    <td className="num">{r.overtimePay != null ? peso(r.overtimePay) : '—'}</td>
                    <td className="num"><strong>{r.netPay != null ? peso(r.netPay) : '—'}</strong></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openPayslip(r.staffId)}
                      >
                        View
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
      <BulkAttendancePrint payslips={bulkPayslips} period={period} />
    </>
  );
}