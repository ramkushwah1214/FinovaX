import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Database
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading: isAuthVerifying, isDbUnavailable, checkDbStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Ping live health on mount to verify database connectivity status
  useEffect(() => {
    checkDbStatus();
  }, [checkDbStatus]);

  // Redirect if already authenticated
  const from = (location.state as any)?.from?.pathname || '/dashboard';
  if (isAuthenticated && !isAuthVerifying) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!password) {
      setFormError('Please enter your account password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email: trimmedEmail, password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setFormError(err.message || 'Invalid email or password credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 bg-grid-pattern relative">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-3">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Sign In to <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">FinovaX</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access your secure personal finance ledger and fraud monitors
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Zero Dummy Data Indicator */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ZERO DUMMY DATA ENGINE
            </span>
            <span className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
              <Database className={`w-3.5 h-3.5 ${isDbUnavailable ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${isDbUnavailable ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
              <span className={isDbUnavailable ? 'text-rose-400' : 'text-emerald-400 font-semibold'}>
                {isDbUnavailable ? 'DB Disconnected (503)' : 'MongoDB Connected'}
              </span>
            </span>
          </div>

          {/* DB Offline Notice */}
          {isDbUnavailable && !formError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-medium flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>FinovaX database is temporarily unavailable. Please try again shortly.</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => checkDbStatus()}
                className="text-[11px] py-1 px-3 h-auto shrink-0 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Error Banner */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-medium flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-500 hover:text-slate-300 absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={isSubmitting}
              rightIcon={!isSubmitting && <ArrowRight className="w-4 h-4" />}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Credentials...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Registration Redirect Footer */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Don't have an account yet?{' '}
              <Link
                to="/register"
                className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors underline-offset-4 hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-[11px] text-center text-slate-500 mt-6 font-mono">
          End-to-End User Isolation & HttpOnly Cookie Session Security
        </p>
      </div>
    </div>
  );
};
