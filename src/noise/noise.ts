/**
 * Shared contract for all noise generators: a pure function from a 2D
 * coordinate to a noise value.
 */
export type NoiseSource = (x: number, y: number) => number;
