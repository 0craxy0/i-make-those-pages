(() => {
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Kinetic headline: words rise in, then the weight thins as you scroll away
  const h1 = document.querySelector(".hero h1");
  if (h1 && !still) {
    let i = 0;
    h1.innerHTML = h1.textContent.trim().split(/\s+/)
      .map(w => `<span class="w"><span style="--i:${i++}">${w}</span></span>`).join(" ");
  }

  // Parallax + scroll-linked type
  const text = document.querySelector(".hero-text");
  const demo = document.querySelector(".demo");
  const hero = document.querySelector(".hero-wrap");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const p = Math.min(Math.max(scrollY / hero.offsetHeight, 0), 1);
    document.documentElement.style.setProperty("--heroP", p.toFixed(3));
    if (still) return;
    text.style.transform = `translateY(${scrollY * 0.28}px)`;
    demo.style.transform = `translateY(${scrollY * 0.1}px)`;
    h1.style.setProperty("--wght", Math.round(800 - p * 450));
    h1.style.setProperty("--track", (-0.03 + p * 0.05).toFixed(3) + "em");
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Scrollytelling: the stage follows whichever step is in view
  const stage = document.getElementById("stage");
  const beats = document.querySelectorAll(".beat");
  if (stage && beats.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        beats.forEach(b => b.classList.toggle("on", b === e.target));
        stage.dataset.stage = e.target.dataset.stage;
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    beats.forEach(b => io.observe(b));
    beats[0].classList.add("on");
  }
})();
