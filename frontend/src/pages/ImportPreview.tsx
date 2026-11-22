import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { StatementImport, StagedTransaction } from '../types';
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Filter,
  ShieldCheck,
  Edit2
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const AVAILABLE_CATEGORIES = [
  'Food', 'Groceries', 'Shopping', 'Travel', 'Fuel', 'Bills',
  'Healthcare', 'Education', 'Rent', 'Entertainment', 'Subscriptions',
  'Loan Payments', 'Investments', 'Salary', 'Business Income', 'Interest', 'Other Expenses'
];

export const ImportPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile, refreshData } = useFinance();

  const [statementImport, setStatementImport] = useState<StatementImport | null>(null);
  const [stagedList, setStagedList] = useState<StagedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchImportBatch(id);
  }, [id]);

  const fetchImportBatch = async (importId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.statements.getImportById(importId);
      setStatementImport(data);
      setStagedList(data.stagedTransactions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load staged import preview.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleExclude = async (index: number) => {
    if (!id || !statementImport) return;
    const current = stagedList[index];
    const newExcluded = !current.userExcluded;

    try {
      await api.statements.updateStagedTransaction(id, index, { userExcluded: newExcluded });
      setStagedList(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], userExcluded: newExcluded };
        return copy;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction.');
    }
  };

  const handleCategoryChange = async (index: number, newCategory: string) => {
    if (!id || !statementImport) return;
    try {
      await api.statements.updateStagedTransaction(id, index, { category: newCategory });
      setStagedList(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], category: newCategory, categorizationSource: 'rule_based' };
        return copy;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update category.');
    }
  };

  const handleConfirm = async () => {
    if (!id) return;
    setIsConfirming(true);
    setError(null);
    try {
      const res = await api.statements.confirmImport(id);
      setSuccessMessage(res.status === 'confirmed' ? `Import confirmed! ${res.importedCount} transactions imported.` : 'Import processed.');
      await refreshData();
      setTimeout(() => {
        navigate('/transactions');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm statement import.');
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to discard this staged import?')) return;
    try {
      await api.statements.cancelImport(id);
      navigate('/transactions');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel import.');
    }
  };

  const duplicateCount = stagedList.filter(s => s.isDuplicate).length;
  const eligibleCount = stagedList.filter(s => !s.userExcluded).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/transactions')}
            className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-1 space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Transactions</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <FileCheck2 className="w-6 h-6 text-indigo-500" />
            <span>Statement Import Preview & Staging</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review parsed records, adjust predicted categories, and resolve duplicate flags before saving to MongoDB.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {duplicateCount > 0 && id && (
            <Link
              to={`/import/duplicates/${id}`}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 transition space-x-1"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Review {duplicateCount} Duplicates</span>
            </Link>
          )}

          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isConfirming}
          >
            Discard
          </Button>

          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isConfirming || eligibleCount === 0}
            className="flex items-center space-x-2"
          >
            {isConfirming && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Confirm & Import ({eligibleCount})</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {isLoading ? (
        <Card className="p-12 text-center text-slate-500 text-sm">
          Loading staged transactions...
        </Card>
      ) : !statementImport ? (
        <Card className="p-8">
          <EmptyState
            title="Import Not Found"
            description="The requested statement import session was not found or has expired."
          />
        </Card>
      ) : (
        <>
          {/* Batch Metadata Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-xs text-slate-500 font-semibold">File Name</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                {statementImport.fileName}
              </p>
              <p className="text-[11px] text-slate-400 uppercase">{statementImport.fileType}</p>
            </Card>

            <Card className="p-4">
              <p className="text-xs text-slate-500 font-semibold">Total Records Parsed</p>
              <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                {stagedList.length}
              </p>
              <p className="text-[11px] text-slate-400">{eligibleCount} to be committed</p>
            </Card>

            <Card className="p-4">
              <p className="text-xs text-slate-500 font-semibold">Potential Duplicates</p>
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {duplicateCount}
              </p>
              <p className="text-[11px] text-slate-400">Exact ID or Date/Amount match</p>
            </Card>

            <Card className="p-4">
              <p className="text-xs text-slate-500 font-semibold">Source & Bank</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                {statementImport.bankName}
              </p>
              <p className="text-[11px] text-slate-400 capitalize">{statementImport.source.replace('_', ' ')}</p>
            </Card>
          </div>

          {/* Staged Transactions Table */}
          <Card className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Include</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Narration / Merchant</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Duplicate Status</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stagedList.map((tx, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition ${
                        tx.userExcluded ? 'opacity-40 bg-slate-50/50 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={!tx.userExcluded}
                          onChange={() => handleToggleExclude(idx)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        <div>{tx.title}</div>
                        {tx.referenceId && (
                          <div className="text-[10px] text-slate-400 font-mono">Ref: {tx.referenceId}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={tx.category}
                          onChange={(e) => handleCategoryChange(idx, e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          {AVAILABLE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={tx.direction === 'credit' ? 'success' : 'neutral'}>
                          {tx.direction === 'credit' ? 'Credit' : 'Debit'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        {tx.isDuplicate ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Potential Duplicate</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Unique</span>
                          </span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${
                        tx.direction === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {tx.direction === 'credit' ? '+' : '-'}{formatCurrency(tx.amount, userProfile.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

