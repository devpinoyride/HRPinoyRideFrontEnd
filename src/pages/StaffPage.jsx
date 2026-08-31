import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Field, PageHeader, StatusBadge } from '../components/ui.jsx';

const ROLES = ['employee', 'approver', 'hr_admin'];

export default function StaffPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: '', role: '', status: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    department: '',
    position: '',
    role: 'employee',
    approverId: ''
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    department: '',
    position: '',
    role: 'employee',
    approverId: ''
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

  async function submitCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.createStaff({
        email: createForm.email,
        password: createForm.password,
        fullName: createForm.fullName,
        department: createForm.department || null,
        position: createForm.position || null,
        role: createForm.role,
        approverId: createForm.approverId ? createForm.approverId : null
      });
      setNotice('Staff member invited. They can now log in with the given credentials.');
      setShowCreate(false);
      setCreateForm({ email: '', password: '', fullName: '', department: '', position: '', role: 'employee', approverId: '' });
      await load();
    } catch (err) {
      setError(err.message || 'Could not create staff member.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditForm({
      department: row.department || '',
      position: row.position || '',
      role: row.role || 'employee',
      approverId: row.approverId || ''
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
        approverId: editForm.approverId || null
      });
      setNotice('Staff member updated.');
      setEditingId(null);
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
          <h2>Edit staff</h2>
          <form className="form-grid" onSubmit={submitEdit}>
            <Field label="Department">
              <input type="text" value={editForm.department} onChange={(e) => setEditField('department', e.target.value)} />
            </Field>
            <Field label="Position">
              <input type="text" value={editForm.position} onChange={(e) => setEditField('position', e.target.value)} />
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
              <button className="btn btn-ghost" type="button" onClick={() => setEditingId(null)}>Cancel</button>
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