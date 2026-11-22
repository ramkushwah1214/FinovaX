import { RiskLevel } from '../types';

/**
 * Format a number as Indian Rupee (INR) or chosen currency
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formatted = '';

  if (currency === 'INR') {
    // Format according to Indian numbering system (e.g., ₹1,25,000.00)
    formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(absAmount);
  } else if (currency === 'USD') {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(absAmount);
  } else if (currency === 'EUR') {
    formatted = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(absAmount);
  } else {
    formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0
    }).format(absAmount);
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format date string into human readable format: "14 Oct 2026"
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Compute days remaining from today to a future target date
 */
export function getDaysRemaining(targetDateStr: string): number {
  const target = new Date(targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get color styling classes based on fraud risk level
 */
export function getRiskLevelStyles(level: RiskLevel): {
  badge: string;
  text: string;
  bg: string;
  border: string;
} {
  switch (level) {
    case 'HIGH':
      return {
        badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30'
      };
    case 'MEDIUM':
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30'
      };
    case 'LOW':
      return {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30'
      };
  }
}
