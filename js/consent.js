// Cookie/consent banner. Analytics only loads after a yes.
// To turn analytics on: sign up at goatcounter.com and put your code below (e.g. "imakethosepages").
(() => {
  const GOATCOUNTER_CODE = "";
  const KEY = "imtp-consent";
  const get = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const set = v => { try { localStorage.setItem(KEY, v); } catch {} };

  const load = () => {
    if (!GOATCOUNTER_CODE || document.getElementById("gc")) return;
    const s = document.createElement("script");
    s.id = "gc"; s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
    document.head.appendChild(s);
  };

  const bar = document.createElement("div");
  bar.className = "consent"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Cookie settings");
  bar.hidden = true;
  const priv = location.pathname.includes("/i-make-those-pages/") ? "/i-make-those-pages/privacy.html" : "privacy.html";
  bar.innerHTML = `<p>Can I count your visit? No cookies, no ads, just anonymous stats so I know if anyone's looking. <a href="${priv}">Privacy policy</a></p>
    <div><button type="button" class="btn small" data-v="yes">That's fine</button><button type="button" class="btn small ghost" data-v="no">No thanks</button></div>`;
  document.body.appendChild(bar);
  bar.addEventListener("click", e => {
    const v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    set(v); bar.hidden = true;
    if (v === "yes") load();
  });
  document.querySelectorAll("[data-consent-open]").forEach(b => b.addEventListener("click", () => { bar.hidden = false; bar.querySelector("button").focus(); }));

  // No analytics set up yet = nothing to ask about, so no banner.
  if (!GOATCOUNTER_CODE) { document.querySelectorAll("[data-consent-open]").forEach(b => b.hidden = true); return; }
  const c = get();
  if (c === "yes") load(); else if (c !== "no") bar.hidden = false;
})();
