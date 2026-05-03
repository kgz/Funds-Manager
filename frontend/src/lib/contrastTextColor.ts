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

function parseCssRgb(input: string): { r: number; g: number; b: number } | null {
	const t = input.trim();
	if (t.startsWith('#')) {
		return parseHexRgb(t);
	}
	return parseRgbFunction(t);
}

/** Readable foreground (#111827 or #f9fafb) for a CSS hex or rgb() background. */
export function contrastTextColor(backgroundCss: string | undefined): string {
	if (backgroundCss === undefined || backgroundCss.trim() === '') {
		return '#f9fafb';
	}
	const rgb = parseCssRgb(backgroundCss);
	if (rgb === null) {
		return '#f9fafb';
	}
	return relativeLuminance(rgb) > 0.52 ? '#111827' : '#f9fafb';
}
