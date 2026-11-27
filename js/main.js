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
if (form) form.addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(form);
  const subject = `Startup page enquiry: ${f.get("startup") || f.get("name")}`;
  const body = `Name: ${f.get("name")}\nEmail: ${f.get("email")}\nStartup: ${f.get("startup")}\nNeed: ${f.get("need")}\n\n${f.get("message")}`;
  location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
