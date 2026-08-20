import React, { useState, useEffect } from 'react';
import {
  Brain, TrendingUp, Sliders, ArrowRightLeft, ShieldCheck, HeartPulse,
  Activity, AlertTriangle, CheckCircle2, ChevronRight, RefreshCw, Zap,
  UserCheck, Shield, Sparkles, Clock, LineChart as ChartIcon, FileText
} from 'lucide-react';
import { intelligenceAPI } from '../../services/api';
import type {
  PatientBaselineData, RiskForecastData, CounterfactualData,
  SmartTransferRecommendation, PostDischargeData, PrivacyAuditSummary
} from '../../types';
import toast from 'react-hot-toast';

interface ClinicalIntelligenceHubProps {
  patientId: number;
  initialFeatures?: Record<string, number>;
  onClose?: () => void;
}

export default function ClinicalIntelligenceHub({
  patientId,
  initialFeatures,
  onClose
}: ClinicalIntelligenceHubProps) {
  const [activeTab, setActiveTab] = useState<'baseline' | 'forecast' | 'counterfactual' | 'transfer' | 'postdischarge' | 'privacy'>('baseline');
  const [loading, setLoading] = useState(true);

  // Data states
  const [baselineData, setBaselineData] = useState<PatientBaselineData | null>(null);
  const [forecastData, setForecastData] = useState<RiskForecastData | null>(null);
  const [counterfactualData, setCounterfactualData] = useState<CounterfactualData | null>(null);
  const [transferData, setTransferData] = useState<SmartTransferRecommendation | null>(null);
  const [postDischargeData, setPostDischargeData] = useState<PostDischargeData | null>(null);
  const [privacyData, setPrivacyData] = useState<PrivacyAuditSummary | null>(null);

  // What-If Simulation interactive sliders
  const [simFeatures, setSimFeatures] = useState<Record<string, number>>(initialFeatures || {
    age: 62, sex: 1, cp: 2, trestbps: 155, chol: 260, fbs: 1,
    restecg: 1, thalach: 120, exang: 1, oldpeak: 2.2, slope: 1, ca: 1, thal: 2
  });
  const [simResult, setSimResult] = useState<{
    simulated_probability: number;
    simulated_risk_percentage: number;
    simulated_risk_level: string;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);

  const fetchAllIntelligence = async () => {
    setLoading(true);
    try {
      const [bRes, fRes, tRes, pRes, privRes] = await Promise.allSettled([
        intelligenceAPI.getBaseline(patientId),
        intelligenceAPI.getForecast(patientId),
        intelligenceAPI.getTransferRecommendation(patientId),
        intelligenceAPI.getPostDischarge(patientId),
        intelligenceAPI.getPrivacySummary(),
      ]);

      if (bRes.status === 'fulfilled') setBaselineData(bRes.value.data);
      if (fRes.status === 'fulfilled') setForecastData(fRes.value.data);
      if (tRes.status === 'fulfilled') setTransferData(tRes.value.data);
      if (pRes.status === 'fulfilled') setPostDischargeData(pRes.value.data);
      if (privRes.status === 'fulfilled') setPrivacyData(privRes.value.data);

      // Counterfactuals
      try {
        const cfRes = await intelligenceAPI.getCounterfactuals(simFeatures);
        setCounterfactualData(cfRes.data);
      } catch (err) {
        console.error("Counterfactual fetch error:", err);
      }

    } catch (error) {
      console.error("Error loading intelligence data:", error);
      toast.error("Failed to load some clinical intelligence metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllIntelligence();
  }, [patientId]);

  const handleSliderChange = async (key: string, value: number) => {
    const updated = { ...simFeatures, [key]: value };
    setSimFeatures(updated);
    setSimulating(true);
    try {
      const res = await intelligenceAPI.runWhatIf(updated);
      setSimResult(res.data);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'ELEVATED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="bg-surface-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 rounded-xl text-cyan-400">
            <Brain className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Clinical Decision Intelligence Hub</h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                AI Intelligence v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized baseline learning, forward risk forecasting, counterfactual explainability, and smart triage
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAllIntelligence}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium bg-surface-800 hover:bg-surface-700 border border-white/10 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate Models</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'baseline', label: '1. Baseline Learning (Z-Score)', icon: HeartPulse },
          { id: 'forecast', label: '2. 15-Min Forward Forecast', icon: TrendingUp },
          { id: 'counterfactual', label: '3. Counterfactual XAI ("What-If")', icon: Sliders },
          { id: 'transfer', label: '4. Smart Transfer Recommender', icon: ArrowRightLeft },
          { id: 'postdischarge', label: '5. Post-Discharge Intelligence', icon: Clock },
          { id: 'privacy', label: '6. On-Premise Privacy Shield', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/30 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'bg-surface-800/60 text-slate-400 hover:text-slate-200 hover:bg-surface-800 border border-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Personalized Baseline Learning ── */}
      {activeTab === 'baseline' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-cyan-950/40 to-surface-800/80 border border-cyan-500/20 rounded-xl p-4 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-cyan-200">Personalized Adaptive Baseline vs. Static Hospital Thresholds</p>
              <p className="text-slate-300 leading-relaxed">
                Rather than treating all patients with rigid generic thresholds (e.g. HR &gt; 100 bpm), CardioSense AI continuously learns this individual patient's unique hemodynamic baseline (Z-score distribution). Anomalies are flagged dynamically when vitals deviate by &gt; 1.5 standard deviations from their personal moving average.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">Calculating personalized baseline metrics...</div>
          ) : baselineData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(baselineData.baselines).map(([param, metric]) => {
                const dev = baselineData.current_deviations[param];
                const isAnomaly = dev && dev.status !== 'NORMAL';
                return (
                  <div
                    key={param}
                    className={`p-4 rounded-xl border transition-all ${
                      isAnomaly
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-surface-800/80 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="uppercase font-semibold tracking-wider text-slate-300">
                        {param.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isAnomaly ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {dev ? dev.status : 'LEARNED'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-black text-white">
                          {dev ? dev.current_value : metric.baseline_mean}
                          <span className="text-xs font-normal text-slate-400 ml-1">{metric.unit}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Personal Baseline: <span className="text-slate-200 font-semibold">{metric.baseline_mean} ± {metric.baseline_std}</span>
                        </div>
                      </div>
                      {dev && (
                        <div className="text-right">
                          <div className={`text-sm font-bold ${dev.z_score >= 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                            Z = {dev.z_score >= 0 ? `+${dev.z_score}` : dev.z_score}σ
                          </div>
                          <div className="text-[10px] text-slate-400">Deviation</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Accepted Range:</span>
                      <span className="text-slate-200">{metric.normal_range_low} – {metric.normal_range_high} {metric.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No baseline data recorded yet for this patient.</div>
          )}
        </div>
      )}

      {/* ── Tab 2: Forward Risk Trend Forecasting ── */}
      {activeTab === 'forecast' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-blue-950/40 to-surface-800/80 border border-blue-500/20 rounded-xl p-4 flex items-start space-x-3">
            <TrendingUp className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-blue-200">Proactive Trajectory Forecasting (5 - 15 Minutes Forward Outlook)</p>
              <p className="text-slate-300 leading-relaxed">
                Rather than evaluating static historical snapshots, this forward-looking predictive layer computes vital rate of change d(vital)/dt to forecast where the patient will be in the next 15 minutes. This gives clinical teams crucial minutes to intervene before severe deterioration occurs.
              </p>
            </div>
          </div>

          {forecastData?.early_warning && (
            <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
              forecastData.trend_velocity === 'RAPIDLY_WORSENING'
                ? 'bg-red-500/15 border-red-500/40 text-red-200'
                : 'bg-blue-500/15 border-blue-500/40 text-blue-200'
            }`}>
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <p className="text-xs font-medium">{forecastData.early_warning}</p>
            </div>
          )}

          {forecastData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Projected Risk Gauge */}
              <div className="bg-surface-800/90 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">15-Minute Projected Risk</div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-4xl font-black text-white">
                      {forecastData.projected_risk_percentage_15m}%
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      forecastData.risk_trajectory_delta > 0
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {forecastData.risk_trajectory_delta > 0 ? `+${forecastData.risk_trajectory_delta}%` : `${forecastData.risk_trajectory_delta}%`}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Current Risk: <span className="text-slate-200 font-semibold">{forecastData.current_risk_percentage}%</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="text-xs text-slate-400">Trend Dynamic:</div>
                  <div className="text-sm font-bold text-cyan-300 mt-0.5">{forecastData.trend_velocity.replace('_', ' ')}</div>
                </div>
              </div>

              {/* Individual Biomarker Trajectories */}
              <div className="lg:col-span-2 bg-surface-800/90 border border-white/10 rounded-xl p-5 space-y-3">
                <div className="text-xs text-slate-400 uppercase font-semibold">Hemodynamic Trajectory Slopes</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(forecastData.trajectories).map(([key, t]) => (
                    <div key={key} className="bg-surface-900/80 p-3 rounded-lg border border-white/5">
                      <div className="flex justify-between text-xs text-slate-300 font-medium">
                        <span>{key.replace('_', ' ').toUpperCase()}</span>
                        <span className={`font-bold ${t.slope_per_min > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                          {t.slope_per_min > 0 ? `+${t.slope_per_min}` : t.slope_per_min}/min
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 mt-2 text-center text-[10px]">
                        <div className="bg-white/5 p-1 rounded">
                          <div className="text-slate-400">Now</div>
                          <div className="font-bold text-white mt-0.5">{t.current}</div>
                        </div>
                        <div className="bg-white/5 p-1 rounded">
                          <div className="text-slate-400">+5m</div>
                          <div className="font-bold text-slate-200 mt-0.5">{t.forecast_5m}</div>
                        </div>
                        <div className="bg-white/5 p-1 rounded">
                          <div className="text-slate-400">+10m</div>
                          <div className="font-bold text-slate-200 mt-0.5">{t.forecast_10m}</div>
                        </div>
                        <div className="bg-cyan-500/10 border border-cyan-500/30 p-1 rounded">
                          <div className="text-cyan-400 font-semibold">+15m</div>
                          <div className="font-bold text-cyan-200 mt-0.5">{t.forecast_15m}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Counterfactual Explainable AI & What-If Simulator ── */}
      {activeTab === 'counterfactual' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-emerald-950/40 to-surface-800/80 border border-emerald-500/20 rounded-xl p-4 flex items-start space-x-3">
            <Sliders className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-emerald-200">Actionable Counterfactual Explainability ("What Would Reduce the Risk?")</p>
              <p className="text-slate-300 leading-relaxed">
                Standard XAI (SHAP) tells you what factors increased the risk. Counterfactual XAI tells the clinician exactly what therapeutic modifications will decrease the risk to a safe tier. Use the interactive simulator below to test custom clinical intervention scenarios in real-time.
              </p>
            </div>
          </div>

          {/* Ranked Actionable Interventions */}
          {counterfactualData && (
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Ranked Clinical Levers & Projected Impact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {counterfactualData.counterfactual_actions.map((act, idx) => (
                  <div key={idx} className="bg-surface-800/90 border border-white/10 rounded-xl p-4 space-y-2 hover:border-emerald-500/40 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{act.display_name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        -{act.risk_reduction_percentage}% Risk
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{act.action_statement}</p>
                    <div className="text-[11px] text-slate-400 pt-1 flex justify-between">
                      <span>Target: {act.target_value} {act.unit}</span>
                      <span className="font-semibold text-cyan-300">New Tier: {act.projected_risk_level.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comprehensive Bundle */}
              <div className="bg-gradient-to-r from-emerald-900/30 to-surface-800 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-300 uppercase">Target Combined Intervention Bundle</div>
                  <p className="text-xs text-slate-200 mt-0.5">{counterfactualData.comprehensive_bundle.summary}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-2xl font-black text-emerald-400">-{counterfactualData.comprehensive_bundle.total_possible_risk_reduction}%</div>
                  <div className="text-[10px] text-slate-400">Max Reduction</div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive What-If Simulator */}
          <div className="bg-surface-800/90 border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-bold text-cyan-300 tracking-wider flex items-center space-x-2">
                <Sliders className="w-4 h-4" />
                <span>Interactive Clinical "What-If" Simulator</span>
              </h3>
              {simResult && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Simulated Risk:</span>
                  <span className="text-sm font-bold text-cyan-400">{simResult.simulated_risk_percentage}%</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                    {simResult.simulated_risk_level.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs text-slate-300 flex justify-between">
                  <span>Resting Blood Pressure:</span>
                  <span className="font-bold text-cyan-300">{simFeatures.trestbps} mmHg</span>
                </label>
                <input
                  type="range"
                  min="90"
                  max="200"
                  value={simFeatures.trestbps}
                  onChange={(e) => handleSliderChange('trestbps', parseFloat(e.target.value))}
                  className="w-full mt-2 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 flex justify-between">
                  <span>Serum Cholesterol:</span>
                  <span className="font-bold text-cyan-300">{simFeatures.chol} mg/dL</span>
                </label>
                <input
                  type="range"
                  min="130"
                  max="400"
                  value={simFeatures.chol}
                  onChange={(e) => handleSliderChange('chol', parseFloat(e.target.value))}
                  className="w-full mt-2 accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 flex justify-between">
                  <span>Max Heart Rate (Fitness):</span>
                  <span className="font-bold text-cyan-300">{simFeatures.thalach} bpm</span>
                </label>
                <input
                  type="range"
                  min="70"
                  max="200"
                  value={simFeatures.thalach}
                  onChange={(e) => handleSliderChange('thalach', parseFloat(e.target.value))}
                  className="w-full mt-2 accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Smart Patient Transfer Recommendation ── */}
      {activeTab === 'transfer' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-amber-950/40 to-surface-800/80 border border-amber-500/20 rounded-xl p-4 flex items-start space-x-3">
            <ArrowRightLeft className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-200">Intelligent Escalation & Patient Transfer Decision Support</p>
              <p className="text-slate-300 leading-relaxed">
                Synthesizes current risk, 15-minute forward trend velocity, baseline instability, and doctor availability to recommend the optimal next clinical step: Maintain in Ward, Urgent Doctor Review, Escalate to Cardiology, or Transfer to ICU.
              </p>
            </div>
          </div>

          {transferData ? (
            <div className="bg-surface-800/90 border border-white/10 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-400">Recommended Action:</span>
                  <div className="text-xl font-bold text-white mt-1 flex items-center space-x-2">
                    <span>{transferData.recommended_action.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getUrgencyColor(transferData.urgency_level)}`}>
                    Urgency: {transferData.urgency_level}
                  </span>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Target: {transferData.target_department}
                  </span>
                </div>
              </div>

              <div className="bg-surface-900/80 p-4 rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-white">Clinical Rationale: </span>
                {transferData.clinical_rationale}
              </div>

              {transferData.suggested_attending_doctor && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserCheck className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-xs font-bold text-white">
                        Recommended Specialist: {transferData.suggested_attending_doctor.doctor_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {transferData.suggested_attending_doctor.specialization} (Load Balancer Match Score: {transferData.suggested_attending_doctor.match_score}%)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success(`Transfer & assignment request dispatched for ${transferData.patient_name}`)}
                    className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                  >
                    Execute Transfer
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">Evaluating transfer recommendations...</div>
          )}
        </div>
      )}

      {/* ── Tab 5: Post-Discharge Intelligence ── */}
      {activeTab === 'postdischarge' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-purple-950/40 to-surface-800/80 border border-purple-500/20 rounded-xl p-4 flex items-start space-x-3">
            <Clock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-purple-200">Post-Discharge Intelligence & Readmission Prevention</p>
              <p className="text-slate-300 leading-relaxed">
                Extends patient care into outpatient recovery. Continuously tracks medication compliance, missed cardiology appointments, and reported warning symptoms to calculate readmission risk.
              </p>
            </div>
          </div>

          {postDischargeData ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-surface-800/90 border border-white/10 rounded-xl p-5 space-y-3">
                <div className="text-xs uppercase font-semibold text-slate-400">Readmission Risk</div>
                <div className="text-3xl font-black text-white">{postDischargeData.readmission_risk_score}%</div>
                <div className="text-xs font-bold text-purple-300">{postDischargeData.follow_up_status.replace(/_/g, ' ')}</div>
                <div className="pt-3 border-t border-white/10 text-xs text-slate-300">
                  <span className="font-semibold text-white">Recommended Action: </span>
                  {postDischargeData.recommended_clinical_action}
                </div>
              </div>

              <div className="lg:col-span-2 bg-surface-800/90 border border-white/10 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-center">
                  <div className="bg-surface-900/80 p-3 rounded-lg border border-white/5">
                    <div className="text-xs text-slate-400">Medication Adherence</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{postDischargeData.medication_adherence_percentage}%</div>
                  </div>
                  <div className="bg-surface-900/80 p-3 rounded-lg border border-white/5">
                    <div className="text-xs text-slate-400">Missed Visits</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">{postDischargeData.missed_appointments_count}</div>
                  </div>
                  <div className="bg-surface-900/80 p-3 rounded-lg border border-white/5">
                    <div className="text-xs text-slate-400">Upcoming Visits</div>
                    <div className="text-lg font-bold text-cyan-400 mt-1">{postDischargeData.upcoming_appointments_count}</div>
                  </div>
                </div>

                {postDischargeData.active_red_flags.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-red-300 uppercase">Active Recovery Red Flags:</div>
                    {postDischargeData.active_red_flags.map((flag, i) => (
                      <div key={i} className="text-xs p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">Loading post-discharge metrics...</div>
          )}
        </div>
      )}

      {/* ── Tab 6: On-Premise Privacy Shield & Audit ── */}
      {activeTab === 'privacy' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-teal-950/40 to-surface-800/80 border border-teal-500/20 rounded-xl p-4 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-teal-200">Zero-Leakage On-Premise Data Processing Shield</p>
              <p className="text-slate-300 leading-relaxed">
                All patient medical instruments telemetry, ML inference, and XAI calculations execute 100% locally within the hospital perimeter. Zero Protected Health Information (PHI) is ever transmitted to third-party cloud APIs.
              </p>
            </div>
          </div>

          {privacyData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-800/90 border border-white/10 rounded-xl p-5 space-y-3">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Hospital Security Posture</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Processing Topology:</span>
                    <span className="font-bold text-emerald-300">{privacyData.data_processing_model}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Cloud Data Leakage Risk:</span>
                    <span className="font-bold text-emerald-300">{privacyData.cloud_data_leakage_risk}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Database Storage:</span>
                    <span className="text-slate-200">{privacyData.encryption_at_rest}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-slate-400">Role-Based Access:</span>
                    <span className="text-slate-200">{privacyData.rbac_enforcement}</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-800/90 border border-white/10 rounded-xl p-5 space-y-3">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">Compliance & Audit Trail</div>
                <div className="flex flex-wrap gap-1.5">
                  {privacyData.compliance_alignment.map((c, idx) => (
                    <span key={idx} className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      ✓ {c}
                    </span>
                  ))}
                </div>
                <div className="pt-3 border-t border-white/10 text-xs text-slate-400">
                  Total Tamper-Evident Audit Logs: <span className="font-bold text-white">{privacyData.total_tamper_evident_audit_entries} entries</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
