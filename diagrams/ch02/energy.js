/**
 * CH-02 · Reaction Energy Diagram
 * Scientific energy profile with proper axes and clean annotations.
 */
import { createSlider, createSection, createToggle, createResetButton,
         createFormulaBar, createMetricsStrip, updateMetric,
         createButtonGroup, createDiagramHeader } from '../../src/components/controls.js';
import { clearCanvas, drawAxes, niceScale, graphPadding, mapX, mapY,
         COLORS, FONT_VALUE } from '../../src/engine/graph.js';
import '../../src/styles/index.css';

const R=8.314, A_FACTOR=1e13;
const presets = {
  'Methane combustion':{r:0,ts:75,p:-890},'Ammonia synthesis':{r:0,ts:232,p:-92},'Enzyme catalysed':{r:0,ts:50,p:-30},
};
const defaults = { reactantE:0, tsE:75, productE:-200, temperature:298, showCatalyst:false, catalystTsE:40, steps:1, intermediateE:-50, ts2E:100 };
let state = { ...defaults };
let canvas, ctx, canvasW=0, canvasH=0, draggingNode=null, nodePositions=[];

function arrhenius(Ea,T){ return Ea<=0?A_FACTOR:A_FACTOR*Math.exp(-Ea*1000/(R*T)); }

const app = document.getElementById('app');
app.appendChild(createDiagramHeader('Reaction Energy Diagram'));
const body = document.createElement('div'); body.className = 'diagram-body';
const canvasArea = document.createElement('div'); canvasArea.className = 'canvas-area';
canvas = document.createElement('canvas'); canvas.id='energy-canvas';
canvas.setAttribute('aria-label','Reaction energy profile'); canvas.style.cursor='pointer';
canvasArea.appendChild(canvas);
const controlPanel = document.createElement('div'); controlPanel.className = 'control-panel';
body.appendChild(canvasArea); body.appendChild(controlPanel); app.appendChild(body);
const formulaBar = createFormulaBar(); app.appendChild(formulaBar);
const metricsStrip = createMetricsStrip([
  {label:'E_a',id:'m-ea'},{label:'ΔH',id:'m-dh'},{label:'k_f',id:'m-kf'},{label:'k_r',id:'m-kr'},{label:'K_eq',id:'m-keq'},
]); app.appendChild(metricsStrip);
ctx = canvas.getContext('2d');

function buildControls() {
  controlPanel.innerHTML = '';
  const sp = createSection('Presets');
  Object.keys(presets).forEach(n=>{
    const b=document.createElement('button');b.className='btn btn-sm';b.textContent=n;b.style.cssText='margin-bottom:3px;width:100%;';
    b.addEventListener('click',()=>{const p=presets[n];state.reactantE=p.r;state.tsE=p.ts;state.productE=p.p;buildControls();render();});
    sp.appendChild(b);
  }); controlPanel.appendChild(sp);
  const se = createSection('Energy Levels');
  se.appendChild(createSlider({id:'re',label:'Reactant',min:-300,max:300,step:5,value:state.reactantE,unit:'kJ/mol',decimals:0,onChange:v=>{state.reactantE=v;render();}}));
  se.appendChild(createSlider({id:'te',label:'TS',min:-100,max:300,step:5,value:state.tsE,unit:'kJ/mol',decimals:0,onChange:v=>{state.tsE=Math.max(v,Math.max(state.reactantE,state.productE)+1);render();}}));
  se.appendChild(createSlider({id:'pe',label:'Product',min:-300,max:300,step:5,value:state.productE,unit:'kJ/mol',decimals:0,onChange:v=>{state.productE=v;render();}}));
  controlPanel.appendChild(se);
  const st = createSection('Temperature');
  st.appendChild(createSlider({id:'tmp',label:'T',min:200,max:1200,step:10,value:state.temperature,unit:'K',decimals:0,onChange:v=>{state.temperature=v;render();}}));
  controlPanel.appendChild(st);
  const sc = createSection('Catalyst');
  sc.appendChild(createToggle('Enable',state.showCatalyst,v=>{state.showCatalyst=v;buildControls();render();}));
  if(state.showCatalyst) sc.appendChild(createSlider({id:'ce',label:'E_a (cat)',min:0,max:Math.max(state.tsE-state.reactantE,1),step:1,value:state.catalystTsE,unit:'kJ/mol',decimals:0,onChange:v=>{state.catalystTsE=v;render();}}));
  controlPanel.appendChild(sc);
  const ss = createSection('Steps');
  ss.appendChild(createSlider({id:'stp',label:'Steps',min:1,max:3,step:1,value:state.steps,decimals:0,onChange:v=>{state.steps=v;buildControls();render();}}));
  if(state.steps>=2) ss.appendChild(createSlider({id:'ie',label:'Intermediate',min:-300,max:300,step:5,value:state.intermediateE,unit:'kJ/mol',decimals:0,onChange:v=>{state.intermediateE=v;render();}}));
  if(state.steps>=3) ss.appendChild(createSlider({id:'t2',label:'TS₂',min:-100,max:300,step:5,value:state.ts2E,unit:'kJ/mol',decimals:0,onChange:v=>{state.ts2E=v;render();}}));
  controlPanel.appendChild(ss);
  controlPanel.appendChild(createResetButton(()=>{state={...defaults};buildControls();render();}));
}
buildControls();

function bezierPath(ctx,pts,pad,chartW,chartH,yScale) {
  const mapped = pts.map(p=>({x:pad.left+p.xFrac*chartW, y:mapY(p.e,yScale,pad,chartH)}));
  ctx.moveTo(mapped[0].x, mapped[0].y);
  for(let i=0;i<mapped.length-1;i++){
    const dx=mapped[i+1].x-mapped[i].x;
    ctx.bezierCurveTo(mapped[i].x+dx*0.4,mapped[i].y,mapped[i+1].x-dx*0.4,mapped[i+1].y,mapped[i+1].x,mapped[i+1].y);
  }
}

canvas.addEventListener('mousedown',e=>{
  const r=canvas.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top;
  for(const np of nodePositions){if(Math.abs(mx-np.x)<18&&Math.abs(my-np.y)<18){draggingNode=np.id;return;}}
});
canvas.addEventListener('mousemove',e=>{
  if(!draggingNode)return;const r=canvas.getBoundingClientRect();const my=e.clientY-r.top;
  const pad=graphPadding({top:50,bottom:55});const chartH=canvasH-pad.top-pad.bottom;
  const allE=[state.reactantE,state.tsE,state.productE,state.intermediateE,state.ts2E];
  const yScale=niceScale(Math.min(...allE)-50,Math.max(...allE)+50);
  const eVal=yScale.min+(yScale.max-yScale.min)*(1-(my-pad.top)/chartH);
  const ce=Math.round(Math.max(-300,Math.min(300,eVal)));
  if(draggingNode==='reactant')state.reactantE=ce;else if(draggingNode==='ts')state.tsE=Math.max(ce,Math.max(state.reactantE,state.productE)+1);
  else if(draggingNode==='product')state.productE=ce;else if(draggingNode==='intermediate')state.intermediateE=ce;
  buildControls();render();
});
canvas.addEventListener('mouseup',()=>{draggingNode=null;});
canvas.addEventListener('mouseleave',()=>{draggingNode=null;});

function resize(){const r=canvasArea.getBoundingClientRect();canvasW=Math.floor(r.width);canvasH=Math.floor(r.height);canvas.width=canvasW;canvas.height=canvasH;render();}
window.addEventListener('resize',resize);setTimeout(resize,50);

function render() {
  if(!canvasW||!canvasH)return;
  const pad = graphPadding({top:50,bottom:55});
  const chartW=canvasW-pad.left-pad.right;
  const chartH=canvasH-pad.top-pad.bottom;
  const allE=[state.reactantE,state.tsE,state.productE];
  if(state.steps>=2)allE.push(state.intermediateE);if(state.steps>=3)allE.push(state.ts2E);
  const yScale=niceScale(Math.min(...allE)-60,Math.max(...allE)+60);

  clearCanvas(ctx,canvasW,canvasH);
  drawAxes(ctx,{canvasW,canvasH,pad,xScale:{min:0,max:1,step:1,ticks:[]},yScale,xLabel:'Reaction Coordinate',yLabel:'Energy (kJ/mol)',title:''});

  // Build node points
  const nodes=[];
  if(state.steps===1){nodes.push({xFrac:0.1,e:state.reactantE,id:'reactant',label:'Reactants'},{xFrac:0.5,e:state.tsE,id:'ts',label:'TS‡'},{xFrac:0.9,e:state.productE,id:'product',label:'Products'});}
  else if(state.steps===2){nodes.push({xFrac:0.08,e:state.reactantE,id:'reactant',label:'Reactants'},{xFrac:0.3,e:state.tsE,id:'ts',label:'TS₁‡'},{xFrac:0.5,e:state.intermediateE,id:'intermediate',label:'Int'},{xFrac:0.7,e:Math.max(state.intermediateE+20,state.ts2E),id:'ts2',label:'TS₂‡'},{xFrac:0.92,e:state.productE,id:'product',label:'Products'});}
  else{nodes.push({xFrac:0.05,e:state.reactantE,id:'reactant',label:'Reactants'},{xFrac:0.22,e:state.tsE,id:'ts',label:'TS₁‡'},{xFrac:0.38,e:state.intermediateE,id:'intermediate',label:'Int₁'},{xFrac:0.55,e:state.ts2E,id:'ts2',label:'TS₂‡'},{xFrac:0.72,e:state.intermediateE-30,id:'int2',label:'Int₂'},{xFrac:0.88,e:Math.max(state.intermediateE-10,state.productE+30),id:'ts3',label:'TS₃‡'},{xFrac:0.95,e:state.productE,id:'product',label:'Products'});}

  nodePositions=nodes.map(n=>({id:n.id,x:pad.left+n.xFrac*chartW,y:mapY(n.e,yScale,pad,chartH)}));

  // Uncatalysed path
  ctx.beginPath();ctx.strokeStyle='#10b981';ctx.lineWidth=2.5;
  bezierPath(ctx,nodes,pad,chartW,chartH,yScale);ctx.stroke();

  // Catalysed path
  if(state.showCatalyst){
    const catE=state.reactantE+state.catalystTsE;
    ctx.beginPath();ctx.strokeStyle='#E69F00';ctx.lineWidth=2;ctx.setLineDash([6,4]);
    bezierPath(ctx,[{xFrac:0.1,e:state.reactantE},{xFrac:0.5,e:catE},{xFrac:0.9,e:state.productE}],pad,chartW,chartH,yScale);
    ctx.stroke();ctx.setLineDash([]);
    const cpx=pad.left+0.5*chartW,cpy=mapY(catE,yScale,pad,chartH);
    ctx.fillStyle='#E69F00';ctx.font='10px IBM Plex Sans';ctx.textAlign='center';
    ctx.fillText(`TS‡ (cat) ${catE} kJ/mol`,cpx,cpy-14);
  }

  // Nodes
  nodePositions.forEach((np,i)=>{
    const nd=nodes[i];
    // Horizontal level line
    ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=0.5;
    ctx.beginPath();ctx.moveTo(np.x-25,np.y);ctx.lineTo(np.x+25,np.y);ctx.stroke();
    // Dot
    ctx.beginPath();ctx.arc(np.x,np.y,5,0,2*Math.PI);
    ctx.fillStyle=nd.id.includes('ts')?'#ef4444':'#6366f1';ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=1;ctx.stroke();
    // Labels
    ctx.fillStyle='#c8cdd5';ctx.font='10px IBM Plex Sans';ctx.textAlign='center';
    ctx.fillText(nd.label,np.x,np.y-14);
    ctx.fillStyle='#8b95a5';ctx.font='9px IBM Plex Mono';
    ctx.fillText(`${nd.e} kJ/mol`,np.x,np.y+18);
  });

  // Ea arrow
  const rY=mapY(state.reactantE,yScale,pad,chartH);
  const tY=mapY(state.tsE,yScale,pad,chartH);
  const pY=mapY(state.productE,yScale,pad,chartH);
  const aX=pad.left+0.28*chartW;
  ctx.strokeStyle='rgba(239,68,68,0.5)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(aX,rY);ctx.lineTo(aX,tY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(aX,tY);ctx.lineTo(aX-3,tY+6);ctx.lineTo(aX+3,tY+6);ctx.fillStyle='rgba(239,68,68,0.7)';ctx.fill();
  ctx.fillStyle='#ef4444';ctx.font='10px IBM Plex Sans';ctx.textAlign='right';
  ctx.fillText(`Eₐ = ${(state.tsE-state.reactantE)} kJ/mol`,aX-6,(rY+tY)/2);

  // ΔH arrow
  const dH=state.productE-state.reactantE;
  const dhX=pad.left+0.75*chartW;
  ctx.strokeStyle='rgba(99,102,241,0.5)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(dhX,rY);ctx.lineTo(dhX,pY);ctx.stroke();
  ctx.fillStyle='#6366f1';ctx.font='10px IBM Plex Sans';ctx.textAlign='left';
  ctx.fillText(`ΔH = ${dH} kJ/mol`,dhX+6,(rY+pY)/2);

  // Badge
  const badge=dH<-0.01?'EXOTHERMIC':dH>0.01?'ENDOTHERMIC':'THERMONEUTRAL';
  const bc=dH<0?'#ef4444':dH>0?'#56B4E9':'#8b95a5';
  ctx.fillStyle=bc;ctx.font='600 11px IBM Plex Sans';ctx.textAlign='center';
  ctx.fillText(badge,pad.left+chartW/2,pad.top-8);

  // Metrics
  const Ea=state.tsE-state.reactantE,EaR=state.tsE-state.productE;
  const kf=arrhenius(Ea,state.temperature),kr=arrhenius(EaR,state.temperature),Keq=kf/kr;
  updateMetric('m-ea',`${Ea} kJ/mol`);updateMetric('m-dh',`${dH} kJ/mol`);
  updateMetric('m-kf',kf.toExponential(2)+' s⁻¹');updateMetric('m-kr',kr.toExponential(2)+' s⁻¹');
  updateMetric('m-keq',Keq.toExponential(2));
  const dG=-R*state.temperature*Math.log(Keq)/1000;
  formulaBar.textContent=`k = A·exp(−Eₐ/RT)  ·  K_eq = k_f/k_r = ${Keq.toExponential(2)}  ·  ΔG = −RT·ln(K_eq) = ${dG.toFixed(1)} kJ/mol`;
}
render();
