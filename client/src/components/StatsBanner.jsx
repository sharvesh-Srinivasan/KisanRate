// Props: { stats: { crops: number, mandis: number, updatedAt: string }, loading?: boolean, error?: string | null }
const StatsBanner = ({ stats, loading = false, error = null }) => {
  if (loading) {
    return (
      <div className="w-full bg-primary-pale border-b border-border py-4 px-6 animate-pulse" />
    );
  }

  if (error) {
    return (
      <div className="w-full bg-primary-pale border-b border-border py-4 px-6 text-danger text-sm">
        {error}
      </div>
    );
  }

  return (
    <section className="w-full px-6 py-5">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 border border-border/60 rounded-2xl p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Crops tracked
          </div>
          <div className="font-display text-2xl text-primary font-bold mt-2">
            {Number(stats.crops || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="bg-white/80 border border-border/60 rounded-2xl p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Mandis covered
          </div>
          <div className="font-display text-2xl text-primary font-bold mt-2">
            {Number(stats.mandis || 0).toLocaleString("en-IN")}
          </div>
        </div>
        <div className="bg-white/80 border border-border/60 rounded-2xl p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Last updated
          </div>
          <div className="font-display text-2xl text-primary font-bold mt-2">
            {stats.updatedAt || "--"}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsBanner;
