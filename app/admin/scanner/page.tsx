'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import {
  getCustomerData,
  awardPoints,
  subtractPoints,
  redeemPoints,
  MIN_REDEEM,
  REDEEM_150,
  POINTS_PER_DOLLAR_REDEEM,
  POINTS_PER_DOLLAR_EARN,
  CustomerData,
} from '@/lib/adminLoyalty';

/* ── Types ──────────────────────────────────────────────────────── */
type ScannerState = 'scanning' | 'found' | 'awarding' | 'redeeming' | 'done';

interface ActionResult {
  type: 'award' | 'redeem' | 'subtract';
  pointsChanged: number;
  dollarValue?: number;
  newBalance: number;
}

/* ── QR Scanner using jsQR (loaded dynamically) ──────────────────── */
function QrScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const jsQRRef = useRef<((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null>(null);

  const [scannerState, setScannerState] = useState<ScannerState>('scanning');
  const [scannedId, setScannedId] = useState('');
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [customerNotFound, setCustomerNotFound] = useState(false);

  // Award form
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState<100 | 150>(100);

  /* ── Load jsQR from CDN ──────────────────────────────────────── */
  useEffect(() => {
    if ((window as unknown as Record<string, unknown>).jsQR) {
      jsQRRef.current = (window as unknown as Record<string, unknown>).jsQR as typeof jsQRRef.current;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    script.async = true;
    script.onload = () => {
      jsQRRef.current = (window as unknown as Record<string, unknown>).jsQR as typeof jsQRRef.current;
    };
    document.head.appendChild(script);
  }, []);

  /* ── Start camera ────────────────────────────────────────────── */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      alert('Camera access denied. Please grant permission and reload.');
    }
  }, []);

  /* ── Stop camera ─────────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  /* ── Scan loop ───────────────────────────────────────────────── */
  const scan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scan);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) { animRef.current = requestAnimationFrame(scan); return; }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (jsQRRef.current) {
      const result = jsQRRef.current(imageData.data, imageData.width, imageData.height);
      if (result?.data) {
        handleQrDetected(result.data);
        return; // stop loop
      }
    }
    animRef.current = requestAnimationFrame(scan);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startCamera().then(() => {
      animRef.current = requestAnimationFrame(scan);
    });
    return () => stopCamera();
  }, [startCamera, stopCamera, scan]);

  /* ── QR Detected ─────────────────────────────────────────────── */
  const handleQrDetected = useCallback(async (id: string) => {
    stopCamera();
    setScannedId(id);
    setScannerState('found');
    setCustomerNotFound(false);

    const data = await getCustomerData(id);
    if (!data) {
      setCustomerNotFound(true);
    } else {
      setCustomer(data);
    }
  }, [stopCamera]);

  /* ── Reset to scan again ─────────────────────────────────────── */
  const resetScanner = useCallback(() => {
    setScannedId('');
    setCustomer(null);
    setCustomerNotFound(false);
    setPurchaseAmount('');
    setActionResult(null);
    setActionError('');
    setRedeemAmount(100);
    setScannerState('scanning');
    startCamera().then(() => {
      animRef.current = requestAnimationFrame(scan);
    });
  }, [startCamera, scan]);

  /* ── Award Points ─────────────────────────────────────────────── */
  const handleAward = useCallback(async () => {
    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      setActionError('Please enter a valid purchase amount.');
      return;
    }
    setActionError('');
    setActionLoading(true);
    try {
      const added = await awardPoints(scannedId, amount);
      const fresh = await getCustomerData(scannedId);
      setCustomer(fresh);
      setActionResult({ type: 'award', pointsChanged: added, newBalance: fresh?.points ?? 0 });
      setScannerState('done');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to award points.');
    } finally {
      setActionLoading(false);
    }
  }, [purchaseAmount, scannedId]);

  /* ── Subtract Points (Correct Mistake) ───────────────────────── */
  const handleSubtract = useCallback(async () => {
    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      setActionError('Please enter a valid purchase amount to subtract.');
      return;
    }
    setActionError('');
    setActionLoading(true);
    try {
      const removed = await subtractPoints(scannedId, amount);
      const fresh = await getCustomerData(scannedId);
      setCustomer(fresh);
      setActionResult({ type: 'subtract', pointsChanged: removed, newBalance: fresh?.points ?? 0 });
      setScannerState('done');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to subtract points.');
    } finally {
      setActionLoading(false);
    }
  }, [purchaseAmount, scannedId]);

  /* ── Redeem Points ───────────────────────────────────────────── */
  const handleRedeem = useCallback(async (pts: 100 | 150) => {
    if (!customer) return;
    if (customer.points < pts) {
      setActionError(`Insufficient points. Customer needs at least ${pts} pts.`);
      return;
    }
    setActionError('');
    setActionLoading(true);
    try {
      const dollars = await redeemPoints(scannedId, pts);
      const fresh = await getCustomerData(scannedId);
      setCustomer(fresh);
      setActionResult({
        type: 'redeem',
        pointsChanged: pts,
        dollarValue: dollars,
        newBalance: fresh?.points ?? 0,
      });
      setScannerState('done');
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Failed to redeem.');
    } finally {
      setActionLoading(false);
    }
  }, [customer, scannedId]);

  return (
    <div className="scanner-page">
      <div className="bg-mesh" />

      {/* Header */}
      <div className="scanner-header">
        <a href="/admin" className="btn btn-secondary btn-sm">← Back to Dashboard</a>
        <h1 className="scanner-title">📷 Loyalty Scanner</h1>
        <p className="scanner-subtitle">Scan a customer&apos;s loyalty QR code to award or redeem points</p>
      </div>

      <div className="scanner-content">

        {/* ── Camera View ───────────────────────────────────────── */}
        {scannerState === 'scanning' && (
          <div className="scanner-card card">
            <div className="scanner-viewfinder-wrap">
              <video ref={videoRef} className="scanner-video" playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="scanner-overlay">
                <div className="scanner-frame">
                  <span className="scanner-frame__corner scanner-frame__corner--tl" />
                  <span className="scanner-frame__corner scanner-frame__corner--tr" />
                  <span className="scanner-frame__corner scanner-frame__corner--bl" />
                  <span className="scanner-frame__corner scanner-frame__corner--br" />
                  <div className="scanner-beam" />
                </div>
              </div>
            </div>
            <p className="scanner-hint">Point camera at customer&apos;s loyalty QR code</p>
          </div>
        )}

        {/* ── Customer Found ────────────────────────────────────── */}
        {(scannerState === 'found' || scannerState === 'awarding' || scannerState === 'redeeming') && (
          <div className="scanner-card card">
            {customerNotFound ? (
              <div className="scanner-not-found">
                <span style={{ fontSize: '2.5rem' }}>🔍</span>
                <h3>Customer Not Found</h3>
                <p>This QR code isn&apos;t in the loyalty system yet.<br />Have the customer visit the deals board to generate their card.</p>
                <button className="btn btn-primary" onClick={resetScanner}>Scan Again</button>
              </div>
            ) : customer ? (
              <>
                {/* Customer info */}
                <div className="scanner-customer-info">
                  <div className="scanner-customer-avatar">👤</div>
                  <div>
                    <div className="scanner-customer-label">
                      {customer.authProvider === 'email' ? `📧 ${customer.email ?? 'Secured Account'}` : '👤 Guest Customer'}
                    </div>
                    <div className="scanner-customer-points">
                      <span className="scanner-points-val">{(customer.points ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className="scanner-points-label">points</span>
                    </div>
                    <div className="scanner-points-worth">
                      Worth ${Math.floor((customer.points ?? 0) / POINTS_PER_DOLLAR_REDEEM).toFixed(2)} in rewards
                    </div>
                  </div>
                </div>

                {actionError && (
                  <div className="form-error" style={{ marginBottom: '1rem' }}>⚠️ {actionError}</div>
                )}

                {/* Award section */}
                <div className="scanner-action-section">
                  <h3 className="scanner-action-title">➕ Manage Points</h3>
                  <p className="scanner-action-hint">
                    Enter the purchase total. Earn <strong>2 points per $1</strong> spent (rounded to nearest dollar).
                    {purchaseAmount && !isNaN(parseFloat(purchaseAmount)) && parseFloat(purchaseAmount) > 0 && (
                      <> &nbsp;→ <strong>+{Math.round(parseFloat(purchaseAmount)) * POINTS_PER_DOLLAR_EARN} pts</strong> for <strong>${Math.round(parseFloat(purchaseAmount))}</strong></>                    )}
                  </p>
                  <div className="scanner-award-row" style={{ flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 100%' }}>
                      <span className="scanner-dollar-sign">$</span>
                      <input
                        id="scanner-purchase-amount"
                        type="number"
                        className="form-input scanner-amount-input"
                        placeholder="0.00"
                        value={purchaseAmount}
                        onChange={(e) => setPurchaseAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <button
                        id="scanner-award-btn"
                        className="btn btn-success"
                        style={{ flex: 2, justifyContent: 'center' }}
                        onClick={handleAward}
                        disabled={actionLoading || !purchaseAmount}
                      >
                        {actionLoading ? '⏳' : '➕ Add Points'}
                      </button>
                      <button
                        id="scanner-subtract-btn"
                        className="btn btn-danger"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={handleSubtract}
                        disabled={actionLoading || !purchaseAmount}
                        title="Correct a mistake"
                      >
                        {actionLoading ? '⏳' : '➖ Undo'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="divider" style={{ margin: '1.25rem 0' }} />

                {/* Redeem section */}
                <div className="scanner-action-section">
                  <h3 className="scanner-action-title">🎁 Redeem Reward</h3>
                  {(customer.points ?? 0) >= MIN_REDEEM ? (
                    <>
                      <div className="scanner-redeem-ready">
                        <span>✅ Customer has enough points to redeem!</span>
                      </div>
                      {/* 100 pts = $1 off */}
                      <button
                        id="scanner-redeem-100-btn"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }}
                        onClick={() => handleRedeem(100)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? '⏳ Processing…' : `🎁 Redeem 100 pts → $1.00 Off`}
                      </button>
                      {/* 150 pts = $1.50 off — enabled only when customer has ≥150 pts */}
                      <button
                        id="scanner-redeem-150-btn"
                        className="btn btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                        onClick={() => handleRedeem(150)}
                        disabled={actionLoading || (customer.points ?? 0) < REDEEM_150}
                        title={(customer.points ?? 0) < REDEEM_150 ? `Needs ${REDEEM_150 - (customer.points ?? 0)} more pts` : ''}
                      >
                        {actionLoading
                          ? '⏳ Processing…'
                          : (customer.points ?? 0) >= REDEEM_150
                            ? `💎 Redeem 150 pts → $1.50 Off`
                            : `🔒 150 pts → $1.50 Off (${REDEEM_150 - (customer.points ?? 0)} more needed)`
                        }
                      </button>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        After clicking, manually apply the discount on the cash register.
                      </p>
                    </>
                  ) : (
                    <div className="scanner-redeem-locked">
                      <span>🔒 Needs {Math.ceil(MIN_REDEEM - (customer.points ?? 0))} more pts to unlock $1.00 reward</span>
                      <div className="loyalty-progress-bar" style={{ marginTop: '0.5rem' }}>
                        <div
                          className="loyalty-progress-fill"
                          style={{ width: `${Math.min(100, ((customer.points ?? 0) / MIN_REDEEM) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                  onClick={resetScanner}
                >
                  Scan Different Customer
                </button>
              </>
            ) : (
              <div className="scanner-loading">
                <div className="auth-loading__ring" />
                <p>Looking up customer…</p>
              </div>
            )}
          </div>
        )}

        {/* ── Done / Success ────────────────────────────────────── */}
        {scannerState === 'done' && actionResult && (
          <div className="scanner-card card scanner-success-card">
            <div className="scanner-success-icon">
              {actionResult.type === 'award' ? '✅' : actionResult.type === 'subtract' ? '↩️' : '🎉'}
            </div>
            {actionResult.type === 'award' ? (
              <>
                <h2 className="scanner-success-title">Points Awarded!</h2>
                <p className="scanner-success-detail">
                  <strong>+{actionResult.pointsChanged.toLocaleString(undefined, { maximumFractionDigits: 2 })} points</strong> added successfully.
                </p>
                <div className="scanner-success-balance">
                  New Balance: <strong>{actionResult.newBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} pts</strong>
                </div>
              </>
            ) : actionResult.type === 'subtract' ? (
              <>
                <h2 className="scanner-success-title">Points Removed</h2>
                <p className="scanner-success-detail">
                  <strong>-{actionResult.pointsChanged.toLocaleString(undefined, { maximumFractionDigits: 2 })} points</strong> deducted as a correction.
                </p>
                <div className="scanner-success-balance" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  New Balance: <strong>{actionResult.newBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} pts</strong>
                </div>
              </>
            ) : (
              <>
                <h2 className="scanner-success-title">Reward Redeemed!</h2>
                <p className="scanner-success-detail">
                  <strong>{actionResult.pointsChanged.toLocaleString(undefined, { maximumFractionDigits: 2 })} points</strong> deducted.
                </p>
                <div className="scanner-success-balance scanner-success-balance--redeem">
                  Apply <strong>${actionResult.dollarValue?.toFixed(2)} discount</strong> on the register now.
                </div>
                <div className="scanner-success-balance" style={{ marginTop: '0.5rem' }}>
                  Remaining Balance: <strong>{actionResult.newBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} pts</strong>
                </div>
              </>
            )}
            <button
              id="scanner-scan-again-btn"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }}
              onClick={resetScanner}
            >
              📷 Scan Next Customer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScannerPage() {
  return (
    <AdminGuard>
      <QrScannerPage />
    </AdminGuard>
  );
}
