export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const INTERVALS = {
    "R": 0, "b2": 1, "2": 2, "b3": 3, "3": 4, "4": 5, "b5": 6, "5": 7, "#5": 8, "6": 9, "b7": 10, "7": 11
};

export function getNoteFromOffset(startNote, semitones) {
    // startNote e.g. "C", "C#"
    // normalization:
    let note = startNote.toUpperCase();
    let index = NOTES.indexOf(note);
    if (index === -1) return "?";

    let newIndex = (index + semitones) % 12;
    if (newIndex < 0) newIndex += 12;
    return NOTES[newIndex];
}

export function parseNote(noteString) {
    // "C#4" -> { note: "C#", octave: 4 }
    // "E2" -> { note: "E", octave: 2 }
    const match = noteString.match(/^([A-G][#b]?)(-?\d+)$/);
    if (!match) return null;
    return { note: match[1], octave: parseInt(match[2]) };
}

export function getFrequency(noteName, octave) {
    // A4 = 440Hz.
    // Distance from A4 in semitones.
    // Standard: C4 is 261.63, A4 is 440.

    const noteIndex = NOTES.indexOf(noteName);
    const aIndex = NOTES.indexOf("A"); // 9

    // Calculate total semitones from C0
    // But easier relative to A4 (57 semitones from C0)

    // Calculate semitone distance from A4
    // (Octave - 4) * 12 + (noteIndex - aIndex)
    const semitonesFromA4 = ((octave - 4) * 12) + (noteIndex - aIndex);

    return 440 * Math.pow(2, semitonesFromA4 / 12);
}

export function getTuningOffsets(tuningArray) {
    // Return tuning in semitone values relative to simple C0 or just frequency?
    // Let's stick to parsing on the fly for now or precache if performance issues.
    return tuningArray.map(t => parseNote(t));
}
