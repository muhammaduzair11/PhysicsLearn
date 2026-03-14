/**
 * Classical 4th-order Runge-Kutta (RK4) Integrator
 * with adaptive step-size control.
 *
 * Used by: BI-01 (Lotka-Volterra), BI-02 (Hodgkin-Huxley),
 *          and any ODE-based simulation.
 */

/**
 * Single RK4 step for a system of ODEs.
 *
 * @param {Function} f - derivative function f(t, y) => dy/dt array
 * @param {number} t - current time
 * @param {number[]} y - current state vector
 * @param {number} h - step size
 * @returns {number[]} new state vector at t+h
 */
export function rk4Step(f, t, y, h) {
  const n = y.length;
  const k1 = f(t, y);
  
  const y2 = new Array(n);
  for (let i = 0; i < n; i++) y2[i] = y[i] + 0.5 * h * k1[i];
  const k2 = f(t + 0.5 * h, y2);
  
  const y3 = new Array(n);
  for (let i = 0; i < n; i++) y3[i] = y[i] + 0.5 * h * k2[i];
  const k3 = f(t + 0.5 * h, y3);
  
  const y4 = new Array(n);
  for (let i = 0; i < n; i++) y4[i] = y[i] + h * k3[i];
  const k4 = f(t + h, y4);
  
  const yNew = new Array(n);
  for (let i = 0; i < n; i++) {
    yNew[i] = y[i] + (h / 6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]);
  }
  return yNew;
}

/**
 * Integrate from t0 to tEnd using RK4 with fixed step size.
 *
 * @param {Function} f - derivative function
 * @param {number} t0 - start time
 * @param {number[]} y0 - initial state
 * @param {number} tEnd - end time
 * @param {number} dt - step size
 * @returns {{ t: number[], y: number[][] }} time array and state history
 */
export function rk4Integrate(f, t0, y0, tEnd, dt) {
  const times = [t0];
  const states = [y0.slice()];
  let t = t0;
  let y = y0.slice();

  while (t < tEnd - 1e-12) {
    const h = Math.min(dt, tEnd - t);
    y = rk4Step(f, t, y, h);
    t += h;
    times.push(t);
    states.push(y.slice());
  }

  return { t: times, y: states };
}

/**
 * RK4 with adaptive step-size control (RK4-5 embedded pair approximation).
 * Uses step-doubling to estimate error.
 *
 * @param {Function} f - derivative function
 * @param {number} t0 - start time
 * @param {number[]} y0 - initial state
 * @param {number} tEnd - end time
 * @param {number} dtInitial - initial step size
 * @param {number} tol - local truncation error tolerance (default: 1e-6)
 * @returns {{ t: number[], y: number[][] }}
 */
export function rk4Adaptive(f, t0, y0, tEnd, dtInitial, tol = 1e-6) {
  const times = [t0];
  const states = [y0.slice()];
  let t = t0;
  let y = y0.slice();
  let dt = dtInitial;
  const dtMin = dtInitial * 0.001;
  const dtMax = dtInitial * 10;

  while (t < tEnd - 1e-12) {
    dt = Math.min(dt, tEnd - t);

    // Full step
    const yFull = rk4Step(f, t, y, dt);

    // Two half steps
    const yHalf1 = rk4Step(f, t, y, dt / 2);
    const yHalf2 = rk4Step(f, t + dt / 2, yHalf1, dt / 2);

    // Error estimate
    let err = 0;
    for (let i = 0; i < y.length; i++) {
      const diff = Math.abs(yHalf2[i] - yFull[i]);
      const scale = Math.max(Math.abs(y[i]), 1e-10);
      err = Math.max(err, diff / scale);
    }
    err /= 16; // RK4 is O(h^5), so error ≈ diff/16

    if (err <= tol || dt <= dtMin) {
      // Accept step (use the more accurate estimate)
      t += dt;
      y = yHalf2.slice();
      times.push(t);
      states.push(y.slice());

      // Grow step size
      if (err > 0) {
        dt = Math.min(dt * Math.pow(tol / err, 0.2) * 0.9, dtMax);
      } else {
        dt = Math.min(dt * 2, dtMax);
      }
    } else {
      // Reject and shrink
      dt = Math.max(dt * Math.pow(tol / err, 0.25) * 0.9, dtMin);
    }
  }

  return { t: times, y: states };
}
