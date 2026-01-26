
import { appState } from './appState.js';
import { NOTES, getNoteFromOffset, getFrequency, parseNote } from './theory.js';
import { CHORD_DATA, getGenericShape } from './data.js';
import { playSingleNote, playChord } from './audio.js';

const SVG_NS = "http://www.w3.org/2000/svg";

export function render() {
    renderFretboard();
    updateChordInfo();
}

function renderFretboard() {
    const container = document.getElementById('fretboard-container');
    container.innerHTML = '';

    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    container.appendChild(svg);

    const marginX = 50;
    const marginY = 30;
    const boardWidth = width - (marginX * 2);
    const boardHeight = height - (marginY * 2);

    // Draw Board
    drawBoard(svg, marginX, marginY, boardWidth, boardHeight);

    // Draw Chord
    drawChord(svg, marginX, marginY, boardWidth, boardHeight);
}

function drawBoard(svg, x, y, w, h) {
    // Strings
    const stringSpacing = h / (appState.tuning.length - 1);

    appState.tuning.forEach((note, i) => {
        const sy = y + (i * stringSpacing);
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", sy);
        line.setAttribute("x2", x + w);
        line.setAttribute("y2", sy);
        line.setAttribute("stroke", "#666");
        line.setAttribute("stroke-width", 1 + (i * 0.5)); // Thick bottom strings

        // Make string interactive (entire line?) -> maybe just frets logic
        svg.appendChild(line);
    });

    // Frets
    const fretCount = 15;
    const fretStep = w / fretCount;

    for (let i = 0; i <= fretCount; i++) {
        const fx = x + (i * fretStep);
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", fx);
        line.setAttribute("y1", y);
        line.setAttribute("x2", fx);
        line.setAttribute("y2", y + h);
        line.setAttribute("stroke", i === 0 ? "#ddd" : "#444"); // Nut
        line.setAttribute("stroke-width", i === 0 ? 4 : 2);
        svg.appendChild(line);

        // Interaction Areas (Invisible Rects for clicking)
        if (i > 0) {
            // Area between i-1 and i
            const regionX = fx - fretStep;
            const regionW = fretStep;

            // Loop strings for individual fret-string cells
            appState.tuning.forEach((_, sIdx) => {
                const sy = y + (sIdx * stringSpacing);
                const cell = document.createElementNS(SVG_NS, "rect");
                cell.setAttribute("x", regionX);
                cell.setAttribute("y", sy - (stringSpacing / 2));
                cell.setAttribute("width", regionW);
                cell.setAttribute("height", stringSpacing);
                cell.setAttribute("fill", "transparent");
                cell.setAttribute("class", "fret-cell");
                cell.style.cursor = "pointer";

                // Click to play single note
                cell.addEventListener('click', () => {
                    handleFretClick(sIdx, i);
                });

                svg.appendChild(cell);
            });
        }
    }

    // Capo Visual
    if (appState.capo > 0) {
        const cx = x + (appState.capo * fretStep) - (fretStep / 2); // On the fret wire? Usually between.
        // Capo sits BEHIND the fret. So at fret N.
        const fretX = x + (appState.capo * fretStep);

        const capoRect = document.createElementNS(SVG_NS, "rect");
        capoRect.setAttribute("x", fretX - 10);
        capoRect.setAttribute("y", y - 10);
        capoRect.setAttribute("width", 20);
        capoRect.setAttribute("height", h + 20);
        capoRect.setAttribute("fill", "rgba(255, 255, 255, 0.2)");
        capoRect.setAttribute("stroke", "#accent");
        capoRect.setAttribute("rx", 5);
        svg.appendChild(capoRect);
    }
}

function drawChord(svg, marginX, marginY, boardWidth, boardHeight) {
    // 1. Get Base Shape (C Major)
    const baseShape = getGenericShape(appState.type, appState.variationIndex);
    if (!baseShape) return;

    appState.currentChordName = `${appState.root} ${baseShape.name.split(" ")[1] || appState.type}`; // approximate name update

    // 2. Calculate Transposition
    // Target Root vs C
    const rootIndex = NOTES.indexOf(appState.root);
    const cIndex = NOTES.indexOf("C");
    let semitoneShift = rootIndex - cIndex;
    if (semitoneShift < 0) semitoneShift += 12;

    // We need to shift the shape such that the Intervals align.
    // Simplifying: We just shift the frets by semitoneShift.
    // BUT: Open strings (fret 0) don't shift unless we use Capo or Barre.

    // Logic:
    // If shape has open strings, we check if appState.capo == semitoneShift.
    // If not, we might ideally warn, but let's just shift visually for now or assume virtual capo?
    // "Interactive" means if I pick F Major (Open), it implies I pressed Capo? No.
    // Standard Guitar Logic: F Major with Open C shape is impossible without Capo 5.
    // So, if the user selects "C Shape" but Root "F", we AUTOMATICALLY SET CAPO?
    // OR we show the shape moved up and say "Barre 5".

    // Let's implement: Shift all frets by semitoneShift. 
    // If a string was 0, it becomes 0 + shift.
    // If a string was -1 (mute), it stays -1.

    // This effectively makes "C shape" at F become a "Barre" at 5th fret (if we finger 0 as 5).

    const fretCount = 15;
    const fretStep = boardWidth / fretCount;
    const stringSpacing = boardHeight / (appState.tuning.length - 1);

    const activeFrets = []; // Store for audio playback

    baseShape.fingering.forEach(f => {
        let displayFret = f.fret;

        if (displayFret !== -1) {
            // Apply Transposition
            displayFret += semitoneShift;

            // Apply Capo Logic (User manually set capo?)
            // Or does Capo replace the Nut?
            // If I have Capo 2, and play Open E shape (E Major).
            // The sound is F# Major.
            // The visual is: Capo at 2. Dots at 2, 4, 4, 3, 2, 2. (Relative to nut 0).
            // Relative to Capo: 0, 2, 2, 1, 0, 0.

            // Let's stick to Absolute Fretboard for rendering.
            // If user sets Capo 0, and selects Root F, Type Major.
            // We render C-shape shifted to 5.
            // Visual: 5, 8, 7, 5, 6, 5. (Barre C shape).

        }

        // Draw
        if (displayFret !== -1) {
            const cx = marginX + (displayFret * fretStep) - (fretStep / 2);
            /* Handle fret 0 (Open) - Draw behind nut? 
               Our '0' index loop draws nut at x.
               fret 1 is at x + step. Center is x + step/2.
               fret 0 center is x - step/2.
            */

            const cy = marginY + ((f.string - 1) * stringSpacing); // Data uses 1-based string index (1=HighE)
            // But checking tuning array order:
            // tuning: ["E2", ... "E4"]. 
            // visual: Top line usually string 1 (High E).
            // tuning[0] is E2 (Low E)? 
            // Check appState: `tuning: ["E2", "A2", "D3", "G3", "B3", "E4"]`.
            // SVG i=0 is top.
            // If i=0 is High E (E4), then tuning array should be reversed or accessed reverse.
            // Standard: Strings 1-6. 1 is High E.
            // Let's assume SVG i=0 is String 1. (High E).
            // Then data `string: 1` maps to i=0.

            // Draw Circle
            const circle = document.createElementNS(SVG_NS, "circle");
            circle.setAttribute("cx", cx);
            circle.setAttribute("cy", cy);
            circle.setAttribute("r", 10);
            circle.setAttribute("fill", f.interval === "R" ? "#ff3366" : "#00ffcc");
            circle.setAttribute("stroke", "#fff");

            // Add Text
            const text = document.createElementNS(SVG_NS, "text");
            text.setAttribute("x", cx);
            text.setAttribute("y", cy + 4);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", "#000");
            text.setAttribute("font-size", "10");
            text.textContent = f.interval;

            svg.appendChild(circle);
            svg.appendChild(text);

            // Collect for audio
            // Freq = Tuning[string-1] + fret semitones
            // Need to reverse logic if tuning array is Low-to-High but visual is High-to-Low.
            // appState.tuning is Low-to-High.
            // String 1 (visual top) is tuning[5].

            const stringIndexInTuning = appState.tuning.length - f.string; // 6 - 1 = 5 (E4). Correct.
            const openNote = appState.tuning[stringIndexInTuning];
            const parsed = parseNote(openNote);
            if (openNote) {
                // Calculate freq using Fret (displayFret includes shift)
                // Capo adds to freq? 
                // Wait, if we shifted visual fret physically, the freq comes from physics.
                // Physics: Open String pitch + Fret.
                // If Capo is at K. The string length shortens.
                // But our 'displayFret' is absolute fret number.
                // So Freq = OpenString + displayFret.

                // IF we use Capo control, it physically holds down strings at fret K.
                // Any 'Open' notes in shape should effectively be at fret K.
                // But we already shifted.

                const freq = getFrequency(parsed.note, parsed.octave) * Math.pow(2, displayFret / 12);
                activeFrets.push(freq);
            }
        }
    });

    appState.activeFrets = activeFrets;
}

function handleFretClick(stringIdx, fret) {
    // stringIdx 0 (Top visual) -> String 1 (High E) -> tuning[5]
    const tuningIdx = appState.tuning.length - 1 - stringIdx;
    const openNote = appState.tuning[tuningIdx];
    const parsed = parseNote(openNote);
    const freq = getFrequency(parsed.note, parsed.octave) * Math.pow(2, fret / 12);

    playSingleNote(freq);
}

function updateChordInfo() {
    document.getElementById('current-chord-name').innerText = appState.currentChordName + (appState.capo ? ` (Capo ${appState.capo})` : "");
}
