import Link from 'next/link';

export const metadata = {
  title: 'Offline — James North Deals',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <>
      <div className="bg-mesh" />
      <main className="container" style={{ padding: '4rem 1rem', textAlign: 'center', minHeight: '70vh' }}>
        <div
          style={{
            width: '4rem',
            height: '4rem',
            margin: '0 auto 1rem',
            borderRadius: '50%',
            border: '3px dashed var(--text-muted, #6b7280)',
            opacity: 0.85,
          }}
          aria-hidden
        />
        <h1 className="public-hero__title" style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>
          You&apos;re offline
        </h1>
        <p className="public-hero__sub" style={{ maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
          Reconnect to the internet to load the latest deals. Anything you already opened may still appear from cache.
        </p>
        <Link href="/" className="btn btn-primary">
          Try again
        </Link>
      </main>
    </>
  );
}
