import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ShieldCheck } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show authentic loading screen while verifying HttpOnly session cookie
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Verifying secure FinovaX session...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to login with original destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
};
