import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/sensor';
import { UserPlus, Trash2, Shield, AlertTriangle, CheckCircle, KeyRound, Power, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const roleLabels: Record<UserRole, string> = { admin: 'Admin', operator: 'Operator', user: 'User' };
const roleColors: Record<UserRole, string> = {
  admin: 'bg-destructive/10 text-destructive',
  operator: 'bg-warning/10 text-warning',
  user: 'bg-primary/10 text-primary',
};

const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    'Full dashboard access',
    'Control panel + threshold configuration',
    'All system settings',
    'User management (create, edit, disable, delete)',
    'Audit log access',
    'Clear logs and alerts',
    'Required to use 2FA',
  ],
  operator: [
    'Dashboard',
    'Control panel + threshold configuration',
    'View data logs',
    'Cannot access settings or user management',
  ],
  user: [
    'Dashboard (read-only)',
    'View data logs',
    'No control or configuration access',
  ],
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function UsersPage() {
  const { users, user, createUser, deleteUser, updateUserRole, setUserStatus, setUser2FA, resetUserPassword, hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetForId, setResetForId] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState('');

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="panel p-6 max-w-xl flex items-center gap-3 border-warning/30">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-warning">Only admins can access user management.</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const result = await createUser(username, password, role);
    if (result.ok) {
      setSuccess(`User "${username}" created`);
      setUsername(''); setPassword(''); setRole('user');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error ?? 'Failed to create user');
    }
  };

  const handleResetPwd = async (id: string) => {
    if (!newPwd.trim()) return;
    const r = await resetUserPassword(id, newPwd);
    if (r.ok) {
      setSuccess('Password reset');
      setResetForId(null);
      setNewPwd('');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(r.error ?? 'Reset failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">User Management</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Create and manage system users, roles, and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        {/* Create user */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Create New User</h3>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Role</label>
              <select value={role} onChange={e => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors">
                <option value="user">User (read-only)</option>
                <option value="operator">Operator (control + monitor)</option>
                <option value="admin">Admin (full access, requires 2FA)</option>
              </select>
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />{error}
              </p>
            )}
            {success && (
              <p className="text-xs text-success bg-success/10 px-3 py-2 rounded-md flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />{success}
              </p>
            )}
            <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity">
              Create User
            </button>
          </form>
        </div>

        {/* Role permissions matrix */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Role Permissions</h3>
          </div>
          <div className="space-y-3">
            {(['admin', 'operator', 'user'] as UserRole[]).map(r => (
              <div key={r} className="bg-muted/30 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded', roleColors[r])}>
                    {roleLabels[r]}
                  </span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {rolePermissions[r].map(p => (
                    <li key={p} className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">·</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User list */}
      <div className="panel p-5 mt-6 max-w-6xl">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">All Users ({users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">Username</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">Role</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">Status</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">2FA</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">Last Login</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">Created</th>
                <th className="px-3 py-2 text-right text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const disabled = u.status === 'disabled';
                return (
                  <tr key={u.id} className={cn('border-b border-border/50 hover:bg-muted/20 transition-colors', disabled && 'opacity-60')}>
                    <td className="px-3 py-2 text-foreground font-semibold">{u.username}</td>
                    <td className="px-3 py-2">
                      <select value={u.role} onChange={e => updateUserRole(u.id, e.target.value as UserRole)}
                        disabled={u.id === user?.id}
                        className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary',
                          roleColors[u.role], u.id === user?.id && 'cursor-not-allowed')}>
                        <option value="admin">{roleLabels.admin}</option>
                        <option value="operator">{roleLabels.operator}</option>
                        <option value="user">{roleLabels.user}</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded',
                        disabled ? 'bg-muted text-muted-foreground' : 'bg-success/15 text-success')}>
                        {u.status ?? 'active'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded inline-flex items-center gap-1',
                        u.twoFactorEnabled ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                        <Lock className="h-2.5 w-2.5" />
                        {u.twoFactorEnabled ? 'on' : 'off'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(u.lastLogin)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(u.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setUser2FA(u.id, !u.twoFactorEnabled)}
                          disabled={u.role === 'admin' && u.twoFactorEnabled}
                          title="Toggle 2FA"
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-30">
                          <Lock className="h-3 w-3" />
                        </button>
                        <button onClick={() => setResetForId(resetForId === u.id ? null : u.id)}
                          title="Reset password"
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors">
                          <KeyRound className="h-3 w-3" />
                        </button>
                        <button onClick={() => setUserStatus(u.id, disabled ? 'active' : 'disabled')}
                          disabled={u.id === user?.id}
                          title={disabled ? 'Enable account' : 'Disable account'}
                          className="p-1.5 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded transition-colors disabled:opacity-30">
                          <Power className="h-3 w-3" />
                        </button>
                        <button onClick={() => deleteUser(u.id)} disabled={u.id === user?.id}
                          title={u.id === user?.id ? 'Cannot delete yourself' : 'Delete user'}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-30">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      {resetForId === u.id && (
                        <div className="mt-2 flex items-center gap-1 justify-end">
                          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                            placeholder="New password" className="px-2 py-1 bg-muted border border-border rounded text-xs font-mono w-32 focus:outline-none focus:ring-1 focus:ring-primary" />
                          <button onClick={() => handleResetPwd(u.id)}
                            className="px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-semibold hover:opacity-90">Set</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
