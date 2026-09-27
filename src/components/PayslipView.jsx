import { forwardRef, useState } from 'react';
import { StatusBadge, peso, hasAmount, fmtDate, fmtISO, workDayLabel, workDayShortLabel } from './ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client';

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
const PayslipView = forwardRef(function PayslipView({ payslip, period, busy, error, onChanged }, ref) {
  const [tab, setTab] = useState('payslip');
  // HR-admin-only: cancel all or part of an approved cash advance / deduction.
  const { can } = useAuth();
  const canCancel = can('hr_admin');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelAmount, setCancelAmount] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const c = payslip?.computation || null;
  // Days with a clock-out earlier than clock-in (negative hours) are invalid
  // and need correction — their tardiness is excluded from the deduction.
  const invalidDays = (payslip?.days || []).filter((d) => d.status === 'present' && d.hours != null && d.hours < 0);

  function openCancel(d) {
    setCancelTarget(d);
    // Default to the full remaining amount; HR can lower it for a partial cancel.
    setCancelAmount(String(d.amount ?? ''));
    setCancelNote('');
    setCancelError('');
  }

  function closeCancel() {
    if (cancelBusy) return;
    setCancelTarget(null);
    setCancelAmount('');
    setCancelNote('');
    setCancelError('');
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    const amount = Number(cancelAmount);
    const remaining = Number(cancelTarget.amount ?? 0);

    // Client-side mirror of the server rules; the API re-validates anyway.
    if (!Number.isFinite(amount) || amount <= 0) {
      setCancelError('Enter an amount greater than zero.');
      return;
    }
    if (amount > remaining) {
      setCancelError(`You can cancel at most ${peso(remaining)} of this deduction.`);
      return;
    }

    setCancelBusy(true);
    setCancelError('');
    try {
      await api.cancelDeduction(cancelTarget.id, amount, cancelNote.trim() || undefined);
      setCancelTarget(null);
      setCancelAmount('');
      setCancelNote('');
      // Net pay and the deduction line change server-side; refetch the payslip.
      if (onChanged) await onChanged();
    } catch (err) {
      setCancelError(err.message || 'Could not cancel this deduction.');
    } finally {
      setCancelBusy(false);
    }
  }

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
                    <tr><td>Work days</td><td>{workDayLabel(c.workDayPattern)}</td></tr>
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
                    {hasAmount(c.paidLeaveDays) ? (
                      <tr><td>Paid leave days</td><td>{c.paidLeaveDays}</td></tr>
                    ) : null}
                    {hasAmount(c.absentDays) ? (
                      <tr><td>Absent days</td><td>{c.absentDays}</td></tr>
                    ) : null}
                    {hasAmount(c.absenceDeduction) ? (
                      c.salaryMode === 'daily' ? (
                        <tr><td>Absence deduction</td><td>— (none in daily mode)</td></tr>
                      ) : c.fixedSalary ? (
                        <tr><td>Absence deduction</td><td>— (fixed salary)</td></tr>
                      ) : (
                        <tr><td>Absence deduction ({c.absentDays} × {peso(c.dailyRate)})</td><td>− {peso(c.absenceDeduction)}</td></tr>
                      )
                    ) : null}
                    {hasAmount(c.overtimeHours) ? (
                      <tr><td>Overtime hours (approved OT, beyond 8h/day)</td><td>{c.overtimeHours}</td></tr>
                    ) : null}
                    {hasAmount(c.overtimePay) ? (
                      <tr>
                        <td>Overtime pay ({c.overtimeHours} × hourly {peso(c.dailyRate / 8)} × 1.25)</td>
                        <td>+ {peso(c.overtimePay)}</td>
                      </tr>
                    ) : null}
                    {hasAmount(c.officeAllowance) ? (
                      <tr>
                        <td>
                          Office incentive
                          {c.officeIncentiveEnabled
                            ? ` (${peso(c.officeIncentiveRate)} × ${c.officeIncentiveDays} office day${c.officeIncentiveDays === 1 ? '' : 's'})`
                            : ' (disabled)'}
                        </td>
                        <td>+ {peso(c.officeAllowance)}</td>
                      </tr>
                    ) : null}
                    {hasAmount(c.mobileAllowance) ? (
                      <tr>
                        <td>
                          Mobile incentive
                          {c.mobileIncentiveEnabled
                            ? ` (${peso(c.mobileIncentiveRate)} × ${c.mobileIncentiveWeeks} Sunday${c.mobileIncentiveWeeks === 1 ? '' : 's'} in cutoff)`
                            : ' (disabled)'}
                        </td>
                        <td>+ {peso(c.mobileAllowance)}</td>
                      </tr>
                    ) : null}
                    {hasAmount(c.sundayPay) ? (
                      <tr>
                        <td>Rest day pay ({peso(c.dailyRate)} × {c.sundayDays} approved rest day{c.sundayDays === 1 ? '' : 's'} worked)</td>
                        <td>+ {peso(c.sundayPay)}</td>
                      </tr>
                    ) : null}
                    {/* Reimbursements and cash advances: hide individual ₱0.00 lines,
                        keeping the rest so a mixed list still shows its real entries. */}
                    {(c.reimbursements || []).filter((r) => hasAmount(r.amount)).map((r, i) => (
                      <tr key={`reimb-${i}`}>
                        <td>Reimbursement / incentive · {r.note}</td>
                        <td>+ {peso(r.amount)}</td>
                      </tr>
                    ))}
                    {/* Cash advances: `amount` is the REMAINING figure, so a fully
                        cancelled line is already hidden by hasAmount. The Cancel
                        control is HR-admin only and never prints. */}
                    {(c.deductions || []).filter((d) => hasAmount(d.amount)).map((d, i) => (
                      <tr key={d.id ?? `ded-${i}`}>
                        <td>
                          Cash advance / deduction · {d.note}
                          {d.cancelledAmount ? (
                            <span className="ded-cancelled-note">
                              {' '}({peso(d.cancelledAmount)} cancelled{d.cancelledByName ? ` by ${d.cancelledByName}` : ''})
                            </span>
                          ) : null}
                          {canCancel ? (
                            <button
                              type="button"
                              className="link-btn no-print"
                              onClick={() => openCancel(d)}
                              title={`Cancel part or all of this deduction (${peso(d.amount)} remaining)`}
                            >
                              Cancel
                            </button>
                          ) : null}
                        </td>
                        <td>− {peso(d.amount)}</td>
                      </tr>
                    ))}
                    {hasAmount(c.tardinessDeduction) ? (
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
                    ) : null}
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

              {/* HR-admin-only confirm step: nothing is applied without it. */}
              {cancelTarget ? (
                <div className="modal-backdrop no-print" role="dialog" aria-modal="true" aria-label="Cancel deduction">
                  <div className="modal">
                    <h3>Cancel deduction</h3>
                    <p className="muted">
                      Cash advance / deduction · {cancelTarget.note}
                      <br />
                      Approved {peso(cancelTarget.originalAmount ?? cancelTarget.amount)} · remaining{' '}
                      <strong>{peso(cancelTarget.amount)}</strong>
                    </p>

                    <label className="field">
                      <span className="field-label">Amount to cancel (₱)</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={cancelAmount}
                        onChange={(e) => setCancelAmount(e.target.value)}
                        autoFocus
                      />
                      <span className="field-hint">
                        Full or partial. Enter {peso(cancelTarget.amount)} to cancel the whole remaining amount.
                      </span>
                    </label>

                    <label className="field">
                      <span className="field-label">Reason for cancellation (optional)</span>
                      <textarea
                        rows={2}
                        value={cancelNote}
                        onChange={(e) => setCancelNote(e.target.value)}
                        placeholder="e.g. Deduction applied in error"
                      />
                    </label>

                    {cancelError ? <div className="alert alert-error">{cancelError}</div> : null}

                    <div className="modal-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={closeCancel} disabled={cancelBusy}>
                        Back
                      </button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={confirmCancel} disabled={cancelBusy}>
                        {cancelBusy ? 'Cancelling…' : 'Confirm cancellation'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <p className="muted payslip-foot">
                System-computed from time logs ({workDayShortLabel(c && c.workDayPattern)} workdays, future days excluded, approved OT beyond 8h/day paid at +25%) ·
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
                  {/* Bold the name so it's obvious whose attendance page this is. */}
                  <strong>{payslip.staff.fullName}</strong> · {periodLabel(payslip.period)}
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
                        <td>
                          {d.workSetup
                            ? <span className={'badge ' + (d.workSetup === 'wfh' ? 'badge-wfh' : 'badge-office')}>{d.workSetup === 'wfh' ? 'WFH' : 'Office'}</span>
                            : '—'}
                        </td>
                        <td>
                          {/* Rest day: show whether it was worked (by approved request) or not. */}
                          {d.status === 'rest_day' ? (
                            d.timeIn
                              ? <span className="badge badge-sunday" title="Worked on a rest day">Worked rest day</span>
                              : <span className="badge badge-rest_day">Rest day</span>
                          ) : d.status === 'no_clock_out' ? (
                            <span className="badge badge-absent" title="Clocked in but no clock out — file a correction request.">No clock out</span>
                          ) : d.status === 'present' && d.hours != null && d.hours < 0 ? (
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
