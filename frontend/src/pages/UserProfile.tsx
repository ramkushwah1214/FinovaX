import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  DollarSign,
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const UserProfile: React.FC = () => {
  const { userProfile, updateUserProfile } = useFinance();
  const { user } = useAuth();

  const [name, setName] = useState(userProfile.name || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [currency, setCurrency] = useState(userProfile.currency || 'INR');
  const [monthlyIncome, setMonthlyIncome] = useState(String(userProfile.monthlyIncome || '0'));
  const [fraudAlerts, setFraudAlerts] = useState(userProfile.notifications?.fraudAlerts ?? true);
  const [budgetThresholds, setBudgetThresholds] = useState(userProfile.notifications?.budgetThresholds ?? true);
  const [billReminders, setBillReminders] = useState(userProfile.notifications?.billReminders ?? true);
  const [weeklyReports, setWeeklyReports] = useState(userProfile.notifications?.weeklyReports ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      await updateUserProfile({
        name,
        phone,
        currency: currency as any,
        monthlyIncome: Number(monthlyIncome) || 0,
        notifications: {
          fraudAlerts,
          budgetThresholds,
          billReminders,
          weeklyReports
        }
      });
      setMessage('Profile settings and financial preferences updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update user profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <User className="w-6 h-6 text-indigo-500" />
          <span>User Profile & Financial Settings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal details, default ledger currency, baseline monthly income, and alert preferences.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registered Email (Permanent)
              </label>
              <input
                type="email"
                value={userProfile.email || user?.email || ''}
                disabled
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ledger Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="INR">Indian Rupee (INR ₹)</option>
                <option value="USD">US Dollar (USD $)</option>
                <option value="EUR">Euro (EUR €)</option>
                <option value="GBP">British Pound (GBP £)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Base Monthly Net Income
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                min="0"
                step="1000"
                placeholder="75000"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Used to compute baseline savings rate when statement imports contain only debit expenses.
              </p>
            </div>
          </div>

          {/* Notifications Preferences */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
              <Bell className="w-3.5 h-3.5" />
              <span>Intelligence & Notification Preferences</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fraudAlerts}
                  onChange={(e) => setFraudAlerts(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Real-time AI statistical fraud and anomaly detection warnings
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={budgetThresholds}
                  onChange={(e) => setBudgetThresholds(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Budget overrun notifications when spending exceeds 80% threshold
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={billReminders}
                  onChange={(e) => setBillReminders(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Recurring bill due date reminders and auto-debit alerts
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Preferences</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

