import React, { useState, useMemo } from 'react';
import {
  CalendarCheck2,
  Plus,
  Clock,
  AlertCircle,
  Repeat,
  ShieldCheck,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { BillFrequency } from '../types';

export const Bills: React.FC = () => {
  const { bills, userProfile, addBill, updateBillStatus, isLoading } = useFinance();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const { showSuccess, showError } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Loan EMI');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [provider, setProvider] = useState('');
  const [autoDebit, setAutoDebit] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Summary Metrics
  const totalUpcomingAmount = bills
    .filter((b) => b.status === 'pending' || b.status === 'overdue')
    .reduce((sum, b) => sum + b.amount, 0);

  const overdueCount = bills.filter((b) => b.status === 'overdue').length;
  const pendingCount = bills.filter((b) => b.status === 'pending').length;
  const paidCount = bills.filter((b) => b.status === 'paid').length;

  // Filtered bills
  const filteredBills = useMemo(() => {
    if (statusFilter === 'all') return bills;
    return bills.filter((b) => b.status === statusFilter);
  }, [bills, statusFilter]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setIsModalOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    if (!title.trim()) {
      setFormError('Please enter a bill or EMI title');
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }
    if (!dueDate) {
      setFormError('Please select a due date');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');
      await addBill({
        title: title.trim(),
        amount: parsed,
        dueDate,
        category,
        frequency,
        provider: provider.trim() || 'Direct Merchant',
        autoDebit
      });

      showSuccess(`Recurring obligation "${title.trim()}" added to MongoDB`);
      setTitle('');
      setAmount('');
      setDueDate('');
      setProvider('');
      setAutoDebit(false);
      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to register recurring obligation';
      setFormError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string, billTitle: string) => {
    try {
      setUpdatingId(id);
      const nextStatus = currentStatus === 'paid' ? 'pending' : 'paid';
      await updateBillStatus(id, nextStatus as any);
      showSuccess(`Marked "${billTitle}" as ${nextStatus}`);
    } catch (err: any) {
      showError(err.message || 'Failed to update payment status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bills & Recurring EMIs
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor upcoming loan installments, utility subscriptions, and auto-debit schedules.
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
            Add Recurring Payment
          </Button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pending Obligations
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(totalUpcomingAmount, userProfile.currency)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {pendingCount + overdueCount} bills awaiting clearance
          </span>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Overdue Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-500">
            {overdueCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {overdueCount > 0 ? 'Urgent attention required' : 'Zero overdue payments'}
          </span>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Cleared Obligations
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500">
            {paidCount} Cleared
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Successfully settled records
          </span>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'all', label: `All (${bills.length})` },
          { id: 'pending', label: `Pending (${pendingCount})` },
          { id: 'overdue', label: `Overdue (${overdueCount})` },
          { id: 'paid', label: `Paid (${paidCount})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === tab.id
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bills Cards Grid */}
      {isLoading && bills.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : bills.length === 0 ? (
        <EmptyState
          title="No upcoming bills or recurring EMIs"
          description="Your MongoDB database does not contain any scheduled recurring payments. Add loans, rent, or utilities to stay ahead of due dates."
          actionLabel="Add Recurring Payment"
          onAction={() => {
            if (!isAuthenticated) setIsAuthModalOpen(true);
            else setIsModalOpen(true);
          }}
        />
      ) : filteredBills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBills.map((b) => {
            const billId = b.id || b._id || '';
            const isPaid = b.status === 'paid';
            const isOverdue = b.status === 'overdue';

            return (
              <Card
                key={billId}
                hoverable
                className={`relative overflow-hidden transition-all duration-200 ${
                  isOverdue ? 'border-rose-500/40' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <CalendarCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{b.title || b.name}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{b.provider || b.category}</p>
                    </div>
                  </div>

                  <Badge
                    variant={isPaid ? 'success' : isOverdue ? 'danger' : 'warning'}
                    dot
                  >
                    {b.status}
                  </Badge>
                </div>

                {/* Amount & Due Date */}
                <div className="space-y-1 mb-4">
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(b.amount, userProfile.currency)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Due: {formatDate(b.dueDate)}</span>
                    <span className="flex items-center gap-1 font-medium capitalize">
                      <Repeat className="w-3 h-3 text-slate-400" />
                      {b.frequency}
                    </span>
                  </div>
                </div>

                {/* Auto Debit Indicator & Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    {b.autoDebit ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Auto-Debit On
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        Manual Pay
                      </span>
                    )}
                  </div>

                  <Button
                    variant={isPaid ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={updatingId === billId}
                    onClick={() => handleToggleStatus(billId, b.status, b.title || b.name || 'Recurring Bill')}
                  >
                    {updatingId === billId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPaid ? (
                      'Mark Pending'
                    ) : (
                      'Mark as Paid'
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No bills match current filter"
          description={`There are currently no bills matching "${statusFilter}".`}
          actionLabel="Show All Bills"
          onAction={() => setStatusFilter('all')}
        />
      )}

      {/* Add Bill Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormError('');
        }}
        title="Add Recurring Obligation"
        description="Register a scheduled bill, subscription, or EMI payment in MongoDB."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Home Loan EMI or Fiber Broadband"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                placeholder="12500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Loan EMI">Loan EMI</option>
                <option value="Utilities">Utilities & Power</option>
                <option value="Internet">Internet & Telecom</option>
                <option value="Insurance">Insurance Premium</option>
                <option value="Rent">Flat / Office Rent</option>
                <option value="Subscription">Digital Subscriptions</option>
                <option value="Health">Health & Fitness</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-Time</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Provider / Merchant Name
            </label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank or State Electricity"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="autoDebit"
              checked={autoDebit}
              onChange={(e) => setAutoDebit(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="autoDebit" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Auto-Debit is active on bank account
            </label>
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
              Schedule Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
