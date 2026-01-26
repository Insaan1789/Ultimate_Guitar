
let audioCtx = null;
const GAIN_REF = 0.3; // Master volume for a chord strums

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export function playChord(frequencies, duration = 2.0, stagger = 0.04) {
    const ctx = initAudio();
    const now = ctx.currentTime;

    frequencies.forEach((freq, index) => {
        if (freq > 0) {
            playTone(ctx, freq, now + (index * stagger), duration);
        }
    });
}

export function playSingleNote(freq) {
    const ctx = initAudio();
    playTone(ctx, freq, ctx.currentTime, 1.5);
}

function playTone(ctx, freq, startTime, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Sound Design: clearer tone
    osc.type = 'triangle';
    // Add some harmonics? Simple triangle is decent for "synthetic guitar".

    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);

    // Envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(GAIN_REF, startTime + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Decay

    osc.stop(startTime + duration);
}
