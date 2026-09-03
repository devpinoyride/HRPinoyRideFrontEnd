import { useState } from 'react';
import { api } from '../api/client.js';
import { Field } from './ui.jsx';

/**
 * Self-service password change for the signed-in user. Verifies the current
 * password server-side before updating. Collapsed by default to keep the
 * dashboard tidy.
 */
export default function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (form.next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.next !== form.confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(form.current, form.next);
      setNotice('Password changed successfully.');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(err.message || 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="section-head">
        <h2>Change password</h2>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setOpen((v) => !v); setError(''); setNotice(''); }}>
          {open ? 'Hide' : 'Change password'}
        </button>
      </div>

      {open ? (
        <>
          {error ? <div className="alert alert-error">{error}</div> : null}
          {notice ? <div className="alert alert-success">{notice}</div> : null}
          <form className="form-grid" onSubmit={submit}>
            <Field label="Current password">
              <input type="password" autoComplete="current-password" required value={form.current} onChange={(e) => set('current', e.target.value)} />
            </Field>
            <Field label="New password" hint="At least 8 characters">
              <input type="password" autoComplete="new-password" required value={form.next} onChange={(e) => set('next', e.target.value)} />
            </Field>
            <Field label="Confirm new password">
              <input type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
            </Field>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Update password'}
              </button>
            </div>
          </form>
        </>
      ) : (
        <p className="muted">Update the password you use to sign in.</p>
      )}
    </section>
  );
}
