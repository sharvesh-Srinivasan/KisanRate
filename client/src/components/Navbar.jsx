import { useState } from "react";
import { Menu, X } from "lucide-react";

// Props: { loading?: boolean, error?: string | null }
const Navbar = ({ loading = false, error = null }) => {
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="fixed top-0 inset-x-0 h-16 bg-white border-b border-border" />
    );
  }

  if (error) {
    return (
      <div className="fixed top-0 inset-x-0 h-16 bg-white border-b border-border flex items-center justify-center text-sm text-danger">
        {error}
      </div>
    );
  }

  return (
    <nav className="fixed top-0 inset-x-0 h-16 bg-white border-b border-border z-50">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <svg
            width="28"
            height="28"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M18 40C18 28 12 18 8 12"
              stroke="#3B6E2F"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M30 40C30 28 36 18 40 12"
              stroke="#3B6E2F"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 22C14 18 12 16 10 14"
              stroke="#3B6E2F"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M32 22C34 18 36 16 38 14"
              stroke="#3B6E2F"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-display text-soil text-xl font-bold">
            KisanRate
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-text-muted font-medium">
          <a className="hover:text-primary transition" href="#prices">
            Prices
          </a>
          <a className="hover:text-primary transition" href="#about">
            About
          </a>
          <a className="hover:text-primary transition" href="/login">
            Admin
          </a>
        </div>

        <button
          className="md:hidden text-text-main"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-border px-6 py-4 space-y-3 text-text-muted">
          <a className="block hover:text-primary transition" href="#prices">
            Prices
          </a>
          <a className="block hover:text-primary transition" href="#about">
            About
          </a>
          <a className="block hover:text-primary transition" href="/login">
            Admin
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
