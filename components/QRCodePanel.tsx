'use client';

import { useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodePanelProps {
  url: string;
  storeName?: string;
}

export default function QRCodePanel({ url, storeName = 'The Market ON James North' }: QRCodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState(220);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  const downloadQR = useCallback(() => {
    const svg = document.getElementById('qr-svg-el');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    canvas.width = size + 40;
    canvas.height = size + 80;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#16161f';
    ctx.roundRect(0, 0, canvas.width, canvas.height, 16);
    ctx.fill();

    // Convert SVG to image
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 20, 20, size, size);
      // Label
      ctx.fillStyle = '#f0f0f8';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(storeName, canvas.width / 2, size + 50);
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#9898b8';
      ctx.fillText('Scan for today\'s deals', canvas.width / 2, size + 68);

      const link = document.createElement('a');
      link.download = `${storeName.replace(/\s+/g, '_')}_QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(data);
  }, [size, storeName]);

  return (
    <div className="qr-panel card">
      <div className="qr-panel__header">
        <div>
          <h3>🔲 QR Code</h3>
          <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Customers scan this to see your live deals</p>
        </div>
        <div className="qr-size-control">
          <label className="form-label" htmlFor="qr-size">Size</label>
          <input id="qr-size" type="range" min="160" max="320" step="20"
            value={size} onChange={e => setSize(Number(e.target.value))}
            className="qr-size-slider" />
          <span className="qr-size-val">{size}px</span>
        </div>
      </div>

      <div className="qr-panel__code">
        <div className="qr-frame">
          <div className="qr-corner qr-corner--tl" />
          <div className="qr-corner qr-corner--tr" />
          <div className="qr-corner qr-corner--bl" />
          <div className="qr-corner qr-corner--br" />
          <QRCodeSVG
            id="qr-svg-el"
            value={url}
            size={size}
            bgColor="transparent"
            fgColor="#f0f0f8"
            level="H"
            includeMargin={false}
          />
        </div>
        <p className="qr-panel__label">{storeName}</p>
        <p className="qr-panel__sublabel">Scan for today&apos;s deals</p>
      </div>

      <div className="qr-panel__url">
        <span className="qr-panel__url-text">{url}</span>
        <button className="btn btn-secondary btn-sm" onClick={copyUrl} id="qr-copy-btn">
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>

      <div className="qr-panel__actions">
        <button className="btn btn-primary btn-sm" onClick={downloadQR} id="qr-download-btn">
          ⬇️ Download PNG
        </button>
      </div>
    </div>
  );
}
