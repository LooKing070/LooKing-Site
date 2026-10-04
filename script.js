(function () {
  var canvas = document.getElementById("bubbleCanvas");
  if (!canvas || !canvas.getContext) { return; }
  var ctx = canvas.getContext("2d");
  if (!ctx) { return; }

  var bar = document.getElementById("bubbleBar");
  var hud = document.getElementById("bubbleHud");
  var btnStart = document.getElementById("btnStart");
  var btnStop = document.getElementById("btnStop");
  var btnBurst = document.getElementById("btnBurst");
  var popLabel = document.getElementById("popLabel");

  /* Показываем управление только если пузырь реально поддерживается */
  bar.style.display = "block";

  var W = 0, H = 0, running = false, popped = 0;
  var bubbles = [], pops = [], drops = [];
  var MAXB = 16, lastT = 0, acc = 0, lastTouch = 0;

  function size() {
    W = window.innerWidth || document.documentElement.clientWidth || 320;
    H = window.innerHeight || document.documentElement.clientHeight || 480;
    canvas.width = W;
    canvas.height = H;
  }
  size();
  window.onresize = size;

  /* Спрайт пузыря рисуем один раз */
  var SP = 128, sprite = document.createElement("canvas");
  sprite.width = SP; sprite.height = SP;
  (function () {
    var c = sprite.getContext("2d");
    if (!c) { return; }
    var cx = SP / 2, r = SP / 2 - 4, g;
    g = c.createRadialGradient(cx - r * .2, cx - r * .25, r * .1, cx, cx, r);
    g.addColorStop(0, "rgba(255,255,255,.10)");
    g.addColorStop(.62, "rgba(205,240,255,.06)");
    g.addColorStop(.86, "rgba(170,225,250,.28)");
    g.addColorStop(.96, "rgba(255,255,255,.9)");
    g.addColorStop(1, "rgba(255,255,255,.15)");
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cx, r, 0, 6.283); c.fill();
    c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cx, r - 1, 0, 6.283); c.stroke();
    c.save();
    c.translate(cx - r * .42, cx - r * .5); c.rotate(-.62); c.scale(1, .52);
    g = c.createRadialGradient(0, 0, 2, 0, 0, r * .42);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, r * .42, 0, 6.283); c.fill();
    c.restore();
    c.fillStyle = "rgba(255,255,255,.5)";
    c.beginPath(); c.arc(cx + r * .38, cx + r * .44, r * .13, 0, 6.283); c.fill();
  })();

  function spawn(n) {
    var i, r;
    for (i = 0; i < n; i++) {
      if (bubbles.length >= MAXB) { break; }
      r = 13 + Math.random() * 28;
      bubbles.push({
        x: r + Math.random() * Math.max(1, W - r * 2),
        y: H + r + Math.random() * 120,
        r: r,
        vy: -(0.045 + Math.random() * 0.075),
        ph: Math.random() * 6.283,
        wf: 0.0008 + Math.random() * 0.0014,
        amp: 10 + Math.random() * 22
      });
    }
  }

  function popBubble(i) {
    var b = bubbles[i], k, a, sp;
    bubbles.splice(i, 1);
    popped++;
    popLabel.innerHTML = "Лопнуто: " + popped;
    pops.push({ x: b.x, y: b.y, r0: b.r, t: 0 });
    k = 4 + Math.floor(Math.random() * 3);
    while (k--) {
      a = Math.random() * 6.283;
      sp = .06 + Math.random() * .14;
      drops.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .05, r: 1.6 + Math.random() * 2.2, t: 0 });
    }
  }

  function raf(fn) {
    if (window.requestAnimationFrame) { return window.requestAnimationFrame(fn); }
    return setTimeout(function () { fn(+new Date()); }, 33); /* запас для старых браузеров */
  }

  function loop(t) {
    if (!running) { return; }
    var dt = t - lastT;
    if (dt <= 0 || dt > 60) { dt = 33; }
    lastT = t;
    acc += dt;
    while (acc > 640) { acc -= 640; spawn(1); }

    ctx.clearRect(0, 0, W, H);
    var i, b, p, d, x, k;
    for (i = bubbles.length - 1; i >= 0; i--) {
      b = bubbles[i];
      b.ph += b.wf * dt;
      b.y += b.vy * dt;
      if (b.y < -b.r * 2) { bubbles.splice(i, 1); continue; }
      x = b.x + Math.sin(b.ph) * b.amp;
      ctx.drawImage(sprite, x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    for (i = pops.length - 1; i >= 0; i--) {
      p = pops[i]; p.t += dt;
      if (p.t > 300) { pops.splice(i, 1); continue; }
      k = p.t / 300;
      ctx.strokeStyle = "rgba(255,255,255," + (0.9 * (1 - k)).toFixed(3) + ")";
      ctx.lineWidth = 2.5 * (1 - k) + .5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r0 + k * p.r0 * 1.3, 0, 6.283); ctx.stroke();
    }
    for (i = drops.length - 1; i >= 0; i--) {
      d = drops[i]; d.t += dt;
      if (d.t > 430) { drops.splice(i, 1); continue; }
      d.x += d.vx * dt; d.y += d.vy * dt; d.vy += .0006 * dt;
      ctx.globalAlpha = 1 - d.t / 430;
      ctx.fillStyle = "#bfeaff";
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }
    raf(loop);
  }

  function tap(x, y) {
    var i, b, bx, dx, dy;
    for (i = bubbles.length - 1; i >= 0; i--) {
      b = bubbles[i];
      bx = b.x + Math.sin(b.ph) * b.amp;
      dx = x - bx; dy = y - b.y;
      if (dx * dx + dy * dy <= (b.r + 10) * (b.r + 10)) { popBubble(i); return; }
    }
  }

  function onDown(e) {
    var t = e.touches ? e.touches[0] : e;
    if (!t) { return; }
    if (e.touches) { lastTouch = +new Date(); }
    else if (+new Date() - lastTouch < 500) { return; } /* не дублировать после касания */
    tap(t.clientX, t.clientY);
  }

  canvas.addEventListener("touchstart", function (e) { onDown(e); }, false);
  canvas.addEventListener("mousedown", onDown, false);

  function start() {
    if (running) { return; }
    running = true;
    size();
    canvas.style.display = "block";
    hud.style.display = "block";
    btnStart.innerHTML = "Пузыри летят — лопайте их!";
    spawn(8);
    lastT = +new Date(); acc = 0;
    raf(loop);
  }
  function stop() {
    running = false;
    canvas.style.display = "none";
    hud.style.display = "none";
    btnStart.innerHTML = "Запустить мыльные пузыри";
    bubbles = []; pops = []; drops = [];
  }
  btnStart.onclick = start;
  btnStop.onclick = stop;
  btnBurst.onclick = function () { spawn(6); };
})();