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
        <div className="login-split">
          <aside className="login-brand-panel" aria-hidden>
            <div className="login-brand-panel__glow" />
            <div className="login-brand-panel__content">
              <span className="login-brand-panel__kicker">The Market ON James North</span>
              <h1 className="login-brand-panel__title">Staff access</h1>
              <p className="login-brand-panel__text">
                Post deals, track who listed each item, and manage the public QR board — all in one place.
              </p>
              <ul className="login-brand-panel__bullets">
                <li>Real-time customer-facing updates</li>
                <li>Internal deal-type labels for your team</li>
                <li>Secure sign-in for store staff only</li>
              </ul>
            </div>
          </aside>

          <div className="login-panel">
            <div className="login-card card animate-fadeInUp">
              <div className="login-card__top">
                <div className="login-logo">🏷️</div>
                <h2 className="login-title">Sign in</h2>
                <p className="login-sub">Use your staff email and password</p>
              </div>
              <form onSubmit={handleLogin} className="login-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Email</label>
                  <input id="login-email" type="email" className="form-input" placeholder="you@store.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <div className="password-wrap">
                    <input id="login-password" type={showPw ? 'text' : 'password'} className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                    <button type="button" className="password-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? '🙈' : '👁'}</button>
                  </div>
                </div>
                {error && <div className="form-error" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}
                <button type="submit" id="login-submit-btn" className="btn btn-primary btn-lg login-submit" disabled={loading}>
                  {loading ? <><span className="spin" style={{ display: 'inline-block' }}>⏳</span> Signing in…</> : 'Continue to dashboard'}
                </button>
              </form>
              <p className="login-footer-link">
                <a href="/">← Back to public deals board</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthState();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__inner">
          <div className="auth-loading__ring" aria-hidden />
          <p className="auth-loading__text">Checking session…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginForm />;

  return <>{children}</>;
}
