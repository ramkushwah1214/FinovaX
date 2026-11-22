import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Printer,
  Download,
  Calendar,
  Loader2,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { formatCurrency } from '../utils/formatters';
import { exportTransactionsToCSV } from '../utils/csvExport';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ReportSummary, ReportCategoryItem } from '../types';

export const Reports: React.FC = () => {
  const { transactions, userProfile } = useFinance();
  const { isAuthenticated } = useAuth();

  const [dateRange, setDateRange] = useState<'30d' | '90d' | 'ytd' | 'all'>('30d');
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [cashFlowTimeline, setCashFlowTimeline] = useState<Array<{ period: string; income: number; expense: number; savings: number }>>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<ReportCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch real report data from backend on dateRange or auth change
  useEffect(() => {
    if (!isAuthenticated) {
      setReportSummary({
        grossInflow: 0,
        grossOutflow: 0,
        netSavings: 0,
        savingsRate: 0,
        transactionCount: 0,
        range: dateRange,
        endDate: new Date().toISOString().split('T')[0]
      });
      setCashFlowTimeline([]);
      setCategoryBreakdown([]);
      return;
    }

    async function loadReports() {
      try {
        setIsLoading(true);
        setFetchError(null);

        const [sumRes, flowRes, catRes] = await Promise.all([
          api.reports.getSummary(dateRange),
          api.reports.getCashFlow(dateRange),
          api.reports.getCategoryBreakdown(dateRange)
        ]);

        setReportSummary(sumRes.summary);
        setCashFlowTimeline(flowRes.progression || []);
        setCategoryBreakdown(catRes.categories || []);
      } catch (err: any) {
        setFetchError(err.message || 'Failed to generate report from MongoDB');
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, [dateRange, isAuthenticated]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    exportTransactionsToCSV(transactions, `finovax-financial-report-${dateRange}-${Date.now()}.csv`);
  };

  const hasData = reportSummary && reportSummary.transactionCount > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileBarChart2 className="w-6 h-6 text-emerald-500" />
            Financial Intelligence Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Comprehensive audit of inflows, spending velocity, and capital allocation from MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={handlePrint}
          >
            Print Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExport}
            disabled={!hasData}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Selector Pill */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 no-print">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Reporting Window:
          </span>
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />}
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last Quarter (90d)' },
            { id: 'ytd', label: 'Year to Date' },
            { id: 'all', label: 'All Time' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateRange(tab.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                dateRange === tab.id
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {fetchError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-medium">
          {fetchError}
        </div>
      )}

      {/* Metric Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card hoverable className="bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Gross Inflow
          </span>
          <div className="text-2xl font-black text-emerald-500 mt-1 tracking-tight">
            {formatCurrency(reportSummary?.grossInflow || 0, userProfile.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Within selected window</span>
        </Card>

        <Card hoverable className="bg-gradient-to-br from-rose-500/[0.04] via-transparent to-transparent">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Gross Outflow
          </span>
          <div className="text-2xl font-black text-rose-500 mt-1 tracking-tight">
            {formatCurrency(reportSummary?.grossOutflow || 0, userProfile.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Total debits in period</span>
        </Card>

        <Card hoverable className="bg-gradient-to-br from-blue-500/[0.04] via-transparent to-transparent">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Net Surplus / Savings
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            {formatCurrency(reportSummary?.netSavings || 0, userProfile.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Inflow minus outflow</span>
        </Card>

        <Card hoverable className="bg-gradient-to-br from-purple-500/[0.04] via-transparent to-transparent">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Calculated Savings Rate
          </span>
          <div className="text-2xl font-black text-purple-500 mt-1 tracking-tight">
            {reportSummary?.savingsRate || 0}%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {reportSummary?.transactionCount || 0} transactions
          </span>
        </Card>
      </div>

      {/* Cashflow Progression Area Chart */}
      <Card
        title="Income vs. Expense Progression"
        subtitle={`Aggregated timeline progression across ${dateRange.toUpperCase()}`}
        headerAction={
          <Badge variant="neutral">
            Window: {reportSummary?.startDate ? reportSummary.startDate : 'Start'} to {reportSummary?.endDate}
          </Badge>
        }
      >
        <div className="h-72 w-full pt-4">
          {cashFlowTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val) || 0, userProfile.currency)}
                  contentStyle={{
                    backgroundColor: '#090E17',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    color: '#F8FAFC',
                    fontSize: '12px',
                    padding: '10px 14px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#incomeColor)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#expenseColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <BarChart3 className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No financial records in this timeframe
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Log transactions within this date window to see actual cashflow charts.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Category Breakdown Table */}
      <Card
        title="Category-wise Spending Audit"
        subtitle="Distribution of total expenses across categories for this period"
      >
        {categoryBreakdown.length > 0 ? (
          <div className="overflow-x-auto -mx-5 sm:-mx-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-4">Transaction Count</th>
                  <th className="py-3 px-4">Share of Spend</th>
                  <th className="py-3 px-5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {categoryBreakdown.map((cat) => (
                  <tr key={cat.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                      {cat.category}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {cat.count} transactions
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          {cat.percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(cat.amount, userProfile.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No expense data available"
            description="There are no expense records in your MongoDB database for the selected reporting window."
          />
        )}
      </Card>
    </div>
  );
};
