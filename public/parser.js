// Közös Kosár – helyi (AI nélküli) értelmező
// Diktált vagy beírt szövegből tételeket csinál: "két kiló krumplit meg tíz tojást és kenyeret"
// Offline is működik. Ha valamit nem ismer fel biztosan, jelzi (confident: false), és az app a Geminit kérdezi.

export const CATS = [
  "Zöldség, gyümölcs", "Hús, hal", "Tejtermék, tojás", "Pékáru", "Kamra",
  "Fagyasztott", "Ital", "Háztartás", "Egyéb",
];

export const norm = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");

/* ---------- Ismert termékek kategóriánként ---------- */
const GUESS = [
  [0, "alma körte banán narancs mandarin citrom lime szőlő eper málna áfonya dinnye görögdinnye sárgadinnye barack őszibarack kajszi szilva cseresznye meggy kiwi ananász mangó paradicsom koktélparadicsom paprika lecsópaprika uborka kígyóuborka hagyma vöröshagyma lilahagyma újhagyma póréhagyma fokhagyma krumpli burgonya édesburgonya répa sárgarépa fehérrépa petrezselyem saláta jégsaláta fejessaláta rukkola káposzta lilakáposzta cukkini padlizsán gomba csiperke zeller brokkoli karfiol spenót avokádó kelkáposzta retek tök sütőtök kapor bazsalikom gyömbér kukorica cékla zöldség gyümölcs"],
  [1, "csirke csirkemell csirkecomb csirkeszárny pulyka pulykamell sertés karaj tarja oldalas marha lábszár darálthús sonka szalámi kolbász parasztkolbász virsli bacon szalonna felvágott párizsi hal lazac tonhal pisztráng hekk garnéla hús"],
  [2, "tej tejföl tejszín habtejszín főzőtejszín vaj margarin sajt trappista parmezán mozzarella feta túró joghurt kefir tojás mascarpone krémsajt sajtkrém pudding tejberizs"],
  [3, "kenyér zsemle kifli kalács bagett tortilla pita péksütemény pogácsa zsemlemorzsa kakaóscsiga croissant toast toastkenyér"],
  [4, "liszt finomliszt cukor porcukor só bors olaj étolaj olívaolaj rizs tészta spagetti penne fusilli ecet méz kakaó kávé tea paradicsompüré passata konzerv bab lencse csicseriborsó zabpehely müzli pirospaprika babérlevél kömény köménymag oregánó mustár ketchup majonéz lekvár nutella sütőpor élesztő vanília vaníliáscukor csoki csokoládé keksz chips ropi mogyoró dió mák kukoricapehely gabonapehely"],
  [5, "fagyasztott mirelit jégkrém fagyi borsó pizza"],
  [6, "víz ásványvíz szóda szódavíz üdítő sör bor pezsgő gyümölcslé narancslé almalé szörp kóla limonádé"],
  [7, "mosogatószer mosószer öblítő wc-papír vécépapír papírtörlő szalvéta szivacs szemeteszsák fogkrém fogkefe sampon tusfürdő szappan alufólia folpack sütőpapír elem pelenka törlőkendő zsebkendő"],
];
const KNOWN = new Map(GUESS.flatMap(([c, s]) => s.split(" ").map((w) => [w, c])));
// Többszavas nevek (a beszédfelismerés gyakran külön írja őket)
const PHRASES = [
  ["tv paprika", 0], ["kaliforniai paprika", 0], ["őrölt paprika", 4], ["őrölt pirospaprika", 4], ["piros paprika", 0],
  ["darált hús", 1], ["darált sertéshús", 1], ["darált marhahús", 1], ["csirke mell", 1], ["csirke comb", 1],
  ["trappista sajt", 2], ["reszelt sajt", 2], ["wc papír", 7], ["vécé papír", 7], ["papír törlő", 7],
  ["narancs lé", 6], ["alma lé", 6], ["ásvány víz", 6], ["szóda víz", 6], ["szénsavas víz", 6], ["szénsavmentes víz", 6],
  ["mosogató szer", 7], ["mosó szer", 7], ["fejes saláta", 0], ["jég saláta", 0], ["lila hagyma", 0], ["vörös hagyma", 0],
  ["fok hagyma", 0], ["új hagyma", 0], ["sárga répa", 0], ["fehér répa", 0], ["olíva olaj", 4], ["étolaj", 4],
  ["por cukor", 4], ["vaníliás cukor", 4], ["sütő por", 4], ["zab pehely", 4], ["kakaós csiga", 3], ["toast kenyér", 3],
];
const PHRASE_NAME = (p) => ({ "csirke mell": "csirkemell", "csirke comb": "csirkecomb", "wc papír": "wc-papír", "vécé papír": "wc-papír",
  "papír törlő": "papírtörlő", "narancs lé": "narancslé", "alma lé": "almalé", "ásvány víz": "ásványvíz", "szóda víz": "szódavíz",
  "mosogató szer": "mosogatószer", "mosó szer": "mosószer", "fejes saláta": "fejessaláta", "jég saláta": "jégsaláta",
  "lila hagyma": "lilahagyma", "vörös hagyma": "vöröshagyma", "fok hagyma": "fokhagyma", "új hagyma": "újhagyma",
  "sárga répa": "sárgarépa", "fehér répa": "fehérrépa", "olíva olaj": "olívaolaj", "por cukor": "porcukor",
  "vaníliás cukor": "vaníliáscukor", "sütő por": "sütőpor", "zab pehely": "zabpehely", "kakaós csiga": "kakaóscsiga",
  "toast kenyér": "toastkenyér", "őrölt paprika": "őrölt pirospaprika", "piros paprika": "kaliforniai paprika" }[p] || p);

/* Melléknevek, amik egy termék elé kerülhetnek (nem teszik bizonytalanná) */
const ADJ = new Set("bio friss zsíros félzsíros sovány light laktózmentes cukormentes gluténmentes teljes teljeskiőrlésű kiőrlésű barna fehér piros zöld sárga nagy kicsi közepes szeletelt reszelt füstölt főtt házi natúr görög tartós szénsavas szénsavmentes mentes vegán csirke sertés marha pulyka darált őrölt fagyasztott mirelit apró hasábburgonya családi".split(" "));

/* Töltelékszavak, amiket a diktálásból kihagyunk */
const FILLER = new Set("kell kéne kellene kellenek venni vegyél vegyetek vegyünk veszek veszünk vennék vegyen hozz hozzál hozzatok hozni írd írjad írjátok írj fel felírni felírnád a az is még légyszi légyszíves légy szíves kérlek kérem kis pár valami valamit valamennyi nekünk nekem neked listára listához listába add adj hozzá ugye hát na szóval mondjuk ehhez ahhoz olyan olyat legyen lesz azt ezt jó oké ok rendben kb körülbelül vagy nagyjából".split(" "));
const SEPARATORS = /\s+(?:és|meg|plusz|aztán|valamint|utána|továbbá|illetve)\s+/g;

/* Számok szóval */
const NUM = { egy: 1, két: 2, kettő: 2, kettőt: 2, három: 3, hármat: 3, négy: 4, négyet: 4, öt: 5, ötöt: 5, hat: 6, hatot: 6, hét: 7, hetet: 7,
  nyolc: 8, nyolcat: 8, kilenc: 9, kilencet: 9, tíz: 10, tizet: 10, tizenegy: 11, tizenkét: 12, tizenkettő: 12, tizenöt: 15, húsz: 20,
  huszonöt: 25, harminc: 30, negyven: 40, ötven: 50, hatvan: 60, hetven: 70, nyolcvan: 80, száz: 100, kétszáz: 200, háromszáz: 300,
  ötszáz: 500, fél: 0.5, felet: 0.5, másfél: 1.5 };
const UNIT = { kiló: "kg", kilót: "kg", kilogramm: "kg", kilogrammot: "kg", kg: "kg", deka: "dkg", dekát: "dkg", deká: "dkg", dkg: "dkg",
  dekagramm: "dkg", gramm: "g", grammot: "g", g: "g", liter: "l", litert: "l", l: "l", deci: "dl", decit: "dl", dl: "dl", ml: "ml",
  darab: "db", darabot: "db", db: "db", csomag: "csomag", csomagot: "csomag", doboz: "doboz", dobozt: "doboz", üveg: "üveg",
  üveget: "üveg", fej: "fej", fejet: "fej", gerezd: "gerezd", gerezdet: "gerezd", tábla: "tábla", táblát: "tábla", karton: "karton",
  kartont: "karton", zacskó: "zacskó", zacskót: "zacskó", pohár: "pohár", poharat: "pohár", tálca: "tálca", tálcát: "tálca", rúd: "rúd",
  rudat: "rúd", szál: "szál", szálat: "szál", csokor: "csokor", csokrot: "csokor", flakon: "flakon", flakont: "flakon",
  tekercs: "tekercs", tekercset: "tekercs", kanna: "kanna", kannát: "kanna", tubus: "tubus", tubust: "tubus" };
const IRREG = { kenyeret: "kenyér", kenyerek: "kenyér", vizet: "víz", cukrot: "cukor", sört: "sör", bort: "bor", lisztet: "liszt",
  tököt: "tök", kalácsot: "kalács", csokit: "csoki", tejfölt: "tejföl", tejfölös: "tejföl", sót: "só", levet: "lé", tojásokat: "tojás" };

/* Kétértelmű szavak: ilyenkor visszakérdezünk */
export const AMBIG = {
  paprika: { question: "Milyen paprika kell?", options: ["tv paprika", "kaliforniai paprika", "őrölt pirospaprika"] },
  hagyma: { question: "Milyen hagyma kell?", options: ["vöröshagyma", "lilahagyma", "újhagyma"] },
  sajt: { question: "Milyen sajt kell?", options: ["trappista sajt", "reszelt sajt", "mozzarella"] },
  tészta: { question: "Milyen tészta kell?", options: ["spagetti", "penne", "levesbetét tészta"] },
  hús: { question: "Milyen hús kell?", options: ["csirkemell", "darált sertéshús", "marhalábszár"] },
  répa: { question: "Milyen répa kell?", options: ["sárgarépa", "fehérrépa"] },
  saláta: { question: "Milyen saláta kell?", options: ["jégsaláta", "fejessaláta", "rukkola"] },
};

/* ---------- Kategória tippelés ---------- */
export function guessCategory(name) {
  const n = norm(name);
  const words = n.split(/[\s,-]+/);
  let best = null;
  for (const [w, c] of KNOWN) {
    const hit = w.length <= 3 ? words.some((x) => x === w || (x.startsWith(w) && x.length <= w.length + 3)) : n.includes(w);
    if (hit && (!best || w.length > best[0].length)) best = [w, c];
  }
  for (const [p, c] of PHRASES) if (n.includes(p) && (!best || p.length > best[0].length)) best = [p, c];
  return CATS[best ? best[1] : 8];
}

/* Tárgyragos, többes számú alak visszavezetése az ismert alapszóra: "krumplit" → "krumpli", "almákat" → "alma" */
export function lemma(t) {
  if (KNOWN.has(t)) return t;
  if (IRREG[t]) return IRREG[t];
  const tries = [];
  const unlen = (s) => s.replace(/á$/, "a").replace(/é$/, "e");
  for (const suf of ["kat", "ket", "kot", "köt", "ak", "ek", "ok", "k"]) if (t.endsWith(suf)) tries.push(unlen(t.slice(0, -suf.length)));
  if (t.endsWith("t")) {
    const b = t.slice(0, -1);
    tries.push(b, unlen(b));
    if (/[aeoö]$/.test(b) && b.length > 3) tries.push(b.slice(0, -1));
  }
  for (const x of tries) if (KNOWN.has(x)) return x;
  return null;
}

function numToken(t) {
  const m = t.match(/^(\d+(?:[.,]\d+)?)([a-zá-ű]+)?$/);
  if (m) return { value: parseFloat(m[1].replace(",", ".")), unit: m[2] ? UNIT[m[2]] || null : null };
  if (t in NUM) return { value: NUM[t], unit: null };
  return null;
}
const fmtNum = (v) => String(v).replace(".", ",");

/* ---------- A fő értelmező ---------- */
export function parseSpoken(text) {
  const items = [];
  const questions = [];
  const cleaned = norm(text).replace(/\btévé\b/g, "tv").replace(/[„"“”'!?]/g, "").replace(/[.;:\n]+/g, ",");
  const segments = cleaned.split(",").flatMap((s) => s.split(SEPARATORS)).map((s) => s.trim()).filter(Boolean);

  for (const seg of segments) {
    const tok = seg.split(/\s+/);
    let qty = null, prefix = [], prefixUnknown = false;
    const push = (name, phraseDone = false) => {
      const full = [...prefix, name].join(" ");
      const it = { name: full, qty: qty || "", unknown: prefixUnknown, base: phraseDone ? full : name, hasPrefix: prefix.length > 0 };
      items.push(it);
      prefix = []; prefixUnknown = false; qty = null;
    };
    for (let i = 0; i < tok.length; i++) {
      const t = tok[i];
      if (t === "egy" && ["kis", "pár", "kevés"].includes(tok[i + 1])) { i++; continue; }
      const n = numToken(t);
      if (n) {
        let unit = n.unit;
        if (!unit && tok[i + 1] && UNIT[tok[i + 1]]) { unit = UNIT[tok[i + 1]]; i++; }
        qty = `${fmtNum(n.value)} ${unit || "db"}`;
        // "krumpli két kiló" – utólag mondott mennyiség az előző tételhez
        if (!prefix.length && items.length && !items[items.length - 1].qty && (i === tok.length - 1 || numToken(tok[i + 1] || "") )) {
          items[items.length - 1].qty = qty; qty = null;
        }
        continue;
      }
      if (FILLER.has(t)) continue;
      // többszavas kifejezés
      let matched = false;
      for (const len of [3, 2]) {
        const cand = tok.slice(i, i + len).map((w, k) => (k === len - 1 ? lemma(w) || w : w)).join(" ");
        const hit = PHRASES.find(([p]) => p === cand);
        if (hit) { push(PHRASE_NAME(hit[0]), true); i += len - 1; matched = true; break; }
      }
      if (matched) continue;
      const base = lemma(t);
      if (base) {
        // "csirke mell" típusú összetételt az előző lépés kezeli; itt egy ismert szó önálló tétel
        if (ADJ.has(t) && tok[i + 1] && (lemma(tok[i + 1]) || PHRASES.some(([p]) => p.startsWith(tok[i + 1])))) { prefix.push(t); continue; }
        push(base);
      } else {
        prefix.push(t);
        if (!ADJ.has(t)) prefixUnknown = true;
      }
    }
    if (prefix.length) {
      items.push({ name: prefix.join(" "), qty: qty || "", unknown: true, base: prefix.join(" "), hasPrefix: false });
      prefix = []; qty = null;
    } else if (qty && items.length && !items[items.length - 1].qty) {
      items[items.length - 1].qty = qty;
    }
  }

  // Kétértelmű tételekből kérdés lesz
  const out = [];
  for (const it of items) {
    const amb = !it.hasPrefix && AMBIG[it.base];
    if (amb) questions.push({ about: it.base, question: amb.question, options: amb.options.slice(), qty: it.qty });
    else out.push({ name: it.name, qty: it.qty, category: guessCategory(it.name), unknown: it.unknown });
  }
  const confident = out.length + questions.length > 0 && out.every((i) => !i.unknown);
  return { items: out.map(({ unknown, ...rest }) => rest), questions, confident, unknown: out.filter((i) => i.unknown).map((i) => i.name) };
}

/* ---------- Válasz egy nyitott kérdésre ("a kaliforniai", "mindegy", "nem kell") ---------- */
export const SKIP = Symbol("skip");
export function matchAnswer(q, text) {
  const t = norm(text).replace(/[.,!?]/g, "").replace(/tévé/g, "tv");
  if (/\b(nem kell|hagyd|felejtsd|mégse|semmi|töröld|kihagy|ne )/.test(t + " ")) return SKIP;
  if (/(mindegy|bármelyik|bármilyen|akármelyik|az első|amelyik)/.test(t)) return q.options[0];
  for (const o of q.options) {
    const on = norm(o);
    if (t.includes(on)) return o;
    const stems = on.split(" ").filter((w) => w.length >= 4 && w !== q.about).map((w) => w.slice(0, 5));
    if (stems.some((s) => t.includes(s))) return o;
  }
  // "második", "harmadik"
  const ord = ["első", "második", "harmadik", "negyedik"].findIndex((w) => t.includes(w));
  if (ord >= 0 && q.options[ord]) return q.options[ord];
  return null;
}

/* ---------- Létszám és mennyiség átszámítása ---------- */
// "lecsó 4 főre", "hat személyre", "négyen leszünk", vagy csak "négy" (válasz a „Hány főre?” kérdésre)
export function parseServings(text, { bare = false } = {}) {
  const t = norm(text).replace(/[.,!?]/g, " ");
  const toks = t.split(/\s+/);
  for (let i = 0; i < toks.length; i++) {
    const n = /^\d+$/.test(toks[i]) ? +toks[i] : (NUM[toks[i]] ?? (toks[i] === "kettőnkre" ? 2 : null));
    const next = toks[i + 1] || "";
    if (n && n >= 1 && n <= 30 && Number.isInteger(n) && (bare || /^(fő|főre|fős|személy|személyre|emberre|adag|adagot|adagra|embernek)/.test(next))) return n;
    const m = toks[i].match(/^(\d+)(fő|főre|fős|adag)/);
    if (m) return +m[1];
  }
  const word = { ketten: 2, kettesben: 2, hárman: 3, négyen: 4, öten: 5, hatan: 6, heten: 7, nyolcan: 8, tízen: 10 };
  for (const [w, n] of Object.entries(word)) if (t.includes(w)) return n;
  return null;
}
export function stripServings(text) {
  return String(text).replace(/(^|\s)(\d+|egy|két|kettő|három|négy|öt|hat|hét|nyolc|kilenc|tíz)\s*(főre|fős|fő|személyre|személy|emberre|adagra|adag)(?=\s|$)/gi, " ").replace(/\s+/g, " ").trim();
}

// "1 kg" × 1,5 → "1,5 kg"; "3 db" × 0,5 → "2 db"
export function scaleQty(qty, f) {
  if (!qty || f === 1) return qty;
  const m = String(qty).match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return qty;
  let v = parseFloat(m[1].replace(",", ".")) * f;
  const unit = m[2];
  if (/^(db|fej|gerezd|csomag|doboz|üveg|tábla|szál|csokor|rúd)$/.test(unit)) v = Math.max(1, Math.round(v));
  else v = Math.round(v * 10) / 10;
  return `${String(v).replace(".", ",")} ${unit}`.trim();
}
