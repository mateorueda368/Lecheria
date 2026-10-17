import type { ReactNode } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profile?.rol !== 'administrador') {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        <div className="card-dark border-amber-500/30 p-6 flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h1 className="text-lg font-extrabold text-slate-100">Acceso restringido</h1>
          </div>
          <p className="text-sm text-slate-400">
            Este módulo es exclusivo de administradores. Si necesitas realizar esta operación,
            solicita acceso al administrador de la lechería.
          </p>
          <Link
            to="/"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
