import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { AlertTriangle, Database, Lock, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isDbUnavailable, setIsAuthModalOpen } = useAuth();
  const { isDbUnavailable: financeDbDown, refreshData } = useFinance();

  const isDbDown = isDbUnavailable || financeDbDown;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#090E17] bg-grid-pattern transition-colors">
      {/* Desktop Sidebar (visible on lg+) */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer (visible on < lg) */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Container */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Real Backend / Database Status Banners */}
        {isDbDown ? (
          <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>
                <strong>Database Unavailable:</strong> MongoDB is disconnected. Please verify your MongoDB connection or configure <code>MONGODB_URI</code> in <code>backend/.env</code>.
              </span>
            </div>
            <button
              onClick={() => refreshData()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500 text-white font-semibold text-[11px] hover:bg-rose-600 transition-colors self-start sm:self-center"
            >
              <RotateCcw className="w-3 h-3" />
              Retry Connection
            </button>
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span>
                <strong>Authentication Required:</strong> You are currently viewing in guest mode. Sign in or register to store your real financial data in MongoDB.
              </span>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 text-white font-semibold text-[11px] hover:bg-emerald-600 transition-colors self-start sm:self-center"
            >
              Sign In / Register
            </button>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1.5 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                <strong>MongoDB Connected</strong>: Real financial ledger active. All records persist to database.
              </span>
            </div>
            <span className="hidden sm:inline font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">
              Phase 7 Premium Design System & AI Verified
            </span>
          </div>
        )}

        {/* Global Navigation Header */}
        <Header onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
