// React Bits components (reactbits.dev), ported from React to plain JS for this site:
// SpecularButton, MagicBento, LineSidebar, AnimatedList and SlideCommit.
// The visual logic (shaders, springs, light maths) follows the originals; the React
// wrappers are replaced with functions that attach to markup already in the page.
(() => {
  const RB = (window.RB = {});
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPRING_SUPPORTED = CSS.supports?.("transition-timing-function", "linear(0, 1)");

  /* ------------------------------------------------------------------ *
   * SpecularButton: a light that runs along the button's edge toward
   * the cursor. Port of React Bits' SpecularButton (WebGL2).
   * ------------------------------------------------------------------ */
  const SB_PAD = 24;
  const TAU = Math.PI * 2;
  const SB_VERTEX = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;
  const SB_FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uCenter; uniform vec2 uHalf; uniform float uRadius; uniform float uPx; uniform float uSpot;
uniform vec2 uEntry; uniform vec3 uLineColor; uniform vec3 uBaseColor; uniform float uIntensity;
uniform vec2 uWindow; uniform float uThickness; uniform float uGlow;
out vec4 outColor;
float roundedBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float loopPosition(vec2 p, vec2 b, float r) {
  vec2 inner = b - r; float arc = 1.5707963 * r; float quarter = inner.x + inner.y + arc;
  vec2 a = abs(p); vec2 q = a - inner;
  float s = q.x > 0.0 && q.y > 0.0 ? inner.y + atan(q.y, q.x) * r
    : (q.x > q.y ? min(a.y, inner.y) : inner.y + arc + inner.x - min(a.x, inner.x));
  if (p.x < 0.0) s = p.y >= 0.0 ? 2.0 * quarter - s : 2.0 * quarter + s;
  else if (p.y < 0.0) s = 4.0 * quarter - s;
  return s / max(4.0 * quarter, 0.0001);
}
float lobe(float position, float center) { float gap = abs(fract(position - center + 0.5) - 0.5); return 1.0 - smoothstep(uWindow.x, uWindow.x + uWindow.y, gap); }
void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = roundedBox(p, uHalf, uRadius);
  float position = loopPosition(p, uHalf, uRadius);
  float key = lobe(position, uSpot); float back = lobe(position, uSpot + 0.5);
  float streak = key + back * 0.45;
  float width = max(uThickness * uPx * mix(1.0, max(key, back), 0.6), 0.35);
  float band = smoothstep(-width - 0.6, -width + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float hair = smoothstep(-uPx - 0.6, -uPx + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  vec2 pool = (p - uEntry) / (uHalf.y * vec2(1.6, 1.1));
  float glow = streak * 0.2 * exp(-abs(d + width * 0.5) / (5.0 * uPx)) + inside * 0.08 * exp(-dot(pool, pool));
  float light = clamp((band * streak + glow * uGlow) * uIntensity, 0.0, 1.0);
  vec4 base = vec4(uBaseColor, 1.0) * hair * 0.6;
  outColor = vec4(uLineColor, 1.0) * light + base * (1.0 - light);
}`;
  const SB_UNIFORMS = ["uCenter", "uHalf", "uRadius", "uPx", "uSpot", "uEntry", "uLineColor", "uBaseColor", "uIntensity", "uWindow", "uThickness", "uGlow"];
  const wrap = v => v - Math.floor(v);
  const loopPosition = (x, y, halfX, halfY, r) => {
    const innerX = halfX - r, innerY = halfY - r, arc = (Math.PI / 2) * r, quarter = innerX + innerY + arc;
    const ax = Math.abs(x), ay = Math.abs(y), qx = ax - innerX, qy = ay - innerY;
    let s;
    if (qx > 0 && qy > 0) s = innerY + Math.atan2(qy, qx) * r;
    else if (qx > qy) s = Math.min(ay, innerY);
    else s = innerY + arc + innerX - Math.min(ax, innerX);
    if (x < 0) s = y >= 0 ? 2 * quarter - s : 2 * quarter + s;
    else if (y < 0) s = 4 * quarter - s;
    return wrap(s / Math.max(4 * quarter, 0.0001));
  };
  const rimPoint = (position, halfX, halfY, r) => {
    const innerX = halfX - r, innerY = halfY - r, arc = (Math.PI / 2) * r, quarter = innerX + innerY + arc;
    let s = wrap(position) * 4 * quarter, signX = 1, signY = 1;
    if (s > 3 * quarter) { s = 4 * quarter - s; signY = -1; }
    else if (s > 2 * quarter) { s -= 2 * quarter; signX = -1; signY = -1; }
    else if (s > quarter) { s = 2 * quarter - s; signX = -1; }
    let x = innerX - (s - innerY - arc), y = halfY;
    if (s <= innerY) { x = halfX; y = s; }
    else if (s <= innerY + arc) { const a = (s - innerY) / Math.max(r, 0.0001); x = innerX + Math.cos(a) * r; y = innerY + Math.sin(a) * r; }
    return [x * signX, y * signY];
  };
  const glCompile = (gl, type, src) => { const s = gl.createShader(type); if (!s) return null; gl.shaderSource(s, src); gl.compileShader(s); if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s; gl.deleteShader(s); return null; };
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgbCache = new Map();
  const toRgb = value => {
    if (rgbCache.has(value)) return rgbCache.get(value);
    probe.clearRect(0, 0, 1, 1); probe.fillStyle = "#000"; probe.fillStyle = value; probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data; const rgb = [r / 255, g / 255, b / 255];
    rgbCache.set(value, rgb); return rgb;
  };

  RB.specular = (button, o = {}) => {
    const s = {
      radius: o.radius ?? 10, lineColor: o.lineColor ?? "#E8E0FF", baseColor: o.baseColor ?? "#8E72F0",
      intensity: o.intensity ?? 1, idleIntensity: o.idleIntensity ?? 0.35, shineSize: o.shineSize ?? 10, shineFade: o.shineFade ?? 34,
      thickness: o.thickness ?? 1.2, glow: o.glow ?? 1, speed: o.speed ?? 0.35, followMouse: o.followMouse ?? true,
      proximity: o.proximity ?? 250, autoAnimate: o.autoAnimate ?? false
    };
    button.classList.add("specular-button");
    button.style.setProperty("--sb-radius", `${s.radius}px`);
    const label = document.createElement("span"); label.className = "specular-button__label";
    while (button.firstChild) label.append(button.firstChild);
    const canvas = document.createElement("canvas"); canvas.className = "specular-button__light"; canvas.setAttribute("aria-hidden", "true");
    button.append(canvas, label);
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return;
    const vs = glCompile(gl, gl.VERTEX_SHADER, SB_VERTEX), fs = glCompile(gl, gl.FRAGMENT_SHADER, SB_FRAGMENT);
    const program = gl.createProgram(); if (!vs || !fs || !program) return;
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.bindAttribLocation(program, 0, "aPosition"); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    const u = {}; SB_UNIFORMS.forEach(n => (u[n] = gl.getUniformLocation(program, n)));
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    const reduce = reduced();
    const view = { width: 1, height: 1, ratio: 1 }, pointer = { x: 0, y: 0, known: false }, state = { spot: 0, level: 0, press: 0, ready: false };
    let raf = 0, last = 0, visible = true;
    const cornerRadius = () => Math.min(s.radius, view.width / 2, view.height / 2);
    const restSpot = () => { const r = cornerRadius(), inset = r * (1 - Math.SQRT1_2); return loopPosition(inset - view.width / 2, view.height / 2 - inset, view.width / 2, view.height / 2, r); };
    const aim = () => {
      if (!s.followMouse || button.disabled || !pointer.known) return null;
      const rect = button.getBoundingClientRect(), scale = rect.width / view.width || 1, halfX = view.width / 2, halfY = view.height / 2;
      const x = (pointer.x - rect.left - rect.width / 2) / scale, y = (rect.top + rect.height / 2 - pointer.y) / scale;
      const distance = Math.hypot(Math.max(Math.abs(x) - halfX, 0), Math.max(Math.abs(y) - halfY, 0));
      const t = clamp(1 - distance / s.proximity, 0, 1), near = t * t * (3 - 2 * t);
      const nearest = loopPosition(x, y, halfX, halfY, cornerRadius());
      if (distance > 0) return { spot: nearest, near };
      const depth = clamp(Math.min(halfX - Math.abs(x), halfY - Math.abs(y)) / (halfY * 0.8), 0, 1);
      const sway = restSpot() - (x / halfX) * 0.06 - (y / halfY) * 0.02;
      const offset = sway - nearest - Math.round(sway - nearest);
      return { spot: wrap(nearest + offset * depth * depth * (3 - 2 * depth)), near };
    };
    const draw = () => {
      const { width, height } = view, scaleX = canvas.width / (width + SB_PAD * 2), scaleY = canvas.height / (height + SB_PAD * 2);
      gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(program);
      gl.uniform2f(u.uCenter, (SB_PAD + width / 2) * scaleX, (SB_PAD + height / 2) * scaleY);
      gl.uniform2f(u.uHalf, (width / 2) * scaleX, (height / 2) * scaleY);
      const r = Math.min(s.radius, width / 2, height / 2);
      gl.uniform1f(u.uRadius, r * scaleX); gl.uniform1f(u.uPx, view.ratio);
      const [rimX, rimY] = rimPoint(state.spot, width / 2, height / 2, r);
      const pull = 1 - Math.min(0.35 * (height / 2), Math.hypot(rimX, rimY)) / Math.max(Math.hypot(rimX, rimY), 0.0001);
      gl.uniform1f(u.uSpot, state.spot); gl.uniform2f(u.uEntry, rimX * pull * scaleX, rimY * pull * scaleY);
      gl.uniform3fv(u.uLineColor, toRgb(s.lineColor)); gl.uniform3fv(u.uBaseColor, toRgb(s.baseColor));
      gl.uniform1f(u.uIntensity, s.intensity * (state.level + state.press * 0.8));
      gl.uniform2f(u.uWindow, s.shineSize / 360 + state.press * 0.06, s.shineFade / 360 + 0.0001);
      gl.uniform1f(u.uThickness, s.thickness); gl.uniform1f(u.uGlow, s.glow);
      gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
    };
    const frame = now => {
      raf = 0; if (!visible) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
      const target = aim(), spinning = s.autoAnimate && !reduce, steering = !!target && target.near > 0;
      if (!state.ready) { state.spot = restSpot(); state.level = s.autoAnimate ? 1 : s.idleIntensity; state.ready = true; }
      let diff = 0;
      if (spinning && !steering) state.spot = wrap(state.spot + (s.speed / TAU) * dt);
      else { diff = (steering ? target.spot : restSpot()) - state.spot; diff -= Math.round(diff); state.spot = wrap(state.spot + diff * (1 - Math.exp(-dt * 8))); }
      const level = s.autoAnimate ? 1 : s.idleIntensity + (1 - s.idleIntensity) * (target ? target.near : 0);
      state.level += (level - state.level) * (1 - Math.exp(-dt * 7)); state.press *= Math.exp(-dt * 5);
      draw();
      const settling = Math.abs(diff) > 0.0002 || Math.abs(level - state.level) > 0.001 || state.press > 0.002;
      if (settling || (spinning && !steering)) raf = requestAnimationFrame(frame); else last = 0;
    };
    const wake = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
    const measure = () => {
      view.width = Math.max(1, button.offsetWidth); view.height = Math.max(1, button.offsetHeight); view.ratio = Math.min(devicePixelRatio || 1, 3);
      canvas.width = Math.max(1, Math.round((view.width + SB_PAD * 2) * view.ratio)); canvas.height = Math.max(1, Math.round((view.height + SB_PAD * 2) * view.ratio));
      if (state.ready) draw(); wake();
    };
    addEventListener("pointermove", e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.known = true; wake(); }, { passive: true });
    const end = e => { if (e.pointerType === "mouse") return; pointer.known = false; wake(); };
    addEventListener("pointerup", end, { passive: true }); addEventListener("pointercancel", end, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { pointer.known = false; wake(); });
    button.addEventListener("pointerdown", e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.known = true; if (!button.disabled) state.press = 1; wake(); });
    new ResizeObserver(measure).observe(button);
    new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) { last = 0; wake(); } }).observe(button);
    measure();
  };

  /* ------------------------------------------------------------------ *
   * MagicBento: border glow that follows the cursor across cards, a
   * spotlight inside the hovered card, a click wave and a staggered intro.
   * ------------------------------------------------------------------ */
  RB.bento = (root, o = {}) => {
    const glow = o.glow ?? "168, 139, 250";
    root.style.setProperty("--mb-glow-rgb", glow);
    root.style.setProperty("--mb-spot-size", `${o.spotlightRadius ?? 300}px`);
    root.style.setProperty("--mb-border-size", `${Math.round((o.spotlightRadius ?? 300) * 0.75)}px`);
    const cells = [...root.querySelectorAll(".magic-bento__cell")];
    const cards = cells.map(c => c.querySelector(".magic-bento__card"));
    const motion = !reduced();
    if (motion) root.dataset.intro = "";
    const pointer = { x: -1e5, y: -1e5, inside: false, down: -1 };
    const light = { x: -1e5, y: -1e5, near: 0, ready: false };
    const wave = { x: 0, y: 0, t: -1, duration: 1.1, reach: 800 };
    const states = cards.map(() => ({ hot: 0, press: 1, vpress: 0, active: false, written: {} }));
    let rects = [], bounds = null, dirty = true, raf = 0, last = 0, visible = true, entered = !motion;
    const write = (el, st, k, v) => { if (st.written[k] === v) return; st.written[k] = v; el.style.setProperty(k, v); };
    const measure = () => { dirty = false; bounds = root.getBoundingClientRect(); rects = cells.map(c => c.getBoundingClientRect()); };
    const startWave = (x, y, duration) => {
      if (!motion || !bounds) return;
      Object.assign(wave, { x, y, t: 0, duration });
      wave.reach = Math.max(Math.hypot(x - bounds.left, y - bounds.top), Math.hypot(x - bounds.right, y - bounds.top),
        Math.hypot(x - bounds.left, y - bounds.bottom), Math.hypot(x - bounds.right, y - bounds.bottom)) + 140;
    };
    const frame = now => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      if (dirty) measure();
      let busy = false;
      const margin = (o.spotlightRadius ?? 300) * 0.5;
      const near = pointer.inside && bounds && pointer.x > bounds.left - margin && pointer.x < bounds.right + margin &&
        pointer.y > bounds.top - margin && pointer.y < bounds.bottom + margin ? 1 : 0;
      if (!light.ready && near) { light.x = pointer.x; light.y = pointer.y; light.ready = true; }
      const follow = 1 - Math.exp(-dt / 0.05);
      light.x += (pointer.x - light.x) * follow; light.y += (pointer.y - light.y) * follow;
      light.near += (near - light.near) * (1 - Math.exp(-dt / (near > light.near ? 0.12 : 0.4)));
      if (Math.abs(near - light.near) < 0.002) light.near = near; else busy = true;
      if (Math.abs(pointer.x - light.x) + Math.abs(pointer.y - light.y) > 0.3) busy = true;
      let wr = 0, wa = 0;
      if (wave.t >= 0) {
        wave.t += dt; const p = Math.min(1, wave.t / wave.duration);
        wr = wave.reach * (1 - Math.pow(1 - p, 2.2)); wa = Math.pow(1 - p, 1.3);
        if (p >= 1) { wave.t = -1; wa = 0; } else busy = true;
      }
      cards.forEach((card, i) => {
        const rect = rects[i]; if (!rect) return;
        const st = states[i];
        const lx = light.x - rect.left, ly = light.y - rect.top, px = pointer.x - rect.left, py = pointer.y - rect.top;
        const inside = pointer.inside && entered && px >= 0 && py >= 0 && px <= rect.width && py <= rect.height;
        if (inside !== st.active) { st.active = inside; if (inside) card.dataset.active = ""; else delete card.dataset.active; }
        const hotT = inside ? 1 : 0;
        st.hot += (hotT - st.hot) * (1 - Math.exp(-dt / (hotT > st.hot ? 0.14 : 0.32)));
        if (Math.abs(hotT - st.hot) < 0.002) st.hot = hotT; else busy = true;
        const pressT = pointer.down === i && motion ? 0.985 : 1;
        const steps = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / steps;
        for (let k = 0; k < steps; k++) { st.vpress += (420 * (pressT - st.press) - 28 * st.vpress) * h; st.press += st.vpress * h; }
        if (Math.abs(pressT - st.press) < 0.0002 && Math.abs(st.vpress) < 0.001) { st.press = pressT; st.vpress = 0; } else busy = true;
        write(card, st, "--mb-x", `${lx.toFixed(1)}px`); write(card, st, "--mb-y", `${ly.toFixed(1)}px`);
        write(card, st, "--mb-near", light.near.toFixed(3)); write(card, st, "--mb-hot", st.hot.toFixed(3));
        write(card, st, "--mb-press", st.press.toFixed(4));
        write(card, st, "--mb-wx", `${(wave.x - rect.left).toFixed(1)}px`); write(card, st, "--mb-wy", `${(wave.y - rect.top).toFixed(1)}px`);
        write(card, st, "--mb-wr", `${wr.toFixed(1)}px`); write(card, st, "--mb-wa", wa.toFixed(3));
      });
      if (busy && visible) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (raf || !visible) return; last = performance.now(); raf = requestAnimationFrame(frame); };
    const cardIndex = t => { const c = t instanceof Element && t.closest(".magic-bento__card"); return c ? cards.indexOf(c) : -1; };
    addEventListener("pointermove", e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true; wake(); }, { passive: true });
    addEventListener("pointerdown", e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true; pointer.down = cardIndex(e.target); wake(); }, { passive: true });
    const release = () => { if (pointer.down < 0) return; pointer.down = -1; wake(); };
    addEventListener("pointerup", release, { passive: true }); addEventListener("pointercancel", release, { passive: true });
    document.addEventListener("pointerout", e => { if (e.relatedTarget) return; pointer.inside = false; pointer.down = -1; wake(); });
    root.addEventListener("click", e => { const i = cardIndex(e.target); if (i < 0) return; if (dirty) measure(); startWave(e.clientX, e.clientY, 1.1); wake(); });
    addEventListener("scroll", () => { dirty = true; wake(); }, { passive: true, capture: true });
    addEventListener("resize", () => { dirty = true; wake(); }, { passive: true });
    new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) { dirty = true; wake(); } }).observe(root);
    const enter = () => {
      entered = true;
      cells.forEach((c, i) => { c.style.setProperty("--mb-delay", `${i * 80}ms`); c.dataset.state = "in"; });
      if (dirty) measure();
      setTimeout(() => { if (bounds) startWave(bounds.left, bounds.top, 1.7); wake(); }, 260);
      setTimeout(() => cells.forEach(c => c.style.setProperty("--mb-delay", "0ms")), cells.length * 80 + 2600);
      wake();
    };
    if (motion) new IntersectionObserver((es, ob) => { if (!es.some(e => e.isIntersecting)) return; ob.disconnect(); enter(); }, { threshold: 0.15 }).observe(root);
    else cells.forEach(c => (c.dataset.state = "in"));
  };

  /* ------------------------------------------------------------------ *
   * LineSidebar: labels slide and light up as the cursor gets close.
   * ------------------------------------------------------------------ */
  RB.lineSidebar = (nav, o = {}) => {
    const list = nav.querySelector(".line-sidebar__list");
    const items = [...nav.querySelectorAll(".line-sidebar__item")];
    const radius = o.proximityRadius ?? 100, smoothing = o.smoothing ?? 100;
    const ease = p => p * p * (3 - 2 * p);
    const targets = items.map(() => 0), current = items.map(() => 0);
    let active = o.defaultActive ?? null, raf = null, last = 0;
    const run = now => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const k = 1 - Math.exp(-dt / (Math.max(smoothing, 1) / 1000));
      let moving = false;
      items.forEach((el, i) => {
        const target = Math.max(targets[i], active === i ? 1 : 0);
        const next = current[i] + (target - current[i]) * k;
        const settled = Math.abs(target - next) < 0.0015;
        current[i] = settled ? target : next;
        el.style.setProperty("--effect", current[i].toFixed(4));
        if (!settled) moving = true;
      });
      raf = moving ? requestAnimationFrame(run) : null;
    };
    const start = () => { if (raf != null) cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(run); };
    list.addEventListener("pointermove", e => {
      const y = e.clientY - list.getBoundingClientRect().top;
      items.forEach((el, i) => { targets[i] = ease(Math.max(0, 1 - Math.abs(y - (el.offsetTop + el.offsetHeight / 2)) / radius)); });
      start();
    });
    list.addEventListener("pointerleave", () => { targets.fill(0); start(); });
    items.forEach((el, i) => {
      el.tabIndex = 0;
      const go = () => { api.setActive(i); o.onItemClick && o.onItemClick(i); };
      el.addEventListener("click", go);
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    const api = {
      setActive(i) {
        if (active === i) return;
        active = i;
        items.forEach((el, j) => (j === i ? el.setAttribute("aria-current", "step") : el.removeAttribute("aria-current")));
        start();
      }
    };
    if (active != null) { const a = active; active = null; api.setActive(a); } else start();
    return api;
  };

  /* ------------------------------------------------------------------ *
   * AnimatedList: rows pop in as they scroll into view, and a selection
   * ring springs between rows on hover or arrow keys.
   * ------------------------------------------------------------------ */
  const HIDDEN = {
    pop: { above: "translate3d(0, -12px, 0) scale(0.8)", below: "translate3d(0, 12px, 0) scale(0.8)" },
    slide: { above: "translate3d(0, -28px, 0) scale(0.98)", below: "translate3d(0, 28px, 0) scale(0.98)" },
    fade: { above: "translate3d(0, -4px, 0)", below: "translate3d(0, 4px, 0)" }
  };
  const AL_SPRING = SPRING_SUPPORTED
    ? "linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)"
    : "cubic-bezier(0.34, 1.4, 0.64, 1)";
  RB.animatedList = (root, o = {}) => {
    const track = root.querySelector(".animated-list__track");
    const rows = [...root.querySelectorAll(".animated-list__item")];
    const ring = document.createElement("div"); ring.className = "animated-list__indicator"; ring.setAttribute("aria-hidden", "true");
    ring.innerHTML = '<div class="animated-list__ring"></div>';
    track.prepend(ring);
    const mode = reduced() ? "fade" : (o.animation || "pop");
    const stagger = o.stagger ?? 0.05;
    const transition = `transform 620ms ${AL_SPRING}, opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)`;
    root.dataset.animated = "";
    let order = 0;
    rows.forEach(row => { row.style.transform = HIDDEN[mode].below; row.style.opacity = "0"; });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const row = e.target;
        if (e.isIntersecting) {
          row.style.transition = transition;
          row.style.transitionDelay = `${(order++) * stagger}s`;
          row.dataset.state = "in"; row.style.transform = ""; row.style.opacity = "";
          setTimeout(() => { row.style.transitionDelay = "0s"; order = Math.max(0, order - 1); }, 700);
        } else if (!o.animateOnce) {
          const above = e.boundingClientRect.top < (e.rootBounds ? e.rootBounds.top : 0);
          row.dataset.state = above ? "above" : "below";
          row.style.transition = "none";
          row.style.transform = HIDDEN[mode][above ? "above" : "below"]; row.style.opacity = "0";
        }
      });
    }, { threshold: 0.2 });
    rows.forEach(r => io.observe(r));
    let selected = -1;
    const place = () => {
      const row = rows[selected];
      if (!row) { ring.style.opacity = "0"; return; }
      ring.style.opacity = "1";
      ring.style.transform = `translate3d(0, ${row.offsetTop - track.offsetTop}px, 0)`;
      ring.style.height = `${row.offsetHeight}px`;
    };
    ring.style.transition = `transform 420ms ${AL_SPRING}, height 420ms ${AL_SPRING}, opacity 200ms ease`;
    const select = i => { selected = clamp(i, 0, rows.length - 1); rows.forEach((r, j) => (j === selected ? r.setAttribute("aria-selected", "true") : r.removeAttribute("aria-selected"))); place(); };
    rows.forEach((row, i) => {
      row.setAttribute("role", "option"); row.id = row.id || `${root.id || "al"}-row-${i}`;
      row.addEventListener("pointerenter", () => select(i));
    });
    root.addEventListener("pointerleave", () => { selected = -1; rows.forEach(r => r.removeAttribute("aria-selected")); place(); });
    root.tabIndex = 0; root.setAttribute("role", "listbox");
    root.addEventListener("keydown", e => {
      const keys = { ArrowDown: selected + 1, ArrowUp: selected - 1, Home: 0, End: rows.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault(); select(selected < 0 && e.key === "ArrowDown" ? 0 : keys[e.key]);
      root.setAttribute("aria-activedescendant", rows[selected].id);
    });
    addEventListener("resize", place, { passive: true });
  };

  /* Pops one new element in with AnimatedList's spring. Used for new chat messages. */
  RB.popIn = el => {
    if (reduced()) return;
    el.style.transition = "none";
    el.style.transform = HIDDEN.pop.below; el.style.opacity = "0";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = `transform 620ms ${AL_SPRING}, opacity 300ms cubic-bezier(0.22, 1, 0.36, 1)`;
      el.style.transform = ""; el.style.opacity = "";
    }));
  };

  /* ------------------------------------------------------------------ *
   * SlideCommit: drag the handle to the end to confirm. Shows a spinner
   * while the promise runs, a done pill if it resolves, shakes if not.
   * ------------------------------------------------------------------ */
  const ARROW = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const SPIN = '<svg class="slide-commit__spinner" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="40 100" stroke-linecap="round"/></svg>';
  RB.slideCommit = (host, o = {}) => {
    const label = o.label ?? "Slide to pay", doneLabel = o.doneLabel ?? "Paid", errorLabel = o.errorLabel ?? "Payment failed";
    host.classList.add("slide-commit");
    host.innerHTML = `<div class="slide-commit__track">
      <span class="slide-commit__label" aria-hidden="true"><span class="slide-commit__text slide-commit__text--plain"></span><span class="slide-commit__text slide-commit__text--error"></span></span>
      <span class="slide-commit__fill" aria-hidden="true"></span>
      <span class="slide-commit__handle" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span class="slide-commit__arrow">${ARROW}</span><span class="slide-commit__spin">${SPIN}</span>
      </span>
      <span class="slide-commit__done" aria-hidden="true">${CHECK}<span></span></span>
    </div><span class="slide-commit__sr" aria-live="polite"></span>`;
    const track = host.querySelector(".slide-commit__track"), handle = host.querySelector(".slide-commit__handle");
    const fill = host.querySelector(".slide-commit__fill"), sr = host.querySelector(".slide-commit__sr");
    host.querySelector(".slide-commit__text--plain").textContent = label;
    host.querySelector(".slide-commit__text--error").textContent = errorLabel;
    host.querySelector(".slide-commit__done span").textContent = doneLabel;
    handle.setAttribute("aria-label", `${label}. Drag to the end, or press Enter.`);
    let phase = "idle", x = 0, dragging = false, startX = 0, startPos = 0;
    const max = () => track.clientWidth - handle.offsetWidth - 8;
    const set = (v, animate) => {
      x = clamp(v, 0, max());
      handle.style.transition = fill.style.transition = animate ? `transform 520ms ${AL_SPRING}, width 520ms ${AL_SPRING}` : "none";
      handle.style.transform = `translate3d(${x}px, 0, 0)`;
      fill.style.width = `${x + handle.offsetWidth}px`;
      const pct = Math.round((x / Math.max(1, max())) * 100);
      handle.setAttribute("aria-valuenow", String(pct));
      host.style.setProperty("--sc-progress", (x / Math.max(1, max())).toFixed(3));
    };
    const setPhase = p => { phase = p; host.dataset.phase = p; };
    const commit = async () => {
      if (phase !== "idle" && phase !== "error") return;
      set(max(), true); setPhase("pending"); handle.setAttribute("aria-busy", "true"); sr.textContent = "Working on it";
      try {
        await (o.onConfirm ? o.onConfirm() : Promise.resolve());
        setPhase("done"); sr.textContent = doneLabel; o.onDone && o.onDone();
      } catch (err) {
        setPhase("error"); sr.textContent = errorLabel;
        host.classList.remove("shake"); void host.offsetWidth; host.classList.add("shake");
        o.onError && o.onError(err);
        setTimeout(() => { if (phase === "error") { set(0, true); } }, 300);
      } finally { handle.removeAttribute("aria-busy"); }
    };
    handle.addEventListener("pointerdown", e => {
      if (phase === "pending" || phase === "done") return;
      dragging = true; startX = e.clientX; startPos = x; handle.setPointerCapture(e.pointerId); host.dataset.held = "";
    });
    handle.addEventListener("pointermove", e => { if (dragging) set(startPos + e.clientX - startX, false); });
    const up = () => {
      if (!dragging) return; dragging = false; delete host.dataset.held;
      if (x >= max() * 0.9) commit(); else { set(0, true); if (phase === "error") setPhase("idle"); }
    };
    handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
    handle.addEventListener("keydown", e => {
      if (["Enter", " ", "End"].includes(e.key)) { e.preventDefault(); commit(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); set(x + max() / 5, true); if (x >= max() * 0.9) commit(); }
      else if (e.key === "ArrowLeft" || e.key === "Home") { e.preventDefault(); set(e.key === "Home" ? 0 : x - max() / 5, true); }
    });
    addEventListener("resize", () => set(phase === "pending" || phase === "done" ? max() : 0, false));
    setPhase("idle"); requestAnimationFrame(() => set(0, false));
    return { reset() { setPhase("idle"); set(0, true); } };
  };

  /* Auto-attach to markup on the page */
  const ready = () => {
    document.querySelectorAll("[data-specular]").forEach(b => RB.specular(b));
    document.querySelectorAll("[data-bento]").forEach(b => RB.bento(b));
    document.querySelectorAll("[data-animated-list]").forEach(l => RB.animatedList(l, { animation: "pop", stagger: 0.06 }));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
