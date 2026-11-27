(() => {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo = 0, hi = 1) => Math.min(Math.max(v, lo), hi);

  // Kinetic headline
  const h1 = document.querySelector(".hero h1");
  if (h1 && !still) {
    let i = 0;
    h1.innerHTML = h1.textContent.trim().split(/\s+/)
      .map(w => `<span class="w"><span style="--i:${i++}">${w}</span></span>`).join(" ");
  }

  const hero = document.querySelector(".hero-wrap");
  const text = document.querySelector(".hero-text");
  const demo = document.querySelector(".demo");
  const depth = [...document.querySelectorAll("[data-depth]")].map(el => ({ el, k: +el.dataset.depth, y: 0 }));

  // Scrollytelling: one pinned scene, scroll position picks the step
  const scene = document.querySelector(".story-scroll");
  const stage = document.getElementById("stage");
  const beats = [...document.querySelectorAll(".beat")];
  const root = document.documentElement;
  let current = 0;

  let sy = scrollY;           // smoothed scroll
  let running = false;

  function frame() {
    const target = scrollY;
    sy = still ? target : lerp(sy, target, 0.12);
    const vh = innerHeight;

    // Hero parallax (only while the hero's on screen)
    if (!still && innerWidth > 900 && sy < hero.offsetHeight) {
      const p = clamp(sy / hero.offsetHeight);
      text.style.transform = `translate3d(0,${sy * 0.3}px,0)`;
      demo.style.transform = `translate3d(0,${sy * 0.12}px,0)`;
      h1.style.setProperty("--wght", Math.round(800 - p * 450));
      h1.style.setProperty("--track", (-0.03 + p * 0.05).toFixed(3) + "em");
      text.style.opacity = (1 - p * 0.9).toFixed(3);
    }

    // Depth layers: drift relative to the middle of the screen
    if (!still) for (const d of depth) {
      const r = d.el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const off = (r.top + r.height / 2 - vh / 2) * d.k;
      d.el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
    }

    // Story progress
    if (scene) {
      const top = scene.offsetTop, span = scene.offsetHeight - vh;
      const p = clamp((sy - top) / span);
      scene.style.setProperty("--p", p.toFixed(4));
      const idx = Math.min(beats.length - 1, Math.floor(p * beats.length * 0.999));
      if (idx !== current) {
        current = idx;
        stage.dataset.stage = String(idx + 1);
        beats.forEach((b, i) => { b.classList.toggle("on", i === idx); b.classList.toggle("done", i < idx); });
      }
    }

    if (Math.abs(target - sy) > 0.3) requestAnimationFrame(frame); else running = false;
  }
  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", kick, { passive: true });
  addEventListener("resize", kick);
  running = true; frame();

  // Click a step to jump to it
  beats.forEach((b, i) => {
    b.style.cursor = "pointer";
    b.addEventListener("click", () => {
      const span = scene.offsetHeight - innerHeight;
      scrollTo({ top: scene.offsetTop + span * ((i + 0.5) / beats.length), behavior: still ? "auto" : "smooth" });
    });
  });
})();
