import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldCheck,
  RefreshCw,
  LogOut,
  UserCheck,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, updateUserProfile, refreshData, isLoading: isFinanceLoading } = useFinance();
  const { user, isAuthenticated, logout, setIsAuthModalOpen, isDbUnavailable, deleteAccount } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showSuccess, showError } = useToast();

  // Local form state
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [currency, setCurrency] = useState(userProfile.currency || 'INR');
  const [monthlyIncome, setMonthlyIncome] = useState(userProfile.monthlyIncome?.toString() || '0');

  // Notification toggles
  const [notifications, setNotifications] = useState(
    userProfile.notifications || {
      fraudAlerts: true,
      budgetThresholds: true,
      billReminders: true,
      weeklyReports: false
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Danger Zone - Account Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync state whenever user profile changes from server
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setEmail(userProfile.email || '');
      setPhone(userProfile.phone || '');
      setCurrency(userProfile.currency || 'INR');
      setMonthlyIncome(userProfile.monthlyIncome?.toString() || '0');
      if (userProfile.notifications) {
        setNotifications(userProfile.notifications);
      }
    }
  }, [userProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      await updateUserProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        currency: currency as any,
        monthlyIncome: Math.max(0, parseFloat(monthlyIncome) || 0),
        notifications
      });

      showSuccess('Account preferences saved to MongoDB');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      const msg = err.message || 'Failed to update preferences. Please verify your connection.';
      setSaveError(msg);
      showError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Explicit confirmation required: Please type "DELETE" exactly.');
      return;
    }

    if (!deletePassword) {
      setDeleteError('Current password is required to authorize account deletion.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteAccount({
        password: deletePassword,
        confirmText: deleteConfirmText
      });
      showSuccess('Your FinovaX account has been successfully deleted.');
      setIsDeleteModalOpen(false);
      navigate('/login');
    } catch (err: any) {
      const msg = err.message || 'Failed to delete account. Please verify your password.';
      setDeleteError(msg);
      showError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-emerald-500" />
            Platform Settings & Preferences
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage authenticated account identity, currency localization, theme mode, and security alerts.
          </p>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFinanceLoading ? 'animate-spin' : ''}`} />}
              onClick={() => refreshData()}
              disabled={isFinanceLoading}
            >
              Sync DB
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-500" />}
              onClick={() => logout()}
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
            onClick={() => setIsAuthModalOpen(true)}
          >
            Sign In / Register
          </Button>
        )}
      </div>

      {/* Backend & Zero Dummy Data Assurance Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Phase 3 Real MongoDB Engine
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                ZERO DUMMY DATA
              </span>
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
              {isAuthenticated
                ? `Logged in as ${user?.email || userProfile.email}. Financial records are strictly scoped to your User ID in MongoDB.`
                : 'Browsing in Guest Mode with an empty ledger. Register or sign in to persist live financial records in MongoDB.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
          <Database className={`w-3.5 h-3.5 ${isDbUnavailable ? 'text-amber-500' : 'text-emerald-500'}`} />
          <span className="text-slate-600 dark:text-slate-300">
            DB Status: {isDbUnavailable ? 'Unavailable (503)' : 'Connected'}
          </span>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Account preferences successfully updated in MongoDB backend!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card title="User Identity & Profile" subtitle="Your authenticated personal account information">
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={isAuthenticated}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className={`w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isAuthenticated ? 'bg-slate-100 dark:bg-slate-800/60 cursor-not-allowed opacity-80' : 'bg-slate-50 dark:bg-slate-900'
                  }`}
                />
                {isAuthenticated && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Email is linked to your login credentials and managed in MongoDB User collection.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Baseline Monthly Income ({currency === 'INR' ? '₹' : currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Localization & Currency Preferences */}
        <Card title="Regional Currency & Theme" subtitle="Configure currency symbol and color scheme">
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Primary Currency Symbol
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { code: 'INR', label: 'INR (₹) - Indian Rupee' },
                  { code: 'USD', label: 'USD ($) - US Dollar' },
                  { code: 'EUR', label: 'EUR (€) - Euro' },
                  { code: 'GBP', label: 'GBP (£) - British Pound' }
                ].map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCurrency(c.code as any)}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                      currency === c.code
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Interface Theme Mode
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                    theme === 'dark'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <Moon className="w-4 h-4 text-emerald-400" />
                  <span>Dark Mode {theme === 'dark' ? '(Active)' : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                    theme === 'light'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode {theme === 'light' ? '(Active)' : ''}</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Security & Notification Alerts */}
        <Card
          title="Notification Alerts & Risk Warnings"
          subtitle="Real-time dispatch channels for automated safety monitors"
        >
          <div className="space-y-3 pt-2">
            {[
              {
                id: 'fraudAlerts',
                title: 'High-Risk Anomaly Detection Alerts',
                desc: 'Instant notifications when the risk assessment flags unusual merchant activity or spending velocity.'
              },
              {
                id: 'budgetThresholds',
                title: 'Budget Threshold Warnings',
                desc: 'Alert when a category reaches 85% or exceeds 100% of its monthly allocation.'
              },
              {
                id: 'billReminders',
                title: 'Upcoming Bill & Loan EMI Reminders',
                desc: 'Receive reminders 3 days ahead of due dates for pending recurring obligations.'
              },
              {
                id: 'weeklyReports',
                title: 'Weekly Financial Intelligence Digest',
                desc: 'Weekly executive summary of cashflow velocity and progress toward financial goals.'
              }
            ].map((pref) => {
              const checked = (notifications as any)[pref.id];
              return (
                <div
                  key={pref.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800"
                >
                  <div className="pr-4">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {pref.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                      {pref.desc}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setNotifications((prev) => ({ ...prev, [pref.id]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSaving}
          >
            {isSaving ? 'Saving to Database...' : 'Save Preferences'}
          </Button>
        </div>
      </form>

      {/* Account Settings: Danger Zone */}
      {isAuthenticated && (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="mb-3">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-rose-500 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Settings &bull; Account Settings &bull; Danger Zone
            </span>
          </div>

          <Card
            title="Danger Zone"
            subtitle="Irreversible operations that permanently destroy your account and financial data"
            className="border-rose-500/30 bg-rose-500/[0.02] dark:bg-rose-950/10"
          >
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    Delete My Account
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                  Permanently deletes your authenticated login profile and cascades deletion across all 12 MongoDB financial collections (transactions, budgets, goals, recurring bills, and security alerts). This action is permanent and cannot be undone.
                </p>
              </div>

              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => {
                  setDeletePassword('');
                  setDeleteConfirmText('');
                  setDeleteError(null);
                  setShowDeletePassword(false);
                  setIsDeleteModalOpen(true);
                }}
                className="shrink-0"
              >
                Delete My Account
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteModalOpen(false);
        }}
        title="Permanently Delete Account"
        maxWidth="md"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4 pt-1">
          {/* Permanent Warning Banner */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Warning: This action is permanent and irreversible!</span>
            </div>
            <p className="leading-relaxed">
              Deleting your account will immediately and permanently erase all your personal financial data from the live MongoDB cluster:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium pl-1">
              <li>Your user profile, login credentials, and active session tokens.</li>
              <li>All recorded transactions, income, expenses, and statement import batches.</li>
              <li>Active monthly budgets, category thresholds, and financial savings goals.</li>
              <li>Recurring bills, loan EMI reminders, and fraud anomaly alerts.</li>
              <li>Linked Account Aggregator bank connections and consent tokens.</li>
            </ul>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-rose-500/20">
              Note: Shared AI models, offline benchmark datasets, and global active-learning corrections remain safely intact.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          {/* Re-authentication: Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              1. Enter Current Password to Verify Ownership
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showDeletePassword ? 'text' : 'password'}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your current password"
                required
                disabled={isDeleting}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={() => setShowDeletePassword(!showDeletePassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Explicit Typing Confirmation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              2. Explicit Confirmation: Type <span className="font-mono font-bold text-rose-500">DELETE</span>
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              required
              disabled={isDeleting}
              className="w-full px-3 py-2.5 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Confirmation input must match uppercase <span className="font-mono font-bold">DELETE</span> exactly.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              disabled={deleteConfirmText !== 'DELETE' || !deletePassword || isDeleting}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Permanently Delete Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
