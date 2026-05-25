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
    <section className="w-full bg-primary-pale border-b border-border py-4 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="font-display text-2xl text-primary font-bold">
            {Number(stats.crops || 0).toLocaleString("en-IN")}
          </div>
          <div className="text-sm text-text-muted">Total crops tracked</div>
        </div>
        <div>
          <div className="font-display text-2xl text-primary font-bold">
            {Number(stats.mandis || 0).toLocaleString("en-IN")}
          </div>
          <div className="text-sm text-text-muted">Total mandis covered</div>
        </div>
        <div>
          <div className="font-display text-2xl text-primary font-bold">
            {stats.updatedAt || "--"}
          </div>
          <div className="text-sm text-text-muted">Last updated</div>
        </div>
      </div>
    </section>
  );
};

export default StatsBanner;
