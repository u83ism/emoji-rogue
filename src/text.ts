/**
 * Text tokenization and line-breaking routines for `%c{fg}`/`%b{bg}` formatted strings.
 */

const RE_COLORS = /%([bc]){([^}]*)}/g;

export type Token =
	| { type: "text"; value: string }
	| { type: "newline" }
	| { type: "fg"; value: string }
	| { type: "bg"; value: string };

export interface Measurement {
	width: number;
	height: number;
}

/**
 * Measure the size of a resulting text block.
 */
export function measure(
	str: string,
	maxWidth = Number.POSITIVE_INFINITY,
): Measurement {
	const result: Measurement = { width: 0, height: 1 };
	const tokens = tokenize(str, maxWidth);
	let lineWidth = 0;

	for (const token of tokens) {
		switch (token.type) {
			case "text":
				lineWidth += token.value.length;
				break;

			case "newline":
				result.height++;
				result.width = Math.max(result.width, lineWidth);
				lineWidth = 0;
				break;
		}
	}
	result.width = Math.max(result.width, lineWidth);

	return result;
}

/**
 * Convert a string to a series of formatting/text tokens, with line breaks
 * already inserted for the given maximum width.
 */
export function tokenize(
	str: string,
	maxWidth = Number.POSITIVE_INFINITY,
): Token[] {
	const result: Token[] = [];

	/* first tokenization pass - split texts and color formatting commands */
	let offset = 0;
	str.replace(
		RE_COLORS,
		(match: string, type: string, name: string, index: number) => {
			/* string before */
			const part = str.substring(offset, index);
			if (part.length) {
				result.push({ type: "text", value: part });
			}

			/* color command */
			result.push({ type: type === "c" ? "fg" : "bg", value: name.trim() });

			offset = index + match.length;
			return "";
		},
	);

	/* last remaining part */
	const part = str.substring(offset);
	if (part.length) {
		result.push({ type: "text", value: part });
	}

	return breakLines(result, maxWidth);
}

/** Insert line breaks into the first-pass tokenized data. */
function breakLines(tokens: Token[], maxWidth: number): Token[] {
	const width = maxWidth || Infinity;

	let i = 0;
	let lineLength = 0;
	let lastTokenWithSpace = -1;

	while (i < tokens.length) {
		/* take all text tokens, remove space, apply linebreaks */
		const token = tokens[i];
		if (token === undefined) {
			throw new Error("unreachable: i is within tokens.length");
		}
		if (token.type === "newline") {
			/* reset */
			lineLength = 0;
			lastTokenWithSpace = -1;
		}
		if (token.type !== "text") {
			/* skip non-text tokens */
			i++;
			continue;
		}

		/* remove spaces at the beginning of line */
		while (lineLength === 0 && token.value.charAt(0) === " ") {
			token.value = token.value.substring(1);
		}

		/* forced newline? insert two new tokens after this one */
		const newlineIndex = token.value.indexOf("\n");
		if (newlineIndex !== -1) {
			token.value = breakInsideToken(tokens, i, newlineIndex, true);

			/* if there are spaces at the end, we must remove them (we do not want the line too long) */
			token.value = token.value.replace(/ +$/, "");
		}

		/* token degenerated? */
		if (!token.value.length) {
			tokens.splice(i, 1);
			continue;
		}

		if (lineLength + token.value.length > width) {
			/* line too long, find a suitable breaking spot */

			/* is it possible to break within this token? */
			let breakIndex = -1;
			for (;;) {
				const nextIndex = token.value.indexOf(" ", breakIndex + 1);
				if (nextIndex === -1) {
					break;
				}
				if (lineLength + nextIndex > width) {
					break;
				}
				breakIndex = nextIndex;
			}

			if (breakIndex !== -1) {
				/* break at space within this one */
				token.value = breakInsideToken(tokens, i, breakIndex, true);
			} else if (lastTokenWithSpace !== -1) {
				/* is there a previous token where a break can occur? */
				const spacedToken = tokens[lastTokenWithSpace];
				if (spacedToken === undefined || spacedToken.type !== "text") {
					throw new Error(
						"unreachable: lastTokenWithSpace must reference a text token",
					);
				}
				const spaceIndex = spacedToken.value.lastIndexOf(" ");
				spacedToken.value = breakInsideToken(
					tokens,
					lastTokenWithSpace,
					spaceIndex,
					true,
				);
				i = lastTokenWithSpace;
			} else {
				/* force break in this token */
				token.value = breakInsideToken(tokens, i, width - lineLength, false);
			}
		} else {
			/* line not long, continue */
			lineLength += token.value.length;
			if (token.value.indexOf(" ") !== -1) {
				lastTokenWithSpace = i;
			}
		}

		i++; /* advance to next token */
	}

	tokens.push({
		type: "newline",
	}); /* insert fake newline to fix the last text line */

	/* remove trailing space from text tokens before newlines */
	let lastTextToken: Extract<Token, { type: "text" }> | null = null;
	for (const token of tokens) {
		switch (token.type) {
			case "text":
				lastTextToken = token;
				break;
			case "newline":
				if (lastTextToken) {
					lastTextToken.value = lastTextToken.value.replace(/ +$/, "");
				}
				lastTextToken = null;
				break;
		}
	}

	tokens.pop(); /* remove fake token */

	return tokens;
}

/**
 * Split the text token at `tokenIndex` into two, inserting a newline token
 * between them. Returns the (now-shortened) value of the original token.
 */
function breakInsideToken(
	tokens: Token[],
	tokenIndex: number,
	breakIndex: number,
	removeBreakChar: boolean,
): string {
	const token = tokens[tokenIndex];
	if (token === undefined || token.type !== "text") {
		throw new Error("breakInsideToken: tokenIndex must reference a text token");
	}
	const newTextToken: Token = {
		type: "text",
		value: token.value.substring(breakIndex + (removeBreakChar ? 1 : 0)),
	};
	tokens.splice(tokenIndex + 1, 0, { type: "newline" }, newTextToken);
	return token.value.substring(0, breakIndex);
}
