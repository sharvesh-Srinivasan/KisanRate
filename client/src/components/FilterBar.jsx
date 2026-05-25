import { Leaf } from "lucide-react";

// Props: { filters: { state: string, district: string, crop: string }, districts: string[], crops: string[], onFilterChange: (nextFilters) => void, loading?: boolean, error?: string | null }
const FilterBar = ({
  filters,
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
    <div className="bg-white border-b border-border px-6 py-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Leaf size={16} className="text-primary" />
          Filter prices
        </div>
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <select
            className="border border-border rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-primary/30 focus:outline-none"
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
            className="border border-border rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-primary/30 focus:outline-none"
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
