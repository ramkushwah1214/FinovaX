import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatDate } from '../utils/formatters';
import { StatementImport } from '../types';
import {
  History,
  FileSpreadsheet,
  Smartphone,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export const ImportHistory: React.FC = () => {
  const [imports, setImports] = useState<StatementImport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.statements.getImports();
      setImports(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch import history.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <History className="w-6 h-6 text-indigo-500" />
            <span>Statement Ingestion Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical audit log of all imported bank statements, Google Pay sheets, and ledger commits.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/import/statement"
            className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            Upload Statement
          </Link>
          <Link
            to="/import/gpay"
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Google Pay
          </Link>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-slate-500 text-sm">
          Loading statement import history...
        </Card>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : imports.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No Statements Uploaded Yet"
            description="You have not uploaded any statements yet. Upload CSV, Excel, or PDF bank statements to populate your transaction ledger."
          />
        </Card>
      ) : (
        <Card className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Source & Bank</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Records Found</th>
                  <th className="py-2.5 px-3">Imported</th>
                  <th className="py-2.5 px-3">Duplicates</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {imports.map((item) => (
                  <tr key={item._id || item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                      {item.source === 'gpay' ? (
                        <Smartphone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      )}
                      <span className="truncate max-w-xs">{item.fileName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{item.bankName}</td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          item.status === 'confirmed'
                            ? 'success'
                            : item.status === 'preview_ready'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{item.totalRecords}</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.importedCount}
                    </td>
                    <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400 font-semibold">
                      {item.duplicateCount}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.status === 'preview_ready' ? (
                        <Link
                          to={`/import/preview/${item._id || item.id}`}
                          className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Resume Preview</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

