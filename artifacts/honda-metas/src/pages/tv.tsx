import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpRight, Maximize2, Monitor, Target, Volume2, VolumeX } from 'lucide-react';
import { CelebrationOverlay } from '@/components/celebration-overlay';
import { HondaMark } from '@/components/honda-mark';
import { CATEGORY_META, getTotal, useSalesState, type SaleCategory } from '@/lib/sales-store';
import { playSaleChime, unlockAudio } from '@/lib/showroom-audio';

const categories: SaleCategory[] = ['moto', 'consortium'];

export default function TvPage() {
  const sales = useSalesState();
  const [soundOn, setSoundOn] = useState(() => {
    try { return window.localStorage.getItem('honda-metas-sound') !== 'off'; } catch { return true; }
  });
  const [celebration, setCelebration] = useState<{ category: SaleCategory; direction: 'add' | 'remove'; id: number } | null>(null);
  const lastActionKey = useRef<string | null>(null);
  const total = getTotal(sales);
  const totalGoal = Object.values(sales.goals).reduce((sum, goal) => sum + goal, 0);
  const overallPercent = Math.min(100, Math.round((total / totalGoal) * 100));
  const today = useMemo(() => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date()), []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    const action = sales.lastAction;
    if (!action) return;
    const key = `${action.at}-${action.category}-${action.direction}`;
    if (lastActionKey.current === null) {
      lastActionKey.current = key;
      return;
    }
    if (lastActionKey.current === key) return;
    lastActionKey.current = key;
    setCelebration({ ...action, id: action.at });
    playSaleChime(soundOn);
  }, [sales.lastAction, soundOn]);

  const toggleSound = useCallback(() => {
    unlockAudio();
    setSoundOn((value) => {
      const next = !value;
      try { window.localStorage.setItem('honda-metas-sound', next ? 'on' : 'off'); } catch { /* local preference */ }
      return next;
    });
  }, []);

  const enterFullscreen = useCallback(() => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
  }, []);

  return (
    <main className="tv-board grain tv-scanline min-h-[100dvh] overflow-hidden bg-[#101a23] text-[#fffaf0]" data-testid="page-tv">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_10%,rgba(228,5,33,.18),transparent_29%),radial-gradient(circle_at_12%_90%,rgba(240,179,35,.09),transparent_30%)]" />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1800px] flex-col px-5 py-5 sm:px-9 sm:py-7 lg:px-14 lg:py-9">
        <header className="flex items-center justify-between border-b border-white/10 pb-5 sm:pb-7">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white px-2 py-2"><HondaMark compact /></div>
            <div className="hidden border-l border-white/15 pl-4 sm:block">
              <div className="text-[10px] font-bold uppercase tracking-[.3em] text-[#f0b323]">Comando de vendas</div>
              <div className="mt-1 text-sm font-medium capitalize text-[#c6d0ce]">{today}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleSound} className="flex h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-xs font-bold uppercase tracking-[.12em] text-[#c6d0ce] transition hover:border-white/35 hover:text-white" data-testid="button-toggle-sound">
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="hidden sm:inline">{soundOn ? 'Som ligado' : 'Som desligado'}</span>
            </button>
            <button onClick={enterFullscreen} className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-bold uppercase tracking-[.12em] text-white transition hover:bg-white/20" data-testid="button-fullscreen">
              <Maximize2 size={16} /><span className="hidden sm:inline">Tela cheia</span>
            </button>
            <Link href="/controle" className="flex h-10 items-center gap-2 rounded-full border border-[#e40521]/50 px-3 text-xs font-bold uppercase tracking-[.12em] text-[#ff7e8d] transition hover:bg-[#e40521] hover:text-white" data-testid="link-tv-control">
              Controle <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8 sm:py-12">
          <div className="enter-up flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.28em] text-[#f0b323]">
                <span className="h-2 w-2 rounded-full bg-[#e40521] shadow-[0_0_0_5px_rgba(228,5,33,.16)]" /> Placar de hoje
              </div>
              <h1 className="mt-4 max-w-4xl font-display text-[clamp(4rem,11vw,10rem)] font-extrabold uppercase leading-[.78] tracking-[-.045em] text-[#fffaf0]" data-testid="text-tv-headline">
                Acelere<br /><span className="text-[#e40521]">o ritmo.</span>
              </h1>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-[#aebbb9] sm:text-base">Cada entrega move o time. Cada conquista aproxima a nossa meta.</p>
            </div>
            <div className="lg:pb-1 lg:text-right">
              <div className="text-[10px] font-bold uppercase tracking-[.28em] text-[#8d9b9e]">Total de vendas</div>
              <div className="mt-1 font-display text-[clamp(6rem,14vw,12rem)] font-extrabold leading-[.78] tracking-[-.05em] text-white" data-testid="text-tv-total">{total}</div>
              <div className="mt-4 flex items-center gap-2 text-sm text-[#aebbb9] lg:justify-end"><Target size={16} className="text-[#f0b323]" /> {overallPercent}% da meta geral</div>
            </div>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-2 md:gap-4 lg:mt-16">
            {categories.map((category, index) => {
              const meta = CATEGORY_META[category];
              const count = sales.counts[category];
              const goal = sales.goals[category];
              const percent = Math.min(100, Math.round((count / goal) * 100));
              return (
                <div key={category} className={`enter-up enter-up-delay-${index + 1} group relative overflow-hidden rounded-[18px] border border-white/10 bg-white/[.045] p-5 transition hover:bg-white/[.07] sm:p-7`} data-testid={`card-tv-category-${category}`}>
                  <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: meta.color }} />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: meta.color }}>{meta.shortLabel}</div>
                      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">{meta.label}</h2>
                    </div>
                    <div className="font-display text-5xl font-extrabold leading-none text-white sm:text-6xl" data-testid={`text-tv-count-${category}`}>{count}</div>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-xs text-[#9caaa9]"><span>Meta {goal}</span><span className="font-bold text-[#dce3df]">{percent}%</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="progress-fill h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: meta.color }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-white/10 pt-5 text-[10px] font-bold uppercase tracking-[.2em] text-[#718082] sm:pt-7">
          <span className="flex items-center gap-2"><Monitor size={14} /> Showroom command center</span>
          <span>Honda Motos <span className="mx-2 text-[#e40521]">/</span> Juntos no próximo giro</span>
        </footer>
      </div>
      <CelebrationOverlay celebration={celebration} onDismiss={() => setCelebration(null)} />
    </main>
  );
}