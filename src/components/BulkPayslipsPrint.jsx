import { peso, fmtDate } from './ui.jsx';

function periodLabel(p) {
  if (!p) return '';
  return `${fmtDate(p.start)} to ${fmtDate(p.end)} (cutoff ${p.cutoff})`;
}

/**
 * Print-only container that stacks every staff member's payslip, one per page,
 * for a single bulk "print to PDF" document. Rendered off-screen on screen
 * media and only made visible when <body> has the `printing-bulk-payslips`
 * class (see index.css). Each payslip is a self-contained block with a
 * page-break so the exported PDF has one payslip per page.
 */
export default function BulkPayslipsPrint({ payslips, period }) {
  if (!payslips || payslips.length === 0) return null;

  return (
    <div className="bulk-print bulk-payslips-print" aria-hidden="true">
      {payslips.map((slip) => {
        const c = slip.computation;
        return (
          <section className="bulk-page" key={slip.staff.id}>
            <div className="payslip-head">
              <img src="/logo-full.png" alt="Pinoy Ride" className="payslip-logo" />
              <div>
                <h2>Payslip</h2>
                <p className="muted">{periodLabel(slip.period || period)}</p>
              </div>
            </div>

            <div className="payslip-grid">
              <div><span>Employee</span><strong>{slip.staff.fullName}</strong></div>
              <div><span>Position</span><strong>{slip.staff.position || '—'}</strong></div>
              <div><span>Department</span><strong>{slip.staff.department || '—'}</strong></div>
              <div><span>Role</span><strong>{slip.staff.role}</strong></div>
              <div><span>Email</span><strong>{slip.staff.email || '—'}</strong></div>
            </div>

            {c ? (
              <table className="table payslip-computation">
                <tbody>
                  <tr><td>Salary mode</td><td>{c.salaryMode === 'daily' ? 'Daily (paid per day worked)' : 'Monthly (semi-monthly)'}</td></tr>
                  <tr><td>Work days</td><td>{c.workDayPattern === 'mon_sat' ? 'Monday – Saturday' : 'Monday – Friday'}</td></tr>
                  <tr><td>Daily rate</td><td>{peso(c.dailyRate)}</td></tr>
                  {c.salaryMode === 'daily' ? (
                    <tr><td>Daily rate × days worked</td><td>{peso(c.semiMonthlyBasic)}</td></tr>
                  ) : (
                    <>
                      <tr><td>Monthly basic salary</td><td>{peso(c.basicSalary)}</td></tr>
                      <tr><td>Semi-monthly basic (÷ 2)</td><td>{peso(c.semiMonthlyBasic)}</td></tr>
                    </>
                  )}
                  <tr><td>Workdays in period</td><td>{c.workdays}</td></tr>
                  <tr><td>Days worked</td><td>{c.workedDays}</td></tr>
                  <tr><td>Paid leave days</td><td>{c.paidLeaveDays}</td></tr>
                  <tr><td>Absent days</td><td>{c.absentDays}</td></tr>
                  <tr><td>Absence deduction</td><td>− {peso(c.absenceDeduction)}</td></tr>
                  <tr><td>Overtime hours</td><td>{c.overtimeHours}</td></tr>
                  <tr><td>Overtime pay</td><td>+ {peso(c.overtimePay)}</td></tr>
                  <tr>
                    <td>Office incentive{c.officeIncentiveEnabled ? '' : ' (disabled)'}</td>
                    <td>+ {peso(c.officeAllowance)}</td>
                  </tr>
                  <tr>
                    <td>Mobile incentive{c.mobileIncentiveEnabled ? '' : ' (disabled)'}</td>
                    <td>+ {peso(c.mobileAllowance)}</td>
                  </tr>
                  <tr className="netpay">
                    <td><strong>NET PAY</strong></td>
                    <td><strong>{peso(c.netPay)}</strong></td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="muted">No salary set for this staff member.</p>
            )}

            <p className="muted payslip-foot">
              System-computed · Generated {new Date().toLocaleString('en-PH')} · Subject to HR validation.
            </p>
          </section>
        );
      })}
    </div>
  );
}
