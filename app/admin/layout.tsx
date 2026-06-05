import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — The Market ON James North',
  description: 'Manage store deals',
  robots: { index: false, follow: false },
};

import AdminGuard from '@/components/AdminGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
