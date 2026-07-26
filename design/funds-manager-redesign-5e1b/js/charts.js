/* Lightweight canvas charts for Funds prototypes */

function drawBarChart(canvas, series) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pad = { t: 16, r: 12, b: 36, l: 48 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const labels = series.labels;
  const a = series.receiving;
  const b = series.spending;
  const max = Math.max(...a, ...b) * 1.15;
  const groupW = plotW / labels.length;
  const barW = Math.min(18, groupW * 0.28);

  ctx.clearRect(0, 0, w, h);

  // grid
  ctx.strokeStyle = 'oklch(92% 0.005 250)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    const val = max * (1 - i / 4);
    ctx.fillStyle = 'oklch(54% 0.012 250)';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('$' + Math.round(val / 1000) + 'k', pad.l - 8, y + 4);
  }

  labels.forEach((lab, i) => {
    const cx = pad.l + groupW * i + groupW / 2;
    const hA = (a[i] / max) * plotH;
    const hB = (b[i] / max) * plotH;

    ctx.fillStyle = 'oklch(18% 0.012 250)';
    ctx.fillRect(cx - barW - 3, pad.t + plotH - hA, barW, hA);

    ctx.fillStyle = 'oklch(72% 0.01 250)';
    ctx.fillRect(cx + 3, pad.t + plotH - hB, barW, hB);

    ctx.fillStyle = 'oklch(54% 0.012 250)';
    ctx.font = '11px "IBM Plex Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lab, cx, h - 14);
  });

  // legend
  ctx.font = '11px "IBM Plex Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'oklch(18% 0.012 250)';
  ctx.fillRect(pad.l, 2, 8, 8);
  ctx.fillText('Receiving', pad.l + 12, 10);
  ctx.fillStyle = 'oklch(72% 0.01 250)';
  ctx.fillRect(pad.l + 90, 2, 8, 8);
  ctx.fillStyle = 'oklch(54% 0.012 250)';
  ctx.fillText('Spending', pad.l + 102, 10);
}

function drawLineChart(canvas, points, opts) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pad = { t: 16, r: 12, b: 36, l: 52 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals) * 0.92;
  const max = Math.max(...vals) * 1.05;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'oklch(92% 0.005 250)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    const val = max - ((max - min) * i) / 4;
    ctx.fillStyle = 'oklch(54% 0.012 250)';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('$' + Math.round(val / 1000) + 'k', pad.l - 8, y + 4);
  }

  const toXY = (i, v) => {
    const x = pad.l + (plotW * i) / (points.length - 1);
    const y = pad.t + plotH * (1 - (v - min) / (max - min));
    return { x, y };
  };

  // fill
  ctx.beginPath();
  points.forEach((p, i) => {
    const { x, y } = toXY(i, p.v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  const last = toXY(points.length - 1, points[points.length - 1].v);
  const first = toXY(0, points[0].v);
  ctx.lineTo(last.x, pad.t + plotH);
  ctx.lineTo(first.x, pad.t + plotH);
  ctx.closePath();
  ctx.fillStyle = opts && opts.fill
    ? opts.fill
    : 'oklch(58% 0.18 255 / 0.08)';
  ctx.fill();

  // stroke
  ctx.beginPath();
  points.forEach((p, i) => {
    const { x, y } = toXY(i, p.v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = opts && opts.stroke
    ? opts.stroke
    : 'oklch(18% 0.012 250)';
  ctx.lineWidth = 1.75;
  ctx.stroke();

  points.forEach((p, i) => {
    if (i % Math.ceil(points.length / 6) !== 0 && i !== points.length - 1) return;
    const { x } = toXY(i, p.v);
    ctx.fillStyle = 'oklch(54% 0.012 250)';
    ctx.font = '11px "IBM Plex Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.l, x, h - 14);
  });
}

function drawDonut(canvas, slices, activeIndex) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.clientWidth, canvas.clientHeight);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const ir = size * 0.26;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let angle = -Math.PI / 2;

  ctx.clearRect(0, 0, size, size);

  slices.forEach((sl, i) => {
    const sweep = (sl.value / total) * Math.PI * 2;
    const mid = angle + sweep / 2;
    const explode = activeIndex === i ? 4 : 0;
    const ox = Math.cos(mid) * explode;
    const oy = Math.sin(mid) * explode;

    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, r, angle, angle + sweep);
    ctx.arc(cx + ox, cy + oy, ir, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fillStyle = sl.color;
    ctx.globalAlpha = activeIndex === null || activeIndex === i ? 1 : 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    angle += sweep;
  });

  ctx.fillStyle = 'oklch(18% 0.012 250)';
  ctx.font = '600 13px "IBM Plex Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (activeIndex !== null && slices[activeIndex]) {
    ctx.fillText(slices[activeIndex].name.split(' ')[0], cx, cy - 8);
    ctx.font = '500 11px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'oklch(54% 0.012 250)';
    const pct = Math.round((slices[activeIndex].value / total) * 100);
    ctx.fillText(pct + '%', cx, cy + 10);
  } else {
    ctx.fillText('Total', cx, cy - 8);
    ctx.font = '500 11px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'oklch(54% 0.012 250)';
    ctx.fillText('$' + Math.round(total / 1000) + 'k', cx, cy + 10);
  }
}

function hitDonutSlice(canvas, slices, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const size = Math.min(canvas.clientWidth, canvas.clientHeight);
  const cx = rect.left + size / 2;
  const cy = rect.top + size / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const r = size * 0.42;
  const ir = size * 0.26;
  if (dist < ir || dist > r) return null;

  let ang = Math.atan2(dy, dx);
  if (ang < -Math.PI / 2) ang += Math.PI * 2;
  let start = -Math.PI / 2;
  const total = slices.reduce((s, x) => s + x.value, 0);
  for (let i = 0; i < slices.length; i++) {
    const sweep = (slices[i].value / total) * Math.PI * 2;
    if (ang >= start && ang < start + sweep) return i;
    start += sweep;
  }
  return null;
}

function drawProjectionChart(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pad = { t: 20, r: 16, b: 40, l: 56 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const labels = opts.labels || [];
  const baseline = opts.baseline || [];
  const scenario = opts.scenario || null;
  const goals = opts.goals || [];
  const events = opts.events || [];

  const allVals = baseline.slice();
  if (scenario) allVals.push(...scenario);
  goals.forEach((g) => allVals.push(g.value));
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const span = Math.max(rawMax - rawMin, 1);
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.1;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'oklch(92% 0.005 250)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    const val = max - ((max - min) * i) / 4;
    ctx.fillStyle = 'oklch(54% 0.012 250)';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    const label = Math.abs(val) >= 1000
      ? '$' + (val < 0 ? '−' : '') + Math.round(Math.abs(val) / 1000) + 'k'
      : '$' + Math.round(val);
    ctx.fillText(label, pad.l - 8, y + 4);
  }

  const toXY = (i, v, len) => {
    const n = Math.max(len - 1, 1);
    const x = pad.l + (plotW * i) / n;
    const y = pad.t + plotH * (1 - (v - min) / (max - min));
    return { x, y };
  };

  goals.forEach((g) => {
    const y = pad.t + plotH * (1 - (g.value - min) / (max - min));
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = g.color || 'oklch(52% 0.14 150)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = g.color || 'oklch(52% 0.14 150)';
    ctx.font = '500 10px "IBM Plex Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(g.label || 'Goal', pad.l + 6, y - 5);
  });

  // baseline fill
  if (baseline.length > 1) {
    ctx.beginPath();
    baseline.forEach((v, i) => {
      const { x, y } = toXY(i, v, baseline.length);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    const last = toXY(baseline.length - 1, baseline[baseline.length - 1], baseline.length);
    const first = toXY(0, baseline[0], baseline.length);
    ctx.lineTo(last.x, pad.t + plotH);
    ctx.lineTo(first.x, pad.t + plotH);
    ctx.closePath();
    ctx.fillStyle = opts.baselineFill || 'oklch(58% 0.18 255 / 0.07)';
    ctx.fill();
  }

  const strokeSeries = (pts, stroke, dashed) => {
    if (!pts || pts.length < 2) return;
    ctx.beginPath();
    pts.forEach((v, i) => {
      const { x, y } = toXY(i, v, pts.length);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.setLineDash(dashed ? [6, 5] : []);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.85;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  strokeSeries(baseline, opts.baselineStroke || 'oklch(58% 0.18 255)', false);
  if (scenario) {
    strokeSeries(scenario, opts.scenarioStroke || 'oklch(45% 0.08 45)', true);
  }

  events.forEach((ev) => {
    if (ev.index < 0 || ev.index >= baseline.length) return;
    const { x, y } = toXY(ev.index, baseline[ev.index], baseline.length);
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = ev.color || 'oklch(55% 0.18 25)';
    ctx.fill();
    ctx.strokeStyle = 'oklch(100% 0 0)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  labels.forEach((lab, i) => {
    if (i % Math.ceil(labels.length / 7) !== 0 && i !== labels.length - 1) return;
    const { x } = toXY(i, baseline[i] || 0, labels.length);
    ctx.fillStyle = 'oklch(54% 0.012 250)';
    ctx.font = '11px "IBM Plex Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lab, x, h - 14);
  });
}

window.FUNDS.charts = {
  drawBarChart,
  drawLineChart,
  drawDonut,
  hitDonutSlice,
  drawProjectionChart,
};
