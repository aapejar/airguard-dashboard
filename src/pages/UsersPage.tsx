import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/sensor';
import { UserPlus, Trash2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  operator: 'Operator',
  user: 'User',
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-destructive/10 text-destructive',
  operator: 'bg-warning/10 text-warning',
  user: 'bg-primary/10 text-primary',
};

export default function UsersPage() {
  const { users, user, createUser, deleteUser, updateUserRole, hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const result = createUser(username, password, role);
    if (result.ok) {
      setSuccess(`User "${username}" created`);
      setUsername('');
      setPassword('');
      setRole('user');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error ?? 'Failed to create user');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">User Management</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Create and manage system users and their roles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Create user */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Create New User</h3>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              >
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
            <button
              type="submit"
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Create User
            </button>
          </form>
        </div>

        {/* User list */}
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">All Users ({users.length})</h3>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <div
                key={u.id}
                className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground font-mono truncate">{u.username}</p>
                  <p className="text-[10px] text-muted-foreground">ID: {u.id}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={u.role}
                    onChange={e => updateUserRole(u.id, e.target.value as UserRole)}
                    disabled={u.id === user?.id}
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary',
                      roleColors[u.role],
                      u.id === user?.id && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <option value="admin">{roleLabels.admin}</option>
                    <option value="operator">{roleLabels.operator}</option>
                    <option value="user">{roleLabels.user}</option>
                  </select>
                  <button
                    onClick={() => deleteUser(u.id)}
                    disabled={u.id === user?.id}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={u.id === user?.id ? 'Cannot delete yourself' : 'Delete user'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
