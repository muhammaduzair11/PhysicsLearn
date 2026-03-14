/**
 * CH-01 · pH Titration Curve Simulator
 * Scientific graph rendering with proper axes, ticks, annotations.
 */
import { createSlider, createSection, createToggle, createResetButton,
         createFormulaBar, createMetricsStrip, updateMetric,
         createButtonGroup, createDiagramHeader } from '../../src/components/controls.js';
import { clearCanvas, drawAxes, niceScale, graphPadding, mapX, mapY,
         drawLine, drawDot, drawAnnotation, drawCrosshair, drawVerticalRef,
         SERIES_COLORS, COLORS, FONT_TICK, FONT_ANNOTATION, FONT_VALUE } from '../../src/engine/graph.js';
import '../../src/styles/index.css';

const indicators = [
  { name: 'Methyl Orange', pHLow: 3.1, pHHigh: 4.4, colorLow: '#ff4444', colorHigh: '#ffaa00' },
  { name: 'Bromocresol Green', pHLow: 3.8, pHHigh: 5.4, colorLow: '#cccc00', colorHigh: '#0066cc' },
  { name: 'Methyl Red', pHLow: 4.4, pHHigh: 6.2, colorLow: '#ff4444', colorHigh: '#ffcc00' },
  { name: 'Litmus', pHLow: 5.0, pHHigh: 8.0, colorLow: '#ff4444', colorHigh: '#3366ff' },
  { name: 'Phenol Red', pHLow: 6.8, pHHigh: 8.4, colorLow: '#ffcc00', colorHigh: '#ff3366' },
  { name: 'Phenolphthalein', pHLow: 8.2, pHHigh: 10.0, colorLow: 'rgba(255,255,255,0.02)', colorHigh: '#cc44cc' },
];

const defaults = {
  pKa: 4.75, cAcid: 0.10, cBase: 0.10, vAcid: 25.0,
  indicatorIdx: 5, showDerivative: false, showBuffer: true,
};

let state = { ...defaults };
let canvas, ctx, canvasW = 0, canvasH = 0, cursorVol = -1;

function computePH(vBase) {
  const Ka = Math.pow(10, -state.pKa);
  const nAcid = state.cAcid * state.vAcid / 1000;
  const nBase = state.cBase * vBase / 1000;
  const vTotal = (state.vAcid + vBase) / 1000;
  if (nBase <= 0) { return -Math.log10(Math.max(Math.sqrt(Ka * state.cAcid), 1e-14)); }
  const vEq = state.cAcid * state.vAcid / state.cBase;
  if (Math.abs(vBase - vEq) < 0.01) {
    const Cb = nAcid / vTotal; const Kb = 1e-14 / Ka;
    return 14 + Math.log10(Math.max(Math.sqrt(Kb * Cb), 1e-14));
  } else if (nBase < nAcid) {
    const HA = (nAcid - nBase) / vTotal; const A = nBase / vTotal;
    if (HA <= 0 || A <= 0) return state.pKa;
    return state.pKa + Math.log10(A / HA);
  } else {
    return 14 + Math.log10(Math.max((nBase - nAcid) / vTotal, 1e-14));
  }
}

function generateCurve() {
  const vEq = state.cAcid * state.vAcid / state.cBase;
  const vMax = vEq * 2 + 5;
  const vols = [], pHs = [];
  for (let v = 0; v <= vMax; v += vMax / 500) {
    vols.push(v); pHs.push(computePH(v));
  }
  return { vols, pHs, vEq, vMax };
}

// --- UI ---
const app = document.getElementById('app');
app.appendChild(createDiagramHeader('pH Titration Curve Simulator'));
const body = document.createElement('div'); body.className = 'diagram-body';
const canvasArea = document.createElement('div'); canvasArea.className = 'canvas-area';
canvas = document.createElement('canvas'); canvas.id = 'titration-canvas';
canvas.setAttribute('aria-label', 'pH titration curve'); canvas.style.cursor = 'crosshair';
canvasArea.appendChild(canvas);
const controlPanel = document.createElement('div'); controlPanel.className = 'control-panel';
body.appendChild(canvasArea); body.appendChild(controlPanel); app.appendChild(body);
const formulaBar = createFormulaBar(); app.appendChild(formulaBar);
const metricsStrip = createMetricsStrip([
  { label: 'Initial pH', id: 'metric-init' }, { label: 'Half-equiv pH', id: 'metric-half' },
  { label: 'Equiv point', id: 'metric-eq' }, { label: 'Cursor', id: 'metric-cursor' },
]); app.appendChild(metricsStrip);
ctx = canvas.getContext('2d');

function buildControls() {
  controlPanel.innerHTML = '';
  const s1 = createSection('Acid Properties');
  s1.appendChild(createSlider({ id: 'pka', label: 'pKₐ', min: 2.0, max: 11.0, step: 0.05, value: state.pKa, decimals: 2, onChange: v => { state.pKa = v; render(); } }));
  s1.appendChild(createSlider({ id: 'c-acid', label: 'C_acid', min: 0.01, max: 0.50, step: 0.01, value: state.cAcid, unit: 'M', decimals: 2, onChange: v => { state.cAcid = v; render(); } }));
  s1.appendChild(createSlider({ id: 'v-acid', label: 'V_acid', min: 10, max: 50, step: 1, value: state.vAcid, unit: 'mL', decimals: 0, onChange: v => { state.vAcid = v; render(); } }));
  controlPanel.appendChild(s1);
  const s2 = createSection('Base Properties');
  s2.appendChild(createSlider({ id: 'c-base', label: 'C_base', min: 0.01, max: 0.50, step: 0.01, value: state.cBase, unit: 'M', decimals: 2, onChange: v => { state.cBase = v; render(); } }));
  controlPanel.appendChild(s2);
  const s3 = createSection('Indicator');
  const select = document.createElement('select');
  select.style.cssText = 'width:100%;padding:6px 8px;border-radius:4px;background:#161b25;color:#e8ecf1;border:1px solid rgba(255,255,255,0.06);font-family:IBM Plex Sans,sans-serif;font-size:0.78rem;cursor:pointer;';
  indicators.forEach((ind, i) => { const o = document.createElement('option'); o.value = i; o.textContent = `${ind.name} (${ind.pHLow}–${ind.pHHigh})`; o.selected = i === state.indicatorIdx; select.appendChild(o); });
  select.addEventListener('change', () => { state.indicatorIdx = parseInt(select.value); render(); });
  s3.appendChild(select); controlPanel.appendChild(s3);
  const s4 = createSection('Display');
  s4.appendChild(createButtonGroup([
    createToggle('dpH/dV', state.showDerivative, v => { state.showDerivative = v; render(); }),
    createToggle('Buffer β', state.showBuffer, v => { state.showBuffer = v; render(); }),
  ])); controlPanel.appendChild(s4);
  const s5 = createSection('Export');
  const eb = document.createElement('button'); eb.className = 'btn btn-sm'; eb.textContent = '↓ Export CSV';
  eb.addEventListener('click', () => {
    const { vols, pHs } = generateCurve();
    let csv = 'Volume_mL,pH\n'; vols.forEach((v,i)=>{csv+=`${v.toFixed(2)},${pHs[i].toFixed(4)}\n`;});
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='titration.csv'; a.click();
  }); s5.appendChild(eb); controlPanel.appendChild(s5);
  controlPanel.appendChild(createResetButton(() => { state = { ...defaults }; buildControls(); render(); }));
}
buildControls();

function resize() {
  const r = canvasArea.getBoundingClientRect(); canvasW = Math.floor(r.width); canvasH = Math.floor(r.height);
  canvas.width = canvasW; canvas.height = canvasH; render();
}
window.addEventListener('resize', resize); setTimeout(resize, 50);

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect(); cursorVol = (e.clientX - r.left) / r.width; render();
});
canvas.addEventListener('mouseleave', () => { cursorVol = -1; render(); });

function render() {
  if (!canvasW || !canvasH) return;
  const { vols, pHs, vEq, vMax } = generateCurve();
  const pad = graphPadding();
  const chartW = canvasW - pad.left - pad.right;
  const chartH = canvasH - pad.top - pad.bottom;
  const xScale = niceScale(0, vMax, 8);
  const yScale = niceScale(0, 14, 7);

  clearCanvas(ctx, canvasW, canvasH);

  // Indicator band
  const ind = indicators[state.indicatorIdx];
  const yL = mapY(ind.pHLow, yScale, pad, chartH);
  const yH = mapY(ind.pHHigh, yScale, pad, chartH);
  const grad = ctx.createLinearGradient(0, yL, 0, yH);
  grad.addColorStop(0, typeof ind.colorLow === 'string' && ind.colorLow.startsWith('rgba') ? ind.colorLow : ind.colorLow + '15');
  grad.addColorStop(1, ind.colorHigh + '15');
  ctx.fillStyle = grad;
  ctx.fillRect(pad.left, Math.min(yL, yH), chartW, Math.abs(yH - yL));
  ctx.fillStyle = COLORS.tickLabel;
  ctx.font = '9px IBM Plex Sans';
  ctx.textAlign = 'right';
  ctx.globalAlpha = 0.5;
  ctx.fillText(ind.name, pad.left + chartW - 4, Math.min(yL, yH) + 12);
  ctx.globalAlpha = 1;

  // Buffer region band
  if (state.showBuffer) {
    const bS = mapX(Math.max(vEq * 0.2, 0), xScale, pad, chartW);
    const bE = mapX(Math.min(vEq * 0.8, vMax), xScale, pad, chartW);
    ctx.fillStyle = 'rgba(99,102,241,0.04)';
    ctx.fillRect(bS, pad.top, bE - bS, chartH);
    ctx.fillStyle = 'rgba(99,102,241,0.35)';
    ctx.font = '9px IBM Plex Sans';
    ctx.textAlign = 'center';
    ctx.fillText('Buffer region', (bS + bE) / 2, pad.top + 12);
  }

  drawAxes(ctx, { canvasW, canvasH, pad, xScale, yScale, xLabel: 'Volume of base added (mL)', yLabel: 'pH', title: 'Acid–Base Titration' });

  // Main curve
  drawLine(ctx, vols, pHs.map(p => Math.max(0, Math.min(14, p))), xScale, yScale, pad, chartW, chartH, '#10b981', 2);

  // Derivative
  if (state.showDerivative) {
    const dV = [], dY = [];
    let maxD = 0;
    for (let i = 1; i < vols.length; i++) {
      const dv = vols[i] - vols[i-1];
      const dp = Math.abs(pHs[i] - pHs[i-1]);
      const d = dv > 0 ? dp / dv : 0;
      dV.push((vols[i] + vols[i-1]) / 2); dY.push(d);
      if (d > maxD) maxD = d;
    }
    if (maxD > 0) {
      const scaledDY = dY.map(d => d / maxD * 13);
      drawLine(ctx, dV, scaledDY, xScale, yScale, pad, chartW, chartH, '#E69F00', 1.2);
      ctx.fillStyle = '#E69F00'; ctx.font = '9px IBM Plex Sans'; ctx.textAlign = 'right';
      ctx.fillText('dpH/dV (scaled)', pad.left + chartW - 4, pad.top + 12);
    }
  }

  // Key points
  const initPH = pHs[0];
  const halfV = vEq / 2; const halfPH = computePH(halfV);
  const eqPH = computePH(vEq);

  // Half-equivalence
  const hp = drawDot(ctx, halfV, halfPH, xScale, yScale, pad, chartW, chartH, '#6366f1', 4);
  drawAnnotation(ctx, `½eq: pH=${halfPH.toFixed(2)}=pKₐ`, hp.px, hp.py, -8, -10);

  // Equivalence point
  const ep = drawDot(ctx, vEq, eqPH, xScale, yScale, pad, chartW, chartH, '#ef4444', 5);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(ep.px, ep.py, 5, 0, 2 * Math.PI); ctx.stroke();
  drawAnnotation(ctx, `Eq: V=${vEq.toFixed(1)} mL, pH=${eqPH.toFixed(2)}`, ep.px, ep.py, 8, -10);
  drawVerticalRef(ctx, vEq, xScale, yScale, pad, chartW, chartH, 'rgba(239,68,68,0.2)');

  // Cursor
  if (cursorVol >= 0 && cursorVol <= 1) {
    const vol = xScale.min + cursorVol * (xScale.max - xScale.min);
    if (vol >= 0 && vol <= vMax) {
      const cPH = computePH(vol);
      const cpx = mapX(vol, xScale, pad, chartW);
      const cpy = mapY(Math.max(0, Math.min(14, cPH)), yScale, pad, chartH);
      drawCrosshair(ctx, cpx, cpy, pad, chartW, chartH);
      ctx.beginPath(); ctx.arc(cpx, cpy, 3, 0, 2*Math.PI);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = '#e8ecf1'; ctx.font = FONT_VALUE; ctx.textAlign = 'left';
      ctx.fillText(`V=${vol.toFixed(1)} mL  pH=${cPH.toFixed(2)}`, cpx + 8, cpy - 8);
      updateMetric('metric-cursor', `V=${vol.toFixed(1)}, pH=${cPH.toFixed(2)}`);
    }
  }

  updateMetric('metric-init', initPH.toFixed(2));
  updateMetric('metric-half', halfPH.toFixed(2));
  updateMetric('metric-eq', `V=${vEq.toFixed(1)} mL, pH=${eqPH.toFixed(2)}`);
  formulaBar.textContent = `pH = pKₐ + log([A⁻]/[HA]) = ${state.pKa.toFixed(2)} + log([A⁻]/[HA])  ·  V_eq = ${vEq.toFixed(1)} mL  ·  Kₐ = ${Math.pow(10,-state.pKa).toExponential(2)}`;
}
render();
