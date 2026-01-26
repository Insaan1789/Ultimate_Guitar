
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

const CONSTANTS = {
    STRINGS: 6,
    FRETS: 15,
    TUNING: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'], // Standard High to Low (1 to 6)
    STRING_FREQS: [329.63, 246.94, 196.00, 146.83, 110.00, 82.41]
};

let state = {
    root: 'C',
    type: 'major',
    variationIndex: 0,
    capo: 0,
    leftHanded: false,
    currentChordData: null
};

// UI Elements
const ui = {
    fretboard: document.getElementById('fretboard-container'),
    rootSelector: document.getElementById('root-selector'),
    typeSelector: document.getElementById('type-selector'),
    shapeList: document.getElementById('shape-list'),
    chordSearch: document.getElementById('chord-search'),
    capoSlider: document.getElementById('capo-slider'),
    capoVal: document.getElementById('capo-val'),
    viewRight: document.getElementById('view-right'),
    viewLeft: document.getElementById('view-left'),
    playBtn: document.getElementById('play-chord-btn'),
    // Theory
    chordName: document.getElementById('current-chord-name'),
    intervalsBadge: document.getElementById('intervals-badge'),
    notesBadge: document.getElementById('notes-badge')
};

// Audio Context
let audioCtx;

function initApp() {
    initAudio();
    renderRootSelector();
    setupEventListeners();

    // Initial Load
    selectChord('C', 'major');
    renderFretboard();
}

function initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
}

function setupEventListeners() {
    // Root Note Selection
    ui.rootSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('root-btn')) {
            const note = e.target.dataset.note;
            selectChord(note, state.type);
        }
    });

    // Type Selection
    ui.typeSelector.addEventListener('change', (e) => {
        selectChord(state.root, e.target.value);
    });

    // Variation Selection
    ui.shapeList.addEventListener('click', (e) => {
        const item = e.target.closest('.shape-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            selectVariation(index);
        }
    });

    // Capo
    ui.capoSlider.addEventListener('input', (e) => {
        state.capo = parseInt(e.target.value);
        ui.capoVal.innerText = state.capo;
        renderChordShape(); // Re-render to show capo effect (shift dots?)
        // For now, capo just shifts pitch, maybe visual shift later?
        // Actually, usually capo shifts the open strings.
        // Let's implement visual Capo bar later.
    });

    // View Toggle
    ui.viewRight.addEventListener('click', () => setHandedness(false));
    ui.viewLeft.addEventListener('click', () => setHandedness(true));

    // Play
    ui.playBtn.addEventListener('click', playCurrentChord);

    // Search
    ui.chordSearch.addEventListener('input', handleSearch);

    // Handle Window Resize
    window.addEventListener('resize', renderFretboard);
}

function setHandedness(isLeft) {
    state.leftHanded = isLeft;
    ui.viewLeft.classList.toggle('active', isLeft);
    ui.viewRight.classList.toggle('active', !isLeft);
    renderFretboard();
}

function renderRootSelector() {
    ui.rootSelector.innerHTML = '';
    NOTES.forEach(note => {
        const btn = document.createElement('div');
        btn.classList.add('root-btn');
        btn.innerText = note;
        btn.dataset.note = note;
        if (note === state.root) btn.classList.add('active');
        ui.rootSelector.appendChild(btn);
    });
}

function selectChord(root, type) {
    state.root = root;
    state.type = type;

    // Update UI Active States
    document.querySelectorAll('.root-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.note === root);
    });
    ui.typeSelector.value = type;

    // Get Data
    const rootData = CHORD_DATA[root];
    if (!rootData || !rootData[type]) {
        // Fallback or empty
        ui.shapeList.innerHTML = '<li style="padding:10px; color:#888;">No shapes found.</li>';
        state.currentChordData = null;
        renderChordShape();
        return;
    }

    const variations = rootData[type];
    const variationKeys = Object.keys(variations);

    // Populate List
    ui.shapeList.innerHTML = '';
    variationKeys.forEach((key, index) => {
        const v = variations[key];
        const li = document.createElement('li');
        li.className = `shape-item ${index === 0 ? 'active' : ''}`;
        li.dataset.index = index;
        li.innerHTML = `
            <span class="shape-name">${v.name}</span>
            <span class="shape-meta">${v.difficulty}</span>
        `;
        ui.shapeList.appendChild(li);
    });

    if (variationKeys.length > 0) {
        selectVariation(0);
    } else {
        state.currentChordData = null;
        renderChordShape();
    }
}

function selectVariation(index) {
    state.variationIndex = index;
    const rootData = CHORD_DATA[state.root];
    if (!rootData) return;
    const typeData = rootData[state.type];
    if (!typeData) return;

    const keys = Object.keys(typeData);
    const selectedKey = keys[index];
    state.currentChordData = typeData[selectedKey];

    // Update List UI
    const items = ui.shapeList.querySelectorAll('.shape-item');
    items.forEach(i => i.classList.remove('active'));
    if (items[index]) items[index].classList.add('active');

    // Update Header Info
    if (state.currentChordData) {
        ui.chordName.innerText = state.currentChordData.name;
        // Logic to calculate notes could go here
    }

    renderChordShape();
}

/* =========================================
   FRETBOARD RENDERING (SVG)
   ========================================= */

// SVG Namespace
const SVG_NS = "http://www.w3.org/2000/svg";

function renderFretboard() {
    ui.fretboard.innerHTML = '';
    const width = ui.fretboard.clientWidth;
    const height = ui.fretboard.clientHeight;

    // Setup SVG
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    ui.fretboard.appendChild(svg);

    // Geometry
    const marginX = 40;
    const marginY = 30;
    const boardWidth = width - (marginX * 2);
    const boardHeight = height - (marginY * 2);

    // Strings
    const stringSpacing = boardHeight / (CONSTANTS.STRINGS - 1);

    // Frets
    // Calculate fret positions (logarithmic or equal visual spacing? Let's use equal for readability, or authentic?)
    // Let's use equal for now for easier "Explorer" UX, or maybe standard diminishing?
    // Let's standard diminishing logic: Distance = ScaleLength - (ScaleLength / 2^(n/12))
    // Just simple linear for diagrams is often clearer, but let's try 'semi-authentic'

    const frets = CONSTANTS.FRETS;
    const fretPositions = [];
    let currentX = marginX;

    // We'll just distribute linearly for maximum visibility of high frets in this UI
    // Authentic fretboards get too cramped at high frets on small screens.
    const fretStep = boardWidth / frets;

    // Draw Board Background
    const boardRect = document.createElementNS(SVG_NS, "rect");
    boardRect.setAttribute("x", marginX);
    boardRect.setAttribute("y", marginY);
    boardRect.setAttribute("width", boardWidth);
    boardRect.setAttribute("height", boardHeight);
    boardRect.setAttribute("fill", "#2a2a2a");
    svg.appendChild(boardRect);

    // Draw Frets
    for (let i = 0; i <= frets; i++) {
        const x = marginX + (i * fretStep);
        fretPositions.push(x);

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", marginY);
        line.setAttribute("x2", x);
        line.setAttribute("y2", marginY + boardHeight);
        line.setAttribute("stroke", i === 0 ? "#ddd" : "#666"); // Nut is lighter
        line.setAttribute("stroke-width", i === 0 ? 4 : 2);
        svg.appendChild(line);

        // Fret Numbers
        if (i > 0 && (i === 3 || i === 5 || i === 7 || i === 9 || i === 12 || i === 15)) {
            const text = document.createElementNS(SVG_NS, "text");
            text.setAttribute("x", x - (fretStep / 2));
            text.setAttribute("y", marginY + boardHeight + 20);
            text.setAttribute("fill", "#888");
            text.setAttribute("font-size", "12");
            text.setAttribute("text-anchor", "middle");
            text.textContent = i;
            svg.appendChild(text);

            // Inlay Dots
            if (i !== 12) {
                const dot = document.createElementNS(SVG_NS, "circle");
                dot.setAttribute("cx", x - (fretStep / 2));
                dot.setAttribute("cy", marginY + (boardHeight / 2));
                dot.setAttribute("r", 6);
                dot.setAttribute("fill", "#1a1a1a"); // Recessed look
                svg.appendChild(dot);
            } else {
                // 12th fret double dot
                const dot1 = document.createElementNS(SVG_NS, "circle");
                dot1.setAttribute("cx", x - (fretStep / 2));
                dot1.setAttribute("cy", marginY + (boardHeight / 3));
                dot1.setAttribute("r", 6);
                dot1.setAttribute("fill", "#1a1a1a");
                svg.appendChild(dot1);

                const dot2 = document.createElementNS(SVG_NS, "circle");
                dot2.setAttribute("cx", x - (fretStep / 2));
                dot2.setAttribute("cy", marginY + (boardHeight * 2 / 3));
                dot2.setAttribute("r", 6);
                dot2.setAttribute("fill", "#1a1a1a");
                svg.appendChild(dot2);
            }
        }
    }

    // Draw Strings
    for (let i = 0; i < CONSTANTS.STRINGS; i++) {
        // 0 to 5. 0 is high E (if visual top is high E?).
        // Usually guitar tabs: Top line is High E.
        // Let's stick to: Top visual string = High E (String 1)
        const y = marginY + (i * stringSpacing);
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", marginX);
        line.setAttribute("y1", y);
        line.setAttribute("x2", marginX + boardWidth);
        line.setAttribute("y2", y);
        line.setAttribute("stroke", "#rgba(255,255,255,0.6)");
        // Thicker for low strings (String 6 is index 5)
        const thickness = 1 + (i * 0.4);
        line.setAttribute("stroke-width", thickness);
        // data-string index 1-based
        line.dataset.string = i + 1;
        svg.appendChild(line);
    }

    // Store geometric data for chord rendering
    ui.fretboard.dataset.metrics = JSON.stringify({
        marginX, marginY, fretStep, stringSpacing
    });

    renderChordShape();
}

function renderChordShape() {
    if (!state.currentChordData) return;

    const svg = ui.fretboard.querySelector('svg');
    if (!svg) return;

    // Clear old dots
    const oldDots = svg.querySelectorAll('.chord-dot, .barre-rect, .mute-mark');
    oldDots.forEach(d => d.remove());

    const metrics = JSON.parse(ui.fretboard.dataset.metrics);
    const { marginX, marginY, fretStep, stringSpacing } = metrics;
    const fingerings = state.currentChordData.fingering;

    // Render Barre first if any
    // Logic: find barre definition in data
    // { string: 6, fret: 8, finger: 1, interval: "R", barre: true, barreStart: 6, barreEnd: 1 }
    // Actually our dataset structure:
    // we iterate fingerings. If one has `barre:true`, we draw a rect covering strings.

    fingerings.forEach(f => {
        // String 1 (High E) is at Y = marginY
        // String 6 (Low E) is at Y = marginY + 5*spacing
        // Our 'f.string' is 1-based. 1=HighE.
        // So yIndex = f.string - 1.

        if (f.fret === -1) {
            // Muted string
            const y = marginY + ((f.string - 1) * stringSpacing);
            const x = marginX - 15; // Left of nut

            const text = document.createElementNS(SVG_NS, "text");
            text.setAttribute("x", x);
            text.setAttribute("y", y + 5);
            text.setAttribute("fill", "#666");
            text.setAttribute("font-weight", "bold");
            text.textContent = "X";
            text.classList.add('mute-mark');
            svg.appendChild(text);
        } else if (f.fret === 0) {
            // Open string
            const y = marginY + ((f.string - 1) * stringSpacing);
            const x = marginX - 15;

            const circle = document.createElementNS(SVG_NS, "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", y);
            circle.setAttribute("r", 6);
            circle.setAttribute("stroke", "#00ffcc");
            circle.setAttribute("stroke-width", 2);
            circle.setAttribute("fill", "none");
            circle.classList.add('mute-mark'); // reusing class for cleanup
            svg.appendChild(circle);
        } else {
            // Fretted note

            // If Barre
            if (f.barre) {
                // barreStart e.g. 6, barreEnd e.g. 1
                const stringStartIdx = f.barreStart - 1;
                const stringEndIdx = f.barreEnd - 1;

                const y1 = marginY + (stringEndIdx * stringSpacing); // Top (min y)
                const y2 = marginY + (stringStartIdx * stringSpacing); // Bottom (max y)

                const x = marginX + ((f.fret - 1) * fretStep) + (fretStep / 2); // Center of fret

                const rect = document.createElementNS(SVG_NS, "rect");
                rect.setAttribute("x", x - 8); // nice rounded rect
                rect.setAttribute("y", y1 - 10);
                rect.setAttribute("width", 16);
                rect.setAttribute("height", (y2 - y1) + 20);
                rect.setAttribute("rx", 8);
                rect.setAttribute("fill", "#00ffcc");
                rect.setAttribute("opacity", "0.8");
                rect.classList.add('barre-rect');
                // Insert before other dots? No, maybe behind.
                svg.insertBefore(rect, svg.children[svg.children.length - CONSTANTS.STRINGS]);
                // Too complex insert logic, just append is fine, dots on top?
            }

            // Draw Dot (Even if barre, we might want to show finger position visually, but barre covers it usually.
            // But let's draw dots for non-barre fingers. Or draw dot for the barre finger too?)
            // Usually diagrams show a bar and then dots for other fingers.
            // Our dataset defines the barre finger as a specific entry.
            // Let's draw dots for ALL entries in fingering to be safe.

            // If it's the barre entry itself, do we draw a dot?
            // The bar rect covers it.
            if (!f.barre || (f.barre)) { // Actually render dot anyway for consistency of "Note"
                // ...
            }

            if (!f.barre) {
                const y = marginY + ((f.string - 1) * stringSpacing);
                const x = marginX + ((f.fret - 1) * fretStep) + (fretStep / 2);

                const g = document.createElementNS(SVG_NS, "g");
                g.classList.add('chord-dot');

                const circle = document.createElementNS(SVG_NS, "circle");
                circle.setAttribute("cx", x);
                circle.setAttribute("cy", y);
                circle.setAttribute("r", 12);
                circle.setAttribute("fill", f.interval === 'R' ? "#ff3366" : "#00ffcc"); // Root Red, others cyan
                circle.setAttribute("stroke", "#fff");
                circle.setAttribute("stroke-width", 2);

                const text = document.createElementNS(SVG_NS, "text");
                text.setAttribute("x", x);
                text.setAttribute("y", y + 4);
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("font-size", "10px");
                text.setAttribute("fill", "#000");
                text.setAttribute("font-weight", "bold");
                text.textContent = f.interval;

                g.appendChild(circle);
                g.appendChild(text);
                svg.appendChild(g);
            }
        }
    });
}

function playCurrentChord() {
    if (!state.currentChordData) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // calculate frequencies
    // Formula: Freq = StringOpenFreq * 2^(fret/12)
    // We need to map string index to open freq.
    // data.js strings are 1=High E, 6=Low E.
    // CONSTANTS.STRING_FREQS index 0 = High E (329.63)

    const now = audioCtx.currentTime;
    let delay = 0;

    state.currentChordData.fingering.forEach(f => {
        if (f.fret !== -1) {
            // Calculate Freq
            const stringIdx = f.string - 1; // 0-based
            const openFreq = CONSTANTS.STRING_FREQS[stringIdx];
            const freq = openFreq * Math.pow(2, f.fret / 12);

            playTone(freq, now + delay);
            delay += 0.03; // Strum effect
        }
    });
}

function playTone(freq, time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle'; // Guitar-ish
    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(time);

    // Envelope
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, time + 2); // Decay

    osc.stop(time + 2);
}

function handleSearch(e) {
    // Filter chord types or roots?
    // For now, simple console log or TODO
    const term = e.target.value.toLowerCase();
    // Complex regex to parse "Cm7" -> Root C, Type m7
    // This is a feature for later refinement
}
