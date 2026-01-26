// Basic Chord Data Structure
// In a real app, this would be much larger or fetched from a database.
// Format: "Root": { "Type": { "VariationName": [ {string: s, fret: f, interval: i} ] } }
// Strings are 1-based (1=high E, 6=low E)
// 0 = open, -1 = muted (x)

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const CHORD_DATA = {
    "C": {
        "major": {
            "Open": {
                name: "C Open",
                difficulty: "Beginner",
                fingering: [
                    { string: 6, fret: -1 }, // x
                    { string: 5, fret: 3, finger: 3, interval: "R" }, // C
                    { string: 4, fret: 2, finger: 2, interval: "3" }, // E
                    { string: 3, fret: 0, finger: 0, interval: "5" }, // G
                    { string: 2, fret: 1, finger: 1, interval: "R" }, // C
                    { string: 1, fret: 0, finger: 0, interval: "3" }  // E
                ]
            },
            "Barre (Root 6)": {
                name: "C Barre (8th Fret)",
                difficulty: "Intermediate",
                fingering: [
                    { string: 6, fret: 8, finger: 1, interval: "R", barre: true, barreStart: 6, barreEnd: 1 },
                    { string: 5, fret: 10, finger: 3, interval: "5" },
                    { string: 4, fret: 10, finger: 4, interval: "R" },
                    { string: 3, fret: 9, finger: 2, interval: "3" },
                    { string: 2, fret: 8, finger: 1, interval: "5" },
                    { string: 1, fret: 8, finger: 1, interval: "R" }
                ]
            },
            "Barre (Root 5)": {
                name: "C Barre (3rd Fret)",
                difficulty: "Intermediate",
                fingering: [
                    { string: 6, fret: -1 },
                    { string: 5, fret: 3, finger: 1, interval: "R", barre: true, barreStart: 5, barreEnd: 1 },
                    { string: 4, fret: 5, finger: 2, interval: "5" },
                    { string: 3, fret: 5, finger: 3, interval: "R" },
                    { string: 2, fret: 5, finger: 4, interval: "3" },
                    { string: 1, fret: 3, finger: 1, interval: "5" }
                ]
            }
        },
        "minor": {
            "Open (Rare)": {
                name: "Cm Open",
                difficulty: "Intermediate",
                fingering: [
                    { string: 6, fret: -1 },
                    { string: 5, fret: 3, finger: 3, interval: "R" },
                    { string: 4, fret: 1, finger: 1, interval: "b3" },
                    { string: 3, fret: 0, finger: 0, interval: "5" },
                    { string: 2, fret: 1, finger: 2, interval: "b3" }, // Difficult stretch/voicing
                    { string: 1, fret: 3, finger: 4, interval: "5" }
                ]
            },
            "Barre (Root 5)": {
                name: "Cm Barre (3rd Fret)",
                difficulty: "Intermediate",
                fingering: [
                    { string: 6, fret: -1 },
                    { string: 5, fret: 3, finger: 1, interval: "R", barre: true, barreStart: 5, barreEnd: 1 },
                    { string: 4, fret: 5, finger: 3, interval: "5" },
                    { string: 3, fret: 5, finger: 4, interval: "R" },
                    { string: 2, fret: 4, finger: 2, interval: "b3" },
                    { string: 1, fret: 3, finger: 1, interval: "5" }
                ]
            }
        }
    },
    "G": {
        "major": {
            "Open": {
                name: "G Open",
                difficulty: "Beginner",
                fingering: [
                    { string: 6, fret: 3, finger: 2, interval: "R" },
                    { string: 5, fret: 2, finger: 1, interval: "3" },
                    { string: 4, fret: 0, finger: 0, interval: "5" },
                    { string: 3, fret: 0, finger: 0, interval: "R" },
                    { string: 2, fret: 0, finger: 0, interval: "3" }, // Or 3rd fret usually
                    { string: 1, fret: 3, finger: 3, interval: "R" }
                ]
            }
        }
    }
    // Add more...
};

// Helper: Generate placeholder data for other roots to prevent empty UI
NOTES.forEach(note => {
    if (!CHORD_DATA[note]) {
        CHORD_DATA[note] = {
            "major": {},
            "minor": {},
            "7": {},
            "maj7": {}
        };
    }
});
