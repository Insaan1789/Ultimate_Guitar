
// Single Source of Truth
export const appState = {
    root: "C",
    type: "major",
    variationIndex: 0,
    capo: 0,
    // Standard Tuning: E2, A2, D3, G3, B3, E4
    // Using simple semitone offsets from C0 might be better, but strings are visual.
    // Let's store as Note Names + Octave for display, but frequency calc will need parsing.
    tuning: ["E2", "A2", "D3", "G3", "B3", "E4"],
    showNotes: true,
    leftHanded: false,

    // Derived/UI State
    currentChordData: null,
    currentChordName: "C Major",
    activeFrets: [], // For debug/visualization {string, fret, note}

    // Audio State
    volume: 0.5
};

// Debug helper
window.appState = appState;
