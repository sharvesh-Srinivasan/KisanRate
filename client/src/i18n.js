import { createContext, useCallback, useContext, useState } from "react";

// ── Translation dictionary ────────────────────────────────────────────────────
const translations = {
  en: {
    // Navbar
    home: "Home",
    admin: "Admin",
    language: "Language",

    // Hero
    tagline: "Tamil Nadu mandi intelligence",
    hero_heading: "Smarter mandi prices with live updates and next-day insights.",
    hero_sub: "Track crop prices across Tamil Nadu, compare min/max trends, and get AI-led predictions in a calm, farmer-friendly dashboard.",
    explore_prices: "Explore prices",
    why_kisanrate: "Why KisanRate",
    live_updates: "Live updates",
    whatsapp_alerts: "WhatsApp alerts",
    ai_signals: "AI price signals",

    // Stats
    crops_tracked: "Crops tracked",
    mandis_covered: "Mandis covered",
    last_updated: "Last updated",

    // Filters
    filter_prices: "Filter prices",
    all_districts: "All districts",
    all_crops: "All crops",

    // Price cards
    per_quintal: "/Quintal",
    min: "Min",
    max: "Max",
    predicted: "Predicted",
    today_price: "Today's modal price",
    prediction_label: "Tomorrow's estimate",
    market_details: "Market details",
    no_prediction: "No prediction available yet.",
    last_updated_label: "Last updated",
    tap_for_trend: "Tap a crop card to see the 30-day trend.",
    todays_prices: "Today's prices",
    no_prices: "No prices found for selected filters",

    // Sell advisor
    sell_now: "Good time to sell ✓",
    hold: "Wait a few days 📈",
    falling: "Price is falling ↓",
    sell_advice_reason_up: "Price is above 7-day average and expected to fall",
    sell_advice_reason_hold: "Price expected to rise soon — hold if possible",
    sell_advice_reason_fall: "Price is falling — sell quickly",
    sell_advice_label: "Sell advice",

    // Best mandi
    best_mandi_title: "Best Mandi for",
    best_mandi_sub: "Ranked by today's modal price",
    best_price: "Best Price",
    vs_others: "vs next",
    no_mandi_data: "No mandi data available for this crop today.",
    select_crop_hint: "Select a crop above to see the best paying mandi today",

    // WhatsApp
    wa_heading: "Get mandi prices delivered to your WhatsApp — daily.",
    wa_sub: "Subscribe once. Receive crop price updates and AI predictions every morning — no app needed.",
    wa_eyebrow: "WhatsApp alerts",
    wa_form_title: "Subscribe for daily price alerts",
    wa_form_note: "Sandbox users only — make sure you've joined the Twilio WhatsApp sandbox first.",
    wa_name: "Name (optional)",
    wa_name_ph: "Your name",
    wa_phone: "WhatsApp number *",
    wa_phone_ph: "10-digit number",
    wa_crop: "Crop *",
    wa_mandi: "Mandi *",
    wa_select_crop: "Select crop",
    wa_select_mandi: "Select mandi",
    wa_subscribe_btn: "Subscribe via WhatsApp",
    wa_subscribing: "Subscribing…",
    wa_loading: "Loading crop and mandi options…",
    wa_free: "Free",
    wa_chat_now: "Chat now on WhatsApp",
    wa_view_details: "View details",
    wa_quick_signup: "Quick WhatsApp Sign-up",
    wa_quick_desc: "Select your crop and district below — we'll open WhatsApp with everything pre-filled. Just hit Send!",
    wa_select_district: "Select your district",
    wa_open_whatsapp: "Open WhatsApp (pre-filled)",

    // About
    why_heading: "Why KisanRate",
    why_body: "KisanRate brings live mandi prices and short-term forecasts to farmers without requiring any app downloads. It combines official Agmarknet data, real-time updates, and WhatsApp alerts so local communities can plan sales with confidence.",

    // Report
    report_price: "Report wrong price",
    report_title: "Report Incorrect Price",
    report_actual: "What is the actual price? (Rs/Qtl)",
    report_reason: "Reason (Optional)",
    report_reason_ph: "e.g. Mandi price is different today",
    report_submit: "Submit Report",
    report_submitting: "Submitting…",
    report_success: "Thank you! Your report has been submitted.",
    report_error: "Failed to submit report. Try again.",

    // Smart Sell
    smart_sell_btn: "Easy Sell",
    smart_sell_title: "Easy Sell Calculator",
    smart_sell_sub: "Find the best mandi in your district to sell your crop today.",
    smart_sell_quantity: "Quantity to sell (Quintals)",
    smart_sell_quantity_ph: "e.g. 50",
    smart_sell_calc_btn: "Find Best Price",
    smart_sell_no_data: "No data available for this crop in your district today.",
    smart_sell_best_match: "Best Mandi Match",
    smart_sell_est_revenue: "Estimated Revenue",
    smart_sell_advice_wait: "Prediction says price will rise. Consider waiting if possible.",
    smart_sell_advice_sell: "Price is good or falling. Sell now.",
    smart_sell_share: "Share on WhatsApp",

    // Offline
    offline_banner: "You are offline — showing cached prices",
  },

  ta: {
    // Navbar
    home: "முகப்பு",
    admin: "நிர்வாகி",
    language: "மொழி",

    // Hero
    tagline: "தமிழ்நாடு மண்டி தகவல்",
    hero_heading: "நேரடி புதுப்பிப்புகளுடன் மண்டி விலைகள், நாளை என்ன ஆகும்?",
    hero_sub: "தமிழ்நாடு முழுவதும் பயிர் விலைகளை கண்காணியுங்கள். AI கணிப்புகளுடன் சிறந்த நேரத்தில் விற்க உதவும்.",
    explore_prices: "விலைகள் பார்",
    why_kisanrate: "கிசான்ரேட் ஏன்?",
    live_updates: "நேரடி புதுப்பிப்பு",
    whatsapp_alerts: "வாட்ஸாப் அலர்ட்",
    ai_signals: "AI விலை சமிக்ஞை",

    // Stats
    crops_tracked: "கண்காணிக்கப்படும் பயிர்கள்",
    mandis_covered: "மண்டிகள்",
    last_updated: "கடைசியாக புதுப்பிக்கப்பட்டது",

    // Filters
    filter_prices: "விலை வடிகட்டு",
    all_districts: "அனைத்து மாவட்டங்கள்",
    all_crops: "அனைத்து பயிர்கள்",

    // Price cards
    per_quintal: "/குவிண்டால்",
    min: "குறைந்தபட்சம்",
    max: "அதிகபட்சம்",
    predicted: "கணிக்கப்பட்டது",
    today_price: "இன்றைய மாதிரி விலை",
    prediction_label: "நாளை மதிப்பீடு",
    market_details: "மண்டி விவரம்",
    no_prediction: "கணிப்பு இன்னும் கிடைக்கவில்லை.",
    last_updated_label: "கடைசியாக புதுப்பிக்கப்பட்டது",
    tap_for_trend: "30 நாள் வரைபடம் பார்க்க அட்டையை தொடுங்கள்.",
    todays_prices: "இன்றைய விலைகள்",
    no_prices: "தேர்ந்தெடுத்த வடிகட்டிகளுக்கு விலைகள் இல்லை",

    // Sell advisor
    sell_now: "இப்போது விற்கலாம் ✓",
    hold: "சில நாட்கள் காத்திருங்கள் 📈",
    falling: "விலை குறைகிறது ↓",
    sell_advice_reason_up: "7 நாள் சராசரியை விட விலை அதிகம் — விரைவில் குறையும்",
    sell_advice_reason_hold: "விலை உயரும் என்று கணிக்கப்படுகிறது — முடிந்தால் காத்திருங்கள்",
    sell_advice_reason_fall: "விலை குறைகிறது — இப்போது விற்பது நல்லது",
    sell_advice_label: "விற்பனை ஆலோசனை",

    // Best mandi
    best_mandi_title: "சிறந்த மண்டி —",
    best_mandi_sub: "இன்றைய மாதிரி விலையின் படி தரவரிசை",
    best_price: "சிறந்த விலை",
    vs_others: "அடுத்ததை விட",
    no_mandi_data: "இன்று இந்த பயிருக்கு மண்டி தரவு இல்லை.",
    select_crop_hint: "இன்று சிறந்த விலை தரும் மண்டியை காண மேலே ஒரு பயிரை தேர்ந்தெடுங்கள்",

    // WhatsApp
    wa_heading: "தினமும் உங்கள் வாட்ஸாப்பில் மண்டி விலைகள் பெறுங்கள்.",
    wa_sub: "ஒருமுறை சந்தா செலுத்துங்கள். தினமும் காலையில் பயிர் விலை மற்றும் AI கணிப்புகள் பெறுங்கள்.",
    wa_eyebrow: "வாட்ஸாப் அலர்ட்",
    wa_form_title: "தினசரி விலை அலர்ட்டிற்கு சந்தா",
    wa_form_note: "Twilio WhatsApp sandbox-ல் சேர்ந்திருக்கிறீர்களா என்று உறுதிப்படுத்திக்கொள்ளுங்கள்.",
    wa_name: "பெயர் (விருப்பமானது)",
    wa_name_ph: "உங்கள் பெயர்",
    wa_phone: "வாட்ஸாப் எண் *",
    wa_phone_ph: "10 இலக்க எண்",
    wa_crop: "பயிர் *",
    wa_mandi: "மண்டி *",
    wa_select_crop: "பயிர் தேர்வு",
    wa_select_mandi: "மண்டி தேர்வு",
    wa_subscribe_btn: "வாட்ஸாப் மூலம் சந்தா",
    wa_subscribing: "சந்தா செய்கிறோம்…",
    wa_loading: "விருப்பங்கள் ஏற்றப்படுகின்றன…",
    wa_free: "இலவசம்",
    wa_chat_now: "வாட்ஸாப்பில் இப்போது பேசுங்கள்",
    wa_view_details: "விவரம் பார்",
    wa_quick_signup: "விரைவான வாட்ஸாப் பதிவு",
    wa_quick_desc: "கீழே உங்கள் பயிர் மற்றும் மாவட்டத்தை தேர்வு செய்யுங்கள் — வாட்ஸாப் தானாக திறக்கும். அனுப்பு அமை!",
    wa_select_district: "உங்கள் மாவட்டம் தேர்வு",
    wa_open_whatsapp: "வாட்ஸாப் திறக்கவும் (முன் நிரப்பிய)",

    // About
    why_heading: "கிசான்ரேட் ஏன்?",
    why_body: "கிசான்ரேட் விவசாயிகளுக்கு எந்த app பதிவிறக்கமும் இல்லாமல் நேரடி மண்டி விலைகளையும் குறுகிய கால கணிப்புகளையும் வழங்குகிறது. Agmarknet அதிகாரப்பூர்வ தரவு, நேரடி புதுப்பிப்புகள் மற்றும் வாட்ஸாப் அலர்ட்கள் மூலம் நம்பிக்கையுடன் விற்பனையை திட்டமிடலாம்.",

    // Report
    report_price: "தவறான விலையைத் தெரிவிக்கவும்",
    report_title: "தவறான விலையின் அறிக்கை",
    report_actual: "உண்மையான விலை என்ன? (ரூ/குவிண்டால்)",
    report_reason: "காரணம் (விருப்பப்பட்டால்)",
    report_reason_ph: "உதா. இன்று மண்டி விலை வேறுபட்டுள்ளது",
    report_submit: "அறிக்கையைச் சமர்ப்பி",
    report_submitting: "சமர்ப்பிக்கப்படுகிறது…",
    report_success: "நன்றி! உங்கள் அறிக்கை சமர்ப்பிக்கப்பட்டது.",
    report_error: "சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",

    // Smart Sell
    smart_sell_btn: "எளிதாக விற்க",
    smart_sell_title: "எளிதாக விற்க கால்குலேட்டர்",
    smart_sell_sub: "உங்கள் பயிரை விற்க மாவட்டத்தின் சிறந்த மண்டியை கண்டறியவும்.",
    smart_sell_quantity: "விற்க வேண்டிய அளவு (குவிண்டால்)",
    smart_sell_quantity_ph: "உதா. 50",
    smart_sell_calc_btn: "சிறந்த விலையைக் கண்டறி",
    smart_sell_no_data: "இன்று உங்கள் மாவட்டத்தில் இந்த பயிருக்கு தரவு இல்லை.",
    smart_sell_best_match: "சிறந்த மண்டி",
    smart_sell_est_revenue: "மதிப்பிடப்பட்ட வருமானம்",
    smart_sell_advice_wait: "விலை உயரும் என கணிப்பு கூறுகிறது. முடிந்தால் காத்திருக்கவும்.",
    smart_sell_advice_sell: "விலை நன்றாக உள்ளது அல்லது சரிகிறது. இப்போதே விற்கவும்.",
    smart_sell_share: "வாட்ஸ்அப்பில் பகிரவும்",

    // Offline
    offline_banner: "நீங்கள் ஆஃப்லைனில் உள்ளீர்கள் — சேமிக்கப்பட்ட விலைகள் காட்டப்படுகின்றன",
  },

};

// ── Context ───────────────────────────────────────────────────────────────────
const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("kisanrate_lang") || "en";
  });

  const setLang = useCallback((newLang) => {
    localStorage.setItem("kisanrate_lang", newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations["en"]?.[key] ?? key,
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within a LangProvider");
  return ctx;
};

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ta", label: "தமிழ்", flag: "🇮🇳" }
];
