/* =====================================================================
   FISH SCHOOL — mini-avatar

   One fish where the avatar is a school: what a participant report
   draws on the map (once per person) and in the email. The reference
   for what a mini-script looks like — see visuals/starter/mini.js for
   the contract it follows.

   Reads the same `data` as sketch.js, under the same names:

     hue     inner colour → the body
     hue2    outer colour → the tail and the water around it
     shape   the participant's first body shape (fish, ellipse, circle,
             flower) — so someone who swam as flowers stays a flower

   and ignores the rest (count, wave, shaders): a school's density and
   the water's motion don't read at the size of a map node.

   2D renderer, no shaders: one is rendered per avatar, so it stays
   light. Transparent ground, centred, sized from min(width, height),
   seeded per avatar, and posed by frame 60.
===================================================================== */

const DEFAULTS = { hue: 90, hue2: 180, shape: ["fish"], seed: 1 };
const SHAPE_NAMES = ["circle", "ellipse", "fish", "flower"];
const TAU = Math.PI * 2;

/* Saturation and brightness of the school's particles, so a mini
   reads as the same colour as the avatar it stands for. */
const SAT = 180;
const BRI = 255;

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** First valid shape from an array, a "a,b" string or a single name. */
function firstShape(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const found = raw
    .map((v) => String(v).trim().toLowerCase())
    .find((v) => SHAPE_NAMES.includes(v));
  return found || DEFAULTS.shape[0];
}

function knobs() {
  const raw = typeof data === "object" && data !== null ? data : {};
  return {
    hue: num(raw.hue, DEFAULTS.hue),
    hue2: num(raw.hue2, DEFAULTS.hue2),
    shape: firstShape(raw.shape),
    seed: Math.floor(num(raw.seed, DEFAULTS.seed)),
  };
}

let seeded = null;
let heading = 0;
let phase = 0;

setup = () => {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 255);
  noStroke();
};

windowResized = () => {
  resizeCanvas(windowWidth, windowHeight);
};

draw = () => {
  const u = knobs();
  // Anything random is drawn once per seed, so a participant's fish
  // always swims the same way.
  if (seeded !== u.seed) {
    randomSeed(u.seed);
    noiseSeed(u.seed);
    seeded = u.seed;
    heading = random(-0.35, 0.35);
    phase = random(TAU);
  }

  clear();

  const unit = Math.min(width, height);
  const r = unit * 0.24; // body half-length
  const t = frameCount / 60; // seconds at 60fps — frame 60 is t = 1

  translate(width / 2, height / 2);

  // The water around it: faint rings in the outer colour.
  for (let i = 5; i >= 1; i--) {
    fill(u.hue2, SAT, BRI, 10);
    ellipse(0, 0, r * (2.2 + i * 0.32), r * (2.2 + i * 0.32));
  }

  rotate(heading);

  if (u.shape === "fish") {
    drawFish(u, r, t);
  } else if (u.shape === "flower") {
    fill(u.hue, SAT, BRI);
    drawFlower(r * 0.95, t);
  } else if (u.shape === "ellipse") {
    fill(u.hue, SAT, BRI);
    ellipse(0, 0, r * 2, r);
  } else {
    fill(u.hue, SAT, BRI);
    ellipse(0, 0, r * 1.5, r * 1.5);
  }
};

/** Oval body facing +x, triangle tail that swishes; matches sketch.js. */
function drawFish(u, r, t) {
  const swish = Math.sin(t * 5 + phase) * 0.18;

  push();
  translate(-r * 0.86, 0);
  rotate(swish);
  fill(u.hue2, SAT, BRI);
  triangle(0, 0, -r * 0.74, r * 0.55, -r * 0.74, -r * 0.55);
  pop();

  fill(u.hue, SAT, BRI);
  ellipse(0, 0, r * 2, r * 1.2);

  // An eye, so it reads as a fish and not a leaf at node size.
  fill(0, 0, 0, 200);
  ellipse(r * 0.55, -r * 0.12, r * 0.16, r * 0.16);
}

/** Five petals, turning slowly. */
function drawFlower(r, t) {
  push();
  rotate(t * 0.8 + phase);
  beginShape();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    const k = 0.38 + 0.62 * Math.pow(Math.abs(Math.cos(2.5 * a)), 0.75);
    vertex(Math.cos(a) * r * k, Math.sin(a) * r * k);
  }
  endShape(CLOSE);
  pop();
}
