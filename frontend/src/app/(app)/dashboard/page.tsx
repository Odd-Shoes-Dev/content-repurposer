'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/toast';
import { sanitize } from '@/lib/sanitize';
import { config } from '@/lib/config';
import type { OutputFormat, Tone } from '@/types';
import { FORMAT_LABELS, FORMAT_CHAR_LIMITS } from '@/types';

const ALL_FORMATS = Object.keys(FORMAT_LABELS) as OutputFormat[];
const MAX_CONTENT = 50000;
const MAX_TITLE = 120;
const MAX_INSTRUCTIONS = 300;

const TONES: { value: Tone; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professional', desc: 'Polished & formal' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed & friendly' },
  { value: 'humorous', label: 'Humorous', desc: 'Light & witty' },
  { value: 'authoritative', label: 'Authoritative', desc: 'Expert & confident' },
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

const FORMAT_DESCS: Record<OutputFormat, string> = {
  blog: 'Long-form article',
  linkedin: 'Up to 3,000 chars',
  twitter_thread: '280 chars per tweet',
  video_script: 'Narration + cues',
  newsletter: 'Newsletter format',
  quote_graphics: 'Shareable quotes',
  carousel: 'Slide-by-slide',
  takeaways: 'Key points + FAQs',
};

function StatsCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1 px-5 py-4 rounded-sm border"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-body)' }}>
        <span style={{ color: 'var(--color-brand)' }}>{icon}</span>
        {label}
      </div>
      <div className="text-xl font-semibold font-[family-name:var(--font-playfair)]" style={{ color: 'var(--color-text-head)' }}>
        {value}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<OutputFormat[]>([]);
  const [tone, setTone] = useState<Tone>('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [outputs, setOutputs] = useState<OutputState[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ wordCount: number; totalOutputs: number; topPlatform: string } | null>(null);
  const [planKey, setPlanKey] = useState<keyof typeof config.plans>('free');

  const maxFormats = config.plans[planKey].maxFormatsPerRun;

  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  // Load stats + plan in parallel
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then((data: { wordCount?: number; totalOutputs?: number; topPlatform?: string }) => {
        setStats({
          wordCount: data.wordCount ?? 0,
          totalOutputs: data.totalOutputs ?? 0,
          topPlatform: data.topPlatform ?? '—',
        });
      }).catch(() => {});

    fetch('/api/payments/subscription')
      .then(r => r.ok ? r.json() as Promise<{ plan: string }> : Promise.resolve({ plan: 'free' }))
      .then(d => {
        const key = d.plan as keyof typeof config.plans;
        setPlanKey(key in config.plans ? key : 'free');
      }).catch(() => {});
  }, []);

  // Ctrl+Enter to generate
  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast('Copied!', 'success');
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

  const name = (session?.user as { name?: string })?.name ?? '';
  const firstName = name.split(' ')[0] || 'there';

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function toggleFormat(format: OutputFormat) {
    setSelectedFormats((prev) => {
      if (prev.includes(format)) return prev.filter((f) => f !== format);
      if (prev.length >= maxFormats) return prev;
      return [...prev, format];
    });
  }

  const canGenerate = !generating && content.trim().length > 0 && selectedFormats.length > 0
    && content.length <= MAX_CONTENT && title.length <= MAX_TITLE && customInstructions.length <= MAX_INSTRUCTIONS;

  async function handleGenerate() {
    if (!canGenerate) return;
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
        body: JSON.stringify({
          content: sanitize(content),
          formats: selectedFormats,
          title: sanitize(title),
          tone,
          customInstructions: sanitize(customInstructions),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
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
            const data = JSON.parse(line.slice(6)) as { format?: OutputFormat; text?: string; error?: string; sourceId?: string };
            if (eventType === 'format-start') {
              setOutputs((prev) => prev.map((o) => (o.format === data.format ? { ...o, status: 'streaming' } : o)));
            } else if (eventType === 'text') {
              setOutputs((prev) => prev.map((o) => o.format === data.format ? { ...o, content: o.content + (data.text ?? '') } : o));
            } else if (eventType === 'format-done') {
              setOutputs((prev) => prev.map((o) => (o.format === data.format ? { ...o, status: 'done' } : o)));
            } else if (eventType === 'error') {
              setOutputs((prev) => prev.map((o) => o.format === data.format ? { ...o, status: 'error', error: data.error } : o));
            } else if (eventType === 'complete') {
              setSourceId(data.sourceId ?? null);
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
      if (o.isEditing) { toast('Changes saved', 'success'); return { ...o, isEditing: false }; }
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
            const data = JSON.parse(line.slice(6)) as { text?: string; error?: string };
            if (eventType === 'text') setOutputs((prev) => prev.map((o) => (o.format === format ? { ...o, content: o.content + (data.text ?? '') } : o)));
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
    const done = outputs.filter((o) => o.status === 'done');
    if (!done.length) return;
    const md = done.map((o) => `# ${FORMAT_LABELS[o.format]}\n\n${o.editedContent ?? o.content}`).join('\n\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title || 'repurposed'}.md`; a.click();
    URL.revokeObjectURL(url);
    toast('Exported!', 'success');
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const doneCount = outputs.filter((o) => o.status === 'done').length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-7">

        {/* Welcome header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-[family-name:var(--font-playfair)] text-2xl sm:text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text-head)' }}>
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-body)' }}>
            What would you like to repurpose today?
          </p>
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <StatsCard
                label="Words generated"
                value={stats.wordCount.toLocaleString()}
                icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
              />
              <StatsCard
                label="Top platform"
                value={stats.topPlatform}
                icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
              />
              <StatsCard
                label="Total outputs"
                value={stats.totalOutputs}
                icon={<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
              />
            </div>
          )}
        </motion.div>

        {/* Content input */}
        <motion.section
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06 }}
          className="rounded-sm border p-6"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="font-[family-name:var(--font-playfair)] text-base font-semibold mb-4" style={{ color: 'var(--color-text-head)' }}>
            Your Content
          </h2>

          {/* Title */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-body)' }}>Title (optional)</label>
              <span className="text-xs" style={{ color: title.length > MAX_TITLE ? 'var(--color-danger)' : 'var(--color-text-body)' }}>
                {title.length}/{MAX_TITLE}
              </span>
            </div>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your content a title"
              maxLength={MAX_TITLE + 10}
              className="w-full px-4 py-2.5 rounded-sm border text-sm outline-none transition"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-body)' }}>Content</label>
              <span className="text-xs" style={{ color: content.length > MAX_CONTENT ? 'var(--color-danger)' : 'var(--color-text-body)' }}>
                {wordCount} words · {content.length}/{MAX_CONTENT.toLocaleString()}
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your podcast transcript, blog post, article, or any text here..."
              className="w-full px-4 py-3 rounded-sm border text-sm outline-none resize-none transition leading-relaxed"
              style={{
                borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)',
                minHeight: '120px', overflow: 'hidden',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </div>
        </motion.section>

        {/* Tone + Custom Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <div className="rounded-sm border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-body)' }}>Tone</h3>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((t) => {
                const active = tone === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className="px-3 py-2.5 text-left rounded-sm border text-sm font-medium transition-all duration-200"
                    style={active
                      ? { borderColor: 'var(--color-brand)', borderLeftWidth: '3px', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-head)' }
                      : { borderColor: 'var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-body)' }
                    }
                  >
                    <div style={{ color: active ? 'var(--color-text-head)' : 'var(--color-text-body)', fontWeight: active ? 600 : 400 }}>{t.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-body)', opacity: 0.7 }}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-sm border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-body)' }}>Custom Instructions</h3>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., always include 3 hashtags, keep it under 100 words, use bullet points..."
              rows={4}
              className="w-full px-4 py-3 rounded-sm border text-sm outline-none resize-none transition leading-relaxed"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs" style={{ color: customInstructions.length > MAX_INSTRUCTIONS ? 'var(--color-danger)' : 'var(--color-text-body)' }}>
                {customInstructions.length}/{MAX_INSTRUCTIONS}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Format Selector */}
        <motion.section
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.14 }}
          className="rounded-sm border p-6"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-[family-name:var(--font-playfair)] text-base font-semibold" style={{ color: 'var(--color-text-head)' }}>
                Output Formats
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-body)' }}>
                Select up to {maxFormats} · {selectedFormats.length}/{maxFormats} chosen
                {selectedFormats.length >= maxFormats && planKey !== 'pro' && planKey !== 'agency' && (
                  <a href="/settings" className="ml-2 underline" style={{ color: 'var(--color-brand)' }}>
                    Upgrade for more
                  </a>
                )}
              </p>
            </div>
            {selectedFormats.length > 0 && (
              <button onClick={() => setSelectedFormats([])} className="text-xs hover:opacity-70 transition-opacity" style={{ color: 'var(--color-brand)' }}>
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ALL_FORMATS.map((format) => {
              const isSelected = selectedFormats.includes(format);
              const isDisabled = !isSelected && selectedFormats.length >= maxFormats;
              return (
                <button
                  key={format}
                  onClick={() => toggleFormat(format)}
                  disabled={isDisabled}
                  className="p-4 rounded-sm border text-left transition-all duration-200 relative overflow-hidden disabled:cursor-not-allowed"
                  style={
                    isSelected
                      ? { borderColor: 'var(--color-brand)', borderLeftWidth: '3px', backgroundColor: 'var(--color-bg-subtle)' }
                      : isDisabled
                      ? { borderColor: 'var(--color-border)', backgroundColor: 'transparent', opacity: 0.35 }
                      : { borderColor: 'var(--color-border)', backgroundColor: 'transparent' }
                  }
                >
                  {/* Decorative kite shape */}
                  <svg
                    className="absolute top-2 right-2 opacity-20"
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                  >
                    <path d="M7 0L14 7L7 14L0 7Z" fill={isSelected ? 'var(--color-brand)' : 'var(--color-text-body)'} />
                  </svg>
                  <div
                    className="w-7 h-7 rounded-sm flex items-center justify-center text-white font-bold text-xs mb-2"
                    style={{ backgroundColor: isSelected ? 'var(--color-brand)' : 'var(--color-text-body)', opacity: isSelected ? 1 : 0.5 }}
                  >
                    {FORMAT_LABELS[format].charAt(0)}
                  </div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: isSelected ? 'var(--color-text-head)' : 'var(--color-text-body)' }}>
                    {FORMAT_LABELS[format]}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-body)', opacity: 0.7 }}>
                    {FORMAT_DESCS[format] ?? ''}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Generate button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center py-2">
          <motion.button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full sm:w-auto px-10 py-4 rounded-sm text-base font-medium text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--color-brand)',
              boxShadow: canGenerate ? '0 8px 30px rgba(124,106,239,0.3)' : 'none',
            }}
            animate={canGenerate ? {
              boxShadow: ['0 8px 30px rgba(124,106,239,0.3)', '0 8px 40px rgba(124,106,239,0.6)', '0 8px 30px rgba(124,106,239,0.3)'],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {generating ? 'Generating...' : 'Repurpose Content'}
          </motion.button>
          {generating && (
            <button
              onClick={handleStop}
              className="px-6 py-4 rounded-sm text-sm font-medium transition"
              style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-body)' }}
            >
              Stop
            </button>
          )}
          <span className="text-xs" style={{ color: 'var(--color-text-body)' }}>Ctrl+Enter</span>
        </div>

        {/* Outputs */}
        <AnimatePresence>
          {outputs.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold" style={{ color: 'var(--color-text-head)' }}>
                  Generated Content
                </h2>
                {doneCount > 0 && (
                  <button onClick={exportAll} className="px-4 py-2 rounded-sm text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-brand)' }}>
                    Export (.md)
                  </button>
                )}
              </div>

              {outputs.map((output) => {
                const displayContent = output.editedContent ?? output.content;
                const charLimit = FORMAT_CHAR_LIMITS[output.format];
                const chars = displayContent.length;
                const words = displayContent.trim() ? displayContent.trim().split(/\s+/).length : 0;

                return (
                  <motion.div
                    key={output.format} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-sm border overflow-hidden"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-sm flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: 'var(--color-brand)' }}>
                          {FORMAT_LABELS[output.format].charAt(0)}
                        </div>
                        <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-head)' }}>{FORMAT_LABELS[output.format]}</h3>
                        {output.status === 'streaming' && <span className="text-xs animate-pulse" style={{ color: 'var(--color-brand)' }}>Generating...</span>}
                        {output.status === 'pending' && <span className="text-xs" style={{ color: 'var(--color-text-body)' }}>Waiting...</span>}
                      </div>
                      {output.status === 'done' && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleRate(output.format, 'up')} className="p-1.5 rounded-sm transition"
                            style={{ color: output.rating === 'up' ? '#16a34a' : 'var(--color-text-body)' }} title="Good">
                            <svg className="w-4 h-4" fill={output.rating === 'up' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" /><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
                          </button>
                          <button onClick={() => handleRate(output.format, 'down')} className="p-1.5 rounded-sm transition"
                            style={{ color: output.rating === 'down' ? 'var(--color-danger)' : 'var(--color-text-body)' }} title="Poor">
                            <svg className="w-4 h-4" fill={output.rating === 'down' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" /><path d="M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" /></svg>
                          </button>
                          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />
                          <button onClick={() => toggleEdit(output.format)} className="px-3 py-1.5 rounded-sm text-xs font-medium transition"
                            style={output.isEditing
                              ? { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-brand)' }
                              : { backgroundColor: 'var(--color-bg)', color: 'var(--color-text-body)' }}>
                            {output.isEditing ? 'Save' : 'Edit'}
                          </button>
                          <button onClick={() => handleRegenerate(output.format)} className="px-3 py-1.5 rounded-sm text-xs font-medium transition hover:opacity-70"
                            style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-body)' }}>
                            Redo
                          </button>
                          <button onClick={() => copyToClipboard(displayContent)} className="px-3 py-1.5 rounded-sm text-xs font-medium text-white transition hover:opacity-80"
                            style={{ backgroundColor: 'var(--color-brand)' }}>
                            Copy
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="px-5 py-4">
                      {output.status === 'error' ? (
                        <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{output.error}</p>
                      ) : output.isEditing ? (
                        <textarea
                          value={output.editedContent ?? output.content}
                          onChange={(e) => updateEditContent(output.format, e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 rounded-sm border text-sm outline-none resize-y leading-relaxed"
                          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-head)' }}
                          onFocus={(e) => (e.target.style.borderColor = 'var(--color-brand)')}
                          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--color-text-head)' }}>
                          {output.content || (output.status === 'pending' && (
                            <div className="space-y-2">
                              {[0.75, 0.5, 0.65].map((w, i) => (
                                <div key={i} className="h-3 rounded-full animate-pulse" style={{ width: `${w * 100}%`, backgroundColor: 'var(--color-bg-subtle)' }} />
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {output.status === 'done' && (
                      <div className="px-5 py-2 border-t flex items-center gap-4 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-body)' }}>
                        <span>{chars} chars</span>
                        <span>{words} words</span>
                        {charLimit && (
                          <span style={{ color: chars > charLimit ? 'var(--color-danger)' : 'var(--color-text-body)' }}>
                            {chars <= charLimit ? `${charLimit - chars} remaining` : `${chars - charLimit} over limit`}
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
      </div>
    </div>
  );
}
