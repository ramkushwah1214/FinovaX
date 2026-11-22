import React, { useState } from 'react';
import {
  Plus,
  AlertTriangle,
  TrendingDown,
  Layers,
  Trash2,
  PieChart
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const Budgets: React.FC = () => {
  const { budgets, userProfile, addBudget, deleteBudget, isLoading } = useFinance();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const { showSuccess, showError } = useToast();

  // Create Budget Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('Groceries');
  const [allocated, setAllocated] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion state
  const [itemToDelete, setItemToDelete] = useState<{ id: string; category: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Total calculations
  const totalAllocated = budgets.reduce((sum, b) => sum + (b.allocated || b.limitAmount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalRemaining = Math.max(0, totalAllocated - totalSpent);
  const overallUtilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
  const exceededCount = budgets.filter((b) => (b.spent || 0) > (b.allocated || b.limitAmount || 0)).length;

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setIsModalOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    const parsedAllocated = parseFloat(allocated);
    if (isNaN(parsedAllocated) || parsedAllocated <= 0) {
      setFormError('Please enter a valid allocation amount greater than 0');
      return;
    }

    // Check if category already exists
    const existing = budgets.find((b) => b.category.toLowerCase() === category.trim().toLowerCase());
    if (existing) {
      setFormError(`A budget for "${category.trim()}" already exists.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');
      await addBudget({
        category: category.trim(),
        limitAmount: parsedAllocated
      });

      showSuccess(`Budget for "${category.trim()}" created successfully`);
      setAllocated('');
      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to create budget in MongoDB';
      setFormError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteBudget = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      await deleteBudget(itemToDelete.id);
      showSuccess(`Deleted budget for "${itemToDelete.category}"`);
      setItemToDelete(null);
    } catch (err: any) {
      showError(err.message || 'Failed to delete budget');
    } finally {
      setIsDeleting(false);
    }
  };

  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Category Budgets
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Set spending ceilings per category and monitor threshold consumption computed from live transactions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (!isAuthenticated) setIsAuthModalOpen(true);
              else setIsModalOpen(true);
            }}
          >
            Create Budget
          </Button>
        </div>
      </div>

      {/* Exceeded alert banner */}
      {exceededCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Budget Limit Warning:</strong> {exceededCount} category has exceeded its allocated limit based on your recorded expenses.
            </span>
          </div>
        </div>
      )}

      {/* Aggregate Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Budget Pool
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(totalAllocated, userProfile.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {budgets.length} active spending categories
          </span>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Spent (This Month)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(totalSpent, userProfile.currency)}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <Badge variant={overallUtilization > 90 ? 'danger' : 'warning'}>
              {overallUtilization}% Utilized
            </Badge>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Available Remaining Buffer
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500">
            {formatCurrency(totalRemaining, userProfile.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Remaining unspent budget buffer
          </span>
        </Card>
      </div>

      {/* Category Budget Cards Grid */}
      {isLoading && budgets.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((b, idx) => {
            const budgetId = b.id || b._id || '';
            const allocatedAmt = b.allocated || b.limitAmount || 0;
            const spentAmt = b.spent || 0;
            const percent = allocatedAmt > 0 ? Math.min(100, Math.round((spentAmt / allocatedAmt) * 100)) : 0;
            const isOver = spentAmt > allocatedAmt;
            const remaining = allocatedAmt - spentAmt;
            const color = b.color || colors[idx % colors.length];

            return (
              <Card
                key={budgetId}
                hoverable
                className={`relative overflow-hidden transition-all duration-200 ${
                  isOver ? 'border-rose-500/40' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{b.category}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={isOver ? 'danger' : percent > 85 ? 'warning' : 'success'}>
                      {percent}%
                    </Badge>
                    <button
                      onClick={() => setItemToDelete({ id: budgetId, category: b.category })}
                      disabled={isDeleting && itemToDelete?.id === budgetId}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      title="Delete budget"
                      aria-label={`Delete budget for ${b.category}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Amount Figures */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-slate-900 dark:text-white">
                      {formatCurrency(spentAmt, userProfile.currency)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      of {formatCurrency(allocatedAmt, userProfile.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Period: {b.period || 'Current Month'}</span>
                    <span
                      className={
                        isOver ? 'text-rose-500 font-semibold' : 'text-emerald-500 font-semibold'
                      }
                    >
                      {isOver
                        ? `Exceeded by ${formatCurrency(Math.abs(remaining), userProfile.currency)}`
                        : `${formatCurrency(remaining, userProfile.currency)} remaining`}
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver
                        ? 'bg-rose-500'
                        : percent > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No category budgets configured"
          description="You have not created any budgets yet. Establish monthly spending ceilings to track threshold utilization and avoid overspending."
          actionLabel="Create First Budget"
          onAction={() => {
            if (!isAuthenticated) setIsAuthModalOpen(true);
            else setIsModalOpen(true);
          }}
        />
      )}

      {/* Create Budget Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormError('');
        }}
        title="Create Category Budget"
        description="Establish spending limits for a specific category in MongoDB."
      >
        <form onSubmit={handleCreateBudget} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Food & Dining or Shopping"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Monthly Limit Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              step="any"
              placeholder="15000"
              value={allocated}
              onChange={(e) => setAllocated(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                setFormError('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Create Budget
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Delete Budget"
        message={`Are you sure you want to permanently delete the budget for "${itemToDelete?.category}"? This action cannot be undone.`}
        confirmLabel="Delete Budget"
        isDestructive
        isLoading={isDeleting}
        onConfirm={confirmDeleteBudget}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
