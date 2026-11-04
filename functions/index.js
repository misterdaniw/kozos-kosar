// Közös Kosár – szerverfüggvény: receptkeresés a Street Kitchen és a Mindmegette oldalán
// a Google oldalkeresőjével (Vertex AI Search, „website search”, csak a két domainre korlátozva).
// A találatok egy közös, folyamatosan bővülő adatbázisba kerülnek (Firestore: recipes, recipeQueries),
// így amit egyszer már megtaláltunk, azt az app legközelebb azonnal betölti.
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleAuth } from "google-auth-library";
import { createHash } from "node:crypto";

setGlobalOptions({ region: "europe-west1", maxInstances: 3, memory: "256MiB", timeoutSeconds: 30 });
initializeApp();
const db = getFirestore();
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

const ENGINE = process.env.RECIPE_ENGINE_ID || "recipe-search";
const SITES = { "streetkitchen.hu": "Street Kitchen", "mindmegette.hu": "Mindmegette" };
const norm = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
const docId = (url) => createHash("sha1").update(url).digest("hex").slice(0, 24);

function siteOf(url) {
  try { return SITES[new URL(url).hostname.replace(/^www\./, "")] || ""; } catch { return ""; }
}
// Recept-e a találat (és nem pl. cikk, kategória vagy szerzői oldal)?
function looksLikeRecipe(url, title) {
  let path = "";
  try { path = new URL(url).pathname.toLowerCase(); } catch { return false; }
  if (!path || path === "/") return false;
  // gyűjtő-, kategória-, címke-, szerzői és cikkoldalak kizárása
  if (/\/(cimke|kategori|valogatas|gyujtemeny|tag|category|szerzo|author|kereses|search|video|cikk|magazin|hir|tipp|lexikon|cikkek)/.test(path)) return false;
  if (/\breceptek\b|válogatás|gyűjtemény/i.test(title)) return false; // „Csirkemell receptek” típusú gyűjtőoldalak
  return /\/(receptek|recept)\/|\.recept\/?$|\/recept-/.test(path) || /recept/.test(path);
}
const cleanTitle = (t) => String(t || "").replace(/\s*[|–-]\s*(Street ?Kitchen|Mindmegette(\.hu)?).*$/i, "").replace(/\s+recept$/i, "").trim();

function pickImage(d) {
  const pm = d?.pagemap || {};
  const cand = [pm.cse_image?.[0]?.src, pm.metatags?.[0]?.["og:image"], pm.metatags?.[0]?.["twitter:image"], pm.cse_thumbnail?.[0]?.src, pm.imageobject?.[0]?.url];
  return cand.find((u) => typeof u === "string" && /^https:\/\//.test(u)) || "";
}
function pickMinutes(d) {
  const r = d?.pagemap?.recipe?.[0] || {};
  const iso = r.totaltime || r.totalTime || r.cooktime || "";
  const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  return m ? (+m[1] || 0) * 60 + (+m[2] || 0) : 0;
}

async function siteSearch(query, offset) {
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const client = await auth.getClient();
  const url = `https://discoveryengine.googleapis.com/v1/projects/${project}/locations/global/collections/default_collection/engines/${ENGINE}/servingConfigs/default_search:search`;
  const res = await client.request({
    url, method: "POST",
    data: { query: `${query} recept`, pageSize: 20, offset, languageCode: "hu", spellCorrectionSpec: { mode: "AUTO" } },
  });
  return res.data?.results || [];
}

export const searchRecipes = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Be kell lépni.");
  const query = norm(req.data?.query).slice(0, 80);
  const offset = Math.max(0, Math.min(90, +req.data?.offset || 0));
  if (!query) throw new HttpsError("invalid-argument", "Üres keresés.");

  let raw;
  try { raw = await siteSearch(query, offset); }
  catch (e) {
    const msg = e?.response?.data?.error?.message || e.message;
    console.error("Keresési hiba", msg);
    throw new HttpsError("unavailable", `A keresés most nem érhető el: ${String(msg).slice(0, 200)}`);
  }

  const found = [];
  for (const r of raw) {
    const d = r.document?.derivedStructData || {};
    const link = d.link || d.formattedUrl || "";
    const site = siteOf(link);
    const title = cleanTitle(d.title || d.htmlTitle?.replace(/<[^>]+>/g, ""));
    if (!site || !title || !looksLikeRecipe(link, title)) continue;
    found.push({
      title: title.slice(0, 140), url: link.slice(0, 600), site,
      image: pickImage(d).slice(0, 800),
      description: String(d.snippets?.[0]?.snippet || d.snippet || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 240),
      minutes: pickMinutes(d),
    });
  }

  // Mentés a közös adatbázisba: a recept egyszer szerepel (URL alapján), a keresőszavak gyűlnek hozzá
  const batch = db.batch();
  for (const f of found) {
    batch.set(db.collection("recipes").doc(docId(f.url)), {
      ...f, queries: FieldValue.arrayUnion(query), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  batch.set(db.collection("recipeQueries").doc(docId(query)), {
    query, lastOffset: offset, nextOffset: offset + 20, exhausted: raw.length < 20,
    count: FieldValue.increment(found.length), updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();

  return { recipes: found, nextOffset: offset + 20, exhausted: raw.length < 20 };
});
