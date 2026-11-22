import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  TrendingUp,
  Brain,
  FileSpreadsheet,
  Smartphone,
  Landmark,
  ArrowRight,
  Lock,
  PieChart,
  CheckCircle2,
  Database
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-extrabold text-xl tracking-wider">F</span>
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">FinovaX</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                AI Platform
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-28 lg:pb-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>B.Tech CSE Major Project: Intelligent Personal Finance Architecture</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
              Intelligent Personal Finance &{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
                Fraud Anomaly Detection
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Consolidate bank statements, Google Pay UPI activity, and financial transactions into a single unified ledger with automated categorization and four evaluated ML engines.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 transition space-x-2"
              >
                <span>Launch Financial Ledger</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/help"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Explore System Architecture
              </Link>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left">
                <p className="text-xs text-slate-500">IsolationForest AUC</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">94.69%</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tested on 284k Kaggle txns</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left">
                <p className="text-xs text-slate-500">Categorization Engine</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">100%</p>
                <p className="text-[11px] text-slate-400 mt-0.5">TF-IDF Random Forest F1</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left">
                <p className="text-xs text-slate-500">Multi-Format Ingestion</p>
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">CSV / PDF / UPI</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Bank statements & GPay</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left">
                <p className="text-xs text-slate-500">Bank Integration</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">RBI AA</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Zero password harvesting</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="py-16 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight">Four Distinct AI/ML Engines</h2>
              <p className="mt-3 text-slate-600 dark:text-slate-400">
                Rigorous machine learning modules built with scikit-learn, XGBoost, and FastAPI with empirical metric reports.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                  <PieChart className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">1. Smart Categorization</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  RandomForest Classifier with TF-IDF vectorization and transparent rule-based fallback when consumer labels are absent.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">2. Fraud Anomaly Scoring</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  IsolationForest unsupervised outlier model trained on Kaggle Credit Card data, paired with user behavioral variance checks.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">3. Spending Forecasting</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  XGBoost time-series regressor with lag features and 95% confidence intervals; reports insufficient data under 3 months.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">4. Customer Segmentation</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  KMeans clustering on standardized spending ratios, identifying financial archetypes with tailored financial actions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security Commitments */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl p-8 sm:p-12 bg-gradient-to-br from-indigo-900 to-slate-900 text-white relative overflow-hidden shadow-xl">
              <div className="max-w-3xl">
                <div className="inline-flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
                  <Lock className="w-4 h-4" />
                  <span>Privacy & Security Architecture</span>
                </div>
                <h2 className="text-3xl font-extrabold sm:text-4xl">Built on Zero-Trust Credential Principles</h2>
                <div className="mt-6 space-y-3 text-indigo-100 text-sm sm:text-base">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Never asks for or stores banking passwords, ATM PINs, OTPs, or UPI PINs.</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>In-memory stream parsing: uploaded bank statements are parsed in memory and immediately discarded.</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Strict per-user tenant isolation: all queries require authenticated user ownership tokens.</span>
                  </div>
                </div>
                <div className="mt-8">
                  <Link
                    to="/register"
                    className="inline-flex items-center px-6 py-3 rounded-xl bg-white text-indigo-900 font-bold hover:bg-indigo-50 transition"
                  >
                    Create Free Major Project Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 FinovaX Platform. B.Tech Computer Science Engineering Major Project.</p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <Link to="/help" className="hover:text-indigo-600 transition">About System</Link>
            <Link to="/login" className="hover:text-indigo-600 transition">Portal Login</Link>
            <Link to="/register" className="hover:text-indigo-600 transition">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

