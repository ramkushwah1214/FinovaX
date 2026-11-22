import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatDate } from '../utils/formatters';
import { ConsentRecord, BankConnection } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export const ConsentManagement: React.FC = () => {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchConsents();
  }, []);

  const fetchConsents = async () => {
    setIsLoading(true);
    try {
      const data = await api.bankConnections.getAll();
      setConsents(data.consents || []);
      setConnections(data.connections || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load consent records.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (connectionId?: string) => {
    if (!connectionId) return;
    if (!window.confirm('Are you sure you want to revoke consent for this bank connection? Data syncing will stop immediately.')) return;

    setRevokingId(connectionId);
    setError(null);
    try {
      await api.bankConnections.revoke(connectionId);
      setSuccess('Consent revoked successfully. Connection and linked accounts deactivated.');
      await fetchConsents();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke consent.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <ShieldAlert className="w-6 h-6 text-indigo-500" />
          <span>Connected Accounts & Consent Management</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, renew, or revoke active Account Aggregator consent records in compliance with RBI consent frameworks.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {isLoading ? (
        <Card className="p-12 text-center text-slate-500 text-sm">
          Loading active consent artifacts...
        </Card>
      ) : consents.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="No Active Consent Records"
            description="You have not granted Account Aggregator digital consent to any financial institution yet."
          />
        </Card>
      ) : (
        <Card className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Consent Artifact Handle</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Expires On</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {consents.map((c) => {
                  const conn = connections.find(co => co.providerConsentId === c.consentHandle || co._id === (c as any).connectionId);
                  const isRevocable = c.status === 'APPROVED' || c.status === 'INITIATED';

                  return (
                    <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {c.consentHandle}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{c.provider}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {c.purposeDescription}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            c.status === 'APPROVED'
                              ? 'success'
                              : c.status === 'INITIATED'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{formatDate(c.createdAt)}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">{formatDate(c.consentExpiry)}</td>
                      <td className="py-2.5 px-3 text-right">
                        {isRevocable && conn ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={revokingId === conn._id}
                            onClick={() => handleRevoke(conn._id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            {revokingId === conn._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Revoke Consent'}
                          </Button>
                        ) : (
                          <span className="text-slate-400">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

