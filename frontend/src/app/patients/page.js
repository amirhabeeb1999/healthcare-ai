'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function RiskBadge({ level }) {
  const cls = `risk-${level}`;
  return (
    <span className={`${cls} px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize`}>
      {level}
    </span>
  );
}

function PatientsContent() {
  const router = useRouter();
  const { user, logout, authFetch } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [error, setError] = useState('');
  const authFetchRef = useRef(authFetch);
  authFetchRef.current = authFetch;

  useEffect(() => {
    loadData();
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const data = await authFetchRef.current('/patients');
        setPatients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load patients.');
      } finally {
        setLoading(false);
      }
    }
  }, []);

  async function loadPatients() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (riskFilter) params.risk_level = riskFilter;
      const qs = new URLSearchParams(params).toString();
      const data = await authFetch(`/patients${qs ? '?' + qs : ''}`);
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadPatients();
  }

  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...patients].sort((a, b) => (riskOrder[a.risk_level] ?? 4) - (riskOrder[b.risk_level] ?? 4));

  const stats = {
    total: patients.length,
    critical: patients.filter(p => p.risk_level === 'critical').length,
    high: patients.filter(p => p.risk_level === 'high').length,
    medium: patients.filter(p => p.risk_level === 'medium').length,
    low: patients.filter(p => p.risk_level === 'low').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xl sm:text-2xl">🏥</span>
            <h1 className="text-sm sm:text-lg font-bold text-slate-800 truncate">Healthcare AI</h1>
            <span className="hidden sm:inline text-xs text-slate-400 border-l border-slate-200 pl-3 ml-1">Clinical Decision Support</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
              user?.role === 'doctor' ? 'bg-sky-100 text-sky-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>{user?.role}</span>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">{user?.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.specialty || user?.role}</p>
            </div>
            <button onClick={logout} className="text-xs sm:text-sm text-slate-500 hover:text-red-600 transition px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-50">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {[
            { label: 'Total Patients', value: stats.total, color: 'bg-sky-50 text-sky-700 border-sky-200' },
            { label: 'Critical', value: stats.critical, color: 'bg-red-50 text-red-700 border-red-200' },
            { label: 'High Risk', value: stats.high, color: 'bg-orange-50 text-orange-700 border-orange-200' },
            { label: 'Medium', value: stats.medium, color: 'bg-amber-50 text-amber-700 border-amber-200' },
            { label: 'Low Risk', value: stats.low, color: 'bg-green-50 text-green-700 border-green-200' },
          ].map(s => (
            <div key={s.label} className={`${s.color} border rounded-lg sm:rounded-xl p-2.5 sm:p-4`}>
              <p className="text-lg sm:text-2xl font-bold">{s.value}</p>
              <p className="text-[10px] sm:text-xs font-medium mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patients by name, MRN, or diagnosis..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
            />
            <button type="submit" className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition">
              Search
            </button>
          </form>
          <select
            value={riskFilter}
            onChange={e => { setRiskFilter(e.target.value); setTimeout(loadPatients, 0); }}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm outline-none"
          >
            <option value="">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <span className="text-red-500 mt-0.5">⚠</span>
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">Error loading patients</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => { setError(''); loadPatients(); }} className="text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap">
              Retry
            </button>
          </div>
        )}

        {/* Patient list */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            <div className="animate-pulse text-lg">Loading patients...</div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No patients found.</div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            <div className="md:hidden space-y-3">
              {sorted.map(p => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 active:bg-sky-50 transition cursor-pointer shadow-sm"
                  onClick={() => router.push(`/patients/${p.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-base">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.gender} • {p.date_of_birth} • {p.blood_type}</p>
                    </div>
                    <RiskBadge level={p.risk_level} />
                  </div>
                  <p className="text-xs text-slate-500 font-mono mb-2">{p.mrn}</p>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{p.primary_diagnosis}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{p.encounter_count} visits</span>
                    <span>{p.active_medications} meds</span>
                    {p.critical_labs > 0 && (
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">{p.critical_labs} critical</span>
                    )}
                    <span className="ml-auto text-sky-600 font-semibold">View →</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
                    <th className="text-left px-4 py-3 font-semibold">Patient</th>
                    <th className="text-left px-4 py-3 font-semibold">MRN</th>
                    <th className="text-left px-4 py-3 font-semibold">Primary Diagnosis</th>
                    <th className="text-center px-4 py-3 font-semibold">Risk</th>
                    <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell">Encounters</th>
                    <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell">Active Rx</th>
                    <th className="text-center px-4 py-3 font-semibold hidden lg:table-cell">Critical Labs</th>
                    <th className="text-right px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-sky-50/50 transition cursor-pointer" onClick={() => router.push(`/patients/${p.id}`)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-slate-400">{p.gender} • {p.date_of_birth} • {p.blood_type}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.mrn}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{p.primary_diagnosis}</td>
                      <td className="px-4 py-3 text-center"><RiskBadge level={p.risk_level} /></td>
                      <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">{p.encounter_count}</td>
                      <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">{p.active_medications}</td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        {p.critical_labs > 0 ? (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">{p.critical_labs}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-sky-600 hover:text-sky-800 text-xs font-semibold">
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function PatientsPage() {
  return (
    <ProtectedRoute>
      <PatientsContent />
    </ProtectedRoute>
  );
}
