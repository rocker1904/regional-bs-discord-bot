/** v2 score accuracy is a 0–1 fraction; render it as a percentage string to 2 d.p. */
export function formatAccuracy(accuracy: number): string {
    return `${Math.round(accuracy * 10000) / 100}%`;
}

/**
 * Turn a raw difficulty (e.g. "_ExpertPlus_SoloStandard") into a short label
 * (e.g. "Expert+"). Falls back to the raw value if it isn't in the expected shape.
 */
export function parseDifficulty(difficultyRaw: string): string {
    const difficulty = difficultyRaw.split('_')[1];
    return difficulty ? difficulty.replace('Plus', '+') : difficultyRaw;
}
