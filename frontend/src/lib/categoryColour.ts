/** HSL (h 0–360, s/l 0–1) → #rrggbb */
function hslToHex(h: number, s: number, l: number): string {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hp = ((h / 60) % 6 + 6) % 6;
	const x = c * (1 - Math.abs((hp % 2) - 1));
	let r1 = 0;
	let g1 = 0;
	let b1 = 0;
	if (hp < 1) {
		r1 = c;
		g1 = x;
	} else if (hp < 2) {
		r1 = x;
		g1 = c;
	} else if (hp < 3) {
		g1 = c;
		b1 = x;
	} else if (hp < 4) {
		g1 = x;
		b1 = c;
	} else if (hp < 5) {
		r1 = x;
		b1 = c;
	} else {
		r1 = c;
		b1 = x;
	}
	const m = l - c / 2;
	const toByte = (v: number) =>
		Math.round(Math.min(255, Math.max(0, v * 255)))
			.toString(16)
			.padStart(2, '0');
	return `#${toByte(r1 + m)}${toByte(g1 + m)}${toByte(b1 + m)}`;
}

/** Default category swatch — saturated but dark enough for white label text. */
export function randomCategoryColour(): string {
	const h = Math.random() * 360;
	const s = 0.55 + Math.random() * 0.2;
	const l = 0.32 + Math.random() * 0.1;
	return hslToHex(h, s, l);
}
