import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  PieChart,
  Target,
  CalendarCheck2,
  ShieldAlert,
  Brain,
  TrendingUp as ForecastIcon,
  Users,
  Tag,
  UploadCloud,
  Smartphone,
  History,
  Landmark,
  ShieldCheck,
  Bot,
  FileBarChart2,
  Settings,
  User,
  HelpCircle
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface SidebarProps {
  onNavClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavClick }) => {
  const { unresolvedFraudCount, pendingBillsCount } = useFinance();

  const sections = [
    {
      title: 'Financial Ledger',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
        { label: 'Income', path: '/income', icon: TrendingUp },
        { label: 'Expenses', path: '/expenses', icon: TrendingDown },
        { label: 'Budgets', path: '/budgets', icon: PieChart },
        { label: 'Financial Goals', path: '/goals', icon: Target },
        {
          label: 'Bills & EMIs',
          path: '/bills',
          icon: CalendarCheck2,
          badge: pendingBillsCount > 0 ? `${pendingBillsCount}` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
        }
      ]
    },
    {
      title: 'Statement Ingestion',
      items: [
        { label: 'Bank Statement Upload', path: '/import/statement', icon: UploadCloud },
        { label: 'Google Pay Import', path: '/import/gpay', icon: Smartphone },
        { label: 'Import History', path: '/import/history', icon: History },
        { label: 'Bank Connection (AA)', path: '/bank-connection', icon: Landmark },
        { label: 'Consent Management', path: '/accounts/consent', icon: ShieldCheck }
      ]
    },
    {
      title: 'AI Intelligence',
      items: [
        {
          label: 'Fraud Detection',
          path: '/fraud',
          icon: ShieldAlert,
          badge: unresolvedFraudCount > 0 ? `${unresolvedFraudCount}` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
        },
        { label: 'Spending Forecast', path: '/forecast', icon: ForecastIcon },
        { label: 'Customer Persona', path: '/segmentation', icon: Users },
        { label: 'Category Studio', path: '/categories/correction', icon: Tag },
        { label: 'AI Assistant', path: '/assistant', icon: Bot, highlight: true },
        { label: 'Reports & Analytics', path: '/reports', icon: FileBarChart2 }
      ]
    },
    {
      title: 'Settings & System',
      items: [
        { label: 'User Profile', path: '/profile', icon: User },
        { label: 'Settings', path: '/settings', icon: Settings },
        { label: 'Help & About', path: '/help', icon: HelpCircle }
      ]
    }
  ];

  return (
    <aside className="w-64 flex flex-col h-full bg-white dark:bg-[#0B111E] border-r border-slate-200 dark:border-slate-800/80 transition-colors select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800/80">
        <NavLink
          to="/dashboard"
          onClick={onNavClick}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white dark:bg-[#0B111E] rounded-[10px] flex items-center justify-center">
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-lg">F</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center">
              Finova<span className="text-indigo-500">X</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 -mt-1 tracking-wider uppercase">
              Financial Intelligence
            </span>
          </div>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto" aria-label="Main Navigation">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onNavClick}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor || 'bg-slate-100'}`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-400 text-center">
        B.Tech CSE Major Project 2026
      </div>
    </aside>
  );
};
