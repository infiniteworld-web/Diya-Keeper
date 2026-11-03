(() => {
  const cv = document.getElementById("c"),
    ctx = cv.getContext("2d");

  const menu = document.getElementById("menu"),
    over = document.getElementById("over");

  const stage = document.getElementById("stage");

  let W, H, U, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    W = Math.min(window.innerWidth, 480);

    H = Math.min(window.innerHeight, 860);

    U = W / 400;

    cv.width = W * dpr;

    cv.height = H * dpr;

    cv.style.width = W + "px";

    cv.style.height = H + "px";

    stage.style.width = W + "px";

    stage.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (p) {
      p.y = H - 78 * U;

      p.x = Math.min(Math.max(p.x, 40 * U), W - 40 * U);

      tx = p.x;
    }

    makeStars();
  }

  // ---------- sound ----------*

  let ac = null,
    muted = false;

  function beep(f, d = 0.09, type = "sine", v = 0.06, slide = 0) {
    if (muted) return;

    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();

      const o = ac.createOscillator(),
        g = ac.createGain(),
        t = ac.currentTime;

      o.type = type;

      o.frequency.setValueAtTime(f, t);

      if (slide)
        o.frequency.exponentialRampToValueAtTime(
          Math.max(40, f + slide),

          t + d,
        );

      g.gain.setValueAtTime(v, t);

      g.gain.exponentialRampToValueAtTime(0.0001, t + d);

      o.connect(g);

      g.connect(ac.destination);

      o.start(t);

      o.stop(t + d);
    } catch (e) {}
  }

  document.getElementById("mute").onclick = (e) => {
    muted = !muted;

    e.target.textContent = muted ? "Sound off" : "Sound on";
  };

  // ---------- state ----------*

  let state = "menu",
    p = null,
    tx = 0;

  let items = [],
    parts = [],
    texts = [],
    bursts = [],
    stars = [];

  let score = 0,
    best = 0,
    fuel = 1,
    t = 0,
    spawnT = 0,
    combo = 0,
    shake = 0,
    nextBurstAt = 300,
    idleBurst = 0;

  const keys = {};

  function makeStars() {
    stars = [];

    for (let i = 0; i < 70; i++)
      stars.push({
        x: Math.random() * W,

        y: Math.random() * H * 0.8,

        r: Math.random() * 1.4 + 0.3,

        s: Math.random() * 6,
      });
  }

  function reset() {
    p = { x: W / 2, y: H - 78 * U, w: 76 * U };

    tx = p.x;

    items = [];

    parts = [];

    texts = [];

    bursts = [];

    score = 0;

    fuel = 1;

    t = 0;

    spawnT = 0.4;

    combo = 0;

    shake = 0;

    nextBurstAt = 300;
  }

  function startGame() {
    reset();

    state = "play";

    menu.classList.remove("on");

    over.classList.remove("on");

    beep(520, 0.15, "triangle", 0.07, 400);
  }

  function endGame() {
    state = "over";

    best = Math.max(best, score);

    document.getElementById("finalScore").textContent = score;

    document.getElementById("bestLine").textContent = "Best: " + best;

    document.getElementById("rank").textContent = rankFor(score);

    over.classList.add("on");

    beep(300, 0.5, "sawtooth", 0.05, -200);

    for (let i = 0; i < 4; i++)
      setTimeout(
        () =>
          state === "over" &&
          burst(Math.random() * W, H * (0.15 + Math.random() * 0.35)),

        i * 260,
      );
  }

  function rankFor(s) {
    if (s < 300) return "A small spark. Try again!";

    if (s < 800) return "A steady little diya";

    if (s < 1600) return "Keeper of the flame";

    if (s < 3000) return "The lantern of the lane";

    return "Goddess Lakshmi is smiling on you";
  }

  // ---------- items ----------*

  function spawn() {
    const r = Math.random();

    let type;

    const crackerP = t > 12 ? 0.11 : 0;

    if (r < 0.2) type = "water";
    else if (r < 0.2 + crackerP) type = "cracker";
    else if (r < 0.34 + crackerP) type = "ladoo";
    else if (r < 0.5 + crackerP) type = "marigold";
    else type = "oil";

    const rad = (type === "cracker" ? 10 : 13) * U;

    const speed =
      (150 + Math.min(t, 90) * 3.6) * U * (0.85 + Math.random() * 0.4);

    items.push({
      type,

      x: rad + Math.random() * (W - rad * 2),

      y: -30,

      r: rad,

      vy: speed,

      rot: Math.random() * 6,

      sway: Math.random() * 6,
    });
  }

  function collect(it) {
    const good =
      it.type === "oil" || it.type === "ladoo" || it.type === "marigold";

    if (good) {
      combo++;

      const mult = Math.min(5, 1 + Math.floor(combo / 5));

      const base = it.type === "ladoo" ? 50 : it.type === "marigold" ? 25 : 10;

      score += base * mult;

      if (it.type === "oil") fuel = Math.min(1, fuel + 0.22);

      if (it.type === "ladoo") fuel = Math.min(1, fuel + 0.06);

      sparks(
        it.x,

        it.y,

        it.type === "ladoo"
          ? "#ffb21e"
          : it.type === "marigold"
            ? "#ff7a00"
            : "#ffe38a",

        10,
      );

      texts.push({
        x: it.x,

        y: it.y - 10,

        s: "+" + base * mult,

        life: 0.8,

        c: "#fff1b8",
      });

      beep(it.type === "oil" ? 660 : 880, 0.1, "triangle", 0.06, 180);
    } else {
      combo = 0;

      if (it.type === "water") {
        fuel -= 0.28;

        sparks(it.x, it.y, "#4fb3ff", 14);

        shake = 6;

        texts.push({
          x: it.x,

          y: it.y - 10,

          s: "Dim!",

          life: 0.8,

          c: "#8fd0ff",
        });

        beep(180, 0.2, "sawtooth", 0.06, -90);
      } else {
        fuel -= 0.45;

        sparks(it.x, it.y, "#e8316f", 22);

        shake = 12;

        texts.push({
          x: it.x,

          y: it.y - 10,

          s: "Boom!",

          life: 0.9,

          c: "#ff7aa5",
        });

        beep(110, 0.3, "square", 0.07, -50);
      }
    }
  }

  function sparks(x, y, c, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283,
        s = (40 + Math.random() * 160) * U;

      parts.push({
        x,

        y,

        vx: Math.cos(a) * s,

        vy: Math.sin(a) * s - 40 * U,

        life: 0.5 + Math.random() * 0.4,

        max: 0.9,

        c,

        r: (1 + Math.random() * 2) * U,

        g: 260 * U,
      });
    }
  }

  function burst(x, y) {
    const cols = ["#ffb21e", "#e8316f", "#fff1b8", "#8f5bff", "#ff7a00"];

    const c = cols[Math.floor(Math.random() * cols.length)],
      c2 = cols[Math.floor(Math.random() * cols.length)];

    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * 6.283,
        s = (90 + Math.random() * 50) * U;

      bursts.push({
        x,

        y,

        vx: Math.cos(a) * s,

        vy: Math.sin(a) * s,

        life: 1.4,

        max: 1.4,

        c: i % 3 ? c : c2,

        r: 2 * U,
      });
    }

    beep(240, 0.25, "sawtooth", 0.025, 300);
  }

  // ---------- update ----------*

  function update(dt) {
    if (state === "play") {
      t += dt;

      const dir =
        (keys.ArrowRight || keys.d ? 1 : 0) -
        (keys.ArrowLeft || keys.a ? 1 : 0);

      if (dir)
        tx = Math.min(
          W - 30 * U,

          Math.max(30 * U, tx + dir * 520 * U * dt),
        );

      p.x += (tx - p.x) * Math.min(1, dt * 14);

      fuel -= (0.055 + Math.min(t * 0.0011, 0.08)) * dt;

      spawnT -= dt;

      if (spawnT <= 0) {
        spawn();

        spawnT = Math.max(0.32, 0.85 - t * 0.007) * (0.8 + Math.random() * 0.4);
      }

      const catchY = p.y - 26 * U;

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];

        it.y += it.vy * dt;

        it.rot += dt * 3;

        if (
          it.y + it.r > catchY &&
          it.y - it.r < p.y + 10 * U &&
          Math.abs(it.x - p.x) < p.w / 2 + it.r * 0.4
        ) {
          collect(it);

          items.splice(i, 1);
        } else if (it.y > H + 40) items.splice(i, 1);
      }

      if (score >= nextBurstAt) {
        burst(
          W * (0.2 + Math.random() * 0.6),

          H * (0.15 + Math.random() * 0.25),
        );

        nextBurstAt += 300;
      }

      if (fuel <= 0) {
        fuel = 0;

        endGame();
      }
    } else {
      idleBurst -= dt;

      if (idleBurst <= 0) {
        burst(
          W * (0.15 + Math.random() * 0.7),

          H * (0.12 + Math.random() * 0.4),
        );

        idleBurst = 1.1 + Math.random() * 1.2;
      }
    }

    for (const arr of [parts, bursts])
      for (let i = arr.length - 1; i >= 0; i--) {
        const q = arr[i];

        q.life -= dt;

        if (q.life <= 0) {
          arr.splice(i, 1);

          continue;
        }

        q.x += q.vx * dt;

        q.y += q.vy * dt;

        q.vy += (q.g ?? 70 * U) * dt;

        q.vx *= arr === bursts ? 0.985 : 1;
      }

    for (let i = texts.length - 1; i >= 0; i--) {
      const q = texts[i];

      q.life -= dt;

      q.y -= 40 * U * dt;

      if (q.life <= 0) texts.splice(i, 1);
    }

    shake = Math.max(0, shake - dt * 30);
  }

  // ---------- draw ----------*

  function drop(x, y, r, col) {
    ctx.beginPath();

    ctx.moveTo(x, y - r * 1.6);

    ctx.bezierCurveTo(x + r * 1.1, y - r * 0.3, x + r, y + r, x, y + r);

    ctx.bezierCurveTo(
      x - r,

      y + r,

      x - r * 1.1,

      y - r * 0.3,

      x,

      y - r * 1.6,
    );

    ctx.fillStyle = col;

    ctx.fill();
  }

  function drawItem(it) {
    const { x, y, r } = it;

    ctx.save();

    if (it.type === "oil") {
      const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.4);

      g.addColorStop(0, "rgba(255,201,51,.45)");

      g.addColorStop(1, "rgba(255,201,51,0)");

      ctx.fillStyle = g;

      ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);

      drop(x, y, r, "#ffc933");

      ctx.fillStyle = "rgba(255,255,255,.65)";

      ctx.beginPath();

      ctx.ellipse(
        x - r * 0.35,

        y + r * 0.1,

        r * 0.2,

        r * 0.38,

        0.3,

        0,

        7,
      );

      ctx.fill();
    } else if (it.type === "water") {
      drop(x, y, r, "#4fb3ff");

      ctx.fillStyle = "rgba(255,255,255,.55)";

      ctx.beginPath();

      ctx.ellipse(
        x - r * 0.35,

        y + r * 0.1,

        r * 0.2,

        r * 0.38,

        0.3,

        0,

        7,
      );

      ctx.fill();
    } else if (it.type === "ladoo") {
      ctx.fillStyle = "#f59e0b";

      ctx.beginPath();

      ctx.arc(x, y, r * 1.15, 0, 7);

      ctx.fill();

      ctx.fillStyle = "#c2760a";

      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + 0.4,
          d = r * 0.6;

        ctx.beginPath();

        ctx.arc(
          x + Math.cos(a) * d * (i % 2 ? 1 : 0.5),

          y + Math.sin(a) * d * (i % 2 ? 1 : 0.5),

          r * 0.14,

          0,

          7,
        );

        ctx.fill();
      }

      ctx.fillStyle = "#7cc46b";

      ctx.beginPath();

      ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.17, 0, 7);

      ctx.fill();
    } else if (it.type === "marigold") {
      ctx.translate(x, y);

      ctx.rotate(it.rot * 0.3);

      ctx.fillStyle = "#ff7a00";

      for (let i = 0; i < 9; i++) {
        ctx.rotate(6.283 / 9);

        ctx.beginPath();

        ctx.ellipse(r * 0.7, 0, r * 0.62, r * 0.38, 0, 0, 7);

        ctx.fill();
      }

      ctx.fillStyle = "#ffd24a";

      ctx.beginPath();

      ctx.arc(0, 0, r * 0.6, 0, 7);

      ctx.fill();

      ctx.fillStyle = "#e8590c";

      ctx.beginPath();

      ctx.arc(0, 0, r * 0.22, 0, 7);

      ctx.fill();
    } else {
      ctx.translate(x, y);

      ctx.rotate(Math.sin(it.rot) * 0.35);

      ctx.fillStyle = "#e8316f";

      ctx.fillRect(-r * 0.55, -r * 0.9, r * 1.1, r * 1.9);

      ctx.fillStyle = "#ffd24a";

      ctx.fillRect(-r * 0.55, -r * 0.2, r * 1.1, r * 0.3);

      ctx.strokeStyle = "#fff1b8";

      ctx.lineWidth = 1.5 * U;

      ctx.beginPath();

      ctx.moveTo(0, -r * 0.9);

      ctx.lineTo(r * 0.2, -r * 1.35);

      ctx.stroke();

      ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#ffb21e";

      ctx.beginPath();

      ctx.arc(r * 0.2, -r * 1.4, r * 0.28, 0, 7);

      ctx.fill();
    }

    ctx.restore();
  }

  function drawPlayer(time) {
    const { x, y, w } = p;

    const f = state === "menu" ? 0.7 : fuel;

    const low = f < 0.3;

    const flick =
      Math.sin(time * (low ? 30 : 14)) * 0.08 + Math.sin(time * 23) * 0.05;

    // glow lights the area*

    const gr = (60 + f * 190) * U * (1 + flick * 0.5);

    const g = ctx.createRadialGradient(
      x,

      y - 30 * U,

      4,

      x,

      y - 30 * U,

      gr,
    );

    g.addColorStop(0, "rgba(255,190,70," + (0.35 * f + 0.1) + ")");

    g.addColorStop(1, "rgba(255,190,70,0)");

    ctx.fillStyle = g;

    ctx.fillRect(0, 0, W, H);

    // bowl*

    ctx.fillStyle = "#9a3412";

    ctx.beginPath();

    ctx.moveTo(x - w / 2, y - 6 * U);

    ctx.quadraticCurveTo(x, y + 44 * U, x + w / 2, y - 6 * U);

    ctx.closePath();

    ctx.fill();

    ctx.fillStyle = "#c2410c";

    ctx.beginPath();

    ctx.ellipse(x, y - 6 * U, w / 2, 9 * U, 0, 0, 7);

    ctx.fill();

    ctx.fillStyle = "#ffc933";

    ctx.beginPath();

    ctx.ellipse(x, y - 7 * U, w / 2 - 6 * U, 5 * U, 0, 0, 7);

    ctx.fill();

    ctx.strokeStyle = "#ffb21e";

    ctx.lineWidth = 2 * U;

    ctx.beginPath();

    ctx.moveTo(x - w * 0.32, y + 12 * U);

    ctx.quadraticCurveTo(x, y + 28 * U, x + w * 0.32, y + 12 * U);

    ctx.stroke();

    // flame*

    const h = (14 + f * 50) * U * (1 + flick),
      fw = (9 + f * 9) * U;

    const fy = y - 10 * U;

    ctx.save();

    ctx.translate(x + Math.sin(time * 9) * 1.2 * U, fy);

    const fg = ctx.createLinearGradient(0, 0, 0, -h);

    fg.addColorStop(0, "#ff7a00");

    fg.addColorStop(0.5, "#ffc933");

    fg.addColorStop(1, "#fff6c9");

    ctx.fillStyle = fg;

    ctx.beginPath();

    ctx.moveTo(0, -h);

    ctx.bezierCurveTo(fw * 1.2, -h * 0.4, fw, 0, 0, 2 * U);

    ctx.bezierCurveTo(-fw, 0, -fw * 1.2, -h * 0.4, 0, -h);

    ctx.fill();

    ctx.fillStyle = "#4fa7ff";

    ctx.globalAlpha = 0.7;

    ctx.beginPath();

    ctx.ellipse(0, -2 * U, fw * 0.35, h * 0.12, 0, 0, 7);

    ctx.fill();

    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = "rgba(255,255,255,.12)";

    ctx.fillRect(0, 0, W, 8 * U);

    const g = ctx.createLinearGradient(0, 0, W, 0);

    g.addColorStop(0, fuel < 0.3 ? "#e8316f" : "#ff7a00");

    g.addColorStop(1, "#ffd24a");

    ctx.fillStyle = g;

    ctx.fillRect(0, 0, W * Math.max(0, fuel), 8 * U);

    ctx.textBaseline = "top";

    ctx.fillStyle = "#fff6e0";

    ctx.textAlign = "left";

    ctx.font = "700 " + 26 * U + "px Georgia,serif";

    ctx.fillText(score, 14 * U, 20 * U);

    ctx.textAlign = "right";

    ctx.font = "600 " + 13 * U + "px system-ui,sans-serif";

    ctx.fillStyle = "#c9b6ee";

    ctx.fillText("Best " + Math.max(best, score), W - 14 * U, 24 * U);

    if (combo >= 5) {
      const mult = Math.min(5, 1 + Math.floor(combo / 5));

      ctx.textAlign = "center";

      ctx.fillStyle = "#ffb21e";

      ctx.font = "700 " + 15 * U + "px system-ui,sans-serif";

      ctx.fillText("x" + mult + " streak: " + combo, W / 2, 24 * U);
    }
  }

  function draw(time) {
    ctx.save();

    if (shake > 0)
      ctx.translate(
        (Math.random() - 0.5) * shake,

        (Math.random() - 0.5) * shake,
      );

    const bg = ctx.createLinearGradient(0, 0, 0, H);

    bg.addColorStop(0, "#0d0624");

    bg.addColorStop(0.6, "#2a0f4a");

    bg.addColorStop(1, "#4a1450");

    ctx.fillStyle = bg;

    ctx.fillRect(-20, -20, W + 40, H + 40);

    for (const s of stars) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + s.s));

      ctx.fillStyle = "#fff";

      ctx.beginPath();

      ctx.arc(s.x, s.y, s.r, 0, 7);

      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // distant rooftops with tiny lit windows*

    ctx.fillStyle = "#1a0a33";

    for (let i = 0; i < 9; i++) {
      const bw = W / 9,
        bh = (40 + ((i * 37) % 55)) * U;

      ctx.fillRect(i * bw, H - bh, bw + 1, bh);
    }

    ctx.fillStyle = "rgba(255,190,70,.55)";

    for (let i = 0; i < 9; i++) {
      const bw = W / 9,
        bh = (40 + ((i * 37) % 55)) * U;

      if (i % 2 === 0)
        ctx.fillRect(i * bw + bw * 0.35, H - bh + 10 * U, 5 * U, 7 * U);
    }

    for (const b of bursts) {
      ctx.globalAlpha = Math.max(0, b.life / b.max);

      ctx.fillStyle = b.c;

      ctx.beginPath();

      ctx.arc(b.x, b.y, b.r, 0, 7);

      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (p) drawPlayer(time);

    if (state === "play") for (const it of items) drawItem(it);

    for (const q of parts) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);

      ctx.fillStyle = q.c;

      ctx.beginPath();

      ctx.arc(q.x, q.y, q.r, 0, 7);

      ctx.fill();
    }

    ctx.globalAlpha = 1;

    ctx.textAlign = "center";

    ctx.textBaseline = "middle";

    for (const q of texts) {
      ctx.globalAlpha = Math.min(1, q.life * 2);

      ctx.fillStyle = q.c;

      ctx.font = "700 " + 16 * U + "px system-ui,sans-serif";

      ctx.fillText(q.s, q.x, q.y);
    }

    ctx.globalAlpha = 1;

    ctx.restore();

    if (state === "play") drawHUD();
  }

  // ---------- loop ----------*

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);

    last = now;

    update(dt);

    draw(now / 1000);

    requestAnimationFrame(frame);
  }

  // ---------- input ----------*

  function setX(e) {
    const r = cv.getBoundingClientRect();

    tx = Math.min(W - 30 * U, Math.max(30 * U, e.clientX - r.left));
  }

  cv.addEventListener("pointerdown", (e) => {
    if (state === "play") setX(e);
  });

  cv.addEventListener("pointermove", (e) => {
    if (state === "play") setX(e);
  });

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;

    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();

    if (
      (e.key === "Enter" || e.key === " ") &&
      state !== "play" &&
      document.activeElement.tagName !== "BUTTON"
    )
      startGame();
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  document.getElementById("start").onclick = startGame;

  document.getElementById("again").onclick = startGame;

  function toast(msg) {
    const el = document.getElementById("toast");

    el.textContent = msg;

    el.classList.add("on");

    setTimeout(() => el.classList.remove("on"), 2200);
  }

  document.getElementById("share").onclick = async () => {
    const text =
      "I kept my Diwali diya alive and scored " +
      score +
      " in Diya Keeper! Can you beat me? " +
      location.href;

    try {
      if (navigator.share) {
        await navigator.share({ text });

        return;
      }

      await navigator.clipboard.writeText(text);

      toast("Challenge copied. Paste it in your chat!");
    } catch (e) {
      toast("Copy this: Scored " + score + " in Diya Keeper. Beat me!");
    }
  };

  window.addEventListener("resize", resize);

  p = null;

  resize();

  reset();

  resize();

  requestAnimationFrame(frame);
})();
