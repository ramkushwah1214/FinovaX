import { Transaction } from '../types';

/**
 * Convert transaction objects into a CSV and trigger client-side download
 */
export function exportTransactionsToCSV(transactions: Transaction[], filename: string = 'finovax-transactions.csv') {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to export.');
    return;
  }

  // Pre-allocated single-pass array builder: O(N) time & linear space without intermediate 2D arrays
  const lines = new Array(transactions.length + 1);
  lines[0] = 'ID,Date,Title,Type,Category,Amount,Payment Method,Description';

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const id = t.id || (t as any)._id || '';
    const title = (t.title || '').replace(/"/g, '""');
    const desc = (t.description || '').replace(/"/g, '""');
    lines[i + 1] = `"${id}","${t.date}","${title}","${t.type}","${t.category}",${t.amount},"${t.paymentMethod}","${desc}"`;
  }

  const csvContent = lines.join('\r\n');
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
