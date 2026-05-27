import { Leaf } from "lucide-react";

// Props: { filters: { state: string, district: string, crop: string }, states: string[], districts: string[], crops: string[], onFilterChange: (nextFilters) => void, loading?: boolean, error?: string | null }
const FilterBar = ({
  filters,
  states,
  districts,
  crops,
  onFilterChange,
  loading = false,
  error = null
}) => {
  if (loading) {
    return (
      <div className="bg-white border-b border-border px-6 py-4 animate-pulse" />
    );
  }

  if (error) {
    return (
      <div className="bg-white border-b border-border px-6 py-4 text-danger text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="px-6 py-5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Leaf size={16} className="text-primary" />
          Filter prices
        </div>
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <select
            className="border border-border/70 rounded-xl px-4 py-3 bg-white/90 focus:ring-2 focus:ring-primary/30 focus:outline-none shadow-sm"
            value={filters.state}
            onChange={(event) =>
              onFilterChange({
                ...filters,
                state: event.target.value,
                district: ""
              })
            }
          >
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <select
            className="border border-border/70 rounded-xl px-4 py-3 bg-white/90 focus:ring-2 focus:ring-primary/30 focus:outline-none shadow-sm"
            value={filters.district}
            onChange={(event) =>
              onFilterChange({ ...filters, district: event.target.value })
            }
          >
            <option value="">All districts</option>
            {districts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
          <select
            className="border border-border/70 rounded-xl px-4 py-3 bg-white/90 focus:ring-2 focus:ring-primary/30 focus:outline-none shadow-sm"
            value={filters.crop}
            onChange={(event) =>
              onFilterChange({ ...filters, crop: event.target.value })
            }
          >
            <option value="">All crops</option>
            {crops.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
