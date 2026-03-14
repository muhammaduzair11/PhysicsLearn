/**
 * Scientific Graph Rendering Utilities
 * Provides consistent, publication-quality axes, grids, ticks, and labels.
 */

const FONT_LABEL = '11px IBM Plex Sans';
const FONT_TICK = '10px IBM Plex Mono';
const FONT_TITLE = '12px IBM Plex Sans';
const FONT_ANNOTATION = '10px IBM Plex Sans';
const FONT_VALUE = '10px IBM Plex Mono';

const COLORS = {
  bg: '#0e1219',
  gridMinor: 'rgba(255,255,255,0.03)',
  gridMajor: 'rgba(255,255,255,0.07)',
  axis: 'rgba(255,255,255,0.18)',
  tick: 'rgba(255,255,255,0.13)',
  tickLabel: '#8b95a5',
  axisLabel: '#6b7585',
  title: '#c8cdd5',
  crosshair: 'rgba(255,255,255,0.15)',
  annotationLine: 'rgba(255,255,255,0.12)',
};

// Okabe-Ito series colours
export const SERIES_COLORS = [
  '#56B4E9', // sky blue
  '#D55E00', // vermillion
  '#009E73', // green
  '#E69F00', // orange
  '#CC79A7', // reddish purple
  '#0072B2', // blue
  '#F0E442', // yellow
];

/**
 * Compute "nice" tick values for a given range.
 */
export function niceScale(min, max, maxTicks = 8) {
  const range = max - min;
  if (range <= 0) return { min, max, step: 1, ticks: [min] };
  
  const roughStep = range / maxTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / mag;
  
  let niceStep;
  if (residual <= 1.5) niceStep = 1 * mag;
  else if (residual <= 3) niceStep = 2 * mag;
  else if (residual <= 7) niceStep = 5 * mag;
  else niceStep = 10 * mag;

  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  
  const ticks = [];
  for (let v = niceMin; v <= niceMax + niceStep * 0.01; v += niceStep) {
    ticks.push(Number(v.toPrecision(10)));
  }
  
  return { min: niceMin, max: niceMax, step: niceStep, ticks };
}

/**
 * Format a tick value with appropriate precision.
 */
function formatTick(v, step) {
  if (step >= 1) return v.toFixed(0);
  if (step >= 0.1) return v.toFixed(1);
  if (step >= 0.01) return v.toFixed(2);
  return v.toFixed(3);
}

/**
 * Standard graph padding.
 */
export function graphPadding(opts = {}) {
  return {
    top: opts.top ?? 45,
    right: opts.right ?? 25,
    bottom: opts.bottom ?? 52,
    left: opts.left ?? 62,
  };
}

/**
 * Clear canvas with graph background.
 */
export function clearCanvas(ctx, w, h) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draw a complete set of axes with grid, ticks, and labels.
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.canvasW / opts.canvasH
 * @param {Object} opts.pad - padding
 * @param {Object} opts.xScale - { min, max, step, ticks }
 * @param {Object} opts.yScale - { min, max, step, ticks }
 * @param {string} [opts.xLabel] - x-axis label
 * @param {string} [opts.yLabel] - y-axis label
 * @param {string} [opts.title] - graph title
 */
export function drawAxes(ctx, opts) {
  const { canvasW, canvasH, pad, xScale, yScale, xLabel, yLabel, title } = opts;
  const chartW = canvasW - pad.left - pad.right;
  const chartH = canvasH - pad.top - pad.bottom;

  // --- Minor grid ---
  ctx.strokeStyle = COLORS.gridMinor;
  ctx.lineWidth = 0.5;

  // --- Major grid + ticks ---
  // Y-axis grid & ticks
  for (const v of yScale.ticks) {
    const y = pad.top + chartH - ((v - yScale.min) / (yScale.max - yScale.min)) * chartH;
    if (y < pad.top || y > pad.top + chartH) continue;

    // Grid line
    ctx.strokeStyle = COLORS.gridMajor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();

    // Tick mark
    ctx.strokeStyle = COLORS.tick;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left - 4, y);
    ctx.lineTo(pad.left, y);
    ctx.stroke();

    // Tick label
    ctx.fillStyle = COLORS.tickLabel;
    ctx.font = FONT_TICK;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTick(v, yScale.step), pad.left - 8, y);
  }

  // X-axis grid & ticks
  for (const v of xScale.ticks) {
    const x = pad.left + ((v - xScale.min) / (xScale.max - xScale.min)) * chartW;
    if (x < pad.left || x > pad.left + chartW) continue;

    // Grid line
    ctx.strokeStyle = COLORS.gridMajor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + chartH);
    ctx.stroke();

    // Tick mark
    ctx.strokeStyle = COLORS.tick;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, pad.top + chartH);
    ctx.lineTo(x, pad.top + chartH + 4);
    ctx.stroke();

    // Tick label
    ctx.fillStyle = COLORS.tickLabel;
    ctx.font = FONT_TICK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(formatTick(v, xScale.step), x, pad.top + chartH + 7);
  }

  // --- Axis lines ---
  ctx.strokeStyle = COLORS.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  // --- Axis labels ---
  ctx.textBaseline = 'alphabetic';
  if (xLabel) {
    ctx.fillStyle = COLORS.axisLabel;
    ctx.font = FONT_LABEL;
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, pad.left + chartW / 2, pad.top + chartH + 40);
  }

  if (yLabel) {
    ctx.save();
    ctx.translate(14, pad.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = COLORS.axisLabel;
    ctx.font = FONT_LABEL;
    ctx.textAlign = 'center';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  // --- Title ---
  if (title) {
    ctx.fillStyle = COLORS.title;
    ctx.font = FONT_TITLE;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(title, pad.left, pad.top - 10);
  }
}

/**
 * Map data value to pixel coordinate.
 */
export function mapX(v, xScale, pad, chartW) {
  return pad.left + ((v - xScale.min) / (xScale.max - xScale.min)) * chartW;
}

export function mapY(v, yScale, pad, chartH) {
  return pad.top + chartH - ((v - yScale.min) / (yScale.max - yScale.min)) * chartH;
}

/**
 * Draw a data series line.
 */
export function drawLine(ctx, xData, yData, xScale, yScale, pad, chartW, chartH, color, lineWidth = 2) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  
  let started = false;
  for (let i = 0; i < xData.length; i++) {
    const px = mapX(xData[i], xScale, pad, chartW);
    const py = mapY(yData[i], yScale, pad, chartH);
    if (!started) { ctx.moveTo(px, py); started = true; }
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

/**
 * Draw a filled dot at a data point.
 */
export function drawDot(ctx, x, y, xScale, yScale, pad, chartW, chartH, color, radius = 4) {
  const px = mapX(x, xScale, pad, chartW);
  const py = mapY(y, yScale, pad, chartH);
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  return { px, py };
}

/**
 * Draw annotation text near a point.
 */
export function drawAnnotation(ctx, text, px, py, offsetX = 8, offsetY = -8) {
  ctx.fillStyle = COLORS.tickLabel;
  ctx.font = FONT_ANNOTATION;
  ctx.textAlign = offsetX >= 0 ? 'left' : 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, px + offsetX, py + offsetY);
}

/**
 * Draw a vertical dashed line at an x data value.
 */
export function drawVerticalRef(ctx, xVal, xScale, yScale, pad, chartW, chartH, color = COLORS.annotationLine) {
  const px = mapX(xVal, xScale, pad, chartW);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(px, pad.top);
  ctx.lineTo(px, pad.top + chartH);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draw a crosshair at pixel position.
 */
export function drawCrosshair(ctx, px, py, pad, chartW, chartH) {
  ctx.strokeStyle = COLORS.crosshair;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(px, pad.top);
  ctx.lineTo(px, pad.top + chartH);
  ctx.moveTo(pad.left, py);
  ctx.lineTo(pad.left + chartW, py);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draw a legend.
 * @param {Array<{label: string, color: string}>} items
 */
export function drawLegend(ctx, items, x, y) {
  ctx.font = FONT_ANNOTATION;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  items.forEach((item, i) => {
    const iy = y + i * 16;
    
    // Line sample
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, iy);
    ctx.lineTo(x + 14, iy);
    ctx.stroke();
    
    // Label
    ctx.fillStyle = COLORS.tickLabel;
    ctx.fillText(item.label, x + 20, iy + 1);
  });
}

export { COLORS, FONT_LABEL, FONT_TICK, FONT_TITLE, FONT_ANNOTATION, FONT_VALUE };
