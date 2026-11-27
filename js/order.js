// The buyer's private order page. Everything comes from the get-order function using the link's token.
(() => {
  const API = "https://wydreptloanesxblcdra.supabase.co/functions/v1";
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const token = params.get("t") || "";
  const gbp = p => "£" + (p / 100).toFixed(2).replace(/\.00$/, "");
  const date = s => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  $("yr").textContent = new Date().getFullYear();

  const HEADLINES = {
    new: ["I'm working out your quote", "It'll show up on this page. Check back here, or I'll email you when it's ready."],
    quoted: ["Your quote's ready", "Have a look. If you're happy, pay the deposit and I'll start."],
    in_progress: ["I'm building your page", "The ticks below show where I'm up to."],
    draft_ready: ["Your draft's ready", "Have a look. If you're happy with it, pay the rest and I'll hand everything over."],
    balance_paid: ["Paid in full, handing over", "I'm getting your files and code ready to send."],
    complete: ["Done. It's yours.", "Your files and code have been handed over."],
    cancelled: ["This order's been cancelled", "If that's a mistake, email me."]
  };
  const NEED = { new: "A brand new startup page", redesign: "A redesign of the current page", unsure: "Not sure yet, wants to chat" };

  function render(o) {
    $("loading").hidden = true; $("view").hidden = false;
    document.title = `Order ${o.ref} | I Make Those Pages`;
    $("ref").textContent = o.ref;
    $("placed").textContent = "placed " + date(o.created_at);
    const [h, s] = HEADLINES[o.status] || HEADLINES.new;
    $("headline").textContent = h; $("subline").textContent = s;
    $("mailBtn").href = `mailto:lennyvincentsingh@gmail.com?subject=${encodeURIComponent("Order " + o.ref)}`;
    $("need").textContent = NEED[o.need] + (o.startup ? ` for ${o.startup}` : "");
    $("desc").textContent = o.description;

    // Checklist: the first unticked step is the current one
    const current = o.status === "cancelled" ? -1 : o.steps.findIndex(st => !st.done);
    $("steps").replaceChildren(...o.steps.map((st, i) => {
      const li = document.createElement("li");
      li.className = st.done ? "done" : i === current ? "current" : "";
      const box = document.createElement("span"); box.className = "box"; box.setAttribute("aria-hidden", "true");
      const txt = document.createElement("span"); txt.className = "txt";
      const label = document.createElement("strong"); label.textContent = st.label;
      const meta = document.createElement("small");
      meta.textContent = st.done ? (st.done_at ? "Done " + date(st.done_at) : "Done") : i === current ? "Current step" : "";
      txt.append(label, meta);
      li.append(box, txt);
      li.setAttribute("aria-label", `${st.label}: ${st.done ? "done" : i === current ? "current step" : "not started"}`);
      return li;
    }));
    if (o.steps.length && current === -1 && o.status !== "cancelled") $("steps").classList.add("all-done");

    // Quote and payments
    const q = $("quoteBody");
    q.replaceChildren();
    const p = (text, cls) => { const el = document.createElement("p"); if (cls) el.className = cls; el.textContent = text; q.append(el); return el; };
    if (!o.quote_pence) {
      p("Not ready yet. Your price and the steps for your page will show up here.", "muted");
    } else {
      const price = document.createElement("p"); price.className = "price"; price.textContent = gbp(o.quote_pence);
      q.append(price);
      if (o.quote_summary) p(o.quote_summary);
      const split = document.createElement("ul"); split.className = "split-pay";
      [["Deposit to start", o.deposit_pence, o.deposit_paid], ["Rest, after you approve the draft", o.balance_pence, o.balance_paid]].forEach(([l, amt, paid]) => {
        const li = document.createElement("li");
        li.innerHTML = `<span></span><strong></strong>`;
        li.firstChild.textContent = l; li.lastChild.textContent = paid ? `${gbp(amt)} paid` : gbp(amt);
        if (paid) li.className = "paid";
        split.append(li);
      });
      q.append(split);
      if (o.draft_url) {
        const a = document.createElement("a"); a.href = o.draft_url; a.target = "_blank"; a.rel = "noopener";
        a.className = "link"; a.textContent = "See your draft";
        const wrap = document.createElement("p"); wrap.append(a); q.append(wrap);
      }
      if (o.status === "quoted") payButton(q, "deposit", `Accept and pay ${gbp(o.deposit_pence)} deposit`);
      if (o.status === "draft_ready") payButton(q, "balance", `Approve draft and pay ${gbp(o.balance_pence)}`);
      if (o.status === "quoted" || o.status === "draft_ready") {
        p("Payments go through Stripe. I never see your card details.", "fine");
        const agree = document.createElement("p"); agree.className = "fine";
        agree.innerHTML = 'By paying you agree to the <a href="terms.html">terms</a>, including what\'s not included.';
        q.append(agree);
      }
    }
  }

  function payButton(parent, kind, text) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn"; b.textContent = text;
    const err = document.createElement("p"); err.className = "err"; err.hidden = true; err.setAttribute("role", "alert");
    b.addEventListener("click", async () => {
      b.disabled = true; const t = b.textContent; b.textContent = "Opening secure checkout…"; err.hidden = true;
      try {
        const res = await fetch(`${API}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, kind }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error || "Couldn't start the payment.");
        location.href = data.url;
      } catch (e) {
        err.textContent = e.message; err.hidden = false; b.disabled = false; b.textContent = t;
      }
    });
    parent.append(b, err);
  }

  async function load() {
    if (!/^[a-f0-9]{48}$/.test(token)) return fail("That order link isn't complete.");
    try {
      const res = await fetch(`${API}/get-order?t=${encodeURIComponent(token)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return fail(data.error || "Couldn't load your order.");
      render(data);
      return data;
    } catch {
      if ($("view").hidden) fail("Couldn't reach the server. Check your connection and refresh.");
    }
  }
  function fail(msg) { $("loading").hidden = true; $("failed").hidden = false; $("failedMsg").textContent = msg; }

  // Fresh order: show the "save this link" box with a clean URL
  if (params.get("new") === "1") {
    const clean = `${location.origin}${location.pathname}?t=${token}`;
    history.replaceState(null, "", clean);
    $("saveLink").hidden = false; $("linkBox").value = clean;
    $("copyLink").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(clean); } catch { $("linkBox").select(); document.execCommand("copy"); }
      $("copyLink").textContent = "Copied";
    });
  }

  // Back from Stripe: Stripe tells my server a moment later, so keep checking for a bit
  const paid = params.get("paid");
  load().then(o => {
    if (!paid || !o) return;
    history.replaceState(null, "", `${location.pathname}?t=${token}`);
    const note = $("paidNote");
    const done = d => (paid === "deposit" ? d.deposit_paid : d.balance_paid);
    note.hidden = false;
    if (done(o)) { note.textContent = "Payment received. Thanks."; return; }
    note.textContent = "Thanks, your payment's going through. This page will update in a few seconds.";
    let tries = 0;
    const poll = setInterval(async () => {
      const d = await load();
      if ((d && done(d)) || ++tries > 10) {
        clearInterval(poll);
        note.textContent = d && done(d) ? "Payment received. Thanks." : "Stripe's taking a moment. Refresh in a minute; if it still doesn't show, email me.";
      }
    }, 3000);
  });

  // Keep it fresh when they come back to the tab
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("view").hidden) load(); });
})();
