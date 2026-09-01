import { forwardRef, useState } from 'react';
import { StatusBadge, peso, fmtDate, fmtISO } from './ui.jsx';

function periodLabel(p) {
  if (!p) return '';
  return `${fmtDate(p.start)} to ${fmtDate(p.end)} (cutoff ${p.cutoff})`;
}

// Toggles a body class so the print stylesheet can isolate a single section
// (payslip-only or attendance-only) for a clean one-document PDF, then prints.
function printSection(sectionClass) {
  const body = document.body;
  body.classList.add(sectionClass);
  const cleanup = () => {
    body.classList.remove(sectionClass);
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Safety net for browsers that don't fire afterprint reliably.
  setTimeout(cleanup, 1000);
}

/**
 * Shared payslip renderer used by both the HR Payroll page and the employee
 * "My Payslip" page. Organizes the payslip and attendance detail into tabs,
 * each with its own clean PDF export (print-to-PDF).
 */
const PayslipView = forwardRef(function PayslipView({ payslip, period, busy, error }, ref) {
  const [tab, setTab] = useState('payslip');
  const c = payslip?.computation || null;
  // Days with a clock-out earlier than clock-in (negative hours) are invalid
  // and need correction — their tardiness is excluded from the deduction.
  const invalidDays = (payslip?.days || []).filter((d) => d.status === 'present' && d.hours != null && d.hours < 0);

  return (
    <section className="card payslip-card" ref={ref}>
      <div className="payslip-head">
        <img src="/logo-full.png" alt="Pinoy Ride Transport Corporation" className="payslip-logo" />
        <div>
          <h2>Payslip</h2>
          <p className="muted">
            {payslip ? periodLabel(payslip.period) : (period ? periodLabel(period) : '')}
          </p>
        </div>
      </div>

      <div className="payslip-tabs no-print" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'payslip'}
          className={'payslip-tab' + (tab === 'payslip' ? ' active' : '')}
          onClick={() => setTab('payslip')}
        >
          Payslip
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'attendance'}
          className={'payslip-tab' + (tab === 'attendance' ? ' active' : '')}
          onClick={() => setTab('attendance')}
        >
          Attendance detail
        </button>
      </div>

      {busy ? <p className="muted">Loading payslip…</p> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}

      {payslip ? (
        <>
          {/* ---- Payslip tab ---- */}
          {tab === 'payslip' ? (
            <div className="payslip-section payslip-pane">
              <div className="payslip-export-bar no-print">
                <button className="btn btn-primary btn-sm" type="button" onClick={() => printSection('printing-payslip')}>
                  Export payslip PDF
                </button>
              </div>

              {invalidDays.length > 0 ? (
                <div className="alert alert-warning">
                  <strong>{invalidDays.length} invalid time {invalidDays.length === 1 ? 'entry' : 'entries'} detected.</strong>{' '}
                  {invalidDays.map((d) => fmtDate(d.date)).join(', ')} — the clock-out is earlier than the clock-in
                  (check for an AM/PM mistake). These days are excluded from tardiness and hours until corrected.
                </div>
              ) : null}

              <div className="payslip-grid">
                <div><span>Employee</span><strong>{payslip.staff.fullName}</strong></div>
                <div><span>Position</span><strong>{payslip.staff.position || '—'}</strong></div>
                <div><span>Department</span><strong>{payslip.staff.department || '—'}</strong></div>
                <div><span>Role</span><strong>{payslip.staff.role}</strong></div>
                <div><span>Email</span><strong>{payslip.staff.email || '—'}</strong></div>
              </div>

              {c ? (
                <table className="table payslip-computation">
                  <tbody>
                    <tr><td>Salary mode</td><td>{c.salaryMode === 'daily' ? 'Daily (paid per day worked)' : (c.fixedSalary ? 'Monthly · Fixed salary (no deductions)' : 'Monthly (semi-monthly)')}</td></tr>
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
                    {c.salaryMode === 'daily' ? (
                      <tr><td>Absence deduction</td><td>— (none in daily mode)</td></tr>
                    ) : c.fixedSalary ? (
                      <tr><td>Absence deduction</td><td>— (fixed salary)</td></tr>
                    ) : (
                      <tr><td>Absence deduction ({c.absentDays} × {peso(c.dailyRate)})</td><td>− {peso(c.absenceDeduction)}</td></tr>
                    )}
                    <tr><td>Overtime hours (approved OT, beyond 8h/day)</td><td>{c.overtimeHours}</td></tr>
                    <tr>
                      <td>Overtime pay ({c.overtimeHours} × hourly {peso(c.dailyRate / 8)} × 1.25)</td>
                      <td>+ {peso(c.overtimePay)}</td>
                    </tr>
                    <tr>
                      <td>
                        Office incentive
                        {c.officeIncentiveEnabled
                          ? ` (${peso(c.officeIncentiveRate)} × ${c.officeIncentiveDays} office day${c.officeIncentiveDays === 1 ? '' : 's'})`
                          : ' (disabled)'}
                      </td>
                      <td>+ {peso(c.officeAllowance)}</td>
                    </tr>
                    <tr>
                      <td>
                        Mobile incentive
                        {c.mobileIncentiveEnabled
                          ? ` (${peso(c.mobileIncentiveRate)} × ${c.mobileIncentiveWeeks} week${c.mobileIncentiveWeeks === 1 ? '' : 's'} worked)`
                          : ' (disabled)'}
                      </td>
                      <td>+ {peso(c.mobileAllowance)}</td>
                    </tr>
                    <tr>
                      <td>Sunday pay ({peso(c.dailyRate)} × {c.sundayDays} approved Sunday{c.sundayDays === 1 ? '' : 's'})</td>
                      <td>+ {peso(c.sundayPay)}</td>
                    </tr>
                    <tr>
                      <td>
                        Tardiness / undertime
                        {(c.lateMinutes || c.earlyOutMinutes)
                          ? ` (${c.lateMinutes} min late + ${c.earlyOutMinutes} min undertime × ${peso(c.minuteRate)}/min)`
                          : ' (none)'}
                        {invalidDays.length > 0
                          ? ` — excludes ${invalidDays.length} invalid entr${invalidDays.length === 1 ? 'y' : 'ies'} pending correction`
                          : ''}
                      </td>
                      <td>− {peso(c.tardinessDeduction)}</td>
                    </tr>
                    <tr className="netpay">
                      <td><strong>NET PAY</strong></td>
                      <td><strong>{peso(c.netPay)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="alert alert-error">
                  No salary set for this staff member yet — set it on the Staff page (Edit → Basic salary, or Daily rate + Salary mode = Daily) to compute pay.
                </div>
              )}

              <p className="muted payslip-foot">
                System-computed from time logs ({c && c.workDayPattern === 'mon_sat' ? 'Mon–Sat' : 'Mon–Fri'} workdays, future days excluded, approved OT beyond 8h/day paid at +25%) ·
                Generated {new Date().toLocaleString('en-PH')} · Subject to HR validation.
              </p>
            </div>
          ) : null}

          {/* ---- Attendance detail tab ---- */}
          {tab === 'attendance' ? (
            <div className="payslip-section attendance-section">
              <div className="payslip-export-bar no-print">
                <button className="btn btn-primary btn-sm" type="button" onClick={() => printSection('printing-attendance')}>
                  Export attendance PDF
                </button>
              </div>

              <div className="attendance-head">
                <h3>Attendance detail</h3>
                <p className="muted">
                  {payslip.staff.fullName} · {periodLabel(payslip.period)}
                </p>
              </div>

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
                      <th>Flags</th>
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
                        <td className={d.hours != null && d.hours < 0 ? 'cell-invalid' : ''}>
                          {d.hours != null ? d.hours + (d.overtimeHours ? ` (+${d.overtimeHours} OT)` : '') : '—'}
                        </td>
                        <td><span className={'badge ' + (d.workSetup === 'wfh' ? 'badge-wfh' : 'badge-office')}>{d.workSetup === 'wfh' ? 'WFH' : 'Office'}</span></td>
                        <td>
                          {/* Invalid entry: clock-out is not after clock-in (e.g. AM/PM
                              mistake) → negative hours. Flag it instead of "On time". */}
                          {d.status === 'present' && d.hours != null && d.hours < 0 ? (
                            <span className="badge badge-absent" title="Time out is earlier than time in — please correct this entry.">Invalid time</span>
                          ) : (
                            <>
                              {d.lateMinutes ? <span className="badge badge-absent" title={`${d.lateMinutes} min late`}>Late {d.lateMinutes}m</span> : null}
                              {d.earlyOutMinutes ? <span className="badge badge-absent" title={`${d.earlyOutMinutes} min undertime`}>Early {d.earlyOutMinutes}m</span> : null}
                              {(!d.lateMinutes && !d.earlyOutMinutes && d.status === 'present') ? <span className="badge badge-present">On time</span> : null}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="muted payslip-foot">
                Attendance detail · Generated {new Date().toLocaleString('en-PH')} · Subject to HR validation.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
});

export default PayslipView;
