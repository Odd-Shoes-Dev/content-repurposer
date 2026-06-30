'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FORMAT_LABELS } from '@/types';
import type { OutputFormat } from '@/types';

interface HistorySource {
  id: string;
  title: string;
  wordCount: number;
  createdAt: string;
  outputs: { id: string; format: OutputFormat; content: string; createdAt: string }[];
}

interface StatsData {
  mostUsedFormats: { format: OutputFormat; count: number }[];
  totalSources: number;
  totalOutputs: number;
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const [sources, setSources] = useState<HistorySource[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const [sourcesRes, statsRes] = await Promise.all([fetch('/api/sources'), fetch('/api/stats')]);
      if (sourcesRes.ok) setSources(await sourcesRes.json() as HistorySource[]);
      if (statsRes.ok) setStats(await statsRes.json() as StatsData);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session) fetchHistory(); }, [session, fetchHistory]);

  async function handleDelete(sourceId: string) {
    const res = await fetch(`/api/sources?id=${sourceId}`, { method: 'DELETE' });
    if (res.ok) setSources((prev) => prev.filter((s) => s.id !== sourceId));
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-brand)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-7">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text-head)' }}>
            History
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-body)' }}>All your past repurposed content, saved automatically.</p>
        </motion.div>

        {/* Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              { label: 'Total Sources', value: stats.totalSources },
              { label: 'Total Outputs', value: stats.totalOutputs },
            ].map((s) => (
              <div key={s.label} className="rounded-sm border p-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-body)' }}>{s.label}</p>
                <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold" style={{ color: 'var(--color-brand)' }}>{s.value}</p>
              </div>
            ))}
            {stats.mostUsedFormats.length > 0 && (
              <div className="rounded-sm border p-4 col-span-2" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-body)' }}>Most Used Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {stats.mostUsedFormats.map((f) => (
                    <span key={f.format} className="px-3 py-1 rounded-sm text-xs font-medium"
                      style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-brand)' }}>
                      {FORMAT_LABELS[f.format]} ({f.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Sources List */}
        {sources.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <p className="text-base mb-3" style={{ color: 'var(--color-text-body)' }}>No history yet</p>
            <Link href="/dashboard" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--color-brand)' }}>
              Go repurpose some content →
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sources.map((source, i) => (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                layout
                className="rounded-sm border overflow-hidden"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div
                  onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                  className="w-full px-5 py-4 flex items-center justify-between cursor-pointer transition-opacity hover:opacity-80"
                >
                  <div>
                    <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-head)' }}>{source.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-body)' }}>
                      {source.wordCount} words · {new Date(source.createdAt).toLocaleDateString()} · {source.outputs.length} outputs
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(source.id); }}
                      className="text-xs px-3 py-1.5 rounded-sm transition hover:opacity-70"
                      style={{ color: 'var(--color-danger)', backgroundColor: 'rgba(220,38,38,0.06)' }}
                    >
                      Delete
                    </button>
                    <span className="text-xs" style={{ color: 'var(--color-text-body)' }}>
                      {expandedId === source.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === source.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {source.outputs.map((output, j) => (
                        <motion.div
                          key={output.id}
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: j * 0.05 }}
                          className="px-5 py-4 border-b last:border-0"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium" style={{ color: 'var(--color-brand)' }}>
                              {FORMAT_LABELS[output.format]}
                            </span>
                            <button
                              onClick={() => copyToClipboard(output.content, output.id)}
                              className="px-3 py-1.5 rounded-sm text-xs font-medium transition"
                              style={copiedId === output.id
                                ? { backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }
                                : { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-brand)' }}
                            >
                              {copiedId === output.id ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-sm leading-relaxed line-clamp-4" style={{ color: 'var(--color-text-body)' }}>
                            {output.content}
                          </p>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
