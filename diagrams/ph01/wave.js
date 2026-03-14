/**
 * PH-01 · Wave Interference Bench
 * Clean scientific canvas with proper metric overlay.
 */
import { createSlider, createSection, createToggle, createResetButton,
         createFormulaBar, createMetricsStrip, updateMetric,
         createButtonGroup, createDiagramHeader } from '../../src/components/controls.js';
import { COLORS } from '../../src/engine/graph.js';
import '../../src/styles/index.css';

function wavelengthToRGB(nm) {
  let r,g,b;
  if (nm<380){r=0.4;g=0;b=0.6;} else if(nm<440){r=-(nm-440)/60;g=0;b=1;}
  else if(nm<490){r=0;g=(nm-440)/50;b=1;} else if(nm<510){r=0;g=1;b=-(nm-510)/20;}
  else if(nm<580){r=(nm-510)/70;g=1;b=0;} else if(nm<645){r=1;g=-(nm-645)/65;b=0;}
  else if(nm<=800){r=1;g=0;b=0;} else{r=0.6;g=0;b=0.4;}
  let f;
  if(nm<380)f=0.3; else if(nm<420)f=0.3+0.7*(nm-380)/40;
  else if(nm>700)f=0.3+0.7*(800-nm)/100; else f=1;
  return [Math.round(255*Math.pow(r*f,0.8)),Math.round(255*Math.pow(g*f,0.8)),Math.round(255*Math.pow(b*f,0.8))];
}

const defaults = {
  sources:[{x:0.35,y:0.5,lambda:500,amp:1.0,phase:0},{x:0.65,y:0.5,lambda:500,amp:1.0,phase:0}],
  speed:1.0, showWavefronts:true, showIntensity:true, showRulers:false,
};
let state = JSON.parse(JSON.stringify(defaults));
let time=0, animId=null, activeSource=-1, canvas, ctx, canvasW=0, canvasH=0, imageData;
let cursorX=-1, cursorY=-1;
const SCALE = 200;

function resetState() { state = JSON.parse(JSON.stringify(defaults)); time=0; rebuildControls(); }

const app = document.getElementById('app');
app.appendChild(createDiagramHeader('Wave Interference Bench'));
const body = document.createElement('div'); body.className = 'diagram-body';
const canvasArea = document.createElement('div'); canvasArea.className = 'canvas-area';
canvas = document.createElement('canvas'); canvas.id = 'wave-canvas';
canvas.setAttribute('aria-label','Wave interference pattern'); canvas.style.cursor='crosshair';
canvasArea.appendChild(canvas);
const controlPanel = document.createElement('div'); controlPanel.className = 'control-panel'; controlPanel.id='controls';
body.appendChild(canvasArea); body.appendChild(controlPanel); app.appendChild(body);
const formulaBar = createFormulaBar(); app.appendChild(formulaBar);
const metricsStrip = createMetricsStrip([
  {label:'Fringe spacing',id:'m-fringe'},{label:'Δr at cursor',id:'m-path'},
  {label:'Ψ at cursor',id:'m-psi'},{label:'Frequency',id:'m-freq'},
]); app.appendChild(metricsStrip);
ctx = canvas.getContext('2d');

function rebuildControls() {
  controlPanel.innerHTML = '';
  const src = createSection(`Sources (${state.sources.length}/4)`);
  const addBtn = document.createElement('button'); addBtn.className='btn btn-sm'; addBtn.textContent='+ Add source';
  addBtn.disabled = state.sources.length >= 4;
  addBtn.addEventListener('click',()=>{ if(state.sources.length<4){state.sources.push({x:0.3+Math.random()*0.4,y:0.3+Math.random()*0.4,lambda:500,amp:1,phase:0}); rebuildControls();} });
  src.appendChild(addBtn); controlPanel.appendChild(src);
  state.sources.forEach((s,i) => {
    const sec = createSection(`S${i+1}`);
    if (state.sources.length > 1) { const rb = document.createElement('button'); rb.className='btn btn-sm'; rb.textContent='✕'; rb.style.marginBottom='6px'; rb.addEventListener('click',()=>{state.sources.splice(i,1); rebuildControls();}); sec.appendChild(rb); }
    sec.appendChild(createSlider({id:`l${i}`,label:'λ',min:200,max:800,step:5,value:s.lambda,unit:'nm',decimals:0,onChange:v=>{state.sources[i].lambda=v;}}));
    sec.appendChild(createSlider({id:`a${i}`,label:'A',min:0.1,max:2,step:0.05,value:s.amp,decimals:2,onChange:v=>{state.sources[i].amp=v;}}));
    sec.appendChild(createSlider({id:`p${i}`,label:'φ',min:0,max:360,step:1,value:s.phase,unit:'°',decimals:0,onChange:v=>{state.sources[i].phase=v;}}));
    controlPanel.appendChild(sec);
  });
  const gl = createSection('Global');
  gl.appendChild(createSlider({id:'spd',label:'Speed',min:0.5,max:2,step:0.05,value:state.speed,unit:'×',decimals:2,onChange:v=>{state.speed=v;}}));
  controlPanel.appendChild(gl);
  const disp = createSection('Display');
  disp.appendChild(createButtonGroup([
    createToggle('Wavefronts',state.showWavefronts,v=>{state.showWavefronts=v;}),
    createToggle('Intensity',state.showIntensity,v=>{state.showIntensity=v;}),
    createToggle('Rulers',state.showRulers,v=>{state.showRulers=v;}),
  ])); controlPanel.appendChild(disp);
  controlPanel.appendChild(createResetButton(resetState));
}
rebuildControls();

function resize() {
  const r=canvasArea.getBoundingClientRect(); canvasW=Math.floor(r.width); canvasH=Math.floor(r.height);
  canvas.width=canvasW; canvas.height=canvasH; imageData=ctx.createImageData(canvasW,canvasH);
}
window.addEventListener('resize',resize); resize();

canvas.addEventListener('mousedown',e=>{
  const r=canvas.getBoundingClientRect(); const mx=(e.clientX-r.left)/r.width; const my=(e.clientY-r.top)/r.height;
  for(let i=0;i<state.sources.length;i++){const dx=mx-state.sources[i].x;const dy=my-state.sources[i].y;if(dx*dx+dy*dy<0.001){activeSource=i;break;}}
});
canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect(); cursorX=(e.clientX-r.left)/r.width; cursorY=(e.clientY-r.top)/r.height;
  if(activeSource>=0){state.sources[activeSource].x=Math.max(0.02,Math.min(0.98,cursorX));state.sources[activeSource].y=Math.max(0.02,Math.min(0.98,cursorY));}
});
canvas.addEventListener('mouseup',()=>{activeSource=-1;});
canvas.addEventListener('mouseleave',()=>{activeSource=-1;cursorX=-1;cursorY=-1;});

function computeAmp(px,py,t) {
  let psi=0;
  for(const s of state.sources){
    const sx=s.x*canvasW,sy=s.y*canvasH;
    const r=Math.sqrt((px-sx)**2+(py-sy)**2);
    const lPx=s.lambda/800*SCALE;
    const k=2*Math.PI/lPx;
    psi+=s.amp*Math.sin(k*r-k*state.speed*60*t+s.phase*Math.PI/180);
  }
  return psi;
}

function render() {
  if(!canvasW||!canvasH)return;
  const data=imageData.data,w=canvasW,h=canvasH;
  const avgL=state.sources.reduce((s,src)=>s+src.lambda,0)/state.sources.length;
  const maxA=state.sources.reduce((s,src)=>s+src.amp,0);
  const [cr,cg,cb]=wavelengthToRGB(avgL);
  const step=2;

  // Fill background
  for(let i=0;i<data.length;i+=4){data[i]=14;data[i+1]=18;data[i+2]=25;data[i+3]=255;}

  if(state.showIntensity){
    for(let py=0;py<h;py+=step){
      for(let px=0;px<w;px+=step){
        const psi=computeAmp(px,py,time);
        const intensity=Math.pow((psi/maxA+1)/2,1.8);
        const r=Math.round(cr*intensity);
        const g=Math.round(cg*intensity);
        const b=Math.round(cb*intensity);
        for(let dy=0;dy<step&&py+dy<h;dy++){
          for(let dx=0;dx<step&&px+dx<w;dx++){
            const idx=((py+dy)*w+(px+dx))*4;
            data[idx]=r;data[idx+1]=g;data[idx+2]=b;data[idx+3]=255;
          }
        }
      }
    }
  }
  ctx.putImageData(imageData,0,0);

  // Wavefronts 
  if(state.showWavefronts){
    state.sources.forEach(s=>{
      const [sr,sg,sb]=wavelengthToRGB(s.lambda);
      const sx=s.x*w,sy=s.y*h;
      const lPx=s.lambda/800*SCALE;
      ctx.strokeStyle=`rgba(${sr},${sg},${sb},0.25)`;ctx.lineWidth=0.8;
      const maxR=Math.sqrt(w*w+h*h);
      const k=2*Math.PI/lPx;const off=(k*state.speed*60*time)%(2*Math.PI);
      for(let n=0;n<Math.ceil(maxR/lPx);n++){
        const r=(n*2*Math.PI+off)/k;
        if(r>0&&r<maxR){ctx.beginPath();ctx.arc(sx,sy,r,0,2*Math.PI);ctx.stroke();}
      }
    });
  }

  // Source markers — clean circles with label
  state.sources.forEach((s,i)=>{
    const sx=s.x*w,sy=s.y*h;
    const [sr,sg,sb]=wavelengthToRGB(s.lambda);
    // outer ring
    ctx.beginPath();ctx.arc(sx,sy,7,0,2*Math.PI);
    ctx.fillStyle=`rgb(${sr},${sg},${sb})`;ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.7)';ctx.lineWidth=1.5;ctx.stroke();
    // label
    ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='9px IBM Plex Mono';ctx.textAlign='center';
    ctx.fillText(`S${i+1}`,sx,sy-12);
  });

  // Rulers
  if(state.showRulers){
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=0.5;ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();ctx.setLineDash([]);
    // Scale bar
    ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(16,h-24);ctx.lineTo(16+SCALE,h-24);ctx.stroke();
    ctx.beginPath();ctx.moveTo(16,h-28);ctx.lineTo(16,h-20);ctx.stroke();
    ctx.beginPath();ctx.moveTo(16+SCALE,h-28);ctx.lineTo(16+SCALE,h-20);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='9px IBM Plex Mono';ctx.textAlign='center';
    ctx.fillText(`${avgL.toFixed(0)} nm`,16+SCALE/2,h-30);
  }

  // Cursor crosshair
  if(cursorX>=0&&cursorY>=0){
    const px=cursorX*w,py=cursorY*h;
    ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=0.5;ctx.setLineDash([2,3]);
    ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,h);ctx.moveTo(0,py);ctx.lineTo(w,py);ctx.stroke();ctx.setLineDash([]);
    // Readout box
    const psi=computeAmp(px,py,time);
    ctx.fillStyle='rgba(14,18,25,0.85)';
    ctx.fillRect(px+12,py-30,120,22);
    ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=0.5;
    ctx.strokeRect(px+12,py-30,120,22);
    ctx.fillStyle='#a5b4fc';ctx.font='10px IBM Plex Mono';ctx.textAlign='left';
    ctx.fillText(`Ψ = ${psi.toFixed(3)}`,px+16,py-14);
  }

  // Metrics
  if(state.sources.length>=2){
    const s0=state.sources[0],s1=state.sources[1];
    const d=Math.sqrt((s0.x-s1.x)**2+(s0.y-s1.y)**2)*Math.max(canvasW,canvasH);
    const lPx=s0.lambda/800*SCALE;
    updateMetric('m-fringe',d>0?`${(lPx*Math.max(canvasW,canvasH)/d).toFixed(1)} px`:'—');
    if(cursorX>=0){
      const r0=Math.sqrt((cursorX*canvasW-s0.x*canvasW)**2+(cursorY*canvasH-s0.y*canvasH)**2);
      const r1=Math.sqrt((cursorX*canvasW-s1.x*canvasW)**2+(cursorY*canvasH-s1.y*canvasH)**2);
      updateMetric('m-path',`${Math.abs(r0-r1).toFixed(1)} px`);
      updateMetric('m-psi',computeAmp(cursorX*canvasW,cursorY*canvasH,time).toFixed(3));
    }
  }
  updateMetric('m-freq',`${(state.speed*3e8/(state.sources[0].lambda*1e-9)/1e12).toFixed(1)} THz`);
  formulaBar.textContent=`Ψ(x,y,t) = ${state.sources.map((s,i)=>`${s.amp.toFixed(2)}·sin(2π/${s.lambda}nm · r${i+1} − ωt + ${s.phase}°)`).join(' + ')}`;
}

function animate(){time+=0.016*state.speed;render();animId=requestAnimationFrame(animate);}
animate();
