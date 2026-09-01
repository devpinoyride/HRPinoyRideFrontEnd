// Small shared formatters + badge helpers used across pages.

export function fmtDate(value) {
  if (!value) return '—';
  const s = String(value);
  return s.slice(0, 10);
}

// Formats "HH:mm[:ss]" (24h) into 12-hour with an AM/PM tag, e.g. "9:00 AM".
export function fmtTime(value) {
  if (!value) return '—';
  const [hStr, mStr] = String(value).split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h)) return String(value).slice(0, 5);
  return to12h(h, m);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// 24h hour/minute → "h:mm AM/PM".
function to12h(h, m) {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${period}`;
}

export function fmtISO(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
  // Date + 12-hour time with an AM/PM tag so 05:00 isn't mistaken for 5 PM.
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${to12h(d.getHours(), d.getMinutes())}`;
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