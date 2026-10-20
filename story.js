/* 没找到，然后呢？ —— 全部交互逻辑
   模块：氛围背景 / 渐显 / 开场搜索对话 / 100个可能世界 / 机制滚动叙事 /
        参数计算器 / 搜索策略板 / 问卷证据可视化 / 尾声 */
window.__storyErrors = [];
window.addEventListener("error", e => { window.__storyErrors.push(e.message + " @" + e.lineno); });
(() => {
  "use strict";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const smooth = t => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const DATA = window.STORY_DATA;
  const PEOPLE = DATA.people;
  const THEORY = DATA.theory;               // 16.67
  const LOCS = [
    { name: "图书馆", prior: 0.40, det: 0.70, cls: "bar-lib" },
    { name: "教室", prior: 0.25, det: 0.70, cls: "bar-room" },
    { name: "食堂", prior: 0.35, det: 0.40, cls: "bar-caf" },
  ];
  const STAGE = ["尚未学习", "正在学习", "已经学过"];
  const BELIEF = ["不确定", "能说明", "不能说明"];
  const PLACE = ["图书馆", "教室", "食堂", "不确定"];
  const TPLACE = ["实验室", "活动室", "操场", "不确定"];
  const HARDEST = ["失败后如何重算概率", "分不清位置概率和找到概率", "三地同时归一化", "演示操作本身", "未作答"];
  const inBand = v => v !== 999 && v >= DATA.band[0] && v <= DATA.band[1];

  document.documentElement.classList.remove("no-js");

  /* ---------- 封面 16:9 画布缩放 ---------- */
  (() => {
    const frames = $$(".landscape-frame");
    const fit = () => frames.forEach(f => f.style.setProperty("--page-scale", f.getBoundingClientRect().width / 1920));
    fit();
    const ro = "ResizeObserver" in window ? new ResizeObserver(fit) : null;
    frames.forEach(f => ro && ro.observe(f));
    addEventListener("resize", fit, { passive: true });
  })();

  /* ---------- 背景氛围：随滚动换画（笔刷蒙版扫入 + 时间指数平滑） ---------- */
  (() => {
    const layers = $$(".paper-layer");
    const byName = Object.fromEntries(layers.map(l => [l.dataset.paint, l]));
    const markers = $$("[data-paint-marker]");
    const state = new Map(layers.map(l => [l.dataset.paint, { o: 0, target: 0, arriving: false }]));
    let stops = [];
    let anim = 0, lastT = 0;
    const smooth = t => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

    const measure = () => {
      stops = [{ top: 0, name: "dorm" },
        ...markers.map(n => ({ top: n.getBoundingClientRect().top + scrollY, name: n.dataset.paintMarker }))];
      update();
    };

    // 滚动只负责算「目标值」；真正落到画面由 tick 按帧平滑趋近，
    // 滚动再快，切换也是一段优雅的滑入，而不是硬切
    const update = () => {
      if (!stops.length) return;
      const line = scrollY + innerHeight * 0.62;
      let idx = 0;
      for (let i = 0; i < stops.length; i++) { if (stops[i].top <= line) idx = i; else break; }
      const cur = stops[idx];
      const prev = stops[Math.max(0, idx - 1)];
      const dist = Math.min(innerHeight * 1.8, Math.max(420, (stops[idx + 1]?.top ?? Infinity) - cur.top));
      let amount = idx === 0 ? 1 : smooth((line - cur.top) / dist);
      if (reduced.matches) amount = 1;
      const under = byName[prev.name], above = byName[cur.name];
      if (!under || !above) return;
      const done = amount > 0.98; // 到位后释放底层：两张大图长期叠着合成太重
      for (const l of layers) {
        const s = state.get(l.dataset.paint);
        const isAbove = l === above;
        s.target = l === under && !done ? 1 : isAbove ? amount : 0;
        // 到达中的那一层用笔刷蒙版扫入；完全到位后摘掉蒙版
        s.arriving = isAbove && l !== under && !done && amount > 0.002;
        if (reduced.matches) s.o = s.target;
      }
      if (!anim) { lastT = performance.now(); anim = requestAnimationFrame(tick); }
      // rAF 被节流时的兜底
      setTimeout(() => { if (!anim && !reduced.matches) { lastT = performance.now(); anim = requestAnimationFrame(tick); } }, 160);
    };

    const tick = t => {
      const dt = Math.min(0.05, Math.max(0.004, (t - lastT) / 1000));
      lastT = t;
      const k = 1 - Math.exp(-dt * 5.5);
      let moving = false;
      for (const l of layers) {
        const s = state.get(l.dataset.paint);
        const delta = s.target - s.o;
        if (Math.abs(delta) > 0.0015) { s.o += delta * k; moving = true; }
        else s.o = s.target;
        l.style.opacity = s.o.toFixed(3);
        if (s.arriving && s.o > 0.002 && s.o < 0.985) {
          l.classList.add("is-arriving");
          l.style.setProperty("--brush-x", `${30 + s.o * 200}%`);
          l.style.setProperty("--brush-y", `${25 + s.o * 150}%`);
          // 湿颜料高光 + 轻微缩放沉降：新画到达时更亮、略放大，随后落定
          l.style.setProperty("--wet", (1 + (1 - s.o) * 0.3).toFixed(3));
          l.style.transform = `scale(${(1 + (1 - s.o) * 0.05).toFixed(4)})`;
        } else {
          if (l.classList.contains("is-arriving")) l.classList.remove("is-arriving");
          if (l.style.getPropertyValue("--wet")) { l.style.removeProperty("--wet"); l.style.removeProperty("transform"); }
        }
      }
      anim = moving ? requestAnimationFrame(tick) : 0;
    };

    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", measure, { passive: true });
    addEventListener("pageshow", measure);
    reduced.addEventListener("change", update);
    document.fonts?.ready.then(measure);
    measure();
  })();

  /* ---------- 渐显 ---------- */
  (() => {
    // 只给叙事时刻安静的入场：JS 运行前不隐藏任何内容
    $$(".chapter-shell h2.chapter-title, .chapter-shell .thesis, .big-number, .widget, .method-card, .you-box")
      .forEach(n => { if (!n.closest(".landscape-frame")) n.classList.add("reveal"); });
    if (!("IntersectionObserver" in window) || !Element.prototype.animate || reduced.matches) {
      $$(".reveal").forEach(n => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$(".reveal").forEach(n => io.observe(n));
  })();

  /* ---------- 序章麻绳：随滚动描线 ---------- */
  (() => {
    const journey = $("#search-journey");
    if (!journey) return;
    const svg = $(".rope", journey);
    const steps = $$(".journey-step", journey);
    const main = $(".rope-main", svg), track = $(".rope-track", svg), fibre = $(".rope-fibre", svg);
    let points = [], frame = 0;
    function drawRope() {
      if (innerWidth <= 760) { svg.style.display = "none"; steps.forEach(s => s.classList.add("is-traced")); return; }
      svg.style.display = "";
      const r = journey.getBoundingClientRect();
      points = steps.map(s => {
        const k = $(".rope-knot", s).getBoundingClientRect();
        return { x: k.left - r.left + k.width / 2, y: k.top - r.top + k.height / 2 };
      });
      svg.setAttribute("viewBox", `0 0 ${Math.round(r.width)} ${Math.round(r.height)}`);
      const route = off => {
        // 从 01 的绳结圆心出发，依次连到 02/03/04——不在结外绕弯，结内由实底色遮住
        const first = points[0];
        let d = `M ${first.x + off} ${first.y}`, last = first;
        for (let i = 1; i < points.length; i++) {
          const p = points[i];
          const dy = (p.y - last.y) * 0.4;
          d += ` C ${last.x + off + 24} ${last.y}, ${p.x + off - 24} ${p.y}, ${p.x + off} ${p.y}`;
          last = p;
        }
        return d;
      };
      main.setAttribute("d", route(0));
      track.setAttribute("d", route(-4));
      fibre.setAttribute("d", route(3));
      queue();
    }
    function update() {
      frame = 0;
      const r = journey.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= innerHeight) return;
      const readY = innerHeight * 0.73 - r.top;
      const prog = reduced.matches ? 1 : clamp(readY / r.height, 0, 1);
      journey.style.setProperty("--rope-progress", prog.toFixed(4));
      steps.forEach((s, i) => {
        const reached = prog * r.height > (points[i]?.y ?? Infinity) - 40;
        s.classList.toggle("is-traced", reduced.matches || reached);
      });
    }
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    if ("ResizeObserver" in window) new ResizeObserver(drawRope).observe(journey);
    drawRope();
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", drawRope, { passive: true });
    document.fonts?.ready.then(drawRope);
    queue();
  })();

  /* ---------- 目录菜单 ---------- */
  (() => {
    const menu = $(".reading-menu");
    menu?.addEventListener("click", e => { if (e.target.closest("a")) menu.open = false; });
    addEventListener("keydown", e => {
      if (e.key === "Escape" && menu?.open) { menu.open = false; menu.querySelector("summary").focus(); }
    });
  })();

  /* ---------- 开场搜索对话（状态机） ---------- */
  const user = (() => {
    // 直觉存档进 sessionStorage：中途刷新不丢，尾声仍能对答案
    try {
      const saved = JSON.parse(sessionStorage.getItem("bayes-user") || "null");
      if (saved && typeof saved.place === "number") return saved;
    } catch { /* 忽略损坏的存档 */ }
    return { place: null, belief: null, est: null };
  })();
  const saveUser = () => { try { sessionStorage.setItem("bayes-user", JSON.stringify(user)); } catch { /* 隐私模式等场景忽略 */ } };
  (() => {
    const dialog = $("#search-dialog");
    const copy = $("#dialog-copy"), options = $("#dialog-options"), status = $("#dialog-status");
    const clock = $("#dialog-clock"), map = $("#campus-map");
    const response = $("#dialog-response");
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clearAll = () => { timers.forEach(clearTimeout); timers.length = 0; clearInterval(clockTimer); clockTimer = null; };
    let clockTimer = null;
    let bodyPrevOverflow = "";

    const setStatus = t => { status.textContent = t; };
    const setCopy = t => { copy.textContent = t; };
    const clearOptions = () => { options.replaceChildren(); options.style.display = ""; };
    const addOption = (label, value, hint) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ghost-button";
      b.textContent = label;
      if (hint) b.title = hint;
      b.addEventListener("click", () => value());
      options.append(b);
      return b;
    };
    const highlightLoc = i => {
      $$(".loc-rect", map).forEach(r => r.classList.toggle("is-active", Number(r.dataset.loc) === i));
    };

    /* 步骤 0：选地点 */
    function stepChoose() {
      clearAll();
      response.hidden = true;
      clock.textContent = "";
      highlightLoc(-1);
      setCopy("周三晚上九点半。你摸向口袋——耳机不见了。最后确定戴着它，是下午在图书馆。你会先去哪里找？");
      clearOptions();
      LOCS.forEach((loc, i) => {
        addOption(`去${loc.name}找`, () => stepSearch(i));
      });
      setStatus("");
    }

    /* 步骤 1：搜索动画 → 失败 */
    function stepSearch(i) {
      clearAll();
      clearOptions();
      user.place = i;
      highlightLoc(i);
      const loc = LOCS[i];
      setStatus(`正在${loc.name}搜索……`);
      if (reduced.matches) { return afterSearch(i); }
      let sec = 0;
      clock.textContent = "00:00";
      clockTimer = setInterval(() => {
        sec += 1;
        clock.textContent = `00:${String(sec).padStart(2, "0")}`;
      }, 700);
      const lines = [
        `你走进${loc.name}，沿座位、桌面、缝隙，一格一格地找。`,
        "你越找越仔细，耳机还是没有出现……",
      ];
      later(() => setCopy(lines[0]), 200);
      later(() => setCopy(lines[1]), 1600);
      later(() => afterSearch(i), 3000);    }

    function afterSearch(i) {
      clearAll();
      setCopy(`一遍完整搜索，${LOCS[i].name}——没有找到。`);
      setStatus("");
      later(() => stepBelief(), 1100);
    }

    /* 步骤 2：认知判断 */
    function stepBelief() {
      clock.textContent = ""; // 搜索已结束，别让计时器悬在半空
      setCopy("问题来了：这次「没找到」，能不能说明耳机不在" + LOCS[user.place].name + "？");
      clearOptions();
      setStatus("");
      addOption("能说明，它肯定不在了", () => stepEstimate(1));
      addOption("不能说明，只是可能性变小了", () => stepEstimate(2));
      addOption("说不准", () => stepEstimate(0));
    }

    /* 步骤 3：数值估计 */
    function stepEstimate(belief) {
      user.belief = belief;
      saveUser();
      setCopy("再进一步——如果反复搜下去，你觉得此时耳机还在这" + (user.place === 0 ? "里" : "个场景概率最高的地方") + "的概率大约是多少？（拖动滑块，凭直觉即可）");
      clearOptions();
      const wrap = document.createElement("div");
      wrap.className = "calc-field";
      wrap.style.marginTop = "10px";
      wrap.innerHTML = `<label for="dlg-est">你的估计 <output id="dlg-est-out">17%</output></label>
        <input type="range" id="dlg-est" min="0" max="80" step="1" value="17" />`;
      options.append(wrap);
      const slider = $("#dlg-est", wrap), out = $("#dlg-est-out", wrap);
      slider.addEventListener("input", () => { out.textContent = slider.value + "%"; });
      addOption("就这个数，提交", () => finish(user.place, belief, Number(slider.value)));
      setStatus("提交后我们把这组直觉存起来，读完数据回来对答案。");
    }

    /* 结束面板 */
    function finish(place, belief, est) {
      clearAll();
      user.est = est;
      saveUser();
      options.replaceChildren();
      const mood = belief === 1 ? "loss" : belief === 2 ? "safe" : "neutral";
      $("#response-state").dataset.mood = mood;
      $("#response-state").textContent = "模拟搜索 · 直觉已存档";
      $("#response-title").textContent =
        belief === 1 ? "你把「没找到」当成了「不在」。" :
        belief === 2 ? "你的直觉和贝叶斯站在同一边。" : "你保留了判断的余地。";
      $("#response-copy").textContent =
        `你的答案：先搜${LOCS[place].name} · 判断「${BELIEF[belief]}」 · 估计还剩 ${est}%。` +
        "350 位答题者的版本各不相同——读完 PART 04，回来对一对。";
      response.hidden = false;
      renderYouBox();
      $("#enter-story").focus();
    }

    function open() {
      if (dialog.open) return;
      bodyPrevOverflow = document.body.style.overflow;
      stepChoose();
      dialog.showModal();
      document.body.style.overflow = "hidden";
    }
    function close() {
      clearAll();
      document.body.style.overflow = bodyPrevOverflow;
      dialog.close();
    }
    $("#start-search").addEventListener("click", open);
    $("#replay-search").addEventListener("click", open);
    $("#dialog-close").addEventListener("click", close);
    $("#try-again").addEventListener("click", () => { response.hidden = true; stepChoose(); });
    $("#enter-story").addEventListener("click", () => { close(); location.hash = "opening"; });
    dialog.addEventListener("cancel", e => { e.preventDefault(); close(); });
    dialog.addEventListener("close", () => { clearAll(); document.body.style.overflow = bodyPrevOverflow; });
  })();

  /* ---------- 100 个可能世界 ---------- */
  (() => {
    const grid = $("#world-grid");
    if (!grid) return;
    const status = $("#world-status");
    const cells = [];
    // 按先验分配：40 金 / 25 绿 / 35 橙，用固定种子的伪随机打散
    const kinds = [...Array(40).fill("lib"), ...Array(25).fill("room"), ...Array(35).fill("caf")];
    let seed = 42;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    kinds.forEach(k => {
      const d = document.createElement("span");
      d.className = `world-cell ${k}`;
      grid.append(d);
      cells.push(d);
    });
    let searched = false;
    function doSearch() {
      if (searched) return;
      searched = true;
      $("#world-search").disabled = true;
      // 移除图书馆世界里被检出率拿走的 70%：40 × 0.7 = 28 个
      const libCells = cells.filter(c => c.classList.contains("lib"));
      const removed = libCells.slice(0, 28);
      removed.forEach((c, i) => {
        if (reduced.matches) { c.classList.add("is-removed"); return; }
        setTimeout(() => c.classList.add("is-removed"), 45 * i);
      });
      const done = () => {
        status.innerHTML = "失败发生了。金色世界剩 <strong>12</strong> 个，绿色 25 个、橙色 35 个一个没少——共 72 个世界仍开着。图书馆占 <strong>12 ÷ 72 = 16.7%</strong>。「能说明」的世界里，这 12 格本该全部消失。";
      };
      if (reduced.matches) done();
      else setTimeout(done, 45 * 28 + 600);
    }
    function reset() {
      searched = false;
      $("#world-search").disabled = false;
      cells.forEach(c => c.classList.remove("is-removed"));
      status.textContent = "搜索尚未开始。100 个世界都还开着。";
    }
    $("#world-search").addEventListener("click", doSearch);
    $("#world-reset").addEventListener("click", reset);
  })();

  /* ---------- 机制滚动叙事 ---------- */
  (() => {
    const reader = $("#mech-reader");
    if (!reader) return;
    const scenes = $$("[data-mech-scene]", reader);
    const nodes = $$("[data-mech-step]", reader);
    const panels = $$(".mech-panel", reader.parentElement);
    const count = $("#mech-count"), caption = $("#mech-caption"), live = $("#mech-live");
    const labels = ["先验：搜索开始前的信念", "检出率：搜索不是扫描", "证据：失败也需要定价", "后验：被证据改写过的信念"];
    const steps = ["先验", "检出率", "证据", "后验"];
    let current = -1, scheduled = 0;
    function show(i) {
      if (i === current) return;
      current = i;
      reader.dataset.step = String(i);
      scenes.forEach((s, k) => { s.hidden = k !== i; });
      nodes.forEach((n, k) => {
        if (k === i) n.setAttribute("aria-current", "step"); else n.removeAttribute("aria-current");
      });
      count.textContent = `0${i + 1} / 04`;
      caption.textContent = labels[i];
      live.innerHTML = `当前步骤：<strong>${steps[i]}</strong>`;
    }
    function follow() {
      scheduled = 0;
      const line = Math.max(150, innerHeight * 0.46);
      let idx = 0;
      panels.forEach((p, k) => { if (p.getBoundingClientRect().top <= line) idx = k; });
      show(idx);
    }
    const queue = () => { if (!scheduled) scheduled = requestAnimationFrame(follow); };
    function go(i) {
      panels[i].scrollIntoView({ block: "start", behavior: reduced.matches ? "instant" : "smooth" });
    }
    nodes.forEach((n, i) => {
      n.addEventListener("click", () => go(i));
      n.addEventListener("keydown", e => {
        let t;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") t = Math.min(i + 1, nodes.length - 1);
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") t = Math.max(i - 1, 0);
        if (e.key === "Home") t = 0;
        if (e.key === "End") t = nodes.length - 1;
        if (t === undefined) return;
        e.preventDefault();
        nodes[t].focus({ preventScroll: true });
        go(t);
      });
    });
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue, { passive: true });
    new ResizeObserver(queue).observe($("#mech-scroll"));
    follow();
  })();

  /* ---------- 参数计算器 ---------- */
  (() => {
    const prior = $("#calc-prior"), det = $("#calc-det");
    if (!prior) return;
    const priorOut = $("#calc-prior-out"), detOut = $("#calc-det-out");
    const numeEl = $("#calc-nume"), denoEl = $("#calc-deno"), postEl = $("#calc-posterior"), noteEl = $("#calc-note");
    function render() {
      const P = Number(prior.value) / 100, p = Number(det.value) / 100;
      const nume = P * (1 - p), deno = nume + (1 - P);
      const post = deno > 0 ? nume / deno : 0;
      priorOut.textContent = Math.round(P * 100) + "%";
      detOut.textContent = Math.round(p * 100) + "%";
      numeEl.textContent = nume.toFixed(3);
      denoEl.textContent = deno.toFixed(3);
      postEl.textContent = (post * 100).toFixed(2) + "%";
      noteEl.textContent =
        p >= 0.95 ? "p 在 95% 以上时，「没找到」才几乎等于「不在」——「能说明」要成立，搜索得做到这个程度。"
        : p <= 0.4 ? "p 在 40% 以下：失败几乎不提供信息，后验和先验差不多——搜了等于没搜。"
        : "课堂情境附近：一次失败就能把概率砍掉一大半，但离零还很远。";
    }
    [prior, det].forEach(s => s.addEventListener("input", () => {
      $$(".calc-presets .pill").forEach(b => b.setAttribute("aria-pressed", "false"));
      render();
    }));
    $$(".calc-presets .pill").forEach(b => b.addEventListener("click", () => {
      const [pv, dv] = b.dataset.preset.split(",").map(Number);
      prior.value = pv; det.value = dv;
      $$(".calc-presets .pill").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      render();
    }));
    render();
  })();

  /* ---------- 搜索策略板 ---------- */
  (() => {
    const board = $("#strategy-widget");
    if (!board) return;
    const live = $("#strategy-live");
    let fails = [1, 0, 0]; // 图书馆已失败一次
    function posterior(f) {
      const w = LOCS.map((l, i) => l.prior * Math.pow(1 - l.det, f[i]));
      const Z = w.reduce((a, b) => a + b, 0);
      return w.map(x => x / Z);
    }
    function render() {
      const post = posterior(fails);
      const expected = post.map((p, i) => p * LOCS[i].det);
      const best = expected.indexOf(Math.max(...expected));
      const total = fails.reduce((a, b) => a + b, 0);
      LOCS.forEach((loc, i) => {
        const card = $(`[data-search="${i}"]`)?.closest(".loc-card");
        card.querySelector('[data-loc="p"]').textContent = (post[i] * 100).toFixed(1) + "%";
        card.querySelector('[data-loc="e"]').textContent = (expected[i] * 100).toFixed(1) + "%";
        card.querySelector('[data-loc="bar"]').style.width = (post[i] * 100).toFixed(1) + "%";
        card.classList.toggle("is-optimal", i === best);
        const tag = card.querySelector("[data-opt-tag]");
        tag.hidden = i !== best;
        const f = fails[i];
        card.querySelector('[data-loc="fail"]').textContent =
          f === 0 ? "尚未搜过" : `已连续失败 ${f} 次 · 每失败一次概率 ×${Math.round((1 - loc.det) * 100)}%`;
      });
      const order = expected.map((e, i) => ({ e, i })).sort((a, b) => b.e - a.e);
      live.innerHTML = total === 1
        ? "图书馆已失败一次。概率最高的地点是食堂，但期望最高的却是<strong>教室</strong>——下一站：教室。"
        : `共失败 ${total} 次。当前期望排序：${order.map(o => `${LOCS[o.i].name} ${(o.e * 100).toFixed(1)}%`).join(" ＞ ")}。建议下一站：<strong>${LOCS[best].name}</strong>。`;
    }
    $$("#strategy-widget .search-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        fails[Number(btn.dataset.search)] += 1;
        render();
      });
    });
    $("#strategy-reset").addEventListener("click", () => { fails = [1, 0, 0]; render(); });
    render();
  })();

  /* ---------- 证据章节：进入视口再画 ---------- */
  const whenSeen = (sel, fn, threshold = 0.3) => {
    const el = typeof sel === "string" ? $(sel) : sel;
    if (!el) return;
    if (!("IntersectionObserver" in window) || reduced.matches) { fn(el); return; }
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { fn(el); io.disconnect(); }
    }, { threshold });
    io.observe(el);
  };
  const setW = (el, pct) => { el.style.width = clamp(pct, 0, 100) + "%"; };

  /* 翻转矩阵 */
  whenSeen("#flip-matrix", root => {
    $$("i[data-w]", root).forEach(bar => setW(bar, Number(bar.dataset.w) / 350 * 100));
  });

  /* 序章先验条（此前漏了驱动，条一直是空的） */
  whenSeen("#prior-widget", root => {
    $$("i[data-w]", root).forEach(bar => setW(bar, Number(bar.dataset.w)));
  });

  /* 前后测对比表的双条 */
  whenSeen("#compare-widget", root => {
    $$("i[data-w]", root).forEach(bar => setW(bar, Number(bar.dataset.w)));
  });

  /* 前后测直方图（由逐人数据现算） */
  (() => {
    const pre = $("#hist-pre .hist-cols"), post = $("#hist-post .hist-cols");
    if (!pre || !post) return;
    const buckets = [v => v === 0, v => v > 0 && v < 10, v => v >= 10 && v < 14, v => v >= 14 && v <= 19, v => v >= 20 && v < 30, v => v >= 30];
    const edges = [[0, 0], [1, 9], [10, 13], [14, 19], [20, 29], [30, 80]];
    function counts(field) {
      const vals = PEOPLE.map(r => r[field]).filter(v => v !== 999);
      const c = buckets.map(() => 0);
      vals.forEach(v => buckets.forEach((b, i) => { if (b(v)) c[i] += 1; }));
      return c;
    }
    function draw(root, data) {
      const max = Math.max(...data, 1);
      const cols = $(".hist-cols", root);
      data.forEach((n, i) => {
        const col = document.createElement("div");
        col.className = "hist-col" + (i === 3 ? " is-band" : "");
        const bar = document.createElement("div");
        bar.className = "col-bar";
        bar.style.height = "0%";
        // 数字骑在柱顶，随柱一起长高，避免和标题挤在一起
        const num = document.createElement("span");
        num.className = "col-n";
        num.textContent = String(n);
        bar.append(num);
        col.append(bar);
        cols.append(col);
        setTimeout(() => { bar.style.height = (n / max * 100).toFixed(1) + "%"; }, reduced.matches ? 0 : 120 * i + 80);
        col.setAttribute("aria-label", `${edges[i][0]}–${edges[i][1]}%：${n} 人`);
      });
    }
    const cPre = counts(4), cPost = counts(5);
    whenSeen("#hist-widget", () => {
      draw($("#hist-pre"), cPre);
      draw($("#hist-post"), cPost);
    }, 0.25);
  })();

  /* 流向图：前测再搜 → 后测再搜 */
  (() => {
    const svg = $("#flow-svg");
    if (!svg) return;
    const names = ["图书馆", "教室", "食堂", "不确定"];
    const colors = ["var(--gold)", "var(--mint)", "var(--coral)", "var(--slate)"];
    const cross = names.map(() => names.map(() => 0));
    PEOPLE.forEach(r => { cross[r[6]][r[7]] += 1; });
    const NS = "http://www.w3.org/2000/svg";
    const H = 330, gap = 26, x1 = 210, x2 = 690;
    const leftOrder = [2, 1, 0, 3], rightOrder = [1, 2, 0, 3];
    const preTotals = names.map((_, i) => cross[i].reduce((a, b) => a + b, 0));
    const postTotals = names.map((_, j) => cross.reduce((a, row) => a + row[j], 0));
    // 按显示顺序堆叠各列分段，返回 idx → {y,h} 映射
    function stack(order, totals) {
      const usable = H - gap * (order.length - 1);
      const total = order.reduce((a, j) => a + totals[j], 0);
      let y = 24;
      const segs = {};
      order.forEach(j => {
        const h = totals[j] / total * usable;
        segs[j] = { y, h };
        y += h + gap;
      });
      return segs;
    }
    const leftSegs = stack(leftOrder, preTotals);
    const rightSegs = stack(rightOrder, postTotals);
    // 画弧（n ≥ 10），宽度按人数；弧端点在各自分段内按消耗顺序下移
    const flows = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (cross[i][j] >= 10) flows.push([i, j, cross[i][j]]);
    flows.sort((a, b) => b[2] - a[2]);
    const leftUsed = [0, 0, 0, 0], rightUsed = [0, 0, 0, 0];
    flows.forEach(([i, j, n]) => {
      const w = Math.max(2, n / 350 * 240);
      const y1 = leftSegs[i].y + leftUsed[i] + w / 2;
      const y2 = rightSegs[j].y + rightUsed[j] + w / 2;
      leftUsed[i] += w; rightUsed[j] += w;
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", `M ${x1} ${y1} C ${x1 + 180} ${y1}, ${x2 - 180} ${y2}, ${x2} ${y2}`);
      path.setAttribute("class", "flow-arc");
      path.setAttribute("stroke", colors[i]);
      path.setAttribute("stroke-width", String(w));
      const title = document.createElementNS(NS, "title");
      title.textContent = `${names[i]} → ${names[j]}：${n} 人`;
      path.append(title);
      svg.append(path);
    });
    // 列标签：组名一组，列名（前测/后测）只在每列顶部出现一次
    function labels(x, segs, order, totals, side) {
      order.forEach(j => {
        const seg = segs[j];
        const anchor = side === "l" ? "end" : "start";
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", side === "l" ? x - 14 : x + 14);
        t.setAttribute("y", seg.y + seg.h / 2);
        t.setAttribute("text-anchor", anchor);
        t.textContent = `${names[j]} ${totals[j]}`;
        svg.append(t);
      });
      const cap = document.createElementNS(NS, "text");
      cap.setAttribute("x", side === "l" ? x - 14 : x + 14);
      cap.setAttribute("y", segs[order[0]].y - 18);
      cap.setAttribute("text-anchor", side === "l" ? "end" : "start");
      cap.setAttribute("class", "flow-cnt");
      cap.textContent = side === "l" ? "前测" : "后测";
      svg.append(cap);
    }
    labels(x1, leftSegs, leftOrder, preTotals, "l");
    labels(x2, rightSegs, rightOrder, postTotals, "r");
  })();

  /* 350 份答卷档案板 */
  (() => {
    const board = $("#archive-board");
    if (!board) return;
    const frag = document.createDocumentFragment();
    PEOPLE.forEach((r, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "archive-card";
      // 纸感：每张答卷一个固定的小角度偏转
      b.style.rotate = `${(((i * 7) % 5) - 2) * 1.3}deg`;
      if (inBand(r[5])) b.classList.add("is-post-ok");
      if (r[2] !== r[3]) b.classList.add("is-flipped");
      const estPre = r[4] === 999 ? "未作答" : r[4] + "%";
      const estPost = r[5] === 999 ? "未作答" : r[5] + "%";
      b.setAttribute("aria-label", `第 ${i + 1} 位：${STAGE[r[0]]}，前测${BELIEF[r[2]]}→后测${BELIEF[r[3]]}，估计 ${estPre}→${estPost}`);
      const tip = document.createElement("span");
      tip.className = "tip";
      tip.setAttribute("aria-hidden", "true");
      tip.innerHTML =
        `<b>第 ${i + 1} 位 · ${STAGE[r[0]]}${r[10] ? " · 完成演示" : ""}</b><br>` +
        `判断：${BELIEF[r[2]]} → ${BELIEF[r[3]]}${r[2] !== r[3] ? " ✦已改变" : ""}<br>` +
        `估计：${estPre} → ${estPost}<br>` +
        `下一站：${PLACE[r[6]]} → ${PLACE[r[7]]}<br>` +
        `把握度：${r[8]} → ${r[9]}`;
      b.append(tip);
      frag.append(b);
    });
    board.append(frag);
  })();

  /* ---------- 答卷详情 dialog ---------- */
  (() => {
    const dialog = $("#person-dialog");
    const board = $("#archive-board");
    if (!dialog || !board) return;
    let returnFocus = null;
    function open(i, btn) {
      const r = PEOPLE[i];
      returnFocus = btn;
      $("#person-kicker").textContent = `答卷 ${String(i + 1).padStart(3, "0")} / 350`;
      $("#person-title").textContent = `一位${STAGE[r[0]]}的同学`;
      $("#pf-stage").textContent = `${STAGE[r[0]]} · ${r[10] ? "完整完成演示" : "尚未完成演示"}`;
      $("#pf-belief").innerHTML = `${BELIEF[r[2]]} → <b>${BELIEF[r[3]]}</b>${r[2] !== r[3] ? "　✦ 判断已改变" : ""}`;
      const e1 = r[4] === 999 ? "未作答" : r[4] + "%";
      const e2 = r[5] === 999 ? "未作答" : r[5] + "%";
      $("#pf-est").innerHTML = `${e1} → <b>${e2}</b>${inBand(r[5]) ? "　✦ 落在计算区间 14%–19%" : ""}`;
      $("#pf-next").textContent = `${PLACE[r[6]]} → ${PLACE[r[7]]}`;
      $("#pf-conf").textContent = `${r[8]} 分 → ${r[9]} 分`;
      $("#pf-note").textContent = r[12] < 4
        ? `自述最难理解的一步：${HARDEST[r[12]]}。`
        : "未填写「最难理解的一步」。";
      dialog.showModal();
      $("#person-title").focus();
    }
    function close() {
      dialog.close();
      if (returnFocus) returnFocus.focus({ preventScroll: true });
    }
    board.addEventListener("click", e => {
      const card = e.target.closest(".archive-card");
      if (!card) return;
      open([...board.children].indexOf(card), card);
    });
    $("#person-close").addEventListener("click", close);
    dialog.addEventListener("cancel", e => { e.preventDefault(); close(); });
  })();

  /* ---------- 南丁格尔玫瑰：最难理解的一步 ---------- */
  (() => {
    const svg = $("#hard-rose");
    if (!svg) return;
    const NS = "http://www.w3.org/2000/svg";
    const META = [
      { name: "失败后如何重算概率", inner: "#f0d49a", outer: "#c08c34", link: "#bayes", chap: "回看 PART 02 ↗" },
      { name: "分不清位置概率和找到概率", inner: "#efab90", outer: "#b55a3e", link: "#strategy", chap: "回看 PART 03 ↗" },
      { name: "三地同时归一化", inner: "#c4e6d6", outer: "#6fa88c", link: "#appendix", chap: "公式速查 ↗" },
      { name: "演示操作本身", inner: "#8fa3b3", outer: "#4a5f72", link: null, chap: null },
      { name: "未作答", inner: "#485d6f", outer: "#2e3f4e", link: null, chap: null },
    ];
    const counts = META.map((_, k) => PEOPLE.filter(r => r[12] === k).length);
    const total = counts.reduce((a, b) => a + b, 0);
    const cx = 290, cy = 288, r0 = 62, R = 208;
    const el = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      return n;
    };
    // 渐变与参考环
    const defs = el("defs", {});
    META.forEach((m, i) => {
      const grad = el("radialGradient", { id: `rose-grad-${i}`, gradientUnits: "userSpaceOnUse", cx, cy, r: R });
      grad.append(el("stop", { offset: "0%", "stop-color": m.inner }));
      grad.append(el("stop", { offset: "100%", "stop-color": m.outer }));
      defs.append(grad);
    });
    svg.append(defs);
    svg.append(el("circle", { class: "rose-guide", cx, cy, r: R + 10 }));
    // 人数降序排列，未作答固定垫底且弱化
    const seq = [...counts.keys()].filter(i => i !== 4).sort((a, b) => counts[b] - counts[a]).concat(4);
    const stepAngle = Math.PI * 2 / seq.length, gap = 0.055;
    const maxV = Math.max(...counts.filter((_, i) => i !== 4));
    const petalR = v => r0 + Math.sqrt(v / maxV) * (R - r0);
    const pol = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    const petalPath = (r, a0, a1) =>
      `M ${pol(r0, a0)} L ${pol(r, a0)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pol(r, a1)} L ${pol(r0, a1)} A ${r0} ${r0} 0 0 0 ${pol(r0, a0)} Z`;
    const readout = $("#rose-readout");
    const say = msg => { if (readout) readout.innerHTML = msg; };
    const gAll = el("g", {});
    svg.append(gAll);
    let slot = 0;
    seq.forEach(idx => {
      const a0 = -Math.PI / 2 + slot * stepAngle + gap;
      const a1 = -Math.PI / 2 + (slot + 1) * stepAngle - gap;
      const mid = (a0 + a1) / 2;
      const r = petalR(counts[idx]);
      const g = el("g", { class: "petal-g" });
      g.style.transitionDelay = `${slot * 90}ms`;
      const pct = (counts[idx] / total * 100).toFixed(1);
      const path = el("path", {
        d: petalPath(r, a0, a1), fill: `url(#rose-grad-${idx})`,
        class: "petal" + (META[idx].link ? " is-link" : ""),
        tabindex: "0", role: "img",
        "aria-label": `${META[idx].name}：${counts[idx]} 人，占 ${pct}%${META[idx].link ? "，按回车跳转对应章节" : ""}`,
      });
      const hot = on => {
        path.classList.toggle("is-hot", on);
        svg.classList.toggle("has-hot", on);
        if (on) say(`<strong>${META[idx].name}</strong> · ${counts[idx]} 人（${pct}%）${META[idx].link ? ` · <a href="${META[idx].link}">${META[idx].chap}</a>` : ""}`);
        else say("悬停或用键盘聚焦花瓣，查看每一步的人数与占比。");
        g.style.transform = on ? `translate(${(Math.cos(mid) * 6).toFixed(1)}px, ${(Math.sin(mid) * 6).toFixed(1)}px)` : "";
      };
      path.addEventListener("pointerenter", () => hot(true));
      path.addEventListener("pointerleave", () => hot(false));
      path.addEventListener("focus", () => hot(true));
      path.addEventListener("blur", () => hot(false));
      if (META[idx].link) {
        path.addEventListener("click", () => { location.hash = META[idx].link; });
        path.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); location.hash = META[idx].link; } });
      }
      g.append(path);
      gAll.append(g);
      // 花瓣外侧标签
      const lr = r + 18, lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid);
      const anchor = Math.cos(mid) > 0.25 ? "start" : Math.cos(mid) < -0.25 ? "end" : "middle";
      const label = el("text", { class: "rose-label", x: lx.toFixed(1), y: ly.toFixed(1), "text-anchor": anchor });
      if (Math.abs(Math.sin(mid)) > 0.92) label.setAttribute("y", (ly + (Math.sin(mid) > 0 ? 10 : -6)).toFixed(1));
      const t1 = el("tspan", { x: label.getAttribute("x"), "text-anchor": anchor });
      t1.textContent = META[idx].name;
      const t2 = el("tspan", { class: "sub", x: label.getAttribute("x"), "text-anchor": anchor, dy: "1.35em" });
      t2.textContent = `${counts[idx]} 人 · ${pct}%`;
      label.append(t1, t2);
      svg.append(label);
      slot += 1;
    });
    // 中心圆与总数
    svg.append(el("circle", { class: "rose-center-bg", cx, cy, r: r0 - 7 }));
    const num = el("text", { class: "rose-num", x: cx, y: cy + 2, "text-anchor": "middle" });
    num.textContent = "350";
    const cap = el("text", { class: "rose-cap", x: cx, y: cy + 26, "text-anchor": "middle" });
    cap.textContent = "份答卷";
    svg.append(num, cap);
    // 图例
    const legend = $("#rose-legend");
    if (legend) {
      META.forEach((m, i) => {
        const li = document.createElement("li");
        const pct = (counts[i] / total * 100).toFixed(1);
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.style.background = `linear-gradient(135deg, ${m.inner}, ${m.outer})`;
        const body = document.createElement("span");
        body.innerHTML = `${m.name}　<span class="cnt">${counts[i]}</span> <span class="pct">· ${pct}%</span>` +
          (m.link ? `<span class="more"><a href="${m.link}">${m.chap}</a></span>` : "");
        li.append(chip, body);
        legend.append(li);
      });
    }
    // 进入视口后花瓣生长
    whenSeen("#hard-widget", () => svg.classList.add("rose-armed"), 0.3);
  })();

  /* ---------- 尾声：逐字点亮 + 你的结果 ---------- */
  function renderYouBox() {
    const box = $("#you-copy");
    if (!box) return;
    if (user.place === null) return; // 保持默认引导文案
    const samePlace = PEOPLE.filter(r => r[1] === user.place).length;
    const sameBelief = user.belief === null ? 0 : PEOPLE.filter(r => r[2] === user.belief).length;
    const lines = [];
    lines.push(`你先搜了<strong>${PLACE[user.place]}</strong>——350 人里 ${samePlace} 位（${(samePlace / 3.5).toFixed(1)}%）与你相同。`);
    if (user.belief !== null) {
      lines.push(`你答「${BELIEF[user.belief]}」，和前测里 ${sameBelief} 位同学（${(sameBelief / 3.5).toFixed(1)}%）站在了一起；看完演示，其中大多数人走向了「不能说明」。`);
    }
    if (user.est !== null) {
      const bucketLabel = user.est === 0 ? "0" : user.est < 10 ? "1–9" : user.est <= 13 ? "10–13" : user.est <= 19 ? "14–19（计算区间）" : user.est < 30 ? "20–29" : "30+";
      lines.push(`你的估计 <span class="you-est">${user.est}%</span> 落在「${bucketLabel}」一档。后测里，落在计算区间 14%–19% 的人从前测的 71 位涨到 127 位——回去看看直方图上金色那根柱。`);
    }
    box.innerHTML = lines.join("<br />") + `<br /><a href="#evidence">再看一眼 350 人的数据 ↗</a>`;
  }
  renderYouBox();

  (() => {
    const sentence = $("#finale-sentence");
    const finale = $(".finale");
    if (sentence) {
      sentence.setAttribute("aria-label", sentence.textContent.trim());
      let letterIndex = 0;
      $$(".fin-line", sentence).forEach(line => {
        const nodesInLine = [...line.childNodes];
        line.textContent = "";
        line.setAttribute("aria-hidden", "true");
        nodesInLine.forEach(node => {
          const isEm = node.nodeName === "EM";
          const text = node.textContent;
          [...text].forEach(ch => {
            const s = document.createElement("span");
            s.className = "fin-letter";
            if (isEm) s.style.color = "var(--gold)";
            // 逐字 stagger：点亮时按 55ms 步进浮现
            s.style.transitionDelay = `${letterIndex * 55}ms`;
            letterIndex += 1;
            s.textContent = ch;
            line.append(s);
          });
        });
      });
      whenSeen(".finale", () => finale.classList.add("is-lit"), 0.35);
    }
  })();

  /* ---------- 尾声文字的指针浮动 ---------- */
  (() => {
    const frame = $("#ending");
    if (!frame || !("IntersectionObserver" in window)) return;
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const hosts = $$(".fin-line, .replay-row .action-button, .replay-row .quiet-link, .you-box h3", frame);
    if (!hosts.length) return;
    const groups = hosts.map((host, i) => {
      host.classList.add("float-host");
      const layer = document.createElement("span");
      layer.className = "float-layer";
      layer.append(...host.childNodes);
      host.append(layer);
      return { host, layer, phase: i * 0.7, x: 0, y: 0, tx: 0, ty: 0, strength: 0 };
    });
    let active = null, onScreen = true, raf = 0, prev = 0;
    function reset() {
      active = null;
      groups.forEach(g => { g.strength = 0; g.x = g.y = 0; g.layer.style.removeProperty("transform"); });
    }
    function loop(now) {
      raf = 0;
      if (reduced.matches || document.hidden || !onScreen) { reset(); return; }
      const blend = 1 - Math.exp(-Math.min((now - prev) / 1000, 0.05) * 9);
      prev = now;
      let moving = false;
      groups.forEach(g => {
        const hovered = g === active;
        if (!hovered && g.strength < 0.001 && Math.abs(g.x) + Math.abs(g.y) < 0.05) {
          g.strength = 0; g.x = g.y = 0;
          g.layer.style.removeProperty("transform");
          return;
        }
        g.strength += ((hovered ? 1 : 0) - g.strength) * blend;
        const x = g.strength * (g.tx + Math.sin(now / 1400 + g.phase) * 1.1);
        const y = g.strength * (g.ty - 5 + Math.sin(now / 1100 + g.phase) * 1.6);
        g.x += (x - g.x) * blend;
        g.y += (y - g.y) * blend;
        g.layer.style.transform = `translate(${g.x.toFixed(2)}px,${g.y.toFixed(2)}px)`;
        moving = true;
      });
      if (moving) raf = requestAnimationFrame(loop);
    }
    const wake = () => { if (!raf) { prev = performance.now(); raf = requestAnimationFrame(loop); } };
    frame.addEventListener("pointermove", e => {
      if (e.pointerType === "touch" || reduced.matches || !fine.matches || !onScreen) return;
      const host = e.target.closest(".float-host");
      active = groups.find(g => g.host === host) || null;
      if (active) {
        const b = active.host.getBoundingClientRect();
        active.tx = clamp((e.clientX - b.left) / b.width * 2 - 1, -1, 1) * 3;
        active.ty = clamp((e.clientY - b.top) / b.height * 2 - 1, -1, 1) * 2;
      }
      wake();
    });
    frame.addEventListener("pointerleave", () => { active = null; wake(); });
    addEventListener("blur", reset, { once: false });
    document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
    new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting && entries[0].intersectionRatio > 0.05;
      if (!onScreen) reset();
    }, { threshold: [0, 0.05] }).observe(frame);
  })();
})();
