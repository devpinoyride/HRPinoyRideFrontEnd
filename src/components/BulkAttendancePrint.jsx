import { StatusBadge, fmtDate, fmtISO } from './ui.jsx';

function periodLabel(p) {
  if (!p) return '';
  return `${fmtDate(p.start)} to ${fmtDate(p.end)} (cutoff ${p.cutoff})`;
}

/**
 * Print-only container that stacks every staff member's attendance detail,
 * one per page, for a single bulk "print to PDF" document. Visible only when
 * <body> has the `printing-bulk-attendance` class (see index.css).
 */
export default function BulkAttendancePrint({ payslips, period }) {
  if (!payslips || payslips.length === 0) return null;

  return (
    <div className="bulk-print bulk-attendance-print" aria-hidden="true">
      {payslips.map((slip) => (
        <section className="bulk-page" key={slip.staff.id}>
          <div className="payslip-head">
            <img src="/logo-full.png" alt="Pinoy Ride" className="payslip-logo" />
            <div>
              <h2>Attendance detail</h2>
              <p className="muted">
                {slip.staff.fullName} · {periodLabel(slip.period || period)}
              </p>
            </div>
          </div>

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
              {slip.days.map((d) => (
                <tr key={d.date}>
                  <td>{fmtDate(d.date)}</td>
                  <td>{d.weekday}</td>
                  <td><StatusBadge value={d.status} /></td>
                  <td>{fmtISO(d.timeIn)}</td>
                  <td>{fmtISO(d.timeOut)}</td>
                  <td>{d.hours != null ? d.hours + (d.overtimeHours ? ` (+${d.overtimeHours} OT)` : '') : '—'}</td>
                  <td>{d.workSetup ? <span className={'badge ' + (d.workSetup === 'wfh' ? 'badge-wfh' : 'badge-office')}>{d.workSetup === 'wfh' ? 'WFH' : 'Office'}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="muted payslip-foot">
            Attendance detail · Generated {new Date().toLocaleString('en-PH')} · Subject to HR validation.
          </p>
        </section>
      ))}
    </div>
  );
}
