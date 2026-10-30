// Car classes — each transforms the grid (chassis/engine/lap-times/tyre/speed envelope)
// and the visual on track. All classes are FICTIONAL series within the APEX championship.

const CAR_CLASSES = {
  // Open-wheel single-seater (the original APEX cars)
  open_wheel: {
    id: "open_wheel",
    short: "OW-26",
    name: "OPEN-WHEEL",
    full: "APEX OPEN-WHEEL · OW-26 SPEC",
    tagline: "Spec single-seater · 760 hp · 2.2L V6 turbo",
    eyebrow: "TIER · PROTOTYPE OPEN",
    chassis: "APEX OW-26 spec tub",
    engines: ["Hayashi HX-26 2.2L V6 Twin-Turbo (760 hp)", "Corsa C-66 2.2L V6 Twin-Turbo (758 hp)", "Marlow M-26 2.2L V6 Twin-Turbo (752 hp)"],
    weight_kg: 745,
    top_speed_kph: 318,
    tyre_compounds: ["S", "M", "H"],
    tyre_cliff_lap: 65,
    fuel_kg_per_lap: 0.45,
    tank_kg: 60,
    pit_clean_s: 2.45,
    base_lap_s: 69.2,
    field_spread_s: 1.3,
    speedRange: [80, 318],
    accent: "#5BB7E2",
    icon: (
      // Open-wheel: exposed wheels, narrow nose
      <g>
        <rect x="6"  y="14" width="6" height="8" fill="currentColor"/>
        <rect x="34" y="14" width="6" height="8" fill="currentColor"/>
        <rect x="14" y="16" width="20" height="4" fill="currentColor"/>
        <polygon points="34,16 42,18 34,20" fill="currentColor"/>
        <rect x="20" y="13" width="6" height="2" fill="currentColor"/>
      </g>
    ),
  },

  // GT — closed cockpit, production-derived (generic spec)
  gt: {
    id: "gt",
    short: "GT-X",
    name: "GT-X",
    full: "APEX GT-X · GRAND TOURING",
    tagline: "Production-derived GT · ~640 hp · twin-turbo flat-6 / V8",
    eyebrow: "TIER · PRODUCTION-BASED",
    chassis: "GT-X CHASSIS · MULTI-MAKE",
    engines: ["3.8L Flat-6 Twin-Turbo (635 hp)", "4.0L V8 Twin-Turbo (642 hp)", "5.2L V10 NA (628 hp)", "3.9L V8 Twin-Turbo (640 hp)"],
    chassis_marques: ["KESTREL K9-GT", "TARGA SOVRANO S8-GT", "STAGFORD V10-GT", "AUREUS AR-GT", "MAREN GT4-EVO"],
    weight_kg: 1290,
    top_speed_kph: 295,
    tyre_compounds: ["M", "H", "W"],
    tyre_cliff_lap: 80,
    fuel_kg_per_lap: 0.62,
    tank_kg: 100,
    pit_clean_s: 12.8, // 4-tyre + fuel rule
    base_lap_s: 78.4,
    field_spread_s: 2.8,
    speedRange: [60, 295],
    accent: "#C9A24A",
    icon: (
      // GT: low closed cockpit, distinct roof
      <g>
        <path d="M 4 22 L 8 14 L 18 12 L 30 12 L 40 14 L 44 22 Z" fill="currentColor"/>
        <path d="M 12 14 L 18 9 L 30 9 L 36 14 Z" fill="currentColor" opacity="0.55"/>
        <circle cx="12" cy="22" r="3.5" fill="#000"/>
        <circle cx="36" cy="22" r="3.5" fill="#000"/>
        <circle cx="12" cy="22" r="2" fill="currentColor"/>
        <circle cx="36" cy="22" r="2" fill="currentColor"/>
      </g>
    ),
  },

  // Stock car — heavy tube-frame, body-on-frame
  stock: {
    id: "stock",
    short: "STOCK",
    name: "STOCK",
    full: "APEX STOCK · TUBE-FRAME V8",
    tagline: "Tube-frame stock car · 720 hp · 5.7L V8 NA",
    eyebrow: "TIER · CUP DIVISION",
    chassis: "APEX Gen-7 spec tube-frame",
    engines: ["5.7L V8 NA — Push-Rod (720 hp)", "5.86L V8 NA — Push-Rod (715 hp)"],
    chassis_marques: ["GALAXA G5-S", "VINDICATOR SS-7", "MERIDIAN MX-7", "STAGFORD STALLION-S"],
    weight_kg: 1500,
    top_speed_kph: 298,
    tyre_compounds: ["M", "H"],
    tyre_cliff_lap: 55,
    fuel_kg_per_lap: 0.84,
    tank_kg: 70,
    pit_clean_s: 11.2,
    base_lap_s: 84.6,
    field_spread_s: 3.4,
    speedRange: [50, 298],
    accent: "#E26B3A",
    icon: (
      // Stock: tall greenhouse, fenders
      <g>
        <path d="M 4 22 L 6 16 L 12 14 L 36 14 L 42 16 L 44 22 Z" fill="currentColor"/>
        <path d="M 10 14 L 14 8 L 34 8 L 38 14 Z" fill="currentColor" opacity="0.55"/>
        <line x1="24" y1="8" x2="24" y2="14" stroke="#000" strokeWidth="1"/>
        <circle cx="12" cy="22" r="3.5" fill="#000"/>
        <circle cx="36" cy="22" r="3.5" fill="#000"/>
        <circle cx="12" cy="22" r="2" fill="currentColor"/>
        <circle cx="36" cy="22" r="2" fill="currentColor"/>
      </g>
    ),
  },

  // LMP/LMDh-style hypercar prototype (Le Mans hybrid spirit)
  prototype: {
    id: "prototype",
    short: "LMH-26",
    name: "PROTOTYPE",
    full: "APEX LMH · HYPERCAR PROTOTYPE",
    tagline: "Hybrid hypercar · 670 hp + 200 kW MGU · closed cockpit",
    eyebrow: "TIER · ENDURANCE",
    chassis: "LMH SPEC TUB",
    engines: ["3.0L V6 Twin-Turbo + Hybrid (~880 hp combined)", "3.5L V8 NA + Hybrid (~885 hp combined)", "4.0L V8 Twin-Turbo + Hybrid (~890 hp combined)"],
    chassis_marques: ["AUREUS LMH-9X1", "TARGA SOVRANO S9X", "MAREN HYPERCAR-G", "AUREUS RX5-LMP"],
    weight_kg: 1030,
    top_speed_kph: 340,
    tyre_compounds: ["S", "M", "H", "W"],
    tyre_cliff_lap: 110,
    fuel_kg_per_lap: 0.51,
    tank_kg: 90,
    pit_clean_s: 28.6, // refuel + tyres + driver-change capable
    base_lap_s: 71.8,
    field_spread_s: 1.9,
    speedRange: [70, 340],
    accent: "#9B6BC8",
    icon: (
      // Prototype: very low, fender humps, fin
      <g>
        <path d="M 2 22 L 6 18 L 12 17 L 18 12 L 30 12 L 36 17 L 42 18 L 46 22 Z" fill="currentColor"/>
        <rect x="22" y="6" width="2" height="6" fill="currentColor"/>
        <circle cx="10" cy="22" r="3" fill="#000"/>
        <circle cx="38" cy="22" r="3" fill="#000"/>
      </g>
    ),
  },

  // Electric formula
  e_spec: {
    id: "e_spec",
    short: "E-SPEC",
    name: "E-SPEC",
    full: "APEX E-SPEC · ALL-ELECTRIC FORMULA",
    tagline: "All-electric single-seater · 350 kW · regen-heavy",
    eyebrow: "TIER · ELECTRIC",
    chassis: "APEX E-26 spec monocoque",
    engines: ["350 kW Front-Drive Electric Powertrain", "350 kW Rear-Drive Electric Powertrain"],
    chassis_marques: ["MAREN E-MOTOR M2", "AUREUS E-VOLT", "VINDICATOR EV-PURE", "TARGA E-CORSA"],
    weight_kg: 854,
    top_speed_kph: 280,
    tyre_compounds: ["A"], // all-weather single compound
    tyre_cliff_lap: 95,
    fuel_kg_per_lap: 0, // energy
    tank_kg: 0,
    pit_clean_s: 0, // attack-mode swap, no pit-stop refuel
    base_lap_s: 76.4,
    field_spread_s: 1.6,
    speedRange: [40, 280],
    accent: "#3DD68C",
    icon: (
      // E-Spec: covered front wheels, exposed rear, lightning detail
      <g>
        <path d="M 4 22 L 4 18 L 14 16 L 14 13 L 28 13 L 32 16 L 32 22 Z" fill="currentColor"/>
        <rect x="34" y="16" width="6" height="8" fill="currentColor"/>
        <polygon points="20,9 22,15 19,15 21,21 24,14 22,14 24,9" fill="#000"/>
      </g>
    ),
  },
};

const CAR_CLASS_LIST = ["open_wheel", "gt", "stock", "prototype", "e_spec"];

// Hash a string deterministically — for stable per-car overrides
function _hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Format a lap time in seconds → "M:SS.mmm"
function _fmtLap(sec) {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

// Apply a class to the base CARS array. Returns a NEW array; doesn't mutate.
function applyClassToCars(baseCars, classId) {
  const C = CAR_CLASSES[classId];
  if (!C) return baseCars;

  const tankKg = C.tank_kg;
  const burnPerLap = C.fuel_kg_per_lap;

  return baseCars.map((c, idx) => {
    // Per-car deterministic offset within the field-spread band.
    const h = _hash(C.id + ":" + c.no);
    const norm = (h % 1000) / 1000; // 0..1
    const spreadOffset = norm * C.field_spread_s;
    // Position-based ordering: leader fastest, P12 slowest
    const posOffset = (c.pos - 1) * (C.field_spread_s / 11);

    const bestSec = C.base_lap_s + posOffset * 0.7 + spreadOffset * 0.3;
    const lastSec = bestSec + 0.3 + ((h >> 3) % 700) / 1000;

    // Engine — for open-wheel keep original (already from APEX engine pool), else pick by hash
    let engine, chassis;
    if (classId === "open_wheel") {
      engine = c.engine;
      chassis = c.chassis;
    } else {
      engine = C.engines[h % C.engines.length];
      chassis = (C.chassis_marques || [C.chassis])[(h >> 4) % (C.chassis_marques || [C.chassis]).length];
    }

    // Tire — pick from class compounds, biased by position group
    const baseIdx = { S: 0, M: 1, H: 2 }[c.tire] ?? 1;
    const compIdx = Math.min(baseIdx, C.tyre_compounds.length - 1);
    const tire = C.tyre_compounds[compIdx];
    // Tire age scales with class cliff
    const tire_age = Math.round((c.tire_age / 65) * C.tyre_cliff_lap);
    // Fuel — for E-spec use energy %, otherwise scale
    const fuel = classId === "e_spec"
      ? Math.max(20, 100 - (c.pos * 1.6 + (h % 6))) // energy %
      : Math.max(C.fuel_kg_per_lap * 4, tankKg * 0.55 + ((h % 200) / 200) * (tankKg * 0.2));

    return {
      ...c,
      _classId: classId,
      chassis,
      engine,
      best_lap: _fmtLap(bestSec),
      last_lap: _fmtLap(lastSec),
      _bestSec: bestSec,
      tire,
      tire_age,
      fuel,
    };
  });
}

window.CAR_CLASSES = CAR_CLASSES;
window.CAR_CLASS_LIST = CAR_CLASS_LIST;
window.applyClassToCars = applyClassToCars;
