'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

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

  const filteredSources = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) => s.title.toLowerCase().includes(q));
  }, [sources, search]);

  async function handleDelete(sourceId: string) {
    const res = await fetch(`/api/sources?id=${sourceId}`, { method: 'DELETE' });
    if (res.ok) setSources((prev) => prev.filter((s) => s.id !== sourceId));
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleOutputExpand(outputId: string) {
    setExpandedOutputs((prev) => {
      const next = new Set(prev);
      next.has(outputId) ? next.delete(outputId) : next.add(outputId);
      return next;
    });
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
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-7">

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

        {/* Search */}
        {sources.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: 'var(--color-text-body)' }}
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title…"
                className="w-full pl-9 pr-4 py-2.5 rounded-sm border text-sm outline-none transition"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-head)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-text-body)' }}
                >
                  ✕
                </button>
              )}
            </div>
            {search && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-body)' }}>
                {filteredSources.length === 0
                  ? 'No results found'
                  : `${filteredSources.length} result${filteredSources.length === 1 ? '' : 's'}`}
              </p>
            )}
          </motion.div>
        )}

        {/* Sources list */}
        {sources.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <p className="text-base mb-3" style={{ color: 'var(--color-text-body)' }}>No history yet</p>
            <Link href="/dashboard" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--color-brand)' }}>
              Go repurpose some content →
            </Link>
          </motion.div>
        ) : filteredSources.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--color-text-body)' }}>No sessions match &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch('')} className="text-sm mt-2 hover:opacity-70 transition-opacity" style={{ color: 'var(--color-brand)' }}>
              Clear search
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredSources.map((source, i) => (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                layout
                className="rounded-sm border overflow-hidden"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                {/* Collapsed row */}
                <div
                  onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                  className="w-full px-4 sm:px-5 py-4 flex items-start justify-between cursor-pointer transition-opacity hover:opacity-80 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate" style={{ color: 'var(--color-text-head)' }}>{source.title}</h3>
                    <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--color-text-body)' }}>
                      {source.wordCount} words · {new Date(source.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {source.outputs.length} output{source.outputs.length !== 1 ? 's' : ''}
                    </p>
                    {/* Format pills */}
                    {source.outputs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {source.outputs.map((o) => (
                          <span
                            key={o.id}
                            className="px-2 py-0.5 rounded-sm text-xs"
                            style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-brand)' }}
                          >
                            {FORMAT_LABELS[o.format]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(source.id); }}
                      className="text-xs px-3 py-1.5 rounded-sm transition hover:opacity-70"
                      style={{ color: 'var(--color-danger)', backgroundColor: 'rgba(220,38,38,0.06)' }}
                    >
                      Delete
                    </button>
                    <svg
                      className="w-4 h-4 transition-transform duration-200"
                      style={{
                        color: 'var(--color-text-body)',
                        transform: expandedId === source.id ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Expanded outputs */}
                <AnimatePresence>
                  {expandedId === source.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {source.outputs.map((output, j) => {
                        const isExpanded = expandedOutputs.has(output.id);
                        const isLong = output.content.length > 400;
                        return (
                          <motion.div
                            key={output.id}
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: j * 0.05 }}
                            className="px-4 sm:px-5 py-4 border-b last:border-0"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
                                {FORMAT_LABELS[output.format]}
                              </span>
                              <button
                                onClick={() => copyToClipboard(output.content, output.id)}
                                className="px-3 py-1.5 rounded-sm text-xs font-medium transition cursor-pointer"
                                style={copiedId === output.id
                                  ? { backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }
                                  : { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-brand)' }}
                              >
                                {copiedId === output.id ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                            <p
                              className="text-sm leading-relaxed whitespace-pre-wrap"
                              style={{
                                color: 'var(--color-text-body)',
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: isExpanded ? 'unset' : 4,
                                overflow: isExpanded ? 'visible' : 'hidden',
                              } as React.CSSProperties}
                            >
                              {output.content}
                            </p>
                            {isLong && (
                              <button
                                onClick={() => toggleOutputExpand(output.id)}
                                className="text-xs mt-2 hover:opacity-70 transition-opacity"
                                style={{ color: 'var(--color-brand)' }}
                              >
                                {isExpanded ? 'Show less ↑' : 'Show more ↓'}
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
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
