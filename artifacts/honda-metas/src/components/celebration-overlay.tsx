import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Check, Rocket, Trophy, X } from 'lucide-react';
import { CATEGORY_META, type CelebrationKind, type SaleCategory, type SaleDirection } from '@/lib/sales-store';

type Celebration = { category: SaleCategory; direction: SaleDirection; id: number; kind: CelebrationKind; total: number; goal: number };

const confettiColors = ['#e40521', '#f0b323', '#fffaf0', '#78aeb4', '#ff6f7d'];
const confettiPieces = Array.from({ length: 86 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 101}%`,
  delay: `${(index * 83) % 2300}ms`,
  duration: `${2600 + (index % 6) * 320}ms`,
  color: confettiColors[index % confettiColors.length],
  shape: index % 4 === 0 ? 'confetti-circle' : index % 4 === 1 ? 'confetti-diamond' : '',
}));

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
  const isGoal = celebration.kind === 'goal';
  const isSurpassed = celebration.kind === 'surpassed';
  const milestoneClass = isGoal ? 'celebration-goal' : isSurpassed ? 'celebration-surpassed' : 'celebration-standard';
  const title = isGoal ? 'Meta batida!' : isSurpassed ? 'Meta superada!' : isAdd ? 'Boa venda.' : 'Venda removida.';
  const kicker = isGoal ? 'Alvo alcançado' : isSurpassed ? 'Além do esperado' : isAdd ? 'Mais uma na conta' : 'Ajuste realizado';
  const message = isGoal
    ? 'A meta unificada foi alcançada. O time chegou no alvo!'
    : isSurpassed
      ? `O time foi além da meta e já está ${celebration.total - celebration.goal} venda${celebration.total - celebration.goal === 1 ? '' : 's'} acima do alvo.`
      : 'O time está acelerando.';
  return (
    <div className={`celebration-overlay ${milestoneClass} fixed inset-0 z-[60] flex items-center justify-center overflow-hidden p-5 backdrop-blur-md`} data-testid="overlay-celebration" data-celebration-kind={celebration.kind}>
      <div className={`celebration-confetti ${milestoneClass}-confetti`} aria-hidden="true">
        {confettiPieces.map((piece) => (
          <span
            key={piece.id}
            className={`confetti-piece ${piece.shape}`}
            style={{
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              backgroundColor: piece.color,
            }}
          />
        ))}
      </div>
      {isGoal && <div className="celebration-goal-burst" aria-hidden="true"><span /><span /><span /></div>}
      {isSurpassed && <div className="celebration-surpassed-orbit" aria-hidden="true"><span /><span /><span /></div>}
      <div className={`celebrate-in relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] px-7 py-10 text-center text-[#fffaf0] sm:px-16 sm:py-14 celebration-card ${milestoneClass}-card`}>
        <div className={`celebration-rays ${milestoneClass}-rays`} aria-hidden="true" />
        <div className={`celebration-glow ${milestoneClass}-glow`} aria-hidden="true" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[34px] border-[#e40521]/25" />
        <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full border-[44px] border-[#f0b323]/20" />
        <div className="relative z-10">
          <div className={`celebration-icon mx-auto flex h-20 w-20 items-center justify-center rounded-full text-[#172630] ${milestoneClass}-icon`}>
            {isGoal ? <Trophy size={40} strokeWidth={2.7} /> : isSurpassed ? <Rocket size={40} strokeWidth={2.7} /> : isAdd ? <Check size={40} strokeWidth={3.2} /> : <X size={40} strokeWidth={3.2} />}
          </div>
          <div className={`mt-7 text-[11px] font-bold uppercase tracking-[.3em] ${milestoneClass}-accent`} data-testid="text-celebration-kicker">
            {kicker}
          </div>
          <h2 className="mt-2 font-display text-6xl font-extrabold uppercase leading-[.88] tracking-tight sm:text-8xl" data-testid="text-celebration-title">
            {title}
          </h2>
          <p className="mt-5 text-base text-[#d9e1df] sm:text-lg" data-testid="text-celebration-category">
            {meta.label} <span className="mx-2 celebration-accent">/</span> {message}
          </p>
          {(isGoal || isSurpassed) && (
            <div className={`celebration-score mx-auto mt-7 flex max-w-sm items-center justify-center gap-4 rounded-2xl px-5 py-3 ${milestoneClass}-score`}>
              <span className="font-display text-6xl font-extrabold leading-none">{celebration.total}</span>
              <span className="text-left text-[10px] font-bold uppercase leading-tight tracking-[.16em]">
                vendas<br /><span className="font-normal tracking-normal opacity-70">{isSurpassed ? `meta ${celebration.goal} + ${celebration.total - celebration.goal}` : `meta ${celebration.goal} alcançada`}</span>
              </span>
            </div>
          )}
          <div className="mx-auto mt-9 flex max-w-xs items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${milestoneClass}-progress`} style={{ width: `${(seconds / 10) * 100}%` }} />
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