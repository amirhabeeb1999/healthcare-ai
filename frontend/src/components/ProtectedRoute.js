'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const router = useRouter();
  const { isAuthenticated, loading, user, sessionExpired } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 mb-4">
            You need <b className="capitalize">{requiredRole}</b> privileges to access this page.
            Your current role is <b className="capitalize">{user?.role}</b>.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm rounded-lg transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Session expired banner
  if (sessionExpired) {
    return null;
  }

  return children;
}
