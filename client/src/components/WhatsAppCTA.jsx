import { MessageCircle } from "lucide-react";

// Props: { loading?: boolean, error?: string | null }
const WhatsAppCTA = ({ loading = false, error = null }) => {
  if (loading) {
    return <div className="w-full h-48 bg-primary/20 animate-pulse" />;
  }

  if (error) {
    return (
      <div className="w-full py-10 text-center text-danger text-sm">{error}</div>
    );
  }

  return (
    <section className="w-full cta-surface py-16 px-6 text-center">
      <div className="max-w-4xl mx-auto">
        <svg
          width="80"
          height="80"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-4"
          aria-hidden="true"
        >
          <path
            d="M18 40C18 28 12 18 8 12"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M30 40C30 28 36 18 40 12"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M16 22C14 18 12 16 10 14"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M32 22C34 18 36 16 38 14"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <h2 className="font-display text-3xl md:text-4xl text-white font-bold">
          Get prices on WhatsApp
        </h2>
        <p className="text-white/80 mt-3 text-base md:text-lg">
          No app download needed. Just send a message and get instant mandi prices.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            className="bg-white text-primary font-semibold rounded-xl px-8 py-4 hover:bg-accent-light transition inline-flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} />
            Chat on WhatsApp
          </button>
          <div className="text-white/70 text-sm self-center">
            Send "HI" to +91-XXXXXXXXXX
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsAppCTA;
