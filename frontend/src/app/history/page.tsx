'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FORMAT_LABELS } from '@/types';
import type { OutputFormat } from '@/types';

interface HistorySource {
  id: string;
  title: string;
  wordCount: number;
  createdAt: string;
  outputs: {
    id: string;
    format: OutputFormat;
    content: string;
    createdAt: string;
  }[];
}

interface StatsData {
  mostUsedFormats: { format: OutputFormat; count: number }[];
  totalSources: number;
  totalOutputs: number;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sources, setSources] = useState<HistorySource[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const [sourcesRes, statsRes] = await Promise.all([fetch('/api/sources'), fetch('/api/stats')]);
      if (sourcesRes.ok) setSources(await sourcesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchHistory();
  }, [session, fetchHistory]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F6F3' }}>
        <div className="animate-pulse text-sm" style={{ color: '#6B6580' }}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  async function handleDelete(sourceId: string) {
    const res = await fetch(`/api/sources?id=${sourceId}`, { method: 'DELETE' });
    if (res.ok) setSources((prev) => prev.filter((s) => s.id !== sourceId));
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F6F3', color: '#2D2A3E' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: 'rgba(248,246,243,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(232,196,160,0.2)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-[family-name:var(--font-playfair)] text-xl font-semibold tracking-tight"
            style={{ color: '#2D2A3E' }}
          >
            Repurposer
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: '#6B6580' }}
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

        {/* Page title */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <h1
            className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold tracking-tight"
            style={{ color: '#2D2A3E' }}
          >
            History
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#6B6580' }}>All your past repurposed content, saved automatically.</p>
        </motion.div>

        {/* Stats */}
        {stats && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border p-5"
              style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.12)' }}
            >
              <p className="text-xs mb-1" style={{ color: '#6B6580' }}>Total Sources</p>
              <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold" style={{ color: '#7C6AEF' }}>
                {stats.totalSources}
              </p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border p-5"
              style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.12)' }}
            >
              <p className="text-xs mb-1" style={{ color: '#6B6580' }}>Total Outputs</p>
              <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold" style={{ color: '#7C6AEF' }}>
                {stats.totalOutputs}
              </p>
            </motion.div>
            {stats.mostUsedFormats.length > 0 && (
              <motion.div
                variants={fadeInUp}
                className="rounded-2xl border p-5 col-span-2"
                style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.12)' }}
              >
                <p className="text-xs mb-3" style={{ color: '#6B6580' }}>Most Used Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {stats.mostUsedFormats.map((f) => (
                    <span
                      key={f.format}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: '#F0EDFA', color: '#7C6AEF' }}
                    >
                      {FORMAT_LABELS[f.format]} ({f.count})
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Sources List */}
        {sources.length === 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-center py-20"
          >
            <p className="text-base mb-3" style={{ color: '#6B6580' }}>No history yet</p>
            <Link
              href="/dashboard"
              className="text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: '#7C6AEF' }}
            >
              Go repurpose some content →
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-3"
          >
            {sources.map((source) => (
              <motion.div
                key={source.id}
                variants={fadeInUp}
                layout
                className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.12)' }}
              >
                <button
                  onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left transition-opacity hover:opacity-80"
                >
                  <div>
                    <h3 className="font-medium text-sm" style={{ color: '#2D2A3E' }}>{source.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: '#6B6580' }}>
                      {source.wordCount} words &middot; {new Date(source.createdAt).toLocaleDateString()} &middot; {source.outputs.length} outputs
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(source.id); }}
                      className="text-xs px-3 py-1.5 rounded-full transition hover:opacity-70"
                      style={{ color: '#dc2626', backgroundColor: 'rgba(239,68,68,0.06)' }}
                    >
                      Delete
                    </button>
                    <span className="text-xs" style={{ color: '#6B6580' }}>
                      {expandedId === source.id ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedId === source.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t"
                      style={{ borderColor: 'rgba(124,106,239,0.08)' }}
                    >
                      {source.outputs.map((output, i) => (
                        <motion.div
                          key={output.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="px-6 py-4 border-b last:border-0"
                          style={{ borderColor: 'rgba(124,106,239,0.06)' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium" style={{ color: '#7C6AEF' }}>
                              {FORMAT_LABELS[output.format]}
                            </span>
                            <button
                              onClick={() => copyToClipboard(output.content, output.id)}
                              className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                              style={
                                copiedId === output.id
                                  ? { backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }
                                  : { backgroundColor: '#F0EDFA', color: '#7C6AEF' }
                              }
                            >
                              {copiedId === output.id ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-sm leading-relaxed line-clamp-4" style={{ color: '#6B6580' }}>
                            {output.content}
                          </p>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
