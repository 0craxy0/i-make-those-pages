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
      if (o.status === "quoted") payButton(q, "deposit", `Slide to pay ${gbp(o.deposit_pence)} deposit`);
      if (o.status === "draft_ready") payButton(q, "balance", `Slide to approve and pay ${gbp(o.balance_pence)}`);
      if (o.status === "quoted" || o.status === "draft_ready") {
        p("Payments go through Stripe. I never see your card details.", "fine");
        const agree = document.createElement("p"); agree.className = "fine";
        agree.innerHTML = 'By paying you agree to the <a href="terms.html">terms</a>, including what\'s not included.';
        q.append(agree);
      }
    }
  }

  function payButton(parent, kind, text) {
    const err = document.createElement("p"); err.className = "err"; err.hidden = true; err.setAttribute("role", "alert");
    const startPay = async () => {
      err.hidden = true;
      const res = await fetch(`${API}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, kind }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't start the payment.");
      setTimeout(() => { location.href = data.url; }, 450);
    };
    if (window.RB) {
      const host = document.createElement("div");
      parent.append(host, err);
      window.RB.slideCommit(host, {
        label: text, doneLabel: "Opening secure checkout", errorLabel: "Couldn't start the payment",
        onConfirm: startPay,
        onError: e => { err.textContent = e.message; err.hidden = false; }
      });
      return;
    }
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn"; b.textContent = text;
    b.addEventListener("click", async () => {
      b.disabled = true;
      try { await startPay(); } catch (e) { err.textContent = e.message; err.hidden = false; b.disabled = false; }
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

  // ---- Messages: the buyer and me, on this order ----
  const thread = $("thread"), box = $("msgBox"), sendBtn = $("msgSend"), msgErr = $("msgErr");
  const MAX = 2000;
  let lastId = 0, seenUpto = 0, msgsReady = false, polling = null, fetching = false;
  const stamp = s => {
    const d = new Date(s), today = new Date().toDateString() === d.toDateString();
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return today ? time : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`;
  };
  const nearBottom = () => thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80;
  // Message text with http(s) links made clickable. Built from text nodes, never innerHTML.
  const linkify = (el, text) => {
    const re = /\bhttps?:\/\/[^\s<>"']+/gi;
    let at = 0, m;
    while ((m = re.exec(text))) {
      let url = m[0].replace(/[.,!?;:)\]]+$/, "");
      if (m.index > at) el.append(text.slice(at, m.index));
      const a = document.createElement("a");
      a.href = url; a.textContent = url; a.target = "_blank"; a.rel = "noopener noreferrer nofollow ugc";
      el.append(a);
      at = m.index + url.length; re.lastIndex = at;
    }
    if (at < text.length) el.append(text.slice(at));
  };
  function addMsg(m, animate) {
    if (m.id <= lastId) return null;
    lastId = m.id;
    const mine = m.from === "buyer";
    const li = document.createElement("li");
    li.className = "msg" + (mine ? " mine" : "");
    li.dataset.id = m.id;
    const bubble = document.createElement("p"); bubble.className = "bubble"; linkify(bubble, m.body);
    const meta = document.createElement("small");
    meta.textContent = `${mine ? "You" : "I Make Those Pages"}, ${stamp(m.at)}`;
    li.append(bubble, meta);
    thread.append(li);
    if (animate && window.RB && window.RB.popIn) window.RB.popIn(li);
    return li;
  }
  function markSeen() {
    thread.querySelectorAll(".seen").forEach(el => el.remove());
    const seen = [...thread.querySelectorAll(".msg.mine")].filter(li => Number(li.dataset.id) <= seenUpto).pop();
    if (seen) { const s = document.createElement("small"); s.className = "seen"; s.textContent = "Seen"; seen.append(s); }
  }
  function showEmpty() { $("msgsEmpty").hidden = thread.children.length > 0; }

  async function fetchMsgs() {
    if (fetching || document.hidden) return;
    fetching = true;
    try {
      const res = await fetch(`${API}/messages?t=${encodeURIComponent(token)}&after=${lastId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load messages.");
      const stick = !msgsReady || nearBottom();
      let fromMe = false;
      (data.messages || []).forEach(m => { if (addMsg(m, msgsReady) && m.from === "owner") fromMe = true; });
      seenUpto = data.seen_upto || 0;
      markSeen(); showEmpty();
      if (stick) thread.scrollTop = thread.scrollHeight;
      $("msgState").textContent = "";
      // A reply often comes with a change to the order (a quote, a draft), so refresh that too
      if (fromMe && msgsReady) load();
      msgsReady = true;
    } catch (e) {
      $("msgState").textContent = "Couldn't refresh messages";
    } finally { fetching = false; }
  }
  function startMessages() {
    if (polling) return;
    fetchMsgs();
    polling = setInterval(fetchMsgs, 15000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) fetchMsgs(); });
  }

  const grow = () => { box.style.height = "auto"; box.style.height = Math.min(box.scrollHeight + 2, 240) + "px"; };
  box.addEventListener("input", () => {
    grow();
    const left = MAX - [...box.value].length;
    $("msgCount").textContent = left < 300 ? `${left} left` : "";
    $("msgCount").classList.toggle("near", left < 100);
    msgErr.hidden = true;
  });
  box.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $("composer").requestSubmit(); } });
  $("composer").addEventListener("submit", async e => {
    e.preventDefault();
    const body = box.value.trim();
    if (!body) { box.focus(); return; }
    sendBtn.disabled = true; sendBtn.textContent = "Sending…"; msgErr.hidden = true;
    try {
      const res = await fetch(`${API}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.message) throw new Error(data.error || "Couldn't send that. Try again.");
      addMsg(data.message, true); markSeen(); showEmpty();
      thread.scrollTop = thread.scrollHeight;
      box.value = ""; grow(); $("msgCount").textContent = "";
    } catch (err) {
      msgErr.textContent = err instanceof TypeError ? "Couldn't reach the server. Check your connection and try again." : err.message; msgErr.hidden = false;
    } finally { sendBtn.disabled = false; sendBtn.textContent = "Send"; }
  });

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
    if (o) startMessages();
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
