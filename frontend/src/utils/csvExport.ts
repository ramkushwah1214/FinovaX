import { Transaction } from '../types';

/**
 * Convert transaction objects into a CSV and trigger client-side download
 */
export function exportTransactionsToCSV(transactions: Transaction[], filename: string = 'finovax-transactions.csv') {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to export.');
    return;
  }

  const headers = ['ID', 'Date', 'Title', 'Type', 'Category', 'Amount', 'Payment Method', 'Description'];
  
  const rows = transactions.map(t => [
    `"${t.id || (t as any)._id}"`,
    `"${t.date}"`,
    `"${t.title.replace(/"/g, '""')}"`,
    `"${t.type}"`,
    `"${t.category}"`,
    t.amount,
    `"${t.paymentMethod}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
