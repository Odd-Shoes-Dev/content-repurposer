'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

function NavItem({ href, label, icon, active, onClick }: {
  href: string; label: string; active: boolean;
  icon: React.ReactNode; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 relative"
      style={{
        color: active ? '#fff' : 'var(--color-sidebar-text)',
        backgroundColor: active ? 'rgba(124,106,239,0.18)' : 'transparent',
        borderLeft: active ? '3px solid var(--color-sidebar-active)' : '3px solid transparent',
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6 }}>{icon}</span>
      {label}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const name = (session?.user as { name?: string })?.name ?? 'there';
  const firstName = name.split(' ')[0];

  async function handleSignOut() {
    onClose?.();
    await signOut({ redirect: false });
    router.push('/auth/signin');
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-sidebar-bg)' }}>
      {/* Wordmark */}
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(196,189,216,0.1)' }}>
        <div className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-white tracking-tight">
          Repurposer
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-sidebar-muted)' }}>
          Welcome, {firstName}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <NavItem
          href="/dashboard" label="Dashboard" active={pathname === '/dashboard'}
          onClick={onClose}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />
        <NavItem
          href="/history" label="History" active={pathname === '/history'}
          onClick={onClose}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
            </svg>
          }
        />
        <NavItem
          href="/settings" label="Settings" active={pathname === '/settings'}
          onClick={onClose}
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          }
        />
      </nav>

      {/* Sign out */}
      <div className="px-2 py-4 border-t" style={{ borderColor: 'rgba(196,189,216,0.1)' }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 hover:opacity-80"
          style={{ color: 'var(--color-sidebar-muted)', borderLeft: '3px solid transparent' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// Custom menu icon — two stacked lines with a decorative dot
function MenuIcon() {
  return (
    <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
      <rect x="0" y="1" width="14" height="2" rx="1" fill="currentColor" />
      <rect x="0" y="8" width="22" height="2" rx="1" fill="currentColor" />
      <rect x="4" y="15" width="18" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-brand)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 flex-shrink-0 fixed top-0 left-0 h-full z-30"
        style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile: top bar + drawer */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--color-sidebar-bg)' }}>
        <span className="font-[family-name:var(--font-playfair)] text-base font-semibold text-white tracking-tight">
          Repurposer
        </span>
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-white p-1"
          aria-label="Open menu"
          style={{ color: 'var(--color-sidebar-text)' }}
        >
          <MenuIcon />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed top-0 left-0 h-full w-64 z-50 md:hidden"
              style={{ backgroundColor: 'var(--color-sidebar-bg)' }}
            >
              <div className="flex justify-end px-4 pt-4">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1"
                  style={{ color: 'var(--color-sidebar-muted)' }}
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <SidebarContent onClose={() => setDrawerOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-h-screen pt-14 md:pt-0" style={{ backgroundColor: 'var(--color-bg)' }}>
        {children}
      </main>
    </div>
  );
}
