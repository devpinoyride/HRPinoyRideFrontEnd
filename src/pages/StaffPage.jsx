import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader, StatusBadge, peso } from '../components/ui.jsx';

const ROLES = ['employee', 'approver', 'hr_admin'];

export default function StaffPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: '', role: '', status: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Credentials of the most recently invited staff, shown with copy buttons
  // so HR can hand them off manually (no email is sent).
  const [invited, setInvited] = useState(null);
  const [copied, setCopied] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    department: '',
    position: '',
    role: 'employee',
    approverId: '',
    basicSalary: '',
    salaryMode: 'basic',
    dailyRate: '',
    officeIncentiveEnabled: true,
    officeIncentiveAmount: '100',
    mobileIncentiveEnabled: true,
    mobileIncentiveAmount: '100',
    workDays: 'mon_fri'
  });

  const [editingId, setEditingId] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({
    department: '',
    position: '',
    role: 'employee',
    approverId: '',
    basicSalary: '',
    salaryMode: 'basic',
    dailyRate: '',
    officeIncentiveEnabled: true,
    officeIncentiveAmount: '100',
    mobileIncentiveEnabled: true,
    mobileIncentiveAmount: '100',
    workDays: 'mon_fri'
  });

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setRows(await api.staff({ q: filters.q, role: filters.role, status: filters.status }));
    } catch (err) {
      setError(err.message || 'Could not load staff.');
    } finally {
      setBusy(false);
    }
  }, [filters.q, filters.role, filters.status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setFilter(name, value) {
    setFilters((f) => ({ ...f, [name]: value }));
  }

  function setCreateField(name, value) {
    setCreateForm((f) => ({ ...f, [name]: value }));
  }

  function setEditField(name, value) {
    setEditForm((f) => ({ ...f, [name]: value }));
  }

  async function copyText(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? '' : c)), 2000);
    } catch {
      setError('Could not copy to clipboard. Please copy manually.');
    }
  }

  async function submitCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setInvited(null);
    // Capture before the form is cleared so we can display the credentials.
    const invitedEmail = createForm.email.trim();
    const invitedPassword = createForm.password;
    const invitedName = createForm.fullName.trim();
    try {
      await api.createStaff({
        email: createForm.email,
        password: createForm.password,
        fullName: createForm.fullName,
        department: createForm.department || null,
        position: createForm.position || null,
        role: createForm.role,
        approverId: createForm.approverId ? createForm.approverId : null,
        basicSalary: createForm.basicSalary === '' ? null : Number(createForm.basicSalary),
        salaryMode: createForm.salaryMode || 'basic',
        dailyRate: createForm.dailyRate === '' ? null : Number(createForm.dailyRate),
        officeIncentiveEnabled: createForm.officeIncentiveEnabled,
        officeIncentiveAmount: createForm.officeIncentiveAmount === '' ? 0 : Number(createForm.officeIncentiveAmount),
        mobileIncentiveEnabled: createForm.mobileIncentiveEnabled,
        mobileIncentiveAmount: createForm.mobileIncentiveAmount === '' ? 0 : Number(createForm.mobileIncentiveAmount),
        workDays: createForm.workDays
      });
      setInvited({ name: invitedName, email: invitedEmail, password: invitedPassword });
      setCopied('');
      setShowCreate(false);
      setCreateForm({ email: '', password: '', fullName: '', department: '', position: '', role: 'employee', approverId: '', basicSalary: '', salaryMode: 'basic', dailyRate: '', officeIncentiveEnabled: true, officeIncentiveAmount: '100', mobileIncentiveEnabled: true, mobileIncentiveAmount: '100', workDays: 'mon_fri' });
      await load();
    } catch (err) {
      setError(err.message || 'Could not create staff member.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditingStaff(row);
    setEditForm({
      department: row.department || '',
      position: row.position || '',
      role: row.role || 'employee',
      approverId: row.approverId || '',
      basicSalary: row.basicSalary ?? '',
      salaryMode: row.salaryMode || 'basic',
      dailyRate: row.dailyRate ?? '',
      officeIncentiveEnabled: row.officeIncentiveEnabled ?? true,
      officeIncentiveAmount: row.officeIncentiveAmount ?? '100',
      mobileIncentiveEnabled: row.mobileIncentiveEnabled ?? true,
      mobileIncentiveAmount: row.mobileIncentiveAmount ?? '100',
      workDays: row.workDays || 'mon_fri'
    });
    setError('');
  }

  async function submitEdit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.updateStaff(editingId, {
        department: editForm.department || null,
        position: editForm.position || null,
        role: editForm.role,
        approverId: editForm.approverId || null,
        basicSalary: editForm.basicSalary === '' ? null : Number(editForm.basicSalary),
        salaryMode: editForm.salaryMode || 'basic',
        dailyRate: editForm.dailyRate === '' ? null : Number(editForm.dailyRate),
        officeIncentiveEnabled: editForm.officeIncentiveEnabled,
        officeIncentiveAmount: editForm.officeIncentiveAmount === '' ? 0 : Number(editForm.officeIncentiveAmount),
        mobileIncentiveEnabled: editForm.mobileIncentiveEnabled,
        mobileIncentiveAmount: editForm.mobileIncentiveAmount === '' ? 0 : Number(editForm.mobileIncentiveAmount),
        workDays: editForm.workDays
      });
      setNotice('Staff member updated.');
      setEditingId(null);
      setEditingStaff(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not update staff member.');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(row) {
    if (!window.confirm(`Deactivate ${row.fullName}? They will no longer be able to log in.`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.deactivateStaff(row.id);
      setNotice(`${row.fullName} has been deactivated.`);
      await load();
    } catch (err) {
      setError(err.message || 'Could not deactivate staff member.');
    } finally {
      setBusy(false);
    }
  }
return (
    <>
      <PageHeader title="Staff" subtitle="Manage profiles, roles and reporting lines." />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {notice ? <div className="alert alert-success">{notice}</div> : null}

      {invited ? (
        <section className="card invite-card">
          <div className="invite-head">
            <h2>✓ {invited.name} invited</h2>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setInvited(null)}>Dismiss</button>
          </div>
          <p className="muted">
            No email is sent automatically. Copy these credentials and share them with the new staff member.
            They can log in and should change the password afterwards.
          </p>
          <div className="cred-row">
            <span className="cred-label">Email</span>
            <code className="cred-value">{invited.email}</code>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => copyText(invited.email, 'email')}>
              {copied === 'email' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="cred-row">
            <span className="cred-label">Temp password</span>
            <code className="cred-value">{invited.password}</code>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => copyText(invited.password, 'password')}>
              {copied === 'password' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="invite-actions">
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={() => copyText(`Email: ${invited.email}\nTemporary password: ${invited.password}`, 'both')}
            >
              {copied === 'both' ? 'Copied both!' : 'Copy both'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <form
          className="form-grid form-grid-inline"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <Field label="Search">
            <input type="text" placeholder="Name, email, department…" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} />
          </Field>
          <Field label="Role">
            <select value={filters.role} onChange={(e) => setFilter('role', e.target.value)}>
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </Field>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Searching…' : 'Search'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? 'Hide invite form' : 'Invite staff'}
            </button>
          </div>
        </form>
      </section>
{showCreate ? (
        <section className="card">
          <h2>Invite new staff</h2>
          <form className="form-grid" onSubmit={submitCreate}>
            <Field label="Email">
              <input type="email" required value={createForm.email} onChange={(e) => setCreateField('email', e.target.value)} />
            </Field>
            <Field label="Temporary password" hint="At least 8 characters">
              <input type="text" required value={createForm.password} onChange={(e) => setCreateField('password', e.target.value)} />
            </Field>
            <Field label="Full name">
              <input type="text" required value={createForm.fullName} onChange={(e) => setCreateField('fullName', e.target.value)} />
            </Field>
            <Field label="Department">
              <input type="text" value={createForm.department} onChange={(e) => setCreateField('department', e.target.value)} />
            </Field>
            <Field label="Position">
              <input type="text" value={createForm.position} onChange={(e) => setCreateField('position', e.target.value)} />
            </Field>
            <Field label="Salary mode" hint="Basic = monthly salary, Daily = paid per day worked">
              <select value={createForm.salaryMode} onChange={(e) => setCreateField('salaryMode', e.target.value)}>
                <option value="basic">Basic (monthly)</option>
                <option value="daily">Daily (per day worked)</option>
              </select>
            </Field>
            <Field label="Work days" hint="Which weekdays count as workdays for payroll">
              <select value={createForm.workDays} onChange={(e) => setCreateField('workDays', e.target.value)}>
                <option value="mon_fri">Monday – Friday</option>
                <option value="mon_sat">Monday – Saturday</option>
              </select>
            </Field>
            <Field
              label="Basic salary (₱ / month)"
              hint={createForm.salaryMode === 'basic' ? 'Used for payslip computation' : 'Not used in Daily mode'}
            >
              <input type="number" min="0" step="0.01" value={createForm.basicSalary} disabled={createForm.salaryMode !== 'basic'} onChange={(e) => setCreateField('basicSalary', e.target.value)} />
            </Field>
            <Field
              label="Daily rate (₱ / day)"
              hint={createForm.salaryMode === 'daily' ? 'Paid only for days the staff actually works' : 'Not used in Basic mode'}
            >
              <input type="number" min="0" step="0.01" value={createForm.dailyRate} disabled={createForm.salaryMode !== 'daily'} onChange={(e) => setCreateField('dailyRate', e.target.value)} />
            </Field>
            <Field label="Office incentive" hint="Per office workday the staff is present">
              <div className="incentive-control">
                <label className="incentive-toggle">
                  <input type="checkbox" checked={createForm.officeIncentiveEnabled} onChange={(e) => setCreateField('officeIncentiveEnabled', e.target.checked)} />
                  <span>Enabled</span>
                </label>
                <input type="number" min="0" step="0.01" value={createForm.officeIncentiveAmount} disabled={!createForm.officeIncentiveEnabled} onChange={(e) => setCreateField('officeIncentiveAmount', e.target.value)} placeholder="₱ / office day" />
              </div>
            </Field>
            <Field label="Mobile incentive" hint="Per week (with a workday) in the cutoff">
              <div className="incentive-control">
                <label className="incentive-toggle">
                  <input type="checkbox" checked={createForm.mobileIncentiveEnabled} onChange={(e) => setCreateField('mobileIncentiveEnabled', e.target.checked)} />
                  <span>Enabled</span>
                </label>
                <input type="number" min="0" step="0.01" value={createForm.mobileIncentiveAmount} disabled={!createForm.mobileIncentiveEnabled} onChange={(e) => setCreateField('mobileIncentiveAmount', e.target.value)} placeholder="₱ / week" />
              </div>
            </Field>
            <Field label="Role">
              <select value={createForm.role} onChange={(e) => setCreateField('role', e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Reports to (approver)">
              <select value={createForm.approverId} onChange={(e) => setCreateField('approverId', e.target.value)}>
                <option value="">— none —</option>
                {rows
                  .filter((r) => r.status !== 'inactive' && (r.role === 'approver' || r.role === 'hr_admin'))
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.fullName} ({r.role})</option>
                  ))}
              </select>
            </Field>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Inviting…' : 'Invite'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
{editingId ? (
        <section className="card">
          <div className="edit-staff-head">
            <h2>Edit staff</h2>
            {editingStaff ? (
              <p className="edit-staff-sub muted">
                Editing <strong>{editingStaff.fullName}</strong>
                {editingStaff.email ? ` · ${editingStaff.email}` : ''}
                {editingStaff.position ? ` · ${editingStaff.position}` : ''}
              </p>
            ) : null}
          </div>
          <form className="form-grid" onSubmit={submitEdit}>
            <Field label="Department">
              <input type="text" value={editForm.department} onChange={(e) => setEditField('department', e.target.value)} />
            </Field>
            <Field label="Position">
              <input type="text" value={editForm.position} onChange={(e) => setEditField('position', e.target.value)} />
            </Field>
            <Field label="Salary mode" hint="Basic = monthly salary, Daily = paid per day worked">
              <select value={editForm.salaryMode} onChange={(e) => setEditField('salaryMode', e.target.value)}>
                <option value="basic">Basic (monthly)</option>
                <option value="daily">Daily (per day worked)</option>
              </select>
            </Field>
            <Field label="Work days" hint="Which weekdays count as workdays for payroll">
              <select value={editForm.workDays} onChange={(e) => setEditField('workDays', e.target.value)}>
                <option value="mon_fri">Monday – Friday</option>
                <option value="mon_sat">Monday – Saturday</option>
              </select>
            </Field>
            <Field
              label="Basic salary (₱ / month)"
              hint={editForm.salaryMode === 'basic' ? 'Used for payslip computation' : 'Not used in Daily mode'}
            >
              <input type="number" min="0" step="0.01" value={editForm.basicSalary} disabled={editForm.salaryMode !== 'basic'} onChange={(e) => setEditField('basicSalary', e.target.value)} />
            </Field>
            <Field
              label="Daily rate (₱ / day)"
              hint={editForm.salaryMode === 'daily' ? 'Paid only for days the staff actually works' : 'Not used in Basic mode'}
            >
              <input type="number" min="0" step="0.01" value={editForm.dailyRate} disabled={editForm.salaryMode !== 'daily'} onChange={(e) => setEditField('dailyRate', e.target.value)} />
            </Field>
            <Field label="Office incentive" hint="Per office workday the staff is present">
              <div className="incentive-control">
                <label className="incentive-toggle">
                  <input type="checkbox" checked={editForm.officeIncentiveEnabled} onChange={(e) => setEditField('officeIncentiveEnabled', e.target.checked)} />
                  <span>Enabled</span>
                </label>
                <input type="number" min="0" step="0.01" value={editForm.officeIncentiveAmount} disabled={!editForm.officeIncentiveEnabled} onChange={(e) => setEditField('officeIncentiveAmount', e.target.value)} placeholder="₱ / office day" />
              </div>
            </Field>
            <Field label="Mobile incentive" hint="Per week (with a workday) in the cutoff">
              <div className="incentive-control">
                <label className="incentive-toggle">
                  <input type="checkbox" checked={editForm.mobileIncentiveEnabled} onChange={(e) => setEditField('mobileIncentiveEnabled', e.target.checked)} />
                  <span>Enabled</span>
                </label>
                <input type="number" min="0" step="0.01" value={editForm.mobileIncentiveAmount} disabled={!editForm.mobileIncentiveEnabled} onChange={(e) => setEditField('mobileIncentiveAmount', e.target.value)} placeholder="₱ / week" />
              </div>
            </Field>
            <Field label="Role">
              <select value={editForm.role} onChange={(e) => setEditField('role', e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Reports to (approver)">
              <select value={editForm.approverId} onChange={(e) => setEditField('approverId', e.target.value)}>
                <option value="">— none —</option>
                {rows
                  .filter((r) => r.status !== 'inactive' && (r.role === 'approver' || r.role === 'hr_admin') && r.id !== editingId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.fullName} ({r.role})</option>
                  ))}
              </select>
            </Field>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={busy}>Save</button>
              <button className="btn btn-ghost" type="button" onClick={() => { setEditingId(null); setEditingStaff(null); }}>Cancel</button>
            </div>
          </form>
        </section>
      ) : null}
<section className="card">
        <h2>Staff list ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="muted">No staff match the current filters.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Basic salary</th>
                  <th>Role</th>
                  <th>Approver</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={row.status === 'inactive' ? 'row-inactive' : ''}>
                    <td>{row.fullName}</td>
                    <td>{row.email || '—'}</td>
                    <td>{row.department || '—'}</td>
                    <td>{row.position || '—'}</td>
                    <td>{row.basicSalary != null ? peso(row.basicSalary) : '—'}</td>
                    <td>{row.role}</td>
                    <td>{row.approverName || '—'}</td>
                    <td><StatusBadge value={row.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(row)}>Edit</button>
                        <button className="btn btn-danger btn-sm" disabled={row.status === 'inactive'} onClick={() => deactivate(row)}>
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}