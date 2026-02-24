'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading, sessionExpired } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/patients');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (sessionExpired) {
      setError('Your session has expired. Please sign in again.');
    }
  }, [sessionExpired]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      router.push('/patients');
    } catch (err) {
      if (err.message.includes('Unable to connect')) {
        setError('Cannot reach the server. Please ensure the backend is running on port 5000.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-600 to-blue-800 text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏥</span>
            <h1 className="text-2xl font-bold">Healthcare AI</h1>
          </div>
          <p className="text-sky-200 text-sm">Clinical Decision Support System</p>
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-bold leading-tight">AI-Powered Clinical Intelligence</h2>
          <ul className="space-y-3 text-sky-100">
            <li className="flex items-start gap-2"><span>✦</span> One-click medical history summaries</li>
            <li className="flex items-start gap-2"><span>✦</span> Early risk detection (sepsis, readmission)</li>
            <li className="flex items-start gap-2"><span>✦</span> Medication interaction warnings</li>
            <li className="flex items-start gap-2"><span>✦</span> Evidence-based treatment suggestions</li>
            <li className="flex items-start gap-2"><span>✦</span> Conversational chart assistant</li>
          </ul>
        </div>
        <p className="text-xs text-sky-300">HIPAA-Compliant &bull; Audit Logged &bull; Role-Based Access</p>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <span className="text-3xl">🏥</span>
            <h1 className="text-2xl font-bold text-slate-800">Healthcare AI</h1>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">Sign In</h2>
          <p className="text-slate-500 mb-6 sm:mb-8 text-sm sm:text-base">Access the Clinical Decision Support Portal</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
                placeholder="Enter your username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-semibold rounded-lg transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Demo Credentials</p>
            <div className="space-y-1 text-sm text-slate-600">
              <p><span className="font-medium">Doctor:</span> dr.smith / password123</p>
              <p><span className="font-medium">Cardiologist:</span> dr.patel / password123</p>
              <p><span className="font-medium">Nurse:</span> nurse.jones / password123</p>
              <p><span className="font-medium">Admin:</span> admin / password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
