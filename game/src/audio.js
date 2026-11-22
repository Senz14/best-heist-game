// Procedural sound with the Web Audio API: short oscillator bleeps, no audio
// files. Everything is created lazily on the first user gesture.
export function makeAudio() {
  let ctx = null;
  let master = null;

  const ensure = () => {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    return true;
  };

  const tone = (freq, dur, type, slideTo, delay) => {
    if (!ensure()) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.9, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  };

  return {
    unlock: () => ensure(),
    pickup: () => { tone(880, 0.09, 'square'); tone(1318, 0.12, 'square', 0, 0.07); },
    crown: () => { tone(523, 0.12, 'triangle'); tone(784, 0.12, 'triangle', 0, 0.1); tone(1046, 0.2, 'triangle', 0, 0.2); },
    coin: () => { tone(1568, 0.07, 'sine'); tone(2093, 0.1, 'sine', 0, 0.05); },
    emp: () => { tone(220, 0.35, 'sawtooth', 40); },
    spotted: () => { tone(196, 0.16, 'sawtooth'); tone(196, 0.16, 'sawtooth', 0, 0.2); },
    caught: () => { tone(392, 0.2, 'sawtooth', 98); tone(311, 0.34, 'sawtooth', 73, 0.16); },
    win: () => { tone(523, 0.12, 'triangle'); tone(659, 0.12, 'triangle', 0, 0.11); tone(784, 0.12, 'triangle', 0, 0.22); tone(1046, 0.3, 'triangle', 0, 0.33); },
    click: () => { tone(660, 0.05, 'square'); },
  };
}
