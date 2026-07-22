/**
 * Reliable browser notification sound using a generated WAV data-URL.
 * Avoids AudioContext gesture-unlock complexity by using HTMLAudioElement,
 * which Chrome unlocks on the FIRST click anywhere on the page.
 */

const buildBeepWav = () => {
  const sampleRate = 8000;
  const durationSecs = 0.25;
  const freq = 900;
  const n = Math.floor(sampleRate * durationSecs);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (off, s) => [...s].forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Two-tone chirp (880 → 1100 Hz) with a quick fade-out envelope
    const f = freq + (220 * i / n);
    const env = Math.min(1, (n - i) / (sampleRate * 0.06));
    v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * f * t) * env * 0x7FFF, true);
  }
  const bytes = new Uint8Array(buf);
  let b64 = '';
  bytes.forEach((byte) => { b64 += String.fromCharCode(byte); });
  return 'data:audio/wav;base64,' + btoa(b64);
};

class SoundService {
  constructor() {
    this._audio = null;
    this._unlocked = false;
  }

  _ensureAudio() {
    if (this._audio) return;
    this._audio = new Audio(buildBeepWav());
    this._audio.volume = 0.6;
    // The Audio element unlocks on the very first user gesture anywhere on the
    // page. We listen for ANY click so staff don't have to click a specific button.
    const tryUnlock = () => {
      this._audio.play()
        .then(() => { this._audio.pause(); this._audio.currentTime = 0; this._unlocked = true; })
        .catch(() => {});
    };
    document.addEventListener('click', tryUnlock, { once: true });
  }

  /** Call this inside a click handler to force-unlock immediately. */
  unlock() {
    this._ensureAudio();
    this._audio.play()
      .then(() => { this._audio.pause(); this._audio.currentTime = 0; this._unlocked = true; })
      .catch(() => {});
  }

  getSoundOn() {
    try { return localStorage.getItem('admin_chat_sound') !== 'false'; } catch { return true; }
  }

  setSoundOn(on) {
    try { localStorage.setItem('admin_chat_sound', on ? 'true' : 'false'); } catch {}
  }

  beep() {
    if (!this.getSoundOn()) return;
    this._ensureAudio();
    if (!this._unlocked) return;
    try {
      this._audio.currentTime = 0;
      this._audio.play().catch(() => {});
    } catch {}
  }
}

export const soundService = new SoundService();
export default soundService;
