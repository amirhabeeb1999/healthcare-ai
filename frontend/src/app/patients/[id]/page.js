'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function RiskBadge({ level }) {
  return <span className={`risk-${level} px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize`}>{level}</span>;
}
function SevBadge({ severity }) {
  return <span className={`sev-${severity} px-2 py-0.5 rounded text-xs font-semibold capitalize`}>{severity}</span>;
}

function RiskGauge({ label, score, level, factors, recommendation }) {
  const color = { critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#22c55e' }[level] || '#94a3b8';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-slate-700 text-sm">{label}</h4>
        <RiskBadge level={level} />
      </div>
      <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      <p className="text-2xl font-bold mb-2" style={{ color }}>{score}%</p>
      {factors && factors.length > 0 && (
        <ul className="space-y-1 mb-3">
          {factors.map((f, i) => (
            <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
              <span className="text-amber-500 mt-0.5">▸</span>
              <span><b>{f.factor}:</b> {f.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {recommendation && <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">{recommendation}</p>}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const { user, logout, authFetch, canAccessAI } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('overview');

  // AI states
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [risks, setRisks] = useState(null);
  const [risksLoading, setRisksLoading] = useState(false);
  const [risksError, setRisksError] = useState('');
  const [medSafety, setMedSafety] = useState(null);
  const [medLoading, setMedLoading] = useState(false);
  const [medError, setMedError] = useState('');
  const [treatment, setTreatment] = useState(null);
  const [treatLoading, setTreatLoading] = useState(false);
  const [treatError, setTreatError] = useState('');

  // Chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadPatient();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadPatient() {
    setLoading(true);
    setLoadError('');
    try {
      const data = await authFetch(`/patients/${id}`);
      setPatient(data);
    } catch (err) {
      console.error(err);
      setLoadError(err.message || 'Failed to load patient data.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    if (summary) return;
    setSummaryLoading(true);
    setSummaryError('');
    try { setSummary(await authFetch(`/ai/summarize/${id}`, { method: 'POST' })); } catch (e) { setSummaryError(e.message || 'Failed to generate summary.'); }
    finally { setSummaryLoading(false); }
  }

  async function loadRisks() {
    if (risks) return;
    setRisksLoading(true);
    setRisksError('');
    try { setRisks(await authFetch(`/ai/risks/${id}`)); } catch (e) { setRisksError(e.message || 'Failed to run risk predictions.'); }
    finally { setRisksLoading(false); }
  }

  async function loadMedSafety() {
    if (medSafety) return;
    setMedLoading(true);
    setMedError('');
    try { setMedSafety(await authFetch(`/ai/medications/${id}`)); } catch (e) { setMedError(e.message || 'Failed to check medications.'); }
    finally { setMedLoading(false); }
  }

  async function loadTreatment() {
    if (treatment) return;
    setTreatLoading(true);
    setTreatError('');
    try { setTreatment(await authFetch(`/ai/treatment/${id}`)); } catch (e) { setTreatError(e.message || 'Failed to get treatment suggestions.'); }
    finally { setTreatLoading(false); }
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setChatLoading(true);
    try {
      const data = await authFetch('/ai/chat', { method: 'POST', body: JSON.stringify({ patientId: id, question: q }) });
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleTabChange(t) {
    setTab(t);
    if (t === 'summary') loadSummary();
    if (t === 'risks') loadRisks();
    if (t === 'medications') loadMedSafety();
    if (t === 'treatment') loadTreatment();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-slate-400">Loading patient...</div>
      </div>
    );
  }

  if (loadError || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Failed to load patient</h2>
          <p className="text-sm text-slate-500 mb-4">{loadError || 'Patient data is unavailable.'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={loadPatient} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm rounded-lg transition">Retry</button>
            <button onClick={() => router.push('/patients')} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm rounded-lg transition">Back to Patients</button>
          </div>
        </div>
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
  const allTabs = [
    { key: 'overview', label: 'Overview', aiOnly: false },
    { key: 'summary', label: 'AI Summary', aiOnly: true },
    { key: 'risks', label: 'Risk Panel', aiOnly: true },
    { key: 'medications', label: 'Med Safety', aiOnly: true },
    { key: 'treatment', label: 'Treatment', aiOnly: true },
    { key: 'timeline', label: 'Timeline', aiOnly: false },
    { key: 'chat', label: 'AI Chat', aiOnly: true },
  ];
  const tabs = allTabs.filter(t => !t.aiOnly || canAccessAI);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => router.push('/patients')} className="text-slate-500 hover:text-sky-600 text-xs sm:text-sm font-medium whitespace-nowrap">
              ← Back
            </button>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-xl sm:text-2xl hidden sm:inline">🏥</span>
            <span className="text-xs sm:text-sm font-bold text-slate-700 hidden sm:inline">Healthcare AI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-slate-500 hidden sm:inline">{user?.full_name}</span>
            <button onClick={logout} className="text-xs text-slate-400 hover:text-red-500">Sign Out</button>
          </div>
        </div>
      </header>

      {/* Patient header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-800 truncate">{patient.first_name} {patient.last_name}</h1>
                <RiskBadge level={patient.risk_level} />
              </div>
              <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-0.5 mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-500">
                <span>{age} yo {patient.gender}</span>
                <span>MRN: <b className="text-slate-700 font-mono">{patient.mrn}</b></span>
                <span className="hidden sm:inline">Blood Type: {patient.blood_type}</span>
                <span className="hidden sm:inline">DOB: {patient.date_of_birth}</span>
              </div>
            </div>
            <div className="hidden sm:block text-right text-sm text-slate-500">
              <p>Insurance: <b className="text-slate-700">{patient.insurance_provider}</b></p>
              <p>ID: {patient.insurance_id}</p>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium">{patient.primary_diagnosis}</span>
            {patient.allergies && patient.allergies !== 'None known' && (
              <span className="bg-red-50 text-red-700 border border-red-200 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium">Allergies: {patient.allergies}</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto border-t border-slate-100 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition flex-shrink-0 ${
                  tab === t.key
                    ? 'border-sky-500 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Vitals */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Latest Vitals</h3>
              {patient.vitals && patient.vitals.length > 0 ? (() => {
                const v = patient.vitals[0] || {};
                return (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Heart Rate', value: v.heart_rate != null ? `${v.heart_rate} bpm` : '—', warn: (v.heart_rate || 0) > 100 },
                      { label: 'Blood Pressure', value: v.systolic_bp != null ? `${v.systolic_bp}/${v.diastolic_bp}` : '—', warn: (v.systolic_bp || 0) > 140 },
                      { label: 'Temperature', value: v.temperature != null ? `${v.temperature}°F` : '—', warn: (v.temperature || 0) > 100.4 },
                      { label: 'Resp. Rate', value: v.respiratory_rate != null ? `${v.respiratory_rate}/min` : '—', warn: (v.respiratory_rate || 0) > 20 },
                      { label: 'SpO2', value: v.oxygen_saturation != null ? `${v.oxygen_saturation}%` : '—', warn: (v.oxygen_saturation || 100) < 92 },
                      { label: 'Weight', value: v.weight != null ? `${v.weight} lbs` : '—', warn: false },
                    ].map(item => (
                      <div key={item.label} className={`p-3 rounded-lg ${item.warn ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className={`text-lg font-bold ${item.warn ? 'text-red-600' : 'text-slate-800'}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                );
              })() : <p className="text-sm text-slate-400">No vitals recorded</p>}
            </div>

            {/* Active Medications */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Active Medications ({patient.medications?.filter(m => m.status === 'active').length || 0})</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(patient.medications?.filter(m => m.status === 'active') || []).length > 0 ? patient.medications.filter(m => m.status === 'active').map(m => (
                  <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg">
                    <p className="font-medium text-sm text-slate-800">{m.name || 'Unknown'} <span className="text-slate-500 font-normal">{m.dosage || ''}</span></p>
                    <p className="text-xs text-slate-400">{m.frequency || '—'} • {m.route || '—'}</p>
                    {m.notes && <p className="text-xs text-amber-600 mt-0.5">{m.notes}</p>}
                  </div>
                )) : <p className="text-sm text-slate-400">No active medications</p>}
              </div>
            </div>

            {/* Critical Labs */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Recent Labs</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(!patient.labs || patient.labs.length === 0) && <p className="text-sm text-slate-400">No lab results available</p>}
                {(patient.labs || []).slice(0, 10).map(l => (
                  <div key={l.id} className={`p-2.5 rounded-lg ${l.status === 'critical' ? 'bg-red-50 border border-red-200' : l.status === 'high' || l.status === 'low' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm text-slate-800">{l.test_name}</p>
                      <span className={`text-xs font-semibold uppercase ${l.status === 'critical' ? 'text-red-600' : l.status === 'normal' ? 'text-green-600' : 'text-amber-600'}`}>{l.status}</span>
                    </div>
                    <p className="text-sm"><b>{l.value}</b> {l.unit} <span className="text-xs text-slate-400">(ref: {l.reference_range})</span></p>
                    <p className="text-xs text-slate-400">{l.date}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-700 mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-400">Phone:</span> {patient.phone || '—'}</p>
                <p><span className="text-slate-400">Email:</span> {patient.email || '—'}</p>
                <p><span className="text-slate-400">Address:</span> {patient.address || '—'}</p>
                <p><span className="text-slate-400">Emergency:</span> {patient.emergency_contact || '—'} {patient.emergency_phone ? `— ${patient.emergency_phone}` : ''}</p>
              </div>
            </div>

            {/* Recent Encounters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 md:col-span-2">
              <h3 className="font-semibold text-slate-700 mb-3">Recent Encounters</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {(!patient.encounters || patient.encounters.length === 0) && <p className="text-sm text-slate-400">No encounters recorded</p>}
                {(patient.encounters || []).slice(0, 5).map(e => (
                  <div key={e.id} className="p-3 bg-slate-50 rounded-lg border-l-4" style={{ borderLeftColor: e.encounter_type === 'Emergency' ? '#dc2626' : e.encounter_type === 'Inpatient' ? '#ea580c' : '#0ea5e9' }}>
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm text-slate-800">{e.encounter_type} — {e.chief_complaint}</p>
                      <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{e.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1"><b>Dx:</b> {e.diagnosis}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{e.provider} • {e.department} • {e.disposition}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI SUMMARY */}
        {tab === 'summary' && (
          <div className="max-w-4xl">
            {summaryError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <span className="text-red-500 mt-0.5">⚠</span>
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">Failed to generate summary</p>
                  <p className="text-xs text-red-600 mt-0.5">{summaryError}</p>
                </div>
                <button onClick={() => { setSummaryError(''); setSummary(null); loadSummary(); }} className="text-xs text-red-600 hover:text-red-800 font-medium">Retry</button>
              </div>
            )}
            {!summary && !summaryLoading && !summaryError && (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-4">Click below to generate an AI clinical summary for this patient.</p>
                <button onClick={loadSummary} className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition">
                  Generate AI Summary
                </button>
              </div>
            )}
            {summaryLoading && (
              <div className="text-center py-12 animate-pulse text-slate-400">
                <p className="text-lg">Analyzing patient records...</p>
                <p className="text-sm mt-1">Reviewing {patient.encounters?.length || 0} encounters, {patient.labs?.length || 0} labs, {patient.medications?.length || 0} medications</p>
              </div>
            )}
            {summary && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h3 className="font-bold text-slate-800">AI Clinical Summary</h3>
                  <div className="text-xs text-slate-400">
                    Confidence: <b className="text-sky-600">{(summary.confidence * 100).toFixed(0)}%</b> •
                    Data points: {summary.data_points_analyzed}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
                  {summary.summary}
                </div>
                <button onClick={() => { setSummary(null); loadSummary(); }} className="mt-4 text-xs text-sky-600 hover:text-sky-800">
                  ↻ Regenerate
                </button>
              </div>
            )}
          </div>
        )}

        {/* RISK PANEL */}
        {tab === 'risks' && (
          <div>
            {risksError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <span className="text-red-500 mt-0.5">⚠</span>
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">Failed to run risk predictions</p>
                  <p className="text-xs text-red-600 mt-0.5">{risksError}</p>
                </div>
                <button onClick={() => { setRisksError(''); setRisks(null); loadRisks(); }} className="text-xs text-red-600 hover:text-red-800 font-medium">Retry</button>
              </div>
            )}
            {!risks && !risksLoading && !risksError && (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-4">Click to run AI risk prediction models on this patient.</p>
                <button onClick={loadRisks} className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition">
                  Run Risk Predictions
                </button>
              </div>
            )}
            {risksLoading && <div className="text-center py-12 animate-pulse text-slate-400 text-lg">Running prediction models...</div>}
            {risks && (
              <>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Overall Acuity:</h3>
                  <RiskBadge level={risks.overall_acuity} />
                  {risks.length_of_stay && (
                    <span className="text-xs sm:text-sm text-slate-500 ml-auto">Est. LOS: <b>{risks.length_of_stay.range}</b></span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <RiskGauge {...risks.sepsis} />
                  <RiskGauge {...risks.readmission} />
                  <RiskGauge {...risks.icu} />
                </div>
              </>
            )}
          </div>
        )}

        {/* MED SAFETY */}
        {tab === 'medications' && (
          <div className="max-w-4xl">
            {medError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <span className="text-red-500 mt-0.5">⚠</span>
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">Failed to check medications</p>
                  <p className="text-xs text-red-600 mt-0.5">{medError}</p>
                </div>
                <button onClick={() => { setMedError(''); setMedSafety(null); loadMedSafety(); }} className="text-xs text-red-600 hover:text-red-800 font-medium">Retry</button>
              </div>
            )}
            {!medSafety && !medLoading && !medError && (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-4">Click to run AI medication safety analysis.</p>
                <button onClick={loadMedSafety} className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition">
                  Run Medication Safety Check
                </button>
              </div>
            )}
            {medLoading && <div className="text-center py-12 animate-pulse text-slate-400 text-lg">Analyzing medications...</div>}
            {medSafety && (
              <>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Medication Safety Report</h3>
                  <span className="text-xs sm:text-sm text-slate-500">{medSafety.total_medications} meds • {medSafety.warnings_count} warnings</span>
                  {medSafety.critical_count > 0 && (
                    <span className="bg-red-100 text-red-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold">{medSafety.critical_count} CRITICAL</span>
                  )}
                </div>
                {medSafety.warnings.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center text-green-700">
                    No medication warnings detected.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medSafety.warnings.map((w, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-start gap-3">
                          <SevBadge severity={w.severity} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-400 uppercase">{w.type}</span>
                              <span className="text-sm font-bold text-slate-700">{w.medication}</span>
                            </div>
                            <p className="text-sm text-slate-700 mb-2">{w.message}</p>
                            <p className="text-xs text-sky-700 bg-sky-50 rounded-lg p-2 mb-1"><b>Recommendation:</b> {w.recommendation}</p>
                            <p className="text-xs text-slate-400">Evidence: {w.evidence}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TREATMENT */}
        {tab === 'treatment' && (
          <div className="max-w-4xl">
            {treatError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <span className="text-red-500 mt-0.5">⚠</span>
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">Failed to get treatment suggestions</p>
                  <p className="text-xs text-red-600 mt-0.5">{treatError}</p>
                </div>
                <button onClick={() => { setTreatError(''); setTreatment(null); loadTreatment(); }} className="text-xs text-red-600 hover:text-red-800 font-medium">Retry</button>
              </div>
            )}
            {!treatment && !treatLoading && !treatError && (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-4">Click to get AI evidence-based treatment suggestions.</p>
                <button onClick={loadTreatment} className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition">
                  Get Treatment Suggestions
                </button>
              </div>
            )}
            {treatLoading && <div className="text-center py-12 animate-pulse text-slate-400 text-lg">Searching clinical guidelines...</div>}
            {treatment && (
              <>
                <h3 className="font-bold text-slate-800 mb-4">{treatment.total_suggestions} Evidence-Based Suggestions</h3>
                <div className="space-y-4">
                  {treatment.suggestions.map((s, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          s.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          s.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          s.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>{s.priority} priority</span>
                        <span className="text-xs text-slate-400">{s.category}</span>
                        <span className="text-xs text-sky-600 sm:ml-auto">Confidence: {(s.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <h4 className="font-semibold text-slate-800 mb-1">{s.recommendation}</h4>
                      <p className="text-sm text-slate-600 mb-3">{s.details}</p>
                      {s.actions && s.actions.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-3 mb-2">
                          <p className="text-xs font-semibold text-slate-500 mb-1.5">ACTION ITEMS</p>
                          <ul className="space-y-1">
                            {s.actions.map((a, j) => (
                              <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                                <span className="text-sky-500 mt-0.5">☐</span> {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-xs text-slate-400">Source: {s.evidence}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* TIMELINE */}
        {tab === 'timeline' && (
          <div className="max-w-3xl">
            <h3 className="font-bold text-slate-800 mb-4">Clinical Timeline</h3>
            <div className="space-y-0">
              {patient.encounters?.map((e, i) => (
                <div key={e.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      e.encounter_type === 'Emergency' ? 'bg-red-500' :
                      e.encounter_type === 'Inpatient' ? 'bg-orange-500' : 'bg-sky-500'
                    }`} />
                    {i < patient.encounters.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
                  </div>
                  <div className="pb-6 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400">{e.date}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.encounter_type === 'Emergency' ? 'bg-red-100 text-red-700' :
                        e.encounter_type === 'Inpatient' ? 'bg-orange-100 text-orange-700' :
                        'bg-sky-100 text-sky-700'
                      }`}>{e.encounter_type}</span>
                    </div>
                    <p className="font-semibold text-sm text-slate-800">{e.chief_complaint}</p>
                    <p className="text-xs text-slate-600 mt-0.5"><b>Dx:</b> {e.diagnosis}</p>
                    <p className="text-xs text-slate-500 mt-1">{e.notes}</p>
                    <p className="text-xs text-slate-400 mt-1">{e.provider} • {e.department} • {e.disposition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI CHAT */}
        {tab === 'chat' && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: 'calc(100dvh - 220px)', minHeight: '400px', maxHeight: '75vh' }}>
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700 text-sm">AI Chart Assistant — {patient.first_name} {patient.last_name}</h3>
                <p className="text-xs text-slate-400">Ask questions about this patient&apos;s clinical data. AI answers are based only on chart data.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm mb-4">Ask me anything about this patient. Try:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['What are the key risks?', 'Show me recent labs', 'What medications is the patient on?', 'Give me a summary', 'Show encounter history'].map(q => (
                        <button key={q} onClick={() => { setChatInput(q); }} className="text-xs bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 px-3 py-1.5 rounded-full transition">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                      m.role === 'user'
                        ? 'bg-sky-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-700 rounded-bl-md'
                    }`}>
                      <pre className="whitespace-pre-wrap font-sans">{m.text}</pre>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-400 px-4 py-3 rounded-2xl rounded-bl-md text-sm animate-pulse">
                      Analyzing patient data...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={sendChat} className="border-t border-slate-200 p-2 sm:p-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask about this patient..."
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white rounded-lg text-sm font-medium transition"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PatientDashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
