'use client';

import { useState } from 'react';
import { useAuthState, signIn } from '@/lib/auth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-mesh" />
      <div className="login-page">
        <div className="login-card card animate-fadeInUp">
          <div className="login-logo">🏷️</div>
          <h2 className="login-title">Staff Login</h2>
          <p className="login-sub">Sign in to manage The Market ON James North deals</p>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email</label>
              <input id="login-email" type="email" className="form-input" placeholder="you@store.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="password-wrap">
                <input id="login-password" type={showPw ? 'text' : 'password'} className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                <button type="button" className="password-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1}>{showPw ? '🙈' : '👁'}</button>
              </div>
            </div>
            {error && <div className="form-error" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}
            <button type="submit" id="login-submit-btn" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}>
              {loading ? <><span className="spin" style={{ display: 'inline-block' }}>⏳</span> Signing in…</> : '🔑 Sign In'}
            </button>
          </form>
          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <a href="/" style={{ color: 'var(--accent)' }}>← View public deals board</a>
          </p>
        </div>
      </div>
    </>
  );
}

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthState();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
          <p style={{ marginTop: '1rem' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginForm />;

  return <>{children}</>;
}
