'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
      const [sourcesRes, statsRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/stats'),
      ]);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  async function handleDelete(sourceId: string) {
    const res = await fetch(`/api/sources?id=${sourceId}`, { method: 'DELETE' });
    if (res.ok) {
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    }
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Content Repurposer
          </Link>
          <Link href="/dashboard" className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-2xl font-bold">History</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-sm text-gray-500">Total Sources</p>
              <p className="text-2xl font-bold">{stats.totalSources}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-sm text-gray-500">Total Outputs</p>
              <p className="text-2xl font-bold">{stats.totalOutputs}</p>
            </div>
            {stats.mostUsedFormats.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 col-span-2">
                <p className="text-sm text-gray-500 mb-2">Most Used Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {stats.mostUsedFormats.map((f) => (
                    <span
                      key={f.format}
                      className="px-3 py-1 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 rounded-full text-xs font-medium"
                    >
                      {FORMAT_LABELS[f.format]} ({f.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sources List */}
        {sources.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">No history yet</p>
            <Link href="/dashboard" className="text-violet-600 hover:underline">
              Go repurpose some content
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sources.map((source) => (
              <motion.div
                key={source.id}
                layout
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <div>
                    <h3 className="font-semibold">{source.title}</h3>
                    <p className="text-sm text-gray-500">
                      {source.wordCount} words &middot; {new Date(source.createdAt).toLocaleDateString()} &middot; {source.outputs.length} outputs
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(source.id); }}
                      className="text-xs text-red-500 hover:text-red-600 px-2 py-1"
                    >
                      Delete
                    </button>
                    <span className="text-gray-400 text-sm">{expandedId === source.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expandedId === source.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-t border-gray-100 dark:border-gray-800"
                  >
                    {source.outputs.map((output) => (
                      <div key={output.id} className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                            {FORMAT_LABELS[output.format]}
                          </span>
                          <button
                            onClick={() => copyToClipboard(output.content, output.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                              copiedId === output.id
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {copiedId === output.id ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
                          {output.content}
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
