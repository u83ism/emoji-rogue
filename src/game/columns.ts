/** Column-major grid builders shared by floor generation and the arena fixture. */

export const buildEmptyColumns = (width: number): number[][] => {
	const columns: number[][] = [];
	for (let x = 0; x < width; x++) {
		columns.push([]);
	}
	return columns;
};

export const buildUnexploredColumns = (
	width: number,
	height: number,
): boolean[][] => {
	const columns: boolean[][] = [];
	for (let x = 0; x < width; x++) {
		columns.push(new Array<boolean>(height).fill(false));
	}
	return columns;
};
