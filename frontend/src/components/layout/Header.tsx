import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  ShieldAlert,
  CalendarCheck2,
  Settings,
  User,
  ChevronDown,
  RotateCcw,
  LogOut,
  LogIn
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, setIsAuthModalOpen } = useAuth();
  const {
    fraudAlerts,
    bills,
    userProfile,
    unresolvedFraudCount,
    pendingBillsCount,
    refreshData,
    isLoading
  } = useFinance();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return 'Financial Dashboard';
      case '/transactions':
        return 'Transaction Management';
      case '/budgets':
        return 'Monthly Budgets';
      case '/goals':
        return 'Financial Goals';
      case '/bills':
        return 'Bills & Recurring EMIs';
      case '/fraud':
        return 'Fraud Intelligence & Anomaly Detection';
      case '/assistant':
        return 'AI Financial Assistant';
      case '/reports':
        return 'Analytics & Reports';
      case '/settings':
        return 'Platform Settings';
      default:
        return 'FinovaX';
    }
  };

  const totalNotifications = unresolvedFraudCount + pendingBillsCount;

  return (
    <header className="h-16 px-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#090E17]/90 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between transition-colors">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {getPageTitle(location.pathname)}
          </h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Refresh Live Data from MongoDB */}
        <button
          onClick={() => refreshData()}
          disabled={isLoading}
          title="Sync live records from MongoDB"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          <span className="hidden sm:inline">Sync Data</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600 animate-in spin-in-180 duration-200" />
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#101A2D] border border-slate-200 dark:border-slate-800/90 shadow-2xl shadow-black/40 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Live Notifications & Alerts
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                  {totalNotifications} New
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {fraudAlerts
                  .filter((a) => a.status === 'pending_review')
                  .slice(0, 3)
                  .map((alert) => (
                    <Link
                      key={alert.id || alert._id}
                      to="/fraud"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="block p-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 transition-colors group"
                    >
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-rose-500 dark:text-rose-400">
                            {alert.riskLevel} Risk: {alert.transactionTitle}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                            {formatCurrency(alert.amount, userProfile.currency)} • Score: {alert.riskScore}/100
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}

                {bills
                  .filter((b) => b.status === 'pending')
                  .slice(0, 3)
                  .map((bill) => (
                    <Link
                      key={bill.id || bill._id}
                      to="/bills"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="block p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <CalendarCheck2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            Upcoming Bill: {bill.title || bill.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {formatCurrency(bill.amount, userProfile.currency)} due by {bill.dueDate}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}

                {totalNotifications === 0 && (
                  <p className="text-xs text-center text-slate-400 py-4">No unread notifications.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile / Auth Menu */}
        <div className="relative" ref={profileRef}>
          {isAuthenticated ? (
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-xs text-white shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden md:inline-block text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                {user?.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {isProfileOpen && isAuthenticated && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#101A2D] border border-slate-200 dark:border-slate-800/90 shadow-2xl shadow-black/40 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Currency: {user?.currency || 'INR'} (₹)
                </span>
              </div>

              <div className="py-1 space-y-0.5">
                <Link
                  to="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile & Security</span>
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Preferences</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
