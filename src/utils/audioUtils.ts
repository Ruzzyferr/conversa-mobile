/**
 * Generates a deterministic array of numbers based on a seed string (e.g. audio URL).
 * Used to create consistent waveforms for audio files that don't have real metering data.
 */
export const generateWaveform = (seed: string, length: number): number[] => {
    const result: number[] = [];
    let hash = 0;

    // Simple hash function
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }

    // Generate numbers
    for (let i = 0; i < length; i++) {
        // Re-hash for each step to get pseudo-random-like sequence
        hash = (hash * 9301 + 49297) % 233280;

        // Normalize to 0-1 range
        const normalized = hash / 233280;

        // Base height + random height
        let height = 0.3 + (normalized * 0.7);

        // Taper the edges for a smoother look
        // First 20% and last 20% will be scaled down
        const taperLength = Math.floor(length * 0.2);

        if (i < taperLength) {
            // Fade in
            height *= (i / taperLength);
        } else if (i > length - taperLength) {
            // Fade out
            height *= ((length - i) / taperLength);
        }

        // Create a minimum height so it doesn't disappear completely
        result.push(Math.max(0.15, height));
    }

    return result;
};
