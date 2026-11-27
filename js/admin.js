// Owner admin. Talks to the admin function with the ADMIN_KEY kept in this browser's localStorage.
(() => {
  const API = "https://wydreptloanesxblcdra.supabase.co/functions/v1";
  const PROJECT = "wydreptloanesxblcdra";
  const SITE = "https://i-make-those-pages.netlify.app";
  const $ = id => document.getElementById(id);
  const gbp = p => "£" + (p / 100).toFixed(2).replace(/\.00$/, "");
  const when = s => new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const STATUS = { new: "Needs a quote", quoted: "Quoted, waiting for deposit", in_progress: "Building", draft_ready: "Draft sent, waiting for the rest",
    balance_paid: "Paid in full, hand over", complete: "Complete", cancelled: "Cancelled" };
  const NEED = { new: "Brand new page", redesign: "Redesign", unsure: "Not sure yet" };
  let key = "";
  let current = null;
  try { key = localStorage.getItem("imtp-admin-key") || ""; } catch {}

  async function call(body) {
    const res = await fetch(`${API}/admin`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { lock("Wrong admin key."); throw new Error("locked"); }
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  function lock(msg) {
    try { localStorage.removeItem("imtp-admin-key"); } catch {}
    key = ""; $("app").hidden = true; $("lockBtn").hidden = true; $("unlock").hidden = false;
    if (msg) { $("unlockErr").textContent = msg; $("unlockErr").hidden = false; }
  }
  $("lockBtn").addEventListener("click", () => lock());
  $("unlock").addEventListener("submit", async e => {
    e.preventDefault(); key = $("keyInput").value.trim(); $("unlockErr").hidden = true;
    try { await list(); try { localStorage.setItem("imtp-admin-key", key); } catch {} } catch (err) { if (err.message !== "locked") { $("unlockErr").textContent = err.message; $("unlockErr").hidden = false; } }
  });

  async function list() {
    const rows = await call({ action: "list" });
    $("unlock").hidden = true; $("app").hidden = false; $("lockBtn").hidden = false;
    $("list").replaceChildren(...rows.map(r => {
      const li = document.createElement("li");
      const b = document.createElement("button"); b.type = "button"; b.dataset.ref = r.ref;
      b.innerHTML = "<strong></strong><span></span><small></small>";
      b.children[0].textContent = `${r.ref}  ${r.startup || r.name}`;
      b.children[1].textContent = STATUS[r.status] + (r.quote_pence ? `, ${gbp(r.quote_pence)}` : "");
      b.children[2].textContent = when(r.created_at);
      if (r.status === "new" || r.status === "balance_paid") b.classList.add("attention");
      if (r.unread) { const n = document.createElement("em"); n.className = "badge"; n.textContent = `${r.unread} new`; n.title = `${r.unread} unread message${r.unread > 1 ? "s" : ""}`; b.children[0].append(n); }
      b.addEventListener("click", () => { if (decodeURIComponent(location.hash.slice(1)) === r.ref) open(r.ref); else location.hash = r.ref; });
      li.append(b); return li;
    }));
    if (!rows.length) $("list").innerHTML = '<li class="muted">No orders yet.</li>';
    const want = decodeURIComponent(location.hash.slice(1));
    if (want && (!current || current.ref !== want)) open(want);
  }
  $("refresh").addEventListener("click", () => list().catch(() => {}));

  function prompt(o) {
    return `Quote this order for I Make Those Pages and set it up.

Order: ${o.ref}
Supabase project: ${PROJECT}
Needs: ${NEED[o.need]}
Startup: ${o.startup || "-"}
Their description:
"""
${o.description}
"""

Pricing rules:
- Quote between £100 and £300 for the whole job, in whole pounds.
- A simple one-page site with help on the words sits at the low end. More sections, custom animation, a redesign that moves over existing content, or forms and integrations push it toward £300.
- If it clearly needs more than £300 of work (several pages, logins, a web app), don't quote. Tell me, and say what to cut to fit.
- Hosting, domains, and ongoing maintenance or security updates are never included.

Then:
1. Write a 2 to 3 sentence summary of what they get, in plain words, written to the buyer.
2. Pick 3 to 6 work steps in order, each under 40 characters (for example "Words and layout", "Design", "Build", "Phone and speed checks").
3. Save it with the Supabase tools by running:
   select public.set_quote('${o.ref}', <price in pence>, '<summary>', array['<step 1>', '<step 2>']);
   (escape any ' in the text as '')
4. Tell me the price, the summary and the steps.

Later, when I say a step is done, tick it with select public.tick_step('${o.ref}', <step position>);
Draft link: select public.set_draft_url('${o.ref}', '<https link>');
Read their messages: select public.owner_messages('${o.ref}');
Message the buyer (shows on their order page): select public.owner_send_message('${o.ref}', '<text>');${threadText(o)}`;
  }
  function threadText(o) {
    const msgs = (o.thread && o.thread.messages) || [];
    if (!msgs.length) return "";
    return "\n\nMessages so far (oldest first):\n" + msgs.map(m => `${m.from === "buyer" ? "Buyer" : "Me"}: ${m.body}`).join("\n");
  }

  async function open(ref) {
    const d = $("detail");
    d.innerHTML = '<p class="muted">Loading…</p>';
    let o;
    try { o = await call({ action: "get", ref }); } catch (e) { if (e.message !== "locked") d.innerHTML = `<p class="err"></p>`, d.firstChild.textContent = e.message; return; }
    document.querySelectorAll("#list button").forEach(b => b.classList.toggle("on", b.dataset.ref === ref));
    const buyerUrl = `${SITE}/order.html?t=${o.token}`;
    d.innerHTML = `
      <div class="row-between"><h2></h2><span class="tag"></span></div>
      <p class="muted who"></p>
      <p class="request"></p>
      <div class="btn-row">
        <button type="button" class="btn small" data-do="prompt">Copy prompt for Claude</button>
        <button type="button" class="btn small ghost" data-do="buyer">Copy buyer's link</button>
        <a class="btn small ghost" target="_blank" rel="noopener" data-do="view">Open buyer's page</a>
      </div>
      <p class="fine status-msg" role="status"></p>
      <h3>Messages</h3>
      <p class="muted no-msgs">No messages yet.</p>
      <ol class="thread admin-thread" aria-label="Messages with the buyer"></ol>
      <form class="composer" data-composer novalidate>
        <textarea maxlength="2000" rows="3" aria-label="Reply to the buyer"></textarea>
        <div class="composer-row"><a class="linkbtn tell" hidden>Email them that you replied</a><span class="count fine"></span><button class="btn small">Send reply</button></div>
      </form>
      <h3>Steps</h3>
      <ol class="checklist admin-steps"></ol>
      <h3>Draft link</h3>
      <div class="copy-row"><input type="url" placeholder="https://..." data-f="draft" aria-label="Draft link"><button type="button" class="btn small" data-do="draft">Save</button></div>
      <details class="quote-form"><summary>Set the quote by hand</summary>
        <label>Price (£)<input type="number" min="50" max="1000" step="1" data-f="price"></label>
        <label>Summary<textarea data-f="summary" maxlength="1500"></textarea></label>
        <label>Work steps, one per line<textarea data-f="steps"></textarea></label>
        <button type="button" class="btn small" data-do="quote">Save quote</button>
      </details>
      <p class="pay-log fine"></p>
      <button type="button" class="linkbtn danger" data-do="cancel">Cancel this order</button>`;
    d.querySelector("h2").textContent = `${o.ref}  ${o.startup || ""}`;
    d.querySelector(".tag").textContent = STATUS[o.status];
    d.querySelector(".who").textContent = `${o.name} (${o.email}), ${NEED[o.need]}, ${when(o.created_at)}`;
    d.querySelector(".request").textContent = o.description;
    d.querySelector('[data-do="view"]').href = buyerUrl;
    d.querySelector('[data-f="draft"]').value = o.draft_url || "";
    if (o.quote_pence) {
      d.querySelector('[data-f="price"]').value = o.quote_pence / 100;
      d.querySelector('[data-f="summary"]').value = o.quote_summary || "";
      d.querySelector('[data-f="steps"]').value = o.steps.filter(s => s.code === "work").map(s => s.label).join("\n");
    }
    d.querySelector(".pay-log").textContent = (o.payments || []).filter(p => p.status === "paid").map(p => `${p.kind === "deposit" ? "Deposit" : "Rest"} ${gbp(p.amount_pence)} paid ${when(p.paid_at)}`).join(". ") || "No payments yet.";
    current = o;
    renderThread(o);
    const badge = document.querySelector(`#list button[data-ref="${CSS.escape(ref)}"] .badge`);
    if (badge) badge.remove();

    const steps = d.querySelector(".admin-steps");
    steps.replaceChildren(...o.steps.map(s => {
      const li = document.createElement("li"); li.className = s.done ? "done" : "";
      const lab = document.createElement("label");
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = s.done;
      cb.disabled = !["work", "draft", "handover"].includes(s.code) || o.status === "cancelled";
      cb.title = cb.disabled ? "Ticked automatically" : "";
      const span = document.createElement("span"); span.textContent = `${s.position}. ${s.label}`;
      lab.append(cb, span); li.append(lab);
      cb.addEventListener("change", async () => {
        try { await call({ action: "tick", ref: o.ref, position: s.position, done: cb.checked }); open(o.ref); list(); }
        catch (e) { cb.checked = !cb.checked; if (e.message !== "locked") say(e.message); }
      });
      return li;
    }));

  }


  // ---- Messages with the buyer ----
  const drafts = {};
  let lastMsg = 0;
  const stamp = s => new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
  function addMsg(list, m, name) {
    if (m.id <= lastMsg) return;
    lastMsg = m.id;
    const li = document.createElement("li");
    li.className = "msg" + (m.from === "owner" ? " mine" : "");
    li.dataset.id = m.id;
    const p = document.createElement("p"); p.className = "bubble"; linkify(p, m.body);
    const meta = document.createElement("small"); meta.textContent = `${m.from === "owner" ? "You" : name}, ${stamp(m.at)}`;
    li.append(p, meta); list.append(li);
  }
  function seenMark(list, upto) {
    list.querySelectorAll(".seen").forEach(el => el.remove());
    const li = [...list.querySelectorAll(".msg.mine")].filter(x => Number(x.dataset.id) <= upto).pop();
    if (li) { const s = document.createElement("small"); s.className = "seen"; s.textContent = "Seen"; li.append(s); }
  }
  function renderThread(o) {
    const d = $("detail"), list = d.querySelector(".admin-thread"), box = d.querySelector("[data-composer] textarea");
    lastMsg = 0;
    const msgs = (o.thread && o.thread.messages) || [];
    msgs.forEach(m => addMsg(list, m, o.name));
    seenMark(list, (o.thread && o.thread.seen_upto) || 0);
    d.querySelector(".no-msgs").hidden = msgs.length > 0;
    list.scrollTop = list.scrollHeight;
    box.placeholder = `Reply to ${o.name.split(" ")[0]}`;
    box.value = drafts[o.ref] || "";
    const tell = d.querySelector(".tell");
    tell.href = `mailto:${o.email}?subject=${encodeURIComponent(`Reply on your order ${o.ref}`)}&body=${encodeURIComponent(`Hi ${o.name.split(" ")[0]},\n\nI've replied to your message on your order page:\n${SITE}/order.html?t=${o.token}\n`)}`;
  }
  const keep = (o, m) => {
    o.thread = o.thread || { messages: [] };
    if (!o.thread.messages.some(x => x.id === m.id)) o.thread.messages.push(m);
  };
  async function pollThread() {
    const o = current, d = $("detail");
    if (!o || document.hidden || !key) return;
    const list = d.querySelector(".admin-thread");
    if (!list) return;
    try {
      const r = await call({ action: "thread", ref: o.ref, after: lastMsg });
      if (current !== o) return;
      const stick = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
      (r.result.messages || []).forEach(m => { addMsg(list, m, o.name); keep(o, m); });
      seenMark(list, r.result.seen_upto || 0);
      d.querySelector(".no-msgs").hidden = list.children.length > 0;
      if (stick) list.scrollTop = list.scrollHeight;
    } catch {}
  }
  setInterval(pollThread, 15000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pollThread(); });

  $("detail").addEventListener("input", e => {
    if (!e.target.matches("[data-composer] textarea") || !current) return;
    const box = e.target, left = 2000 - [...box.value].length;
    drafts[current.ref] = box.value;
    box.style.height = "auto"; box.style.height = Math.min(box.scrollHeight + 2, 240) + "px";
    const c = $("detail").querySelector("[data-composer] .count");
    c.textContent = left < 300 ? `${left} left` : ""; c.classList.toggle("near", left < 100);
  });
  $("detail").addEventListener("keydown", e => {
    if (e.target.matches("[data-composer] textarea") && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.target.form.requestSubmit(); }
  });
  $("detail").addEventListener("submit", async e => {
    if (!e.target.matches("[data-composer]") || !current) return;
    e.preventDefault();
    const o = current, form = e.target, box = form.querySelector("textarea"), btn = form.querySelector("button");
    const body = box.value.trim();
    if (!body) { box.focus(); return; }
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const r = await call({ action: "reply", ref: o.ref, body });
      const list = $("detail").querySelector(".admin-thread");
      addMsg(list, r.result, o.name); keep(o, r.result);
      $("detail").querySelector(".no-msgs").hidden = true;
      list.scrollTop = list.scrollHeight;
      box.value = ""; box.style.height = ""; drafts[o.ref] = "";
      form.querySelector(".count").textContent = "";
      form.querySelector(".tell").hidden = false;
      say("Sent. They'll see it on their order page. Email them if it's urgent.");
    } catch (err) { if (err.message !== "locked") say(err.message); }
    finally { btn.disabled = false; btn.textContent = "Send reply"; }
  });

  const say = t => { const m = document.querySelector("#detail .status-msg"); if (m) m.textContent = t; };
  $("detail").addEventListener("click", async e => {
    const b = e.target.closest("[data-do]"); if (!b || !current) return;
    const o = current, d = $("detail"), act = b.dataset.do, buyerUrl = `${SITE}/order.html?t=${o.token}`;
    try {
      if (act === "prompt") { await navigator.clipboard.writeText(prompt(o)); say("Prompt copied. Paste it into Claude."); }
      if (act === "buyer") { await navigator.clipboard.writeText(buyerUrl); say("Buyer's link copied."); }
      if (act === "draft") { await call({ action: "draft", ref: o.ref, url: d.querySelector('[data-f="draft"]').value }); say("Draft link saved. Now tick the draft step."); }
      if (act === "quote") {
        const pence = Math.round(Number(d.querySelector('[data-f="price"]').value) * 100);
        const stepsList = d.querySelector('[data-f="steps"]').value.split("\n").map(s => s.trim()).filter(Boolean);
        await call({ action: "quote", ref: o.ref, pence, summary: d.querySelector('[data-f="summary"]').value.trim(), steps: stepsList });
        await open(o.ref); list(); say("Quote saved. Email the buyer their link.");
      }
      if (act === "cancel" && confirm(`Cancel ${o.ref}? The buyer's page will say it's cancelled. Refunds are done in Stripe, not here.`)) {
        await call({ action: "cancel", ref: o.ref }); open(o.ref); list();
      }
    } catch (err) { if (err.message !== "locked") say(err.message); }
  });

  window.addEventListener("hashchange", () => { const r = decodeURIComponent(location.hash.slice(1)); if (r && key) open(r); });
  if (key) list().catch(() => {}); else $("unlock").hidden = false;
})();
