# Közös Kosár

Közös családi bevásárlólista, telepíthető webalkalmazásként (PWA). Amit bárki felír, azonnal megjelenik mindenkinél, a **Recept** gombbal pedig elég beírni, mit főzöl („lecsó 4 főre”, „bolognai + rakott krumpli”), és a Gemini összeállítja a hozzávalókat.

## Mit tud

- **Valós idejű közös lista** – Firestore szinkron, több telefonon egyszerre szerkeszthető.
- **Meghívás linkkel** – a családtag megnyitja a linket, beírja a nevét, és már bent is van. Nem kell regisztráció (névtelen Firebase-bejelentkezés).
- **Receptek a Street Kitchenről és a Mindmegettéről** – a recept hozzávalói az eredeti oldalról kerülnek a listára, a megadott létszámra átszámolva, a forrás linkjével. Az otthon általában meglévő alapokat (só, olaj…) és a listán már szereplő tételeket nem jelöli be, mielőtt hozzáadnád.
- **Receptkereső** – a **Receptek** gombbal (vagy kimondva: „csirkés receptek”) mondj egy alapanyagot vagy ételtípust („csirke”, „gyors vacsora”, „leves”), és felsorolja a recepteket. Koppintással vagy hanggal választasz („a másodikat”, „a paprikás csirkét”), utána jön a létszám és a hozzávalók.
- **Főzés fül** – ha egy recept hozzávalóit felteszed a listára, a recept (hozzávalók, lépések, kép, forrás) a Főzés fülre kerül, a család minden tagjánál. **Lépésről lépésre** módban nagy betűvel, képernyő-ébrentartással követhető; hangvezérléssel is („tovább”, „vissza”, „ismételd”, „ennyi”). A lépések az eredeti recept alapján, röviden összefoglalva jelennek meg, mindig a forrás jelölésével és linkjével.
- **Forrás mindig látszik** – a receptnél, a Főzés fülön és a listán a hozzávalók mellett is: Street Kitchen, Mindmegette, vagy „Gemini (általános recept)”.
- **„Ennyi” = vége** – diktálás közben az „ennyi”, „kész”, „vége” vagy „ez minden” szóra befejezi a hallgatást (ami előtte elhangzott, még felkerül). Hallgatás közben a mikrofon gomb folyamatosan pulzál.
- **Válasz hanggal** – a visszakérdezéseknél a lehetőségek számozottak; kimondhatod a nevét („a kaliforniait”), a számát („a kettes”), vagy azt, hogy „mindegy” / „nem kell”.
- **Közös kedvencek** – a csillaggal kedvencnek jelölheted a recepteket (a találatoknál és a hozzávaló-lapon is). A kedvenceket az egész család látja a **Kedvencek** fülön, azt is, ki jelölte meg; onnan egy koppintással mehet a listára.
- **Mindig megkérdezi, hány főre** – gombokkal vagy hanggal válaszolhatsz. Ha már elhangzott („lecsó 4 főre”), nem kérdez rá újra.
- **Hangos felvitel alapból** – az app megnyitáskor rögtön hallgat (ez kikapcsolható). Mondd sorban, ütemesen: „két kiló krumpli… meg tíz tojás… és kenyér”. Minden szünet után azonnal felírja, amit mondtál, és közben tovább hallgat. 20 másodperc csend után szünetel; a mikrofon gombbal folytatható.
- **Visszakérdez, ha nem érti** – kétértelmű szónál („paprika”: tv paprika, kaliforniai vagy őrölt?) kérdéskártyát mutat, és hangosan fel is olvassa. Válaszolhatsz koppintással vagy hanggal („a kaliforniait”, „mindegy”, „nem kell”). Ha valamit egyáltalán nem értett, szól, hogy mondd újra.
- **Gépelve is megy** – „2 kg krumpli, tej 2 l”, vagy egyszerre több tétel. A kategóriát (zöldség, tejtermék…) magától kitalálja. Minden hozzáadás visszavonható.
- **Bolti sorrend** – a tételek kategóriánként csoportosítva, a megvett tételek a „kosárba” kerülnek.
- **Offline is működik** – boltban, gyenge térerőnél is pipálhatsz; amint van net, szinkronizál.
- **Androidra telepíthető** – saját ikonnal a kezdőképernyőn, teljes képernyőn fut. iPhone-on és gépen is működik.

## Receptek: Street Kitchen és Mindmegette

Az app nem másolja le előre a két oldal receptjeit (az a tartalmuk tömeges átvétele lenne). Helyette mindig az adott receptet olvassa ki az eredeti oldalról, amikor kéred, és csak a hozzávalókat írja fel, a recept linkjével együtt. Az elkészítés lépéseit az eredeti oldalon nézed meg; a listán a tétel alatti receptnévre koppintva oda jutsz.

**1. Link megosztása (ingyenes, mindig működik)**

- Nyisd meg a receptet a Street Kitchen vagy a Mindmegette oldalán Chrome-ban.
- Koppints a **Megosztás** gombra, és válaszd a **Közös Kosár**t. (Ez a telepített appnál jelenik meg a megosztási listában.)
- Az app megkérdezi, hány főre, kiolvassa a hozzávalókat (Gemini URL context), átszámolja, és megmutatja, mielőtt felírná.
- A linket be is illesztheted a beviteli mezőbe.

**Receptkereső („csirke”)**

- Blaze csomaggal és `recipeSearch: true` beállítással a találatok a Street Kitchen és a Mindmegette valódi receptjei, címkével és linkkel. Az app csak a két oldal linkjeit fogadja el, más oldalakat kiszűr.
- Ingyenes keretben a Gemini ételötleteket ad (Ötlet címkével). Ezekből is összeállítja a hozzávalókat, a nyíl gombbal pedig a két oldalon kereshetsz rá a receptre, és megoszthatod az appal.
- A találatok alján mindig ott a „Keresés közvetlenül a Street Kitchenen és a Mindmegettén” link.

**2. Kimondott ételnév („lecsó”) – Blaze csomaggal**

- Az app maga keres receptet a két oldalon (Gemini + Google keresés), és abból dolgozik.
- A Google keresést a Gemini ingyenes kerete nem tartalmazza: a Firebase projektet **Blaze** (bankkártyás, használat alapú) csomagra kell váltani. A Gemini Developer API-ban havi 5000 keresés ingyenes, egy család ennél jóval kevesebbet használ.
- Bekapcsolás: Firebase konzol → **Usage and billing → Modify plan → Blaze**, és érdemes beállítani egy **költségvetési riasztást** (pl. 1 USD). Utána a `config.js`-ben: `recipeSearch: true`.
- A Google előírja, hogy a keresési javaslatok (kis Google-sáv) és a források megjelenjenek; az app ezt automatikusan megjeleníti a recept alatt.
- Amíg a keresés nincs bekapcsolva, kimondott ételnévre az app a Gemini általános tudásából dolgozik, és jelzi, hogy ez nem a két oldal receptje.

## Hogyan érti meg, amit mondasz?

Két lépcsőben, hogy gyors és ingyenes maradjon:

1. **Helyi értelmező** (`public/parser.js`) – a telefonon fut, AI és internet nélkül. Ismeri a gyakori termékeket, a számokat szóval („két kiló”, „fél kiló”, „tíz”), a mértékegységeket és a tárgyragos alakokat („krumplit” → krumpli). A kétértelmű szavakra (paprika, hagyma, sajt, tészta, hús, répa, saláta) visszakérdez. Az egyszerű diktálást ez azonnal elintézi.
2. **Gemini Flash** – csak akkor dolgozik, ha a helyi értelmező bizonytalan (ismeretlen szó, félrehallás, „a lecsóhoz valókat”). Ilyenkor ő bontja tételekre a mondatot, és ő kérdez vissza. Ha nincs net vagy nem elérhető, a helyi értelmező eredménye kerül a listára.

A felhős Gemini a Gemini Developer API ingyenes keretében fut (Firebase Spark csomag, bankkártya nélkül). A telefonon futó Gemini Nano Androidon webappból jelenleg nem érhető el, és magyarul sem tud, ezért nem ezt használjuk.

**A diktáláshoz** Androidon Chrome kell (ez tartalmazza a beszédfelismerést), és internet. Az első alkalommal a telefon engedélyt kér a mikrofonhoz. A felolvasáshoz a telefon magyar hangját használja; ha nincs telepítve, a kérdést csak kiírja.

A felismert szavakat és a visszakérdezéseket a `parser.js` elején bővítheted (`GUESS`, `PHRASES`, `AMBIG`).

## Demó mód

Amíg a `public/config.js`-ben üres az `apiKey`, az app demó módban fut: a lista csak az adott eszközön él, és a recept funkció néhány ételt ismer (lecsó, palacsinta, gulyás, bolognai, rakott krumpli). Így Firebase nélkül is ki tudod próbálni:

```bash
cd kozos-kosar
npx serve public        # vagy: python3 -m http.server -d public
```

## Élesítés (kb. 20 perc)

A Firebase ingyenes **Spark** csomagja egy család használatára bőven elég (Firestore, Hosting, névtelen bejelentkezés, és a Gemini Developer API-n keresztül a `gemini-3.8-flash` modell).

### 1. Firebase projekt

1. Nyisd meg a [Firebase konzolt](https://console.firebase.google.com), és hozz létre egy projektet (pl. `kozos-kosar`). A Google Analytics kikapcsolható.
2. **Projektbeállítások → Általános → Saját alkalmazások → Webalkalmazás hozzáadása (`</>`)**. Adj neki nevet, a Hostingot itt még nem kell bepipálni.
3. A megjelenő `firebaseConfig` értékeit másold be a `public/config.js` `firebase` részébe.

### 2. Bejelentkezés

**Build → Authentication → Kezdés → Sign-in method → Névtelen (Anonymous) → Engedélyezés.**

### 3. Adatbázis

**Build → Firestore Database → Adatbázis létrehozása.** Helynek válassz európait (pl. `eur3` vagy `europe-west3`), indítsd éles módban. A szabályokat a 6. lépés tölti fel.

### 4. AI (Gemini)

**Build → AI Logic → Kezdés → Gemini Developer API.** A konzol végigvezet; az API-kulcsot a Firebase kezeli, nem kerül az alkalmazás kódjába.

### 5. App Check (az AI-hoz kötelező)

A Firebase **2026. november 2-től automatikusan kikényszeríti** az App Checket az AI Logic-ra, ezért enélkül a Recept gomb hibát ad.

1. Hozz létre egy **reCAPTCHA v3** kulcsot a [reCAPTCHA admin oldalon](https://www.google.com/recaptcha/admin/create). Domainnek add meg a Firebase Hosting címeidet: `<projekt-id>.web.app` és `<projekt-id>.firebaseapp.com` (helyi teszthez a `localhost`-ot is).
2. Firebase konzol → **Build → App Check → Apps** → a webalkalmazásodnál válaszd a **reCAPTCHA** szolgáltatót, és add meg a **titkos kulcsot** (secret key).
3. A **webhelykulcsot** (site key) írd a `public/config.js`-be: `appCheck.siteKey`.
4. Helyi teszteléskor (`localhost`) az app debug tokent kér: a böngésző konzolján megjelenik egy token, ezt az **App Check → Apps → ⋮ → Debug tokenek kezelése** alatt add hozzá.

Ha reCAPTCHA Enterprise-t használnál, állítsd a `provider` értékét `"enterprise"`-re.

### 6. Feltöltés (Firebase Hosting)

Kell hozzá Node.js. A projekt mappájában:

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # válaszd ki a projektet
firebase deploy               # feltölti az appot és a Firestore szabályokat
```

A végén kiírja a címet, pl. `https://kozos-kosar.web.app`.

### 7. Telepítés Androidra

Nyisd meg a címet **Chrome**-ban → jobb felső **⋮** menü → **Alkalmazás telepítése** (vagy **Hozzáadás a kezdőképernyőhöz**). Ezután saját ikonnal, böngészősáv nélkül indul.

### 8. Család meghívása

Az appban koppints a fejlécben az ember ikonra → **Másolás** vagy **Megosztás…**, és küldd el a linket (Messenger, Viber, SMS). Aki megnyitja, beírja a nevét, és már ugyanazt a listát látja.

## Felépítés

```
kozos-kosar/
├─ public/
│  ├─ index.html            felület és stílusok
│  ├─ app.js                logika: lista, szinkron, diktálás, AI, demó mód
│  ├─ parser.js             helyi értelmező: tételek, mennyiségek, visszakérdezés
│  ├─ config.js             Firebase + App Check + modell beállítások (ezt kell kitölteni)
│  ├─ manifest.webmanifest  PWA leíró (név, ikon, színek)
│  ├─ sw.js                 service worker (offline indulás)
│  └─ icons/                alkalmazásikonok
├─ firestore.rules          biztonsági szabályok: csak a lista tagjai látják és írják
└─ firebase.json            Hosting és Firestore beállítás
```

**Adatmodell (Firestore):**

- `lists/{listaId}` – `name`, `createdAt`, `members` (`{ uid: név }`)
- `lists/{listaId}/items/{tételId}` – `name`, `qty`, `category`, `done`, `doneBy`, `by`, `source` (melyik receptből jött), `sourceUrl`, `createdAt`
- `lists/{listaId}/favorites/{id}` – kedvenc receptek: `title`, `url`, `site`, `by` (ki jelölte meg), `createdAt`

**Biztonság:** a lista azonosítója egyben a meghívó kulcsa (véletlenszerű, kitalálhatatlan). Akinél megvan a link, csatlakozhat; a szabályok szerint egy kívülálló csak saját magát adhatja hozzá a tagokhoz, más adatot nem lát és nem módosít.

## Testreszabás

- **Modell:** `config.js` → `model`. A `gemini-3.8-flash` gyors és a Spark csomagban is használható.
- **Az AI viselkedése:** `app.js` → `SYSTEM_PROMPT` (pl. vegetáriánus család, mindig 3 adag, kedvenc boltok kiszerelései).
- **Kategóriák / bolti sorrend:** `app.js` → `CATS` tömb sorrendje = a lista sorrendje. Igazítsd a saját boltod útvonalához.
- **Gyorskereső gombok a receptkeresőben:** `app.js` → `SEARCH_CHIPS`.

## Ha valami nem megy

| Tünet | Ok és megoldás |
|---|---|
| „Demó mód” felirat élesítés után | Üres maradt az `apiKey` a `config.js`-ben, vagy nem töltődött újra az oldal. |
| „Nem sikerült csatlakozni a Firebase-hez” | Nincs engedélyezve a névtelen bejelentkezés (2. lépés). |
| A lista nem töltődik, vagy „nem érhető el” | Nincsenek feltöltve a szabályok: `firebase deploy --only firestore:rules`. |
| A kedvencek nem mentődnek | A frissített `firestore.rules`-t is fel kell tölteni (`firebase deploy --only firestore:rules`). |
| A Recept mód hibát ad (App Check) | Hiányzik vagy rossz a site key, a domain nincs a reCAPTCHA kulcsnál, vagy helyben nincs regisztrálva a debug token (5. lépés). |
| Nem jelenik meg a „Telepítés” menüpont | Csak HTTPS címen (a `web.app` ilyen) és Chrome-ban érhető el. |
| Nem indul a diktálás | Engedélyezd a mikrofont: Chrome → a cím melletti ikon → Engedélyek → Mikrofon. Kell hozzá internet. |
| Megnyitáskor nem hallgat magától | Egyes telefonokon a böngésző csak koppintás után engedi a mikrofont. Ilyenkor koppints egyszer a mikrofon gombra. |
