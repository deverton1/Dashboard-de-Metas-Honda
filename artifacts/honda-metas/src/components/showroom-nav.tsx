import { Link, useLocation } from 'wouter';
import { Gauge, Monitor, Settings2 } from 'lucide-react';
import { HondaMark } from '@/components/honda-mark';

export function ShowroomNav() {
  const [location] = useLocation();
  return (
    <header className="flex items-center justify-between border-b border-[#dfd9ce] bg-[#fbfaf6]/90 px-5 py-4 backdrop-blur sm:px-8">
      <Link href="/controle" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#e40521]" data-testid="link-honda-home">
        <HondaMark />
      </Link>
      <nav className="flex items-center gap-1 rounded-xl border border-[#e2ddd2] bg-[#f4f0e7] p-1" aria-label="Navegação principal">
        <Link href="/tv" className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[.12em] transition sm:px-4 ${location === '/tv' ? 'bg-[#172630] text-[#fffaf0] shadow-sm' : 'text-[#657078] hover:bg-[#e9e4da]'}`} data-testid="link-tv-view">
          <Monitor size={15} /> <span className="hidden sm:inline">Modo TV</span>
        </Link>
        <Link href="/controle" className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[.12em] transition sm:px-4 ${location === '/controle' || location === '/' ? 'bg-[#e40521] text-white shadow-sm' : 'text-[#657078] hover:bg-[#e9e4da]'}`} data-testid="link-control-view">
          <Settings2 size={15} /> <span className="hidden sm:inline">Controle</span>
        </Link>
      </nav>
      <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#899096] sm:flex">
        <Gauge size={15} className="text-[#e40521]" /> Meta diária
      </div>
    </header>
  );
}