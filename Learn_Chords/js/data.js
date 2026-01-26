export const CHORD_DATA = {
    "C": {
        "major": [
            {
                name: "Open C",
                fingering: [
                    { string: 6, fret: -1 },
                    { string: 5, fret: 3, interval: "R" },
                    { string: 4, fret: 2, interval: "3" },
                    { string: 3, fret: 0, interval: "5" },
                    { string: 2, fret: 1, interval: "R" },
                    { string: 1, fret: 0, interval: "3" }
                ]
            },
            {
                name: "Barre (A Shape)",
                fingering: [
                    { string: 6, fret: -1 },
                    { string: 5, fret: 3, interval: "R", barre: true, barreStart: 5, barreEnd: 1 },
                    { string: 4, fret: 5, interval: "5" },
                    { string: 3, fret: 5, interval: "R" },
                    { string: 2, fret: 5, interval: "3" },
                    { string: 1, fret: 3, interval: "5" }
                ]
            },
            {
                name: "Barre (E Shape)",
                fingering: [
                    { string: 6, fret: 8, interval: "R", barre: true, barreStart: 6, barreEnd: 1 },
                    { string: 5, fret: 10, interval: "5" },
                    { string: 4, fret: 10, interval: "R" },
                    { string: 3, fret: 9, interval: "3" },
                    { string: 2, fret: 8, interval: "5" },
                    { string: 1, fret: 8, interval: "R" }
                ]
            }
        ],
        "minor": [
            {
                name: "Cm Barre (A Shape)",
                fingering: [
                    { string: 6, fret: -1 },
                    { string: 5, fret: 3, interval: "R", barre: true, barreStart: 5, barreEnd: 1 },
                    { string: 4, fret: 5, interval: "5" },
                    { string: 3, fret: 5, interval: "R" },
                    { string: 2, fret: 4, interval: "b3" },
                    { string: 1, fret: 3, interval: "5" }
                ]
            },
            {
                name: "Cm Barre (E Shape)",
                fingering: [
                    { string: 6, fret: 8, interval: "R", barre: true, barreStart: 6, barreEnd: 1 },
                    { string: 5, fret: 10, interval: "5" },
                    { string: 4, fret: 10, interval: "R" },
                    { string: 3, fret: 8, interval: "b3" },
                    { string: 2, fret: 8, interval: "5" },
                    { string: 1, fret: 8, interval: "R" }
                ]
            }
        ],
        "7": [ // Dominant 7
            {
                name: "C7 Open",
                fingering: [
                    { string: 6, fret: -1 },
                    { string: 5, fret: 3, interval: "R" },
                    { string: 4, fret: 2, interval: "3" },
                    { string: 3, fret: 3, interval: "b7" },
                    { string: 2, fret: 1, interval: "R" },
                    { string: 1, fret: 0, interval: "3" }
                ]
            }
        ]
    }
    // Note: In a real "Smart" app, we would algorithmically generate these based on Intervals + Scale, 
    // but for this robustness level, we will use a Look-Up Table for standard shapes 
    // and rely on Transposition Logic for other roots.
};

// Helper to get generic shape for transposition
export function getGenericShape(type, variationIndex) {
    // "C" is our reference root for shapes.
    // If user asks for "D", we take "C" shape and shift everything +2 frets.
    // IF the shape has open strings, we can only shift if we use a Capo (or Barre everything).
    // CAGED system logic:
    // Actually, storing "Moveable Shapes" is better.
    // Let's stick to: We store "C" shapes. 
    // If user wants F (Root index 5 vs C index 0 -> +5 semitones).
    // We try to find a shape that fits.

    // Simplification for this task:
    // We will dynamically transpose the "C" shapes using Capo logic if "Open" strings exist
    // OR we just shift the frets if it's a movable shape (Barre).

    // Better approach for "Smart Chord Explorer":
    // Store generic shapes relative to Root on specific string.
    // e.g. "E Shape" Root is on String 6.
    // "A Shape" Root is on String 5.

    // For now, let's just use the CHORD_DATA["C"] as the library and transpose on the fly.

    if (CHORD_DATA["C"][type] && CHORD_DATA["C"][type][variationIndex]) {
        return CHORD_DATA["C"][type][variationIndex];
    }
    return null;
}
