/* =====================================================================
   STARTER — a mini-avatar

   The simplified avatar a participant report draws: once per person on
   the map, and larger in their email. Optional — without one, reports
   draw the main sketch as it is, which can crowd a map.

   This one draws the starter's ring as a single body: the participant's
   `shape` in the participant's `hue`, with a soft halo. It reads the
   same `data` as sketch.js, under the same names — a mini-script has no
   parameters.json of its own.

   ── What a mini-script must respect ─────────────────────────────────

   1. Same runtime as the main sketch: p5 1.11.3, global mode, the same
      sandboxed frame. No network — inline any shader as a string.
   2. Same parameters, nothing new. Read `data` defensively and ignore
      what you don't use (here: count, radius, spin, trails, wobble).
   3. Transparent background: `clear()`, never `background()`. The
      report places it on the project's own background.
   4. Centred, sized from min(width, height) — the same script is a
      small map node and a large picture.
   5. The same picture every time: seed randomness with `data.seed`
      and drive motion from `frameCount`, not `millis()`.
   6. Ready by frame 60, when the picture is taken. Keep looping until
      then — `noLoop()` never gets there.
   7. Readable when small: few, bold shapes.
   8. Light: one is rendered per avatar, one after another.

   Also sent: `mini: true`, and `intensity: 1`.
===================================================================== */

const DEFAULTS = { hue: 30, shape: "circle", seed: 1 };
const SHAPES = ["circle", "square", "diamond"];

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function knobs() {
  const raw = typeof data === "object" && data !== null ? data : {};
  return {
    hue: num(raw.hue, DEFAULTS.hue),
    shape: SHAPES.includes(raw.shape) ? raw.shape : DEFAULTS.shape,
    seed: Math.floor(num(raw.seed, DEFAULTS.seed)),
  };
}

let seeded = null;
let tilt = 0;

setup = () => {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 255);
  noStroke();
  rectMode(CENTER);
};

windowResized = () => {
  resizeCanvas(windowWidth, windowHeight);
};

draw = () => {
  const u = knobs();
  // Re-seed when the avatar changes, and draw anything random right
  // then — once — so the same seed always gives the same tilt.
  if (seeded !== u.seed) {
    randomSeed(u.seed);
    noiseSeed(u.seed);
    seeded = u.seed;
    tilt = random(-0.3, 0.3);
  }

  clear();

  const unit = Math.min(width, height);
  const body = unit * 0.34;
  // A slow breath driven by frameCount, so frame 60 is always the same pose.
  const breath = 1 + Math.sin(frameCount * 0.05) * 0.03;

  translate(width / 2, height / 2);

  // Halo: a few faint, larger copies behind the body.
  for (let i = 4; i >= 1; i--) {
    fill(u.hue, 160, 255, 18);
    drawShape(u.shape, body * breath * (1 + i * 0.18), tilt);
  }
  fill(u.hue, 180, 255);
  drawShape(u.shape, body * breath, tilt);
};

function drawShape(shape, d, tilt) {
  push();
  rotate(tilt);
  if (shape === "square") {
    rect(0, 0, d, d);
  } else if (shape === "diamond") {
    rotate(Math.PI / 4);
    rect(0, 0, d, d);
  } else {
    ellipse(0, 0, d, d);
  }
  pop();
}
