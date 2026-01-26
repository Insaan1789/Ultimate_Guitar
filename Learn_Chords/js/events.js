import { appState } from './appState.js';
import { render } from './core.js';
import { playChord } from './audio.js';
import { NOTES } from './theory.js';
import { CHORD_DATA } from './data.js';

export function bindEvents() {
    // Search
    const searchInput = document.getElementById('chord-search');
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const match = val.match(/^([A-G][#b]?)(.*)$/i);
        if (match) {
            let root = match[1].toUpperCase();
            // Normalize case for root? (e.g. c -> C)
            if (root.length > 1) {
                root = root.charAt(0).toUpperCase() + root.slice(1);
            }

            appState.root = root;
            // Match type vaguely? 
            // If user types Cm -> type = minor.
            // If Cmaj7 -> type = maj7.
            // Simple heuristics
            const suffix = match[2];
            if (suffix.includes("m") && !suffix.includes("maj")) appState.type = "minor";
            else if (suffix.includes("maj7")) appState.type = "maj7"; // data.js needs to support this key
            else if (suffix.includes("7")) appState.type = "7";
            else appState.type = "major";

            render();
        }
    });

    // Root Selector
    const rootSelector = document.getElementById('root-selector');
    // Re-render selector based on theory? No, static for now, just bind.
    // Actually we need to regenerate DOM for root buttons if not present
    renderRootButtons(rootSelector);

    rootSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('root-btn')) {
            appState.root = e.target.dataset.note;
            document.querySelectorAll('.root-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            render();
        }
    });

    // Type Selector
    const typeSelector = document.getElementById('type-selector');
    typeSelector.addEventListener('change', (e) => {
        appState.type = e.target.value;
        render();
        updateVariationsList();
    });

    // Variations List
    const shapeList = document.getElementById('shape-list');
    shapeList.addEventListener('click', (e) => {
        const item = e.target.closest('.shape-item');
        if (item) {
            appState.variationIndex = parseInt(item.dataset.index);
            render();
            // Highlight active
            document.querySelectorAll('.shape-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        }
    });

    // Capo Slider
    const capoSlider = document.getElementById('capo-slider');
    capoSlider.addEventListener('input', (e) => {
        appState.capo = parseInt(e.target.value);
        document.getElementById('capo-val').textContent = appState.capo;
        render(); // Repaint
    });

    // Play Button
    document.getElementById('play-chord-btn').addEventListener('click', () => {
        playChord(appState.activeFrets);
    });

    // Initial UI state update
    updateVariationsList();
}

function renderRootButtons(container) {
    container.innerHTML = '';
    NOTES.forEach(note => {
        const btn = document.createElement('div');
        btn.classList.add('root-btn');
        if (note === appState.root) btn.classList.add('active');
        btn.innerText = note;
        btn.dataset.note = note;
        container.appendChild(btn);
    });
}

function updateVariationsList() {
    const list = document.getElementById('shape-list');
    list.innerHTML = '';

    // We use "C" data as template
    const templateData = CHORD_DATA["C"][appState.type];
    if (templateData) {
        templateData.forEach((shape, index) => {
            const li = document.createElement('li');
            li.className = `shape-item ${index === appState.variationIndex ? 'active' : ''}`;
            li.dataset.index = index;
            li.innerHTML = `<span class="shape-name">${shape.name}</span>`;
            list.appendChild(li);
        });
    } else {
        list.innerHTML = '<li>No shapes found</li>';
    }
}
