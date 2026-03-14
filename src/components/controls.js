/**
 * Shared UI Control Components
 * Sliders, buttons, toggles, formula panel, and metrics strip.
 */

/**
 * Create a labeled slider with live numeric readout.
 *
 * @param {Object} opts
 * @param {string} opts.id - unique slider id
 * @param {string} opts.label - display label
 * @param {number} opts.min
 * @param {number} opts.max
 * @param {number} opts.step
 * @param {number} opts.value - default value
 * @param {string} [opts.unit] - unit suffix (e.g. 'nm', 'K')
 * @param {Function} [opts.onChange] - callback(value)
 * @param {number} [opts.decimals] - decimal places for display
 * @returns {HTMLElement}
 */
export function createSlider(opts) {
  const group = document.createElement('div');
  group.className = 'slider-group';

  const header = document.createElement('div');
  header.className = 'slider-header';

  const label = document.createElement('label');
  label.className = 'slider-label';
  label.htmlFor = opts.id;
  label.textContent = opts.label;

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'slider-value';
  valueDisplay.id = `${opts.id}-value`;
  const dec = opts.decimals ?? 2;
  valueDisplay.textContent = `${Number(opts.value).toFixed(dec)}${opts.unit ? ' ' + opts.unit : ''}`;

  header.appendChild(label);
  header.appendChild(valueDisplay);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = opts.id;
  input.min = opts.min;
  input.max = opts.max;
  input.step = opts.step;
  input.value = opts.value;
  input.setAttribute('aria-label', opts.label);
  input.setAttribute('aria-valuemin', opts.min);
  input.setAttribute('aria-valuemax', opts.max);
  input.setAttribute('aria-valuenow', opts.value);

  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valueDisplay.textContent = `${v.toFixed(dec)}${opts.unit ? ' ' + opts.unit : ''}`;
    input.setAttribute('aria-valuenow', v);
    if (opts.onChange) opts.onChange(v);
  });

  group.appendChild(header);
  group.appendChild(input);
  return group;
}

/**
 * Create a control section with title.
 */
export function createSection(title) {
  const section = document.createElement('div');
  section.className = 'control-section';

  const titleEl = document.createElement('div');
  titleEl.className = 'control-section-title';
  titleEl.textContent = title;
  section.appendChild(titleEl);

  return section;
}

/**
 * Create a toggle button.
 */
export function createToggle(label, active = false, onChange = null) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm toggle-btn' + (active ? ' active' : '');
  btn.textContent = label;
  btn.setAttribute('aria-pressed', active);

  btn.addEventListener('click', () => {
    const isActive = btn.classList.toggle('active');
    btn.setAttribute('aria-pressed', isActive);
    if (onChange) onChange(isActive);
  });

  return btn;
}

/**
 * Create a reset button.
 */
export function createResetButton(onClick) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.innerHTML = '↻ Reset';
  btn.setAttribute('aria-label', 'Reset to default values');
  btn.addEventListener('click', onClick);
  return btn;
}

/**
 * Create the formula bar element.
 */
export function createFormulaBar() {
  const bar = document.createElement('div');
  bar.className = 'formula-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Governing equation');
  return bar;
}

/**
 * Create the metrics strip.
 * @param {Array<{label: string, id: string}>} metrics
 */
export function createMetricsStrip(metrics) {
  const strip = document.createElement('div');
  strip.className = 'metrics-strip';

  for (const m of metrics) {
    const item = document.createElement('div');
    item.className = 'metric-item';
    item.innerHTML = `
      <span class="metric-label">${m.label}:</span>
      <span class="metric-value" id="${m.id}">—</span>
    `;
    strip.appendChild(item);
  }

  return strip;
}

/**
 * Update a metric value by id.
 */
export function updateMetric(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Create a button group (flex container for toggles).
 */
export function createButtonGroup(buttons) {
  const group = document.createElement('div');
  group.style.display = 'flex';
  group.style.gap = '6px';
  group.style.flexWrap = 'wrap';
  buttons.forEach(b => group.appendChild(b));
  return group;
}

/**
 * Create back-to-home link.
 */
export function createBackLink() {
  const a = document.createElement('a');
  a.href = '/';
  a.className = 'back-btn';
  a.innerHTML = '← Home';
  return a;
}

/**
 * Create high-contrast toggle for accessibility.
 */
export function createHighContrastToggle() {
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-icon';
  btn.innerHTML = '◑';
  btn.setAttribute('aria-label', 'Toggle high contrast mode');
  btn.title = 'High contrast mode';
  
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-high-contrast');
    document.documentElement.setAttribute('data-high-contrast', current === 'true' ? 'false' : 'true');
  });

  return btn;
}

/**
 * Standard diagram header.
 */
export function createDiagramHeader(title) {
  const header = document.createElement('header');
  header.className = 'diagram-header';

  header.appendChild(createBackLink());

  const titleEl = document.createElement('h1');
  titleEl.className = 'diagram-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const tools = document.createElement('div');
  tools.className = 'header-tools';
  tools.appendChild(createHighContrastToggle());
  header.appendChild(tools);

  return header;
}
