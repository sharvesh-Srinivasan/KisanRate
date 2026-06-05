import { MapPin, Leaf, X } from "lucide-react";
import { useLang } from "../i18n";

// Props: { filters, states, districts, crops, onFilterChange, loading, error }
const FilterBar = ({
  filters,
  states,
  districts,
  crops,
  onFilterChange,
  loading = false,
  error = null
}) => {
  const { t } = useLang();

  const hasActiveFilters = filters.district || filters.crop;

  const clearFilters = () => {
    onFilterChange({ ...filters, district: "", crop: "" });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="filter-bar-skeleton" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-3 text-danger text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-4">
      <div className="filter-bar-card">
        {/* Left: label */}
        <div className="filter-bar-label">
          <div className="filter-icon-dot">
            <Leaf size={14} />
          </div>
          <span>{t("filter_prices")}</span>
        </div>

        {/* Divider */}
        <div className="filter-bar-sep" />

        {/* Selects */}
        <div className="filter-selects-row">
          {/* State select */}
          <div className="filter-select-wrap">
            <span className="filter-select-icon">
              <MapPin size={13} />
            </span>
            <select
              id="filter-state"
              className="filter-select"
              value={filters.state}
              onChange={(e) =>
                onFilterChange({ ...filters, state: e.target.value, district: "" })
              }
              aria-label="State"
            >
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="filter-chevron">▾</span>
          </div>

          {/* District select */}
          <div className="filter-select-wrap">
            <span className="filter-select-icon">📍</span>
            <select
              id="filter-district"
              className="filter-select"
              value={filters.district}
              onChange={(e) =>
                onFilterChange({ ...filters, district: e.target.value })
              }
              aria-label="District"
            >
              <option value="">{t("all_districts")}</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span className="filter-chevron">▾</span>
          </div>

          {/* Crop select */}
          <div className="filter-select-wrap filter-select-wrap--highlight">
            <span className="filter-select-icon">🌾</span>
            <select
              id="filter-crop"
              className="filter-select filter-select--crop"
              value={filters.crop}
              onChange={(e) =>
                onFilterChange({ ...filters, crop: e.target.value })
              }
              aria-label="Crop"
            >
              <option value="">{t("all_crops")}</option>
              {crops.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="filter-chevron">▾</span>
          </div>
        </div>

        {/* Clear button — only when filters active */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="filter-clear-btn"
            aria-label="Clear filters"
          >
            <X size={13} />
            Clear
          </button>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="filter-chips-row">
            {filters.district && (
              <span className="filter-chip">
                📍 {filters.district}
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filters, district: "" })}
                  className="filter-chip-x"
                  aria-label={`Remove ${filters.district} filter`}
                >
                  ×
                </button>
              </span>
            )}
            {filters.crop && (
              <span className="filter-chip filter-chip--green">
                🌾 {filters.crop}
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filters, crop: "" })}
                  className="filter-chip-x"
                  aria-label={`Remove ${filters.crop} filter`}
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
