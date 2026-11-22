import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { SpendingSegmentationData } from '../types';
import {
  Users,
  Brain,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  PieChart as PieIcon,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const SpendingSegmentation: React.FC = () => {
  const { userProfile } = useFinance();
  const [segmentData, setSegmentData] = useState<SpendingSegmentationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSegmentation();
  }, []);

  const fetchSegmentation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.ai.getSegmentation();
      setSegmentData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to compute spending segmentation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Users className="w-6 h-6 text-purple-500" />
            <span>Customer Spending Segmentation</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unsupervised KMeans clustering evaluating user spending archetypes, discretionary ratios, and habits.
          </p>
        </div>

        <Badge variant="info">KMeans (k=5) + Scaled Archetypes</Badge>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-slate-500 text-sm">
          Analyzing user transaction behaviors against customer archetype centroids...
        </Card>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : segmentData?.status === 'INSUFFICIENT_DATA' ? (
        <Card className="p-8">
          <EmptyState
            title="Awaiting Transaction Activity"
            description="Spending segmentation requires real transactions to calculate essential-to-discretionary ratios and frequency metrics. Please add or import financial data."
          />
        </Card>
      ) : (
        <>
          {/* Persona Hero Banner */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span>Identified Financial Persona (Cluster #{segmentData?.clusterId})</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {segmentData?.persona}
              </h2>
              <p className="mt-2 text-sm text-purple-100 max-w-xl">
                Classified by FinovaX unsupervised clustering engine based on your actual essential vs discretionary outflow ratio, savings rate, and velocity.
              </p>
            </div>
          </div>

          {/* Persona Characteristics & Metrics */}
          {segmentData?.features && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase">Essential Needs Ratio</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {Math.round(segmentData.features.essentialRatio * 100)}%
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Bills, rent, groceries, fuel</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase">Discretionary Ratio</p>
                <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {Math.round(segmentData.features.discretionaryRatio * 100)}%
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Dining, entertainment, shopping</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase">Estimated Savings Rate</p>
                <p className="text-xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-1">
                  {Math.round(segmentData.features.savingsRate * 100)}%
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Net cash retained from inflows</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase">Transaction Velocity</p>
                <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                  {segmentData.features.transactionFrequency} Txns
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Recorded historical activity</p>
              </Card>
            </div>
          )}

          {/* Actionable Tailored Recommendations */}
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              <span>Persona-Driven Financial Strategies</span>
            </h2>

            <div className="space-y-3">
              {segmentData?.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start space-x-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

