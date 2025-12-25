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

// Roman Numerals for Overlay - Updated radii
const OVERLAY_LABELS = [
    { text: 'I', slot: 0, r: 150 },
    { text: 'V', slot: 1, r: 150 },
    { text: 'IV', slot: 11, r: 150 },
    { text: 'vi', slot: 0, r: 230 },
    { text: 'iii', slot: 1, r: 230 },
    { text: 'ii', slot: 11, r: 230 },
    { text: 'vii°', slot: 0, r: 310 } // Aligned with iii
];

// Mode Labels (Static Outer Ring)
const MODE_LABELS = [
    { t: 'Ionian', slot: 0 },
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
    // New Shape "Fan"

    const R_IN = 90;
    const R_MID1 = 170;
    const R_MID2 = 250;
    const R_OUT = 330;

    const A_LEFT = -135; // Start of Slot 11
    const A_MID_RIGHT = -75; // Start of Slot 1
    const A_RIGHT = -45; // End of Slot 1

    // Path Trace
    const pBotRight = polar(R_IN, A_RIGHT);
    const pBotLeft = polar(R_IN, A_LEFT);
    const pMidTopLeft = polar(R_MID2, A_LEFT); // Top-left of Minor Row
    const pDimStart = polar(R_MID2, A_MID_RIGHT); // Indent start
    const pDimTopStart = polar(R_OUT, A_MID_RIGHT);
    const pDimTopEnd = polar(R_OUT, A_RIGHT);

    const d = `
        M ${pBotRight.x} ${pBotRight.y}
        A ${R_IN} ${R_IN} 0 0 0 ${pBotLeft.x} ${pBotLeft.y}
        L ${pMidTopLeft.x} ${pMidTopLeft.y}
        A ${R_MID2} ${R_MID2} 0 0 1 ${pDimStart.x} ${pDimStart.y}
        L ${pDimTopStart.x} ${pDimTopStart.y}
        A ${R_OUT} ${R_OUT} 0 0 1 ${pDimTopEnd.x} ${pDimTopEnd.y}
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
    return `
        <div style="text-align:center;">
            <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${variant}</div>
            <svg width="60" height="80" viewBox="0 0 60 80" style="background:#fff; border-radius:4px; margin:0 auto;">
                    <rect x="10" y="10" width="40" height="60" fill="none" stroke="#333" stroke-width="1"/>
                    <line x1="18" y1="10" x2="18" y2="70" stroke="#333" stroke-width="0.5"/>
                    <line x1="26" y1="10" x2="26" y2="70" stroke="#333" stroke-width="0.5"/>
                    <line x1="34" y1="10" x2="34" y2="70" stroke="#333" stroke-width="0.5"/>
                    <line x1="42" y1="10" x2="42" y2="70" stroke="#333" stroke-width="0.5"/>
                    
                    <line x1="10" y1="22" x2="50" y2="22" stroke="#333" stroke-width="0.5"/>
                    <line x1="10" y1="34" x2="50" y2="34" stroke="#333" stroke-width="0.5"/>
                    <line x1="10" y1="46" x2="50" y2="46" stroke="#333" stroke-width="0.5"/>
                    <line x1="10" y1="58" x2="50" y2="58" stroke="#333" stroke-width="0.5"/>
                    
                    <rect x="10" y="8" width="40" height="4" fill="#000"/>
                    
                    ${variant === 'Barre' ? '<rect x="10" y="24" width="40" height="4" rx="2" fill="#000"/>' : ''}
                    <circle r="3" cx="18" cy="${variant === 'Open' ? 22 : 46}" fill="#000"/>
                    <circle r="3" cx="26" cy="${variant === 'Open' ? 34 : 46}" fill="#000"/>
                    <circle r="3" cx="42" cy="${variant === 'Open' ? 34 : 34}" fill="#000"/>
            </svg>
        </div>
    `;
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
        "A", 250, 250, 0, 0, 1, -63.63961030678927 - 241.481456572267,
        "Z"
    ].join(" ");
}

init();
