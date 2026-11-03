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
  firebaseappcheck.googleapis.com --project "$P" \
  || warn "Nem minden API-t sikerült bekapcsolni. Kell a szolgáltatásfióknak a Szerkesztő (Editor) szerepkör."

echo "== Firestore adatbázis"
if $FB firestore:databases:get "(default)" >/dev/null 2>&1; then
  echo "Már létezik."
else
  $FB firestore:databases:create "(default)" --location=eur3 \
    || { echo "::error::Nem sikerült létrehozni a Firestore adatbázist."; exit 1; }
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
