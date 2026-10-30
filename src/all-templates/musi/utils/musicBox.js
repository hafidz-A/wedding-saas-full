/* ============================================================
   musi/utils/musicBox.js — a generated, royalty-free plucked tune.

   Plays on the DEMO page only, so the showcase isn't silent. A real invitation
   plays the couple's own song from the dashboard Music tab, or nothing.
   Must be started from a user gesture (the cover button).
   ============================================================ */

export function startMusicBox() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  const ac = new AC()
  const master = ac.createGain()
  master.gain.value = 0.16
  const delay = ac.createDelay()
  delay.delayTime.value = 0.33
  const fb = ac.createGain()
  fb.gain.value = 0.32
  delay.connect(fb)
  fb.connect(delay)
  delay.connect(master)
  master.connect(ac.destination)

  const C5 = 523.25
  const f = (s) => C5 * Math.pow(2, s / 12)
  const melody = [0, 3, 5, 7, 10, 7, 5, 3, 5, 7, 12, 10, 7, 5, 3, 0, -2, 0, 3, 5, 7, 5, 3, 5, 0, 3, 7, 10, 12, 10, 7, 5]
  const bass = [-24, -21, -19, -26]
  const beat = 0.4
  let step = 0
  let next = ac.currentTime + 0.1

  function note(freq, t, vol, len) {
    const o = ac.createOscillator()
    const o2 = ac.createOscillator()
    const gn = ac.createGain()
    const g2 = ac.createGain()
    o.type = 'sine'
    o2.type = 'triangle'
    o.frequency.value = freq
    o2.frequency.value = freq * 2
    g2.gain.value = 0.18
    o.connect(gn)
    o2.connect(g2)
    g2.connect(gn)
    gn.connect(master)
    gn.connect(delay)
    gn.gain.setValueAtTime(0.0001, t)
    gn.gain.exponentialRampToValueAtTime(vol, t + 0.01)
    gn.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.start(t)
    o2.start(t)
    o.stop(t + len + 0.05)
    o2.stop(t + len + 0.05)
  }

  const timer = setInterval(() => {
    while (next < ac.currentTime + 0.25) {
      note(f(melody[step % melody.length]), next, 0.5, 1.6)
      if (step % 8 === 0) note(f(bass[(step / 8) % bass.length]), next, 0.35, 3.2)
      step++
      next += beat
    }
  }, 90)

  return {
    play: () => ac.resume(),
    pause: () => ac.suspend(),
    destroy: () => {
      clearInterval(timer)
      ac.close().catch(() => {})
    },
  }
}
