
import { bindEvents } from './events.js';
import { render } from './core.js';

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    render();
    console.log("Smart Chord Explorer Initialized");
});
