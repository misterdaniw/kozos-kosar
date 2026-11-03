#!/usr/bin/env bash
# Közös Kosár – a Firebase projekt előkészítése (minden futáskor lefut, de csak azt csinálja meg, ami még hiányzik)
# - bekapcsolja a szükséges Google API-kat
# - létrehozza a Firestore adatbázist (eur3, Európa)
# - bekapcsolja a névtelen bejelentkezést
# - létrehozza a webalkalmazást, és a beállításait beírja a public/config.js-be
set -uo pipefail

KEY="${GOOGLE_APPLICATION_CREDENTIALS:?Hiányzik a szolgáltatásfiók-kulcs}"
P="$(jq -r .project_id "$KEY")"
FB="firebase --project $P --non-interactive"
echo "Projekt: $P"
echo "project_id=$P" >> "${GITHUB_OUTPUT:-/dev/null}"

warn() { echo "::warning::$*"; }

echo "== API-k bekapcsolása"
gcloud services enable \
  firebase.googleapis.com firebasehosting.googleapis.com firestore.googleapis.com firebaserules.googleapis.com \
  identitytoolkit.googleapis.com firebasevertexai.googleapis.com generativelanguage.googleapis.com \
  firebaseappcheck.googleapis.com recaptchaenterprise.googleapis.com --project "$P" \
  || warn "Nem minden API-t sikerült bekapcsolni. Kell a szolgáltatásfióknak a Szerkesztő (Editor) szerepkör."

echo "== Firestore adatbázis"
if $FB firestore:databases:get "(default)" >/dev/null 2>&1; then
  echo "Már létezik."
else
  # Az imént bekapcsolt API-k pár percig még „nem engedélyezettnek” látszhatnak: türelmesen újrapróbáljuk
  ok=""
  for i in 1 2 3 4 5 6 7 8; do
    if $FB firestore:databases:create "(default)" --location=eur3; then ok=1; break; fi
    echo "Még nem sikerült, várok 30 mp-et ($i/8)…"; sleep 30
  done
  [ -n "$ok" ] || { echo "::error::Nem sikerült létrehozni a Firestore adatbázist."; exit 1; }
  sleep 20
fi

echo "== Névtelen bejelentkezés"
TOKEN="$(gcloud auth print-access-token)"
code=$(curl -sS -o /tmp/auth.json -w "%{http_code}" -X PATCH \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "x-goog-user-project: $P" \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config?updateMask=signIn.anonymous.enabled" \
  -d '{"signIn":{"anonymous":{"enabled":true}}}')
if [ "$code" = "200" ]; then echo "Bekapcsolva."; else
  cat /tmp/auth.json
  warn "A névtelen bejelentkezést nem sikerült bekapcsolni. Firebase konzol → Authentication → Get started → Anonymous → Enable."
fi

echo "== Hosting oldal"
if ! $FB hosting:sites:list --json 2>/dev/null | jq -e '.result.sites | length > 0' >/dev/null; then
  $FB hosting:sites:create "$P" || warn "A Hosting oldal létrehozása nem sikerült (lehet, hogy már létezik)."
fi

echo "== Webalkalmazás és beállítások"
APPID="$($FB apps:list WEB --json 2>/dev/null | jq -r '.result[0].appId // empty')"
if [ -z "$APPID" ]; then
  APPID="$($FB apps:create WEB "Közös Kosár" --json | jq -r '.result.appId // empty')"
fi
[ -n "$APPID" ] || { echo "::error::Nem sikerült létrehozni a webalkalmazást."; exit 1; }
$FB apps:sdkconfig WEB "$APPID" --json > /tmp/sdk.json || { echo "::error::Nem sikerült lekérni a webalkalmazás beállításait."; exit 1; }

node - <<'NODE'
const fs = require("fs");
const out = JSON.parse(fs.readFileSync("/tmp/sdk.json", "utf8")).result || {};
let sdk = out.sdkConfig;
if (!sdk && out.fileContents) sdk = JSON.parse(out.fileContents.slice(out.fileContents.indexOf("{"), out.fileContents.lastIndexOf("}") + 1));
if (!sdk?.apiKey) { console.error("Nincs apiKey a webalkalmazás beállításaiban"); process.exit(1); }
const pick = ({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId }) => ({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId });
const path = "public/config.js";
const src = fs.readFileSync(path, "utf8");
const next = src.replace(/firebase:\s*\{[\s\S]*?\n  \},/, `firebase: ${JSON.stringify(pick(sdk), null, 4).replace(/\n}/, "\n  }").replace(/\n    /g, "\n    ")},`);
if (next === src) { console.error("Nem találtam a firebase blokkot a config.js-ben"); process.exit(1); }
fs.writeFileSync(path, next);
console.log("config.js kitöltve:", sdk.projectId);
NODE

echo "== App Check (reCAPTCHA Enterprise) – a Gemini (AI Logic) védelméhez"
TOKEN="$(gcloud auth print-access-token)"
H=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "x-goog-user-project: $P")
KEYNAME="Közös Kosár web"
SITEKEY="$(curl -sS "${H[@]}" "https://recaptchaenterprise.googleapis.com/v1/projects/$P/keys?pageSize=100" \
  | jq -r --arg n "$KEYNAME" '.keys[]? | select(.displayName==$n) | .name | split("/") | last' | head -1)"
if [ -z "$SITEKEY" ]; then
  body=$(jq -n --arg n "$KEYNAME" --arg p "$P" '{displayName:$n, webSettings:{integrationType:"SCORE", allowedDomains:[($p+".web.app"),($p+".firebaseapp.com"),"localhost"]}}')
  SITEKEY="$(curl -sS -X POST "${H[@]}" "https://recaptchaenterprise.googleapis.com/v1/projects/$P/keys" -d "$body" \
    | tee /tmp/rk.json | jq -r '.name // empty | split("/") | last')"
  [ -n "$SITEKEY" ] || { cat /tmp/rk.json; warn "Nem sikerült reCAPTCHA-kulcsot létrehozni."; }
fi
if [ -n "$SITEKEY" ]; then
  echo "reCAPTCHA kulcs: $SITEKEY"
  code=$(curl -sS -o /tmp/ac.json -w "%{http_code}" -X PATCH "${H[@]}" \
    "https://firebaseappcheck.googleapis.com/v1/projects/$P/apps/$APPID/recaptchaEnterpriseConfig?updateMask=siteKey" \
    -d "{\"siteKey\":\"$SITEKEY\"}")
  if [ "$code" = "200" ]; then echo "App Check regisztrálva."; else cat /tmp/ac.json; warn "Az App Check regisztráció nem sikerült."; fi
  SITEKEY="$SITEKEY" node -e '
    const fs = require("fs"); const p = "public/config.js"; const s = fs.readFileSync(p, "utf8");
    const n = s.replace(/appCheck:\s*\{[\s\S]*?\n  \},/, `appCheck: {\n    provider: "enterprise",\n    siteKey: "${process.env.SITEKEY}",\n  },`);
    if (n === s) { console.error("Nem találtam az appCheck blokkot"); process.exit(1); }
    fs.writeFileSync(p, n); console.log("config.js: App Check beállítva");'
fi

echo "== Gemini (AI Logic) állapota"
code=$(curl -sS -o /tmp/gl.json -w "%{http_code}" "${H[@]}" "https://serviceusage.googleapis.com/v1/projects/$P/services/firebasevertexai.googleapis.com")
echo "AI Logic API: $(jq -r '.state // "?"' /tmp/gl.json)"

echo "== Gemini próbahívás (App Check token nélkül – a válasz mutatja, mi hiányzik még)"
APIKEY="$(node -e 'import("./public/config.js").then(m=>console.log(m.default.firebase.apiKey))' 2>/dev/null || true)"
MODELS="$(node -e 'import("./public/config.js").then(m=>console.log([m.default.model||"gemini-3.8-flash",...(m.default.fallbackModels||[])].join(" ")))' 2>/dev/null || echo gemini-3.8-flash)"
for MODEL in $MODELS; do
  code=$(curl -sS -o /tmp/gem.json -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" -H "x-goog-api-key: $APIKEY" -H "X-Firebase-AppId: $APPID" \
    "https://firebasevertexai.googleapis.com/v1beta/projects/$P/models/$MODEL:generateContent" \
    -d '{"contents":[{"role":"user","parts":[{"text":"Mondj egy magyar csirkés ételt, csak a nevét."}]}]}')
  echo "GEMINI_TEST $MODEL http=$code $(jq -c '{error: .error.message, status: .error.status, text: (.candidates[0].content.parts[0].text // null)}' /tmp/gem.json 2>/dev/null | cut -c1-300)"
done
