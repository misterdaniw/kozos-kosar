// Közös Kosár – közös családi bevásárlólista
// Két háttér: Firebase (élő, valós idejű szinkron + Gemini AI) vagy demó (csak ezen az eszközön).

import { CATS, norm, guessCategory, parseSpoken, matchAnswer, matchOption, splitStop, SKIP, parseServings, stripServings, scaleQty } from "./parser.js";

const FIREBASE_CDN = "https://www.gstatic.com/firebasejs/13.1.0";
const CAT_HUE = [135, 6, 208, 30, 44, 190, 268, 322, 222];
const svg = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
// Kategória ikonok (sorrend = CATS)
export const CAT_ICON = [
  svg('<path d="M16 8C13.5 5.5 10 6.5 8.5 8.5L3.5 20.5l12-5c2-1.5 3-4.5.5-7.5Z"/><path d="M16 8l2-4.5M16 8l4.5-2M16 8l4 .8"/><path d="M9.2 12.3l1.8 1.8M7 16.3l1.4 1.4"/>'),
  svg('<path d="M2.5 12c3-4.5 9.5-5.5 13.5-2.2L20.5 7v10L16 14.2C12 17.5 5.5 16.5 2.5 12Z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><path d="M11 9.5c.8 1.6.8 3.4 0 5"/>'),
  svg('<path d="M8.5 2.5h7v3l2.5 3.5v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9l2.5-3.5Z"/><path d="M6 9h12"/><path d="M9.5 14.5c1.5 1.3 3.5 1.3 5 0"/>'),
  svg('<path d="M6 10.5a3.2 3.2 0 0 1 1-6.5h10a3.2 3.2 0 0 1 1 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19Z"/><path d="M10 9.5v6M14 9.5v6"/>'),
  svg('<path d="M8 2.5h8v3H8z"/><path d="M7 5.5h10a1 1 0 0 1 1 1V19a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19V6.5a1 1 0 0 1 1-1Z"/><path d="M6 11h12v5.5H6z"/>'),
  svg('<path d="M12 2.5v19M3.8 7.3l16.4 9.4M3.8 16.7l16.4-9.4"/><path d="M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2M4 11l3 1-1.2 3M20 13l-3-1 1.2-3"/>'),
  svg('<path d="M5.5 8.5h13l-1.6 11.6a1.5 1.5 0 0 1-1.5 1.4H8.6a1.5 1.5 0 0 1-1.5-1.4Z"/><path d="M12.5 8.5l2-6h3"/><path d="M6.2 13.5h11.6"/>'),
  svg('<path d="M9 10h6l1.2 3.2v7.3a1 1 0 0 1-1 1H8.8a1 1 0 0 1-1-1v-7.3Z"/><path d="M10 10V6h4.5l3 2"/><path d="M11.5 6V3.5h3"/><path d="M20 4.5v.01M21 8v.01M20 11.5v.01"/>'),
  svg('<path d="M4.5 8h15l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H7.2a1.5 1.5 0 0 1-1.5-1.3Z"/><path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5"/>'),
];
const ICON_POT = svg('<path d="M4 10h16v5.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5Z"/><path d="M2 10h20M9 4.5c0 1.2 1 1.2 1 2.5M13 4.5c0 1.2 1 1.2 1 2.5"/>');
const EMPTY_POT = `<svg class="empty-art" viewBox="0 0 160 110" aria-hidden="true">
  <path d="M60 22c0 6 6 6 6 13M76 18c0 6 6 6 6 13M92 22c0 6 6 6 6 13" stroke="hsl(208 70% 60%)" stroke-width="4" fill="none" stroke-linecap="round"/>
  <rect x="22" y="44" width="116" height="10" rx="5" fill="hsl(44 95% 55%)"/>
  <path d="M32 54h96v26a20 20 0 0 1-20 20H52a20 20 0 0 1-20-20Z" fill="var(--accent)"/>
  <circle cx="64" cy="74" r="4" fill="var(--surface)"/><circle cx="96" cy="74" r="4" fill="var(--surface)"/><path d="M70 84q10 8 20 0" stroke="var(--surface)" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;
const ICON_BASKET = svg('<path d="M3 9.5h18l-2 10a2 2 0 0 1-2 1.6H7a2 2 0 0 1-2-1.6Z"/><path d="M8 9.5l3-6M16 9.5l-3-6"/><path d="M8.5 15l2.5 2.5L16 13"/>');

/* ---------- Segédek ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const initials = (n) => (String(n || "?").trim()[0] || "?").toUpperCase();
const faceIdx = (n) => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 9973; return h % 6; };
const face = (n, cls = "") => `<span class="face f${faceIdx(n)} ${cls}" title="${esc(n)}">${esc(initials(n))}</span>`;

let toastTimer;
function toast(msg, action) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
  if (action) t.querySelector("button").onclick = () => { t.hidden = true; action.run(); };
  t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), action ? 5000 : 2600);
}

/* ---------- AI utasítás (Gemini) ---------- */
const SYSTEM_PROMPT = `Egy magyar család bevásárlólista-asszisztense vagy.
A felhasználó megnevez egy vagy több ételt (adagszámmal vagy anélkül), vagy szabad szöveggel kér valamit (pl. "reggelire valók egy hétre", "vasárnapi ebéd 6 főre").
Add vissza, amit meg kell venni hozzá.
Szabályok:
- A tétel neve magyarul, boltban szokásos, rövid megnevezés, kisbetűvel (pl. "vöröshagyma", "darált sertéshús", "tejföl").
- A mennyiség metrikus mértékegységben vagy darabban, boltban kapható kiszerelésre kerekítve (pl. "1 kg", "50 dkg", "2 db", "1 fej", "450 g"). Ha nincs megadva adagszám, 4 adaggal számolj.
- Ha több ételhez ugyanaz kell, vond össze egy tételbe.
- staple=true azokra, amik a legtöbb háztartásban általában otthon vannak (só, bors, olaj, cukor, liszt, ecet, alap fűszerek). Vizet ne adj vissza.
- A kategória a megadott listából legyen.
- title: rövid cím, pl. "Lecsó, 4 adag".
- steps: az elkészítés lépései röviden, saját szavaiddal (legfeljebb 10 lépés, mindegyik 1-3 mondat), a megadott létszámra. minutes: a teljes elkészítési idő percben.
- Ha a kérés nem egyértelmű, és a válasz lényegesen megváltoztatná a listát (pl. "valami vacsorát" vagy "sütit" – milyet?), adj vissza üres items listát, és a question mezőben kérdezz vissza röviden, az options mezőben 2-4 rövid válaszlehetőséggel. Apróságon (adagszám hiánya, márka) ne kérdezz.
- Ha a kérés nem értelmezhető ételként vagy bevásárlásként, adj vissza üres items listát, és a note mezőben röviden írd le, mit vársz.`;

const INTERPRET_PROMPT = `Egy magyar család bevásárlólistájához diktált vagy begépelt szöveget dolgozol fel. A szöveg gyakran telefonos beszédfelismerésből jön: hiányozhatnak az írásjelek, lehetnek félrehallott vagy elgépelt szavak, a számok szóval is szerepelhetnek ("két kiló", "fél kiló", "tíz").
Feladat: bontsd külön bevásárlási tételekre.
Szabályok:
- name: boltban szokásos, rövid, alapalakú név kisbetűvel ("krumplit" → "krumpli", "két tejet" → "tej"). qty: mennyiség, ha elhangzott ("2 kg", "10 db", "50 dkg", "1 csomag"), különben üres. category: a megadott listából.
- Ha a felhasználó egy ételhez kér hozzávalókat ("a lecsóhoz valókat"), add vissza a hozzávalókat 4 adagra, az otthon általában meglévő alapok (só, bors, olaj, cukor, liszt) nélkül.
- Kérdezz vissza (questions), ha egy szó többféle terméket jelenthet és ez a vásárlásnál számít (pl. "paprika": tv paprika, kaliforniai paprika vagy őrölt pirospaprika), ha egy szó valószínűleg félrehallás és nem tudod biztosan kitalálni, vagy ha a mennyiség nyilvánvalóan értelmetlen. Az ilyen tételt ne tedd az items közé. A question rövid, barátságos kérdés legyen, az options 2-4 lehetséges termék neve pontosan úgy, ahogy a listára kerülne, az about a kérdéses szó, a qty az elhangzott mennyiség.
- Ne kérdezz feleslegesen: a "tej", "kenyér", "tojás", "vaj" és hasonlók egyértelműek.
- Ha nyitott kérdések vannak (alább, azonosítóval), és a szöveg ezekre válaszol ("a kaliforniait", "mindegy", "nem kell"), a választott terméket tedd az items közé, a kérdés azonosítóját pedig az answered listába. "Mindegy" esetén a legáltalánosabbat válaszd, "nem kell" esetén csak az answered listába tedd.
- Ha a szöveg nem bevásárlásról szól, mindhárom lista legyen üres.`;

/* Recept a Street Kitchen / Mindmegette oldaláról (link beolvasása vagy keresés) */
const RECIPE_SOURCE_PROMPT = `Egy magyar család bevásárlólista-asszisztense vagy. Egy konkrét recept hozzávalóiból készítesz bevásárlólistát.
Szabályok:
- Ha linket kapsz, olvasd be az oldalt, és kizárólag az ott szereplő hozzávalólistából dolgozz. Ne találj ki hozzávalót.
- Ha csak az étel nevét kapod, keress hozzá receptet kizárólag a streetkitchen.hu vagy a mindmegette.hu oldalon (pl. "lecsó recept site:streetkitchen.hu"), válaszd a kérésnek legjobban megfelelőt, olvasd be az oldalát, és abból dolgozz.
- Állapítsd meg, hány főre vagy adagra szól az eredeti recept (originalServings; ha nem derül ki, 4), és számold át a mennyiségeket a megadott létszámra, boltban kapható kiszerelésre kerekítve.
- name: rövid, boltban szokásos név kisbetűvel. qty: az átszámolt mennyiség. category ezek egyike: ${CATS.join(" | ")}.
- staple=true azokra, amik a legtöbb háztartásban általában otthon vannak (só, bors, olaj, cukor, liszt, alap fűszerek). Vizet ne adj vissza.
- steps: az elkészítés lépései az oldal alapján, saját szavaiddal, tömören (legfeljebb 12 lépés, mindegyik 1-3 mondat), az eredeti sorrendben, a megadott létszámhoz igazítva. Ha egy lépéshez az oldalon saját kép tartozik, az image mezőbe írd a kép pontos (https) címét, különben hagyd üresen. Ne találj ki képcímet.
- imageUrl: a recept fő képének pontos (https) címe, ha az oldalon szerepel, különben üres. minutes: a teljes elkészítési idő percben, ha kiderül, különben 0.
- Ha az oldal nem recept, vagy nem tudtad beolvasni, az items legyen üres, és a note mezőben írd le röviden, mi a gond.
- Ha az étel neve nagyon különböző recepteket takarhat (pl. "süti", "valami vacsora"), az items legyen üres, és kérdezz vissza: question + 2-4 rövid options.
Válaszolj kizárólag egyetlen JSON objektummal, más szöveg nélkül, ebben a formában:
{"title": "Lecsó", "sourceUrl": "https://...", "sourceSite": "Street Kitchen", "originalServings": 4, "minutes": 40, "imageUrl": "https://...", "items": [{"name": "lecsópaprika", "qty": "1 kg", "category": "Zöldség, gyümölcs", "staple": false}], "steps": [{"text": "A hagymát apróra vágjuk, és az olajon üvegesre pároljuk.", "image": ""}], "note": "", "question": "", "options": []}`;

const RECIPE_SEARCH_PROMPT = `Egy magyar család receptkeresője vagy. A felhasználó megad egy alapanyagot, ételtípust vagy hangulatot (pl. "csirke", "gyors vacsora", "leves", "sütemény", "vega").
Keress hozzá recepteket kizárólag a streetkitchen.hu és a mindmegette.hu oldalon (pl. "csirke recept site:streetkitchen.hu", "csirke recept site:mindmegette.hu"), mindkét oldalról vegyesen.
Adj vissza 6-8 receptet. Mindegyikhez: title (a recept címe magyarul, ahogy az oldalon szerepel), url (a recept oldalának pontos címe, csak olyan, amit a keresési találatokban láttál, ne találj ki címet), site ("Street Kitchen" vagy "Mindmegette"), description (egy rövid, kedvcsináló mondat, saját szavaiddal), minutes (elkészítési idő percben, ha kiderül, különben 0).
Válaszolj kizárólag egyetlen JSON objektummal, más szöveg nélkül: {"recipes": [{"title": "", "url": "", "site": "", "description": "", "minutes": 0}], "note": ""}`;

const RECIPE_IDEAS_PROMPT = `Egy magyar család receptötlet-adója vagy. A felhasználó megad egy alapanyagot, ételtípust vagy hangulatot (pl. "csirke", "gyors vacsora", "leves", "sütemény").
Adj 8 változatos ötletet olyan ételekre, amelyek a magyar receptoldalakon (Street Kitchen, Mindmegette) gyakoriak: klasszikus magyar ételek és népszerű modern fogások vegyesen, otthon elkészíthetőek.
title: az étel szokásos magyar neve (rövid, pl. "Paprikás csirke nokedlivel"). description: egy rövid, kedvcsináló mondat. minutes: becsült elkészítési idő percben.
Ha a kérés nem ételről szól, a recipes legyen üres, és a note mezőben kérj pontosítást.`;

const RECIPE_SITES = { "streetkitchen.hu": "Street Kitchen", "mindmegette.hu": "Mindmegette" };
const isRecipeSite = (url) => { try { return !!RECIPE_SITES[new URL(url).hostname.replace(/^www\./, "")]; } catch { return false; } };
// Keresés közvetlenül a két oldalon (Google site-keresés) – mindig működik, ingyenes
const siteSearchUrl = (q) => `https://www.google.com/search?q=${encodeURIComponent(`${q} recept site:streetkitchen.hu OR site:mindmegette.hu`)}`;
const favKey = (r) => (r.url ? r.url.replace(/[?#].*$/, "").replace(/\/$/, "") : "t:" + norm(r.title));
function siteOf(url) {
  try { const h = new URL(url).hostname.replace(/^www\./, ""); return RECIPE_SITES[h] || h; } catch { return ""; }
}
const httpsUrl = (u) => (typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u.trim()) ? u.trim().slice(0, 600) : "");
function cleanSteps(steps) {
  return (Array.isArray(steps) ? steps : []).map((x) => (typeof x === "string" ? { text: x } : x || {}))
    .map((x) => ({ text: String(x.text || "").trim().slice(0, 700), image: httpsUrl(x.image) })).filter((x) => x.text).slice(0, 20);
}
// A recept forrásának címkéje – mindig megjelenik a receptnél és a hozzávalóknál
function sourceLabel(sugg) {
  if (sugg?.source?.url) return siteOf(sugg.source.url);
  if (sugg?.demo) return "Demó recept";
  return "Gemini (általános recept)";
}

function parseJsonLoose(text) {
  const t = String(text || "").replace(/```(?:json)?/g, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no-json");
  return JSON.parse(t.slice(a, b + 1));
}

/* ---------- Demó háttér (Firebase nélkül, localStorage) ---------- */
const DEMO_RECIPES = {
  "lecsó": [["lecsópaprika", "1 kg", 0], ["paradicsom", "50 dkg", 0], ["vöröshagyma", "2 db", 0], ["kolbász", "20 dkg", 1], ["tojás", "4 db", 2], ["olaj", "", 4, true], ["só", "", 4, true], ["pirospaprika", "", 4, true]],
  "palacsinta": [["finomliszt", "25 dkg", 4, true], ["tej", "5 dl", 2], ["tojás", "3 db", 2], ["szódavíz", "2 dl", 6], ["lekvár", "1 üveg", 4], ["cukor", "", 4, true], ["olaj", "", 4, true]],
  "gulyás": [["marhalábszár", "60 dkg", 1], ["burgonya", "80 dkg", 0], ["sárgarépa", "2 db", 0], ["fehérrépa", "1 db", 0], ["vöröshagyma", "2 db", 0], ["fokhagyma", "1 fej", 0], ["paradicsom", "1 db", 0], ["tv paprika", "1 db", 0], ["pirospaprika", "", 4, true], ["köménymag", "", 4, true]],
  "bolognai": [["spagetti", "500 g", 4], ["darált marhahús", "50 dkg", 1], ["passata", "700 g", 4], ["vöröshagyma", "1 db", 0], ["fokhagyma", "2 gerezd", 0], ["sárgarépa", "1 db", 0], ["parmezán", "10 dkg", 2], ["olívaolaj", "", 4, true]],
  "rakott krumpli": [["burgonya", "1,5 kg", 0], ["tojás", "6 db", 2], ["parasztkolbász", "20 dkg", 1], ["tejföl", "450 g", 2], ["vaj", "5 dkg", 2], ["só", "", 4, true]],
  "paprikás csirke": [["csirkecomb", "1,2 kg", 1], ["vöröshagyma", "2 db", 0], ["tv paprika", "1 db", 0], ["paradicsom", "1 db", 0], ["tejföl", "330 g", 2], ["finomliszt", "", 4, true], ["tojás", "2 db", 2], ["pirospaprika", "", 4, true], ["olaj", "", 4, true]],
  "rántott csirke": [["csirkemell", "60 dkg", 1], ["tojás", "3 db", 2], ["zsemlemorzsa", "25 dkg", 3], ["finomliszt", "", 4, true], ["burgonya", "1 kg", 0], ["olaj", "", 4, true]],
};

const DEMO_STEPS = {
  "lecsó": ["A hagymát vágd félkarikára, és pirítsd üvegesre kevés olajon.", "Add hozzá a karikázott kolbászt, majd a felcsíkozott paprikát, és párold 10 percig.", "Jöjjön a felkockázott paradicsom, sózd, szórd meg pirospaprikával, és főzd további 10 percig.", "A végén üsd bele a tojásokat, és kevergetve hagyd összesülni."],
  "paprikás csirke": ["A hagymát pirítsd üvegesre, húzd le a tűzről, és keverd bele a pirospaprikát.", "Tedd bele a csirkecombokat, a felkockázott paprikát és paradicsomot, öntsd fel kevés vízzel.", "Fedő alatt főzd puhára, kb. 40 percig.", "A tejfölt keverd simára egy kanál liszttel, húzd be vele a szaftot, és forrald össze.", "Közben főzd ki a nokedlit a lisztből, tojásból és vízből."],
  "rántott csirke": ["Szeleteld fel és klopfold ki a csirkemellet, sózd meg.", "Forgasd lisztbe, felvert tojásba, majd zsemlemorzsába.", "Bő, forró olajban süsd mindkét oldalát aranybarnára.", "Közben főzd meg a krumplit köretnek."],
  "palacsinta": ["Keverd csomómentesre a lisztet a tojással és a tejjel, majd hígítsd a szódavízzel.", "Pihentesd a tésztát 15 percig.", "Forró, kiolajozott serpenyőben süsd vékonyra a palacsintákat.", "Töltsd meg lekvárral, és tekerd fel."],
  "gulyás": ["A hagymát pirítsd meg, add hozzá a kockára vágott húst, és pirítsd körbe.", "Szórd meg pirospaprikával, köménymaggal, öntsd fel vízzel, és főzd 1 órát.", "Add hozzá a répákat és a burgonyát, és főzd puhára.", "Végül tedd bele a paprikát és a paradicsomot, és forrald össze."],
  "bolognai": ["A hagymát, fokhagymát és répát vágd apróra, és párold meg olívaolajon.", "Add hozzá a darált húst, és pirítsd morzsásra.", "Öntsd fel a passatával, és lassú tűzön főzd 30 percig.", "Közben főzd ki a spagettit, és tálald reszelt parmezánnal."],
  "rakott krumpli": ["Főzd meg héjában a krumplit és a tojásokat, majd hámozd meg és karikázd fel.", "Egy kivajazott tálba rétegezd a krumplit, tojást és kolbászt, minden réteget locsolj meg tejföllel.", "A tetejére krumpli és tejföl kerüljön.", "200 fokon süsd 30 percig, amíg a teteje szép pirosra sül."],
};

// Demó receptötletek a keresőhöz: [cím, kulcsszavak, leírás, perc]
const DEMO_IDEAS = [
  ["Paprikás csirke nokedlivel", "csirke csirkecomb paprikás magyar", "A vasárnapi klasszikus, sok tejföllel és házi nokedlivel.", 70],
  ["Rántott csirke", "csirke csirkemell rántott", "Ropogós bunda, puha hús, mellé krumplipüré vagy saláta.", 40],
  ["Mézes-mustáros csirkecomb", "csirke csirkecomb sült mézes", "Sütőben sül, magától lesz ragacsos és fényes.", 60],
  ["Csirkés-brokkolis tészta", "csirke csirkemell tészta gyors brokkoli", "Fél óra alatt kész, krémes sajtos szósszal.", 30],
  ["Csirkepörkölt", "csirke pörkölt magyar", "Egyszerű, laktató, egy lábasban készül.", 60],
  ["Lecsó", "lecsó zöldség paprika nyár magyar vega", "Nyári kedvenc kolbásszal vagy anélkül, tojással.", 40],
  ["Gulyásleves", "gulyás leves marha magyar", "Bográcsban vagy fazékban, csipetkével.", 120],
  ["Bolognai spagetti", "bolognai tészta spagetti darált hús gyors", "A gyerekek kedvence, nagyobb adagban is megéri főzni.", 45],
  ["Rakott krumpli", "rakott krumpli burgonya kolbász tojás magyar", "Rétegesen, sok tejföllel, sütőben sütve.", 75],
  ["Palacsinta", "palacsinta desszert édes sütemény gyors", "Lekvárral, kakaóval vagy túróval töltve.", 30],
];

function createDemoBackend() {
  const KEY = (id) => "kk:demo:" + id;
  const subs = new Map(); // id -> Set(cb)
  let uid = LS.get("kk:demo:uid", null);
  if (!uid) { uid = "u" + rid(); LS.set("kk:demo:uid", uid); }
  const load = (id) => LS.get(KEY(id), null);
  const save = (id, data) => { LS.set(KEY(id), data); emit(id); };
  const emit = (id) => { const d = load(id); (subs.get(id) || []).forEach((cb) => cb(d)); };
  window.addEventListener("storage", (e) => { if (e.key && e.key.startsWith("kk:demo:")) subs.forEach((_, id) => emit(id)); });
  const mutate = async (id, fn) => { const d = load(id); if (!d) throw new Error("not-found"); fn(d); save(id, d); };

  return {
    mode: "demo",
    uid,
    async createList(name, me, seed = []) {
      const id = "demo-" + rid();
      LS.set(KEY(id), { name, members: { [uid]: me.name }, items: seed.map((s) => ({ id: rid(), ...s })), favorites: [], cooking: [] });
      return id;
    },
    async joinList(id, me) { await mutate(id, (d) => { d.members[uid] = me.name; }); },
    async leaveList(id) { await mutate(id, (d) => { delete d.members[uid]; }); },
    async renameList(id, name, me) { await mutate(id, (d) => { d.name = name; d.members[uid] = me.name; }); },
    watch(id, onList, onItems, onError, onFavs, onCook) {
      const cb = (d) => {
        if (d) onCook?.((d.cooking || []).slice().sort((a, b) => b.createdAt - a.createdAt));
        if (!d) return onError(new Error("not-found"));
        onList({ name: d.name, members: d.members });
        onItems(d.items.slice());
        onFavs?.((d.favorites || []).slice().sort((a, b) => b.createdAt - a.createdAt));
      };
      if (!subs.has(id)) subs.set(id, new Set());
      subs.get(id).add(cb);
      queueMicrotask(() => cb(load(id)));
      return () => subs.get(id)?.delete(cb);
    },
    async addItems(id, items) {
      const ids = items.map(() => rid());
      await mutate(id, (d) => { const t = Date.now(); items.forEach((it, i) => d.items.push({ id: ids[i], createdAt: t + i, ...it })); });
      return ids;
    },
    interpret: null, // demó módban csak a helyi értelmező fut
    async addCooking(id, r) { const cid = rid(); await mutate(id, (d) => { (d.cooking ||= []).push({ id: cid, createdAt: Date.now(), ...r }); }); return cid; },
    async removeCooking(id, cid) { await mutate(id, (d) => { d.cooking = (d.cooking || []).filter((c) => c.id !== cid); }); },
    async addFavorite(id, fav) { const fid = rid(); await mutate(id, (d) => { (d.favorites ||= []).push({ id: fid, createdAt: Date.now(), ...fav }); }); return fid; },
    async removeFavorite(id, favId) { await mutate(id, (d) => { d.favorites = (d.favorites || []).filter((f) => f.id !== favId); }); },
    async searchRecipes(query) {
      await new Promise((r) => setTimeout(r, 500));
      const words = norm(query).split(/\s+/).filter((w) => w.length > 2).map((w) => w.slice(0, 5));
      const hits = DEMO_IDEAS.filter(([t, k]) => words.some((w) => norm(t + " " + k).includes(w)));
      return {
        recipes: hits.map(([title, , description, minutes]) => ({ title, description, minutes, url: "", site: "" })),
        note: hits.length ? "Demó ötletek. A beállított appban a Street Kitchen és a Mindmegette receptjeit listázza."
          : "Demó módban csak néhány ételt ismerek (pl. csirke, tészta, leves, lecsó, palacsinta).",
      };
    },
    async updateItem(id, itemId, patch) { await mutate(id, (d) => { const it = d.items.find((x) => x.id === itemId); if (it) Object.assign(it, patch); }); },
    async deleteItems(id, ids) { await mutate(id, (d) => { d.items = d.items.filter((x) => !ids.includes(x.id)); }); },
    async suggest(prompt, _existing, { servings = 4, url = null } = {}) {
      await new Promise((r) => setTimeout(r, 650));
      if (url) return { title: siteOf(url) || "Recept link", items: [], note: "Demó módban nincs Gemini, ezért a linkből nem tudom kiolvasni a hozzávalókat. A beállított appban a Street Kitchen és a Mindmegette receptjeit így is felírja." };
      const p = norm(prompt);
      const hits = Object.keys(DEMO_RECIPES).filter((k) => p.includes(k) || (k === "gulyás" && p.includes("gulyas")));
      if (!hits.length) {
        return { title: "Demó mód", items: [], note: `Demó módban csak néhány ételt ismerek: ${Object.keys(DEMO_RECIPES).join(", ")}. Firebase-szel összekötve bármilyen ételt vagy kérést megért.` };
      }
      const merged = new Map();
      const f = servings / 4;
      const steps = hits.flatMap((k) => (DEMO_STEPS[k] || []).map((text) => ({ text, image: "" })));
      hits.forEach((k) => DEMO_RECIPES[k].forEach(([name, qty, c, staple]) => { if (!merged.has(name)) merged.set(name, { name, qty: scaleQty(qty, f), category: CATS[c], staple: !!staple }); }));
      return { title: hits.map((h) => h[0].toUpperCase() + h.slice(1)).join(" + "), items: [...merged.values()], originalServings: 4, steps, demo: true, minutes: 0,
        note: "Demó recept. A beállított appban a Street Kitchen vagy a Mindmegette receptjéből dolgozik." };
    },
  };
}

/* ---------- Firebase háttér ---------- */
async function createFirebaseBackend(cfg) {
  const [{ initializeApp }, authMod, fs] = await Promise.all([
    import(`${FIREBASE_CDN}/firebase-app.js`),
    import(`${FIREBASE_CDN}/firebase-auth.js`),
    import(`${FIREBASE_CDN}/firebase-firestore.js`),
  ]);
  const app = initializeApp(cfg.firebase);

  // App Check: a Firebase AI Logic-hoz kötelező (2026. nov. 2-től automatikusan kikényszerítve)
  if (cfg.appCheck?.siteKey) {
    if (["localhost", "127.0.0.1"].includes(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    const ac = await import(`${FIREBASE_CDN}/firebase-app-check.js`);
    const Provider = cfg.appCheck.provider === "enterprise" ? ac.ReCaptchaEnterpriseProvider : ac.ReCaptchaV3Provider;
    ac.initializeAppCheck(app, { provider: new Provider(cfg.appCheck.siteKey), isTokenAutoRefreshEnabled: true });
  }

  const auth = authMod.getAuth(app);
  const user = await new Promise((resolve, reject) => {
    const off = authMod.onAuthStateChanged(auth, (u) => {
      if (u) { off(); resolve(u); }
      else authMod.signInAnonymously(auth).catch((e) => { off(); reject(e); });
    });
  });

  // Offline gyorsítótár: boltban, gyenge térerőnél is működik, és szinkronizál, amint van net
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
  });
  const listRef = (id) => fs.doc(db, "lists", id);
  const itemsRef = (id) => fs.collection(db, "lists", id, "items");
  const favsRef = (id) => fs.collection(db, "lists", id, "favorites");
  const cookRef = (id) => fs.collection(db, "lists", id, "cooking");

  let model = null, interpreter = null, urlModel = null, searchModel = null, ideasModel = null, listModel = null;
  async function getModel() {
    if (model) return model;
    const { getAI, getGenerativeModel, GoogleAIBackend, Schema } = await import(`${FIREBASE_CDN}/firebase-ai.js`);
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    // Túlterhelés (500/503/429) esetén újrapróbálunk, majd a következő ingyenes modellre váltunk
    const MODELS = [...new Set([cfg.model || "gemini-3.8-flash", ...(cfg.fallbackModels || ["gemini-3.5-flash-lite"])])];
    // A lista értelmezéséhez a gyors modell megy elöl (pár tétel felbontásához bőven elég, és gyorsabban válaszol)
    const FAST = [...new Set([cfg.fastModel || "gemini-3.5-flash-lite", ...MODELS])];
    const transient = (e) => /\b(500|503|429)\b|overload|high demand|unavailable|exhausted|internal|try again/i.test(`${e?.code || ""} ${e?.status || ""} ${e?.message || ""}`);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const resilient = (opts, order = MODELS) => {
      const cache = {};
      return {
        async generateContent(req) {
          let last;
          for (const [i, name] of order.entries()) {
            cache[name] ||= getGenerativeModel(ai, { ...opts, model: name });
            for (let attempt = 0; attempt < (i === 0 ? 2 : 1); attempt++) {
              try { return await cache[name].generateContent(req); }
              catch (e) { last = e; if (!transient(e)) throw e; console.warn(`Gemini ${name} túlterhelt, újrapróbálom`, e?.message); await wait(700 * (attempt + 1)); }
            }
          }
          throw last;
        },
      };
    };
    const item = Schema.object({ properties: { name: Schema.string(), qty: Schema.string(), category: Schema.enumString({ enum: CATS }) } });
    interpreter = resilient({
      systemInstruction: INTERPRET_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: Schema.object({
          properties: {
            items: Schema.array({ items: item }),
            questions: Schema.array({ items: Schema.object({ properties: {
              about: Schema.string(), question: Schema.string(), qty: Schema.string(), options: Schema.array({ items: Schema.string() }),
            } }) }),
            answered: Schema.array({ items: Schema.string() }),
          },
        }),
      },
    }, FAST);
    const schema = Schema.object({
      properties: {
        title: Schema.string(),
        note: Schema.string(),
        question: Schema.string(),
        options: Schema.array({ items: Schema.string() }),
        minutes: Schema.integer(),
        steps: Schema.array({ items: Schema.object({ properties: { text: Schema.string() } }) }),
        items: Schema.array({
          items: Schema.object({
            properties: {
              name: Schema.string(),
              qty: Schema.string(),
              category: Schema.enumString({ enum: CATS }),
              staple: Schema.boolean(),
            },
          }),
        }),
      },
      optionalProperties: ["note", "question", "options", "minutes", "steps"],
    });
    model = resilient({
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: "application/json", responseSchema: schema },
    });
    // Receptötletek (ingyenes keret) és receptkeresés a két oldalon (Blaze + Google Search)
    ideasModel = resilient({
      systemInstruction: RECIPE_IDEAS_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: Schema.object({
          properties: {
            recipes: Schema.array({ items: Schema.object({ properties: { title: Schema.string(), description: Schema.string(), minutes: Schema.integer() } }) }),
            note: Schema.string(),
          },
          optionalProperties: ["note"],
        }),
      },
    });
    if (cfg.recipeSearch) {
      listModel = resilient({ systemInstruction: RECIPE_SEARCH_PROMPT, tools: [{ googleSearch: {} }] });
    }
    // Recept beolvasása linkből (URL context) – az ingyenes keretben is megy
    urlModel = resilient({ systemInstruction: RECIPE_SOURCE_PROMPT, tools: [{ urlContext: {} }] });
    // Recept keresése a két oldalon (Google Search grounding) – csak Blaze csomaggal
    if (cfg.recipeSearch) {
      searchModel = resilient({ systemInstruction: RECIPE_SOURCE_PROMPT, tools: [{ googleSearch: {} }, { urlContext: {} }] });
    }
    return model;
  }

  return {
    mode: "live",
    uid: user.uid,
    async createList(name, me) {
      const ref = fs.doc(fs.collection(db, "lists"));
      await fs.setDoc(ref, { name, createdAt: fs.serverTimestamp(), members: { [user.uid]: me.name } });
      return ref.id;
    },
    async joinList(id, me) { await fs.updateDoc(listRef(id), { [`members.${user.uid}`]: me.name }); },
    async leaveList(id) { await fs.updateDoc(listRef(id), { [`members.${user.uid}`]: fs.deleteField() }); },
    async renameList(id, name, me) { await fs.updateDoc(listRef(id), { name, [`members.${user.uid}`]: me.name }); },
    watch(id, onList, onItems, onError, onFavs, onCook) {
      const k = onCook ? fs.onSnapshot(fs.query(cookRef(id), fs.orderBy("createdAt", "desc")), (qs) => {
        onCook(qs.docs.map((d) => { const x = d.data({ serverTimestamps: "estimate" }); return { id: d.id, ...x, createdAt: x.createdAt?.toMillis?.() ?? Date.now() }; }));
      }, (e) => console.warn("főzés", e)) : () => {};
      const c = onFavs ? fs.onSnapshot(fs.query(favsRef(id), fs.orderBy("createdAt", "desc")), (qs) => {
        onFavs(qs.docs.map((d) => { const x = d.data({ serverTimestamps: "estimate" }); return { id: d.id, ...x, createdAt: x.createdAt?.toMillis?.() ?? Date.now() }; }));
      }, (e) => console.warn("kedvencek", e)) : () => {};
      const a = fs.onSnapshot(listRef(id), (s) => (s.exists() ? onList(s.data()) : onError(new Error("not-found"))), onError);
      const b = fs.onSnapshot(fs.query(itemsRef(id), fs.orderBy("createdAt")), (qs) => {
        onItems(qs.docs.map((d) => {
          const x = d.data({ serverTimestamps: "estimate" });
          return { id: d.id, ...x, createdAt: x.createdAt?.toMillis?.() ?? Date.now() };
        }));
      }, onError);
      return () => { a(); b(); c(); k(); };
    },
    async addItems(id, items) {
      const batch = fs.writeBatch(db);
      const refs = items.map(() => fs.doc(itemsRef(id)));
      items.forEach((it, i) => batch.set(refs[i], { ...it, createdAt: fs.serverTimestamp() }));
      batch.commit().catch((e) => { console.error(e); toast("Nem sikerült menteni. Ellenőrizd a netet."); });
      return refs.map((r) => r.id); // offline is azonnal visszatér, a Firestore később szinkronizál
    },
    async updateItem(id, itemId, patch) { await fs.updateDoc(fs.doc(itemsRef(id), itemId), patch); },
    async addCooking(id, r) {
      const ref = fs.doc(cookRef(id));
      fs.setDoc(ref, { ...r, createdAt: fs.serverTimestamp() }).catch((e) => { console.error(e); toast("Nem sikerült elmenteni a receptet a Főzés fülre."); });
      return ref.id;
    },
    async removeCooking(id, cid) { await fs.deleteDoc(fs.doc(cookRef(id), cid)); },
    async addFavorite(id, fav) {
      const ref = fs.doc(favsRef(id));
      fs.setDoc(ref, { ...fav, createdAt: fs.serverTimestamp() }).catch((e) => { console.error(e); toast("Nem sikerült menteni a kedvencet."); });
      return ref.id;
    },
    async removeFavorite(id, favId) { await fs.deleteDoc(fs.doc(favsRef(id), favId)); },
    async searchRecipes(query) {
      await getModel();
      if (listModel) {
        const res = await listModel.generateContent(`Keresés: ${query}`);
        const d = parseJsonLoose(res.response.text());
        const meta = res.response.candidates?.[0]?.groundingMetadata;
        const recipes = (d.recipes || []).map((r) => {
          const ok = r.url && isRecipeSite(r.url);
          return { title: r.title, description: r.description || "", minutes: +r.minutes || 0, url: ok ? r.url : "", site: ok ? siteOf(r.url) : "" };
        }).filter((r) => r.title);
        return { recipes, note: d.note || "", searchEntryPoint: meta?.searchEntryPoint?.renderedContent || "",
          searchSources: (meta?.groundingChunks || []).map((c) => c.web).filter(Boolean).slice(0, 5) };
      }
      const res = await ideasModel.generateContent(`Keresés: ${query}`);
      const d = JSON.parse(res.response.text());
      return { recipes: (d.recipes || []).map((r) => ({ ...r, url: "", site: "" })), note: d.note || "", ideas: true };
    },
    async deleteItems(id, ids) {
      const batch = fs.writeBatch(db);
      ids.forEach((x) => batch.delete(fs.doc(itemsRef(id), x)));
      await batch.commit();
    },
    async suggest(prompt, existingNames, { servings = 4, url = null } = {}) {
      const m = await getModel();
      const tidy = (data, extra = {}) => ({
        title: data.title || prompt, items: Array.isArray(data.items) ? data.items : [], note: data.note || "",
        question: data.question || "", options: Array.isArray(data.options) ? data.options.slice(0, 4) : [],
        originalServings: +data.originalServings || null, minutes: +data.minutes || 0,
        steps: cleanSteps(data.steps), imageUrl: httpsUrl(data.imageUrl), ...extra,
      });
      if (url || searchModel) {
        const ask = url
          ? `Recept linkje: ${url}\nLétszám: ${servings} fő`
          : `Étel: ${prompt}\nLétszám: ${servings} fő\nKeress receptet a streetkitchen.hu vagy a mindmegette.hu oldalon.`;
        const res = await (url ? urlModel : searchModel).generateContent(ask);
        const data = parseJsonLoose(res.response.text());
        const meta = res.response.candidates?.[0]?.groundingMetadata;
        const srcUrl = url || data.sourceUrl || "";
        return tidy(data, {
          source: srcUrl ? { url: srcUrl, site: siteOf(srcUrl), title: data.title || "" } : null,
          // A Google keresés eredményét a Google előírása szerint meg kell jeleníteni
          searchEntryPoint: meta?.searchEntryPoint?.renderedContent || "",
          searchSources: (meta?.groundingChunks || []).map((c) => c.web).filter(Boolean).slice(0, 4),
        });
      }
      const ctx = existingNames.length ? `\n\n(Már a listán van: ${existingNames.slice(0, 80).join(", ")}.)` : "";
      const res = await m.generateContent(`Kérés: ${prompt}\nLétszám: ${servings} fő${ctx}`);
      return tidy(JSON.parse(res.response.text()), { generic: true });
    },
    async interpret(text, openQuestions, existingNames) {
      await getModel();
      const qs = openQuestions.length
        ? `\nNyitott kérdések:\n${openQuestions.map((q) => `- [${q.id}] ${q.question} (lehetőségek: ${q.options.join(", ")}${q.qty ? `; mennyiség: ${q.qty}` : ""})`).join("\n")}`
        : "";
      const ctx = existingNames.length ? `\nMár a listán: ${existingNames.slice(0, 60).join(", ")}` : "";
      const res = await interpreter.generateContent(`Diktált szöveg: "${text}"${qs}${ctx}`);
      const d = JSON.parse(res.response.text());
      return { items: d.items || [], questions: d.questions || [], answered: d.answered || [] };
    },
  };
}

/* ---------- Alkalmazás ---------- */
const state = { listId: null, list: null, items: [], favorites: [], cooking: [], tab: "shop", unwatch: null, suggestion: null, seen: new Set(), firstLoad: true, questions: [], busy: 0, autoTried: false,
  search: { query: "", results: [], loading: false, tab: "search", meta: null } };
const settings = { autoListen: LS.get("kk:autoListen", true), speak: LS.get("kk:speak", true) };
let backend;
let me = { uid: null, name: "" };

async function boot() {
  let cfg = null;
  if (!window.KK_DEMO_ONLY) {
    try { cfg = (await import("./config.js")).default; } catch { cfg = null; }
  }
  const live = !!cfg?.firebase?.apiKey;
  try {
    backend = live ? await createFirebaseBackend(cfg) : createDemoBackend();
  } catch (e) {
    console.error(e);
    backend = createDemoBackend();
    showBanner(`Nem sikerült csatlakozni a Firebase-hez (${e.code || e.message}). Demó módban futok.`, true);
  }
  me = { uid: backend.uid, name: LS.get("kk:name", "") };
  if ("serviceWorker" in navigator && live) navigator.serviceWorker.register("sw.js").catch(() => {});

  const params = new URLSearchParams(location.search);
  const invite = params.get("lista");
  // Megosztás Androidon: Chrome → Megosztás → Közös Kosár (a manifest share_target-je ide küldi)
  if ((params.has("url") || params.has("text")) && !invite) {
    const shared = [params.get("url"), params.get("text"), params.get("title")].filter(Boolean).join(" ");
    state.pendingShare = (shared.match(/https?:\/\/\S+/) || [shared])[0].trim() || null;
    history.replaceState(null, "", location.pathname);
  }
  const saved = LS.get(`kk:${backend.mode}:list`, null);

  if (backend.mode === "demo" && !invite) {
    if (!me.name) { me.name = "Én"; LS.set("kk:name", me.name); }
    let id = saved;
    if (!id || !LS.get("kk:demo:" + id, null)) id = await createDemoSample();
    return openList(id);
  }
  if (invite && invite !== saved) return showOnboarding("join", invite);
  if (saved && me.name) return openList(saved);
  showOnboarding("create");
}

async function createDemoSample() {
  const t = Date.now() - 3600e3;
  const seed = [
    { name: "tej", qty: "2 l", category: CATS[2], by: "Kata", done: false, createdAt: t },
    { name: "kenyér", qty: "1 db", category: CATS[3], by: "Bence", done: false, createdAt: t + 1 },
    { name: "banán", qty: "1 kg", category: CATS[0], by: "Kata", done: false, createdAt: t + 2 },
    { name: "mosogatószer", qty: "", category: CATS[7], by: "Én", done: false, createdAt: t + 3 },
    { name: "trappista sajt", qty: "30 dkg", category: CATS[2], by: "Bence", done: true, createdAt: t + 4 },
  ];
  const id = await backend.createList("Mintalista", me, seed);
  LS.set("kk:demo:list", id);
  return id;
}

function showBanner(text, err = false) {
  const b = $("#mode-banner"); b.textContent = text; b.classList.toggle("err", err); b.hidden = false;
}

/* Onboarding */
function showOnboarding(kind, inviteId) {
  $("#app").hidden = true; $("#onboard").hidden = false;
  const join = kind === "join";
  $("#ob-title").innerHTML = join ? "Meghívtak a <em>családi listára</em>!" : "Egy lista az <em>egész családnak</em>.";
  $("#ob-lead").textContent = join
    ? "Írd be a neved, hogy a többiek lássák, ki mit írt fel."
    : "Amit bárki felír, azonnal megjelenik mindenkinél. Írd be, mit főzöl, és a hozzávalók maguktól felkerülnek.";
  $("#ob-list-field").hidden = join;
  $("#ob-submit").textContent = join ? "Csatlakozás a listához" : "Lista létrehozása";
  $("#ob-name").value = me.name || "";
  $("#ob-form").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#ob-name").value.trim();
    const err = $("#ob-err"); err.hidden = true;
    if (!name) { $("#ob-name").focus(); err.textContent = "Add meg a neved."; err.hidden = false; return; }
    me.name = name; LS.set("kk:name", name);
    $("#ob-submit").disabled = true;
    try {
      let id = inviteId;
      if (join) await backend.joinList(id, me);
      else id = await backend.createList($("#ob-list").value.trim() || "Családi bevásárlás", me);
      history.replaceState(null, "", location.pathname);
      openList(id);
    } catch (e2) {
      console.error(e2);
      err.textContent = join
        ? "Ez a meghívó link nem működik. Kérj újat attól, aki küldte."
        : "Nem sikerült létrehozni a listát. Ellenőrizd az internetkapcsolatot, és próbáld újra.";
      err.hidden = false;
    } finally { $("#ob-submit").disabled = false; }
  };
}

function openList(id) {
  state.unwatch?.();
  state.listId = id; state.firstLoad = true; state.seen = new Set();
  LS.set(`kk:${backend.mode}:list`, id);
  $("#onboard").hidden = true; $("#app").hidden = false;
  if (backend.mode === "demo" && $("#mode-banner").hidden) {
    showBanner("Demó mód: a lista csak ezen az eszközön él. Próbáld ki gépelve, pl. „két kiló paprika meg tíz tojás”. Ebben az előnézetben a mikrofon le van tiltva; a diktálás a saját címén futó appban működik.");
  }
  state.unwatch = backend.watch(id,
    (list) => {
      state.list = list;
      if (!list.members?.[me.uid]) { leaveToOnboarding(); return; }
      renderHeader();
    },
    (items) => { state.items = items; renderItems(); },
    (err) => { console.error(err); leaveToOnboarding("Ez a lista már nem érhető el."); },
    (favs) => { state.favorites = favs; renderRecipes(); renderAiFav(); },
    (cook) => { state.cooking = cook; renderCooking(); });
  // Alapból hanggal: megnyitáskor rögtön elindul a hallgatás (ha a böngésző engedi)
  if (state.pendingShare) { const sh = state.pendingShare; state.pendingShare = null; state.autoTried = true; setTimeout(() => runSuggest(sh), 400); }
  if (settings.autoListen && SR && !state.autoTried && !window.KK_DEMO_ONLY) { state.autoTried = true; setTimeout(() => startListening({ auto: true }), 600); }
}

function leaveToOnboarding(msg) {
  state.unwatch?.(); state.unwatch = null;
  LS.del(`kk:${backend.mode}:list`);
  if (backend.mode === "demo") { boot(); return; }
  showOnboarding("create");
  if (msg) toast(msg);
}

/* Fejléc */
function renderHeader() {
  const L = state.list; if (!L) return;
  $("#list-name").textContent = L.name;
  document.title = `${L.name} · Közös Kosár`;
  const names = Object.values(L.members || {});
  $("#faces").innerHTML = names.slice(0, 5).map((n) => face(n)).join("");
  $("#hello").textContent = me.name && me.name !== "Én" ? `Szia, ${me.name}!` : "Szia!";
  renderSub();
}
function renderSub() {
  const open = state.items.filter((i) => !i.done).length;
  const n = Object.keys(state.list?.members || {}).length;
  $("#list-sub").textContent = `${n} családtag · ${open ? `${open} dolgot kell venni` : "minden megvan"}`;
}

/* Lista */
const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const ICON_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

function itemHTML(it, fresh) {
  const meta = (it.by ? `${face(it.by, "mini")}<span>${esc(it.by)}</span>` : "")
    + (it.source ? (it.sourceUrl && /^https:\/\//.test(it.sourceUrl)
      ? `<a class="from" href="${esc(it.sourceUrl)}" target="_blank" rel="noopener">${esc(it.source)}${it.sourceSite ? ` · ${esc(it.sourceSite)}` : ""}</a>`
      : `<span class="from">${esc(it.source)}${it.sourceSite ? ` · ${esc(it.sourceSite)}` : ""}</span>`) : "");
  return `<li class="item${it.done ? " done" : ""}${fresh ? " fresh" : ""}" data-id="${esc(it.id)}">
    <button class="check" data-act="toggle" aria-pressed="${!!it.done}" aria-label="${it.done ? "Visszarakás a listára" : "Megvettem"}: ${esc(it.name)}">${ICON_CHECK}</button>
    <div class="item-main">
      <div class="item-line"><span class="item-name">${esc(it.name)}</span>${it.qty ? `<span class="item-qty">${esc(it.qty)}</span>` : ""}</div>
      ${meta ? `<div class="item-meta">${meta}</div>` : ""}
    </div>
    <button class="del" data-act="del" aria-label="Törlés: ${esc(it.name)}">${ICON_X}</button>
  </li>`;
}

const EMPTY_ART = `<svg class="empty-art" viewBox="0 0 160 110" aria-hidden="true">
  <circle cx="58" cy="40" r="17" fill="hsl(6 85% 62%)"/><path d="M58 23c2-6 7-8 11-7-1 5-5 8-11 7Z" fill="hsl(135 55% 45%)"/>
  <circle cx="92" cy="36" r="14" fill="hsl(44 95% 58%)"/>
  <rect x="70" y="14" width="16" height="34" rx="5" fill="hsl(208 85% 62%)"/><rect x="72" y="8" width="12" height="9" rx="3" fill="hsl(208 70% 48%)"/>
  <ellipse cx="112" cy="44" rx="13" ry="9" fill="hsl(30 85% 60%)" transform="rotate(-20 112 44)"/>
  <path d="M30 50h100l-11 50a6 6 0 0 1-6 5H47a6 6 0 0 1-6-5Z" fill="var(--accent)"/>
  <path d="M45 66h70M49 84h62" stroke="var(--surface)" stroke-width="4" stroke-linecap="round" opacity=".55"/>
</svg>`;

function renderItems() {
  const open = state.items.filter((i) => !i.done);
  const done = state.items.filter((i) => i.done);
  const isFresh = (it) => !state.firstLoad && !state.seen.has(it.id);
  let html = "";
  if (!state.items.length) {
    html = `<div class="empty">${EMPTY_ART}<strong>Üres a kosár!</strong><span>Koppints a mikrofonra, és mondd sorban, mi kell. Vagy a <b>Recept</b> gombbal mondd meg, mit főzöl ma.</span></div>`;
  }
  CATS.forEach((cat, ci) => {
    const g = open.filter((i) => (CATS.includes(i.category) ? i.category : CATS[8]) === cat);
    if (!g.length) return;
    html += `<section class="group" style="--h:${CAT_HUE[ci]}"><h2><span class="cat-ic">${CAT_ICON[ci]}</span><span class="cat-name">${esc(cat)}</span><span class="n">${g.length}</span></h2>
      <ul class="items">${g.map((it) => itemHTML(it, isFresh(it))).join("")}</ul></section>`;
  });
  if (done.length) {
    html += `<section class="group basket"><h2><span class="cat-ic">${ICON_BASKET}</span><span class="cat-name">Már a kosárban</span><span class="n">${done.length}</span><button class="link-btn" data-act="clear-done" aria-label="Kipipált tételek törlése">Kiürítés</button></h2>
      <ul class="items">${done.map((it) => itemHTML(it, false)).join("")}</ul></section>`;
  }
  $("#groups").innerHTML = html;
  state.items.forEach((i) => state.seen.add(i.id));
  state.firstLoad = false;
  renderSub();
}

$("#groups").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-act]"); if (!btn) return;
  const act = btn.dataset.act;
  try {
    if (act === "clear-done") {
      const ids = state.items.filter((i) => i.done).map((i) => i.id);
      if (ids.length) { await backend.deleteItems(state.listId, ids); toast(`${ids.length} tétel törölve`); }
      return;
    }
    const id = btn.closest(".item")?.dataset.id;
    const it = state.items.find((x) => x.id === id); if (!it) return;
    if (act === "toggle") await backend.updateItem(state.listId, id, { done: !it.done, doneBy: !it.done ? me.name : "" });
    if (act === "del") await backend.deleteItems(state.listId, [id]);
  } catch (err) { console.error(err); toast("Nem sikerült menteni. Próbáld újra."); }
});

/* Beviteli sáv: normál és recept (AI) mód */
const SEARCH_CHIPS = ["csirke", "gyors vacsora", "tészta", "leves", "vega", "sütemény"];
const ICON_MIC = svg('<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4"/>');
const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;
const ICON_STOP = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor"/></svg>`;

$("#mode-btn").addEventListener("click", () => openRecipes());

/* A fő gomb: üres mezőnél mikrofon, gépelésnél hozzáadás, hallgatás közben megállítás */
function updateSendBtn() {
  const typed = $("#q").value.trim().length > 0;
  const btn = $("#send");
  btn.classList.toggle("mic-live", voice.wantOn && voice.mode !== "rsearch" && voice.mode !== "steps");
  if (voice.wantOn) { btn.innerHTML = ICON_MIC; btn.setAttribute("aria-label", "Hallgatlak – koppints a befejezéshez"); }
  else if (!typed && SR) { btn.innerHTML = ICON_MIC; btn.setAttribute("aria-label", "Diktálás"); }
  else { btn.innerHTML = ICON_PLUS; btn.setAttribute("aria-label", "Hozzáadás"); }
  $("#q").placeholder = voice.wantOn ? "Hallgatlak… (gépelni is lehet)"
    : SR ? "Mondd vagy írd: tej, 2 kg krumpli…" : "Mit kell venni? pl. tej, 2 kg krumpli";
}
$("#q").addEventListener("input", updateSendBtn);

$("#bar").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = $("#q").value.trim();
  if (!text) { // üres mező: mikrofon ki/be
    if (voice.wantOn) stopListening(); else startListening();
    return;
  }
  $("#q").value = ""; updateSendBtn();
  if (/https?:\/\//.test(text)) return runSuggest(text);
  const rq = recipeIntent(text);
  if (rq != null) return openRecipes(rq);
  handleAdd(text, { voice: false });
});

/* ---------- Hozzáadás: helyi értelmező, szükség esetén Gemini, kétértelműségnél visszakérdezés ---------- */
let qSeq = 0;
const openItems = () => state.items.filter((i) => !i.done);

// „csirkés receptek”, „keress receptet csirkéből”, „mit főzzek” → receptkereső
function recipeIntent(text) {
  const t = norm(text).replace(/[.,!?]/g, "");
  if (!/\brecept|\bmit főzz|\bmit együnk|\bkedvenc recept/.test(t)) return null;
  if (/kedvenc/.test(t)) return "#kedvencek";
  return t.split(/\s+/).filter((w) => !/^(recept\w*|keress\w*|keresés|mutass\w*|mutasd|milyen|valami|valamilyen|nekem|egy|kéne|kellene|ötlet\w*|mit|főzzek|főzzünk|együnk|ma|mára|vacsorára?|ebédre)$/.test(w))
    .join(" ").replace(/(ből|ből|ból|val|vel|os|es|ös|as)$/, "").trim();
}

async function handleAdd(text, { voice: spoken }) {
  const rq = recipeIntent(text);
  if (rq != null) { stopListening(); return openRecipes(rq, { spoken }); }
  // Válasz egy nyitott kérdésre?
  const q = state.questions[0];
  if (q) {
    const ans = matchAnswer(q, text);
    if (ans === SKIP) { resolveQuestion(q.id); return setHeard(text, "kihagyva"); }
    if (ans) { resolveQuestion(q.id); return addParsed([{ name: ans, qty: q.qty }], { text, spoken }); }
  }
  const local = parseSpoken(text);
  // Gépelt szöveget a helyi értelmező kezel (pontos), diktálásnál a Gemini segít, ha a helyi nem biztos benne
  // Mindig a Gemini értelmez (gépelve és diktálva is); a helyi értelmező csak tartalék, ha nincs net vagy a Gemini nem válaszol
  const askAI = backend.interpret && navigator.onLine !== false;
  if (!askAI) return applyResult(local, { text, spoken });
  setBusy(1);
  if (!voice.wantOn) toast("Értelmezem…");
  try {
    const r = await backend.interpret(text, state.questions, openItems().map((i) => i.name));
    applyResult(r, { text, spoken });
  } catch (err) {
    console.warn("AI nem elérhető, helyi értelmezés", err);
    applyResult(local, { text, spoken });
  } finally { setBusy(-1); }
}

function applyResult(r, { text, spoken }) {
  (r.answered || []).forEach(resolveQuestion);
  const fresh = (r.questions || []).filter((q) => q.question && q.options?.length).map((q) => ({
    id: "q" + ++qSeq, about: q.about || "", question: q.question, options: q.options.slice(0, 4), qty: q.qty || "",
  }));
  if (fresh.length) { state.questions.push(...fresh); renderQuestions(); if (spoken) speakQuestion(); }
  if (r.items?.length) addParsed(r.items, { text, spoken });
  else if (!fresh.length && !(r.answered || []).length) {
    setHeard(text, "nem értettem");
    toast("Ezt nem értettem. Mondd újra, vagy írd be.");
    if (spoken) speak("Ezt nem értettem, mondd újra!");
  }
}

async function addParsed(list, { text, spoken }) {
  const existing = new Set(openItems().map((i) => norm(i.name)));
  const dup = [];
  const items = [];
  for (const it of list) {
    const name = String(it.name || "").trim().slice(0, 100);
    if (!name) continue;
    if (existing.has(norm(name))) { dup.push(name); continue; }
    existing.add(norm(name));
    items.push({ name, qty: String(it.qty || "").slice(0, 30), category: CATS.includes(it.category) ? it.category : guessCategory(name), done: false, by: me.name });
  }
  if (!items.length) {
    if (dup.length) { toast(`Már a listán: ${dup.join(", ")}`); setHeard(text, "már a listán"); }
    return;
  }
  try {
    const ids = await backend.addItems(state.listId, items);
    const label = items.map((i) => (i.qty ? `${i.name} (${i.qty})` : i.name)).join(", ");
    setHeard(text, label);
    toast(`Felírtam: ${label}${dup.length ? ` · már rajta volt: ${dup.join(", ")}` : ""}`, {
      label: "Visszavonás", run: () => backend.deleteItems(state.listId, ids).catch(() => {}),
    });
  } catch (err) { console.error(err); toast("Nem sikerült hozzáadni. Próbáld újra."); }
}

/* Kérdéskártya */
function renderQuestions() {
  const box = $("#questions");
  const q = state.questions[0];
  if (!q) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = `<div class="qcard">
    <div class="qhead"><span class="qbadge" aria-hidden="true">?</span><strong>${esc(q.question)}</strong>${q.qty ? `<span class="qqty">${esc(q.qty)}</span>` : ""}</div>
    <div class="qopts">${q.options.map((o, i) => `<button type="button" data-opt="${i}"><span class="qn">${i + 1}</span>${esc(o)}</button>`).join("")}
      <button type="button" class="skip" data-skip>Nem kell</button></div>
    <p class="qmore">${SR ? "Koppints, vagy mondd ki: „a kaliforniait”, „a kettes”, „mindegy”, „nem kell”." : ""}${state.questions.length > 1 ? ` Még ${state.questions.length - 1} kérdésem van.` : ""}</p>
  </div>`;
}
$("#questions").addEventListener("click", (e) => {
  const q = state.questions[0]; if (!q) return;
  const b = e.target.closest("button"); if (!b) return;
  resolveQuestion(q.id);
  if (b.dataset.opt != null) addParsed([{ name: q.options[+b.dataset.opt], qty: q.qty }], { text: "", spoken: false });
});
function resolveQuestion(id) {
  const had = state.questions.length;
  state.questions = state.questions.filter((q) => q.id !== id);
  renderQuestions();
  if (had && state.questions.length && voice.wantOn) speakQuestion();
}

/* ---------- Hang: folyamatos diktálás (Web Speech API) és felolvasás ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const voice = { rec: null, wantOn: false, running: false, speaking: false, lastHeard: 0, idle: null, mode: "add", restarts: 0 };
const IDLE_MS = 20000;

function setListenUI() {
  const on = voice.wantOn;
  $("#listen").hidden = !on;
  // Ugyanaz az „élő” jelzés mindenhol, mindig a mikrofon tényleges állapota szerint
  $("#rs-mic").classList.toggle("mic-live", on && voice.mode === "rsearch");
  $("#step-voice").classList.toggle("mic-live", on && voice.mode === "steps");
  updateSendBtn();
  if (!on) return;
  $("#listen-status").textContent = state.busy ? "Gondolkodom…" : voice.speaking ? "Kérdezek…" : voice.mode === "servings" ? "Hány főre főzöl?" : voice.mode === "rsearch" ? "Mondd, mit keresel!" : voice.mode === "aiq" ? "Melyiket választod?" : voice.mode === "steps" ? "Mondd: „tovább”, „vissza”, „ismételd”" : state.questions.length ? "Mondd ki, melyik kell!" : "Hallgatlak, mondd sorban! A végén: „ennyi”.";
}
function setBusy(d) { state.busy = Math.max(0, state.busy + d); setListenUI(); }
function setHeard(text, result) {
  if (!text) return;
  $("#listen-text").innerHTML = `„${esc(text)}”${result ? ` <b>→ ${esc(result)}</b>` : ""}`;
}

function startListening({ auto = false, mode = "add" } = {}) {
  if (!SR) { toast("Ez a böngésző nem támogatja a diktálást. Androidon használd a Chrome-ot."); return; }
  voice.wantOn = true; voice.mode = mode; voice.lastHeard = Date.now(); voice.restarts = 0; voice.auto = auto;
  $("#listen-text").textContent = mode === "steps" ? "pl. „tovább”, „vissza”, „ismételd”, „ennyi”" : "pl. „két kiló krumpli… tej… tíz tojás… ennyi”";
  setListenUI();
  runRecognizer();
  clearInterval(voice.idle);
  voice.idle = setInterval(() => {
    if (voice.wantOn && voice.mode !== "steps" && !voice.speaking && !state.busy && Date.now() - voice.lastHeard > IDLE_MS) {
      stopListening(); toast("Szüneteltem a hallgatást. Koppints a mikrofonra, ha még van valami.");
    }
  }, 1000);
}

function runRecognizer() {
  if (!voice.wantOn || voice.speaking || voice.running) return;
  const rec = new SR();
  rec.lang = "hu-HU"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
  rec.onstart = () => { voice.running = true; };
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const txt = r[0].transcript.trim();
      if (!txt) continue;
      voice.lastHeard = Date.now();
      if (r.isFinal) {
        voice.auto = false;
        if (voice.mode === "steps") { onStepSpeech(txt); return; }
        // „ennyi”, „kész”, „vége” → a diktálás vége (ami előtte elhangzott, még felkerül)
        const { rest, stop } = splitStop(txt);
        if (stop) {
          if (rest && voice.mode === "add") { setHeard(rest, ""); handleAdd(rest, { voice: true }); }
          stopListening();
          toast(rest ? "Rendben, ennyi volt. Befejeztem a hallgatást." : "Rendben, befejeztem a hallgatást.");
          return;
        }
        if (voice.mode === "aiq") {
          const ans = matchOption(state.aiOptions || [], txt);
          if (ans && ans !== SKIP) { stopListening(); $(`#ai-q button[data-opt="${CSS.escape(ans)}"]`)?.click(); }
          else if (ans === SKIP) { stopListening(); aiSheet.close(); }
          else speak("Nem értettem. Melyiket választod?");
          return;
        }
        if (voice.mode === "rsearch") { onSearchSpeech(txt); return; }
        if (voice.mode === "servings") {
          const n = parseServings(txt, { bare: true });
          if (n) chooseServings(n); else speak("Nem értettem. Hány főre főzöl?");
          return;
        }
        if (voice.mode === "await") return;
        setHeard(txt, "");
        handleAdd(txt, { voice: true });
      } else interim += txt + " ";
    }
    if (interim) $("#listen-text").textContent = `„${interim.trim()}…”`;
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      const wasAuto = voice.auto; stopListening();
      if (window.KK_DEMO_ONLY) toast("Ebben az előnézetben a mikrofon le van tiltva. A diktálás a saját címén futó appban működik; itt gépelve próbáld ki.");
      else if (!wasAuto) toast("A mikrofon nincs engedélyezve. Chrome-ban a cím melletti ikon → Engedélyek → Mikrofon. Addig gépelve is megy.");
    } else if (e.error === "network") {
      stopListening(); toast("A diktáláshoz internet kell. Most gépeld be a tételeket.");
    } else if (e.error === "audio-capture") {
      stopListening(); toast("Nem találom a mikrofont.");
    } // no-speech, aborted: az onend újraindítja
  };
  rec.onend = () => {
    voice.running = false; voice.rec = null;
    // Androidon a felismerés minden szünet után leáll: amíg kell, újraindítjuk
    if (voice.wantOn && !voice.speaking && voice.restarts++ < 200) setTimeout(runRecognizer, 120);
  };
  voice.rec = rec;
  try { rec.start(); } catch (err) { voice.running = false; console.warn(err); }
}

function stopListening() {
  voice.wantOn = false;
  clearInterval(voice.idle);
  try { voice.rec?.stop(); } catch {}
  setListenUI();
}

function speak(text) {
  if (!settings.speak || !("speechSynthesis" in window) || !voice.wantOn) return;
  voice.speaking = true; setListenUI();
  try { voice.rec?.abort(); } catch {}
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "hu-HU";
  const hu = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("hu"));
  if (hu) u.voice = hu;
  u.rate = 1.05;
  const done = () => { voice.speaking = false; voice.lastHeard = Date.now(); setListenUI(); setTimeout(runRecognizer, 150); };
  u.onend = done; u.onerror = done;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function speakQuestion() {
  const q = state.questions[0]; if (!q) return;
  speak(`${q.question} ${q.options.map((o, i) => `${i + 1}: ${o}`).join(", ")}?`);
}

$("#listen-stop").addEventListener("click", stopListening);

// A lebegő alsó sáv magasságához igazítjuk a lista alját
new ResizeObserver(([e]) => document.documentElement.style.setProperty("--composer-h", `${Math.ceil(e.contentRect.height)}px`)).observe($(".composer"));
updateSendBtn();

/* AI javaslat lap */
const aiSheet = $("#ai-sheet");
async function runSuggest(prompt, { spoken = false, fromSearch = false, title = "" } = {}) {
  const url = (prompt.match(/https?:\/\/\S+/) || [])[0] || null;
  const servings = parseServings(prompt);
  state.recipe = { prompt: url ? prompt : (stripServings(prompt) || prompt), url, servings, spoken, fromSearch, knownTitle: title };
  $("#ai-back").hidden = !fromSearch;
  renderAiFav();
  state.suggestion = null;
  $("#ai-title").textContent = title || (url ? `${siteOf(url) || "Recept"} recept` : state.recipe.prompt.replace(/^./, (c) => c.toUpperCase()));
  ["#ai-loading", "#ai-list", "#ai-note", "#ai-hint", "#ai-q", "#ai-source", "#ai-servings", "#ai-gsearch"].forEach((s) => ($(s).hidden = true));
  $("#ai-add").disabled = true; $("#ai-add").textContent = "Hozzáadás";
  if (!aiSheet.open) aiSheet.showModal();
  // Mindig megkérdezzük, hány főre (kivéve ha már elhangzott: „lecsó 4 főre”)
  if (!servings) return askServings();
  if (spoken && voice.wantOn) stopListening();
  fetchRecipe();
}

function askServings() {
  const last = LS.get("kk:servings", 4);
  $("#ai-servings").innerHTML = `<div class="qhead"><span class="qbadge" aria-hidden="true">?</span><strong>Hány főre főzöl?</strong></div>
    <div class="serv">${[1, 2, 3, 4, 5, 6, 8, 10].map((n) => `<button type="button" data-n="${n}" class="${n === last ? "last" : ""}">${n}<small>fő</small></button>`).join("")}</div>`;
  $("#ai-servings").hidden = false;
  if (state.recipe.spoken && voice.wantOn) { voice.mode = "servings"; speak("Hány főre főzöl?"); }
}
function chooseServings(n) {
  if (!state.recipe) return;
  state.recipe.servings = n; LS.set("kk:servings", n);
  $("#ai-servings").hidden = true;
  if (voice.wantOn && (voice.mode === "servings" || voice.mode === "await")) stopListening();
  fetchRecipe();
}
$("#ai-servings").addEventListener("click", (e) => { const b = e.target.closest("button[data-n]"); if (b) chooseServings(+b.dataset.n); });

async function fetchRecipe() {
  const R = state.recipe;
  $("#ai-loading").hidden = false;
  $("#ai-loading-text").textContent = R.url ? `Kiolvasom a receptet, ${R.servings} főre számolom…`
    : `Összeállítom a hozzávalókat ${R.servings} főre…`;
  const openNames = state.items.filter((i) => !i.done).map((i) => i.name);
  const onList = new Set(openNames.map(norm));
  try {
    const res = await backend.suggest(R.prompt, openNames, { servings: R.servings, url: R.url });
    if (!aiSheet.open || state.recipe !== R) return;
    state.suggestion = res;
    $("#ai-title").textContent = `${res.title || R.knownTitle || R.prompt}, ${R.servings} fő`;
    renderAiFav();
    $("#ai-loading").hidden = true;
    // Forrás: mindig linkeljük az eredeti receptet
    const notes = [];
    if (res.source?.url) {
      $("#ai-source").innerHTML = `Forrás: <a href="${esc(res.source.url)}" target="_blank" rel="noopener">${esc(res.source.site)}${res.source.title ? ` – ${esc(res.source.title)}` : ""}</a>`
        + (res.originalServings && res.originalServings !== R.servings ? `<br><small>Az eredeti recept ${res.originalServings} főre szól, ${R.servings} főre számoltam át.</small>` : "");
      $("#ai-source").hidden = false;
    } else {
      $("#ai-source").innerHTML = `Forrás: <b>${esc(sourceLabel(res))}</b>`
        + (res.generic ? `<br><small>Ha a Street Kitchen vagy a Mindmegette receptjét szeretnéd, oszd meg a recept linkjét az appal.</small>` : "");
      $("#ai-source").hidden = false;
    }
    if (res.searchEntryPoint) { // Google Search javaslatok – kötelező megjeleníteni
      const host = $("#ai-gsearch");
      const root = host.shadowRoot || host.attachShadow({ mode: "open" });
      root.innerHTML = res.searchEntryPoint;
      host.hidden = false;
    }
    if (res.note) notes.unshift(res.note);
    if (notes.length) { $("#ai-note").textContent = notes.join(" "); $("#ai-note").hidden = false; }
    if (res.question && res.options?.length) {
      $("#ai-q").innerHTML = `<div class="qhead"><span class="qbadge" aria-hidden="true">?</span><strong>${esc(res.question)}</strong></div>
        <div class="qopts">${res.options.map((o, i) => `<button type="button" data-opt="${esc(o)}"><span class="qn">${i + 1}</span>${esc(o)}</button>`).join("")}</div>
        <p class="qmore">${SR ? "Koppints, vagy mondd ki (pl. „a kettes”)." : ""}</p>`;
      $("#ai-q").hidden = false;
      state.aiOptions = res.options.slice();
      if (SR && R.spoken) { if (!voice.wantOn) startListening({ mode: "aiq" }); else voice.mode = "aiq"; speak(`${res.question} ${res.options.map((o, i) => `${i + 1}: ${o}`).join(", ")}.`); }
    }
    if (!res.items.length) return;
    $("#ai-list").innerHTML = res.items.map((it, i) => {
      const already = onList.has(norm(it.name));
      const checked = !it.staple && !already;
      const tag = already ? "már a listán" : it.staple ? "általában otthon van" : (it.category || "");
      return `<li><label><input type="checkbox" data-i="${i}" ${checked ? "checked" : ""}>
        <span><span class="nm">${esc(it.name)}</span><br><span class="tag">${esc(tag)}</span></span>
        <span class="qty">${esc(it.qty || "")}</span></label></li>`;
    }).join("");
    $("#ai-list").hidden = false;
    $("#ai-hint").hidden = !res.items.some((it) => it.staple || onList.has(norm(it.name)));
    updateAddCount();
  } catch (err) {
    console.error(err);
    $("#ai-loading").hidden = true;
    const msg = String(err?.message || "");
    $("#ai-note").textContent = /app.?check|403|permission/i.test(msg)
      ? "Az AI szolgáltatás elutasította a kérést (App Check). Ellenőrizd az App Check beállítást a README szerint."
      : R.url ? "Nem sikerült kiolvasni a receptet erről az oldalról. Próbáld újra, vagy oszd meg egy másik recept linkjét."
      : "Most nem sikerült elérni az AI-t. Ellenőrizd az internetkapcsolatot, és próbáld újra.";
    $("#ai-note").textContent += errDetail(err);
    $("#ai-note").hidden = false;
  }
}
function updateAddCount() {
  const n = $("#ai-list").querySelectorAll("input:checked").length;
  $("#ai-add").disabled = n === 0;
  $("#ai-add").textContent = n ? `Hozzáadás (${n})` : "Hozzáadás";
}
$("#ai-list").addEventListener("change", updateAddCount);
$("#ai-q").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-opt]"); if (!b) return;
  const R = state.recipe;
  runSuggest(`${R.prompt} – ${b.dataset.opt} ${R.servings} főre`);
});
$("#ai-cancel").addEventListener("click", () => aiSheet.close());
$("#ai-back").addEventListener("click", () => { aiSheet.close(); openRecipes(null, { keep: true }); });

/* Kedvenc csillag a hozzávaló-lapon */
function currentRecipeRef() {
  const R = state.recipe; if (!R) return null;
  const s = state.suggestion;
  const url = s?.source?.url || R.url || "";
  const title = (s?.title || R.knownTitle || R.prompt || "").replace(/,\s*\d+\s*fő$/, "").trim();
  if (!title && !url) return null;
  return { title: title || siteOf(url), url: url && /^https:\/\//.test(url) ? url : "", site: url ? siteOf(url) : "" };
}
function findFav(ref) { const k = favKey(ref); return state.favorites.find((f) => favKey(f) === k); }
function renderAiFav() {
  const b = $("#ai-fav"); if (!b) return;
  const ref = currentRecipeRef();
  b.hidden = !ref;
  if (!ref) return;
  const on = !!findFav(ref);
  b.classList.toggle("on", on);
  b.setAttribute("aria-pressed", String(on));
  b.setAttribute("aria-label", on ? "Eltávolítás a kedvencek közül" : "Hozzáadás a kedvencekhez");
}
$("#ai-fav").addEventListener("click", () => { const ref = currentRecipeRef(); if (ref) toggleFav(ref); });

async function toggleFav(ref) {
  const f = findFav(ref);
  try {
    if (f) {
      await backend.removeFavorite(state.listId, f.id);
      toast(`Kivettem a kedvencek közül: ${f.title}`, { label: "Visszavonás", run: () => backend.addFavorite(state.listId, { title: f.title, url: f.url || "", site: f.site || "", by: f.by || me.name }) });
    } else {
      await backend.addFavorite(state.listId, { title: String(ref.title).slice(0, 100), url: ref.url || "", site: ref.site || "", by: me.name });
      toast(`Kedvenc lett: ${ref.title}`);
    }
  } catch (err) { console.error(err); toast("Nem sikerült menteni a kedvencet."); }
}

/* ---------- Receptkereső + kedvencek ---------- */
const rSheet = $("#recipes-sheet");
const ICON_STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.5l-5.4 2.9 1.2-5.9L3.4 9.4l6-.7Z"/></svg>`;
const ICON_OUT = svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>');

function openRecipes(query = null, { spoken = false, keep = false } = {}) {
  if (voice.wantOn && voice.mode !== "rsearch") stopListening();
  if (!rSheet.open) rSheet.showModal();
  const S = state.search;
  if (query === "#kedvencek") { S.tab = "favs"; renderRecipes(); return; }
  if (query && query.trim()) { $("#rs-q").value = query; return searchRecipes(query, { spoken }); }
  if (!keep) S.tab = state.favorites.length && !S.results.length ? "favs" : "search";
  renderRecipes();
  // Alapból hanggal: a kereső megnyitásakor rögtön hallgat
  if (!keep && settings.autoListen && SR && !window.KK_DEMO_ONLY && !voice.wantOn) startListening({ mode: "rsearch" });
}
rSheet.addEventListener("close", () => { if (voice.wantOn && voice.mode === "rsearch") stopListening(); });
rSheet.addEventListener("click", (e) => { if (e.target === rSheet) rSheet.close(); });
$("#rs-close").addEventListener("click", () => rSheet.close());

// Rövid technikai részlet a hibaüzenet végére, hogy a hiba oka visszakereshető legyen
function errDetail(err) {
  const m = String(err?.code || "") + " " + String(err?.message || err || "");
  return `\n(Hibakód: ${m.replace(/\s+/g, " ").trim().slice(0, 160)})`;
}

async function searchRecipes(query, { spoken = false } = {}) {
  const S = state.search;
  query = String(query).trim(); if (!query) return;
  if (/https?:\/\//.test(query)) { rSheet.close(); return runSuggest(query); }
  Object.assign(S, { query, results: [], loading: true, tab: "search", meta: null, error: "" });
  renderRecipes();
  try {
    const r = await backend.searchRecipes(query);
    if (S.query !== query) return;
    Object.assign(S, { results: r.recipes || [], loading: false, meta: r });
    if (!S.results.length) console.warn("Üres receptlista", r);
    renderRecipes();
    if (spoken && voice.wantOn) {
      const n = S.results.length;
      if (n) speak(`${n} receptet találtam. Például: ${S.results.slice(0, 3).map((x) => x.title).join(", ")}. Melyik legyen?`);
      else speak("Nem találtam receptet. Mondj valami mást!");
    }
  } catch (err) {
    console.error(err);
    if (S.query !== query) return;
    Object.assign(S, { loading: false, error: "Most nem sikerült keresni. Ellenőrizd az internetkapcsolatot, vagy keress közvetlenül az oldalakon." + errDetail(err) });
    renderRecipes();
  }
}
$("#rs-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#rs-q").value.trim();
  if (!q) { if (voice.wantOn) stopListening(); else startListening({ mode: "rsearch" }); return; }
  if (voice.wantOn) stopListening();
  searchRecipes(q);
});
$("#rs-mic").addEventListener("click", () => {
  if (voice.wantOn && voice.mode === "rsearch") stopListening(); else { stopListening(); startListening({ mode: "rsearch" }); }
});

// Diktálás a keresőben: új keresés, „kedvencek”, vagy választás a találatokból („a másodikat”, „a paprikás csirkét”)
function onSearchSpeech(txt) {
  const t = norm(txt).replace(/[.,!?]/g, "");
  $("#rs-q").value = txt;
  if (/kedvenc/.test(t)) { state.search.tab = "favs"; renderRecipes(); return; }
  const list = state.search.tab === "favs" ? state.favorites : state.search.results;
  const ord = ["első", "második", "harmadik", "negyedik", "ötödik", "hatodik", "hetedik", "nyolcadik"].findIndex((w) => t.includes(w));
  if (list.length && ord >= 0 && list[ord]) return pickRecipe(list[ord], { spoken: true });
  if (list.length) {
    const words = t.split(/\s+/).filter((w) => w.length > 3).map((w) => w.slice(0, 5));
    const scored = list.map((r) => [r, words.filter((w) => norm(r.title).includes(w)).length]).sort((a, b) => b[1] - a[1]);
    if (scored[0] && scored[0][1] >= Math.max(1, Math.ceil(words.length / 2)) && (!scored[1] || scored[1][1] < scored[0][1])) return pickRecipe(scored[0][0], { spoken: true });
  }
  searchRecipes(txt, { spoken: true });
}

function pickRecipe(r, { spoken = false } = {}) {
  rSheet.close();
  if (spoken && SR) startListening({ mode: "servings" }); // hanggal válaszolhatsz a „Hány főre?” kérdésre
  runSuggest(r.url || r.title, { fromSearch: true, title: r.title, spoken });
}

function recipeCard(r, i, src) {
  const fav = !!findFav(r);
  const site = r.site || (r.url ? siteOf(r.url) : "");
  const siteCls = site === "Street Kitchen" ? "sk" : site === "Mindmegette" ? "mm" : "idea";
  const meta = [r.minutes ? `${r.minutes} perc` : "", src === "favs" && r.by ? (r.by === me.name ? "a te kedvenced" : `${r.by} kedvence`) : ""].filter(Boolean).join(" · ");
  const out = r.url
    ? `<a class="rlink" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="Recept megnyitása az oldalon">${ICON_OUT}</a>`
    : `<a class="rlink" href="${esc(siteSearchUrl(r.title))}" target="_blank" rel="noopener" aria-label="Keresés a Street Kitchenen és a Mindmegettén">${ICON_OUT}</a>`;
  return `<li class="rcard">
    <button type="button" class="rmain" data-pick="${i}">
      <span class="rsite ${siteCls}">${esc(site || "Ötlet")}</span>
      <strong>${esc(r.title)}</strong>
      ${r.description ? `<span class="rdesc">${esc(r.description)}</span>` : ""}
      ${meta ? `<span class="rmeta">${esc(meta)}</span>` : ""}
    </button>
    <div class="ract">
      <button type="button" class="star${fav ? " on" : ""}" data-fav="${i}" aria-pressed="${fav}" aria-label="${fav ? "Eltávolítás a kedvencek közül" : "Hozzáadás a kedvencekhez"}: ${esc(r.title)}">${ICON_STAR}</button>
      ${out}
    </div>
  </li>`;
}

function renderRecipes() {
  if (!$("#rs-body")) return;
  const S = state.search;
  const favN = state.favorites.length;
  $("#rs-tab-search").setAttribute("aria-selected", String(S.tab === "search"));
  $("#rs-tab-favs").setAttribute("aria-selected", String(S.tab === "favs"));
  $("#rs-tab-favs").innerHTML = `Kedvencek${favN ? ` <span>${favN}</span>` : ""}`;
  const gs = $("#rs-gsearch");
  let html = "";
  if (S.tab === "favs") {
    gs.hidden = true;
    html = favN
      ? `<ul class="rlist">${state.favorites.map((r, i) => recipeCard(r, i, "favs")).join("")}</ul>`
      : `<div class="rempty"><span class="star on big" aria-hidden="true">${ICON_STAR}</span><strong>Még nincs kedvenc receptetek</strong><span>Keress egy receptet, és koppints a csillagra. A kedvenceket az egész család látja.</span></div>`;
  } else if (S.loading) {
    gs.hidden = true;
    html = `<div class="loading"><div class="bounce" aria-hidden="true"><i></i><i></i><i></i></div><span>Keresem a recepteket: „${esc(S.query)}”…</span></div>`;
  } else if (!S.query) {
    gs.hidden = true;
    html = `<p class="rhint">Mondj vagy írj egy alapanyagot vagy ételtípust, és felsorolom a recepteket.</p>
      <div class="chips wrapchips">${SEARCH_CHIPS.map((c) => `<button type="button" class="chip" data-q="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
  } else {
    const m = S.meta || {};
    if (S.error) html += `<p class="note">${esc(S.error)}</p>`;
    if (m.note) html += `<p class="note">${esc(m.note)}</p>`;
    if (m.ideas && S.results.length) html += `<p class="rhint">Ötletek a Gemini-től. Koppints egyre, és összeállítom a hozzávalókat, vagy a nyíllal keresd meg a Street Kitchenen és a Mindmegettén.</p>`;
    if (S.results.length) html += `<ul class="rlist">${S.results.map((r, i) => recipeCard(r, i, "search")).join("")}</ul>`;
    else if (!S.error && !m.note) html += `<p class="note">Nem találtam receptet erre: „${esc(S.query)}”. Próbálj egy másik szót.</p>`;
    // Google keresési javaslatok: a Google előírása szerint meg kell jeleníteni
    if (m.searchEntryPoint) {
      const root = gs.shadowRoot || gs.attachShadow({ mode: "open" });
      root.innerHTML = m.searchEntryPoint; gs.hidden = false;
    } else gs.hidden = true;
  }
  if (S.tab === "search" && S.query && !S.loading) {
    html += `<a class="rsite-search" href="${esc(siteSearchUrl(S.query))}" target="_blank" rel="noopener">Keresés közvetlenül a Street Kitchenen és a Mindmegettén ${ICON_OUT}</a>`;
  }
  $("#rs-body").innerHTML = html;
}
$("#rs-tab-search").addEventListener("click", () => { state.search.tab = "search"; renderRecipes(); });
$("#rs-tab-favs").addEventListener("click", () => { state.search.tab = "favs"; renderRecipes(); });
$("#rs-body").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-q]");
  if (chip) { $("#rs-q").value = chip.dataset.q; if (voice.wantOn) stopListening(); return searchRecipes(chip.dataset.q); }
  const list = state.search.tab === "favs" ? state.favorites : state.search.results;
  const pick = e.target.closest("[data-pick]");
  if (pick) return pickRecipe(list[+pick.dataset.pick]);
  const fav = e.target.closest("[data-fav]");
  if (fav) { const r = list[+fav.dataset.fav]; if (r) toggleFav({ title: r.title, url: r.url || "", site: r.site || "" }).then(renderRecipes); }
});
aiSheet.addEventListener("close", () => { if (voice.wantOn && ["servings", "await"].includes(voice.mode)) stopListening(); });
aiSheet.addEventListener("click", (e) => { if (e.target === aiSheet) aiSheet.close(); });
$("#ai-add").addEventListener("click", async () => {
  const s = state.suggestion; if (!s) return;
  const source = (s.title || "").split(",")[0].trim().slice(0, 60);
  const sourceUrl = s.source?.url && /^https:\/\//.test(s.source.url) ? s.source.url.slice(0, 500) : "";
  const picked = [...$("#ai-list").querySelectorAll("input:checked")].map((x) => s.items[+x.dataset.i]);
  const items = picked.map((it) => ({
    name: String(it.name || "").slice(0, 100), qty: String(it.qty || "").slice(0, 30),
    category: CATS.includes(it.category) ? it.category : guessCategory(it.name),
    done: false, by: me.name, source, sourceSite: sourceLabel(s), ...(sourceUrl ? { sourceUrl } : {}),
  }));
  $("#ai-add").disabled = true;
  try {
    await backend.addItems(state.listId, items);
    // A recept a Főzés fülre is felkerül (összes hozzávalóval és a lépésekkel)
    await backend.addCooking(state.listId, {
      title: source || "Recept", servings: state.recipe?.servings || 4, minutes: s.minutes || 0,
      sourceSite: sourceLabel(s), sourceUrl, image: s.imageUrl || "",
      ingredients: s.items.slice(0, 60).map((it) => ({ name: String(it.name || "").slice(0, 100), qty: String(it.qty || "").slice(0, 30) })),
      steps: (s.steps || []).slice(0, 20), by: me.name,
    });
    aiSheet.close();
    toast(`${items.length} hozzávaló felkerült a listára, a recept pedig a Főzés fülre`, { label: "Megnézem", run: () => setTab("cook") });
  } catch (err) { console.error(err); toast("Nem sikerült hozzáadni. Próbáld újra."); $("#ai-add").disabled = false; }
});


/* ---------- Főzés fül: a hozzávalókkal feltett receptek, lépésről lépésre ---------- */
const ICON_CLOCK = svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>');
const ICON_PEOPLE = svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>');

function setTab(tab) {
  state.tab = tab;
  $("#tab-shop").setAttribute("aria-selected", String(tab === "shop"));
  $("#tab-cook").setAttribute("aria-selected", String(tab === "cook"));
  $("#groups").hidden = tab !== "shop";
  $("#cooking").hidden = tab !== "cook";
  $(".composer").hidden = tab !== "shop";
  if (tab === "cook" && voice.wantOn && voice.mode === "add") stopListening();
  renderCooking();
  window.scrollTo({ top: 0 });
}
$("#tab-shop").addEventListener("click", () => setTab("shop"));
$("#tab-cook").addEventListener("click", () => setTab("cook"));

function sourceChip(site, url) {
  const cls = site === "Street Kitchen" ? "sk" : site === "Mindmegette" ? "mm" : "idea";
  const label = esc(site || "Ismeretlen forrás");
  return url && /^https:\/\//.test(url)
    ? `<a class="rsite ${cls}" href="${esc(url)}" target="_blank" rel="noopener">${label} ↗</a>`
    : `<span class="rsite ${cls}">${label}</span>`;
}
const recipeImg = (src, cls) => (src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "");

function renderCooking() {
  const n = state.cooking.length;
  $("#tab-cook").innerHTML = `${ICON_POT}<span>Főzés</span>${n ? `<b>${n}</b>` : ""}`;
  if (state.tab !== "cook") return;
  if (!n) {
    $("#cooking").innerHTML = `<div class="empty">${EMPTY_POT}<strong>Még nincs mit főzni</strong><span>Ha egy recept hozzávalóit felteszed a listára, a recept ide kerül, és lépésről lépésre követheted.</span></div>`;
    return;
  }
  $("#cooking").innerHTML = `<ul class="cook-list">${state.cooking.map((r, i) => `
    <li class="cook-card">
      <button type="button" class="cook-open" data-cook="${i}">
        ${r.image ? recipeImg(r.image, "cook-thumb") : `<span class="cook-thumb ph" aria-hidden="true">${ICON_POT}</span>`}
        <span class="cook-body">
          <strong>${esc(r.title)}</strong>
          <span class="cook-meta">${ICON_PEOPLE}${r.servings || 4} fő${r.minutes ? ` ${ICON_CLOCK}${r.minutes} perc` : ""}${r.steps?.length ? ` · ${r.steps.length} lépés` : ""}</span>
          <span class="cook-by">${r.by ? `${face(r.by, "mini")}${esc(r.by)} tette fel` : ""}</span>
        </span>
      </button>
      <div class="cook-foot">${sourceChip(r.sourceSite, r.sourceUrl)}
        ${r.steps?.length ? `<button type="button" class="cook-go" data-steps="${i}">Főzés lépésről lépésre ›</button>` : ""}</div>
    </li>`).join("")}</ul>`;
}
$("#cooking").addEventListener("click", (e) => {
  const st = e.target.closest("[data-steps]"); if (st) return openSteps(state.cooking[+st.dataset.steps]);
  const o = e.target.closest("[data-cook]"); if (o) return openCookSheet(state.cooking[+o.dataset.cook]);
});

/* Recept részletei */
const cookSheet = $("#cook-sheet");
let cookOpen = null, cookDelArmed = false;
function openCookSheet(r) {
  if (!r) return;
  cookOpen = r; cookDelArmed = false;
  const onList = new Set(state.items.map((i) => norm(i.name)));
  $("#cook-body").innerHTML = `
    ${recipeImg(r.image, "cook-hero")}
    <div class="cook-src">${sourceChip(r.sourceSite, r.sourceUrl)}<span>${ICON_PEOPLE}${r.servings || 4} fő${r.minutes ? ` · ${r.minutes} perc` : ""}</span></div>
    <h4>Hozzávalók</h4>
    <ul class="ing">${(r.ingredients || []).map((it) => `<li><span>${esc(it.name)}</span><span class="q">${esc(it.qty || "")}</span>${onList.has(norm(it.name)) ? `<i class="on" title="A listán">listán</i>` : ""}</li>`).join("")}</ul>
    <h4>Elkészítés</h4>
    ${r.steps?.length ? `<ol class="steps">${r.steps.map((x) => `<li>${esc(x.text)}${recipeImg(x.image, "step-img")}</li>`).join("")}</ol>`
      : `<p class="rhint">Ehhez a recepthez nincsenek lépések.${r.sourceUrl ? " Az eredeti receptet a forrás linkjén találod." : ""}</p>`}
    <p class="credit">Recept${r.image ? " és kép" : ""}: ${esc(r.sourceSite || "")}${r.sourceUrl ? ` – <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">eredeti recept ↗</a>` : ""}. A lépések az eredeti recept alapján, röviden összefoglalva.</p>`;
  $("#cook-title").textContent = r.title;
  $("#cook-steps").hidden = !r.steps?.length;
  $("#cook-done").textContent = "Megfőztük, törölhető";
  cookSheet.showModal();
}
$("#cook-close").addEventListener("click", () => cookSheet.close());
cookSheet.addEventListener("click", (e) => { if (e.target === cookSheet) cookSheet.close(); });
$("#cook-steps").addEventListener("click", () => { cookSheet.close(); openSteps(cookOpen); });
$("#cook-done").addEventListener("click", async () => {
  if (!cookDelArmed) { cookDelArmed = true; $("#cook-done").textContent = "Biztosan törlöd? Koppints újra"; return; }
  try { await backend.removeCooking(state.listId, cookOpen.id); cookSheet.close(); toast(`Jó étvágyat! „${cookOpen.title}” lekerült a Főzés fülről.`); }
  catch (err) { console.error(err); toast("Nem sikerült törölni."); }
});

/* Lépésről lépésre mód – nagy betű, képernyő ébren tartása, hangvezérlés */
const stepSheet = $("#step-sheet");
const step = { r: null, i: 0, voice: false, lock: null };
const stepKey = (r) => `kk:step:${r.id}`;
async function keepAwake(on) {
  try {
    if (on && "wakeLock" in navigator) { step.lock = await navigator.wakeLock.request("screen"); }
    else { await step.lock?.release(); step.lock = null; }
  } catch { /* nem minden böngésző engedi */ }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && stepSheet.open) keepAwake(true); });

function openSteps(r) {
  if (!r?.steps?.length) return;
  step.r = r; step.i = Math.min(LS.get(stepKey(r), 0), r.steps.length - 1);
  renderStep();
  stepSheet.showModal();
  keepAwake(true);
}
function renderStep() {
  const r = step.r, n = r.steps.length, x = r.steps[step.i];
  $("#step-title").textContent = r.title;
  $("#step-src").innerHTML = sourceChip(r.sourceSite, r.sourceUrl);
  $("#step-count").textContent = `${step.i + 1}. lépés / ${n}`;
  $("#step-bar").style.width = `${((step.i + 1) / n) * 100}%`;
  $("#step-img").innerHTML = recipeImg(x.image, "step-big-img");
  $("#step-text").textContent = x.text;
  $("#step-prev").disabled = step.i === 0;
  $("#step-next").textContent = step.i === n - 1 ? "Kész!" : "Következő ›";
  $("#step-voice").classList.toggle("mic-live", voice.wantOn && voice.mode === "steps");
  $("#step-voice").setAttribute("aria-pressed", String(step.voice));
  LS.set(stepKey(r), step.i);
}
function goStep(d) {
  const n = step.r.steps.length;
  if (d > 0 && step.i === n - 1) { closeSteps(); toast("Jó étvágyat!"); return; }
  step.i = Math.max(0, Math.min(n - 1, step.i + d));
  renderStep();
  if (step.voice) speak(`${step.i + 1}. lépés. ${step.r.steps[step.i].text}`);
}
function closeSteps() { if (stepSheet.open) stepSheet.close(); }
stepSheet.addEventListener("close", () => { keepAwake(false); if (step.voice) { step.voice = false; stopListening(); } });
$("#step-prev").addEventListener("click", () => goStep(-1));
$("#step-next").addEventListener("click", () => goStep(1));
$("#step-close").addEventListener("click", closeSteps);
$("#step-voice").addEventListener("click", () => {
  if (!SR) { toast("A hangvezérléshez Chrome kell."); return; }
  // a tényleges mikrofonállapot dönt, így a gomb és a jelzés sosem csúszik el egymástól
  step.voice = !(voice.wantOn && voice.mode === "steps");
  if (step.voice) { stopListening(); startListening({ mode: "steps" }); speak(`${step.i + 1}. lépés. ${step.r.steps[step.i].text}`); }
  else stopListening();
  renderStep();
});
function onStepSpeech(txt) {
  const t = norm(txt);
  if (/(tovább|következő|mehet|kész|megvan|jöhet)/.test(t)) return goStep(1);
  if (/(vissza|előző)/.test(t)) return goStep(-1);
  if (/(ismét|újra|mégegyszer|még egyszer|mi volt)/.test(t)) return speak(`${step.i + 1}. lépés. ${step.r.steps[step.i].text}`);
  if (/(ennyi|vége|bezár|leállít|stop|elég)/.test(t)) { step.voice = false; stopListening(); renderStep(); return; }
}

/* Meghívás / beállítások lap */
const listSheet = $("#list-sheet");
function openListSheet() {
  const link = `${location.origin}${location.pathname}?lista=${encodeURIComponent(state.listId)}`;
  $("#invite-link").textContent = link;
  $("#rename").value = state.list?.name || "";
  $("#myname").value = me.name;
  $("#native-share").hidden = !navigator.share;
  $("#set-auto").checked = settings.autoListen; $("#set-speak").checked = settings.speak;
  $("#voice-settings").hidden = !SR;
  $("#members").innerHTML = Object.entries(state.list?.members || {}).map(([uid, n]) =>
    `<li>${face(n, "big")}<span>${esc(n)}${uid === me.uid ? " <em>(te)</em>" : ""}</span></li>`).join("");
  listSheet.showModal();
}
$("#open-list").addEventListener("click", openListSheet);
$("#share-btn").addEventListener("click", openListSheet);
listSheet.addEventListener("click", (e) => { if (e.target === listSheet) listSheet.close(); });
$("#copy-link").addEventListener("click", async () => {
  const text = $("#invite-link").textContent;
  try { await navigator.clipboard.writeText(text); toast("Link kimásolva"); }
  catch {
    const r = document.createRange(); r.selectNodeContents($("#invite-link"));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    toast("Jelöld ki és másold ki a linket");
  }
});
$("#native-share").addEventListener("click", async () => {
  try { await navigator.share({ title: "Közös Kosár", text: `Csatlakozz a(z) „${state.list?.name}” bevásárlólistához:`, url: $("#invite-link").textContent }); } catch {}
});
$("#save-settings").addEventListener("click", async () => {
  const name = $("#rename").value.trim() || state.list.name;
  const my = $("#myname").value.trim() || me.name;
  me.name = my; LS.set("kk:name", my);
  settings.autoListen = $("#set-auto").checked; LS.set("kk:autoListen", settings.autoListen);
  settings.speak = $("#set-speak").checked; LS.set("kk:speak", settings.speak);
  try { await backend.renameList(state.listId, name, me); listSheet.close(); toast("Mentve"); }
  catch (err) { console.error(err); toast("Nem sikerült menteni."); }
});
let leaveArmed = false;
$("#leave").addEventListener("click", async () => {
  if (!leaveArmed) { leaveArmed = true; $("#leave").textContent = "Biztosan kilépsz? Koppints újra"; setTimeout(() => { leaveArmed = false; $("#leave").textContent = "Kilépés a listából"; }, 4000); return; }
  leaveArmed = false; $("#leave").textContent = "Kilépés a listából";
  try { await backend.leaveList(state.listId); listSheet.close(); leaveToOnboarding(); }
  catch (err) { console.error(err); toast("Nem sikerült kilépni."); }
});

boot();
