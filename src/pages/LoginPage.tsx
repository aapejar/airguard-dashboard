import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, KeyRound, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/types/sensor';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [lockRemaining, setLockRemaining] = useState(0);

  const { login, verify2FA, lockedUntil, failedAttempts } = useAuth();
  const navigate = useNavigate();

  // Live countdown when locked out
  useEffect(() => {
    if (!lockedUntil) { setLockRemaining(0); return; }
    const tick = () => {
      const remain = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockRemaining(remain);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if ('ok' in result && result.ok) {
        navigate('/dashboard');
      } else if ('requires2FA' in result && result.requires2FA) {
        setPendingUser(result.pendingUser);
        setChallengeId(result.challengeId);
      } else if ('error' in result) {
        setError(result.error);
      }
    } catch {
      setError('Authentication service unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser || !challengeId) return;
    setError('');
    setLoading(true);
    const ok = await verify2FA(challengeId, pendingUser, code);
    setLoading(false);
    if (ok) navigate('/dashboard');
    else setError('Verification failed. Please check your code and try again.');
  };

  const cancel2FA = () => {
    setPendingUser(null);
    setChallengeId(null);
    setCode('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 mb-4">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">AirGuard Pro</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">
            Smart Air Quality Monitoring
          </p>
        </div>

        {!pendingUser ? (
          <form onSubmit={handleSubmit} className="panel p-6 space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
                placeholder="username"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {isLocked ? (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Account temporarily locked due to too many failed attempts.
                  Please wait <span className="font-mono font-semibold">{lockRemaining}s</span> before trying again.
                </span>
              </div>
            ) : error ? (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>

            {failedAttempts > 0 && !isLocked && (
              <p className="text-[10px] text-warning text-center">
                {failedAttempts} failed attempt{failedAttempts > 1 ? 's' : ''} on record.
              </p>
            )}

            <p className="text-[10px] text-muted-foreground text-center mt-3 leading-relaxed flex items-center justify-center gap-1.5">
              <Lock className="h-3 w-3" />
              Authorized personnel only — contact your administrator for access.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="panel p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="font-semibold">Two-Factor Authentication</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your 2FA verification code from your authenticator app to continue as{' '}
              <span className="font-mono text-foreground">{pendingUser.username}</span>.
            </p>
            <div>
              <label className="block text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-md text-center text-lg tracking-[0.5em] text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                placeholder="••••••"
                required
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify & Sign In
            </button>
            <button
              type="button"
              onClick={cancel2FA}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
