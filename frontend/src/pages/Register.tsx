import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  ArrowRight,
  AlertCircle,
  Loader2,
  Database,
  Coins
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Register: React.FC = () => {
  const { register, isAuthenticated, isLoading: isAuthVerifying, isDbUnavailable, checkDbStatus } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Ping live health on mount to verify database connectivity status
  useEffect(() => {
    checkDbStatus();
  }, [checkDbStatus]);

  // Redirect if already authenticated
  if (isAuthenticated && !isAuthVerifying) {
    return <Navigate to="/dashboard" replace />;
  }

  // Password Strength Criteria
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigitOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const isPasswordStrong = hasMinLength && hasUpper && hasLower && hasDigitOrSymbol;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Please enter your full name (minimum 2 characters).');
      return;
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setFormError('Please provide a valid email address.');
      return;
    }

    if (!isPasswordStrong) {
      setFormError('Please meet all password strength requirements below.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        currency,
        monthlyIncome: Math.max(0, parseFloat(monthlyIncome) || 0)
      });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 bg-grid-pattern relative">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 my-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-3">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Create Your <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">FinovaX</span> Account
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Start fresh with a dedicated, isolated financial database (Zero Dummy Data)
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Zero Dummy Data Indicator */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              EMPTY LEDGER INITIALIZATION
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
              <div className="flex-1">
                <span>{formError}</span>
                {formError.toLowerCase().includes('already exists') && (
                  <div className="mt-1.5">
                    <Link to="/login" className="text-emerald-400 hover:text-emerald-300 underline font-semibold">
                      Sign in to your account &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name & Email Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Sharma"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

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
                    placeholder="maya@example.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Currency & Monthly Income */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Primary Currency
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['INR', 'USD', 'EUR', 'GBP'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        currency === c
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {c === 'INR' ? '₹ INR' : c === 'USD' ? '$ USD' : c === 'EUR' ? '€ EUR' : '£ GBP'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Monthly Baseline Inflow
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="e.g. 75000"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    autoComplete="new-password"
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-800/80 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                      confirmPassword && !passwordsMatch
                        ? 'border-rose-500/80 focus:ring-rose-500/50'
                        : 'border-slate-700 focus:ring-emerald-500/50 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Password Strength Checklist */}
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                Password Security Criteria:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>Uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasLower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>Lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasDigitOrSymbol ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {hasDigitOrSymbol ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>Number or symbol</span>
                </div>
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
                  Creating Secure Account...
                </span>
              ) : (
                'Create Account & Start Fresh'
              )}
            </Button>
          </form>

          {/* Login Redirect Footer */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors underline-offset-4 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-[11px] text-center text-slate-500 mt-6 font-mono">
          Bcrypt 12 Salt Hashing • Strict User Isolation • No Mock Records
        </p>
      </div>
    </div>
  );
};
