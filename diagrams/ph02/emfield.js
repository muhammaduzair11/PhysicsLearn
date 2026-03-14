/**
 * PH-02 · Electromagnetic Field Visualiser
 * Clean scientific field visualization.
 */
import { createSlider, createSection, createToggle, createResetButton,
         createFormulaBar, createMetricsStrip, updateMetric,
         createButtonGroup, createDiagramHeader } from '../../src/components/controls.js';
import { COLORS } from '../../src/engine/graph.js';
import '../../src/styles/index.css';

const defaults = {
  charges:[{x:0.35,y:0.5,q:3},{x:0.65,y:0.5,q:-3}], wires:[], 
  showFieldLines:true, showEquipotentials:true, showVectorGrid:false, showBField:false, contourCount:20,
};
let state = JSON.parse(JSON.stringify(defaults));
let canvas, ctx, canvasW=0, canvasH=0, dragging=null;

function eField(px,py){
  let Ex=0,Ey=0;
  for(const c of state.charges){const cx=c.x*canvasW,cy=c.y*canvasH;const dx=px-cx,dy=py-cy;const r2=dx*dx+dy*dy;const r=Math.sqrt(r2);if(r<5)continue;const E=c.q/r2;Ex+=E*dx/r;Ey+=E*dy/r;}
  return[Ex,Ey];
}
function potential(px,py){
  let V=0;for(const c of state.charges){const cx=c.x*canvasW,cy=c.y*canvasH;const dx=px-cx,dy=py-cy;const r=Math.sqrt(dx*dx+dy*dy);if(r<3)continue;V+=c.q/r;}return V;
}
function bField(px,py){
  let Bz=0;for(const w of state.wires){const dx=px-w.x*canvasW,dy=py-w.y*canvasH;const d=Math.sqrt(dx*dx+dy*dy);if(d<3)continue;Bz+=w.I/d;}return Bz;
}

const app = document.getElementById('app');
app.appendChild(createDiagramHeader('Electromagnetic Field Visualiser'));
const body = document.createElement('div'); body.className='diagram-body';
const canvasArea = document.createElement('div'); canvasArea.className='canvas-area';
canvas = document.createElement('canvas'); canvas.id='em-canvas';
canvas.setAttribute('aria-label','Electromagnetic field visualization'); canvas.style.cursor='crosshair';
canvasArea.appendChild(canvas);
const controlPanel = document.createElement('div'); controlPanel.className='control-panel';
body.appendChild(canvasArea); body.appendChild(controlPanel); app.appendChild(body);
const formulaBar = createFormulaBar(); app.appendChild(formulaBar);
const metricsStrip = createMetricsStrip([
  {label:'Objects',id:'m-obj'},{label:'Net Q',id:'m-net'},{label:'|E|',id:'m-e'},{label:'V',id:'m-v'},
]); app.appendChild(metricsStrip);
ctx = canvas.getContext('2d');

function buildControls(){
  controlPanel.innerHTML='';
  const s1=createSection('Add Objects');
  const b1=document.createElement('button');b1.className='btn btn-sm';b1.textContent='⊕ +Charge';
  b1.addEventListener('click',()=>{if(state.charges.length<8){state.charges.push({x:0.3+Math.random()*0.4,y:0.3+Math.random()*0.4,q:2});buildControls();render();}});
  const b2=document.createElement('button');b2.className='btn btn-sm';b2.textContent='⊖ −Charge';
  b2.addEventListener('click',()=>{if(state.charges.length<8){state.charges.push({x:0.3+Math.random()*0.4,y:0.3+Math.random()*0.4,q:-2});buildControls();render();}});
  const b3=document.createElement('button');b3.className='btn btn-sm';b3.textContent='⊗ Wire';
  b3.addEventListener('click',()=>{if(state.wires.length<4){state.wires.push({x:0.5,y:0.5,I:5});buildControls();render();}});
  s1.appendChild(createButtonGroup([b1,b2,b3]));controlPanel.appendChild(s1);
  state.charges.forEach((c,i)=>{
    const s=createSection(`Q${i+1} = ${c.q>0?'+':''}${c.q}e`);
    s.appendChild(createSlider({id:`q${i}`,label:'q',min:-10,max:10,step:1,value:c.q,unit:'e',decimals:0,onChange:v=>{state.charges[i].q=v;render();}}));
    const rb=document.createElement('button');rb.className='btn btn-sm';rb.textContent='✕ Remove';
    rb.addEventListener('click',()=>{state.charges.splice(i,1);buildControls();render();});s.appendChild(rb);
    controlPanel.appendChild(s);
  });
  state.wires.forEach((w,i)=>{
    const s=createSection(`Wire ${i+1}`);
    s.appendChild(createSlider({id:`w${i}`,label:'I',min:-10,max:10,step:0.1,value:w.I,unit:'A',decimals:1,onChange:v=>{state.wires[i].I=v;render();}}));
    const rb=document.createElement('button');rb.className='btn btn-sm';rb.textContent='✕ Remove';
    rb.addEventListener('click',()=>{state.wires.splice(i,1);buildControls();render();});s.appendChild(rb);
    controlPanel.appendChild(s);
  });
  const sd=createSection('Display');
  sd.appendChild(createButtonGroup([
    createToggle('Field Lines',state.showFieldLines,v=>{state.showFieldLines=v;render();}),
    createToggle('Equipotentials',state.showEquipotentials,v=>{state.showEquipotentials=v;render();}),
    createToggle('E Vectors',state.showVectorGrid,v=>{state.showVectorGrid=v;render();}),
    createToggle('B Field',state.showBField,v=>{state.showBField=v;render();}),
  ]));
  sd.appendChild(createSlider({id:'nc',label:'Contours',min:10,max:50,step:5,value:state.contourCount,decimals:0,onChange:v=>{state.contourCount=v;render();}}));
  controlPanel.appendChild(sd);
  controlPanel.appendChild(createResetButton(()=>{state=JSON.parse(JSON.stringify(defaults));buildControls();render();}));
}
buildControls();

canvas.addEventListener('mousedown',e=>{
  const r=canvas.getBoundingClientRect();const mx=(e.clientX-r.left)/r.width,my=(e.clientY-r.top)/r.height;
  for(let i=0;i<state.charges.length;i++){const dx=mx-state.charges[i].x,dy=my-state.charges[i].y;if(dx*dx+dy*dy<0.001){dragging={t:'c',i};return;}}
  for(let i=0;i<state.wires.length;i++){const dx=mx-state.wires[i].x,dy=my-state.wires[i].y;if(dx*dx+dy*dy<0.001){dragging={t:'w',i};return;}}
});
canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();const mx=(e.clientX-r.left)/r.width,my=(e.clientY-r.top)/r.height;
  if(dragging){const o=dragging.t==='c'?state.charges[dragging.i]:state.wires[dragging.i];o.x=Math.max(0.05,Math.min(0.95,mx));o.y=Math.max(0.05,Math.min(0.95,my));render();}
  const px=mx*canvasW,py=my*canvasH;const[Ex,Ey]=eField(px,py);
  updateMetric('m-e',`${Math.sqrt(Ex*Ex+Ey*Ey).toFixed(4)}`);updateMetric('m-v',`${potential(px,py).toFixed(4)}`);
});
canvas.addEventListener('mouseup',()=>{dragging=null;});canvas.addEventListener('mouseleave',()=>{dragging=null;});

function resize(){const r=canvasArea.getBoundingClientRect();canvasW=Math.floor(r.width);canvasH=Math.floor(r.height);canvas.width=canvasW;canvas.height=canvasH;render();}
window.addEventListener('resize',resize);setTimeout(resize,50);

function render(){
  if(!canvasW||!canvasH)return;
  ctx.fillStyle='#0e1219';ctx.fillRect(0,0,canvasW,canvasH);

  // Subtle grid
  ctx.strokeStyle='rgba(255,255,255,0.02)';ctx.lineWidth=0.5;
  for(let x=0;x<canvasW;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvasH);ctx.stroke();}
  for(let y=0;y<canvasH;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvasW,y);ctx.stroke();}

  // Equipotentials
  if(state.showEquipotentials&&state.charges.length>0){
    const gs=100;const potG=[];let minV=Infinity,maxV=-Infinity;
    for(let gy=0;gy<gs;gy++){potG[gy]=[];for(let gx=0;gx<gs;gx++){const v=Math.max(-50,Math.min(50,potential(gx/gs*canvasW,gy/gs*canvasH)));potG[gy][gx]=v;if(v<minV)minV=v;if(v>maxV)maxV=v;}}
    for(let l=0;l<state.contourCount;l++){
      const tv=minV+(maxV-minV)*(l+0.5)/state.contourCount;const t=(l+0.5)/state.contourCount;
      const r=Math.round(t*200);const b=Math.round((1-t)*200);
      ctx.strokeStyle=`rgba(${r},${Math.round(180*(1-Math.abs(t-0.5)*2)*0.3)},${b},0.2)`;ctx.lineWidth=0.8;
      for(let gy=0;gy<gs-1;gy++){for(let gx=0;gx<gs-1;gx++){
        const v00=potG[gy][gx],v10=potG[gy][gx+1],v01=potG[gy+1][gx];
        const x0=gx/gs*canvasW,y0=gy/gs*canvasH,dx=canvasW/gs,dy=canvasH/gs;
        if((v00-tv)*(v10-tv)<0){const t1=(tv-v00)/(v10-v00);
          if((v00-tv)*(v01-tv)<0){const t2=(tv-v00)/(v01-v00);ctx.beginPath();ctx.moveTo(x0+t1*dx,y0);ctx.lineTo(x0,y0+t2*dy);ctx.stroke();}}
      }}
    }
  }

  // Field lines
  if(state.showFieldLines&&state.charges.length>0){
    for(const c of state.charges){
      if(c.q===0)continue;const nl=Math.min(Math.abs(c.q)*4,24);const cx=c.x*canvasW,cy=c.y*canvasH;
      for(let i=0;i<nl;i++){
        const ang=2*Math.PI*i/nl;let lx=cx+10*Math.cos(ang),ly=cy+10*Math.sin(ang);const dir=c.q>0?1:-1;
        ctx.beginPath();ctx.moveTo(lx,ly);
        ctx.strokeStyle=c.q>0?'rgba(239,100,100,0.35)':'rgba(100,150,240,0.35)';ctx.lineWidth=1;
        for(let s=0;s<500;s++){
          const[Ex,Ey]=eField(lx,ly);const Em=Math.sqrt(Ex*Ex+Ey*Ey);if(Em<1e-6)break;
          lx+=dir*3*Ex/Em;ly+=dir*3*Ey/Em;
          if(lx<0||lx>canvasW||ly<0||ly>canvasH)break;
          let hit=false;for(const c2 of state.charges){if(c2!==c&&Math.sqrt((lx-c2.x*canvasW)**2+(ly-c2.y*canvasH)**2)<10){hit=true;break;}}
          ctx.lineTo(lx,ly);if(hit)break;
        }
        ctx.stroke();
      }
    }
  }

  // E-vector grid
  if(state.showVectorGrid){
    const gs=45;
    for(let gx=gs;gx<canvasW;gx+=gs){for(let gy=gs;gy<canvasH;gy+=gs){
      const[Ex,Ey]=eField(gx,gy);const Em=Math.sqrt(Ex*Ex+Ey*Ey);if(Em<1e-8)continue;
      const ll=Math.min(Math.log(Em+1)*8,gs*0.7);const dx=Ex/Em*ll,dy=Ey/Em*ll;
      const t=Math.min(Math.log(Em+1)/5,1);
      ctx.strokeStyle=`rgba(${Math.round(80+t*160)},${Math.round(140-t*80)},${Math.round(230-t*160)},0.4)`;
      ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(gx-dx/2,gy-dy/2);ctx.lineTo(gx+dx/2,gy+dy/2);ctx.stroke();
      const a=Math.atan2(dy,dx);ctx.beginPath();ctx.moveTo(gx+dx/2,gy+dy/2);
      ctx.lineTo(gx+dx/2-4*Math.cos(a-0.4),gy+dy/2-4*Math.sin(a-0.4));
      ctx.moveTo(gx+dx/2,gy+dy/2);ctx.lineTo(gx+dx/2-4*Math.cos(a+0.4),gy+dy/2-4*Math.sin(a+0.4));ctx.stroke();
    }}
  }

  // B-field
  if(state.showBField&&state.wires.length>0){
    const gs=40;for(let gx=gs;gx<canvasW;gx+=gs){for(let gy=gs;gy<canvasH;gy+=gs){
      const Bz=bField(gx,gy);if(Math.abs(Bz)<1e-6)continue;const sz=Math.min(Math.abs(Bz)*3,8);
      if(Bz>0){ctx.fillStyle='rgba(16,185,129,0.5)';ctx.beginPath();ctx.arc(gx,gy,sz,0,2*Math.PI);ctx.fill();}
      else{ctx.strokeStyle='rgba(16,185,129,0.4)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(gx-sz,gy-sz);ctx.lineTo(gx+sz,gy+sz);ctx.moveTo(gx+sz,gy-sz);ctx.lineTo(gx-sz,gy+sz);ctx.stroke();}
    }}
  }

  // Charges — clean scientific style
  for(const c of state.charges){
    const cx=c.x*canvasW,cy=c.y*canvasH;
    // Subtle glow
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,22);
    glow.addColorStop(0,c.q>0?'rgba(239,100,100,0.15)':'rgba(100,150,240,0.15)');glow.addColorStop(1,'transparent');
    ctx.fillStyle=glow;ctx.fillRect(cx-22,cy-22,44,44);
    // Circle
    ctx.beginPath();ctx.arc(cx,cy,11,0,2*Math.PI);
    ctx.fillStyle=c.q>0?'#dc2626':'#2563eb';ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.stroke();
    // Label
    ctx.fillStyle='#fff';ctx.font='600 10px IBM Plex Mono';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(c.q>0?`+${c.q}`:`${c.q}`,cx,cy);ctx.textBaseline='alphabetic';
  }

  // Wires
  for(const w of state.wires){
    const wx=w.x*canvasW,wy=w.y*canvasH;
    ctx.beginPath();ctx.arc(wx,wy,8,0,2*Math.PI);ctx.fillStyle='#d97706';ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='600 9px IBM Plex Mono';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('I',wx,wy);ctx.textBaseline='alphabetic';
    ctx.fillStyle='#d97706';ctx.font='9px IBM Plex Mono';ctx.fillText(`${w.I.toFixed(1)}A`,wx,wy-14);
  }

  updateMetric('m-obj',`${state.charges.length}q, ${state.wires.length}I`);
  updateMetric('m-net',`${state.charges.reduce((s,c)=>s+c.q,0)}e`);
  formulaBar.textContent='E(r) = Σ kq(r−rᵢ)/|r−rᵢ|³  ·  V(r) = Σ kq/|r−rᵢ|  ·  B = μ₀I/2πd  ·  Φ_E = ΣQ/ε₀';
}
render();
