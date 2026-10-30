// APEX SERIES — circuit library
// Each entry has: id, meta, SVG path on a 1000×560 viewBox, turn markers, sectors,
// pit lane, and a hill-suggestion ellipse (for elevation hint).
// Paths are stylized but recognizable — corners in the right relative positions,
// signature features called out (Eau Rouge, 130R, Loews Hairpin, etc.).

window.TRACKS = {
  laguna_seca: {
    id: "laguna_seca",
    name: "WEATHERTECH RACEWAY LAGUNA SECA",
    short: "LAGUNA SECA",
    location: "MONTEREY, CALIFORNIA",
    country: "USA",
    length_km: 3.602, length_mi: 2.238, turns_count: 11, laps: 95,
    elevation_ft: 180,
    signature: "THE CORKSCREW · T8/8a",
    accent: "#C8A24A", // dry-grass gold of the Monterey hills
    direction: "CCW",
    surface: "ASPHALT",
    drs_zones: 0,
    weather: { air_c: 19, track_c: 31, wind_kph: 14, condition: "DRY / SUNNY", humidity: 58 },
    history: {
      opened: 1957,
      lap_record: { time: "1:07.722", driver: "HÉLIO CASTRONEVES", year: 2000, car: "REYNARD-HONDA · CART RACE LAP" },
      first_winner: "PETE LOVELY · 1957",
      facts: [
        "Built on a former U.S. Army training ground at Fort Ord; the original lap was 1.9mi.",
        "The Corkscrew drops ~59 ft (5.5 storeys) between T8 entry and T8a exit — equivalent to a 12-percent grade.",
        "Counter-clockwise; one of only a handful of major U.S. road circuits that runs that way.",
        "Repaved in 2007 and re-profiled at the entry to T11 in 2021 to widen overtaking lines.",
      ],
      legends: ["ALEX ZANARDI '96 PASS ON BRYAN HERTA", "MOTO GP CORKSCREW DUEL"],
    },
    path: [
      "M 700 480",
      "L 700 280",
      "C 700 245, 715 225, 750 220",
      "L 815 215",
      "C 870 213, 895 195, 880 165",
      "C 865 140, 820 138, 780 152",
      "L 700 175",
      "C 660 188, 625 190, 600 170",
      "C 575 150, 545 152, 525 175",
      "C 510 195, 480 200, 445 180",
      "L 360 165",
      "C 305 152, 270 165, 250 200",
      "L 200 240",
      "C 175 255, 155 250, 145 230",
      "C 130 210, 105 220, 105 245",
      "L 115 280",
      "C 122 305, 150 312, 165 295",
      "C 180 280, 200 285, 200 310",
      "L 195 360",
      "C 192 395, 175 415, 145 425",
      "L 110 445",
      "C 85 458, 85 485, 115 495",
      "L 240 510",
      "C 320 520, 420 522, 520 502",
      "L 660 488",
      "C 685 485, 695 482, 700 480",
      "Z",
    ].join(" "),
    pit: "M 720 480 L 720 285 C 720 260, 728 248, 745 245",
    sf_line: { x1: 690, y1: 380, x2: 715, y2: 380, label_x: 685, label_y: 372, anchor: "end" },
    turns: [
      { n: 1,  x: 720, y: 235, label: "T1" },
      { n: 2,  x: 895, y: 175, label: "T2", important: true, name: "ANDRETTI HAIRPIN" },
      { n: 3,  x: 660, y: 175, label: "T3" },
      { n: 5,  x: 470, y: 192, label: "T5" },
      { n: 6,  x: 270, y: 162, label: "T6" },
      { n: 8,  x: 95,  y: 290, label: "T8/8a", important: true, name: "CORKSCREW" },
      { n: 9,  x: 215, y: 380, label: "T9", name: "RAINEY" },
      { n: 11, x: 270, y: 530, label: "T11" },
    ],
    hill: { cx: 130, cy: 270, rx: 180, ry: 150, focus: "CORKSCREW" },
  },

  monza: {
    id: "monza",
    name: "AUTODROMO NAZIONALE MONZA",
    short: "MONZA",
    location: "MONZA, ITALY",
    country: "ITA",
    length_km: 5.793, length_mi: 3.600, turns_count: 11, laps: 53,
    elevation_ft: 30,
    signature: "PARABOLICA · T11",
    accent: "#C8102E", // Italian racing red
    direction: "CW",
    surface: "ASPHALT",
    drs_zones: 2,
    weather: { air_c: 26, track_c: 42, wind_kph: 8, condition: "DRY / SUNNY", humidity: 44 },
    history: {
      opened: 1922,
      lap_record: { time: "1:21.046", driver: "RUBENS BARRICHELLO", year: 2004, car: "FERRARI F2004" },
      first_winner: "PIETRO BORDINO · 1922",
      facts: [
        "Third-oldest purpose-built circuit in the world, after Brooklands and Indianapolis.",
        "Top speeds exceed 360 km/h on the front straight — nicknamed the Temple of Speed.",
        "The crumbling banked oval (built 1955) still stands inside the modern road course.",
        "Hosts the Italian Grand Prix every year except 1980 — the longest tenure of any GP venue.",
      ],
      legends: ["PERON 1955 BANKING ERA", "SCHUMACHER 5-WIN STREAK 2000-04"],
    },
    path: [
      "M 200 470",            // start/finish bottom-left front straight
      "L 800 470",            // long front straight east
      "C 880 470, 920 460, 920 420",   // T1 Variante del Rettifilo (chicane)
      "L 900 400",
      "C 880 380, 870 360, 890 340",
      "L 880 320",
      "C 870 290, 850 280, 820 290",   // Curva Grande sweep (T3)
      "L 700 320",
      "L 560 330",
      "C 510 332, 480 320, 470 290",   // T4 Variante della Roggia
      "L 460 250",
      "C 458 220, 470 200, 500 195",   // Lesmo 1 (T6)
      "L 580 188",
      "C 615 185, 635 200, 635 230",   // Lesmo 2 (T7)
      "L 632 280",
      "C 628 320, 600 340, 560 360",   // back through Serraglio
      "L 320 390",                      // toward Ascari
      "C 280 395, 250 380, 240 350",   // Variante Ascari (T8-9-10)
      "L 230 310",
      "C 225 280, 200 270, 175 285",
      "L 150 305",
      "C 130 320, 120 350, 130 380",   // exit Ascari
      "L 110 430",
      "C 105 460, 130 480, 170 475",   // Parabolica T11 (long sweep onto front straight)
      "L 200 470",
      "Z",
    ].join(" "),
    pit: "M 220 478 L 760 478",
    sf_line: { x1: 350, y1: 462, x2: 350, y2: 478, label_x: 350, label_y: 455, anchor: "middle" },
    turns: [
      { n: 1,  x: 920, y: 405, label: "T1", important: true, name: "RETTIFILO" },
      { n: 3,  x: 880, y: 295, label: "T3", name: "CURVA GRANDE" },
      { n: 4,  x: 470, y: 270, label: "T4", name: "ROGGIA" },
      { n: 6,  x: 500, y: 195, label: "T6", important: true, name: "LESMO" },
      { n: 8,  x: 250, y: 360, label: "T8", important: true, name: "ASCARI" },
      { n: 11, x: 110, y: 460, label: "T11", important: true, name: "PARABOLICA" },
    ],
    hill: { cx: 500, cy: 280, rx: 250, ry: 80, focus: "FLAT · TEMPLE OF SPEED" },
  },

  spa: {
    id: "spa",
    name: "CIRCUIT DE SPA-FRANCORCHAMPS",
    short: "SPA",
    location: "STAVELOT, BELGIUM",
    country: "BEL",
    length_km: 7.004, length_mi: 4.352, turns_count: 19, laps: 44,
    elevation_ft: 328,
    signature: "EAU ROUGE · RAIDILLON",
    accent: "#3A7A4F", // Ardennes forest green
    direction: "CW",
    surface: "ASPHALT",
    drs_zones: 2,
    weather: { air_c: 14, track_c: 19, wind_kph: 22, condition: "OVERCAST / DAMP", humidity: 78 },
    history: {
      opened: 1921,
      lap_record: { time: "1:46.286", driver: "VALTTERI BOTTAS", year: 2018, car: "MERCEDES W09" },
      first_winner: "BARON DE TORNACO · 1922",
      facts: [
        "Original 14.1km road course used public roads through Malmedy and Stavelot until 1979.",
        "It is famously possible to have rain on one section of the circuit while another stays bone dry.",
        "Eau Rouge climbs 41m vertical in 300m — taken flat-out at 300+ km/h in a modern car.",
        "Longest circuit on the modern F1 calendar; one full lap of the Nürburgring Nordschleife is longer historically.",
      ],
      legends: ["SENNA POLE 1985 IN THE WET", "FISICHELLA WIN 2009 FORCE INDIA"],
    },
    path: [
      "M 180 480",                // La Source pre-hairpin (bottom-left)
      "C 145 478, 135 460, 150 440",  // La Source hairpin
      "L 200 410",                // exit, downhill toward Eau Rouge
      "L 280 460",                // dip into Eau Rouge
      "C 320 480, 360 470, 380 430",  // through Eau Rouge / Raidillon up
      "L 430 360",                // Kemmel Straight up to right
      "L 590 280",                // continuing up Kemmel
      "C 640 260, 680 260, 700 290", // Les Combes T5
      "L 720 320",
      "C 730 350, 755 360, 780 345",  // Malmedy T7
      "L 830 320",
      "C 870 305, 895 320, 895 360", // Rivage T8
      "L 880 410",
      "C 870 440, 840 455, 805 445", // Pouhon double-left T10
      "L 750 425",
      "C 715 415, 695 430, 695 460", // Fagnes
      "L 720 490",
      "C 730 520, 700 540, 660 530", // Stavelot T15
      "L 580 500",
      "C 540 490, 510 500, 495 525", // Blanchimont approach
      "L 420 540",
      "C 380 545, 350 535, 340 515", // Blanchimont T17 (high-speed left)
      "L 320 480",
      "C 310 450, 280 440, 250 455", // Bus Stop chicane T18-19
      "L 220 470",
      "C 200 478, 188 482, 180 480",
      "Z",
    ].join(" "),
    pit: "M 200 490 L 360 490",
    sf_line: { x1: 220, y1: 472, x2: 220, y2: 488, label_x: 220, label_y: 465, anchor: "middle" },
    turns: [
      { n: 1, x: 130, y: 450, label: "T1", important: true, name: "LA SOURCE" },
      { n: 3, x: 320, y: 495, label: "T3", important: true, name: "EAU ROUGE" },
      { n: 5, x: 680, y: 250, label: "T5", name: "LES COMBES" },
      { n: 10, x: 895, y: 410, label: "T10", important: true, name: "POUHON" },
      { n: 15, x: 670, y: 545, label: "T15", name: "STAVELOT" },
      { n: 17, x: 360, y: 555, label: "T17", important: true, name: "BLANCHIMONT" },
      { n: 18, x: 250, y: 425, label: "T18", name: "BUS STOP" },
    ],
    hill: { cx: 320, cy: 430, rx: 90, ry: 70, focus: "EAU ROUGE · 41M CLIMB" },
  },

  monaco: {
    id: "monaco",
    name: "CIRCUIT DE MONACO",
    short: "MONACO",
    location: "MONTE CARLO, MONACO",
    country: "MON",
    length_km: 3.337, length_mi: 2.074, turns_count: 19, laps: 78,
    elevation_ft: 138,
    signature: "LOEWS HAIRPIN · T6",
    accent: "#D4AF37", // gilt Monte-Carlo gold
    direction: "CW",
    surface: "ASPHALT (STREET)",
    drs_zones: 1,
    weather: { air_c: 22, track_c: 34, wind_kph: 6, condition: "DRY / SUNNY", humidity: 62 },
    history: {
      opened: 1929,
      lap_record: { time: "1:12.909", driver: "LEWIS HAMILTON", year: 2021, car: "MERCEDES W12" },
      first_winner: "WILLIAM GROVER-WILLIAMS · 1929 BUGATTI T35B",
      facts: [
        "Loews (Fairmont) Hairpin is the slowest corner in F1 — taken at ~50 km/h in second gear.",
        "The circuit weaves through the Principality's public streets and is rebuilt each spring over six weeks.",
        "Average speed is the lowest of any GP — about 160 km/h — but the run from the tunnel exit hits 290.",
        "Famously dangerous — Alberto Ascari (1955) and Paul Hawkins (1965) both ended races in the harbour.",
      ],
      legends: ["SENNA 6 WINS · '87, '89-'93", "PROST DEFEAT 1988"],
    },
    path: [
      "M 580 500",                  // Sainte Devote approach (front straight bottom)
      "L 280 510",                  // front straight east-to-west
      "C 220 512, 200 495, 215 470", // Sainte Devote T1
      "L 240 430",                  // Beau Rivage uphill
      "L 280 360",
      "C 290 320, 320 305, 360 315", // Massenet T3
      "L 420 340",
      "C 460 350, 480 335, 480 305", // Casino Square T4
      "L 470 270",
      "C 460 240, 430 230, 405 245", // Mirabeau T5
      "L 360 270",
      "C 330 285, 320 275, 310 245", // Loews / Grand Hairpin T6 — tightest in F1
      "C 305 220, 330 210, 360 220",
      "L 410 235",
      "C 445 245, 460 270, 450 295", // Portier T8
      "L 480 320",
      "L 580 340",                   // Tunnel
      "C 640 350, 700 360, 760 360",
      "C 820 360, 850 380, 840 410", // Nouvelle Chicane T10
      "L 800 425",
      "C 770 435, 760 460, 780 480", // Tabac T12
      "L 820 490",
      "L 880 490",                   // Swimming Pool entrance (Piscine)
      "C 920 490, 935 470, 920 450", // Swimming Pool T13
      "L 880 430",
      "C 855 420, 855 395, 880 385",
      "L 920 380",
      "C 950 380, 960 405, 940 425", // exit Pool
      "L 900 460",
      "C 880 480, 860 495, 830 510", // La Rascasse T18
      "L 760 525",
      "C 710 535, 680 530, 660 515", // Anthony Noghes T19
      "L 580 500",
      "Z",
    ].join(" "),
    pit: "M 280 522 L 540 522",
    sf_line: { x1: 400, y1: 502, x2: 400, y2: 518, label_x: 400, label_y: 495, anchor: "middle" },
    turns: [
      { n: 1, x: 195, y: 470, label: "T1", name: "STE DEVOTE" },
      { n: 3, x: 320, y: 290, label: "T3", important: true, name: "CASINO" },
      { n: 6, x: 280, y: 235, label: "T6", important: true, name: "LOEWS" },
      { n: 8, x: 495, y: 320, label: "T8", name: "PORTIER" },
      { n: 10, x: 870, y: 405, label: "T10", name: "CHICANE" },
      { n: 13, x: 950, y: 470, label: "T13", important: true, name: "SWIMMING POOL" },
      { n: 18, x: 850, y: 525, label: "T18", name: "RASCASSE" },
    ],
    hill: { cx: 320, cy: 290, rx: 140, ry: 100, focus: "CASINO HILL" },
  },

  silverstone: {
    id: "silverstone",
    name: "SILVERSTONE CIRCUIT",
    short: "SILVERSTONE",
    location: "TOWCESTER, ENGLAND",
    country: "GBR",
    length_km: 5.891, length_mi: 3.661, turns_count: 18, laps: 52,
    elevation_ft: 49,
    signature: "MAGGOTS / BECKETTS · T10-14",
    accent: "#1D3F6E", // British racing navy
    direction: "CW",
    surface: "ASPHALT",
    drs_zones: 2,
    weather: { air_c: 17, track_c: 24, wind_kph: 18, condition: "BROKEN CLOUD", humidity: 70 },
    history: {
      opened: 1948,
      lap_record: { time: "1:27.097", driver: "MAX VERSTAPPEN", year: 2020, car: "RED BULL RB16" },
      first_winner: "LUIGI VILLORESI · 1948 MASERATI",
      facts: [
        "Built on the runways of WWII RAF Silverstone bomber station — the original layout used the perimeter roads.",
        "Hosted the very first Formula 1 World Championship race on 13 May 1950.",
        "Maggotts-Becketts-Chapel is widely considered the finest sequence of high-speed corners on the calendar.",
        "Modernised in 2010 with the new 'Arena' layout that moved the start/finish to between Club and Abbey.",
      ],
      legends: ["MANSELL-PIQUET 1987 BATTLE", "HAMILTON 8 BRITISH GP WINS"],
    },
    path: [
      "M 220 480",                    // front straight start (Hamilton Straight)
      "L 720 480",                    // long front straight
      "C 770 482, 800 470, 800 440",  // Abbey T1
      "L 780 410",
      "C 760 380, 770 350, 800 340",  // Farm Curve / T2 Village
      "L 840 320",
      "C 870 305, 880 275, 855 255",  // The Loop T3
      "L 815 240",
      "C 780 230, 760 245, 760 275",  // Aintree T4
      "L 770 320",
      "L 600 280",                    // Wellington Straight
      "C 560 270, 540 250, 545 220",  // Brooklands T6
      "L 530 195",
      "C 510 175, 480 180, 470 200",  // Luffield T7
      "L 460 220",
      "C 450 245, 460 265, 490 270",  // Woodcote T8 (back to start)
      "L 540 280",
      "L 640 220",                    // along to Copse
      "C 680 200, 720 215, 720 250",  // Copse T9
      "L 700 280",
      "L 580 330",                    // Maggotts entry
      "C 540 345, 510 335, 500 305",  // Maggotts T10
      "L 440 290",
      "C 405 285, 385 305, 390 335",  // Becketts T12
      "L 420 360",
      "C 440 380, 425 410, 395 415",  // Chapel T13
      "L 320 420",                    // Hangar Straight
      "C 270 425, 240 410, 235 380",  // Stowe T15
      "L 220 360",
      "C 195 340, 165 350, 160 380",  // Vale T16
      "L 165 410",
      "C 170 440, 195 460, 220 480",  // Club T17
      "Z",
    ].join(" "),
    pit: "M 240 492 L 680 492",
    sf_line: { x1: 350, y1: 472, x2: 350, y2: 488, label_x: 350, label_y: 465, anchor: "middle" },
    turns: [
      { n: 1, x: 825, y: 425, label: "T1", name: "ABBEY" },
      { n: 6, x: 555, y: 200, label: "T6", name: "BROOKLANDS" },
      { n: 9, x: 740, y: 245, label: "T9", important: true, name: "COPSE" },
      { n: 10, x: 510, y: 280, label: "T10", important: true, name: "MAGGOTTS" },
      { n: 13, x: 410, y: 395, label: "T13", important: true, name: "BECKETTS" },
      { n: 15, x: 230, y: 360, label: "T15", name: "STOWE" },
      { n: 17, x: 200, y: 460, label: "T17", name: "CLUB" },
    ],
    hill: { cx: 460, cy: 320, rx: 180, ry: 100, focus: "MAGGOTTS COMPLEX" },
  },

  suzuka: {
    id: "suzuka",
    name: "SUZUKA INTERNATIONAL RACING COURSE",
    short: "SUZUKA",
    location: "SUZUKA, JAPAN",
    country: "JPN",
    length_km: 5.807, length_mi: 3.608, turns_count: 18, laps: 53,
    elevation_ft: 130,
    signature: "130R · T15 · FIGURE-8 LAYOUT",
    accent: "#E8E4DC", // bone-white over deep red — Honda heritage
    direction: "CW",
    surface: "ASPHALT",
    drs_zones: 1,
    weather: { air_c: 21, track_c: 28, wind_kph: 12, condition: "DRY / SUNNY", humidity: 65 },
    history: {
      opened: 1962,
      lap_record: { time: "1:30.983", driver: "LEWIS HAMILTON", year: 2019, car: "MERCEDES W10" },
      first_winner: "PETER WARR · 1963 LOTUS 23",
      facts: [
        "The only figure-8 layout on the Formula 1 calendar — the back straight crosses over via a road bridge.",
        "Originally designed by Dutch engineer John Hugenholtz as a Honda test track.",
        "130R is the legendary, almost-flat-out left-hander where Alonso passed Schumacher around the outside in 2005.",
        "Six F1 World Championships have been decided at Suzuka, more than at any other circuit.",
      ],
      legends: ["SENNA-PROST 1989/1990 COLLISIONS", "ALONSO 130R PASS 2005"],
    },
    path: [
      "M 740 470",                    // S/F start
      "L 280 470",                    // front straight east-to-west
      "C 230 472, 210 460, 220 430",  // T1 right
      "L 240 400",                    // T2 left
      "C 250 370, 280 360, 310 375",
      "L 350 400",                    // S Curves T3
      "C 380 415, 410 405, 420 380",  // T4
      "L 440 350",                    // T5
      "C 450 320, 480 310, 510 320",  // T6
      "L 540 340",
      "C 560 360, 555 390, 530 405",  // T7 Dunlop
      "L 490 420",                    // bridge to back of figure-8
      "C 460 425, 440 410, 440 385",
      "L 420 360",                    // crossover under bridge — Degner 1
      "C 400 335, 380 335, 365 355",  // Degner 2 T9
      "L 340 380",
      "C 320 405, 290 405, 275 380",  // hairpin T11
      "C 260 355, 285 335, 320 325",
      "L 380 305",                    // 200R back up
      "C 425 290, 460 305, 470 335",  // Spoon Curve T13-14 (long sweep)
      "L 520 360",
      "L 700 340",                    // long back straight east
      "C 760 335, 800 350, 810 380",  // 130R T15
      "C 815 410, 800 430, 770 435",  // 130R apex
      "L 740 440",
      "C 720 445, 715 460, 720 472",  // Casio Triangle / T17 chicane
      "L 740 470",
      "Z",
    ].join(" "),
    pit: "M 320 482 L 700 482",
    sf_line: { x1: 500, y1: 462, x2: 500, y2: 478, label_x: 500, label_y: 455, anchor: "middle" },
    turns: [
      { n: 1, x: 215, y: 410, label: "T1" },
      { n: 3, x: 320, y: 360, label: "T3", important: true, name: "S CURVES" },
      { n: 7, x: 565, y: 395, label: "T7", name: "DUNLOP" },
      { n: 9, x: 360, y: 340, label: "T9", important: true, name: "DEGNER" },
      { n: 11, x: 270, y: 405, label: "T11", name: "HAIRPIN" },
      { n: 14, x: 480, y: 320, label: "T14", important: true, name: "SPOON" },
      { n: 15, x: 825, y: 405, label: "T15", important: true, name: "130R" },
      { n: 17, x: 720, y: 458, label: "T17", name: "CASIO" },
    ],
    hill: { cx: 440, cy: 380, rx: 120, ry: 60, focus: "FIGURE-8 BRIDGE" },
  },

  cota: {
    id: "cota",
    name: "CIRCUIT OF THE AMERICAS",
    short: "COTA",
    location: "AUSTIN, TEXAS",
    country: "USA",
    length_km: 5.513, length_mi: 3.426, turns_count: 20, laps: 56,
    elevation_ft: 133,
    signature: "T1 UPHILL APEX · 41M CLIMB",
    accent: "#E8843A", // Texas burnt-orange
    direction: "CCW",
    surface: "ASPHALT",
    drs_zones: 2,
    weather: { air_c: 28, track_c: 44, wind_kph: 16, condition: "DRY / HAZY", humidity: 50 },
    history: {
      opened: 2012,
      lap_record: { time: "1:36.169", driver: "CHARLES LECLERC", year: 2019, car: "FERRARI SF90" },
      first_winner: "LEWIS HAMILTON · 2012 (USGP)",
      facts: [
        "Newest circuit in this rotation — purpose-built for F1 by Hermann Tilke at a cost of ~$400M.",
        "Turn 1 is a 41-metre blind uphill climb to a downhill apex, modelled after Spa's first sector.",
        "T3-T6 is a near-direct homage to Silverstone's Maggotts-Becketts; T16-T18 echoes Hockenheim's stadium section.",
        "Bumpy surface — repaved in 2023 ahead of MotoGP after F1 drivers complained of porpoising-induced damage.",
      ],
      legends: ["VERSTAPPEN T12 PASS HAMILTON 2021", "ROSSI MOTOGP DOMINATION 2014-15"],
    },
    path: [
      "M 250 510",                    // front straight start
      "L 600 510",                    // front straight east
      "C 660 510, 685 490, 680 460",  // T1 — iconic uphill blind apex
      "L 660 410",
      "C 645 380, 670 355, 700 360",  // T2-3 esses
      "L 750 365",
      "C 790 370, 805 350, 800 320",  // T4-7 maggotts-style
      "L 770 295",
      "C 740 280, 730 255, 750 235",  // T6
      "L 790 220",
      "C 825 210, 855 230, 845 260",  // T9
      "L 825 290",
      "C 810 320, 825 345, 855 350",  // T10
      "L 890 360",
      "C 925 365, 935 395, 905 410",  // T11 hairpin (mini-Loews)
      "L 870 430",
      "C 840 445, 820 430, 815 400",  // back through
      "L 800 360",
      "L 720 385",                    // back straight diagonal
      "L 540 410",
      "C 500 415, 480 400, 480 370",  // T12 left
      "L 460 340",
      "C 440 310, 410 305, 380 320",  // T13-14
      "L 350 340",
      "C 320 360, 305 350, 295 320",  // T15 stadium left
      "L 280 285",
      "C 270 250, 290 230, 320 235",  // T16 stadium right
      "L 360 245",
      "C 395 255, 410 280, 395 305",  // T17
      "L 370 330",
      "C 345 350, 320 345, 305 320",  // T18
      "L 285 295",
      "C 260 275, 230 290, 230 320",  // T19
      "L 215 360",
      "C 195 400, 200 450, 230 480",  // T20 sweeper to S/F
      "L 250 510",
      "Z",
    ].join(" "),
    pit: "M 260 522 L 580 522",
    sf_line: { x1: 400, y1: 502, x2: 400, y2: 518, label_x: 400, label_y: 495, anchor: "middle" },
    turns: [
      { n: 1, x: 690, y: 445, label: "T1", important: true, name: "UPHILL APEX" },
      { n: 6, x: 770, y: 240, label: "T6", name: "ESSES" },
      { n: 11, x: 935, y: 395, label: "T11", important: true, name: "HAIRPIN" },
      { n: 12, x: 470, y: 380, label: "T12" },
      { n: 15, x: 290, y: 305, label: "T15", name: "STADIUM" },
      { n: 19, x: 215, y: 320, label: "T19", important: true, name: "MULTI-APEX" },
      { n: 20, x: 200, y: 460, label: "T20" },
    ],
    hill: { cx: 690, cy: 430, rx: 60, ry: 80, focus: "T1 · 41M CLIMB" },
  },

  long_beach: {
    id: "long_beach",
    name: "LONG BEACH STREET CIRCUIT",
    short: "LONG BEACH",
    location: "LONG BEACH, CALIFORNIA",
    country: "USA",
    length_km: 3.167, length_mi: 1.968, turns_count: 11, laps: 85,
    elevation_ft: 8,
    signature: "SHORELINE DRIVE · T8-9 HAIRPIN",
    accent: "#5BB7E2", // Pacific blue
    direction: "CW",
    surface: "ASPHALT (STREET)",
    drs_zones: 0,
    weather: { air_c: 20, track_c: 29, wind_kph: 14, condition: "DRY / COASTAL", humidity: 68 },
    history: {
      opened: 1975,
      lap_record: { time: "1:06.857", driver: "HÉLIO CASTRONEVES", year: 2017, car: "PENSKE-CHEVY DALLARA" },
      first_winner: "BRIAN REDMAN · 1975 F5000",
      facts: [
        "Hosted Formula 1 from 1976-83 as the U.S. Grand Prix West before becoming an IndyCar mainstay.",
        "Mario Andretti's 1977 USGP-West win helped seal his '78 World Championship momentum.",
        "Runs around the Long Beach Convention Center and Aquarium of the Pacific — completely re-laid each April.",
        "The Toyota Grand Prix of Long Beach is the longest continuously-running street race in North America.",
      ],
      legends: ["ANDRETTI 1977 USGP-WEST WIN", "UNSER 1995 SHOELACE STOP"],
    },
    path: [
      "M 220 490",                    // front straight start
      "L 800 490",                    // long Shoreline front straight
      "C 860 490, 880 475, 870 445",  // T1 right
      "L 850 415",
      "C 830 385, 830 360, 855 345",  // T2 left chicane
      "L 880 325",
      "L 880 240",                    // up Aquarium Way
      "C 880 200, 855 180, 820 185",  // T4 hairpin (Aquarium)
      "L 760 200",
      "C 720 210, 700 200, 700 170",  // T5
      "L 690 130",
      "C 685 100, 660 90, 630 100",   // T6
      "L 540 130",                    // along Pine Avenue
      "C 490 145, 460 140, 440 115",  // T7
      "L 390 110",
      "C 350 105, 320 130, 320 160",  // T8 Convention hairpin (signature)
      "C 320 195, 350 215, 385 215",  // T9 Convention apex
      "L 440 220",
      "L 440 280",                    // down Linden Ave
      "C 440 320, 415 340, 380 340",  // T10 left
      "L 320 340",
      "C 280 340, 250 360, 240 395",  // T11 entry — fountain corner
      "L 230 440",
      "C 225 470, 210 488, 220 490",  // back to S/F
      "Z",
    ].join(" "),
    pit: "M 250 502 L 720 502",
    sf_line: { x1: 400, y1: 482, x2: 400, y2: 498, label_x: 400, label_y: 475, anchor: "middle" },
    turns: [
      { n: 1, x: 880, y: 430, label: "T1" },
      { n: 4, x: 880, y: 175, label: "T4", name: "AQUARIUM" },
      { n: 6, x: 690, y: 90, label: "T6" },
      { n: 8, x: 295, y: 145, label: "T8", important: true, name: "CONVENTION HAIRPIN" },
      { n: 10, x: 460, y: 320, label: "T10" },
      { n: 11, x: 215, y: 415, label: "T11", important: true, name: "FOUNTAIN" },
    ],
    hill: { cx: 500, cy: 300, rx: 200, ry: 60, focus: "FLAT · STREET COURSE" },
  },

  road_america: {
    id: "road_america",
    name: "ROAD AMERICA",
    short: "ROAD AMERICA",
    location: "ELKHART LAKE, WISCONSIN",
    country: "USA",
    length_km: 6.515, length_mi: 4.048, turns_count: 14, laps: 55,
    elevation_ft: 230,
    signature: "T5 CARROUSEL · T11 KINK",
    accent: "#7DC383", // Wisconsin pasture green
    direction: "CW",
    surface: "ASPHALT",
    drs_zones: 1,
    weather: { air_c: 16, track_c: 22, wind_kph: 10, condition: "PARTLY CLOUDY", humidity: 72 },
    history: {
      opened: 1955,
      lap_record: { time: "1:39.866", driver: "WILL POWER", year: 2017, car: "PENSKE-CHEVY DALLARA" },
      first_winner: "PHIL HILL · 1955 FERRARI 750 MONZA",
      facts: [
        "Replaced the original public-roads Elkhart Lake course (run 1950-52) which used 6.5mi of village streets.",
        "Almost unchanged in 70 years — same layout Stirling Moss raced on now hosts modern IndyCar.",
        "Famous Carousel was repaved in 2016 to fix bumps that had grown into the asphalt for decades.",
        "The Kink (T11) is taken at over 280 km/h — one of the highest-speed corners in North American racing.",
      ],
      legends: ["MOSS 1962 SCCA SPRINT", "BRABHAM 1969 CAN-AM WIN"],
    },
    path: [
      "M 200 490",                    // S/F front straight
      "L 720 490",                    // front straight to T1
      "C 780 490, 810 475, 810 445",  // T1 right
      "L 800 410",
      "C 790 380, 800 350, 825 340",  // T2-3 esses
      "L 855 325",
      "C 885 310, 905 285, 885 260",  // T4
      "L 850 240",
      "C 815 225, 790 210, 790 180",  // T5 Carrousel — long right sweep
      "C 790 145, 825 130, 860 145",
      "L 880 165",
      "C 905 185, 905 220, 885 240",  // exit Carrousel
      "L 820 280",
      "L 600 270",                    // long Moraine Sweep
      "C 555 270, 530 250, 540 220",  // T6 hurry downs
      "L 555 185",
      "C 565 155, 545 130, 510 130",  // T8 Hurry Downs
      "L 460 140",
      "C 420 150, 395 140, 390 110",  // T9
      "L 380 80",
      "C 370 50, 340 40, 310 55",     // T10 Canada Corner
      "L 270 80",
      "C 240 100, 235 130, 260 150",  // T11 Kink (signature high-speed left)
      "L 320 175",
      "L 350 220",                    // back to T12
      "C 360 250, 340 280, 305 285",  // T12 The Kink
      "L 260 285",
      "C 220 290, 195 315, 200 350",  // T13
      "L 195 410",
      "C 192 450, 195 480, 200 490",  // T14 onto front straight
      "Z",
    ].join(" "),
    pit: "M 220 502 L 660 502",
    sf_line: { x1: 350, y1: 482, x2: 350, y2: 498, label_x: 350, label_y: 475, anchor: "middle" },
    turns: [
      { n: 1, x: 815, y: 425, label: "T1" },
      { n: 5, x: 905, y: 175, label: "T5", important: true, name: "CARROUSEL" },
      { n: 8, x: 565, y: 130, label: "T8" },
      { n: 10, x: 320, y: 35, label: "T10", name: "CANADA CORNER" },
      { n: 11, x: 240, y: 130, label: "T11", important: true, name: "THE KINK" },
      { n: 13, x: 180, y: 320, label: "T13" },
    ],
    hill: { cx: 300, cy: 200, rx: 180, ry: 130, focus: "ELKHART HILLS" },
  },

  miami: {
    id: "miami",
    name: "MIAMI INTERNATIONAL AUTODROME",
    short: "MIAMI",
    location: "MIAMI GARDENS, FLORIDA",
    country: "USA",
    length_km: 5.412, length_mi: 3.363, turns_count: 19, laps: 57,
    elevation_ft: 6,
    signature: "TURN 17 · STADIUM CHICANE",
    accent: "#00D2BE",
    direction: "CW",
    surface: "ASPHALT",
    drs_zones: 3,
    weather: { air_c: 30, track_c: 48, wind_kph: 12, condition: "HOT / HUMID", humidity: 72 },
    history: {
      opened: 2022,
      lap_record: { time: "1:29.708", driver: "MAX VERSTAPPEN", year: 2023, car: "RED BULL RB19-HONDA" },
      first_winner: "MAX VERSTAPPEN · 2022",
      facts: [
        "Built around the Hard Rock Stadium campus; the circuit uses public roads and temporary barriers.",
        "Three DRS zones make it one of the best tracks for overtaking on the current calendar.",
        "The Turn 17 chicane around the stadium is the signature sequence — tight, blind, and bumpy.",
        "Sea-level circuit in subtropical Miami; track temps regularly exceed 50°C during race day.",
      ],
      legends: ["PÉREZ VS SAINZ 2022 BATTLE FOR THE LEAD", "NORRIS 2024 MAIDEN VICTORY"],
    },
    path: [
      "M 580 500",
      "L 820 500",
      "C 860 500, 880 480, 880 450",
      "L 880 300",
      "C 880 270, 870 250, 840 240",
      "L 720 200",
      "C 690 192, 670 175, 670 150",
      "C 670 120, 690 100, 720 95",
      "L 860 75",
      "C 900 70, 920 55, 915 30",
      "C 910 10, 880 5, 850 15",
      "L 700 55",
      "C 660 65, 630 60, 610 40",
      "C 590 20, 560 25, 545 50",
      "L 520 90",
      "C 510 110, 490 120, 465 118",
      "L 300 105",
      "C 260 102, 230 115, 220 145",
      "L 200 210",
      "C 190 245, 165 260, 135 255",
      "C 105 250, 90 270, 95 300",
      "L 110 380",
      "C 115 420, 140 445, 175 450",
      "L 340 465",
      "C 380 470, 400 490, 395 520",
      "C 390 545, 410 555, 440 550",
      "L 540 520",
      "C 560 512, 570 505, 580 500",
      "Z",
    ].join(" "),
    pit: "M 560 500 L 800 500 C 840 500, 855 490, 860 460",
    sf_line: { x1: 660, y1: 490, x2: 660, y2: 510, label_x: 660, label_y: 520, anchor: "middle" },
    turns: [
      { n: 1,  x: 880, y: 460, label: "T1" },
      { n: 4,  x: 850, y: 250, label: "T4" },
      { n: 6,  x: 670, y: 120, label: "T6" },
      { n: 7,  x: 720, y: 90,  label: "T7" },
      { n: 8,  x: 910, y: 25,  label: "T8" },
      { n: 11, x: 545, y: 40,  label: "T11", important: true, name: "HARD ROCK STRAIGHT END" },
      { n: 13, x: 300, y: 105, label: "T13" },
      { n: 14, x: 220, y: 155, label: "T14" },
      { n: 16, x: 95, y: 310,  label: "T16" },
      { n: 17, x: 340, y: 465, label: "T17", important: true, name: "STADIUM CHICANE" },
    ],
    hill: { cx: 500, cy: 280, rx: 200, ry: 140, focus: "HARD ROCK CAMPUS" },
  },
};

// Per-track race meta: round, event, date — used by the topbar.
window.TRACK_EVENTS = {
  laguna_seca: { round: "ROUND 04", event: "GRAND PRIX OF MONTEREY", date: "MAY 17, 2026" },
  monza:       { round: "ROUND 11", event: "GRAN PREMIO D'ITALIA",   date: "SEP 06, 2026" },
  spa:         { round: "ROUND 09", event: "BELGIAN GRAND PRIX",     date: "AUG 23, 2026" },
  monaco:      { round: "ROUND 06", event: "MONACO GRAND PRIX",      date: "MAY 31, 2026" },
  silverstone: { round: "ROUND 08", event: "BRITISH GRAND PRIX",     date: "JUL 12, 2026" },
  suzuka:      { round: "ROUND 14", event: "JAPANESE GRAND PRIX",    date: "OCT 25, 2026" },
  cota:        { round: "ROUND 16", event: "UNITED STATES GP",       date: "NOV 08, 2026" },
  long_beach:  { round: "ROUND 03", event: "LONG BEACH GP",          date: "APR 19, 2026" },
  road_america:{ round: "ROUND 07", event: "GRAND PRIX OF AMERICA",  date: "JUN 28, 2026" },
  miami:       { round: "ROUND 05", event: "MIAMI GRAND PRIX",       date: "MAY 04, 2026" },
};

window.TRACK_LIST = [
  "laguna_seca", "long_beach", "road_america", "miami", "cota",
  "monza", "monaco", "spa", "silverstone", "suzuka",
];
