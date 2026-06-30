'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
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
  const MAX_FORMATS = 3;

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard!', 'success');
  }, [toast]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F6F3' }}>
        <div className="animate-pulse text-sm" style={{ color: '#6B6580' }}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  function toggleFormat(format: OutputFormat) {
    setSelectedFormats((prev) => {
      if (prev.includes(format)) return prev.filter((f) => f !== format);
      if (prev.length >= MAX_FORMATS) return prev;
      return [...prev, format];
    });
  }

  function selectAll() {
    setSelectedFormats([]);
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
              setOutputs((prev) => prev.map((o) => (o.format === data.format ? { ...o, status: 'streaming' } : o)));
            } else if (eventType === 'text') {
              setOutputs((prev) => prev.map((o) => o.format === data.format ? { ...o, content: o.content + data.text } : o));
            } else if (eventType === 'format-done') {
              setOutputs((prev) => prev.map((o) => (o.format === data.format ? { ...o, status: 'done' } : o)));
            } else if (eventType === 'error') {
              setOutputs((prev) => prev.map((o) => o.format === data.format ? { ...o, status: 'error', error: data.error } : o));
            } else if (eventType === 'complete') {
              setSourceId(data.sourceId);
            }
          }
        }
      }
      toast('All content generated!', 'success');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast('Connection lost during generation', 'error');
        setOutputs((prev) => prev.map((o) => (o.status !== 'done' ? { ...o, status: 'error', error: 'Connection lost' } : o)));
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

  function handleRate(format: OutputFormat, rating: 'up' | 'down') {
    setOutputs((prev) => prev.map((o) => (o.format === format ? { ...o, rating: o.rating === rating ? null : rating } : o)));
  }

  function toggleEdit(format: OutputFormat) {
    setOutputs((prev) => prev.map((o) => {
      if (o.format !== format) return o;
      if (o.isEditing) {
        toast('Changes saved', 'success');
        return { ...o, isEditing: false };
      }
      return { ...o, isEditing: true, editedContent: o.editedContent ?? o.content };
    }));
  }

  function updateEditContent(format: OutputFormat, text: string) {
    setOutputs((prev) => prev.map((o) => (o.format === format ? { ...o, editedContent: text } : o)));
  }

  async function handleRegenerate(format: OutputFormat) {
    if (!sourceId) { toast('No source available for regeneration', 'error'); return; }
    setOutputs((prev) => prev.map((o) => (o.format === format ? { ...o, content: '', editedContent: null, status: 'streaming', isEditing: false, rating: null } : o)));

    try {
      const res = await fetch('/api/outputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, format, tone, customInstructions }),
      });
      if (!res.ok) {
        toast('Regeneration failed', 'error');
        setOutputs((prev) => prev.map((o) => (o.format === format ? { ...o, status: 'error', error: 'Regeneration failed' } : o)));
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
          if (line.startsWith('event: ')) eventType = line.slice(7);
          else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'text') setOutputs((prev) => prev.map((o) => (o.format === format ? { ...o, content: o.content + data.text } : o)));
            else if (eventType === 'done') setOutputs((prev) => prev.map((o) => (o.format === format ? { ...o, status: 'done' } : o)));
            else if (eventType === 'error') setOutputs((prev) => prev.map((o) => (o.format === format ? { ...o, status: 'error', error: data.error } : o)));
          }
        }
      }
      toast(`${FORMAT_LABELS[format]} regenerated!`, 'success');
    } catch {
      toast('Regeneration failed', 'error');
      setOutputs((prev) => prev.map((o) => (o.format === format ? { ...o, status: 'error', error: 'Connection lost' } : o)));
    }
  }

  function exportAll() {
    const doneOutputs = outputs.filter((o) => o.status === 'done');
    if (doneOutputs.length === 0) return;
    const markdown = doneOutputs.map((o) => `# ${FORMAT_LABELS[o.format]}\n\n${o.editedContent ?? o.content}`).join('\n\n---\n\n');
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'repurposed-content'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported as Markdown!', 'success');
  }

  function getCharCount(text: string) { return text.length; }
  function getWordCount(text: string) { return text.trim() ? text.trim().split(/\s+/).length : 0; }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const doneCount = outputs.filter((o) => o.status === 'done').length;

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
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/history" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: '#6B6580' }}>
              History
            </Link>
            <span className="hidden sm:inline text-sm" style={{ color: '#6B6580' }}>
              {session.user?.name || session.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: '#6B6580' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Content Input */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border p-6"
          style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.12)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-[family-name:var(--font-playfair)] text-lg font-semibold"
              style={{ color: '#2D2A3E' }}
            >
              Your Content
            </h2>
            <span className="text-xs" style={{ color: '#6B6580' }}>{wordCount} words</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full mb-3 px-4 py-2.5 rounded-xl border text-sm outline-none transition"
            style={{ borderColor: 'rgba(124,106,239,0.2)', backgroundColor: '#F8F6F3', color: '#2D2A3E' }}
            onFocus={(e) => (e.target.style.borderColor = '#7C6AEF')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(124,106,239,0.2)')}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your podcast transcript, blog post, article, or any text here..."
            rows={10}
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-y transition leading-relaxed"
            style={{ borderColor: 'rgba(124,106,239,0.2)', backgroundColor: '#F8F6F3', color: '#2D2A3E' }}
            onFocus={(e) => (e.target.style.borderColor = '#7C6AEF')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(124,106,239,0.2)')}
          />
        </motion.section>

        {/* Tone + Custom Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.12)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#2D2A3E' }}>Tone</h3>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                  style={
                    tone === t.value
                      ? { backgroundColor: '#7C6AEF', color: 'white' }
                      : { backgroundColor: '#F0EDFA', color: '#6B6580' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.12)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#2D2A3E' }}>Custom Instructions</h3>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., always include hashtags, keep under 100 words..."
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition"
              style={{ borderColor: 'rgba(124,106,239,0.2)', backgroundColor: '#F8F6F3', color: '#2D2A3E' }}
              onFocus={(e) => (e.target.style.borderColor = '#7C6AEF')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(124,106,239,0.2)')}
            />
          </div>
        </motion.div>

        {/* Format Selector */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="rounded-2xl border p-6"
          style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.12)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-[family-name:var(--font-playfair)] text-lg font-semibold" style={{ color: '#2D2A3E' }}>
                Output Formats
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#6B6580' }}>
                {selectedFormats.length}/{MAX_FORMATS} selected
              </p>
            </div>
            {selectedFormats.length > 0 && (
              <button
                onClick={selectAll}
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: '#7C6AEF' }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ALL_FORMATS.map((format) => {
              const isSelected = selectedFormats.includes(format);
              const isDisabled = !isSelected && selectedFormats.length >= MAX_FORMATS;
              return (
                <button
                  key={format}
                  onClick={() => toggleFormat(format)}
                  disabled={isDisabled}
                  className="p-4 rounded-xl border-2 text-left transition-all duration-200 disabled:cursor-not-allowed"
                  style={
                    isSelected
                      ? { borderColor: '#7C6AEF', backgroundColor: '#F0EDFA' }
                      : isDisabled
                      ? { borderColor: 'rgba(124,106,239,0.08)', backgroundColor: 'transparent', opacity: 0.4 }
                      : { borderColor: 'rgba(124,106,239,0.15)', backgroundColor: 'transparent' }
                  }
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-2"
                    style={{ backgroundColor: isSelected ? '#7C6AEF' : '#C4BDD8' }}
                  >
                    {FORMAT_LABELS[format].charAt(0)}
                  </div>
                  <p className="text-xs font-medium" style={{ color: '#2D2A3E' }}>{FORMAT_LABELS[format]}</p>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Generate Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-2">
          <motion.button
            onClick={handleGenerate}
            disabled={generating || !content.trim() || selectedFormats.length === 0}
            className="w-full sm:w-auto px-10 py-4 rounded-full text-base font-medium text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#7C6AEF', boxShadow: '0 8px 30px rgba(124,106,239,0.25)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {generating ? 'Generating...' : 'Repurpose Content'}
          </motion.button>
          {generating && (
            <button
              onClick={handleStop}
              className="px-6 py-4 rounded-full text-sm font-medium text-white transition"
              style={{ backgroundColor: '#E8C4A0', color: '#2D2A3E' }}
            >
              Stop
            </button>
          )}
          <span className="text-xs" style={{ color: '#6B6580' }}>Ctrl+Enter</span>
        </div>

        {/* Outputs */}
        <AnimatePresence>
          {outputs.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2
                  className="font-[family-name:var(--font-playfair)] text-xl font-semibold"
                  style={{ color: '#2D2A3E' }}
                >
                  Generated Content
                </h2>
                {doneCount > 0 && (
                  <button
                    onClick={exportAll}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ backgroundColor: '#F0EDFA', color: '#7C6AEF' }}
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
                    className="rounded-2xl border overflow-hidden"
                    style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.12)' }}
                  >
                    {/* Card Header */}
                    <div
                      className="flex items-center justify-between px-5 py-3 border-b"
                      style={{ borderColor: 'rgba(124,106,239,0.08)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: '#7C6AEF' }}
                        >
                          {FORMAT_LABELS[output.format].charAt(0)}
                        </div>
                        <h3 className="font-medium text-sm" style={{ color: '#2D2A3E' }}>{FORMAT_LABELS[output.format]}</h3>
                        {output.status === 'streaming' && (
                          <span className="text-xs animate-pulse" style={{ color: '#7C6AEF' }}>Generating...</span>
                        )}
                        {output.status === 'pending' && (
                          <span className="text-xs" style={{ color: '#6B6580' }}>Waiting...</span>
                        )}
                      </div>

                      {output.status === 'done' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRate(output.format, 'up')}
                            className="p-1.5 rounded-lg transition"
                            style={{ color: output.rating === 'up' ? '#16a34a' : '#6B6580' }}
                            title="Good output"
                          >
                            <svg className="w-4 h-4" fill={output.rating === 'up' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" /><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
                          </button>
                          <button
                            onClick={() => handleRate(output.format, 'down')}
                            className="p-1.5 rounded-lg transition"
                            style={{ color: output.rating === 'down' ? '#dc2626' : '#6B6580' }}
                            title="Poor output"
                          >
                            <svg className="w-4 h-4" fill={output.rating === 'down' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" /><path d="M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" /></svg>
                          </button>
                          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'rgba(124,106,239,0.15)' }} />
                          <button
                            onClick={() => toggleEdit(output.format)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                            style={output.isEditing
                              ? { backgroundColor: '#F0EDFA', color: '#7C6AEF' }
                              : { backgroundColor: '#F8F6F3', color: '#6B6580' }
                            }
                          >
                            {output.isEditing ? 'Save' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleRegenerate(output.format)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition hover:opacity-70"
                            style={{ backgroundColor: '#F8F6F3', color: '#6B6580' }}
                          >
                            Redo
                          </button>
                          <button
                            onClick={() => copyToClipboard(displayContent)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition hover:opacity-80"
                            style={{ backgroundColor: '#7C6AEF', color: 'white' }}
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="px-5 py-4">
                      {output.status === 'error' ? (
                        <p className="text-sm" style={{ color: '#dc2626' }}>{output.error}</p>
                      ) : output.isEditing ? (
                        <textarea
                          value={output.editedContent ?? output.content}
                          onChange={(e) => updateEditContent(output.format, e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-y leading-relaxed"
                          style={{ borderColor: 'rgba(124,106,239,0.2)', backgroundColor: '#F8F6F3', color: '#2D2A3E' }}
                          onFocus={(e) => (e.target.style.borderColor = '#7C6AEF')}
                          onBlur={(e) => (e.target.style.borderColor = 'rgba(124,106,239,0.2)')}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#2D2A3E' }}>
                          {output.content || (output.status === 'pending' && (
                            <div className="space-y-2">
                              <div className="h-3 rounded-full animate-pulse w-3/4" style={{ backgroundColor: '#F0EDFA' }} />
                              <div className="h-3 rounded-full animate-pulse w-1/2" style={{ backgroundColor: '#F0EDFA' }} />
                              <div className="h-3 rounded-full animate-pulse w-2/3" style={{ backgroundColor: '#F0EDFA' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {output.status === 'done' && (
                      <div
                        className="px-5 py-2 border-t flex items-center gap-4 text-xs"
                        style={{ borderColor: 'rgba(124,106,239,0.08)', color: '#6B6580' }}
                      >
                        <span>{getCharCount(displayContent)} chars</span>
                        <span>{getWordCount(displayContent)} words</span>
                        {charLimit && (
                          <span style={{ color: getCharCount(displayContent) > charLimit ? '#dc2626' : '#6B6580' }}>
                            {charLimit - getCharCount(displayContent) >= 0
                              ? `${charLimit - getCharCount(displayContent)} remaining`
                              : `${getCharCount(displayContent) - charLimit} over limit`}
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
