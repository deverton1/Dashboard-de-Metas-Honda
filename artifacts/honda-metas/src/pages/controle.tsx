import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowDown, ArrowUp, Check, ChevronRight, CircleHelp, FileAudio, Headphones, Maximize2, Play, RotateCcw, Target, Trash2, Volume2, VolumeX } from 'lucide-react';
import { CelebrationOverlay } from '@/components/celebration-overlay';
import { ShowroomNav } from '@/components/showroom-nav';
import { CATEGORY_META, clearAudioFile, getTotal, recordSale, resetSales, updateGoal, uploadAudioFile, useSalesState, useStoredAudio, type SaleCategory } from '@/lib/sales-store';
import { AUDIO_PRESETS, playSaleChime, setAudioSettings, stopCelebrationAudio, unlockAudio, useAudioSettings } from '@/lib/showroom-audio';

const categories: SaleCategory[] = ['moto', 'consortium'];

export default function ControlePage() {
  const sales = useSalesState();
  const audioSettings = useAudioSettings();
  const uploadedAudio = useStoredAudio();
  const [soundOn, setSoundOn] = useState(() => {
    try { return window.localStorage.getItem('honda-metas-sound') !== 'off'; } catch { return true; }
  });
  const [goalDrafts, setGoalDrafts] = useState<Record<SaleCategory, string>>({
    moto: String(sales.goal),
    consortium: String(sales.goal),
  });
  const [confirmReset, setConfirmReset] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ category: SaleCategory; direction: 'add' | 'remove'; id: number } | null>(null);
  const lastActionKey = useRef<string | null>(null);
  const total = getTotal(sales);
  const totalGoal = sales.goal;
  const totalPercent = Math.min(100, Math.round((total / totalGoal) * 100));
  const goalSignature = useMemo(() => String(sales.goal), [sales.goal]);

  useEffect(() => {
    setGoalDrafts({ moto: String(sales.goal), consortium: String(sales.goal) });
  }, [goalSignature]); // keep a second tab's goal edits visible

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
    if (action.direction !== 'add') return;
    setCelebration({ ...action, id: action.at });
    playSaleChime(soundOn, audioSettings, uploadedAudio);
  }, [sales.lastAction, soundOn, audioSettings, uploadedAudio]);

  const changeSale = useCallback((category: SaleCategory, direction: 'add' | 'remove') => {
    unlockAudio();
    recordSale(category, direction);
  }, []);

  const toggleSound = useCallback(() => {
    unlockAudio();
    setSoundOn((value) => {
      const next = !value;
      try { window.localStorage.setItem('honda-metas-sound', next ? 'on' : 'off'); } catch { /* local preference */ }
      return next;
    });
  }, []);

  const saveGoal = useCallback(() => {
    const value = Number(goalDrafts.moto);
    if (!Number.isFinite(value) || value < 1) {
      setGoalDrafts({ moto: String(sales.goal), consortium: String(sales.goal) });
      return;
    }
    updateGoal(value);
  }, [goalDrafts.moto, sales.goal]);

  const enterFullscreen = useCallback(() => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
  }, []);

  const previewAudio = useCallback(() => {
    unlockAudio();
    playSaleChime(true, audioSettings, uploadedAudio);
  }, [audioSettings, uploadedAudio]);

  const handleAudioUpload = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setAudioError(null);
    try {
      await uploadAudioFile(file);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Não foi possível salvar o MP3.');
    }
  }, []);

  const handleAudioRemove = useCallback(async () => {
    setAudioError(null);
    stopCelebrationAudio();
    try {
      await clearAudioFile();
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Não foi possível remover o MP3.');
    }
  }, []);

  const dismissCelebration = useCallback(() => {
    stopCelebrationAudio();
    setCelebration(null);
  }, []);

  return (
    <main className="min-h-[100dvh] bg-[#f5f1e9] text-[#172630]" data-testid="page-controle">
      <ShowroomNav />
      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
        <section className="enter-up flex flex-col justify-between gap-6 border-b border-[#dfd9ce] pb-8 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.28em] text-[#e40521]"><span className="h-2 w-2 rounded-full bg-[#e40521]" /> Operação ativa</div>
            <h1 className="mt-3 font-display text-6xl font-extrabold uppercase leading-[.82] tracking-[-.04em] text-[#172630] sm:text-8xl" data-testid="text-control-heading">Controle<br /><span className="text-[#e40521]">de metas.</span></h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#68747a]">Registre as vendas do dia em um toque. O placar da loja acompanha em tempo real.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={toggleSound} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d8d1c5] bg-[#fbfaf6] px-3 text-xs font-bold uppercase tracking-[.1em] text-[#5e6b70] transition hover:border-[#172630] hover:text-[#172630]" data-testid="button-control-sound">
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />} {soundOn ? 'Som ligado' : 'Som desligado'}
            </button>
            <Link href="/tv" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#172630] px-3 text-xs font-bold uppercase tracking-[.1em] text-white transition hover:bg-[#273b48]" data-testid="link-open-tv">
              <Maximize2 size={15} /> Abrir placar TV
            </Link>
          </div>
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.7fr]">
          <div className="enter-up enter-up-delay-1 relative overflow-hidden rounded-[22px] bg-[#172630] p-7 text-[#fffaf0] shadow-[0_16px_35px_rgba(23,38,48,.12)] sm:p-9">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[28px] border-[#e40521]/20" />
            <div className="relative">
              <div className="flex items-center justify-between"><div className="text-[10px] font-bold uppercase tracking-[.25em] text-[#f0b323]">Resumo do dia</div><Target size={18} className="text-[#f0b323]" /></div>
              <div className="mt-12 font-display text-[clamp(6rem,13vw,10rem)] font-extrabold leading-[.75] tracking-[-.06em]" data-testid="text-control-total">{total}</div>
              <div className="mt-4 text-sm text-[#afbfbe]">vendas registradas hoje</div>
              <div className="mt-10 flex items-end justify-between border-t border-white/10 pt-5"><div><div className="text-[10px] font-bold uppercase tracking-[.19em] text-[#839395]">Progresso geral</div><div className="mt-1 font-display text-3xl font-bold">{totalPercent}%</div></div><div className="text-right text-xs text-[#839395]">Meta unificada<br /><strong className="text-[#fffaf0]">{totalGoal}</strong></div></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="progress-fill h-full rounded-full bg-[#f0b323]" style={{ width: `${totalPercent}%` }} /></div>
            </div>
          </div>

          <div className="enter-up enter-up-delay-2 rounded-[22px] border border-[#e1dcd2] bg-[#fbfaf6] p-5 shadow-[0_8px_25px_rgba(23,38,48,.05)] sm:p-7">
             <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
               <div><h2 className="font-display text-3xl font-bold uppercase tracking-tight">Lançamentos</h2><p className="mt-1 text-xs text-[#899096]">Cada moto ou consórcio soma para a mesma meta.</p></div>
              <div className="hidden items-center gap-1 text-[10px] font-bold uppercase tracking-[.16em] text-[#899096] sm:flex"><CircleHelp size={14} /> Atalhos rápidos</div>
            </div>
             <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#9a9f9f]">Meta unificada
               <input type="number" min="1" value={goalDrafts.moto} onChange={(event) => setGoalDrafts({ moto: event.target.value, consortium: event.target.value })} onBlur={saveGoal} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="h-8 w-20 rounded-md border border-[#ded8cc] bg-[#f5f1e9] px-2 text-center font-mono text-xs font-bold text-[#172630] outline-none transition focus:border-[#e40521] focus:ring-2 focus:ring-[#e40521]/10" data-testid="input-goal-unified" />
               <span className="normal-case font-normal tracking-normal text-[#9a9f9f]">vendas no total</span>
             </label>
            <div className="divide-y divide-[#e8e2d8]">
              {categories.map((category) => {
                const meta = CATEGORY_META[category];
                const count = sales.counts[category];
                 const percent = Math.min(100, Math.round((count / sales.goal) * 100));
                return (
                  <div key={category} className="group grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center" data-testid={`row-control-category-${category}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3"><h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#172630]">{meta.label}</h3><span className="font-mono text-sm font-bold text-[#617078]" data-testid={`text-control-count-${category}`}>{count} vendas</span></div>
                        <div className="mt-2 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ece7dd]"><div className="progress-fill h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: meta.color }} /></div><span className="w-10 text-right text-[11px] font-bold text-[#778187]">{percent}%</span></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => changeSale(category, 'remove')} disabled={count === 0} className="inline-flex h-11 items-center gap-1 rounded-lg border border-[#d9d3c8] px-3 text-xs font-bold uppercase tracking-[.08em] text-[#6f797d] transition hover:border-[#e40521] hover:text-[#e40521] disabled:cursor-not-allowed disabled:opacity-35" data-testid={`button-undo-${category}`}><ArrowDown size={16} /> Desfazer</button>
                      <button onClick={() => changeSale(category, 'add')} className="inline-flex h-11 items-center gap-2 rounded-lg px-4 text-xs font-bold uppercase tracking-[.1em] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0" style={{ backgroundColor: meta.color }} data-testid={`button-add-${category}`}><ArrowUp size={17} /> Adicionar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="enter-up enter-up-delay-3 mt-5 grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
          <div className="rounded-[22px] border border-[#e1dcd2] bg-[#fbfaf6] p-5 shadow-[0_8px_25px_rgba(23,38,48,.05)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2e9dc] text-[#e40521]">
                  <Headphones size={19} />
                </div>
                <div>
                  <h2 className="font-display text-3xl font-bold uppercase tracking-tight">Som da comemoração</h2>
                  <p className="mt-1 text-xs text-[#899096]">Escolha a assinatura sonora que toca a cada venda.</p>
                </div>
              </div>
              <span className="hidden rounded-full bg-[#efeae0] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#7a8587] sm:block">10 segundos</span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {(Object.keys(AUDIO_PRESETS) as Array<keyof typeof AUDIO_PRESETS>).map((preset) => {
                const option = AUDIO_PRESETS[preset];
                const selected = audioSettings.preset === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => setAudioSettings({ ...audioSettings, preset })}
                    aria-pressed={selected}
                    className={`rounded-xl border p-4 text-left transition ${selected ? 'border-[#e40521] bg-[#fff0f1] shadow-[0_0_0_3px_rgba(228,5,33,.08)]' : 'border-[#e4ded4] bg-[#f8f5ef] hover:border-[#b8afa1]'}`}
                    data-testid={`button-audio-preset-${preset}`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-lg font-bold ${selected ? 'bg-[#e40521] text-white' : 'bg-[#e8e0d4] text-[#172630]'}`}>{option.icon}</span>
                    <span className="mt-3 block text-sm font-bold text-[#172630]">{option.label}</span>
                    <span className="mt-1 block text-[11px] text-[#8b9392]">{option.detail}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-dashed border-[#d7cfc2] bg-[#f8f5ef] p-4 sm:flex-row sm:items-center sm:justify-between">
              {uploadedAudio ? (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e40521] text-white"><FileAudio size={17} /></div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[#172630]">{uploadedAudio.name}</div>
                    <div className="mt-0.5 text-[11px] text-[#7e898b]">MP3 personalizado ativo no placar</div>
                  </div>
                  <button onClick={() => void handleAudioRemove()} className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#dfd6ca] px-2.5 py-2 text-[10px] font-bold uppercase tracking-[.08em] text-[#788286] transition hover:border-[#e40521] hover:text-[#e40521]" data-testid="button-remove-audio">
                    <Trash2 size={13} /> Remover
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8e0d4] text-[#e40521]"><FileAudio size={17} /></div>
                  <div><div className="text-sm font-bold text-[#172630]">Use seu próprio MP3</div><div className="mt-0.5 text-[11px] text-[#7e898b]">Ele ficará salvo no SQLite deste navegador.</div></div>
                </div>
              )}
              {!uploadedAudio && (
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#172630] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[.1em] text-white transition hover:bg-[#273b48]">
                  <FileAudio size={14} className="mr-2" /> Escolher MP3
                  <input type="file" accept=".mp3,audio/mpeg" className="sr-only" onChange={(event) => { void handleAudioUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} data-testid="input-audio-file" />
                </label>
              )}
            </div>
            {audioError && <p className="mt-2 text-xs font-medium text-[#e40521]" role="alert">{audioError}</p>}
          </div>
          <div className="rounded-[22px] bg-[#e40521] p-5 text-white shadow-[0_12px_30px_rgba(228,5,33,.16)] sm:p-7">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[.22em] text-white/70">Ajuste fino</div>
              <button onClick={previewAudio} className="flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-[10px] font-bold uppercase tracking-[.1em] text-[#e40521] transition hover:bg-[#fff4f4]" data-testid="button-preview-audio">
                <Play size={13} fill="currentColor" /> Ouvir prévia
              </button>
            </div>
            <label className="mt-8 block text-sm font-bold">
              Volume <span className="float-right font-mono text-sm">{audioSettings.volume}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={audioSettings.volume}
                onChange={(event) => setAudioSettings({ ...audioSettings, volume: Number(event.target.value) })}
                className="mt-4 h-2 w-full cursor-pointer accent-[#fffaf0]"
                data-testid="input-audio-volume"
              />
            </label>
            <p className="mt-6 text-xs leading-relaxed text-white/75">A escolha fica salva neste navegador e também vale para a tela da TV.</p>
          </div>
        </section>

        <section className="enter-up enter-up-delay-3 mt-5 flex flex-col justify-between gap-4 rounded-[18px] border border-[#e1dcd2] bg-[#efeae0] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fffaf0] text-[#e40521]"><Check size={17} strokeWidth={3} /></div><div><div className="text-sm font-bold text-[#34434a]">Tudo sincronizado</div><div className="text-xs text-[#788388]">As alterações ficam salvas neste navegador e aparecem no modo TV.</div></div></div>
          <button onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-2 self-start rounded-lg border border-[#cfc7bb] px-3 py-2 text-xs font-bold uppercase tracking-[.1em] text-[#768087] transition hover:border-[#e40521] hover:text-[#e40521] sm:self-auto" data-testid="button-reset-sales"><RotateCcw size={14} /> Resetar dia</button>
        </section>
        <footer className="mt-8 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.18em] text-[#9da19d]"><span>Honda Motos • Painel operador</span><span className="hidden items-center gap-1 sm:flex">Dados locais <ChevronRight size={13} /></span></footer>
      </div>

      <CelebrationOverlay celebration={celebration} onDismiss={dismissCelebration} />
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172630]/70 p-5 backdrop-blur-sm" data-testid="dialog-reset-confirm">
          <div className="w-full max-w-md rounded-[22px] border border-[#e1dcd2] bg-[#fbfaf6] p-7 shadow-[0_24px_70px_rgba(23,38,48,.3)]">
            <div className="text-[10px] font-bold uppercase tracking-[.25em] text-[#e40521]">Atenção</div>
            <h2 className="mt-3 font-display text-4xl font-bold uppercase leading-none">Zerar o placar?</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#69757a]">As vendas registradas hoje voltarão para zero. As metas configuradas permanecem intactas.</p>
            <div className="mt-7 flex justify-end gap-2">
              <button onClick={() => setConfirmReset(false)} className="rounded-lg border border-[#d9d3c8] px-4 py-2.5 text-xs font-bold uppercase tracking-[.1em] text-[#6f797d] transition hover:border-[#172630] hover:text-[#172630]" data-testid="button-cancel-reset">Cancelar</button>
              <button onClick={() => { resetSales(); setConfirmReset(false); }} className="rounded-lg bg-[#e40521] px-4 py-2.5 text-xs font-bold uppercase tracking-[.1em] text-white transition hover:bg-[#c9041d]" data-testid="button-confirm-reset">Sim, zerar vendas</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}