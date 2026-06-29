'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/components/toast';
import type { OutputFormat, Tone } from '@/types';
import { FORMAT_LABELS, FORMAT_CHAR_LIMITS } from '@/types';

const ALL_FORMATS = Object.keys(FORMAT_LABELS) as OutputFormat[];

const TONES: { value: Tone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'authoritative', label: 'Authoritative' },
];

interface OutputState {
  format: OutputFormat;
  content: string;
  editedContent: string | null;
  status: 'pending' | 'streaming' | 'done' | 'error';
  error?: string;
  rating: 'up' | 'down' | null;
  isEditing: boolean;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<OutputFormat[]>([]);
  const [tone, setTone] = useState<Tone>('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [outputs, setOutputs] = useState<OutputState[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keyboard shortcut: Ctrl+Enter to generate
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!generating && content.trim() && selectedFormats.length > 0) {
          handleGenerate();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (status === 'loading') {
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

  function toggleFormat(format: OutputFormat) {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  }

  function selectAll() {
    setSelectedFormats(
      selectedFormats.length === ALL_FORMATS.length ? [] : [...ALL_FORMATS]
    );
  }

  async function handleGenerate() {
    if (!content.trim() || selectedFormats.length === 0) return;

    setGenerating(true);
    setSourceId(null);
    setOutputs(selectedFormats.map((f) => ({
      format: f, content: '', editedContent: null, status: 'pending', rating: null, isEditing: false,
    })));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, formats: selectedFormats, title, tone, customInstructions }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error || 'Generation failed', 'error');
        setOutputs((prev) => prev.map((o) => ({ ...o, status: 'error', error: err.error })));
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (eventType === 'format-start') {
              setOutputs((prev) =>
                prev.map((o) => (o.format === data.format ? { ...o, status: 'streaming' } : o))
              );
            } else if (eventType === 'text') {
              setOutputs((prev) =>
                prev.map((o) =>
                  o.format === data.format ? { ...o, content: o.content + data.text } : o
                )
              );
            } else if (eventType === 'format-done') {
              setOutputs((prev) =>
                prev.map((o) => (o.format === data.format ? { ...o, status: 'done' } : o))
              );
            } else if (eventType === 'error') {
              setOutputs((prev) =>
                prev.map((o) =>
                  o.format === data.format ? { ...o, status: 'error', error: data.error } : o
                )
              );
            } else if (eventType === 'complete') {
              setSourceId(data.sourceId);
            }
          }
        }
      }

      toast('All content generated successfully!', 'success');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast('Connection lost during generation', 'error');
        setOutputs((prev) =>
          prev.map((o) => (o.status !== 'done' ? { ...o, status: 'error', error: 'Connection lost' } : o))
        );
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setGenerating(false);
    toast('Generation stopped', 'info');
  }

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard!', 'success');
  }, [toast]);

  async function handleRate(format: OutputFormat, rating: 'up' | 'down') {
    setOutputs((prev) =>
      prev.map((o) => (o.format === format ? { ...o, rating: o.rating === rating ? null : rating } : o))
    );
  }

  function toggleEdit(format: OutputFormat) {
    setOutputs((prev) =>
      prev.map((o) => {
        if (o.format !== format) return o;
        if (o.isEditing) {
          toast('Changes saved', 'success');
          return { ...o, isEditing: false, editedContent: o.editedContent };
        }
        return { ...o, isEditing: true, editedContent: o.editedContent ?? o.content };
      })
    );
  }

  function updateEditContent(format: OutputFormat, text: string) {
    setOutputs((prev) =>
      prev.map((o) => (o.format === format ? { ...o, editedContent: text } : o))
    );
  }

  async function handleRegenerate(format: OutputFormat) {
    if (!sourceId) {
      toast('No source available for regeneration', 'error');
      return;
    }

    setOutputs((prev) =>
      prev.map((o) => (o.format === format ? { ...o, content: '', editedContent: null, status: 'streaming', isEditing: false, rating: null } : o))
    );

    try {
      const res = await fetch('/api/outputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, format, tone, customInstructions }),
      });

      if (!res.ok) {
        toast('Regeneration failed', 'error');
        setOutputs((prev) =>
          prev.map((o) => (o.format === format ? { ...o, status: 'error', error: 'Regeneration failed' } : o))
        );
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'text') {
              setOutputs((prev) =>
                prev.map((o) => (o.format === format ? { ...o, content: o.content + data.text } : o))
              );
            } else if (eventType === 'done') {
              setOutputs((prev) =>
                prev.map((o) => (o.format === format ? { ...o, status: 'done' } : o))
              );
            } else if (eventType === 'error') {
              setOutputs((prev) =>
                prev.map((o) => (o.format === format ? { ...o, status: 'error', error: data.error } : o))
              );
            }
          }
        }
      }

      toast(`${FORMAT_LABELS[format]} regenerated!`, 'success');
    } catch {
      toast('Regeneration failed', 'error');
      setOutputs((prev) =>
        prev.map((o) => (o.format === format ? { ...o, status: 'error', error: 'Connection lost' } : o))
      );
    }
  }

  function exportAll() {
    const doneOutputs = outputs.filter((o) => o.status === 'done');
    if (doneOutputs.length === 0) return;

    const markdown = doneOutputs
      .map((o) => `# ${FORMAT_LABELS[o.format]}\n\n${o.editedContent ?? o.content}`)
      .join('\n\n---\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'repurposed-content'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported as Markdown!', 'success');
  }

  function getCharCount(text: string) {
    return text.length;
  }

  function getWordCount(text: string) {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const doneCount = outputs.filter((o) => o.status === 'done').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top Bar */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Content Repurposer
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>
            <Link href="/history" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition">
              History
            </Link>
            <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">{session.user?.name || session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-red-500 hover:text-red-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Content Input */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Content</h2>
            <span className="text-sm text-gray-500">{wordCount} words</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full mb-3 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your podcast transcript, blog post, article, or any text content here..."
            rows={10}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y transition"
          />
        </section>

        {/* Options Row */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Tone</h3>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    tone === t.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Custom Instructions (optional)</h3>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Always include hashtags, keep it under 100 words..."
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Format Selector */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Output Formats</h2>
            <button onClick={selectAll} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
              {selectedFormats.length === ALL_FORMATS.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ALL_FORMATS.map((format) => (
              <button
                key={format}
                onClick={() => toggleFormat(format)}
                className={`p-3 sm:p-4 rounded-xl border-2 text-left transition ${
                  selectedFormats.includes(format)
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-2 ${
                  selectedFormats.includes(format) ? 'bg-violet-600' : 'bg-gray-400 dark:bg-gray-600'
                }`}>
                  {FORMAT_LABELS[format].charAt(0)}
                </div>
                <p className="text-xs sm:text-sm font-medium">{FORMAT_LABELS[format]}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Generate Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generating || !content.trim() || selectedFormats.length === 0}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-lg font-semibold rounded-2xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 transition"
          >
            {generating ? 'Generating...' : 'Repurpose Content'}
          </button>
          {generating && (
            <button
              onClick={handleStop}
              className="px-6 py-4 bg-red-500 text-white rounded-2xl font-medium hover:bg-red-600 transition"
            >
              Stop
            </button>
          )}
          <span className="text-xs text-gray-400">Ctrl+Enter</span>
        </div>

        {/* Outputs */}
        <AnimatePresence>
          {outputs.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Generated Content</h2>
                {doneCount > 0 && (
                  <button
                    onClick={exportAll}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    Export All (.md)
                  </button>
                )}
              </div>

              {outputs.map((output) => {
                const displayContent = output.editedContent ?? output.content;
                const charLimit = FORMAT_CHAR_LIMITS[output.format];

                return (
                  <motion.div
                    key={output.format}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                          {FORMAT_LABELS[output.format].charAt(0)}
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base">{FORMAT_LABELS[output.format]}</h3>
                        {output.status === 'streaming' && (
                          <span className="text-xs text-violet-600 dark:text-violet-400 animate-pulse">Generating...</span>
                        )}
                        {output.status === 'pending' && (
                          <span className="text-xs text-gray-400">Waiting...</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      {output.status === 'done' && (
                        <div className="flex items-center gap-1 sm:gap-2">
                          {/* Thumbs up/down */}
                          <button
                            onClick={() => handleRate(output.format, 'up')}
                            className={`p-1.5 rounded-lg transition ${output.rating === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-950' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Good output"
                          >
                            <svg className="w-4 h-4" fill={output.rating === 'up' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" /><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
                          </button>
                          <button
                            onClick={() => handleRate(output.format, 'down')}
                            className={`p-1.5 rounded-lg transition ${output.rating === 'down' ? 'text-red-600 bg-red-50 dark:bg-red-950' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Poor output"
                          >
                            <svg className="w-4 h-4" fill={output.rating === 'down' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" /><path d="M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" /></svg>
                          </button>

                          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

                          {/* Edit */}
                          <button
                            onClick={() => toggleEdit(output.format)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              output.isEditing
                                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {output.isEditing ? 'Save' : 'Edit'}
                          </button>

                          {/* Regenerate */}
                          <button
                            onClick={() => handleRegenerate(output.format)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                            title="Regenerate this format"
                          >
                            Redo
                          </button>

                          {/* Copy */}
                          <button
                            onClick={() => copyToClipboard(displayContent)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="px-4 sm:px-6 py-4">
                      {output.status === 'error' ? (
                        <p className="text-red-500 text-sm">{output.error}</p>
                      ) : output.isEditing ? (
                        <textarea
                          value={output.editedContent ?? output.content}
                          onChange={(e) => updateEditContent(output.format, e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-violet-500 resize-y"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                          {output.content || (output.status === 'pending' && (
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer: char/word count */}
                    {output.status === 'done' && (
                      <div className="px-4 sm:px-6 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs text-gray-400">
                        <span>{getCharCount(displayContent)} chars</span>
                        <span>{getWordCount(displayContent)} words</span>
                        {charLimit && (
                          <span className={getCharCount(displayContent) > charLimit ? 'text-red-500 font-medium' : ''}>
                            {charLimit - getCharCount(displayContent) >= 0
                              ? `${charLimit - getCharCount(displayContent)} chars remaining`
                              : `${getCharCount(displayContent) - charLimit} chars over limit`}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
