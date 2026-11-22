import React, { useState } from 'react';
import {
  Target,
  Plus,
  Calendar,
  Trash2,
  DollarSign,
  CheckCircle2
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, getDaysRemaining } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const Goals: React.FC = () => {
  const { goals, userProfile, addGoal, contributeToGoal, deleteGoal, isLoading } = useFinance();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const { showSuccess, showError } = useToast();

  // Create Goal Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('2027-12-31');
  const [category, setCategory] = useState('Savings');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Contribute Modal state
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributeError, setContributeError] = useState('');
  const [isContributing, setIsContributing] = useState(false);

  // Deletion state
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setIsCreateOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    if (!goalTitle.trim()) {
      setCreateError('Please enter a goal name');
      return;
    }
    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      setCreateError('Target amount must be greater than 0');
      return;
    }
    const current = currentAmount ? parseFloat(currentAmount) : 0;

    try {
      setIsSubmitting(true);
      setCreateError('');
      await addGoal({
        title: goalTitle.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate,
        category
      });

      showSuccess(`Goal "${goalTitle.trim()}" created successfully`);
      setGoalTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setIsCreateOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to create financial goal in MongoDB';
      setCreateError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoalId) return;
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      setContributeError('Please enter a valid contribution amount');
      return;
    }

    try {
      setIsContributing(true);
      setContributeError('');
      await contributeToGoal(contributeGoalId, amount);
      showSuccess(`Contributed ${formatCurrency(amount, userProfile.currency)} to goal`);
      setContributionAmount('');
      setContributeGoalId(null);
    } catch (err: any) {
      const msg = err.message || 'Failed to add contribution';
      setContributeError(msg);
      showError(msg);
    } finally {
      setIsContributing(false);
    }
  };

  const confirmDeleteGoal = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      await deleteGoal(itemToDelete.id);
      showSuccess(`Deleted goal "${itemToDelete.title}"`);
      setItemToDelete(null);
    } catch (err: any) {
      showError(err.message || 'Failed to delete goal');
    } finally {
      setIsDeleting(false);
    }
  };

  const activeContributeGoal = goals.find((g) => (g.id || g._id) === contributeGoalId);
  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial & Savings Goals
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track milestones for emergency reserves, investments, and major life purchases in MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (!isAuthenticated) setIsAuthModalOpen(true);
              else setIsCreateOpen(true);
            }}
          >
            Create New Goal
          </Button>
        </div>
      </div>

      {/* Aggregate Goal Progress Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Goal Corpus Progression
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(totalSaved, userProfile.currency)}{' '}
              <span className="text-sm font-semibold text-slate-400">
                / {formatCurrency(totalTarget, userProfile.currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={overallProgress >= 100 ? 'success' : 'neutral'} dot>
              {overallProgress}% Total Achieved
            </Badge>
          </div>
        </div>

        <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, overallProgress)}%` }}
          />
        </div>
      </Card>

      {/* Goal Cards Grid */}
      {isLoading && goals.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((g, idx) => {
            const goalId = g.id || g._id || '';
            const percent = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
            const daysLeft = getDaysRemaining(g.targetDate);
            const isCompleted = g.currentAmount >= g.targetAmount || g.status === 'completed';
            const color = g.color || colors[idx % colors.length];

            return (
              <Card
                key={goalId}
                hoverable
                className="relative overflow-hidden transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {g.title}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {g.category || 'Savings'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant={isCompleted ? 'success' : 'neutral'}>
                        {isCompleted ? 'Completed' : `${percent}%`}
                      </Badge>
                      <button
                        onClick={() => setItemToDelete({ id: goalId, title: g.title })}
                        disabled={isDeleting && itemToDelete?.id === goalId}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        title="Delete goal"
                        aria-label={`Delete goal ${g.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Amount Progress */}
                  <div className="space-y-1 mb-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatCurrency(g.currentAmount, userProfile.currency)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Target: {formatCurrency(g.targetAmount, userProfile.currency)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                  </div>

                  {/* Timeline Metadata */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80 mb-4">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Deadline: {formatDate(g.targetDate)}</span>
                    </span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {isCompleted ? (
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Goal Reached!
                        </span>
                      ) : daysLeft > 0 ? (
                        `${daysLeft} days remaining`
                      ) : (
                        'Past deadline'
                      )}
                    </span>
                  </div>
                </div>

                {/* Contribute Action */}
                {!isCompleted && (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      leftIcon={<DollarSign className="w-3.5 h-3.5" />}
                      onClick={() => setContributeGoalId(goalId)}
                    >
                      Contribute Funds
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No financial goals established"
          description="You have not created any goals yet. Start saving towards an emergency fund, home downpayment, or vehicle."
          actionLabel="Create First Goal"
          onAction={() => {
            if (!isAuthenticated) setIsAuthModalOpen(true);
            else setIsCreateOpen(true);
          }}
        />
      )}

      {/* Create Goal Dialog Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError('');
        }}
        title="Create New Financial Goal"
        description="Define a savings milestone with target corpus and deadline."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Goal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Emergency Reserve or Vacation"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="500000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Deposit (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Deadline *
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Savings">General Savings</option>
                <option value="Emergency">Emergency Fund</option>
                <option value="Vehicle">Vehicle Purchase</option>
                <option value="Travel">Travel & Vacation</option>
                <option value="Investment">Investment Corpus</option>
                <option value="Education">Education</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreateOpen(false);
                setCreateError('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Contribute Modal */}
      <Modal
        isOpen={!!contributeGoalId}
        onClose={() => {
          setContributeGoalId(null);
          setContributeError('');
        }}
        title={`Contribute to "${activeContributeGoal?.title || ''}"`}
        description="Add immediate funds towards your target savings milestone."
      >
        <form onSubmit={handleContributeSubmit} className="space-y-4">
          {contributeError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {contributeError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Contribution Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              step="any"
              placeholder="e.g. 5000"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setContributeGoalId(null);
                setContributeError('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isContributing}>
              Deposit Contribution
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Delete Financial Goal"
        message={`Are you sure you want to permanently delete the goal "${itemToDelete?.title}" from MongoDB? All tracked contributions will be cleared.`}
        confirmLabel="Delete Goal"
        isDestructive
        isLoading={isDeleting}
        onConfirm={confirmDeleteGoal}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
