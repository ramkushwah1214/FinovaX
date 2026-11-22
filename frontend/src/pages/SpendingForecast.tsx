import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { SpendingForecastData } from '../types';
import {
  TrendingUp,
  Brain,
  AlertCircle,
  HelpCircle,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';

export const SpendingForecast: React.FC = () => {
  const { userProfile } = useFinance();
  const [forecastData, setForecastData] = useState<SpendingForecastData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.ai.getForecast();
      setForecastData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load spending forecast.');
    } finally {
      setIsLoading(false);
    }
  };

  // Combine historical and projected data points for visual chart
  const chartData = React.useMemo(() => {
    if (!forecastData) return [];
    const list: any[] = [];
    if (forecastData.history) {
      forecastData.history.forEach(h => {
        list.push({
          month: h.month,
          actual: h.amount,
          projected: null,
          lower: null,
          upper: null
        });
      });
    }
    if (forecastData.forecasts) {
      forecastData.forecasts.forEach(f => {
        list.push({
          month: f.month,
          actual: null,
          projected: f.predictedAmount,
          lower: f.lowerBound,
          upper: f.upperBound
        });
      });
    }
    return list;
  }, [forecastData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Brain className="w-6 h-6 text-cyan-500" />
            <span>AI Spending Forecasting Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Machine learning time-series regression predicting future monthly cash outflows with confidence intervals.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="info">Previous-Period Persistence Baseline</Badge>
          <span className="text-xs text-slate-400">Strict Chronological Splits</span>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-slate-500 text-sm">
          Computing time-series projection from verified MongoDB transactions...
        </Card>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : forecastData?.status === 'INSUFFICIENT_DATA' ? (
        <Card className="p-8">
          <EmptyState
            title="Insufficient Transaction History"
            description="Spending forecasting requires at least 3 consecutive months of recorded expense data to prevent arbitrary extrapolation. Please import statements or record more historical transactions."
          />
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Academic & Statistical Policy:</p>
            <p>
              In accordance with strict algorithmic guidelines, FinovaX refuses to fabricate synthetic forecasts when user history is absent. An honest indicator of data coverage ensures reliable financial decision-making.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Historical Monthly Average</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                {formatCurrency(forecastData?.historicalAverage || 0, userProfile.currency)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Based on {forecastData?.monthsEvaluated || 0} observed months</p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Month Projected Outflow</p>
              <p className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-2">
                {formatCurrency(forecastData?.forecasts[0]?.predictedAmount || 0, userProfile.currency)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                95% Range: {formatCurrency(forecastData?.forecasts[0]?.lowerBound || 0, userProfile.currency)} – {formatCurrency(forecastData?.forecasts[0]?.upperBound || 0, userProfile.currency)}
              </p>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Forecast Horizon</p>
              <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                {forecastData?.horizonMonths || 3} Months Ahead
              </p>
              <p className="text-xs text-slate-400 mt-1">Model: {forecastData?.modelUsed}</p>
            </Card>
          </div>

          {/* Forecast Chart */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-500" />
              <span>Actual vs Predicted Outflow Trajectory</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Green line represents observed past spending; dashed cyan line indicates model predictions with confidence bands.
            </p>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    formatter={(val: any) => (val !== null ? formatCurrency(Number(val), userProfile.currency) : 'N/A')}
                  />
                  <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} name="Actual Spend" />
                  <Line type="monotone" dataKey="projected" stroke="#06B6D4" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 4 }} name="Predicted" />
                  <Area type="monotone" dataKey="upper" fill="#06B6D4" stroke="none" fillOpacity={0.15} name="Upper Bound (95%)" />
                  <Area type="monotone" dataKey="lower" fill="#FFFFFF" stroke="none" fillOpacity={0.0} name="Lower Bound (95%)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Forecast Projections Table */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
              Projected Monthly Spending Details
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Horizon Step</th>
                    <th className="py-2.5 px-3">Expected Spend</th>
                    <th className="py-2.5 px-3">Lower 95% Bound</th>
                    <th className="py-2.5 px-3">Upper 95% Bound</th>
                    <th className="py-2.5 px-3">Projected Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {forecastData?.forecasts.map((f, idx) => {
                    const diff = f.predictedAmount - (forecastData.historicalAverage || f.predictedAmount);
                    const isHigher = diff > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{f.month}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">
                          {formatCurrency(f.predictedAmount, userProfile.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{formatCurrency(f.lowerBound, userProfile.currency)}</td>
                        <td className="py-2.5 px-3 text-slate-500">{formatCurrency(f.upperBound, userProfile.currency)}</td>
                        <td className="py-2.5 px-3">
                          <span className={isHigher ? 'text-amber-500' : 'text-emerald-500'}>
                            {isHigher ? '+' : ''}{formatCurrency(diff, userProfile.currency)} vs baseline
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-start space-x-2">
              <Info className="w-4 h-4 flex-shrink-0 text-cyan-500 mt-0.5" />
              <span>{forecastData?.disclaimer}</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

