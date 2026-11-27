const EMAIL = "lennyvincentsingh@gmail.com";
const $ = id => document.getElementById(id);

const yr = $("yr");
if (yr) yr.textContent = new Date().getFullYear();

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
