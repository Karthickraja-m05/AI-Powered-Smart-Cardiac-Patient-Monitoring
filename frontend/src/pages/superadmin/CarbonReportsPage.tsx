import { useState } from 'react';
import { motion } from 'framer-motion';

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const MONTHLY_DATA = [
  { month: 'Jan', savings: 820, energy: 4200, solar: 1800 },
  { month: 'Feb', savings: 940, energy: 3900, solar: 2100 },
  { month: 'Mar', savings: 1100, energy: 4100, solar: 2400 },
  { month: 'Apr', savings: 1250, energy: 3800, solar: 2700 },
  { month: 'May', savings: 1380, energy: 3600, solar: 2900 },
  { month: 'Jun', savings: 1520, energy: 3500, solar: 3100 },
  { month: 'Jul', savings: 1450, energy: 3700, solar: 2800 },
  { month: 'Aug', savings: 1600, energy: 3400, solar: 3200 },
  { month: 'Sep', savings: 1350, energy: 3900, solar: 2600 },
  { month: 'Oct', savings: 1200, energy: 4000, solar: 2300 },
  { month: 'Nov', savings: 1050, energy: 4100, solar: 2000 },
  { month: 'Dec', savings: 900, energy: 4300, solar: 1700 },
];

const HOSPITALS_GREEN = [
  { name: 'CardioSense Central', city: 'Chennai', monthly_savings: 1250, solar: true, green_rating: 'A', efficiency: 92 },
  { name: 'Apollo Cardiac Center', city: 'Bangalore', monthly_savings: 2100, solar: true, green_rating: 'A+', efficiency: 96 },
  { name: 'Fortis Cardiac Wing', city: 'Mumbai', monthly_savings: 3100, solar: true, green_rating: 'A', efficiency: 89 },
  { name: 'HeartCare Specialty', city: 'Coimbatore', monthly_savings: 820, solar: true, green_rating: 'B+', efficiency: 78 },
  { name: 'Metro Heart Institute', city: 'Hyderabad', monthly_savings: 690, solar: false, green_rating: 'B', efficiency: 72 },
  { name: 'Sunrise Medical Center', city: 'Madurai', monthly_savings: 340, solar: false, green_rating: 'C+', efficiency: 61 },
];

const ENERGY_BREAKDOWN = [
  { label: 'HVAC Systems', value: 34, icon: '❄️', color: 'bg-cyan-500', text: 'text-cyan-400' },
  { label: 'Medical Equipment', value: 28, icon: '🏥', color: 'bg-blue-500', text: 'text-blue-400' },
  { label: 'Lighting', value: 16, icon: '💡', color: 'bg-amber-500', text: 'text-amber-400' },
  { label: 'IT Infrastructure', value: 12, icon: '🖥️', color: 'bg-violet-500', text: 'text-violet-400' },
  { label: 'Other', value: 10, icon: '⚡', color: 'bg-slate-500', text: 'text-slate-400' },
];

const GREEN_INITIATIVES = [
  { date: 'Aug 2026', title: 'Solar Panel Phase III Installed', desc: 'Added 120 panels at CardioSense Central', icon: '☀️' },
  { date: 'Jul 2026', title: 'LED Retrofit Complete', desc: '100% LED lighting across all floors', icon: '💡' },
  { date: 'Jun 2026', title: 'Smart HVAC Deployed', desc: 'AI-driven climate control reduces energy by 22%', icon: '❄️' },
  { date: 'May 2026', title: 'Carbon Neutral Target Set', desc: 'Goal: Net zero by 2030', icon: '🌱' },
  { date: 'Mar 2026', title: 'IoT Energy Monitors Active', desc: '12 real-time energy monitoring devices deployed', icon: '📊' },
];

export default function CarbonReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const totalSavings = MONTHLY_DATA.reduce((a, m) => a + m.savings, 0);
  const totalSolar = MONTHLY_DATA.reduce((a, m) => a + m.solar, 0);
  const maxSavings = Math.max(...MONTHLY_DATA.map(m => m.savings));
  const greenScore = 'A';
  const efficiencyPct = 86;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div {...fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-lime-400">🌱</span> Carbon & Sustainability Reports
          </h1>
          <p className="text-slate-400 text-sm mt-1">Environmental impact analytics and green initiative tracking</p>
        </div>
        <div className="flex gap-2">
          {(['monthly', 'quarterly', 'yearly'] as const).map(p => (
            <button key={p} onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer capitalize transition-all ${
                selectedPeriod === p ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30' : 'bg-surface-800/40 text-slate-400 border border-white/[0.06] hover:text-white'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Hero Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Carbon Saved', value: `${(totalSavings / 1000).toFixed(1)}t`, sub: 'CO₂ this year', icon: '🍃', gradient: 'from-lime-500 to-green-600', bg: 'bg-lime-500/10', border: 'border-lime-500/20' },
          { label: 'Solar Output', value: `${(totalSolar / 1000).toFixed(1)} MWh`, sub: 'generated this year', icon: '☀️', gradient: 'from-amber-500 to-yellow-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Green Score', value: greenScore, sub: 'network-wide rating', icon: '🏆', gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Energy Efficiency', value: `${efficiencyPct}%`, sub: 'operational efficiency', icon: '⚡', gradient: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${kpi.bg} border ${kpi.border} rounded-2xl p-5 relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${kpi.gradient} blur-2xl`} />
            </div>
            <span className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center text-lg shadow-lg mb-3`}>{kpi.icon}</span>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-[11px] text-slate-500 mt-1">{kpi.label}</p>
            <p className="text-[10px] text-slate-600">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Monthly Trend Chart (CSS-based bar chart) ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-lime-500" /> Monthly Carbon Savings Trend
          </h3>
          <span className="text-xs text-slate-500">kg CO₂ saved per month</span>
        </div>
        <div className="flex items-end gap-2 h-48">
          {MONTHLY_DATA.map((m, i) => (
            <motion.div
              key={m.month}
              initial={{ height: 0 }}
              animate={{ height: `${(m.savings / maxSavings) * 100}%` }}
              transition={{ delay: 0.3 + i * 0.04, duration: 0.5, ease: 'easeOut' }}
              className="flex-1 group relative"
            >
              <div className="w-full h-full rounded-t-lg bg-gradient-to-t from-lime-600 to-lime-400 opacity-80 group-hover:opacity-100 transition-opacity relative">
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-surface-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-lime-400 font-semibold whitespace-nowrap z-10 shadow-lg">
                  {m.savings} kg
                </div>
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-2">{m.month}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Energy Breakdown + Green Initiatives ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Energy Breakdown */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-cyan-500" /> Energy Consumption Breakdown
          </h3>
          <div className="space-y-4">
            {ENERGY_BREAKDOWN.map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span>{item.icon}</span>
                    {item.label}
                  </span>
                  <span className={`font-semibold ${item.text}`}>{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Stacked bar */}
          <div className="mt-5 h-4 rounded-full bg-white/5 overflow-hidden flex">
            {ENERGY_BREAKDOWN.map(item => (
              <motion.div key={item.label}
                initial={{ width: 0 }}
                animate={{ width: `${item.value}%` }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className={`${item.color} transition-all`}
              />
            ))}
          </div>
        </motion.div>

        {/* Green Initiatives Timeline */}
        <motion.div {...fadeIn} transition={{ delay: 0.35 }} className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-emerald-500" /> Green Initiatives Timeline
          </h3>
          <div className="space-y-0">
            {GREEN_INITIATIVES.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                className="flex gap-4 relative"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-sm flex-shrink-0">
                    {item.icon}
                  </div>
                  {i < GREEN_INITIATIVES.length - 1 && <div className="w-px h-full bg-emerald-500/20 my-1" />}
                </div>
                <div className="pb-5">
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">{item.date}</p>
                  <p className="text-sm text-white font-medium mt-0.5">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Hospital-wise Sustainability Table ── */}
      <motion.div {...fadeIn} transition={{ delay: 0.4 }} className="bg-surface-800/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-lime-500" /> Hospital Sustainability Scorecard
          </h3>
        </div>
        <div className="grid grid-cols-[1fr_100px_120px_80px_100px_100px] gap-3 px-5 py-3 border-b border-white/[0.06] text-xs text-slate-500 uppercase tracking-wider font-semibold">
          <span>Hospital</span>
          <span>City</span>
          <span className="text-center">Monthly Savings</span>
          <span className="text-center">Solar</span>
          <span className="text-center">Green Rating</span>
          <span className="text-center">Efficiency</span>
        </div>
        {HOSPITALS_GREEN.map((h, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 + i * 0.03 }}
            className="grid grid-cols-[1fr_100px_120px_80px_100px_100px] gap-3 px-5 py-3.5 items-center border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors"
          >
            <p className="text-sm text-white font-medium">{h.name}</p>
            <p className="text-sm text-slate-400">{h.city}</p>
            <p className="text-sm text-lime-400 font-semibold text-center">{h.monthly_savings.toLocaleString()} kg</p>
            <div className="text-center">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${h.solar ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'}`}>
                {h.solar ? '☀️ Active' : '— None'}
              </span>
            </div>
            <div className="text-center">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                h.green_rating.startsWith('A') ? 'bg-emerald-500/15 text-emerald-400' :
                h.green_rating.startsWith('B') ? 'bg-amber-500/15 text-amber-400' :
                'bg-orange-500/15 text-orange-400'
              }`}>{h.green_rating}</span>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${h.efficiency >= 85 ? 'bg-emerald-500' : h.efficiency >= 70 ? 'bg-amber-500' : 'bg-orange-500'}`} style={{ width: `${h.efficiency}%` }} />
                </div>
                <span className="text-xs text-slate-300 font-medium">{h.efficiency}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
