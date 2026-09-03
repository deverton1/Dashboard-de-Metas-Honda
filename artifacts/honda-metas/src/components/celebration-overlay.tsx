import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Check, X } from 'lucide-react';
import { CATEGORY_META, type SaleCategory, type SaleDirection } from '@/lib/sales-store';

type Celebration = { category: SaleCategory; direction: SaleDirection; id: number };

export function CelebrationOverlay({ celebration, onDismiss }: { celebration: Celebration | null; onDismiss: () => void }) {
  const [seconds, setSeconds] = useState(10);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!celebration) return;
    setSeconds(10);
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    const dismiss = window.setTimeout(() => onDismissRef.current(), 10000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(dismiss);
    };
  }, [celebration]);

  if (!celebration) return null;
  const meta = CATEGORY_META[celebration.category];
  const isAdd = celebration.direction === 'add';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#101a23]/[.88] p-5 backdrop-blur-md" data-testid="overlay-celebration">
      <div className="celebrate-in relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/15 bg-[#182a36] px-7 py-10 text-center text-[#fffaf0] shadow-[0_30px_100px_rgba(0,0,0,.45)] sm:px-16 sm:py-14">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[34px] border-[#e40521]/25" />
        <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full border-[44px] border-[#f0b323]/20" />
        <div className="relative">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f0b323] text-[#172630] shadow-[0_0_0_10px_rgba(240,179,35,.14)]">
            {isAdd ? <Check size={40} strokeWidth={3.2} /> : <X size={40} strokeWidth={3.2} />}
          </div>
          <div className="mt-7 text-[11px] font-bold uppercase tracking-[.3em] text-[#f0b323]" data-testid="text-celebration-kicker">
            {isAdd ? 'Mais uma na conta' : 'Ajuste realizado'}
          </div>
          <h2 className="mt-2 font-display text-6xl font-extrabold uppercase leading-[.88] tracking-tight sm:text-8xl" data-testid="text-celebration-title">
            {isAdd ? 'Boa venda.' : 'Venda removida.'}
          </h2>
          <p className="mt-5 text-base text-[#d9e1df] sm:text-lg" data-testid="text-celebration-category">
            {meta.label} <span className="mx-2 text-[#f0b323]">/</span> o time está acelerando.
          </p>
          <div className="mx-auto mt-9 flex max-w-xs items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[#e40521] transition-[width] duration-1000 ease-linear" style={{ width: `${(seconds / 10) * 100}%` }} />
            </div>
            <span className="w-8 font-mono text-sm text-[#d9e1df]" data-testid="text-celebration-timer">{seconds}s</span>
          </div>
          <button onClick={onDismiss} className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-white/75 transition hover:border-white/45 hover:text-white" data-testid="button-dismiss-celebration">
            Fechar <ArrowDown size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}