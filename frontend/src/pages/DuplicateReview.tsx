import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { StatementImport, StagedTransaction } from '../types';
import {
  Copy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  Split
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const DuplicateReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile, refreshData } = useFinance();

  const [statementImport, setStatementImport] = useState<StatementImport | null>(null);
  const [stagedList, setStagedList] = useState<StagedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchBatch(id);
  }, [id]);

  const fetchBatch = async (importId: string) => {
    setIsLoading(true);
    try {
      const data = await api.statements.getImportById(importId);
      setStatementImport(data);
      setStagedList(data.stagedTransactions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load duplicate review.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetExclusion = async (index: number, exclude: boolean) => {
    if (!id) return;
    try {
      await api.statements.updateStagedTransaction(id, index, { userExcluded: exclude });
      setStagedList(prev => {
        const copy = [...prev];
        copy[index] = { ...copy[index], userExcluded: exclude };
        return copy;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction.');
    }
  };

  const duplicates = stagedList
    .map((tx, originalIndex) => ({ tx, originalIndex }))
    .filter(item => item.tx.isDuplicate);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(id ? `/import/preview/${id}` : '/transactions')}
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-1 space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Import Preview</span>
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Copy className="w-6 h-6 text-amber-500" />
          <span>Duplicate Transaction Review</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Resolve transactions that match existing ledger entries by Reference ID, Date, Amount, and Counterparty.
        </p>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-slate-500 text-sm">
          Loading duplicate records...
        </Card>
      ) : duplicates.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No Duplicate Conflicts"
            description="All parsed transactions in this statement batch appear unique. No duplicate records detected."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Cautionary Duplicate Handling</p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                FinovaX does not automatically delete uncertain matches. Choose whether to exclude the incoming entry as a duplicate or keep both if legitimate.
              </p>
            </div>
          </div>

          {duplicates.map(({ tx, originalIndex }) => (
            <Card key={originalIndex} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{tx.title}</span>
                    <Badge variant={tx.direction === 'credit' ? 'success' : 'neutral'}>
                      {tx.direction === 'credit' ? 'Credit' : 'Debit'}
                    </Badge>
                    <Badge variant="warning">Matched</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Date: {formatDate(tx.date)} | Category: {tx.category} | Method: {tx.paymentMethod}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Reason: {tx.duplicateReason || 'Identical date and amount match'}
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      {formatCurrency(tx.amount, userProfile.currency)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Status: {tx.userExcluded ? 'Excluded (Duplicate)' : 'Will be imported'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {tx.userExcluded ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetExclusion(originalIndex, false)}
                      >
                        Keep Both
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSetExclusion(originalIndex, true)}
                        className="text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
                      >
                        Mark as Duplicate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              onClick={() => navigate(id ? `/import/preview/${id}` : '/transactions')}
            >
              Done Reviewing Duplicates
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

