const EMAIL = "lennyvincentsingh@gmail.com";
const $ = id => document.getElementById(id);

const yr = $("yr");
if (yr) yr.textContent = new Date().getFullYear();

// Code tab: the actual HTML for the preview, highlighted
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function renderCode(name, line) {
  const out = $("codeOut");
  if (!out) return;
  const t = (tag, attrs = "") => `<span class="t">&lt;${tag}</span>${attrs}<span class="t">&gt;</span>`;
  const c = tag => `<span class="t">&lt;/${tag}&gt;</span>`;
  const a = (k, v) => ` <span class="a">${k}</span>=<span class="s">"${esc(v)}"</span>`;
  const x = s => `<span class="x">${esc(s)}</span>`;
  out.innerHTML = [
    `${t("header")}`,
    `  ${t("a", a("class", "logo"))}${x(name)}${c("a")}`,
    `  ${t("a", a("class", "btn") + a("href", "#start"))}${x("Get started")}${c("a")}`,
    `${c("header")}`,
    `${t("h1")}${x(line)}${c("h1")}`,
    `${t("p")}${x("Built for people who'd rather be doing the actual work.")}${c("p")}`,
    `${t("a", a("class", "btn") + a("href", "#start"))}${x("Get started")}${c("a")}`
  ].join("\n");
}
const tabP = $("tabPreview"), tabC = $("tabCode");
if (tabP && tabC) {
  const show = code => {
    tabP.setAttribute("aria-selected", String(!code)); tabC.setAttribute("aria-selected", String(code));
    $("codePanel").hidden = !code; $("frame").hidden = code;
  };
  tabP.addEventListener("click", () => show(false));
  tabC.addEventListener("click", () => show(true));
  [tabP, tabC].forEach(b => b.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const code = b === tabP; show(code); (code ? tabC : tabP).focus(); }
  }));
}
if ($("dName")) renderCode($("dName").value, $("dLine").value);

// Magnetic buttons (desktop pointers only)
if (matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("[data-magnet]").forEach(el => {
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

// Live demo: type a startup in, the page rebuilds
const frame = $("frame");
if (frame) {
  let t;
  const slug = s => (s.toLowerCase().replace(/[^a-z0-9]+/g, "") || "yourstartup") + ".com";
  const render = () => {
    const name = $("dName").value.trim() || "Your startup";
    const line = $("dLine").value.trim() || "Say what you do in one line.";
    $("pName").textContent = name;
    $("pLine").textContent = line;
    $("dUrl").textContent = slug(name);
    frame.classList.remove("loading");
    renderCode(name, line);
  };
  const onType = () => {
    frame.classList.add("loading");
    clearTimeout(t);
    t = setTimeout(render, 450);
  };
  $("dName").addEventListener("input", onType);
  $("dLine").addEventListener("input", onType);
}

const form = $("contactForm");
if (form) {
  const fields = ["name", "email", "message"].map(n => form.elements[n]);
  const check = el => {
    const ok = el.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()) : el.value.trim().length > 0;
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    $("e-" + el.name).hidden = ok;
    return ok;
  };
  fields.forEach(el => el.addEventListener("input", () => { if (el.getAttribute("aria-invalid") === "true") check(el); }));
  form.addEventListener("submit", e => {
    e.preventDefault();
    const bad = fields.filter(el => !check(el));
    if (bad.length) { bad[0].focus(); return; }
    const btn = $("sendBtn");
    btn.disabled = true; btn.classList.add("busy");
    btn.firstChild.textContent = "Opening your email app ";
    const f = new FormData(form);
    const subject = `Startup page enquiry: ${f.get("startup") || f.get("name")}`;
    const body = `Name: ${f.get("name")}\nEmail: ${f.get("email")}\nStartup: ${f.get("startup")}\nNeed: ${f.get("need")}\n\n${f.get("message")}`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => { location.href = "thanks.html"; }, 1200);
  });
}

// Sticky mobile CTA: shows once the hero's gone, hides at the contact form
const mcta = $("mcta");
if (mcta) {
  const seen = { hero: true, contact: false };
  const upd = () => mcta.classList.toggle("show", !seen.hero && !seen.contact);
  const io = new IntersectionObserver(es => es.forEach(e => { seen[e.target.id === "contact" ? "contact" : "hero"] = e.isIntersecting; upd(); }));
  io.observe(document.querySelector(".hero-wrap")); io.observe($("contact"));
}

// Compact bar once the hero's scrolled away
const minibar = $("minibar");
if (minibar) {
  new IntersectionObserver(([e]) => {
    const on = !e.isIntersecting;
    minibar.classList.toggle("show", on);
    minibar.setAttribute("aria-hidden", on ? "false" : "true");
    minibar.querySelectorAll("a").forEach(a => a.tabIndex = on ? 0 : -1);
  }, { rootMargin: "-80px 0px 0px 0px" }).observe(document.querySelector(".hero-wrap"));
}
