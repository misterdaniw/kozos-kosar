// Közös Kosár – beállítások
// Töltsd ki a Firebase konzolból (Projektbeállítások → Általános → Saját alkalmazások → Webapp → SDK beállítás).
// Amíg az apiKey üres, az alkalmazás demó módban fut (csak ezen az eszközön, Firebase nélkül).
export default {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },

  // App Check – az AI funkcióhoz kötelező (a Firebase 2026. november 2-től automatikusan kikényszeríti).
  // provider: "v3" (reCAPTCHA v3, ingyenes) vagy "enterprise" (reCAPTCHA Enterprise)
  appCheck: {
    provider: "v3",
    siteKey: "",
  },

  // Gemini szolgáltatás: "agentPlatform" (Google Cloud, utólagos számlázás – Blaze csomaghoz) vagy "developer" (ingyenes keret, Spark csomag)
  aiBackend: "agentPlatform",
  aiLocation: "global",

  // Gemini modell a Firebase AI Logic-on keresztül (Gemini Developer API, ingyenes Spark csomaggal is megy)
  model: "gemini-3.5-flash-lite",
  // Ha a fő modell túlterhelt, ezekkel próbálkozik sorban (mind ingyenes keretben használható)
  fallbackModels: ["gemini-3.8-flash"],
  // A bevásárlólista értelmezéséhez használt gyors modell
  fastModel: "gemini-3.5-flash-lite",

  // Recept keresése kimondott ételnévre a streetkitchen.hu és mindmegette.hu oldalon (Google Search grounding).
  // Csak Blaze (bankkártyás) Firebase-csomaggal működik; havi 5000 keresés ingyenes. Előtte maradjon false.
  // A recept LINKJÉNEK megosztása enélkül, az ingyenes keretben is működik.
  recipeSearch: false,
};
