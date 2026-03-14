/**
 * BI-01 · Predator–Prey Population Dynamics
 * Scientific dual-panel graph with proper axes.
 */
import { rk4Integrate } from '../../src/engine/rk4.js';
import { createSlider, createSection, createToggle, createResetButton,
         createFormulaBar, createMetricsStrip, updateMetric,
         createButtonGroup, createDiagramHeader } from '../../src/components/controls.js';
import { clearCanvas, drawAxes, niceScale, graphPadding, mapX, mapY,
         drawLine, drawDot, drawAnnotation, drawLegend,
         SERIES_COLORS, COLORS, FONT_VALUE } from '../../src/engine/graph.js';
import '../../src/styles/index.css';

const defaults = {
  alpha: 1.0, beta: 0.02, gamma: 0.8, delta: 0.01,
  x0: 40, y0: 9, tSpan: 50,
  hunting: false, huntRate: 0.1, stochastic: false,
};
let state = { ...defaults };
let canvas1, ctx1, canvas2, ctx2, canvasW = 0, canvasH = 0;

function lotkaVolterra(t, y) {
  const [x, yy] = y;
  const h = state.hunting ? state.huntRate : 0;
  return [state.alpha * x - state.beta * x * yy - h * x, state.delta * x * yy - state.gamma * yy];
}

function solve() {
  const r = rk4Integrate(lotkaVolterra, 0, [state.x0, state.y0], state.tSpan, 0.01);
  if (state.stochastic) {
    for (let i = 0; i < r.y.length; i++) {
      r.y[i][0] = Math.max(0, r.y[i][0] + (Math.random()-0.5)*0.5);
      r.y[i][1] = Math.max(0, r.y[i][1] + (Math.random()-0.5)*0.2);
    }
  }
  return r;
}

// --- UI ---
const app = document.getElementById('app');
app.appendChild(createDiagramHeader('Predator–Prey Population Dynamics'));
const body = document.createElement('div'); body.className = 'diagram-body';
const canvasArea = document.createElement('div'); canvasArea.className = 'canvas-area';
canvasArea.style.display = 'flex'; canvasArea.style.gap = '1px';

const half1 = document.createElement('div'); half1.style.cssText = 'flex:1;position:relative;';
canvas1 = document.createElement('canvas'); canvas1.id = 'ts-canvas';
canvas1.setAttribute('aria-label', 'Time series of predator and prey populations');
half1.appendChild(canvas1);

const half2 = document.createElement('div'); half2.style.cssText = 'flex:1;position:relative;';
canvas2 = document.createElement('canvas'); canvas2.id = 'phase-canvas';
canvas2.setAttribute('aria-label', 'Phase portrait of predator vs prey');
half2.appendChild(canvas2);

canvasArea.appendChild(half1); canvasArea.appendChild(half2);
const controlPanel = document.createElement('div'); controlPanel.className = 'control-panel';
body.appendChild(canvasArea); body.appendChild(controlPanel); app.appendChild(body);
const formulaBar = createFormulaBar(); app.appendChild(formulaBar);
const metricsStrip = createMetricsStrip([
  { label: 'x* (prey eq.)', id: 'metric-xeq' }, { label: 'y* (pred eq.)', id: 'metric-yeq' },
  { label: 'Period', id: 'metric-period' }, { label: 'H (conserved)', id: 'metric-H' },
]); app.appendChild(metricsStrip);
ctx1 = canvas1.getContext('2d'); ctx2 = canvas2.getContext('2d');

function buildControls() {
  controlPanel.innerHTML = '';
  const s1 = createSection('Prey'); 
  s1.appendChild(createSlider({ id:'alpha', label:'α (growth)', min:0.1, max:2.0, step:0.05, value:state.alpha, unit:'yr⁻¹', decimals:2, onChange:v=>{state.alpha=v; render();} }));
  s1.appendChild(createSlider({ id:'beta', label:'β (predation)', min:0.001, max:0.1, step:0.001, value:state.beta, decimals:3, onChange:v=>{state.beta=v; render();} }));
  s1.appendChild(createSlider({ id:'x0', label:'x₀ (initial)', min:1, max:200, step:1, value:state.x0, decimals:0, onChange:v=>{state.x0=v; render();} }));
  controlPanel.appendChild(s1);
  const s2 = createSection('Predator');
  s2.appendChild(createSlider({ id:'gamma', label:'γ (death)', min:0.1, max:2.0, step:0.05, value:state.gamma, unit:'yr⁻¹', decimals:2, onChange:v=>{state.gamma=v; render();} }));
  s2.appendChild(createSlider({ id:'delta', label:'δ (gain)', min:0.001, max:0.05, step:0.001, value:state.delta, decimals:3, onChange:v=>{state.delta=v; render();} }));
  s2.appendChild(createSlider({ id:'y0', label:'y₀ (initial)', min:1, max:200, step:1, value:state.y0, decimals:0, onChange:v=>{state.y0=v; render();} }));
  controlPanel.appendChild(s2);
  const s3 = createSection('Simulation');
  s3.appendChild(createSlider({ id:'tspan', label:'Time span', min:10, max:100, step:5, value:state.tSpan, unit:'yr', decimals:0, onChange:v=>{state.tSpan=v; render();} }));
  controlPanel.appendChild(s3);
  const s4 = createSection('Modes');
  const ht = createToggle('Hunting', state.hunting, v=>{state.hunting=v; buildControls(); render();});
  const st = createToggle('Stochastic', state.stochastic, v=>{state.stochastic=v; render();});
  s4.appendChild(createButtonGroup([ht, st]));
  if (state.hunting) s4.appendChild(createSlider({ id:'h', label:'h (hunt rate)', min:0, max:0.5, step:0.01, value:state.huntRate, decimals:2, onChange:v=>{state.huntRate=v; render();} }));
  controlPanel.appendChild(s4);
  controlPanel.appendChild(createResetButton(()=>{ state={...defaults}; buildControls(); render(); }));
}
buildControls();

function resize() {
  const r1 = half1.getBoundingClientRect(); const r2 = half2.getBoundingClientRect();
  canvasW = Math.floor(r1.width); canvasH = Math.floor(r1.height);
  canvas1.width = canvasW; canvas1.height = canvasH;
  canvas2.width = Math.floor(r2.width); canvas2.height = Math.floor(r2.height);
  render();
}
window.addEventListener('resize', resize); setTimeout(resize, 50);

function render() {
  if (!canvasW || !canvasH) return;
  const { t, y } = solve();
  let maxPrey = 0, maxPred = 0;
  for (const s of y) { if (s[0] > maxPrey) maxPrey = s[0]; if (s[1] > maxPred) maxPred = s[1]; }
  const yMax = Math.max(maxPrey, maxPred) * 1.08;
  const pad = graphPadding();
  const cW = canvasW - pad.left - pad.right;
  const cH = canvasH - pad.top - pad.bottom;
  const xScaleTS = niceScale(0, state.tSpan);
  const yScaleTS = niceScale(0, yMax);

  // === Time Series ===
  clearCanvas(ctx1, canvasW, canvasH);
  drawAxes(ctx1, { canvasW, canvasH, pad, xScale: xScaleTS, yScale: yScaleTS, xLabel: 'Time (years)', yLabel: 'Population', title: 'Population vs Time' });
  
  const tArr = [], preyArr = [], predArr = [];
  for (let i = 0; i < t.length; i += 3) { tArr.push(t[i]); preyArr.push(y[i][0]); predArr.push(y[i][1]); }
  drawLine(ctx1, tArr, preyArr, xScaleTS, yScaleTS, pad, cW, cH, SERIES_COLORS[0], 1.8);
  drawLine(ctx1, tArr, predArr, xScaleTS, yScaleTS, pad, cW, cH, SERIES_COLORS[1], 1.8);
  drawLegend(ctx1, [{ label: 'Prey (x)', color: SERIES_COLORS[0] }, { label: 'Predator (y)', color: SERIES_COLORS[1] }], pad.left + 8, pad.top + 8);

  // === Phase Portrait ===
  const c2W = canvas2.width; const c2H = canvas2.height;
  const c2cW = c2W - pad.left - pad.right;
  const c2cH = c2H - pad.top - pad.bottom;
  const xScalePP = niceScale(0, maxPrey * 1.08);
  const yScalePP = niceScale(0, maxPred * 1.08);

  clearCanvas(ctx2, c2W, c2H);
  drawAxes(ctx2, { canvasW: c2W, canvasH: c2H, pad, xScale: xScalePP, yScale: yScalePP, xLabel: 'Prey (x)', yLabel: 'Predator (y)', title: 'Phase Portrait' });

  const ppX = [], ppY = [];
  for (let i = 0; i < y.length; i += 3) { ppX.push(y[i][0]); ppY.push(y[i][1]); }
  drawLine(ctx2, ppX, ppY, xScalePP, yScalePP, pad, c2cW, c2cH, SERIES_COLORS[4], 1.5);

  // Start dot
  drawDot(ctx2, y[0][0], y[0][1], xScalePP, yScalePP, pad, c2cW, c2cH, '#10b981', 5);
  // End dot
  const ei = y.length - 1;
  drawDot(ctx2, y[ei][0], y[ei][1], xScalePP, yScalePP, pad, c2cW, c2cH, '#ef4444', 4);

  // Equilibrium crosshair
  const xStar = state.gamma / state.delta;
  const yStar = state.alpha / state.beta;
  if (xStar > 0 && xStar < xScalePP.max && yStar > 0 && yStar < yScalePP.max) {
    const ex = mapX(xStar, xScalePP, pad, c2cW);
    const ey = mapY(yStar, yScalePP, pad, c2cH);
    ctx2.strokeStyle = 'rgba(245,158,11,0.4)'; ctx2.lineWidth = 1;
    ctx2.setLineDash([3,3]);
    ctx2.beginPath(); ctx2.moveTo(ex-10,ey); ctx2.lineTo(ex+10,ey); ctx2.moveTo(ex,ey-10); ctx2.lineTo(ex,ey+10); ctx2.stroke();
    ctx2.setLineDash([]);
    drawDot(ctx2, xStar, yStar, xScalePP, yScalePP, pad, c2cW, c2cH, '#f59e0b', 3);
    drawAnnotation(ctx2, `(${xStar.toFixed(0)}, ${yStar.toFixed(0)})`, ex, ey, 8, -6);
  }

  // Metrics
  updateMetric('metric-xeq', (state.gamma/state.delta).toFixed(1));
  updateMetric('metric-yeq', (state.alpha/state.beta).toFixed(1));
  const peaks = [];
  for (let i = 2; i < y.length-2; i++) { if (y[i][0] > y[i-1][0] && y[i][0] > y[i+1][0]) peaks.push(t[i]); }
  if (peaks.length >= 2) {
    const avg = (peaks[peaks.length-1]-peaks[0])/(peaks.length-1);
    const th = 2*Math.PI/Math.sqrt(state.alpha*state.gamma);
    updateMetric('metric-period', `${avg.toFixed(2)} yr (th: ${th.toFixed(2)})`);
  } else updateMetric('metric-period','—');
  const ls = y[y.length-1];
  updateMetric('metric-H', (state.delta*ls[0] - state.gamma*Math.log(ls[0]) + state.beta*ls[1] - state.alpha*Math.log(ls[1])).toFixed(4));
  formulaBar.textContent = `dx/dt = ${state.alpha.toFixed(2)}x − ${state.beta.toFixed(3)}xy${state.hunting?` − ${state.huntRate.toFixed(2)}x`:''}  ·  dy/dt = ${state.delta.toFixed(3)}xy − ${state.gamma.toFixed(2)}y  ·  x*=${(state.gamma/state.delta).toFixed(1)}  y*=${(state.alpha/state.beta).toFixed(1)}`;
}
render();
