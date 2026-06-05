import { useState, useRef, useEffect } from "react";
import { Menu, X, Globe } from "lucide-react";
import { useLang, LANGUAGES } from "../i18n";

const WA_ICON = (
  <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M19.11 17.2c-.3-.15-1.77-.87-2.05-.97-.28-.1-.49-.15-.7.15-.2.3-.8.97-.98 1.17-.18.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.7-1.67-.96-2.3-.25-.6-.5-.52-.7-.53h-.6c-.2 0-.53.08-.8.38-.28.3-1.05 1.02-1.05 2.5 0 1.48 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.5 1.7.64.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.12-.28-.2-.58-.35m-3.1-9.4a7.5 7.5 0 00-6.46 11.3l-1 3.66 3.74-.98a7.5 7.5 0 003.72.98h.01a7.5 7.5 0 000-15m0 13.6h-.01a6.2 6.2 0 01-3.16-.87l-.23-.13-2.21.58.59-2.15-.15-.22a6.2 6.2 0 014.19-9.9 6.2 6.2 0 010 12.4m0-14.5a8.5 8.5 0 00-7.3 12.9L7.5 25.5l5.85-1.54a8.5 8.5 0 004.66 1.35h.01a8.5 8.5 0 000-17" />
  </svg>
);

// Props: { loading?: boolean, error?: string | null }
const Navbar = ({ loading = false, error = null }) => {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const desktopLangRef = useRef(null);
  const mobileLangRef = useRef(null);
  const { lang, setLang, t } = useLang();

  // Close lang dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        (desktopLangRef.current && desktopLangRef.current.contains(e.target)) ||
        (mobileLangRef.current && mobileLangRef.current.contains(e.target))
      ) {
        return;
      }
      setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) {
    return <div className="fixed top-0 inset-x-0 h-16 bg-white border-b border-border" />;
  }

  if (error) {
    return (
      <div className="fixed top-0 inset-x-0 h-16 bg-white border-b border-border flex items-center justify-center text-sm text-danger">
        {error}
      </div>
    );
  }

  const makeWaLink = (number, text = "HI") => {
    if (!number) return "";
    const digits = String(number).replace(/\D/g, "");
    const stripped = digits.startsWith("+") ? digits.slice(1) : digits;
    const encoded = encodeURIComponent(text);
    return `https://wa.me/${stripped}?text=${encoded}`;
  };

  const waUrl = makeWaLink(
    process.env.REACT_APP_WHATSAPP_SANDBOX_NUMBER || "+14155238886",
    "HI"
  );

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <nav className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur border-b border-border/70 z-50">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M18 40C18 28 12 18 8 12" stroke="#3B6E2F" strokeWidth="2" strokeLinecap="round" />
            <path d="M30 40C30 28 36 18 40 12" stroke="#3B6E2F" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 22C14 18 12 16 10 14" stroke="#3B6E2F" strokeWidth="2" strokeLinecap="round" />
            <path d="M32 22C34 18 36 16 38 14" stroke="#3B6E2F" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-display text-soil text-xl font-bold">KisanRate</span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-text-muted font-medium">
          <a className="hover:text-primary transition" href="#prices">{t("home")}</a>
          <a className="hover:text-primary transition" href="#about">{t("why_kisanrate")}</a>
          <a className="hover:text-primary transition" href="/login">{t("admin")}</a>
          <a className="hover:text-primary transition" href="#whatsapp">WhatsApp</a>

          {/* ── Language Toggle ── */}
          <div className="relative" ref={desktopLangRef}>
            <button
              type="button"
              onClick={() => setLangOpen((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/70 bg-white/80 hover:bg-white text-text-muted hover:text-primary transition text-sm font-medium"
              aria-label={t("language")}
            >
              <Globe size={14} />
              <span>{currentLang.flag} {currentLang.label}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-border/70 rounded-xl shadow-lg py-1 w-40 z-50">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-accent-light transition flex items-center gap-2 ${lang === l.code ? "text-primary font-semibold" : "text-text-muted"}`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                    {lang === l.code && <span className="ml-auto text-primary">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-2 inline-flex items-center gap-2 bg-green-600/90 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-card transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
            aria-label="Chat on WhatsApp"
          >
            {WA_ICON}
            WhatsApp
          </a>
        </div>

        <div className="flex md:hidden items-center gap-3">
          {/* Mobile language toggle */}
          <div className="relative" ref={mobileLangRef}>
            <button
              type="button"
              onClick={() => setLangOpen((p) => !p)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border/70 text-text-muted text-sm"
            >
              <Globe size={13} />
              <span>{currentLang.flag}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-border/70 rounded-xl shadow-lg py-1 w-36 z-50">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-accent-light transition flex items-center gap-2 ${lang === l.code ? "text-primary font-semibold" : "text-text-muted"}`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="text-text-main"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white/90 backdrop-blur border-t border-border/70 px-6 py-4 space-y-3 text-text-muted">
          <a className="block hover:text-primary transition" href="#prices">{t("home")}</a>
          <a className="block hover:text-primary transition" href="#about">{t("why_kisanrate")}</a>
          <a className="block hover:text-primary transition" href="/login">{t("admin")}</a>
          <a className="block hover:text-primary transition" href="#whatsapp">WhatsApp</a>
          <a className="block mt-2" href={waUrl} target="_blank" rel="noreferrer noopener">
            <div className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-semibold">
              {WA_ICON}
              WhatsApp updates
            </div>
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
