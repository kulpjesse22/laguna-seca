// APEX SERIES — fictional motorsport championship
// Real Laguna Seca track. Original teams, drivers, sponsors.

// 12 cars — original liveries, teams, drivers
const CARS = [
  {
    no: 7, pos: 1, name: "MAREN VOSS", country: "SE", age: 28,
    team: "ARC NORDIC RACING", short: "ARC",
    livery: { primary: "#E8E4DC", secondary: "#0B0B0B", accent: "#C8102E", pattern: "stripe-diag" },
    chassis: "APEX OW-26 spec tub", engine: "Hayashi HX-26 2.2L V6 Twin-Turbo (760 hp)",
    crew_chief: "TOMASZ BERG", race_engineer: "PIA HALSTEAD",
    sponsors: { title: "NORDVIK ENERGY", primary: ["FJELL LUBRICANTS", "ISBRYT BRAKES", "HALVARD ELECTRIC"], support: ["TUNDRA SEATS", "POLAR OPTICS", "KALLA WATCHES", "RIMFROST TYRE CO.", "BERGSTÅL TOOLS", "SKÅNE GRID"] },
    bio: "Stockholm-born, karted in the Nordic championship by 11. Won APEX Rookie of the Year in 2023. Cool under pressure — known on the radio as 'The Glacier'. 3rd-generation racer; her grandfather Jan Voss raced sports cars in the '60s.",
    helmet: { primary: "#E8E4DC", secondary: "#C8102E", visor: "#0B0B0B" },
    crew_chief_bio: "20 years in the pit lane. Came up through Le Mans prototypes before crossing to APEX. Runs the cleanest sub-2.4s stops in the paddock.",
    race_engineer_bio: "Aerodynamicist by training (KTH Royal Institute). Joined ARC after four years on the Hayashi engine programme.",
    last_lap: "1:09.842", best_lap: "1:09.214", gap: "LEADER",
    tire: "S", tire_age: 9, fuel: 38.4,
    sectors: [{ s: "S1", t: "21.104", state: "purple" }, { s: "S2", t: "26.918", state: "green" }, { s: "S3", t: "21.820", state: "yellow" }],
  },
  {
    no: 22, pos: 2, name: "RAFA MORENO", country: "BR", age: 31,
    team: "VELOCITÀ MILANO", short: "VLM",
    livery: { primary: "#0B1F3A", secondary: "#C9A24A", accent: "#E8E4DC", pattern: "stripe-vert" },
    chassis: "APEX OW-26 spec tub", engine: "Corsa C-66 2.2L V6 Twin-Turbo (758 hp)",
    crew_chief: "ENZO BARRA", race_engineer: "SOFIA REI",
    sponsors: { title: "CASA VELLUTO", primary: ["AMARO SERENO", "OROLOGI DUCALI", "LUCE MARELLO"], support: ["TESSUTI BRERA", "FRENI LOMBARDI", "PETROLI AURORA", "GUANTI VOLTA", "VOLANTE 1923", "CINTURE ALBA"] },
    bio: "São Paulo native who climbed the European single-seater ladder. Twice runner-up in APEX Feeder before the top tier picked him up. Aggressive on cold tyres, brilliant in the wet. Plays bossa nova guitar between sessions.",
    helmet: { primary: "#0B1F3A", secondary: "#C9A24A", visor: "#0B0B0B" },
    crew_chief_bio: "Milan veteran. Ran an endurance prototype programme for three seasons. Demands a 1.8s fuel-only stop or shorter.",
    race_engineer_bio: "First female lead engineer in Velocità's 40-year history. PhD in tyre dynamics from Politecnico di Milano.",
    last_lap: "1:09.901", best_lap: "1:09.342", gap: "+0.842",
    tire: "S", tire_age: 8, fuel: 38.1,
    sectors: [{ s: "S1", t: "21.218", state: "green" }, { s: "S2", t: "27.014", state: "yellow" }, { s: "S3", t: "21.669", state: "purple" }],
  },
  {
    no: 11, pos: 3, name: "OKONKWO ADEYEMI", country: "NG", age: 26,
    team: "MERIDIAN GP", short: "MRD",
    livery: { primary: "#0E5E3A", secondary: "#0B0B0B", accent: "#FFFFFF", pattern: "stripe-horiz" },
    chassis: "APEX OW-26 spec tub", engine: "Hayashi HX-26 2.2L V6 Twin-Turbo (760 hp)",
    crew_chief: "AKIN WALSH", race_engineer: "JUNE OKAFOR",
    sponsors: { title: "ÒKÈ SPORTSWEAR", primary: ["LAGOON OILS", "SAHEL FREIGHT", "OBA TYRES"], support: ["DELTA FUELS", "NIGER CAPITAL", "EKO BRAKES", "IROKO LUBES", "HARMATTAN EYEWEAR", "ADIRE HELMETS"] },
    bio: "Lagos-born. Came through the African karting circuit, then APEX Feeder Asia. Famous for his late-braking move on Parrish at Spa. First Nigerian to score an APEX podium.",
    helmet: { primary: "#0E5E3A", secondary: "#FFFFFF", visor: "#0B0B0B" },
    crew_chief_bio: "Former single-seater mechanic. Built Meridian's pit crew from scratch when the team joined APEX in 2024.",
    race_engineer_bio: "Strategy specialist. Called the one-stop pivot at Long Beach that vaulted the team from P9 to P3.",
    last_lap: "1:10.012", best_lap: "1:09.488", gap: "+1.221",
    tire: "M", tire_age: 6, fuel: 41.7,
    sectors: [{ s: "S1", t: "21.402", state: "yellow" }, { s: "S2", t: "27.118", state: "yellow" }, { s: "S3", t: "21.492", state: "green" }],
  },
  {
    no: 4, pos: 4, name: "JUNE TANAKA", country: "JP", age: 24,
    team: "KINTSUGI MOTORSPORT", short: "KIN",
    livery: { primary: "#0B0B0B", secondary: "#D4AF37", accent: "#C8102E", pattern: "kintsugi" },
    chassis: "APEX OW-26 spec tub", engine: "Hayashi HX-26 2.2L V6 Twin-Turbo (760 hp)",
    crew_chief: "HARUTO MIZUKI", race_engineer: "REN TAKEDA",
    sponsors: { title: "KAGAMI TYRE", primary: ["HOSHI FUELS", "TOKEI WATCH CO.", "RAIDEN SYSTEMS"], support: ["SAKURA OILS", "KABUTO HELMETS", "ZABUTON SEATS", "TABI GEAR", "HIBANA PLUGS", "YAMAKAZE RUBBER"] },
    bio: "Suzuka-trained, APEX Asia champion in 2024. Smooth and analytical — engineers say her data is 'eerily repeatable'. APEX rookie this season; already on the podium.",
    helmet: { primary: "#0B0B0B", secondary: "#D4AF37", visor: "#C8102E" },
    crew_chief_bio: "Three-time APEX GT-X champion crew chief. First season outside Japan. Brings a meticulous, low-noise pit philosophy.",
    race_engineer_bio: "Tokyo Tech grad. Wrote the regen-braking model that APEX teams now reference.",
    last_lap: "1:10.118", best_lap: "1:09.611", gap: "+1.918",
    tire: "M", tire_age: 5, fuel: 41.4,
    sectors: [{ s: "S1", t: "21.488", state: "yellow" }, { s: "S2", t: "27.244", state: "yellow" }, { s: "S3", t: "21.601", state: "green" }],
  },
  {
    no: 19, pos: 5, name: "ELLIS PARRISH", country: "GB", age: 33,
    team: "ALBION HOUSE", short: "ALB",
    livery: { primary: "#1D3F6E", secondary: "#E8E4DC", accent: "#C8102E", pattern: "stripe-diag" },
    chassis: "APEX OW-26 spec tub", engine: "Marlow M-26 2.2L V6 Twin-Turbo (752 hp)",
    crew_chief: "RHYS HEWITT", race_engineer: "ANNA BOULT",
    sponsors: { title: "HALLMARK & CROWE", primary: ["THAMES PETROLEUM", "BEACON MOBILE", "WESSEX BANK"], support: ["COTSWOLD TYRE", "SAVILE TAILORS", "DOVER SPARKLING", "STRAND BRAKES", "KESTREL SUITS", "ENFIELD PISTONS"] },
    bio: "Silverstone karter at 8, F3 champion at 19. Veteran — this is his 11th season at the top tier. Calm radio voice; mentor to half the grid's rookies.",
    helmet: { primary: "#1D3F6E", secondary: "#E8E4DC", visor: "#0B0B0B" },
    crew_chief_bio: "Welsh, ex-RAF logistics. Runs Albion's pit wall like a military operation. 90% stops under 2.5s in 2025.",
    race_engineer_bio: "Cambridge engineering. Led the wet-weather setup programme — Albion is undefeated in rain since 2024.",
    last_lap: "1:10.214", best_lap: "1:09.722", gap: "+2.402",
    tire: "M", tire_age: 3, fuel: 41.0,
    sectors: [{ s: "S1", t: "21.514", state: "yellow" }, { s: "S2", t: "27.318", state: "yellow" }, { s: "S3", t: "21.704", state: "yellow" }],
  },
  {
    no: 33, pos: 6, name: "CASIMIR DIOR", country: "FR", age: 29,
    team: "ÉCURIE BLEU", short: "EBL",
    livery: { primary: "#0E2D5C", secondary: "#E8E4DC", accent: "#D4AF37", pattern: "stripe-vert" },
    chassis: "APEX OW-26 spec tub", engine: "Marlow M-26 2.2L V6 Twin-Turbo (752 hp)",
    crew_chief: "LUC FERRAND", race_engineer: "MARIE HERVÉ",
    sponsors: { title: "ÉNERGIE AZUR", primary: ["PNEUS LOIRE", "MAISON FAVRE HORLOGERIE", "HUILES ORNE"], support: ["SIÈGES VERDON", "LUBRIFIANTS JURA", "PISTONS ARDÈCHE", "FREINS MISTRAL", "BAQUETS RHÔNE", "AUTOMOBILES COTTIN"] },
    bio: "Le Mans-born, son of a Le Mans 24 Hours winner. Fastest qualifier in last year's championship. Quiet, intense — keeps a notebook on every corner he's ever driven.",
    helmet: { primary: "#0E2D5C", secondary: "#D4AF37", visor: "#C8102E" },
    crew_chief_bio: "30 years in French sports-car racing. Ran a prototype programme. Speaks four languages on the radio.",
    race_engineer_bio: "ENSAM Paris. Moved from APEX E-Spec to the open-wheel tier in 2023; brought regen-mapping expertise.",
    last_lap: "1:10.402", best_lap: "1:09.811", gap: "+3.118",
    tire: "M", tire_age: 2, fuel: 40.6,
    sectors: [{ s: "S1", t: "21.612", state: "yellow" }, { s: "S2", t: "27.488", state: "yellow" }, { s: "S3", t: "21.802", state: "yellow" }],
  },
  {
    no: 88, pos: 7, name: "LIV SCHRADER", country: "DE", age: 27,
    team: "EISEN-HAUS", short: "EIS",
    livery: { primary: "#1A1A1A", secondary: "#9D9DA0", accent: "#C8102E", pattern: "stripe-horiz" },
    chassis: "APEX OW-26 spec tub", engine: "Hayashi HX-26 2.2L V6 Twin-Turbo (760 hp)",
    crew_chief: "FRIEDRICH KOLB", race_engineer: "MARLA WIRTH",
    sponsors: { title: "KRAFTWERK SYSTEME", primary: ["RHEIN OEL", "ALPENSCHUTZ VERSICHERUNG", "BAVARIA MOTORWERKE"], support: ["SITZWERK", "DÄMPFER KOLB", "GETRIEBE NORD", "KOLBEN SÜD", "SCHWARZWALD REIFEN", "SPRINT SPORTWEAR"] },
    bio: "Bavarian, came up through German GT racing. Engineering-minded driver — has a master's in mechatronics from TU Munich. Famously methodical setup process.",
    helmet: { primary: "#1A1A1A", secondary: "#9D9DA0", visor: "#C8102E" },
    crew_chief_bio: "From a German touring-car programme. Brought a six-step pit-stop checklist that's now standard across Eisen-Haus.",
    race_engineer_bio: "Aerodynamics PhD, ex-endurance racing. Rebuilt EIS's CFD pipeline in her first six months.",
    last_lap: "1:10.488", best_lap: "1:09.902", gap: "+3.611",
    tire: "M", tire_age: 28, fuel: 40.3,
    sectors: [{ s: "S1", t: "21.702", state: "yellow" }, { s: "S2", t: "27.502", state: "yellow" }, { s: "S3", t: "21.918", state: "yellow" }],
  },
  {
    no: 51, pos: 8, name: "DESMOND CHAU", country: "HK", age: 30,
    team: "PACIFIC CREST", short: "PAC",
    livery: { primary: "#E8E4DC", secondary: "#0E5E3A", accent: "#3FB27F", pattern: "stripe-diag" },
    chassis: "APEX OW-26 spec tub", engine: "Marlow M-26 2.2L V6 Twin-Turbo (752 hp)",
    crew_chief: "WEI LAU", race_engineer: "MAX GOLDEN",
    sponsors: { title: "HARBOUR JADE AIRWAYS", primary: ["KOWLOON TRUST", "VICTORIA PEAK WATCHES", "PEARL RIVER FUELS"], support: ["TYPHOON TYRES", "STAR FERRY OPTICS", "LANTAU TIMING", "NEON EYEWEAR", "DRAGON SPARK DRINKS", "JUNK SAIL HELMETS"] },
    bio: "Hong Kong native, came up through Asian junior single-seaters. Veteran of GT3 endurance racing before crossing to single-seaters. Strategist on track — saves tyres better than anyone.",
    helmet: { primary: "#E8E4DC", secondary: "#0E5E3A", visor: "#0B0B0B" },
    crew_chief_bio: "A decade in endurance racing. Specializes in long-stint strategy.",
    race_engineer_bio: "Stanford ME. Joined Pacific Crest as their first US-based engineer; now leads vehicle dynamics.",
    last_lap: "1:10.602", best_lap: "1:10.018", gap: "+4.288",
    tire: "H", tire_age: 42, fuel: 44.2,
    sectors: [{ s: "S1", t: "21.804", state: "yellow" }, { s: "S2", t: "27.612", state: "yellow" }, { s: "S3", t: "22.018", state: "yellow" }],
  },
  {
    no: 6, pos: 9, name: "TRACE HOLLOWAY", country: "US", age: 35,
    team: "BAJA CASTLE", short: "BJC",
    livery: { primary: "#C8102E", secondary: "#0B0B0B", accent: "#E8E4DC", pattern: "stripe-vert" },
    chassis: "APEX OW-26 spec tub", engine: "Hayashi HX-26 2.2L V6 Twin-Turbo (760 hp)",
    crew_chief: "JESSE DUNCAN", race_engineer: "PERRY CASTILLO",
    sponsors: { title: "RATTLER ENERGY", primary: ["LONE MESA BOURBON", "PERMIAN OIL", "BIG SKY TYRE"], support: ["DUSTDEVIL OPTICS", "SPUR GEAR", "RIO BRAKES", "MUSTANG LUBES", "ALAMO TOOLS", "DESERT SUN EYEWEAR"] },
    bio: "Texas-born, Nashville-raised. Ex-APEX Stock driver who crossed to open-wheel at 32. Cult following — wears a cowboy hat to the podium. Wins in the rain, loses in the qualifying simulator.",
    helmet: { primary: "#C8102E", secondary: "#0B0B0B", visor: "#E8E4DC" },
    crew_chief_bio: "Lifelong stock-car mechanic. Crossed over with Trace. Famously fast on no-stop calls.",
    race_engineer_bio: "Rice University, started in American open-wheel racing. Maintains the team's setup database — over 4,000 entries.",
    last_lap: "1:10.711", best_lap: "1:10.118", gap: "+5.014",
    tire: "H", tire_age: 42, fuel: 44.0,
    sectors: [{ s: "S1", t: "21.918", state: "yellow" }, { s: "S2", t: "27.704", state: "yellow" }, { s: "S3", t: "22.089", state: "yellow" }],
  },
  {
    no: 14, pos: 10, name: "SILJE HAUG", country: "NO", age: 25,
    team: "FJORD DYNAMICS", short: "FJD",
    livery: { primary: "#0B3D5C", secondary: "#E8E4DC", accent: "#5BB7E2", pattern: "stripe-horiz" },
    chassis: "APEX OW-26 spec tub", engine: "Marlow M-26 2.2L V6 Twin-Turbo (752 hp)",
    crew_chief: "OVE LARSSEN", race_engineer: "INGRID HOLM",
    sponsors: { title: "NORDSJØ ENERGI", primary: ["VIKA MOTORS", "FJORDBANK", "AURORA TELECOM"], support: ["TROLL GEAR", "HAVSKUM TYRES", "LOFOTEN RUBBER", "SKAGEN SEATS", "BERGEN LUBES", "KNUT COMPRESSORS"] },
    bio: "From Bergen. Junior World Karting champion at 14. Quiet, surgical driver — one fast lap per session is enough for her. Lives with two huskies.",
    helmet: { primary: "#0B3D5C", secondary: "#5BB7E2", visor: "#E8E4DC" },
    crew_chief_bio: "Ex-Scandinavian touring-car programme. Cold-weather setup expert. Two clean stops under 2.40s this season.",
    race_engineer_bio: "NTNU Trondheim. Led Fjord's data team before promotion. Calm under fire.",
    last_lap: "1:10.802", best_lap: "1:10.244", gap: "+5.788",
    tire: "H", tire_age: 42, fuel: 43.8,
    sectors: [{ s: "S1", t: "21.988", state: "yellow" }, { s: "S2", t: "27.808", state: "yellow" }, { s: "S3", t: "22.118", state: "yellow" }],
  },
  {
    no: 9, pos: 11, name: "MATEO REYES", country: "MX", age: 22,
    team: "SOL ROJO", short: "SOL",
    livery: { primary: "#E8E4DC", secondary: "#C8102E", accent: "#D4AF37", pattern: "stripe-diag" },
    chassis: "APEX OW-26 spec tub", engine: "Hayashi HX-26 2.2L V6 Twin-Turbo (760 hp)",
    crew_chief: "OSCAR MENDEZ", race_engineer: "ANA QUINTANA",
    sponsors: { title: "TELEVÍA MX", primary: ["CERVECERÍA ALBA", "AZTECA MOTORS", "SALSAS DEL VALLE"], support: ["ACEITES SIERRA", "PETROSOL", "CASCOS JAGUAR", "LLANTAS COBRE", "ASIENTOS TULUM", "LENTES SOLAR"] },
    bio: "Mexico City prodigy. Karted in Europe from 13. Youngest APEX driver this season — already qualifying inside the top 8. Backed by Televía MX from his rookie year.",
    helmet: { primary: "#E8E4DC", secondary: "#C8102E", visor: "#D4AF37" },
    crew_chief_bio: "Came over from a North American junior programme. Mentor to the team's young pit crew.",
    race_engineer_bio: "ITESM Monterrey. First Mexican female lead engineer in APEX history.",
    last_lap: "1:10.918", best_lap: "1:10.402", gap: "+6.502",
    tire: "S", tire_age: 4, fuel: 36.2,
    sectors: [{ s: "S1", t: "21.488", state: "green" }, { s: "S2", t: "27.218", state: "green" }, { s: "S3", t: "22.212", state: "yellow" }],
  },
  {
    no: 27, pos: 12, name: "VEDA RAMACHANDRAN", country: "IN", age: 24,
    team: "MONSOON RACING", short: "MON",
    livery: { primary: "#5C1F4D", secondary: "#D4AF37", accent: "#E8E4DC", pattern: "stripe-vert" },
    chassis: "APEX OW-26 spec tub", engine: "Marlow M-26 2.2L V6 Twin-Turbo (752 hp)",
    crew_chief: "ARJUN KAPOOR", race_engineer: "PRIYA NAIR",
    sponsors: { title: "KAVERI DIGITAL", primary: ["DECCAN TYRES", "SAHYADRI MOTORS", "INDUS GRID"], support: ["GANGA FUELS", "MALABAR OILS", "HIMALAYA RUBBER", "KERALA SEATS", "RAJ HELMETS", "LOTUS HOME"] },
    bio: "Bangalore-born. Came up through Asian junior single-seaters. First Indian woman in APEX. Engineering background — owns three patents on cooling-duct geometry.",
    helmet: { primary: "#5C1F4D", secondary: "#D4AF37", visor: "#0B0B0B" },
    crew_chief_bio: "20 years across Asian junior and electric series. Brought a six-person pit crew with her.",
    race_engineer_bio: "IIT Bombay. Tyre-degradation modelling specialist. Known for precise long-stint calls.",
    last_lap: "1:11.014", best_lap: "1:10.502", gap: "+7.214",
    tire: "H", tire_age: 42, fuel: 43.5,
    sectors: [{ s: "S1", t: "22.018", state: "yellow" }, { s: "S2", t: "27.918", state: "yellow" }, { s: "S3", t: "22.288", state: "yellow" }],
  },
];

// Telemetry trace for one lap, 100 samples from the S/F line. `corners` are sample
// indices of the circuit's turns (from the race model's track geometry); braking
// happens on the approach, throttle comes back after the apex, never both at once.
function generateTelemetry(seed, corners) {
  const cs = corners && corners.length ? corners : [12, 22, 32, 42, 52, 62, 72, 82, 92];
  const out = [];
  for (let i = 0; i < 100; i++) {
    let throttle = 100, brake = 0;
    for (const c of cs) {
      const d = ((i - c) % 100 + 100) % 100;
      const before = 100 - d;
      if (before > 0 && before <= 4) {
        brake = Math.max(brake, 95 - (before - 1) * 12);
        throttle = 0;
      } else if (d === 0) {
        brake = Math.max(brake, 30); throttle = 0;
      } else if (d <= 5 && brake === 0) {
        throttle = Math.min(throttle, 25 + d * 15);
      }
    }
    const j = Math.sin(i * 0.7 + seed * 0.3) * 1.5;
    if (throttle > 0) throttle = Math.max(0, Math.min(100, throttle + j));
    if (brake > 0) brake = Math.max(0, Math.min(100, brake + j * 0.4));
    const speed = brake > 30 ? 110 + (100 - brake) * 1.4 : 120 + throttle * 1.85;
    out.push({ i, throttle, brake, speed: Math.max(80, Math.min(310, speed)) });
  }
  return out;
}

// Pit stop log — last few stops in the race
const PIT_LOG = [
  { lap: 38, no: 7, team: "ARC", duration: 2.41, action: "S→S", notes: "CLEAN. UNDERCUT MORENO." },
  { lap: 39, no: 22, team: "VLM", duration: 2.62, action: "S→S", notes: "WHEELGUN HESITATION L/R." },
  { lap: 41, no: 11, team: "MRD", duration: 2.38, action: "S→M", notes: "STRATEGY: ONE-STOP PIVOT." },
  { lap: 42, no: 4, team: "KIN", duration: 2.51, action: "S→M", notes: "FRONT WING ADJ." },
  { lap: 44, no: 19, team: "ALB", duration: 2.48, action: "S→M", notes: "" },
  { lap: 45, no: 33, team: "EBL", duration: 2.44, action: "S→M", notes: "" },
];

window.APEX_DATA = { CARS, PIT_LOG, generateTelemetry };
