import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, login, register, authError } = useAuth();
  const { showSuccess } = useToast();
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    if (isRegisterMode) {
      if (!name.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (isRegisterMode) {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          currency,
          monthlyIncome: parseFloat(monthlyIncome) || 0
        });
        showSuccess(`Welcome to FinovaX, ${name.trim()}! Account created.`);
      } else {
        await login({ email: email.trim(), password });
        showSuccess('Welcome back! Successfully signed in.');
      }
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setMonthlyIncome('');
    } catch (err: any) {
      setLocalError(err.message || 'Authentication request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      title={isRegisterMode ? 'Create FinovaX Account' : 'Sign In to FinovaX'}
      description="Connect to your secure MongoDB financial ledger."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setLocalError('');
            }}
            className={`flex-1 pb-2 text-xs font-bold transition-colors ${
              !isRegisterMode
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setLocalError('');
            }}
            className={`flex-1 pb-2 text-xs font-bold transition-colors ${
              isRegisterMode
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create New Account
          </button>
        </div>

        {(localError || authError) && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-medium">
            {localError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Aarav Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. user@finovax.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password * {isRegisterMode && '(Minimum 6 characters)'}
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {isRegisterMode && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Inflow (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isSubmitting}
              leftIcon={isRegisterMode ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            >
              {isRegisterMode ? 'Create Account & Sign In' : 'Sign In to Account'}
            </Button>
          </div>
        </form>

        <div className="text-[11px] text-slate-400 text-center pt-2 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Passkeys are hashed with bcrypt. Data strictly isolated per account.</span>
        </div>
      </div>
    </Modal>
  );
};
