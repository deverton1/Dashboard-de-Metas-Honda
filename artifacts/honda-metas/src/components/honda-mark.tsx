import { ShieldCheck } from 'lucide-react';

export function HondaMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-honda">
      <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#e40521] text-white shadow-[0_6px_18px_rgba(228,5,33,.28)]">
        <ShieldCheck size={22} strokeWidth={2.8} />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[22px] font-extrabold tracking-[.06em] text-[#172630]">HONDA</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[.23em] text-[#e40521]">Motos • Brasil</div>
        </div>
      )}
    </div>
  );
}