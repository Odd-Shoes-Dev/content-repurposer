'use client';

import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const FORMATS = [
  'Blog Article', 'LinkedIn', 'X Thread', 'Video Script',
  'Newsletter', 'Quotes', 'Carousel', 'Takeaways',
];

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function HexagonSVG({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 100 115" className={className} style={style} fill="currentColor">
      <path d="M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z" opacity="0.08" />
    </svg>
  );
}

function KiteSVG({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 80 120" className={className} style={style} fill="currentColor">
      <path d="M40 0 L80 50 L40 120 L0 50 Z" opacity="0.06" />
    </svg>
  );
}

interface FloatingShapeConfig {
  id: number;
  shape: 'hexagon' | 'kite';
  left: string;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

const FLOATING_SHAPES: FloatingShapeConfig[] = [
  { id: 1, shape: 'hexagon', left: '8%', size: 192, color: '#7C6AEF', duration: 42, delay: -10 },
  { id: 2, shape: 'kite', left: '19%', size: 112, color: '#E8C4A0', duration: 34, delay: -20 },
  { id: 3, shape: 'hexagon', left: '31%', size: 96, color: '#E8C4A0', duration: 48, delay: 4 },
  { id: 4, shape: 'kite', left: '44%', size: 144, color: '#7C6AEF', duration: 38, delay: -26 },
  { id: 5, shape: 'hexagon', left: '57%', size: 144, color: '#7C6AEF', duration: 52, delay: -35 },
  { id: 6, shape: 'kite', left: '69%', size: 176, color: '#E8C4A0', duration: 44, delay: 10 },
  { id: 7, shape: 'hexagon', left: '79%', size: 112, color: '#E8C4A0', duration: 36, delay: -14 },
  { id: 8, shape: 'kite', left: '88%', size: 128, color: '#7C6AEF', duration: 46, delay: 2 },
  { id: 9, shape: 'hexagon', left: '97%', size: 160, color: '#7C6AEF', duration: 50, delay: -40 },
  { id: 10, shape: 'kite', left: '38%', size: 64, color: '#E8C4A0', duration: 32, delay: 16 },
];

function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {FLOATING_SHAPES.map((s) => {
        const Shape = s.shape === 'hexagon' ? HexagonSVG : KiteSVG;
        return (
          <motion.div
            key={s.id}
            className="absolute bottom-0"
            style={{ left: s.left, width: s.size }}
            initial={{ y: '20vh', opacity: 0 }}
            animate={{ y: '-120vh', opacity: [0, 1, 1, 0] }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: 'linear',
              opacity: { duration: s.duration, times: [0, 0.1, 0.85, 1], repeat: Infinity, delay: s.delay },
            }}
          >
            <Shape className="w-full" style={{ color: s.color }} />
          </motion.div>
        );
      })}
    </div>
  );
}

function DrawLineSVG() {
  return (
    <svg
      viewBox="0 0 1600 60"
      preserveAspectRatio="none"
      className="hidden md:block h-12 w-full"
      fill="none"
    >
      <motion.path
        d="M-800 30 Q-600 5 -400 30 Q-200 55 0 30 Q200 5 400 30 Q600 55 800 30 Q1000 5 1200 30 Q1400 55 1600 30 Q1800 5 2000 30 Q2200 55 2400 30"
        stroke="#7C6AEF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="480 2400"
        opacity="0.4"
        animate={{ strokeDashoffset: [0, -2400] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

function PasteIcon() {
  return (
    <motion.svg viewBox="0 0 48 48" className="w-12 h-12" fill="none"
      initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.rect x="8" y="12" width="28" height="32" rx="4" stroke="#7C6AEF" strokeWidth="2.5"
        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.8 } } }} />
      <motion.path d="M16 8h12a2 2 0 012 2v4H14v-4a2 2 0 012-2z" stroke="#E8C4A0" strokeWidth="2.5"
        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.6, delay: 0.3 } } }} />
      <motion.line x1="16" y1="24" x2="30" y2="24" stroke="#7C6AEF" strokeWidth="2" strokeLinecap="round"
        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.4, delay: 0.6 } } }} />
      <motion.line x1="16" y1="30" x2="26" y2="30" stroke="#7C6AEF" strokeWidth="2" strokeLinecap="round"
        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.4, delay: 0.7 } } }} />
    </motion.svg>
  );
}

function SelectIcon() {
  return (
    <motion.svg viewBox="0 0 48 48" className="w-12 h-12" fill="none"
      initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.path d="M10 14 L24 6 L38 14 L38 30 L24 38 L10 30 Z" stroke="#7C6AEF" strokeWidth="2.5"
        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 1 } } }} />
      <motion.polyline points="18,22 23,27 32,16" stroke="#E8C4A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.5, delay: 0.6 } } }} />
    </motion.svg>
  );
}

function PublishIcon() {
  return (
    <motion.svg viewBox="0 0 48 48" className="w-12 h-12" fill="none"
      initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <motion.path d="M8 36 L24 8 L40 36 Z" stroke="#7C6AEF" strokeWidth="2.5" strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.9 } } }} />
      <motion.line x1="24" y1="20" x2="24" y2="28" stroke="#E8C4A0" strokeWidth="2.5" strokeLinecap="round"
        variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.4, delay: 0.5 } } }} />
      <motion.circle cx="24" cy="32" r="1.5" fill="#E8C4A0"
        variants={{ hidden: { scale: 0 }, visible: { scale: 1, transition: { duration: 0.3, delay: 0.8 } } }} />
    </motion.svg>
  );
}

export default function LandingPage() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const ctaHref = session ? '/dashboard' : '/auth/signin';

  return (
    <div className="min-h-screen" style={{ color: '#2D2A3E', scrollBehavior: 'smooth' }}>

      {/* ── Nav ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/80 backdrop-blur-md border-b border-[#E8C4A0]/20' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-[family-name:var(--font-playfair)] text-xl font-semibold tracking-tight" style={{ color: '#2D2A3E' }}>
            Repurposer
          </span>
          <div className="flex items-center gap-6">
            <Link href="/auth/signin" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: '#6B6580' }}>
              Log in
            </Link>
            <Link
              href={ctaHref}
              className="hidden sm:inline-block px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
              style={{ backgroundColor: '#7C6AEF' }}
            >
              {session ? 'Dashboard' : 'Get Started'}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 overflow-hidden">
        {/* Floating decorative shapes */}
        <FloatingShapes />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            style={{ opacity: heroOpacity, color: '#2D2A3E' }}
            className="font-[family-name:var(--font-playfair)] text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]"
          >
            Create once,{' '}
            <span style={{ color: '#7C6AEF' }}>publish everywhere</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            style={{ opacity: heroOpacity, color: '#6B6580' }}
            className="mt-6 text-lg md:text-xl max-w-xl mx-auto leading-relaxed"
          >
            Transform a single piece of content into perfectly crafted posts
            for every platform — powered by AI.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="mt-10"
          >
            <motion.a
              href={ctaHref}
              className="inline-block px-8 py-4 rounded-full text-lg font-medium text-white"
              animate={{
                backgroundColor: ['#7C6AEF', '#5a4bd1', '#7C6AEF', '#5a4bd1'],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.04 }}
            >
              Start repurposing — free
            </motion.a>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            style={{ opacity: heroOpacity, color: '#E8C4A0', letterSpacing: '0.15em' }}
            className="mt-12 text-sm tracking-wide uppercase"
          >
            All your social media, one source of truth
          </motion.p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 md:py-32 relative overflow-hidden" style={{ backgroundColor: '#F8F6F3' }}>
        <HexagonSVG className="absolute top-8 right-[5%] w-40" style={{ color: '#7C6AEF' }} />
        <KiteSVG className="absolute bottom-12 left-[3%] w-20" style={{ color: '#E8C4A0' }} />

        <motion.div
          className="max-w-5xl mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeInUp}
            className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold text-center tracking-tight mb-6"
            style={{ color: '#2D2A3E' }}
          >
            How it works
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-center mb-16 max-w-lg mx-auto" style={{ color: '#6B6580' }}>
            Three steps from raw content to platform-ready posts.
          </motion.p>
        </motion.div>

        <DrawLineSVG />

        <motion.div
          className="max-w-5xl mx-auto px-6 mt-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {[
              { icon: <PasteIcon />, title: 'Paste', desc: 'Drop in your transcript, article, or any long-form text.', offset: 'md:mt-0' },
              { icon: <SelectIcon />, title: 'Pick', desc: 'Choose which platforms you need content for.', offset: 'md:mt-8' },
              { icon: <PublishIcon />, title: 'Publish', desc: 'Get tailored content instantly. Copy, edit, share.', offset: 'md:mt-0' },
            ].map((step, i) => {
              const origins = [
                { x: -80, y: 60 },
                { x: 0,   y: 80 },
                { x: 80,  y: 60 },
              ];
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: origins[i].x, y: origins[i].y }}
                  whileInView={{ opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: false, margin: '-60px' }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
                  className={`text-center ${step.offset}`}
                >
                  <div className="flex justify-center mb-5">{step.icon}</div>
                  <h3
                    className="font-[family-name:var(--font-playfair)] text-xl font-semibold mb-2"
                    style={{ color: '#2D2A3E' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed max-w-[240px] mx-auto" style={{ color: '#6B6580' }}>
                    {step.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── Feature: Multi-Platform ── */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <KiteSVG className="absolute top-16 left-[2%] w-32" style={{ color: '#7C6AEF' }} />

        <motion.div
          className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp}>
            <h2
              className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold tracking-tight mb-6"
              style={{ color: '#2D2A3E' }}
            >
              Eight formats,{' '}
              <span style={{ color: '#7C6AEF' }}>one click</span>
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: '#6B6580' }}>
              From a single podcast transcript, generate a blog article, LinkedIn posts,
              an X thread, video scripts, a newsletter, quote graphics, a carousel,
              and key takeaways — all tuned for each platform.
            </p>
            <ul className="space-y-3">
              {['Tone control — professional to humorous', 'Custom instructions for your brand voice', 'Platform character limits enforced'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: '#6B6580' }}>
                  <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="#7C6AEF">
                    <path d="M10 2 L13 8 L10 6 L7 8 Z" />
                    <path d="M10 10 L13 16 L10 14 L7 16 Z" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={fadeInUp} className="relative">
            {/* SVG mockup of streaming output */}
            <motion.div
              animate={{ y: [0, -22, 0] }}
              transition={{
                duration: 1.9,
                repeat: Infinity,
                repeatDelay: 1.4,
                times: [0, 0.55, 1],
                ease: ['easeOut', 'easeIn'],
              }}
              className="rounded-2xl p-6 border relative overflow-hidden"
              style={{ backgroundColor: '#F0EDFA', borderColor: 'rgba(124,106,239,0.15)' }}
            >
              <div className="space-y-4">
                {['LinkedIn Post', 'X Thread', 'Blog Article'].map((format, i) => (
                  <motion.div
                    key={format}
                    className="rounded-xl p-4 border"
                    style={{ backgroundColor: 'white', borderColor: 'rgba(124,106,239,0.1)' }}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: '#7C6AEF' }}>{format}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F0EDFA', color: '#7C6AEF' }}>
                        Ready
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 rounded-full" style={{ backgroundColor: '#F0EDFA', width: `${85 - i * 15}%` }} />
                      <div className="h-2 rounded-full" style={{ backgroundColor: '#F0EDFA', width: `${65 - i * 10}%` }} />
                    </div>
                  </motion.div>
                ))}
              </div>
              <HexagonSVG className="absolute -bottom-6 -right-6 w-20" style={{ color: '#7C6AEF' }} />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Feature: History ── */}
      <section className="py-24 md:py-32 relative overflow-hidden" style={{ backgroundColor: '#F8F6F3' }}>
        <HexagonSVG className="absolute bottom-8 right-[4%] w-36" style={{ color: '#E8C4A0' }} />

        <motion.div
          className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="order-2 md:order-1">
            <div
              className="rounded-2xl p-6 border"
              style={{ backgroundColor: 'white', borderColor: 'rgba(232,196,160,0.2)' }}
            >
              {[
                { title: 'Product Launch Strategy', date: 'Today', count: 5 },
                { title: 'Podcast Ep. 42 Transcript', date: 'Yesterday', count: 8 },
                { title: 'Q3 Marketing Brief', date: '3 days ago', count: 3 },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  className="flex items-center justify-between py-4 border-b last:border-0"
                  style={{ borderColor: 'rgba(232,196,160,0.15)' }}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#2D2A3E' }}>{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6B6580' }}>{item.date} &middot; {item.count} outputs</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#F8F6F3', color: '#6B6580' }}>
                    View
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="order-1 md:order-2">
            <h2
              className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold tracking-tight mb-6"
              style={{ color: '#2D2A3E' }}
            >
              Every generation,{' '}
              <span style={{ color: '#7C6AEF' }}>always saved</span>
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: '#6B6580' }}>
              Your complete content history is preserved automatically. Browse, search,
              copy from past generations, and see which platforms you use most.
            </p>
            <p className="text-sm" style={{ color: '#6B6580' }}>
              Edit, favorite, and export anytime. Delete only what you choose to.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="py-16 md:py-20 overflow-hidden">
        <motion.div
          className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          {[
            { number: '8', label: 'Output Formats' },
            { number: '1-click', label: 'Copy & Export' },
            { number: '4', label: 'Tone Styles' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeInUp}>
              <p
                className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold mb-1"
                style={{ color: '#7C6AEF' }}
              >
                {stat.number}
              </p>
              <p className="text-sm" style={{ color: '#6B6580' }}>{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 md:py-32 relative overflow-hidden" style={{ backgroundColor: '#F0EDFA' }}>
        <HexagonSVG className="absolute top-10 left-[8%] w-28" style={{ color: '#7C6AEF' }} />
        <KiteSVG className="absolute bottom-10 right-[6%] w-20" style={{ color: '#E8C4A0' }} />

        <motion.div
          className="max-w-2xl mx-auto px-6 text-center relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeInUp}
            className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold tracking-tight mb-6"
            style={{ color: '#2D2A3E' }}
          >
            Start repurposing today
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-base mb-10" style={{ color: '#6B6580' }}>
            Three free requests to try. No credit card required.
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Link
              href={ctaHref}
              className="inline-block px-8 py-4 rounded-full text-lg font-medium text-white transition-all duration-300 hover:scale-[1.04] hover:shadow-xl"
              style={{ backgroundColor: '#7C6AEF', boxShadow: '0 8px 30px rgba(124,106,239,0.3)' }}
            >
              Get started — it&apos;s free
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12" style={{ backgroundColor: '#F8F6F3' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <span className="font-[family-name:var(--font-playfair)] text-sm font-medium" style={{ color: '#2D2A3E' }}>
              Repurposer
            </span>
            <p className="text-xs" style={{ color: '#6B6580' }}>
              Maximize your content, minimize your effort.
            </p>
          </div>
          <div className="border-t pt-6" style={{ borderColor: 'rgba(232,196,160,0.2)' }}>
            <p className="text-xs mb-3" style={{ color: '#6B6580' }}>Supported formats</p>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <span key={f} className="text-xs px-3 py-1 rounded-full" style={{ color: '#6B6580', backgroundColor: 'rgba(124,106,239,0.06)' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
