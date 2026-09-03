let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

export function unlockAudio() {
  const context = getAudioContext();
  if (context?.state === 'suspended') void context.resume();
}

export function playSaleChime(enabled: boolean) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === 'suspended') void context.resume();
  const now = context.currentTime;
  const celebrationDuration = 10;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.04);
  master.gain.setValueAtTime(0.16, now + celebrationDuration - 0.8);
  master.gain.exponentialRampToValueAtTime(0.0001, now + celebrationDuration);
  master.connect(context.destination);

  const melody = [523.25, 659.25, 783.99, 659.25, 1046.5, 783.99, 659.25, 783.99];
  for (let step = 0; step < 16; step += 1) {
    const start = now + step * 0.62;
    const frequency = melody[step % melody.length];
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    oscillator.type = step % 4 === 0 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.03, start + 0.36);
    noteGain.gain.setValueAtTime(0.0001, start);
    noteGain.gain.exponentialRampToValueAtTime(0.42, start + 0.035);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
    oscillator.connect(noteGain);
    noteGain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.45);
  }

  const shimmer = context.createOscillator();
  const shimmerGain = context.createGain();
  shimmer.type = 'sine';
  shimmer.frequency.setValueAtTime(1567.98, now);
  shimmer.frequency.exponentialRampToValueAtTime(2093, now + celebrationDuration);
  shimmerGain.gain.setValueAtTime(0.0001, now);
  shimmerGain.gain.exponentialRampToValueAtTime(0.045, now + 0.1);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + celebrationDuration);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(master);
  shimmer.start(now);
  shimmer.stop(now + celebrationDuration);
}