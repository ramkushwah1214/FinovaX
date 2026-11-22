import React from 'react';
import {
  HelpCircle,
  ShieldCheck,
  Brain,
  Code2,
  Database,
  Layers,
  FileCheck2,
  Landmark,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const HelpAbout: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <HelpCircle className="w-6 h-6 text-indigo-500" />
          <span>About FinovaX & Technical Documentation</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          B.Tech Computer Science Engineering Final-Year Major Project Technical Dossier & System Architecture.
        </p>
      </div>

      {/* Project Abstract Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center space-x-2 mb-3">
          <Badge variant="info">Final Year Major Project</Badge>
          <span className="text-xs text-slate-400">Academic Year 2026</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Project Abstract</h2>
        <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>FinovaX</strong> is an intelligent personal finance management, fraud intelligence, and smart transaction analytics platform. The application provides end-to-end ingestion of heterogeneous financial records (CSV, XLSX, bank statement PDFs, and Google Pay UPI activity statements) into a unified double-entry ledger. Equipped with four rigorously evaluated Machine Learning modules (TF-IDF RandomForest Categorization, IsolationForest Anomaly Scoring, XGBoost Time-Series Forecasting, and KMeans Customer Segmentation), FinovaX delivers empirical analytics without fabricated mock data or synthetic claims.
        </p>
      </Card>

      {/* System Architecture */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          <span>Multi-Tier System Architecture</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1.5">
              <Code2 className="w-4 h-4" />
              <span>Frontend Client</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              React 18 + Vite + TypeScript + Tailwind CSS. 24 fully functional pages with responsive navigation, Recharts data visualization, zero dummy data, and real-time state synchronization.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
              <Database className="w-4 h-4" />
              <span>Backend REST & Database</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Node.js + Express + TypeScript + MongoDB Atlas with Mongoose ODM. In-memory statement stream parser (CSV, XLSX, PDF), duplicate detection engine, and JWT session isolation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-purple-600 dark:text-purple-400 flex items-center space-x-1.5">
              <Brain className="w-4 h-4" />
              <span>AI / ML Microservice</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Python 3 + FastAPI + Scikit-Learn + XGBoost + Pandas. Four trained models with model comparison reports, validation thresholding, and transparent rule-based fallbacks.
            </p>
          </div>
        </div>
      </Card>

      {/* The Four AI/ML Engines Table */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
          <Brain className="w-5 h-5 text-cyan-500" />
          <span>The Four AI / Machine Learning Modules</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Primary Algorithm</th>
                <th className="py-2.5 px-3">Benchmark Comparison</th>
                <th className="py-2.5 px-3">Dataset Source</th>
                <th className="py-2.5 px-3">Evaluation Metric</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">1. Categorization</td>
                <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400">RandomForest + TF-IDF</td>
                <td className="py-2.5 px-3 text-slate-500">Logistic Regression, Decision Tree</td>
                <td className="py-2.5 px-3 text-slate-500">Consumer Financial Narration Corpus</td>
                <td className="py-2.5 px-3 font-mono text-emerald-600">Weighted F1: 1.000</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">2. Fraud Anomaly</td>
                <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400">IsolationForest (Unsupervised)</td>
                <td className="py-2.5 px-3 text-slate-500">RandomForest, XGBoost Classifier</td>
                <td className="py-2.5 px-3 text-slate-500">Kaggle Credit Card (284k rows)</td>
                <td className="py-2.5 px-3 font-mono text-emerald-600">ROC-AUC: 0.9469</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">3. Spending Forecast</td>
                <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400">XGBRegressor</td>
                <td className="py-2.5 px-3 text-slate-500">Linear Regression, Moving Average</td>
                <td className="py-2.5 px-3 text-slate-500">Chronological Monthly Aggregates</td>
                <td className="py-2.5 px-3 font-mono text-emerald-600">MAE / RMSE Split</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">4. Customer Segmentation</td>
                <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400">KMeans Clustering (k=5)</td>
                <td className="py-2.5 px-3 text-slate-500">Agglomerative Clustering, DBSCAN</td>
                <td className="py-2.5 px-3 text-slate-500">Standardized Consumer Ratios</td>
                <td className="py-2.5 px-3 font-mono text-emerald-600">Silhouette: 0.6137</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Security & Regulatory Standards */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span>Security Commitments & RBI Account Aggregator Compliance</span>
        </h2>
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span><strong>No Credential Storage:</strong> FinovaX never requests or stores bank login passwords, UPI PINs, ATM PINs, or OTPs.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span><strong>No Web Scraping:</strong> Bank data is imported via user-provided statements or RBI-licensed Account Aggregator digital consent artifacts.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span><strong>User Tenant Isolation:</strong> Every database query and statement batch is scoped strictly to authenticated `userId` tokens.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span><strong>Ephemerality:</strong> Uploaded statements are parsed in volatile buffer memory and immediately discarded.</span>
          </div>
        </div>
      </Card>

      {/* Frequently Asked Questions / Viva Reference */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
          Examiner / Viva Voce Frequently Asked Questions
        </h2>
        <div className="space-y-4 text-xs">
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              Q1: Why does FinovaX use IsolationForest instead of supervised classification for live fraud detection?
            </p>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Supervised fraud classification requires known ground-truth labels which do not exist for real-time consumer spending. IsolationForest is an unsupervised tree-based algorithm that isolates anomalies based on path lengths in feature space, making it robust against novel, zero-day spending anomalies without overfitting to historical labels.
            </p>
          </div>

          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              Q2: How does the system handle transfer transactions between a user's own accounts?
            </p>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Transfers between a user's own bank accounts (e.g. self NEFT or savings-to-investment transfer) are classified as `transfer` type and specifically excluded from both income and expense aggregations to prevent double-counting.
            </p>
          </div>

          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              Q3: What happens when a user attempts to generate a spending forecast with only 1 month of data?
            </p>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              The AI service strictly returns `INSUFFICIENT_DATA`. In adherence to academic integrity, the platform rejects generating fabricated projections without at least 3 consecutive months of recorded history.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

