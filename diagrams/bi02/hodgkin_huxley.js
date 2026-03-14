/**
 * BI-02 · Action Potential Simulator (Hodgkin–Huxley)
 * Scientific voltage + gating variable plots with proper axes.
 */
import { rk4Integrate } from '../../src/engine/rk4.js';
import { createSlider, createSection, createToggle, createResetButton,
         createFormulaBar, createMetricsStrip, updateMetric,
         createButtonGroup, createDiagramHeader } from '../../src/components/controls.js';
import { clearCanvas, drawAxes, niceScale, graphPadding, mapX, mapY,
         drawLine, drawLegend, SERIES_COLORS, COLORS, FONT_VALUE } from '../../src/engine/graph.js';
import '../../src/styles/index.css';

const Cm = 1.0, E_Na = 50.0, E_K = -77.0, E_L = -54.387, g_L = 0.3;

const defaults = {
  gNa: 120, gK: 36, Istim: 10, stimStart: 1, stimDur: 1,
  temperature: 6.3, tSpan: 30, longPulse: false, showGating: true,
};
let state = { ...defaults };
let canvas, ctx, canvasW = 0, canvasH = 0;

function q10(T) { return Math.pow(3, (T - 6.3) / 10); }
function aM(V) { const d=V+40; return Math.abs(d)<1e-6?1:0.1*d/(1-Math.exp(-d/10)); }
function bM(V) { return 4*Math.exp(-(V+65)/18); }
function aH(V) { return 0.07*Math.exp(-(V+65)/20); }
function bH(V) { return 1/(1+Math.exp(-(V+35)/10)); }
function aN(V) { const d=V+55; return Math.abs(d)<1e-6?0.1:0.01*d/(1-Math.exp(-d/10)); }
function bN(V) { return 0.125*Math.exp(-(V+65)/80); }

function hhDeriv(t, y) {
  const [V,m,h,n] = y; const phi = q10(state.temperature);
  const INa=state.gNa*m*m*m*h*(V-E_Na), IK=state.gK*n*n*n*n*(V-E_K), IL=g_L*(V-E_L);
  let Is=0;
  if (state.longPulse) { if (t>=state.stimStart) Is=state.Istim; }
  else { if (t>=state.stimStart && t<=state.stimStart+state.stimDur) Is=state.Istim; }
  return [(Is-INa-IK-IL)/Cm, phi*(aM(V)*(1-m)-bM(V)*m), phi*(aH(V)*(1-h)-bH(V)*h), phi*(aN(V)*(1-n)-bN(V)*n)];
}

function solve() {
  const V0=-65; const m0=aM(V0)/(aM(V0)+bM(V0)); const h0=aH(V0)/(aH(V0)+bH(V0)); const n0=aN(V0)/(aN(V0)+bN(V0));
  return rk4Integrate(hhDeriv, 0, [V0,m0,h0,n0], state.tSpan, 0.005);
}

// --- UI ---
const app = document.getElementById('app');
app.appendChild(createDiagramHeader('Action Potential Simulator (Hodgkin–Huxley)'));
const body = document.createElement('div'); body.className = 'diagram-body';
const canvasArea = document.createElement('div'); canvasArea.className = 'canvas-area';
canvas = document.createElement('canvas'); canvas.id = 'hh-canvas';
canvas.setAttribute('aria-label', 'Hodgkin-Huxley action potential simulation');
canvasArea.appendChild(canvas);
const controlPanel = document.createElement('div'); controlPanel.className = 'control-panel';
body.appendChild(canvasArea); body.appendChild(controlPanel); app.appendChild(body);
const formulaBar = createFormulaBar(); app.appendChild(formulaBar);
const metricsStrip = createMetricsStrip([
  { label: 'V_rest', id: 'm-vr' }, { label: 'V_peak', id: 'm-vp' },
  { label: 'V_ahp', id: 'm-va' }, { label: 'Spike width', id: 'm-sw' },
]); app.appendChild(metricsStrip);
ctx = canvas.getContext('2d');

function buildControls() {
  controlPanel.innerHTML = '';
  const s1 = createSection('Stimulus');
  s1.appendChild(createSlider({ id:'is', label:'I_stim', min:0, max:50, step:0.5, value:state.Istim, unit:'μA/cm²', decimals:1, onChange:v=>{state.Istim=v; render();} }));
  s1.appendChild(createSlider({ id:'ss', label:'Start', min:0.5, max:5, step:0.1, value:state.stimStart, unit:'ms', decimals:1, onChange:v=>{state.stimStart=v; render();} }));
  if (!state.longPulse) s1.appendChild(createSlider({ id:'sd', label:'Duration', min:0.1, max:5, step:0.1, value:state.stimDur, unit:'ms', decimals:1, onChange:v=>{state.stimDur=v; render();} }));
  s1.appendChild(createToggle('Long Step', state.longPulse, v=>{state.longPulse=v; buildControls(); render();}));
  controlPanel.appendChild(s1);
  const s2 = createSection('Ion Channels');
  s2.appendChild(createSlider({ id:'gna', label:'ḡ_Na', min:50, max:200, step:1, value:state.gNa, unit:'mS/cm²', decimals:0, onChange:v=>{state.gNa=v; render();} }));
  s2.appendChild(createSlider({ id:'gk', label:'ḡ_K', min:10, max:60, step:1, value:state.gK, unit:'mS/cm²', decimals:0, onChange:v=>{state.gK=v; render();} }));
  controlPanel.appendChild(s2);
  const s3 = createSection('Environment');
  s3.appendChild(createSlider({ id:'t', label:'Temperature', min:6.3, max:38, step:0.5, value:state.temperature, unit:'°C', decimals:1, onChange:v=>{state.temperature=v; render();} }));
  s3.appendChild(createSlider({ id:'ts', label:'Time span', min:10, max:100, step:5, value:state.tSpan, unit:'ms', decimals:0, onChange:v=>{state.tSpan=v; render();} }));
  controlPanel.appendChild(s3);
  const s4 = createSection('Display');
  s4.appendChild(createToggle('Gating (m,h,n)', state.showGating, v=>{state.showGating=v; render();}));
  controlPanel.appendChild(s4);
  controlPanel.appendChild(createResetButton(()=>{ state={...defaults}; buildControls(); render(); }));
}
buildControls();

function resize() {
  const r = canvasArea.getBoundingClientRect(); canvasW=Math.floor(r.width); canvasH=Math.floor(r.height);
  canvas.width=canvasW; canvas.height=canvasH; render();
}
window.addEventListener('resize', resize); setTimeout(resize, 50);

function render() {
  if (!canvasW || !canvasH) return;
  const { t, y } = solve();
  
  const showGate = state.showGating;
  const topPad = graphPadding({ bottom: showGate ? 20 : 52 });
  const voltH = showGate ? Math.floor((canvasH - 70) * 0.6) : canvasH - topPad.top - topPad.bottom;
  const gateTop = topPad.top + voltH + 35;
  const gateH = showGate ? canvasH - gateTop - 52 : 0;
  const chartW = canvasW - topPad.left - topPad.right;

  clearCanvas(ctx, canvasW, canvasH);

  // === Voltage plot ===
  const xScale = niceScale(0, state.tSpan);
  const yScaleV = niceScale(-90, 60, 6);
  drawAxes(ctx, { canvasW, canvasH: topPad.top + voltH + (showGate ? 20 : topPad.bottom), pad: { ...topPad, bottom: showGate ? 20 : topPad.bottom }, xScale, yScale: yScaleV, xLabel: showGate ? '' : 'Time (ms)', yLabel: 'V_m (mV)', title: 'Membrane Voltage' });

  // Stimulus band
  const sStartPx = mapX(state.stimStart, xScale, topPad, chartW);
  let sEndPx;
  if (state.longPulse) sEndPx = mapX(xScale.max, xScale, topPad, chartW);
  else sEndPx = mapX(state.stimStart + state.stimDur, xScale, topPad, chartW);
  ctx.fillStyle = 'rgba(99,102,241,0.06)';
  ctx.fillRect(sStartPx, topPad.top, sEndPx - sStartPx, voltH);
  ctx.fillStyle = 'rgba(99,102,241,0.4)'; ctx.font = '9px IBM Plex Sans'; ctx.textAlign = 'center';
  ctx.fillText(`I=${state.Istim} μA/cm²`, (sStartPx+sEndPx)/2, topPad.top + 12);

  // Zero line
  const zeroY = mapY(0, yScaleV, topPad, voltH);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.5;
  ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(topPad.left, zeroY); ctx.lineTo(topPad.left+chartW, zeroY); ctx.stroke(); ctx.setLineDash([]);

  // Voltage trace
  const tArr = [], vArr = [];
  for (let i = 0; i < t.length; i+=2) { tArr.push(t[i]); vArr.push(y[i][0]); }
  drawLine(ctx, tArr, vArr, xScale, yScaleV, topPad, chartW, voltH, '#e8ecf1', 2);

  // === Gating variables ===
  if (showGate) {
    const gatePad = { top: gateTop, left: topPad.left, right: topPad.right, bottom: 52 };
    const yScaleG = niceScale(0, 1, 4);
    drawAxes(ctx, { canvasW, canvasH, pad: gatePad, xScale, yScale: yScaleG, xLabel: 'Time (ms)', yLabel: 'Gate', title: 'Gating Variables' });

    const mArr = [], hArr = [], nArr = [];
    for (let i = 0; i < t.length; i+=2) { mArr.push(y[i][1]); hArr.push(y[i][2]); nArr.push(y[i][3]); }
    drawLine(ctx, tArr, mArr, xScale, yScaleG, gatePad, chartW, gateH, '#E69F00', 1.5);
    drawLine(ctx, tArr, hArr, xScale, yScaleG, gatePad, chartW, gateH, '#56B4E9', 1.5);
    drawLine(ctx, tArr, nArr, xScale, yScaleG, gatePad, chartW, gateH, '#009E73', 1.5);
    drawLegend(ctx, [
      { label: 'm (Na act.)', color: '#E69F00' },
      { label: 'h (Na inact.)', color: '#56B4E9' },
      { label: 'n (K act.)', color: '#009E73' },
    ], topPad.left + chartW - 110, gateTop + 8);
  }

  // Metrics
  let Vpk=-100, Vahp=100, spS=-1, spE=-1;
  for (let i=0;i<y.length;i++) {
    if (y[i][0]>Vpk) Vpk=y[i][0];
    if (t[i]>state.stimStart+(state.longPulse?0.5:state.stimDur)+1 && y[i][0]<Vahp) Vahp=y[i][0];
    if (spS<0 && y[i][0]>-20) spS=t[i];
    if (spS>0 && spE<0 && y[i][0]<-20 && t[i]>spS+0.1) spE=t[i];
  }
  updateMetric('m-vr', `${y[0][0].toFixed(1)} mV`);
  updateMetric('m-vp', `${Vpk.toFixed(1)} mV`);
  updateMetric('m-va', Vpk>-40?`${Vahp.toFixed(1)} mV`:'—');
  updateMetric('m-sw', spE>0?`${(spE-spS).toFixed(2)} ms`:'no spike');
  formulaBar.textContent = `Cₘ·dV/dt = I − ḡ_Na·m³h·(V−E_Na) − ḡ_K·n⁴·(V−E_K) − ḡ_L·(V−E_L)  ·  ḡ_Na=${state.gNa}  ḡ_K=${state.gK}  T=${state.temperature}°C  Q₁₀=${q10(state.temperature).toFixed(2)}`;
}
render();
