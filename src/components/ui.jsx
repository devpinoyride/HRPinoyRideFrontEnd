// Small shared formatters + badge helpers used across pages.

export function fmtDate(value) {
  if (!value) return '—';
  const s = String(value);
  return s.slice(0, 10);
}

export function fmtTime(value) {
  if (!value) return '—';
  // Backend serializes TimeOnly as e.g. "09:00:00" — show just HH:mm.
  return String(value).slice(0, 5);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function fmtISO(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function hoursBetween(timeIn, timeOut) {
  if (!timeIn || !timeOut) return null;
  const a = new Date(timeIn).getTime();
  const b = new Date(timeOut).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round(((b - a) / 3.6e6) * 100) / 100;
}

export function peso(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(value));
}

export function StatusBadge({ value }) {
  const v = value || '—';
  return <span className={`badge badge-${String(v).toLowerCase()}`}>{v}</span>;
}

export function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}