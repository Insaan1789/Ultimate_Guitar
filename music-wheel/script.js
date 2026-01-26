/**
 * CONFIG & DATA
 */
const SEGMENTS = 12;
const SEGMENT_ANGLE = 360 / SEGMENTS;
const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

// Rings: { type, radii, offset }
// NEW ORDER: Inner = Major. Middle = Minor. Outer = Dim.

const RING_CONFIG = [
    { id: 'dim', rOuter: 330, rInner: 250, offset: 5, textOffset: 290, type: 'Dim' },
    // Dim Offset 4: B (Index 5) aligns with Slot 1. 1+4=5.

    { id: 'minor', rOuter: 250, rInner: 170, offset: 3, textOffset: 210, type: 'Minor' },

    { id: 'major', rOuter: 170, rInner: 90, offset: 0, textOffset: 130, type: 'Major' }
];

// DATA: Chord Shapes (Frets per string: Low E -> High E)
// -1 = Muted, 0 = Open
const CHORD_SHAPES = {
    'C': {
        'Major': [-1, 3, 2, 0, 1, 0],
        'Minor': [-1, 3, 5, 5, 4, 3], // Cm Barre
        'Dim': [-1, 3, 4, 2, 4, -1]   // Cdim7
    },
    'G': {
        'Major': [3, 2, 0, 0, 0, 3],
        'Minor': [3, 5, 5, 3, 3, 3],  // Gm Barre
        'Dim': [3, -1, 2, 3, 2, -1]   // Gdim7
    },
    'D': {
        'Major': [-1, -1, 0, 2, 3, 2],
        'Minor': [-1, -1, 0, 2, 3, 1],
        'Dim': [-1, -1, 0, 1, 0, 1]   // Ddim7
    },
    'A': {
        'Major': [-1, 0, 2, 2, 2, 0],
        'Minor': [-1, 0, 2, 2, 1, 0],
        'Dim': [-1, 0, 1, 2, 1, 2]    // Adim7
    },
    'E': {
        'Major': [0, 2, 2, 1, 0, 0],
        'Minor': [0, 2, 2, 0, 0, 0],
        'Dim': [0, 1, 2, 0, 2, 0] // Edim7 (approx)
    },
    'B': {
        'Major': [-1, 2, 4, 4, 4, 2], // B Barre
        'Minor': [-1, 2, 4, 4, 3, 2], // Bm Barre
        'Dim': [-1, 2, 3, 1, 3, -1]   // Bdim7
    },
    'Gb': { // F#
        'Major': [2, 4, 4, 3, 2, 2],
        'Minor': [2, 4, 4, 2, 2, 2],
        'Dim': [2, -1, 1, 2, 1, -1]
    },
    'Db': { // C#
        'Major': [-1, 4, 6, 6, 6, 4],
        'Minor': [-1, 4, 6, 6, 5, 4],
        'Dim': [-1, 4, 5, 3, 5, -1]
    },
    'Ab': { // G#
        'Major': [4, 6, 6, 5, 4, 4],
        'Minor': [4, 6, 6, 4, 4, 4],
        'Dim': [4, -1, 3, 4, 3, -1]
    },
    'Eb': { // D#
        'Major': [-1, 6, 8, 8, 8, 6],
        'Minor': [-1, 6, 8, 8, 7, 6],
        'Dim': [-1, -1, 1, 2, 1, 2] // D#dim7
    },
    'Bb': { // A#
        'Major': [-1, 1, 3, 3, 3, 1],
        'Minor': [-1, 1, 3, 3, 2, 1],
        'Dim': [-1, 1, 2, 0, 2, -1]
    },
    'F': {
        'Major': [1, 3, 3, 2, 1, 1],
        'Minor': [1, 3, 3, 1, 1, 1],
        'Dim': [1, -1, 0, 1, 0, -1]
    }
};

// Roman Numerals for Overlay - Updated radii
const OVERLAY_LABELS = [
    { text: 'I', slot: -0.3, r: 156 },
    { text: 'V', slot: 0.7, r: 153 },
    { text: 'IV', slot: 10.7, r: 153 },
    { text: 'vi', slot: -0.35, r: 230 },
    { text: 'iii', slot: .65, r: 230 },
    { text: 'ii', slot: 10.65, r: 230 },
    { text: 'vii°', slot: -0.3, r: 310 }
];

// Mode Labels (Static Outer Ring)
const MODE_LABELS = [
    { t: 'Ionian', slot: 2 },
    { t: 'Mixolydian', slot: 1 },
    { t: 'Lydian', slot: 11 },
];

/**
 * STATE
 */
let currentRotation = 0;
let isDragging = false;
let startAngle = 0;
let startRotation = 0;
let snapRequest = null;
let hoverTimer = null;
let lastHoveredNote = null;

// Elements
const wheelSvg = document.getElementById('music-wheel');
const rotatingGroup = document.getElementById('rotating-container');
const overlayPath = document.getElementById('overlay-path');
const overlayLabelsGroup = document.getElementById('overlay-labels');
const staticModesGroup = document.getElementById('static-modes');
const tooltip = document.getElementById('chord-tooltip');

/**
 * INIT
 */
function init() {
    drawWheel();
    drawOverlay();
    setupInteractions();
}

/**
 * DRAWING
 */
function drawWheel() {
    rotatingGroup.innerHTML = '';

    RING_CONFIG.forEach(ring => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('class', `ring-${ring.id}`);

        for (let i = 0; i < SEGMENTS; i++) {
            const noteIdx = (i + ring.offset) % SEGMENTS;
            const validNoteIdx = noteIdx < 0 ? noteIdx + SEGMENTS : noteIdx;
            const noteName = KEYS[validNoteIdx];

            // 1. Draw Segment (The "Card")
            const startA = (i * 30) - 105;
            const endA = startA + 30;
            const pathD = describeArc(0, 0, ring.rOuter, ring.rInner, startA, endA);

            const segment = document.createElementNS("http://www.w3.org/2000/svg", "path");
            segment.setAttribute('d', pathD);
            segment.setAttribute('fill', '#f7f7f7');
            segment.setAttribute('stroke', '#444');
            segment.setAttribute('stroke-width', '1');

            g.appendChild(segment);

            // 2. Draw Colored Shape & Text
            const midAngle = -90 + (i * 30);
            const shapeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const rad = midAngle * Math.PI / 180;
            const tx = ring.textOffset * Math.cos(rad);
            const ty = ring.textOffset * Math.sin(rad);

            // Color
            const hue = validNoteIdx * 30;
            const fillColor = `hsl(${hue}, 85%, 65%)`;

            let shape;
            if (ring.type === 'Major') {
                shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                shape.setAttribute("x", -18);
                shape.setAttribute("y", -18);
                shape.setAttribute("width", 36);
                shape.setAttribute("height", 36);
                shape.setAttribute("rx", 4);
            } else if (ring.type === 'Minor') {
                shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                shape.setAttribute("r", 18);
            } else {
                shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                shape.setAttribute("r", 14);
            }

            shape.setAttribute("fill", fillColor);
            shape.setAttribute("stroke", "#333");
            shape.setAttribute("stroke-width", "1.5");

            shapeGroup.setAttribute("transform", `translate(${tx}, ${ty}) rotate(${midAngle + 90})`);

            shapeGroup.appendChild(shape);

            // Text
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            let label = noteName;
            if (ring.type === 'Minor') label += 'm';
            if (ring.type === 'Dim') label += '°';

            text.textContent = label;
            text.setAttribute("dy", "0.3em");
            text.setAttribute("fill", "#000");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("font-size", ring.type === 'Dim' ? "12px" : "16px");

            shapeGroup.appendChild(text);
            g.appendChild(shapeGroup);
        }
        rotatingGroup.appendChild(g);
    });
}

function drawOverlay() {
    // Hardcoded path from user request
    const d = `
        M 63.63961030678928 -63.63961030678927
        A 90 90 0 0 0 -63.63961030678927 -63.63961030678928
        L -176.77669529663686 -176.7766952966369
        A 250 250 0 0 1 -63.63961030678927 -241.4814565722671
        L -82.63961030678927 -318.75552267539257
        A 330 330 0 0 1 82.3452377915607 -318.34523779156066
        L 65.63961030678927 -243.75552267539257
        A 250 250 0 0 1 173.63961030678927 -176.4814565722671
        Z
    `;

    overlayPath.setAttribute('d', d);

    // Labels
    overlayLabelsGroup.innerHTML = '';
    OVERLAY_LABELS.forEach(l => {
        const pos = polar(l.r, (l.slot * 30) - 90);
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.textContent = l.text;
        txt.setAttribute('x', pos.x);
        txt.setAttribute('y', pos.y);
        txt.setAttribute('font-size', "20px");
        txt.setAttribute('fill', '#000');

        txt.setAttribute('class', 'overlay-label');
        txt.setAttribute('stroke', '#fff');
        txt.setAttribute('stroke-width', '3px');

        const txtFill = txt.cloneNode(true);
        txtFill.removeAttribute('stroke');

        overlayLabelsGroup.appendChild(txt);
        overlayLabelsGroup.appendChild(txtFill);
    });

    // Mode Labels (Static Outer)
    staticModesGroup.innerHTML = '';
    MODE_LABELS.forEach(m => {
        const angle = (m.slot * 30) - 90;
        const r = 360;
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('transform', `rotate(${angle + 90}) translate(0, -${r})`);

        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.textContent = m.t;
        txt.setAttribute('fill', '#888');
        txt.setAttribute('font-size', '18px');
        txt.setAttribute('font-weight', 'bold');

        g.appendChild(txt);
        staticModesGroup.appendChild(g);
    });
}

/**
 * INTERACTIONS
 */
function setupInteractions() {
    wheelSvg.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);

    wheelSvg.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
    window.addEventListener('touchmove', (e) => onDrag(e.touches[0]));
    window.addEventListener('touchend', endDrag);

    wheelSvg.addEventListener('wheel', onScroll, { passive: false });

    wheelSvg.addEventListener('mousemove', onMouseMove);
    wheelSvg.addEventListener('mouseleave', hideTooltip);
}

function onMouseMove(e) {
    if (isDragging) {
        hideTooltip();
        return;
    };

    const rect = wheelSvg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = e.clientX - cx;
    const y = e.clientY - cy;

    const r = Math.sqrt(x * x + y * y);
    const scale = 700 / rect.width;
    const rSVG = r * scale;

    let angleDeg = Math.atan2(y, x) * 180 / Math.PI;

    let virtualAngle = angleDeg - currentRotation;
    virtualAngle = (virtualAngle % 360);
    if (virtualAngle < 0) virtualAngle += 360;

    const shiftedAngle = (virtualAngle + 105) % 360;
    const slotIndex = Math.floor(shiftedAngle / 30);

    // Hit Logic for inverted radii
    let ringObj = null;
    if (rSVG > 250 && rSVG < 330) ringObj = RING_CONFIG[0]; // dim
    else if (rSVG > 170 && rSVG < 250) ringObj = RING_CONFIG[1]; // minor
    else if (rSVG > 90 && rSVG < 170) ringObj = RING_CONFIG[2]; // major

    if (ringObj) {
        const noteIdx = (slotIndex + ringObj.offset) % SEGMENTS;
        const validNoteIdx = noteIdx < 0 ? noteIdx + SEGMENTS : noteIdx;

        const note = KEYS[validNoteIdx];
        const type = ringObj.type;
        const fullChordName = note + (type === 'Major' ? '' : type === 'Minor' ? 'm' : '°');

        if (lastHoveredNote !== fullChordName || tooltip.style.opacity == 0) {
            lastHoveredNote = fullChordName;
            resetHoverTimer(note, type, e.clientX, e.clientY);
        }
    } else {
        hideTooltip();
        if (hoverTimer) clearTimeout(hoverTimer);
    }
}

function resetHoverTimer(note, type, x, y) {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
        showTooltip(note, type, x, y);
    }, 1000);
}

function showTooltip(note, type, x, y) {
    let label = note;
    if (type === 'Minor') label += ' Minor';
    else if (type === 'Dim') label += ' Diminished';
    else label += ' Major';

    let html = `<h3>${label}</h3>`;
    html += `<div style="display:flex; gap:15px; justify-content:center;">`;
    html += createChordCard('Open', note, type);
    html += createChordCard('Barre', note, type);
    html += `</div>`;

    tooltip.innerHTML = html;

    const tx = Math.min(window.innerWidth - 300, Math.max(10, x + 20));
    const ty = Math.min(window.innerHeight - 200, Math.max(10, y + 20));

    tooltip.style.left = px(tx);
    tooltip.style.top = px(ty);
    tooltip.classList.add('visible');
}

function px(n) { return n + "px"; }

function hideTooltip() {
    tooltip.classList.remove('visible');
    if (hoverTimer) clearTimeout(hoverTimer);
}

function createChordCard(variant, note, type) {
    // Lookup shape
    // variant 'Open' vs 'Barre' is legacy in calling code logic, 
    // but we can just use the single defined shape for simplicity 
    // or map existing variants if we had multiple definitions.
    // For this refactor, we primarily use the defined shape in CHORD_SHAPES.

    // Safety check
    if (!CHORD_SHAPES[note] || !CHORD_SHAPES[note][type]) {
        return `<div style="color:red">?</div>`;
    }

    const frets = CHORD_SHAPES[note][type];
    const svg = renderChordSVG(frets);

    return `
        <div style="text-align:center;">
             <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${variant}</div>
             ${svg}
        </div>
    `;
}

/**
 * GENERATE CHORD SVG
 * frets: array of 6 integers [-1, 3, 2, 0, 1, 0]
 * (-1 = muted, 0 = open)
 */
function renderChordSVG(frets) {
    const width = 60;
    const height = 80;
    const paddingX = 10;
    const paddingY = 10;
    const stringGap = 8;
    const fretGap = 12;

    // Determine fret range
    const activeFrets = frets.filter(f => f > 0);
    const minFret = activeFrets.length ? Math.min(...activeFrets) : 0;
    const maxFret = activeFrets.length ? Math.max(...activeFrets) : 0;

    // Calculate start fret (offset)
    // If chords go high up (e.g. 5th fret), shift view. 
    // Usually show 5 frets.
    let startOffset = 0;
    if (minFret > 2) startOffset = minFret - 1;

    // Detect Barre
    // Heuristic: Multiple strings at same lowest fret > 0?
    // Or just look for the bar spanning strings.
    // Simple approach: Find the lowest fret > 0 that has >= 2 notes.
    // Count occurrences of each fret
    const counts = {};
    activeFrets.forEach(f => counts[f] = (counts[f] || 0) + 1);

    let barreFret = null;
    let barreStartStr = 6;
    let barreEndStr = 1;

    // Check for barre candidates in ascending order of fret
    const uniqueFrets = Object.keys(counts).map(Number).sort((a, b) => a - b);
    for (const f of uniqueFrets) {
        if (counts[f] >= 2) {
            // Check span. Which strings use this fret?
            // Strings are 0-5 (low E to high E) in our array logic processing, 
            // but standard notation is 6 to 1. 
            // array index 0 = Low E (string 6). 
            // array index 5 = High E (string 1).
            const stringIndices = frets.map((val, idx) => val === f ? idx : -1).filter(i => i !== -1);
            const firstStrIdx = Math.min(...stringIndices); // e.g. 0 (Low E)
            const lastStrIdx = Math.max(...stringIndices);  // e.g. 5 (High E)

            // "Valid" barre usually covers intermediate strings too (even if they have higher frets)
            // But let's just draw a bar from first to last occurrence at that fret.
            barreFret = f;
            barreStartStr = firstStrIdx;
            barreEndStr = lastStrIdx;
            break; // only one barre (usually the lowest one)
        }
    }

    // SVG Parts
    const svgHeader = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#fff; border-radius:4px; margin:0 auto;">`;
    let svgContent = '';

    // 1. Grid
    // Vertical Lines (Strings)
    for (let i = 0; i < 6; i++) {
        const x = paddingX + i * stringGap;
        svgContent += `<line x1="${x}" y1="${paddingY}" x2="${x}" y2="${paddingY + 5 * fretGap}" stroke="#333" stroke-width="0.5"/>`;
    }
    // Horizontal Lines (Frets)
    for (let i = 0; i <= 5; i++) {
        const y = paddingY + i * fretGap;
        const strokeW = (i === 0 && startOffset === 0) ? 2 : 0.5; // Nut is thicker if offset 0
        svgContent += `<line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="#333" stroke-width="${strokeW}"/>`;
    }

    // 2. Fret Number (if offset > 0)
    if (startOffset > 0) {
        svgContent += `<text x="${paddingX - 6}" y="${paddingY + fretGap}" font-size="10" font-family="Arial" fill="#000" dominant-baseline="middle">${startOffset + 1}</text>`;
    }

    // 3. Dots & Barre
    const getX = (strIdx) => paddingX + strIdx * stringGap;
    const getY = (fret) => paddingY + (fret - startOffset) * fretGap - (fretGap / 2);

    // Draw Barre
    if (barreFret && barreFret > 0) {
        // Adjust for offset
        const relFret = barreFret - startOffset;
        if (relFret > 0 && relFret <= 5) {
            const x1 = getX(barreStartStr);
            const x2 = getX(barreEndStr);
            const y = getY(barreFret);
            svgContent += `<rect x="${x1}" y="${y - 4}" width="${x2 - x1}" height="8" rx="4" fill="#000"/>`;
        }
    }

    // Draw Dots
    frets.forEach((fret, strIdx) => {
        if (fret === -1) {
            // Muted x above nut
            svgContent += `<text x="${getX(strIdx)}" y="${paddingY - 4}" text-anchor="middle" font-size="8">×</text>`;
        } else if (fret === 0) {
            // Open circle above nut
            const x = getX(strIdx);
            svgContent += `<circle cx="${x}" cy="${paddingY - 3}" r="2" fill="none" stroke="#000" stroke-width="0.5"/>`;
        } else {
            // Fret dot
            // Don't draw if covered by barre (unless it's a higher fret on same string, which is logic handled by loop)
            // Actually, if we drew a barre at this fret, we don't need a dot for the specific strings *in* the barre.
            // But simple logic: just draw dots, if it overlaps barre it's black-on-black (invisible)

            // Wait, if it's the exact barre notes, we can skip to keep it clean, 
            // OR just draw it. 
            // Let's Skip dot if it's exactly the barre fret and within barre span, 
            // since the rect covers it.
            const isBarreNote = (barreFret === fret && strIdx >= barreStartStr && strIdx <= barreEndStr);

            if (!isBarreNote || !barreFret) { // Draw if not part of barre visual
                const relFret = fret - startOffset;
                if (relFret > 0 && relFret <= 5) {
                    const cx = getX(strIdx);
                    const cy = getY(fret);
                    svgContent += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#000"/>`;
                }
            }
        }
    });

    return svgHeader + svgContent + '</svg>';
}

/**
 * DRAG & ROTATE
 */
function getAngle(x, y) {
    const rect = wheelSvg.getBoundingClientRect();
    return Math.atan2(y - (rect.top + rect.height / 2), x - (rect.left + rect.width / 2)) * 180 / Math.PI;
}

function startDrag(e) {
    isDragging = true;
    cancelSnap();
    startAngle = getAngle(e.clientX, e.clientY);
    startRotation = currentRotation;
}

function onDrag(e) {
    if (!isDragging) return;
    const angle = getAngle(e.clientX, e.clientY);
    let delta = angle - startAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    currentRotation = startRotation + delta;
    updateView();
}

function endDrag() {
    isDragging = false;
    scheduleSnap();
}

function onScroll(e) {
    e.preventDefault();
    currentRotation += e.deltaY * 0.1;
    cancelSnap();
    updateView();
    clearTimeout(window.scrollSnapTimer);
    window.scrollSnapTimer = setTimeout(scheduleSnap, 200);
}

function updateView() {
    rotatingGroup.setAttribute('transform', `rotate(${currentRotation})`);
}

function scheduleSnap() {
    cancelSnap();
    const seg = 30;
    const target = Math.round(currentRotation / seg) * seg;

    let start = currentRotation;
    let change = target - start;
    let startTime = performance.now();

    function step(t) {
        let dt = t - startTime;
        if (dt >= 400) {
            currentRotation = target;
            updateView();
            return;
        }
        const ratio = dt / 400;
        const ease = 1 - Math.pow(1 - ratio, 3);
        currentRotation = start + change * ease;
        updateView();
        snapRequest = requestAnimationFrame(step);
    }
    snapRequest = requestAnimationFrame(step);
}

function cancelSnap() {
    if (snapRequest) cancelAnimationFrame(snapRequest);
}

// Utils
function polar(r, deg) {
    const rad = deg * Math.PI / 180;
    return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}

function describeArc(x, y, rOuter, rInner, startAngle, endAngle) {
    const startOuter = polar(rOuter, endAngle);
    const endOuter = polar(rOuter, startAngle);
    const startInner = polar(rInner, endAngle);
    const endInner = polar(rInner, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

    return [
        "M", startOuter.x, startOuter.y,
        "A", rOuter, rOuter, 0, largeArc, 0, endOuter.x, endOuter.y,
        "L", endInner.x, endInner.y,
        "A", rInner, rInner, 0, largeArc, 1, startInner.x, startInner.y,
        "Z"
    ].join(" ");
}

init();
