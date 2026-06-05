'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

export default function Toast({ message, type = 'success', onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div className={`toast toast-${type}`} role="alert" aria-live="polite">
      <span>{ICONS[type]}</span>
      <span>{message}</span>
      <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose}
        style={{ marginLeft: 'auto', padding: '0.25rem' }}>✕</button>
    </div>
  );
}
