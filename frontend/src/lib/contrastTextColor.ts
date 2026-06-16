function linearizeChannel(c: number): number {
	const s = c / 255;
	return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
	const R = linearizeChannel(rgb.r);
	const G = linearizeChannel(rgb.g);
	const B = linearizeChannel(rgb.b);
	return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function parseHexRgb(input: string): { r: number; g: number; b: number } | null {
	let h = input.trim().slice(1);
	if (h.length === 3) {
		h = [...h].map((c) => c + c).join('');
	}
	if (h.length === 8) {
		h = h.slice(0, 6);
	}
	if (h.length !== 6) {
		return null;
	}
	const n = Number.parseInt(h, 16);
	if (Number.isNaN(n)) {
		return null;
	}
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function parseRgbFunction(input: string): { r: number; g: number; b: number } | null {
	const m = input
		.trim()
		.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
	if (!m) {
		return null;
	}
	const r = Number(m[1]);
	const g = Number(m[2]);
	const b = Number(m[3]);
	if ([r, g, b].some((x) => x < 0 || x > 255)) {
		return null;
	}
	return { r, g, b };
}

function parseBareHex(input: string): { r: number; g: number; b: number } | null {
	const h = input.trim();
	if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(h)) {
		return null;
	}
	return parseHexRgb(`#${h}`);
}

function parseCssRgb(input: string): { r: number; g: number; b: number } | null {
	const t = input.trim();
	if (t.startsWith('#')) {
		return parseHexRgb(t);
	}
	const bare = parseBareHex(t);
	if (bare !== null) {
		return bare;
	}
	return parseRgbFunction(t);
}

const TEXT_DARK = '#111827';
const TEXT_LIGHT = '#f9fafb';
const FALLBACK_BG = '#4b5563';

const DARK_TEXT_LUM = relativeLuminance({ r: 17, g: 24, b: 39 });
const LIGHT_TEXT_LUM = relativeLuminance({ r: 249, g: 250, b: 251 });

function contrastRatio(l1: number, l2: number): number {
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

/** Normalise category colour to a CSS background value. */
export function normalizeCategoryColour(
	colour: string | undefined | null,
): string {
	if (colour === undefined || colour === null || colour.trim() === '') {
		return FALLBACK_BG;
	}
	const t = colour.trim();
	if (t.startsWith('#') || t.startsWith('rgb')) {
		return t;
	}
	if (/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(t)) {
		return `#${t}`;
	}
	return t;
}

/** Readable foreground for a CSS hex or rgb() background. */
export function contrastTextColor(backgroundCss: string | undefined): string {
	const normalized = normalizeCategoryColour(backgroundCss);
	const rgb = parseCssRgb(normalized);
	if (rgb === null) {
		return TEXT_LIGHT;
	}
	const bgLum = relativeLuminance(rgb);
	const withDark = contrastRatio(bgLum, DARK_TEXT_LUM);
	const withLight = contrastRatio(bgLum, LIGHT_TEXT_LUM);
	return withDark >= withLight ? TEXT_DARK : TEXT_LIGHT;
}

export function categoryPillStyle(colour: string | undefined | null): {
	backgroundColor: string;
	color: string;
} {
	const backgroundColor = normalizeCategoryColour(colour);
	return {
		backgroundColor,
		color: contrastTextColor(backgroundColor),
	};
}
