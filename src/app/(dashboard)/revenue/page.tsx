export default function RevenuePage() {
  const revenueData = [
    { date: "Mar 1", revenue: 4200 },
    { date: "Mar 5", revenue: 0 },
    { date: "Mar 8", revenue: 8500 },
    { date: "Mar 12", revenue: 3200 },
    { date: "Mar 15", revenue: 12000 },
    { date: "Mar 18", revenue: 0 },
    { date: "Mar 22", revenue: 5400 },
    { date: "Mar 25", revenue: 9800 },
    { date: "Mar 28", revenue: 15000 },
    { date: "Apr 1", revenue: 7200 },
    { date: "Apr 4", revenue: 11500 },
  ];

  const deals = [
    { contact: "Sarah Mitchell", email: "sarah@acme.co", funnel: "VSL High-Ticket", amount: 8500, date: "Apr 4, 2026" },
    { contact: "James Rodriguez", email: "james@techstart.io", funnel: "Discovery Call Booking", amount: 3200, date: "Apr 3, 2026" },
    { contact: "Emily Chen", email: "emily@growthco.com", funnel: "Webinar Ops Accelerator", amount: 12000, date: "Mar 28, 2026" },
    { contact: "Michael Brown", email: "michael@scale.dev", funnel: "VSL High-Ticket", amount: 15000, date: "Mar 25, 2026" },
    { contact: "Lisa Park", email: "lisa@brandhaus.co", funnel: "Discovery Call Booking", amount: 5400, date: "Mar 22, 2026" },
  ];

  const funnelRevenue = [
    { name: "VSL High-Ticket", revenue: 38500, deals: 4, pct: 42 },
    { name: "Discovery Call Booking", revenue: 24800, deals: 6, pct: 27 },
    { name: "Webinar Ops Accelerator", revenue: 18200, deals: 3, pct: 20 },
    { name: "Free Audit Lead Magnet", revenue: 9800, deals: 8, pct: 11 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Revenue</h1>
      <p className="text-slate-400 mb-6">Track revenue, ROAS, and deal performance across all funnels.</p>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: "$91,300", change: "+18.2%", positive: true },
          { label: "Avg Deal Size", value: "$4,348", change: "+5.1%", positive: true },
          { label: "Total Deals", value: "21", change: "+3", positive: true },
          { label: "Est. CAC", value: "$127", change: "-12%", positive: true },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{kpi.label}</p>
            <p className="text-3xl font-bold text-white mt-1">{kpi.value}</p>
            <p className={`text-sm mt-1 ${kpi.positive ? "text-green-400" : "text-red-400"}`}>
              {kpi.change} vs last period
            </p>
          </div>
        ))}
      </div>

      {/* Revenue by Funnel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Revenue by Funnel</h2>
        <div className="space-y-4">
          {funnelRevenue.map((f) => (
            <div key={f.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-300">{f.name}</span>
                <span className="text-sm font-medium text-white">${f.revenue.toLocaleString()} ({f.deals} deals)</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${f.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Closed Deals Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Closed Deals</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-sm font-medium text-slate-400 pb-3">Contact</th>
                <th className="text-left text-sm font-medium text-slate-400 pb-3">Funnel</th>
                <th className="text-right text-sm font-medium text-slate-400 pb-3">Amount</th>
                <th className="text-right text-sm font-medium text-slate-400 pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-3">
                    <p className="text-sm font-medium text-white">{deal.contact}</p>
                    <p className="text-xs text-slate-500">{deal.email}</p>
                  </td>
                  <td className="py-3 text-sm text-slate-300">{deal.funnel}</td>
                  <td className="py-3 text-sm text-white text-right font-medium">${deal.amount.toLocaleString()}</td>
                  <td className="py-3 text-sm text-slate-400 text-right">{deal.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
