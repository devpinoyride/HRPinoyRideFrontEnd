import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader } from '../components/ui.jsx';
import PayslipView from '../components/PayslipView.jsx';

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

export default function MyPayslipPage() {
  const [month, setMonth] = useState(monthStr());
  const [cutoff, setCutoff] = useState(defaultCutoff());
  const [payslip, setPayslip] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [y, m] = month.split('-').map(Number);
    setBusy(true);
    setError('');
    try {
      // No staffId → the API returns the current user's own payslip.
      setPayslip(await api.payslip({ year: y, month: m, cutoff }));
    } catch (err) {
      setPayslip(null);
      setError(err.message || 'Could not load your payslip.');
    } finally {
      setBusy(false);
    }
  }, [month, cutoff]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="My Payslip"
        subtitle="Your semi-monthly payslip and attendance detail. Export either as a PDF."
      />

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
              {busy ? 'Loading…' : 'View payslip'}
            </button>
          </div>
        </form>
      </section>

      <PayslipView payslip={payslip} busy={busy} error={error} />
    </>
  );
}
