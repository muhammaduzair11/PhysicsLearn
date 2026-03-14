import './styles/index.css';

const diagrams = [
  {
    id: 'ph01',
    code: 'PH-01',
    title: 'Wave Interference Bench',
    desc: 'Explore the principle of superposition with coherent point sources. Watch constructive and destructive fringes emerge in real time.',
    discipline: 'Physics',
    tags: ['Superposition', 'Young\'s Experiment', 'WebGL'],
    accent: 'var(--pl-physics)',
    glow: 'var(--pl-physics-glow)',
  },
  {
    id: 'ph02',
    code: 'PH-02',
    title: 'Electromagnetic Field Visualiser',
    desc: 'Place charges and wires, then observe electric field lines, equipotential contours, and magnetic field vectors.',
    discipline: 'Physics',
    tags: ['Coulomb\'s Law', 'Gauss\'s Law', 'Vector Fields'],
    accent: 'var(--pl-physics)',
    glow: 'var(--pl-physics-glow)',
  },
  {
    id: 'ch01',
    code: 'CH-01',
    title: 'pH Titration Curve Simulator',
    desc: 'Perform a virtual acid-base titration. Discover buffer regions, equivalence-point jumps, and indicator colour transitions.',
    discipline: 'Chemistry',
    tags: ['Henderson–Hasselbalch', 'Equilibrium', 'Indicators'],
    accent: 'var(--pl-chemistry)',
    glow: 'var(--pl-chemistry-glow)',
  },
  {
    id: 'ch02',
    code: 'CH-02',
    title: 'Reaction Energy Diagram',
    desc: 'Reshape a potential energy surface. Drag energy levels to see activation energy, enthalpy, and Arrhenius rate constants update live.',
    discipline: 'Chemistry',
    tags: ['Arrhenius', 'Activation Energy', 'Catalysis'],
    accent: 'var(--pl-chemistry)',
    glow: 'var(--pl-chemistry-glow)',
  },
  {
    id: 'bi01',
    code: 'BI-01',
    title: 'Predator–Prey Population Dynamics',
    desc: 'Tune ecological parameters and watch predator-prey populations oscillate. Explore time-series and phase portraits side by side.',
    discipline: 'Biology',
    tags: ['Lotka–Volterra', 'RK4', 'Phase Portrait'],
    accent: 'var(--pl-biology)',
    glow: 'var(--pl-biology-glow)',
  },
  {
    id: 'bi02',
    code: 'BI-02',
    title: 'Action Potential Simulator',
    desc: 'Simulate a neuron\'s action potential with the full Hodgkin-Huxley conductance model. Visualise ion channel gating dynamics.',
    discipline: 'Biology',
    tags: ['Hodgkin–Huxley', 'Ion Channels', 'RK4'],
    accent: 'var(--pl-biology)',
    glow: 'var(--pl-biology-glow)',
  },
];

const grid = document.getElementById('diagram-grid');

diagrams.forEach((d, i) => {
  const card = document.createElement('a');
  card.href = `/diagrams/${d.id}/`;
  card.className = 'diagram-card';
  card.style.setProperty('--card-accent', d.accent);
  card.style.setProperty('--card-glow', d.glow);
  card.style.animationDelay = `${i * 80}ms`;

  card.innerHTML = `
    <div class="card-badge"><span class="dot"></span>${d.discipline} · ${d.code}</div>
    <h3>${d.title}</h3>
    <p>${d.desc}</p>
    <div class="card-tags">
      ${d.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}
    </div>
  `;

  grid.appendChild(card);
});
