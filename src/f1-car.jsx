// Modern F1 car (2022+ regulations) drawn from one geometry in metres, so the track
// markers (top view), livery renders and garage (side view) and wind tunnel (side +
// front views) all match. Original artwork; no real team or sponsor marks.
//
// Car coordinates: x runs from the front-wing leading edge (0) to the rear-wing trailing
// edge (5.6), y is height above the ground, z is lateral offset from the centreline.
// Drawing coordinates are metres with y pointing down and the origin at the middle of
// the car on the ground: side view has the nose on the left, top view has the nose on +X.
(function () {
  const LEN = 5.6, FA = 0.95, RA = 4.55, R = 0.36, RIM = 0.23;
  const n3 = (v) => Math.round(v * 1000) / 1000;

  const TF = {
    side: (x, y) => [x - LEN / 2, -y],
    top: (x, z) => [LEN / 2 - x, z],
    front: (z, y) => [z, -y],
  };

  // P(tf, "M", x, y, "L", x, y, "Q", ...): SVG path with every coordinate pair mapped through tf.
  function P(tf, ...seq) {
    let out = "", buf = [];
    const flush = () => {
      for (let i = 0; i < buf.length; i += 2) {
        const q = tf(buf[i], buf[i + 1]);
        out += n3(q[0]) + " " + n3(q[1]) + " ";
      }
      buf = [];
    };
    for (const s of seq) {
      if (typeof s === "string") { flush(); out += s + " "; } else buf.push(s);
    }
    flush();
    return out.trim();
  }
  const poly = (tf, pts) => P(tf, "M", ...pts[0], ...pts.slice(1).flatMap(p => ["L", ...p]), "Z");
  // Closed Catmull-Rom spline through pts, as cubic Béziers.
  function smooth(tf, pts) {
    const n = pts.length, seq = ["M", ...pts[0]];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      seq.push("C",
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]);
    }
    seq.push("Z");
    return P(tf, ...seq);
  }
  // Half outline on +z (front centre → rear centre) mirrored onto -z.
  const mirror = (half) => half.concat(half.slice(1, -1).reverse().map(([x, z]) => [x, -z]));
  const both = (pts) => [pts, pts.map(([x, z]) => [x, -z])];
  function circ(tf, cx, cy, r) {
    const [X, Y] = tf(cx, cy);
    return `M ${n3(X - r)} ${n3(Y)} a ${r} ${r} 0 1 0 ${n3(2 * r)} 0 a ${r} ${r} 0 1 0 ${n3(-2 * r)} 0 Z`;
  }
  function ell(tf, cx, cy, rx, ry) {
    const [X, Y] = tf(cx, cy);
    return `M ${n3(X - rx)} ${n3(Y)} a ${rx} ${ry} 0 1 0 ${n3(2 * rx)} 0 a ${rx} ${ry} 0 1 0 ${n3(-2 * rx)} 0 Z`;
  }
  function rrect(tf, x0, y0, x1, y1, r) {
    const a = tf(x0, y0), b = tf(x1, y1);
    const X0 = Math.min(a[0], b[0]), X1 = Math.max(a[0], b[0]), Y0 = Math.min(a[1], b[1]), Y1 = Math.max(a[1], b[1]);
    r = Math.min(r, (X1 - X0) / 2, (Y1 - Y0) / 2);
    const f = n3;
    return `M ${f(X0 + r)} ${f(Y0)} H ${f(X1 - r)} Q ${f(X1)} ${f(Y0)} ${f(X1)} ${f(Y0 + r)} V ${f(Y1 - r)} Q ${f(X1)} ${f(Y1)} ${f(X1 - r)} ${f(Y1)} H ${f(X0 + r)} Q ${f(X0)} ${f(Y1)} ${f(X0)} ${f(Y1 - r)} V ${f(Y0 + r)} Q ${f(X0)} ${f(Y0)} ${f(X0 + r)} ${f(Y0)} Z`;
  }
  // Inverted aerofoil (suction side underneath) from leading edge to trailing edge.
  function foil(tf, le, te, t, camber) {
    const dx = te[0] - le[0], dy = te[1] - le[1], c = Math.hypot(dx, dy);
    const nx = -dy / c, ny = dx / c, N = 12, up = [], lo = [];
    for (let i = 0; i <= N; i++) {
      const s = 0.5 - 0.5 * Math.cos(Math.PI * i / N);
      const yt = 5 * t * (0.2969 * Math.sqrt(s) - 0.126 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1036 * s ** 4);
      const cm = -camber * 4 * s * (1 - s);
      const mx = le[0] + dx * s + nx * cm, my = le[1] + dy * s + ny * cm;
      up.push([mx + nx * yt, my + ny * yt]);
      lo.push([mx - nx * yt, my - ny * yt]);
    }
    return poly(tf, up.concat(lo.reverse()));
  }
  const rot = (p, c, a) => {
    const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1];
    return [c[0] + x * k - y * s, c[1] + x * s + y * k];
  };

  // Part: { d, f: fill role, s: stroke role, w: stroke width (m), o: opacity, sdf: false to
  // leave it out of the wind-tunnel solid } or { text, x, y, size, f } for the car number.
  function buildSide(drs) {
    const t = TF.side, p = [];
    const fill = (d, f, extra) => p.push(Object.assign({ d, f }, extra));
    const bar = (d, s, w, extra) => p.push(Object.assign({ d, s, w }, extra));

    // Rear wing: endplate behind the elements so the slot gap stays readable.
    fill(P(t, "M", 4.92, 0.74, "Q", 4.9, 0.99, 5.12, 0.995, "L", 5.5, 1.0, "Q", 5.62, 0.99, 5.6, 0.86, "L", 5.56, 0.48,
      "Q", 5.52, 0.39, 5.4, 0.39, "L", 5.3, 0.39, "L", 5.34, 0.62, "Q", 5.3, 0.72, 5.12, 0.72, "Z"), "carbon2", { o: 0.92, sdf: false });
    fill(P(t, "M", 5.5, 0.99, "Q", 5.6, 0.98, 5.59, 0.86, "L", 5.55, 0.5, "L", 5.5, 0.5, "L", 5.53, 0.86, "Q", 5.53, 0.95, 5.46, 0.96, "Z"), "primary", { o: 0.9, sdf: false });
    fill(P(t, "M", 5.07, 0.36, "L", 5.13, 0.36, "L", 5.17, 0.79, "L", 5.1, 0.79, "Z"), "carbon", { sdf: false });
    fill(foil(t, [4.97, 0.43], [5.31, 0.485], 0.04, 0.012), "carbon");
    fill(foil(t, [4.94, 0.805], [5.38, 0.79], 0.055, 0.022), "primary");
    const flapTE = [5.585, 0.96], flapLE = drs ? rot([5.3, 0.845], flapTE, -0.33) : [5.3, 0.845];
    fill(foil(t, flapLE, flapTE, 0.04, 0.012), "secondary");
    bar(P(t, "M", flapLE[0] + 0.02, flapLE[1] + 0.02, "L", flapTE[0] - 0.02, flapTE[1]), "accent", 0.012, { sdf: false });

    // Diffuser, crash structure, rain light.
    fill(P(t, "M", 4.05, 0.065, "L", 4.95, 0.2, "L", 5.14, 0.37, "L", 4.85, 0.37, "L", 4.05, 0.14, "Z"), "carbon");
    fill(rrect(t, 5.02, 0.27, 5.34, 0.34, 0.02), "carbon");
    fill(rrect(t, 5.3, 0.28, 5.37, 0.33, 0.01), "light", { sdf: false });

    // Floor with plank and fences.
    fill(P(t, "M", 1.52, 0.24, "Q", 1.55, 0.08, 1.8, 0.065, "L", 4.12, 0.06, "L", 4.12, 0.1, "L", 1.95, 0.11, "Q", 1.72, 0.13, 1.64, 0.26, "Z"), "carbon");
    bar(P(t, "M", 1.9, 0.063, "L", 4.0, 0.058), "plank", 0.012, { sdf: false });
    fill(P(t, "M", 3.9, 0.1, "L", 4.14, 0.1, "L", 4.18, 0.2, "L", 4.0, 0.2, "Z"), "carbon2", { sdf: false });

    // Monocoque, nose and engine cover in one skin.
    fill(P(t,
      "M", 0.17, 0.2, "Q", 0.12, 0.25, 0.22, 0.28,
      "C", 0.7, 0.37, 1.1, 0.49, 1.5, 0.565,
      "L", 1.95, 0.655, "L", 2.66, 0.665,
      "Q", 2.7, 0.93, 2.86, 0.955,
      "C", 3.25, 0.965, 3.6, 0.74, 4.25, 0.56,
      "L", 5.08, 0.38, "L", 5.08, 0.27, "L", 4.3, 0.2, "L", 4.1, 0.1, "L", 1.95, 0.105,
      "C", 1.6, 0.19, 1.1, 0.25, 0.55, 0.21, "Z"), "primary");
    // Nose livery band, cover band.
    fill(P(t, "M", 0.22, 0.28, "C", 0.7, 0.37, 1.1, 0.49, 1.5, 0.565, "L", 1.52, 0.5, "C", 1.1, 0.43, 0.7, 0.32, 0.27, 0.235, "Z"), "secondary");
    fill(P(t, "M", 2.86, 0.955, "C", 3.25, 0.965, 3.6, 0.74, 4.25, 0.56, "L", 5.08, 0.38, "L", 5.08, 0.33, "L", 4.23, 0.5, "C", 3.6, 0.67, 3.25, 0.87, 2.84, 0.88, "Z"), "secondary");

    // Sidepod with downwash ramp and deep undercut.
    fill(P(t, "M", 2.55, 0.37, "C", 2.7, 0.2, 3.0, 0.13, 3.55, 0.12, "L", 2.05, 0.12, "C", 2.3, 0.16, 2.45, 0.28, 2.55, 0.37, "Z"), "shade", { o: 0.6, sdf: false });
    fill(P(t, "M", 2.44, 0.63, "C", 2.95, 0.66, 3.45, 0.57, 4.25, 0.31, "L", 4.32, 0.19, "L", 3.55, 0.12, "C", 3.0, 0.13, 2.7, 0.2, 2.55, 0.37, "L", 2.47, 0.41, "Z"), "primary");
    fill(P(t, "M", 2.56, 0.41, "C", 3.0, 0.35, 3.6, 0.27, 4.3, 0.22, "L", 4.32, 0.19, "L", 3.55, 0.12, "C", 3.0, 0.13, 2.7, 0.2, 2.55, 0.37, "Z"), "shade", { o: 0.28, sdf: false });
    fill(P(t, "M", 2.45, 0.62, "Q", 2.47, 0.6, 2.51, 0.6, "L", 2.55, 0.42, "L", 2.49, 0.42, "Z"), "dark", { sdf: false });
    fill(P(t, "M", 0.55, 0.21, "C", 1.1, 0.25, 1.6, 0.19, 2.0, 0.17, "L", 4.3, 0.2, "L", 5.08, 0.27, "L", 5.08, 0.31, "L", 4.3, 0.26, "L", 2.0, 0.24, "C", 1.6, 0.25, 1.1, 0.3, 0.6, 0.235, "Z"), "shade", { o: 0.22, sdf: false });
    bar(P(t, "M", 2.62, 0.5, "C", 3.1, 0.47, 3.6, 0.38, 4.25, 0.26), "accent", 0.018, { sdf: false });

    // Shark fin, airbox, cockpit, driver, halo, mirror.
    const fin = P(t, "M", 3.0, 0.958, "L", 4.8, 0.775, "L", 4.8, 0.445, "L", 4.25, 0.56, "C", 3.6, 0.74, 3.3, 0.93, 3.0, 0.95, "Z");
    fill(fin, "primary", { o: 0.32, sdf: false });
    bar(P(t, "M", 3.0, 0.958, "L", 4.8, 0.775, "L", 4.8, 0.445), "shade", 0.01, { o: 0.35, sdf: false });
    fill(P(t, "M", 2.73, 0.82, "Q", 2.75, 0.945, 2.86, 0.95, "L", 2.88, 0.9, "Q", 2.8, 0.9, 2.79, 0.82, "Z"), "dark", { sdf: false });
    fill(P(t, "M", 1.95, 0.66, "L", 2.64, 0.67, "L", 2.62, 0.62, "L", 2.0, 0.62, "Z"), "dark", { sdf: false });
    fill(circ(t, 2.4, 0.745, 0.125), "helmet", { sdf: false });
    fill(P(t, "M", 2.28, 0.775, "Q", 2.3, 0.8, 2.37, 0.8, "L", 2.4, 0.735, "L", 2.29, 0.725, "Z"), "visor", { sdf: false });
    fill(P(t, "M", 2.33, 0.84, "Q", 2.42, 0.875, 2.5, 0.83, "Q", 2.42, 0.85, 2.33, 0.84, "Z"), "hl", { o: 0.5, sdf: false });
    const halo = P(t, "M", 1.93, 0.66, "Q", 1.99, 0.9, 2.22, 0.905, "L", 2.58, 0.9, "Q", 2.71, 0.9, 2.72, 0.74);
    bar(halo, "carbon2", 0.055, { sdf: false });
    bar(halo, "primary", 0.022, { sdf: false });
    bar(P(t, "M", 2.16, 0.64, "L", 2.12, 0.74), "carbon", 0.02, { sdf: false });
    fill(ell(t, 2.1, 0.76, 0.085, 0.035), "primary", { sdf: false });

    // Suspension: wishbones, push/pull rods.
    const sus = [
      [1.28, 0.53, 0.98, 0.47], [1.66, 0.575, 0.98, 0.47], [1.2, 0.3, 0.98, 0.21], [1.72, 0.28, 0.98, 0.21], [1.02, 0.23, 1.45, 0.52],
      [4.1, 0.5, 4.52, 0.46], [4.3, 0.53, 4.52, 0.46], [4.05, 0.22, 4.52, 0.2], [4.32, 0.2, 4.52, 0.2], [4.5, 0.43, 4.2, 0.25],
    ];
    sus.forEach(([a, b, c, d]) => bar(P(t, "M", a, b, "L", c, d), "carbon", 0.028, { sdf: false }));

    // Front wing: endplate, four elements rising towards the tyre.
    fill(P(t, "M", 0.0, 0.07, "L", 0.66, 0.065, "Q", 0.76, 0.07, 0.76, 0.16, "L", 0.74, 0.35, "Q", 0.69, 0.38, 0.62, 0.34, "L", 0.06, 0.15, "Q", -0.02, 0.12, 0.0, 0.07, "Z"), "carbon2", { sdf: false });
    fill(foil(t, [0.0, 0.11], [0.42, 0.095], 0.04, 0.016), "primary");
    fill(foil(t, [0.3, 0.145], [0.54, 0.17], 0.03, 0.01), "carbon");
    fill(foil(t, [0.45, 0.2], [0.65, 0.245], 0.026, 0.008), "secondary");
    fill(foil(t, [0.56, 0.26], [0.73, 0.325], 0.022, 0.006), "accent");

    // Wheels: 18-inch rims with covers, low-profile tyres, wake deflector over the front.
    [FA, RA].forEach((cx) => {
      fill(circ(t, cx, R, R), "tyre", { sdf: false });
      bar(circ(t, cx, R, R - 0.03), "wall", 0.02, { sdf: false });
      fill(circ(t, cx, R, RIM), "cover", { sdf: false });
      bar(circ(t, cx, R, RIM - 0.03), "accent", 0.012, { o: 0.8, sdf: false });
      fill(circ(t, cx, R, 0.045), "carbon2", { sdf: false });
      bar(P(t, "M", cx - 0.27, R + 0.2, "Q", cx - 0.12, R + 0.33, cx + 0.05, R + 0.335), "hl", 0.018, { o: 0.16, sdf: false });
    });
    bar(P(t, "M", FA - 0.3, R + 0.3, "Q", FA - 0.05, R + 0.45, FA + 0.22, R + 0.32), "carbon", 0.03, { sdf: false });

    // Highlights and panel lines.
    fill(P(t, "M", 0.28, 0.272, "C", 0.72, 0.36, 1.1, 0.48, 1.5, 0.556, "L", 1.5, 0.54, "C", 1.1, 0.465, 0.72, 0.345, 0.3, 0.258, "Z"), "hl", { o: 0.35, sdf: false });
    fill(P(t, "M", 2.9, 0.95, "C", 3.25, 0.958, 3.6, 0.735, 4.25, 0.555, "L", 4.25, 0.535, "C", 3.6, 0.715, 3.25, 0.935, 2.9, 0.93, "Z"), "hl", { o: 0.3, sdf: false });
    fill(P(t, "M", 2.52, 0.62, "C", 2.95, 0.645, 3.45, 0.56, 4.22, 0.31, "L", 4.2, 0.29, "C", 3.45, 0.535, 2.95, 0.615, 2.54, 0.595, "Z"), "hl", { o: 0.28, sdf: false });
    bar(P(t, "M", 1.52, 0.2, "L", 1.52, 0.56), "shade", 0.008, { o: 0.45, sdf: false });
    bar(P(t, "M", 2.9, 0.8, "C", 3.3, 0.76, 3.7, 0.6, 4.3, 0.44), "shade", 0.008, { o: 0.45, sdf: false });

    p.push({ text: true, x: n3(1.78 - LEN / 2), y: -0.4, size: 0.15, f: "ink", rot: -6 });
    p.push({ text: true, x: n3(3.9 - LEN / 2), y: -0.79, size: 0.15, f: "fin" });
    return p;
  }

  function buildTop(drs, lod) {
    const t = TF.top, p = [];
    const fill = (d, f, extra) => p.push(Object.assign({ d, f }, extra));
    const bar = (d, s, w, extra) => p.push(Object.assign({ d, s, w }, extra));
    const tyre = (cx, cz, len, wid) => rrect(t, cx - len / 2, cz - wid / 2, cx + len / 2, cz + wid / 2, 0.07);

    if (lod === "mini") {
      // Track-map LOD: silhouette outline, then front wing, tyres, body, rear wing, driver.
      const wingF = rrect(t, 0.0, -1.0, 0.62, 1.0, 0.08);
      const wingR = rrect(t, 4.95, -0.55, 5.6, 0.55, 0.06);
      const body = poly(t, mirror([[0.08, 0], [0.5, 0.11], [1.6, 0.22], [2.4, 0.3], [2.55, 0.68], [3.3, 0.68], [4.2, 0.32], [5.05, 0.2], [5.1, 0]]));
      const tyres = [[FA, 0.78, 0.74, 0.44], [FA, -0.78, 0.74, 0.44], [RA, 0.78, 0.76, 0.5], [RA, -0.78, 0.76, 0.5]].map(q => tyre(...q));
      [wingF, wingR, body, ...tyres].forEach(d => bar(d, "halo", 0.7, { o: 0.55 }));
      [wingF, wingR, body, ...tyres].forEach(d => bar(d, "outline", 0.26));
      fill(wingF, "wing");
      bar(P(t, "M", 0.0, 0, "L", 1.4, 0), "outline", 0.2);
      tyres.forEach(d => fill(d, "tyre"));
      fill(body, "primary");
      fill(poly(t, mirror([[2.75, 0], [2.75, 0.11], [4.6, 0.1], [5.08, 0]])), "stripe");
      fill(wingR, "wing");
      fill(circ(t, 2.3, 0, 0.17), "helmet");
      return p;
    }

    if (lod === "mid" || lod === "shadow") {
      // Map LOD for ~17–40 px: the parts that still read at that size, each with a dark
      // keyline and a thin rim so the car separates from the asphalt.
      const wingF = poly(t, [[0.02, -1.0], [0.0, -0.4], [0.0, 0.4], [0.02, 1.0], [0.62, 1.0], [0.5, 0.5], [0.4, 0.16], [0.4, -0.16], [0.5, -0.5], [0.62, -1.0]]);
      const wingR = rrect(t, 4.92, -0.54, 5.6, 0.54, 0.05);
      const body = smooth(t, mirror([[0.1, 0], [0.5, 0.09], [1.5, 0.19], [2.3, 0.29], [2.46, 0.6], [2.8, 0.75], [3.3, 0.7], [3.85, 0.48], [4.25, 0.3], [5.0, 0.18], [5.1, 0]]));
      const tyres = [[FA, 0.8, 0.74, 0.36], [FA, -0.8, 0.74, 0.36], [RA, 0.8, 0.76, 0.46], [RA, -0.8, 0.76, 0.46]].map(q => tyre(...q));
      const sil = [wingF, wingR, body, ...tyres];
      if (lod === "shadow") {
        sil.forEach(d => { fill(d, "halo", { o: 0.5 }); bar(d, "halo", 0.3, { o: 0.35 }); });
        return p;
      }
      sil.forEach(d => bar(d, "halo", 0.3, { o: 0.85 }));
      sil.forEach(d => bar(d, "outline", 0.09, { o: 0.9 }));
      both([[FA, 0.2], [FA, 0.64]]).forEach(([a, b]) => bar(P(t, "M", ...a, "L", ...b), "carbon2", 0.07));
      both([[RA, 0.26], [RA, 0.6]]).forEach(([a, b]) => bar(P(t, "M", ...a, "L", ...b), "carbon2", 0.07));
      fill(wingF, "carbon2");
      fill(poly(t, [[0.0, -0.4], [0.0, 0.4], [0.02, 1.0], [0.2, 1.0], [0.15, 0.4], [0.15, -0.4], [0.2, -1.0], [0.02, -1.0]]), "primary");
      both([[0.3, 0.2], [0.42, 0.2], [0.55, 0.55], [0.62, 1.0], [0.34, 1.0], [0.28, 0.55]]).forEach(q => fill(poly(t, q), "secondary"));
      tyres.forEach(d => fill(d, "tyre"));
      fill(body, "primary");
      both([[2.55, 0.5], [2.8, 0.73], [3.3, 0.69], [3.85, 0.47], [4.2, 0.32], [3.9, 0.3], [3.3, 0.48], [2.85, 0.53]])
        .forEach(q => fill(poly(t, q), "shade", { o: 0.28 }));
      both([[2.44, 0.36], [2.52, 0.62], [2.62, 0.62], [2.54, 0.36]]).forEach(q => fill(poly(t, q), "dark"));
      fill(poly(t, mirror([[0.2, 0], [0.24, 0.045], [1.65, 0.08], [1.65, 0]])), "secondary");
      fill(poly(t, mirror([[2.85, 0], [2.85, 0.13], [4.5, 0.11], [5.06, 0.08], [5.1, 0]])), "stripe");
      fill(rrect(t, 1.95, -0.24, 2.68, 0.24, 0.13), "dark");
      fill(circ(t, 2.36, 0, 0.14), "helmet");
      fill(rrect(t, drs ? 5.36 : 5.3, -0.5, 5.6, 0.5, 0.03), "secondary");
      fill(rrect(t, 4.94, -0.5, 5.3, 0.5, 0.03), "primary");
      [1, -1].forEach(s => fill(rrect(t, 4.9, s * 0.47, 5.62, s * 0.55, 0.02), "carbon"));
      return p;
    }

    // Floor edge, visible outside the sidepods.
    fill(poly(t, mirror([[1.58, 0], [1.6, 0.35], [1.82, 0.92], [3.95, 0.96], [4.12, 0.78], [4.18, 0.58], [4.95, 0.52], [5.12, 0.42], [5.14, 0]])), "carbon");
    // Suspension.
    const arms = [
      [1.2, 0.2, FA, 0.62], [1.68, 0.22, FA, 0.62], [1.35, 0.18, FA + 0.05, 0.62],
      [4.15, 0.28, RA, 0.58], [4.42, 0.24, RA, 0.58],
    ];
    arms.forEach(([a, b, c, d]) => both([[a, b], [c, d]]).forEach(([q0, q1]) => bar(P(t, "M", ...q0, "L", ...q1), "rim", 0.03, { o: 0.7 })));
    // Tyres.
    [[FA, 0.8, 0.72, 0.305], [RA, 0.8, 0.72, 0.405]].forEach(([cx, cz, l, w]) => [cz, -cz].forEach(z => {
      fill(tyre(cx, z, l, w), "tyre");
      bar(tyre(cx, z, l, w), "rim", 0.025);
      fill(rrect(t, cx - l / 2 + 0.06, z - 0.03, cx + l / 2 - 0.06, z + 0.03, 0.02), "hl", { o: 0.12 });
    }));
    // Body.
    fill(smooth(t, mirror([[0.14, 0], [0.22, 0.05], [0.55, 0.085], [1.0, 0.12], [1.5, 0.19], [1.9, 0.25], [2.32, 0.29],
      [2.44, 0.46], [2.53, 0.65], [2.78, 0.72], [3.25, 0.68], [3.75, 0.5], [4.15, 0.31], [4.6, 0.22], [5.0, 0.16], [5.1, 0.07], [5.12, 0]])), "primary");
    both([[2.5, 0.5], [2.53, 0.65], [2.78, 0.72], [3.25, 0.68], [3.75, 0.5], [4.15, 0.31], [3.9, 0.31], [3.4, 0.5], [2.9, 0.56]])
      .forEach(q => fill(poly(t, q), "shade", { o: 0.22 }));
    both([[2.42, 0.34], [2.51, 0.64], [2.58, 0.64], [2.5, 0.34]]).forEach(q => fill(poly(t, q), "dark"));
    fill(poly(t, mirror([[0.22, 0], [0.26, 0.035], [1.6, 0.07], [1.6, 0]])), "secondary");
    fill(poly(t, mirror([[2.82, 0], [2.82, 0.12], [3.6, 0.13], [4.5, 0.1], [5.06, 0.07], [5.1, 0]])), "secondary");
    both([[2.6, 0.44], [3.1, 0.52], [3.6, 0.42], [3.1, 0.46]]).forEach(q => fill(poly(t, q), "hl", { o: 0.2 }));
    fill(poly(t, [[0.35, 0], [1.5, 0.03], [1.5, -0.03]]), "hl", { o: 0.3 });
    bar(P(t, "M", 2.95, 0, "L", 4.86, 0), "carbon2", 0.03);
    // Cockpit, driver, halo, airbox, mirrors.
    fill(rrect(t, 1.95, -0.23, 2.66, 0.23, 0.13), "dark");
    fill(circ(t, 2.38, 0, 0.125), "helmet");
    fill(rrect(t, 2.27, -0.02, 2.47, 0.02, 0.01), "secondary");
    const halo = P(t, "M", 2.68, 0.25, "L", 2.22, 0.24, "Q", 1.94, 0.22, 1.93, 0, "Q", 1.94, -0.22, 2.22, -0.24, "L", 2.68, -0.25);
    bar(halo, "carbon2", 0.06);
    bar(halo, "primary", 0.024);
    fill(ell(t, 2.78, 0, 0.1, 0.09), "dark");
    both([[2.1, 0.3], [2.1, 0.44]]).forEach(([a, b]) => { bar(P(t, "M", ...a, "L", ...b), "carbon", 0.025); });
    both([[2.05, 0.42], [2.16, 0.42], [2.16, 0.5], [2.05, 0.5]]).forEach(q => fill(poly(t, q), "primary"));
    // Front wing planform with swept outboard flaps and endplates.
    fill(poly(t, [[0.03, -1.0], [0.0, -0.5], [0.0, 0.5], [0.03, 1.0], [0.66, 1.0], [0.57, 0.55], [0.42, 0.25], [0.38, 0], [0.42, -0.25], [0.57, -0.55], [0.66, -1.0]]), "carbon2");
    fill(poly(t, [[0.0, -0.5], [0.0, 0.5], [0.03, 1.0], [0.18, 1.0], [0.14, 0.5], [0.16, 0], [0.14, -0.5], [0.18, -1.0], [0.03, -1.0]]), "primary");
    both([[0.3, 0.24], [0.42, 0.25], [0.57, 0.55], [0.66, 1.0], [0.36, 1.0], [0.3, 0.55]]).forEach(q => fill(poly(t, q), "secondary"));
    both([[0.24, 0.25], [0.3, 0.55], [0.36, 1.0]]).forEach(q => bar(P(t, "M", ...q[0], "L", ...q[1], "L", ...q[2]), "shade", 0.012, { o: 0.5 }));
    [1, -1].forEach(s => fill(rrect(t, 0.01, s * 0.955, 0.7, s * 1.01, 0.02), "carbon"));
    // Rear wing: main plane, DRS flap (narrower from above when open), endplates.
    fill(rrect(t, 4.94, -0.48, 5.31, 0.48, 0.02), "primary");
    if (drs) fill(rrect(t, 5.31, -0.48, 5.44, 0.48, 0.0), "dark", { o: 0.7 });
    fill(rrect(t, drs ? 5.44 : 5.31, -0.48, 5.59, 0.48, 0.02), "secondary");
    [1, -1].forEach(s => fill(rrect(t, 4.88, s * 0.46, 5.62, s * 0.52, 0.02), "carbon2"));
    return p;
  }

  function buildFront(drs) {
    const t = TF.front, p = [];
    const fill = (d, f, extra) => p.push(Object.assign({ d, f }, extra));
    const bar = (d, s, w, extra) => p.push(Object.assign({ d, s, w }, extra));
    const box = (z0, y0, z1, y1, r) => rrect(t, z0, y0, z1, y1, r);

    // Rear wing seen over the engine cover.
    [1, -1].forEach(s => fill(box(s * 0.47, 0.38, s * 0.53, 1.0, 0.02), "carbon2"));
    fill(box(-0.5, 0.43, 0.5, 0.48, 0.01), "carbon");
    fill(box(-0.5, 0.775, 0.5, 0.835, 0.015), "primary");
    fill(box(-0.5, drs ? 0.925 : 0.855, 0.5, drs ? 0.96 : 0.96, 0.012), "secondary");
    // Rear tyres, floor, sidepods, undercut shadow.
    [1, -1].forEach(s => fill(box(s * 0.6, 0.0, s * 1.0, 0.72, 0.09), "tyre"));
    fill(box(-0.96, 0.06, 0.96, 0.1, 0.01), "carbon");
    fill(box(-0.7, 0.1, 0.7, 0.32, 0.04), "shade", { o: 0.75 });
    fill(P(t, "M", -0.73, 0.33, "Q", -0.75, 0.62, -0.55, 0.63, "L", 0.55, 0.63, "Q", 0.75, 0.62, 0.73, 0.33, "Z"), "primary");
    [1, -1].forEach(s => fill(P(t, "M", s * 0.34, 0.4, "L", s * 0.66, 0.4, "Q", s * 0.7, 0.4, s * 0.7, 0.46, "L", s * 0.69, 0.58, "L", s * 0.34, 0.6, "Z"), "dark"));
    // Chassis, airbox, driver, halo, mirrors.
    fill(P(t, "M", -0.28, 0.16, "L", -0.3, 0.55, "Q", -0.28, 0.67, -0.2, 0.675, "L", 0.2, 0.675, "Q", 0.28, 0.67, 0.3, 0.55, "L", 0.28, 0.16, "Z"), "primary");
    fill(P(t, "M", -0.16, 0.66, "L", -0.1, 0.94, "Q", 0, 0.975, 0.1, 0.94, "L", 0.16, 0.66, "Z"), "primary");
    fill(ell(t, 0, 0.885, 0.06, 0.04), "dark");
    fill(circ(t, 0, 0.75, 0.125), "helmet");
    fill(box(-0.1, 0.725, 0.1, 0.78, 0.02), "visor");
    const halo = P(t, "M", -0.27, 0.68, "Q", -0.26, 0.905, 0, 0.905, "Q", 0.26, 0.905, 0.27, 0.68);
    bar(halo, "carbon2", 0.05);
    bar(halo, "primary", 0.02);
    bar(P(t, "M", 0, 0.68, "L", 0, 0.9), "carbon2", 0.05);
    [1, -1].forEach(s => {
      bar(P(t, "M", s * 0.27, 0.66, "L", s * 0.42, 0.72), "carbon", 0.02);
      fill(box(s * 0.38, 0.7, s * 0.5, 0.76, 0.015), "primary");
    });
    // Front suspension and tyres.
    [1, -1].forEach(s => {
      bar(P(t, "M", s * 0.22, 0.52, "L", s * 0.66, 0.47), "carbon", 0.026);
      bar(P(t, "M", s * 0.22, 0.28, "L", s * 0.66, 0.22), "carbon", 0.026);
      bar(P(t, "M", s * 0.64, 0.24, "L", s * 0.25, 0.5), "carbon", 0.022);
      fill(box(s * 0.65, 0.0, s * 0.955, 0.72, 0.09), "tyre");
      fill(box(s * 0.78, 0.04, s * 0.83, 0.68, 0.02), "hl", { o: 0.08 });
      bar(P(t, "M", s * 0.62, 0.8, "Q", s * 0.8, 0.86, s * 0.98, 0.78), "carbon", 0.03);
    });
    // Nose and front wing.
    fill(P(t, "M", -0.13, 0.2, "L", -0.15, 0.48, "Q", -0.12, 0.56, 0, 0.565, "Q", 0.12, 0.56, 0.15, 0.48, "L", 0.13, 0.2, "Q", 0, 0.17, -0.13, 0.2, "Z"), "primary");
    fill(box(-0.06, 0.2, 0.06, 0.5, 0.03), "secondary");
    fill(box(-1.0, 0.075, 1.0, 0.125, 0.01), "primary");
    [1, -1].forEach(s => {
      fill(P(t, "M", s * 0.25, 0.13, "L", s * 0.95, 0.15, "L", s * 0.95, 0.32, "L", s * 0.3, 0.19, "Z"), "secondary");
      bar(P(t, "M", s * 0.28, 0.165, "L", s * 0.95, 0.235), "shade", 0.01, { o: 0.5 });
      fill(box(s * 0.94, 0.05, s * 1.0, 0.35, 0.015), "carbon2");
    });
    fill(box(-0.3, 0.52, 0.3, 0.54, 0.01), "hl", { o: 0.25 });
    fill(P(t, "M", -0.6, 0.6, "Q", 0, 0.62, 0.6, 0.6, "L", 0.55, 0.615, "Q", 0, 0.635, -0.55, 0.615, "Z"), "hl", { o: 0.25 });
    p.push({ text: true, x: 0, y: -0.36, size: 0.11, f: "ink" });
    return p;
  }

  const cache = new Map();
  function parts(view, lod = "full", drs = false) {
    const key = view + lod + (drs ? 1 : 0);
    let v = cache.get(key);
    if (!v) {
      v = view === "side" ? buildSide(drs) : view === "front" ? buildFront(drs) : buildTop(drs, lod);
      cache.set(key, v);
    }
    return v;
  }

  const lum = (hex) => {
    const h = (hex || "#888").replace("#", "");
    return 0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16);
  };
  const far = (a, b) => Math.abs(lum(a) - lum(b)) > 70;
  function palette(L, outline) {
    const pri = L.primary, sec = L.secondary || "#1a1a1a", acc = L.accent || "#E8E4DC";
    const ink = far(acc, pri) ? acc : far(sec, pri) ? sec : (lum(pri) > 128 ? "#0B0B0B" : "#FFFFFF");
    return {
      primary: pri, secondary: sec, accent: acc, ink, fin: far(acc, sec) ? acc : ink,
      helmet: far(acc, pri) ? acc : sec, stripe: far(acc, pri) ? acc : sec,
      wing: far(sec, pri) ? sec : far(acc, pri) ? acc : "#15171b",
      outline: outline || "#D9DDE3", halo: "#000000", rim: "#3a3f47",
      carbon: "#16181c", carbon2: "#262a31", tyre: "#0d0e10", wall: "#1f2227", cover: "#2c3038",
      dark: "#050608", visor: "#0c1522", hl: "#ffffff", shade: "#000000", light: "#ff2b2b", plank: "#6a5638",
    };
  }

  const FAMILY = "ui-sans-serif, system-ui, 'Helvetica Neue', Arial, sans-serif";
  const FONT = "900 {s}px " + FAMILY;

  // <F1CarSVG/>: a <g> in drawing coordinates scaled to px-per-metre `scale`.
  const F1CarSVG = React.memo(function F1CarSVG({ view = "side", livery, number, lod = "full", drs = false, scale = 1, outline }) {
    const pal = palette(livery, outline);
    const list = parts(view, lod, drs);
    return (
      <g className="f1car">
        <g transform={`scale(${scale})`}>
          {list.map((q, i) => q.text ? null : (
            <path key={i} d={q.d} fill={q.f ? pal[q.f] : "none"} stroke={q.s ? pal[q.s] : undefined}
              strokeWidth={q.w} opacity={q.o} strokeLinecap={q.s ? "round" : undefined} strokeLinejoin={q.s ? "round" : undefined}/>
          ))}
        </g>
        {number != null && list.map((q, i) => q.text ? (
          <text key={"n" + i} x={q.x * scale} y={q.y * scale} fontSize={q.size * scale} fill={pal[q.f]}
            fontFamily={FAMILY} fontWeight="900" fontStyle="italic"
            textAnchor="middle" dominantBaseline="central"
            transform={q.rot ? `rotate(${q.rot} ${q.x * scale} ${q.y * scale})` : undefined}>{number}</text>
        ) : null)}
      </g>
    );
  });

  const p2d = new Map();
  const path2d = (d) => { let o = p2d.get(d); if (!o) { o = new Path2D(d); p2d.set(d, o); } return o; };

  // Canvas painter. ctx must already be translated to the car origin and scaled to metres.
  // opts.mask paints only the solid parts in white (used for the wind-tunnel distance field).
  function paint(ctx, view, livery, opts = {}) {
    const { drs = false, number, lod = "full", mask = false, outline, alpha = 1 } = opts;
    const pal = palette(livery, outline);
    for (const q of parts(view, lod, drs)) {
      if (q.text) {
        if (mask || number == null) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(q.x, q.y);
        if (q.rot) ctx.rotate(q.rot * Math.PI / 180);
        ctx.scale(0.01, 0.01);
        ctx.fillStyle = pal[q.f];
        ctx.font = "italic " + FONT.replace("{s}", (q.size * 100).toFixed(1));
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(number), 0, 0);
        ctx.restore();
        continue;
      }
      if (mask && q.sdf === false) continue;
      ctx.globalAlpha = mask ? 1 : (q.o == null ? 1 : q.o) * alpha;
      const pp = path2d(q.d);
      if (q.f) { ctx.fillStyle = mask ? "#fff" : pal[q.f]; ctx.fill(pp); }
      if (q.s) {
        ctx.strokeStyle = mask ? "#fff" : pal[q.s];
        ctx.lineWidth = q.w;
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.stroke(pp);
      }
    }
    ctx.globalAlpha = 1;
  }

  window.F1Car = { LEN, FA, RA, R, WIDTH: 2.0, parts, paint, palette, SVG: F1CarSVG, lum };
})();
