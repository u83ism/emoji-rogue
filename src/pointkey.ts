/**
 * Canonical string key for a grid point, used wherever points index into a
 * Record. Centralized so every subsystem produces the same key shape (the
 * original rot.js mixed "x,y" and "x.y" styles across files, which made keys
 * from different subsystems silently incompatible).
 */
export function encodePointKey(x: number, y: number): string {
	return `${x},${y}`;
}

/** Parses a key produced by encodePointKey back into [x, y]. */
export function decodePointKey(key: string): [number, number] {
	const separatorIndex = key.indexOf(",");
	const x = Number(key.slice(0, separatorIndex));
	const y = Number(key.slice(separatorIndex + 1));
	if (separatorIndex === -1 || Number.isNaN(x) || Number.isNaN(y)) {
		throw new Error(`malformed point key: ${key}`);
	}
	return [x, y];
}
