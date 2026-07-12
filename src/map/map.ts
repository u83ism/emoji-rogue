export type CreateCallback = (x: number, y: number, contents: number) => void;

/** A width x height grid filled with `value`. */
export function fillMap(
	width: number,
	height: number,
	value: number,
): number[][] {
	const map: number[][] = [];
	for (let i = 0; i < width; i++) {
		const column: number[] = [];
		for (let j = 0; j < height; j++) {
			column.push(value);
		}
		map.push(column);
	}
	return map;
}
