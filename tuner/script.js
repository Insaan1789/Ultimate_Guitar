/**
 * Guitar Tuner Logic - Pro Version
 * Features: Autocorrelation, Frequency Locking, Needle Smoothing, Confirmation Sound
 */

// --- Configuration ---
const config = {
    bufferSize: 4096,
    confidenceThreshold: 0.9,
    minFreq: 60,
    maxFreq: 1000,
    tunedTolerance: 5,   // Cents within which it counts as "tuned"
    stableDuration: 400, // ms to wait before confirming tune
};

// --- State ---
let audioContext = null;
let analyser = null;
let microphone = null;
let isRunning = false;
let currentString = 'AUTO';

// Smoothing State
let currentNeedleAngle = 0;
let targetNeedleAngle = 0;
let lastFreqUpdate = 0;

// Stability State
let timeInTune = 0;
let lastFrameTime = 0;
let hasPlayedSound = false;

// String Frequencies & Windows (Strict)
const guitarStrings = {
    'E2': { freq: 82.41, min: 70, max: 95 },
    'A2': { freq: 110.00, min: 95, max: 125 },
    'D3': { freq: 146.83, min: 130, max: 165 },
    'G3': { freq: 196.00, min: 175, max: 215 },
    'B3': { freq: 246.94, min: 225, max: 270 },
    'E4': { freq: 329.63, min: 300, max: 360 }
};

// Auto Mode Targets (Standard EADGBE + Chromatic fallback)
const autoMsg = "🎸 Play a string";

// --- DOM Elements ---
const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status-text');
const noteNameEl = document.getElementById('note-name');
const freqEl = document.getElementById('frequency');
const needleEl = document.getElementById('tuner-needle');
const tuningIndicatorEl = document.getElementById('tuning-indicator');
const stringBtns = document.querySelectorAll('.string-btn');

// --- Initialization ---

async function startTuner() {
    if (isRunning) return;

    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        isRunning = true;
        startBtn.textContent = '⏹ Stop Tuner';
        startBtn.classList.add('active');
        statusText.textContent = currentString === 'AUTO' ? autoMsg : `Target: ${currentString}`;

        lastFrameTime = performance.now();
        requestAnimationFrame(updateLoop);

    } catch (err) {
        console.error("Mic Error:", err);
        statusText.textContent = "Mic access denied";
        alert("Please allow microphone access.");
    }
}

function stopTuner() {
    if (!isRunning) return;

    // Don't close context to allow restart, just disconnect mic to stop analyzing
    if (microphone) microphone.disconnect();

    isRunning = false;
    startBtn.textContent = '🎤 Start Tuner';
    startBtn.classList.remove('active');
    statusText.textContent = "Click Start to Begin";

    // Reset Visuals
    resetUI();
}

startBtn.addEventListener('click', () => {
    if (isRunning) stopTuner();
    else startTuner();
});

// --- String Selection ---
stringBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        stringBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentString = btn.dataset.note;

        // Instant visual feedback
        if (currentString !== 'AUTO') {
            noteNameEl.textContent = currentString.replace(/\d/, '');
            statusText.textContent = `Target: ${currentString} (${guitarStrings[currentString].freq} Hz)`;
        } else {
            noteNameEl.textContent = "--";
            statusText.textContent = autoMsg;
        }

        // Reset Logic
        hasPlayedSound = false;
        timeInTune = 0;
        targetNeedleAngle = 0;
    });
});

// --- Core Loop ---

function updateLoop(time) {
    if (!isRunning) return;

    const dt = time - lastFrameTime;
    lastFrameTime = time;

    // 1. Audio Analysis
    const buffer = new Float32Array(config.bufferSize);
    analyser.getFloatTimeDomainData(buffer);
    const frequency = autoCorrelate(buffer, audioContext.sampleRate);

    // 2. Logic Processing
    processPitch(frequency, dt);

    // 3. UI Movement (Lerp)
    smoothNeedle(dt);

    requestAnimationFrame(updateLoop);
}

// --- Pitch Processing ---

function processPitch(frequency, dt) {
    if (frequency === -1) {
        // Silence / Noise
        targetNeedleAngle = 0;

        // Reset stability if silent
        timeInTune = 0;
        return;
    }

    let targetFreq = 0;
    let noteNameDisplay = "";
    let centDiff = 0;
    let isValidPitch = false;

    // AUTO MODE
    if (currentString === 'AUTO') {
        const detected = detectNote(frequency);
        if (detected) {
            targetFreq = detected.freq;
            noteNameDisplay = detected.note.replace(/\d/, ''); // E2 -> E
            centDiff = calculateCents(frequency, targetFreq);
            isValidPitch = true;
        }
    }
    // MANUAL MODE
    else {
        const s = guitarStrings[currentString];
        // Enforce Window
        if (frequency >= s.min && frequency <= s.max) {
            targetFreq = s.freq;
            noteNameDisplay = currentString.replace(/\d/, '');
            centDiff = calculateCents(frequency, targetFreq);
            isValidPitch = true;
        } else {
            // Signal valid but out of range? Ignore in manual mode.
            return;
        }
    }

    if (isValidPitch) {
        // Update UI Text immediately
        freqEl.textContent = frequency.toFixed(1);
        noteNameEl.textContent = noteNameDisplay;

        // Calculate Needle Target (-45 to 45 deg)
        // Clamp cents to -50..50 for display
        const clamp = Math.max(-50, Math.min(50, centDiff));
        targetNeedleAngle = clamp * (45 / 50);

        updateIndicators(centDiff);

        // Check Stability for Sound
        if (Math.abs(centDiff) <= config.tunedTolerance) {
            timeInTune += dt;
            if (timeInTune > config.stableDuration && !hasPlayedSound) {
                playTunedSound();
                hasPlayedSound = true;
            }
        } else {
            timeInTune = 0;
            hasPlayedSound = false;
        }
    }
}

// --- Helpers ---

function detectNote(freq) {
    // Find closest defined guitar string first (priority)
    let closest = null;
    let minDiff = Infinity;

    for (const [note, data] of Object.entries(guitarStrings)) {
        // specific window check
        if (freq >= data.min && freq <= data.max) {
            return { note, freq: data.freq };
        }

        // If outside all windows, find closest standard string
        const diff = Math.abs(freq - data.freq);
        if (diff < minDiff) {
            minDiff = diff;
            closest = { note, freq: data.freq };
        }
    }

    // Only return if reasonably close (within ~1 semi-tone or 50 cents range logic implicitly)
    // Actually, just returning the closest string is usually fine for a guitar tuner constraint,
    // but preventing octave jumps is key.

    // Pro trick: If frequency is ~1/2 of a string, it might be the low octave? 
    // But the constraints said "Prevent jumping between octaves".
    // So we should adhere to the windows.
    // If not in ANY window, return the closest ONE IF it's not too far?

    // Let's stick to the window: if not in any window, we can check if it's "close enough" 
    // or just return the closest.
    return closest;
}

function calculateCents(current, target) {
    return 1200 * Math.log2(current / target);
}

// --- Visual & Audio Feedback ---

function smoothNeedle(dt) {
    // Simple Lerp: current = current + (target - current) * factor
    // Framerate independent-ish:
    // Speed factor: how fast it catches up.
    const speed = 0.15;

    const diff = targetNeedleAngle - currentNeedleAngle;
    if (Math.abs(diff) < 0.1) {
        currentNeedleAngle = targetNeedleAngle;
    } else {
        currentNeedleAngle += diff * speed;
    }

    needleEl.style.transform = `translateX(-50%) rotate(${currentNeedleAngle}deg)`;
}

function updateIndicators(cents) {
    const absCents = Math.abs(cents);
    const inTune = absCents <= config.tunedTolerance;

    // Only toggle class if changed to prevent repaint spam? Browser handles it usually.
    if (inTune) {
        noteNameEl.classList.add('in-tune');
        noteNameEl.classList.remove('active');
        tuningIndicatorEl.textContent = "IN TUNE";
        tuningIndicatorEl.style.color = 'var(--accent-green)';
        needleEl.style.backgroundColor = 'var(--accent-green)';
        needleEl.style.boxShadow = '0 0 15px var(--accent-green)';
    } else {
        noteNameEl.classList.remove('in-tune');
        noteNameEl.classList.add('active');
        needleEl.style.backgroundColor = 'var(--accent-red)';
        needleEl.style.boxShadow = 'none';

        if (cents < 0) {
            tuningIndicatorEl.textContent = "FLAT";
            tuningIndicatorEl.style.color = '#ffaa00';
        } else {
            tuningIndicatorEl.textContent = "SHARP";
            tuningIndicatorEl.style.color = 'var(--accent-red)';
        }
    }
}

function playTunedSound() {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    // Friendly "ding" - maybe a high A or E
    osc.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5

    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
}

function resetUI() {
    currentNeedleAngle = 0;
    targetNeedleAngle = 0;
    freqEl.textContent = "0.0";
    noteNameEl.textContent = "--";
    noteNameEl.className = 'note-name';
    tuningIndicatorEl.textContent = "";
    needleEl.style.transform = `translateX(-50%) rotate(0deg)`;
    needleEl.style.backgroundColor = 'var(--needle-color)';
    needleEl.style.boxShadow = 'none';
}

// --- Autocorrelation ---
function autoCorrelate(buf, sampleRate) {
    // 1. RMS Check (Noise Gate)
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < 0.01) return -1;

    // 2. Windowing (Simple rectangular is fine for guitar)
    // Focus on 50Hz - 1000Hz range optimization
    let r1 = 0, r2 = config.bufferSize - 1;
    const thres = 0.2;
    for (let i = 0; i < buf.length / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < buf.length / 2; i++) if (Math.abs(buf[config.bufferSize - i]) < thres) { r2 = config.bufferSize - i; break; }
    const buf2 = buf.slice(r1, r2);

    // 3. Autocorrelation
    const c = new Array(buf2.length).fill(0);
    // Search periods 44 (1000Hz) to 735 (60Hz)
    // Let's go a bit wider 30 to 800
    for (let offset = 30; offset < 800; offset++) {
        let corr = 0;
        for (let i = 0; i < buf2.length - offset; i++) {
            corr += buf2[i] * buf2[i + offset];
        }
        c[offset] = corr;
    }

    // 4. Peak Finding (McLeod / Standard)
    // Find absolute max to normalize threshold
    let maxVal = 0;
    for (let i = 0; i < buf2.length; i++) maxVal += buf2[i] * buf2[i]; // Lag 0

    // Threshold for being a "peak"
    const peakThresh = maxVal * 0.8;

    // Find the *first* peak that exceeds threshold to avoid octave errors
    let bestPeriod = -1;
    for (let i = 30; i < 799; i++) {
        if (c[i] > peakThresh && c[i] > c[i - 1] && c[i] > c[i + 1]) {
            bestPeriod = i;
            break;
        }
    }

    // If no strong first peak, maybe just take max? 
    // Or return -1 (unclear pitch)
    if (bestPeriod === -1) {
        // Fallback to highest overall if no clear first peak
        let maxCorr = -1;
        for (let i = 30; i < 800; i++) {
            if (c[i] > maxCorr) {
                maxCorr = c[i];
                bestPeriod = i;
            }
        }
    }

    if (bestPeriod !== -1) {
        const prev = c[bestPeriod - 1] || 0;
        const next = c[bestPeriod + 1] || 0;
        const curr = c[bestPeriod];
        const shift = (prev - next) / (2 * (prev - 2 * curr + next));
        return sampleRate / (bestPeriod + shift);
    }
    return -1;
}
