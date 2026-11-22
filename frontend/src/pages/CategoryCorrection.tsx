import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Tag,
  Brain,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  Loader2
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const CATEGORIES = [
  'Food', 'Groceries', 'Shopping', 'Travel', 'Fuel', 'Bills',
  'Healthcare', 'Education', 'Rent', 'Entertainment', 'Subscriptions',
  'Loan Payments', 'Investments', 'Salary', 'Business Income', 'Interest', 'Other Expenses'
];

export const CategoryCorrection: React.FC = () => {
  const { transactions, userProfile, refreshData } = useFinance();
  const { showSuccess, showError } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [testAmount, setTestAmount] = useState('450');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isRetraining, setIsRetraining] = useState(false);

  const filtered = transactions.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTestCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle) return;
    setIsTesting(true);
    try {
      const res = await api.ai.categorize(testTitle, Number(testAmount) || 0);
      setTestResult(res);
    } catch {
      setTestResult({
        category: 'Other Expenses',
        subcategory: 'Fallback',
        confidence: 0.5,
        source: 'rule_based'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleUpdateCategory = async (txId: string, newCat: string) => {
    setUpdatingId(txId);
    try {
      const targetTx = transactions.find(t => (t.id || (t as any)._id) === txId);
      await api.transactions.update(txId, {
        category: newCat,
        categorizationStatus: 'manual',
        userReviewedStatus: true
      });

      // Persist user correction to AI service for continuous active retraining
      if (targetTx) {
        api.ai.recordCategoryCorrection({
          title: targetTx.title,
          category: newCat,
          previousCategory: targetTx.category
        }).catch(() => {});
      }

      await refreshData();
      showSuccess(`Category updated to "${newCat}" and saved for AI retraining.`);
    } catch (err: any) {
      showError(err.message || 'Failed to update category.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    try {
      await api.ai.retrainModels(['categorization']);
      showSuccess('AI Categorization model successfully retrained with user corrections!');
    } catch (err: any) {
      showError(err.message || 'Retraining request failed.');
    } finally {
      setIsRetraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Tag className="w-6 h-6 text-indigo-500" />
            <span>Category Intelligence & Correction Studio</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review automated ML predictions, test natural-language merchant classification, and adjust transaction labels.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRetrain}
          disabled={isRetraining}
          className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
        >
          {isRetraining ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Retraining Model...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Retrain with Corrections
            </span>
          )}
        </Button>
      </div>

      {/* AI Classifier Sandbox */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center space-x-2">
          <Brain className="w-4 h-4 text-indigo-500" />
          <span>Real-Time AI Categorization Test Bench</span>
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Test how FinovaX evaluates merchant narrations using RandomForest with TF-IDF and deterministic fallback rules.
        </p>

        <form onSubmit={handleTestCategory} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="e.g. Swiggy Bangalore or Uber Airport Trip"
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <input
            type="number"
            value={testAmount}
            onChange={(e) => setTestAmount(e.target.value)}
            placeholder="Amount"
            className="w-28 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <Button type="submit" variant="primary" disabled={isTesting || !testTitle}>
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            <span>Classify</span>
          </Button>
        </form>

        {testResult && (
          <div className="mt-4 p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-indigo-900 dark:text-indigo-200">Predicted Category: </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{testResult.category}</span>
              <span className="text-slate-400 ml-2">({testResult.subcategory || 'General'})</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="info">{(testResult.confidence * 100).toFixed(0)}% Confidence</Badge>
              <Badge variant="neutral">{testResult.source === 'ml' ? 'Random Forest ML' : 'Rule-Based Fallback'}</Badge>
            </div>
          </div>
        )}
      </Card>

      {/* Transactions Category Review */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Transaction Reclassification ({filtered.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search narration or category..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Narration</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Current Category</th>
                <th className="py-2.5 px-3">Reassign Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.slice(0, 25).map((t) => (
                <tr key={t.id || t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{formatDate(t.date)}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">{t.title}</td>
                  <td className={`py-2.5 px-3 font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
                    {formatCurrency(t.amount, userProfile.currency)}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant={t.type === 'income' ? 'success' : 'neutral'}>{t.category}</Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      value={t.category}
                      disabled={updatingId === (t.id || t._id)}
                      onChange={(e) => handleUpdateCategory(t.id || t._id || '', e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

