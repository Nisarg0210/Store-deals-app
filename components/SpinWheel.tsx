'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './SpinWheel.module.css';

/* ── Prize config ───────────────────────────────────────────────
   Edit labels, colors, and odds here only. `probability` values
   are percentages and MUST total exactly 100.

   Visual slices are always equal (360° / prize count) so the wheel
   looks like a modern prize wheel — not a probability chart.
   Odds are applied only in pickWeightedPrize(), never to slice width.
──────────────────────────────────────────────────────────────── */
type Prize = {
  id: string;
  label: string;
  shortLabel: string;
  probability: number;
  color: string;
  textColor: string;
  isLoss: boolean;
};

const PRIZES: Prize[] = [
  { id: 'water', label: 'Free cold water', shortLabel: 'Cold water', probability: 29, color: '#0ea5b7', textColor: '#f7fbff', isLoss: false },
  { id: 'pop', label: 'One free pop', shortLabel: 'Free pop', probability: 23, color: '#6c63ff', textColor: '#f7fbff', isLoss: false },
  { id: 'drink', label: 'Free cold drink', shortLabel: 'Cold drink', probability: 11, color: '#e11d8a', textColor: '#f7fbff', isLoss: false },
  { id: 'snack', label: 'Small snack', shortLabel: 'Small snack', probability: 11, color: '#f59e0b', textColor: '#16120a', isLoss: false },
  { id: 'none', label: 'Better luck next time', shortLabel: 'Next time', probability: 17, color: '#3a3a4a', textColor: '#d7d7e8', isLoss: true },
  { id: 'off2', label: '$2 off next visit', shortLabel: '$2 off', probability: 7, color: '#22c55e', textColor: '#07140c', isLoss: false },
  { id: 'kit', label: 'Free Crawl Kit', shortLabel: 'Crawl Kit', probability: 2, color: '#e8c547', textColor: '#16120a', isLoss: false },
];

const PRIZE_TOTAL = PRIZES.reduce((sum, prize) => sum + prize.probability, 0);
if (Math.abs(PRIZE_TOTAL - 100) > 1e-6) {
  throw new Error(`Prize probabilities must total 100%. Currently ${PRIZE_TOTAL}.`);
}

const SPIN_MS = 3600;
const MIN_TURNS = 5;
const SVG_SIZE = 200;
const SVG_CX = 100;
const SVG_CY = 100;
const SVG_R = 100;

type Slice = {
  prize: Prize;
  start: number;
  end: number;
  mid: number;
  sweep: number;
};

type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  life: number;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  // 0° is 12 o'clock; positive angles travel clockwise to match CSS rotate().
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(start: number, end: number) {
  const from = polar(SVG_CX, SVG_CY, SVG_R, start);
  const to = polar(SVG_CX, SVG_CY, SVG_R, end);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${SVG_CX} ${SVG_CY} L ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${SVG_R} ${SVG_R} 0 ${largeArc} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)} Z`;
}

function buildSlices(prizes: Prize[]): Slice[] {
  const sweep = 360 / prizes.length;
  return prizes.map((prize, index) => {
    const start = index * sweep;
    const end = start + sweep;
    return { prize, start, end, mid: start + sweep / 2, sweep };
  });
}

function separatorPath(angle: number) {
  const inner = polar(SVG_CX, SVG_CY, 46, angle);
  const outer = polar(SVG_CX, SVG_CY, SVG_R, angle);
  return `M ${inner.x.toFixed(2)} ${inner.y.toFixed(2)} L ${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`;
}

function labelLines(text: string) {
  const parts = text.split(' ');
  if (parts.length < 2) return [text] as const;
  return [parts[0], parts.slice(1).join(' ')] as const;
}

const SLICES = buildSlices(PRIZES);

/**
 * Weighted random selection — independent of the equal visual slices.
 * Roll r in [0, 100) and walk cumulative probability bands until r lands
 * inside one. Example: water is [0, 29), pop is [29, 52), and so on.
 * After a prize is chosen, the animation simply rotates that equal slice
 * under the pointer.
 */
function pickWeightedPrize(prizes: Prize[]): Prize {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const prize of prizes) {
    cumulative += prize.probability;
    if (roll < cumulative) return prize;
  }
  return prizes[prizes.length - 1];
}

/** Ease-out quartic: fast start, long satisfying slowdown onto the prize. */
function easeOutQuart(t: number) {
  return 1 - (1 - t) ** 4;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const CONFETTI_COLORS = ['#e8c547', '#6c63ff', '#06b6d4', '#ec4899', '#f0f0f8', '#22c55e'];

function ConfettiBurst({ active, jackpot }: { active: boolean; jackpot: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height };
    };
    const startSize = resize();

    const count = jackpot ? 90 : 56;
    const originX = startSize.width / 2;
    const originY = startSize.height * 0.42;
    const particles: ConfettiParticle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.2 + Math.random() * 7;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.2,
        size: 3.5 + Math.random() * 4.5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 14,
        life: 1,
      };
    });

    const tick = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      let alive = false;
      for (const p of particles) {
        p.vy += 0.16;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        p.life -= 0.007;
        if (p.life <= 0) continue;
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (alive) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    window.visualViewport?.addEventListener('resize', resize);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener('resize', resize);
      window.removeEventListener('resize', resize);
    };
  }, [active, jackpot]);

  if (!active) return null;
  return <canvas ref={canvasRef} className={styles.confetti} aria-hidden />;
}

export default function SpinWheel() {
  const [unlocked, setUnlocked] = useState(false);
  const [spent, setSpent] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Prize | null>(null);

  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [result]);

  const canSpin = unlocked && !spent && !spinning && !result;

  const animateTo = useCallback((targetDeg: number, duration: number, onDone?: () => void) => {
    const from = rotationRef.current;
    const start = performance.now();

    const step = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min((now - start) / duration, 1);
      const next = from + (targetDeg - from) * easeOutQuart(t);
      rotationRef.current = next;
      setRotation(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        onDone?.();
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  /** Fold accumulated turns down to 0–360°, then ease the short way home to 0°. */
  const resetWheel = useCallback((animate: boolean) => {
    const visual = ((rotationRef.current % 360) + 360) % 360;
    rotationRef.current = visual;
    setRotation(visual);
    if (!animate || prefersReducedMotion() || visual < 0.5) {
      rotationRef.current = 0;
      setRotation(0);
      return;
    }
    const target = visual > 180 ? 360 : 0;
    animateTo(target, 480, () => {
      rotationRef.current = 0;
      setRotation(0);
    });
  }, [animateTo]);

  const handleSpin = () => {
    if (!canSpin) return;

    const prize = pickWeightedPrize(PRIZES);
    const slice = SLICES.find((s) => s.prize.id === prize.id);
    if (!slice) return;

    /**
     * Rotation math
     * -------------
     * Visual slices are equal, but the winner was already picked by weight.
     * The pointer is fixed at 12 o'clock (0°). CSS rotate(R) turns the wheel
     * clockwise, so the local angle under the pointer is (360 - (R % 360)).
     *
     * We land near the chosen slice's midpoint (with a little jitter so it
     * does not always stop on the exact same pixel): R ≡ 360 - land (mod 360),
     * plus several full turns for the spin.
     */
    const jitter = (Math.random() - 0.5) * slice.sweep * 0.46;
    const land = slice.mid + jitter;
    const current = ((rotationRef.current % 360) + 360) % 360;
    const desired = (360 - land + 360) % 360;
    const extra = (desired - current + 360) % 360;
    const target = rotationRef.current + MIN_TURNS * 360 + extra;
    const duration = prefersReducedMotion() ? 0 : SPIN_MS;

    setSpinning(true);
    setSpent(true);
    animateTo(target, duration, () => {
      setSpinning(false);
      setResult(prize);
    });
  };

  const handleUnlock = () => {
    if (spinning) return;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setResult(null);
    setSpent(false);
    setUnlocked(true);
    setSpinning(false);
    resetWheel(true);
  };

  const handleDismiss = useCallback(() => {
    setResult(null);
    setUnlocked(false);
    resetWheel(true);
  }, [resetWheel]);

  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, handleDismiss]);

  let status = 'Staff unlocks a spin after verifying purchase + tag.';
  if (spinning) status = 'Good luck…';
  else if (result) status = 'Show the result to staff.';
  else if (spent) status = 'This spin is used. Staff can unlock the next one.';
  else if (unlocked) status = 'You are up — spin once.';

  const celebrate = Boolean(result && !result.isLoss);
  const jackpot = result?.id === 'kit';

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <div className={styles.kicker}>
          <span className={styles.kickerDot} aria-hidden />
          SuperCrawl · James North
        </div>
        <h1 className={styles.title}>Spin the wheel</h1>
        <p className={styles.sub}>
          Spend $15 or more and get a spin. Tag @themarketonjames, show staff, then play.
        </p>
      </header>

      <div className={`${styles.stage} ${canSpin ? styles.stageReady : ''} ${spinning ? styles.stageSpinning : ''} ${result ? styles.stageLanded : ''}`}>
        <div className={styles.glow} />
        <div className={styles.bezel} />
        <div className={styles.shine} />

        <div className={styles.pointer} aria-hidden>
          <span className={styles.pointerStem} />
          <span className={styles.pointerTip} />
        </div>

        <div className={styles.wheelClip}>
          <div
            className={styles.wheelSpin}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <svg className={styles.wheelSvg} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} role="img" aria-label="Prize wheel">
              <defs>
                <radialGradient id="spinSliceSheen" cx="50%" cy="42%" r="62%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
                  <stop offset="55%" stopColor="#fff" stopOpacity="0" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
                </radialGradient>
              </defs>
              {SLICES.map((slice) => {
                const labelPos = polar(SVG_CX, SVG_CY, 67, slice.mid);
                let textRot = slice.mid;
                if (slice.mid > 90 && slice.mid < 270) textRot += 180;
                const lines = labelLines(slice.prize.shortLabel);
                return (
                  <g key={slice.prize.id}>
                    <path d={slicePath(slice.start, slice.end)} fill={slice.prize.color} />
                    <path d={slicePath(slice.start, slice.end)} fill="url(#spinSliceSheen)" />
                    <text
                      x={labelPos.x.toFixed(2)}
                      y={labelPos.y.toFixed(2)}
                      fill={slice.prize.textColor}
                      fontSize="7.1"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRot.toFixed(1)} ${labelPos.x.toFixed(2)} ${labelPos.y.toFixed(2)})`}
                    >
                      {lines.length === 1 ? (
                        lines[0]
                      ) : (
                        <>
                          <tspan x={labelPos.x.toFixed(2)} dy="-0.42em">{lines[0]}</tspan>
                          <tspan x={labelPos.x.toFixed(2)} dy="1.2em">{lines[1]}</tspan>
                        </>
                      )}
                    </text>
                  </g>
                );
              })}
              {SLICES.map((slice) => (
                <path
                  key={`sep-${slice.prize.id}`}
                  d={separatorPath(slice.start)}
                  stroke="rgba(10,10,15,0.55)"
                  strokeWidth="1.15"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          </div>
        </div>

        <div className={styles.hub}>
          <span className={styles.hubRing} aria-hidden />
          <span className={styles.hubBrand}>
            <span className={styles.hubName}>The Market</span>
            <span className={styles.hubName}>On James</span>
            <span className={styles.hubSub}>North</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.spinBtn} ${canSpin ? styles.spinBtnReady : ''}`}
        onClick={handleSpin}
        disabled={!canSpin}
        aria-live="polite"
      >
        {spinning ? 'Spinning…' : spent ? 'Spin used' : unlocked ? 'Spin the wheel' : 'Locked'}
      </button>
      <p className={`${styles.status} ${canSpin ? styles.statusReady : ''}`}>{status}</p>

      <div className={styles.steps}>
        <div className={styles.step}>
          <span className={styles.stepNum}>1</span>
          <span className={styles.stepLabel}>Spend $15+ in store</span>
        </div>
        <div className={styles.step}>
          <span className={styles.stepNum}>2</span>
          <span className={styles.stepLabel}>Tag @themarketonjames</span>
        </div>
        <div className={styles.step}>
          <span className={styles.stepNum}>3</span>
          <span className={styles.stepLabel}>Show staff, then spin</span>
        </div>
      </div>

      <div className={styles.staff}>
        <div className={styles.staffHead}>
          <span className={styles.staffLabel}>Staff only</span>
        </div>
        <p className={styles.staffHint}>
          Confirm the $15+ purchase and the Instagram tag, then unlock one spin. Each unlock is a single play.
        </p>
        <button
          type="button"
          className={`btn btn-secondary ${styles.unlockBtn} ${unlocked && !spent ? styles.unlockBtnOn : ''}`}
          onClick={handleUnlock}
          disabled={spinning}
        >
          {unlocked && !spent ? 'Unlocked — 1 spin ready' : 'Unlock spin'}
        </button>
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {result ? `You won: ${result.label}` : ''}
      </p>

      {result ? (
        <div className={styles.backdrop} role="presentation" onClick={handleDismiss}>
          <ConfettiBurst active={celebrate} jackpot={jackpot} />
          <div
            className={`${styles.ticket} ${result.isLoss ? styles.ticketLoss : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="spin-result-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className={`${styles.ticketNotch} ${styles.ticketNotchLeft}`} aria-hidden />
            <span className={`${styles.ticketNotch} ${styles.ticketNotchRight}`} aria-hidden />
            <div className={styles.ticketKicker}>
              {result.isLoss ? 'SuperCrawl · James North' : jackpot ? 'Jackpot · Crawl Kit' : 'The Market On James North'}
            </div>
            <p className={styles.youWon} id="spin-result-title">
              {result.isLoss ? 'The wheel landed on' : 'You won'}
            </p>
            <h2 className={styles.prizeName}>{result.label}</h2>
            <div className={styles.ticketRule} aria-hidden />
            <p className={styles.redeem}>
              {result.isLoss ? (
                'Thanks for playing — grab a drink, keep crawling James North, and try again next visit.'
              ) : (
                <>
                  <span className={styles.redeemStrong}>Show this to staff · Redeem at counter</span>
                  Staff will confirm this screen before handing over the prize.
                </>
              )}
            </p>
            <button
              ref={closeBtnRef}
              type="button"
              className={`btn btn-primary ${styles.closeBtn}`}
              onClick={handleDismiss}
            >
              Close for next guest
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
