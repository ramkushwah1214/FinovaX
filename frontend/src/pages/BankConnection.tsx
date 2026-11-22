import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { BankConnection as IBankConnection, BankAccount, ConsentRecord } from '../types';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  PlusCircle,
  ExternalLink,
  Loader2,
  Building,
  RefreshCw
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const INSTITUTIONS = [
  { name: 'State Bank of India', code: 'SBI' },
  { name: 'HDFC Bank', code: 'HDFC' },
  { name: 'ICICI Bank', code: 'ICICI' },
  { name: 'Axis Bank', code: 'AXIS' },
  { name: 'Kotak Mahindra Bank', code: 'KOTAK' }
];

export const BankConnection: React.FC = () => {
  const { userProfile } = useFinance();
  const [connections, setConnections] = useState<IBankConnection[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('State Bank of India');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitiating, setIsInitiating] = useState<boolean>(false);
  const [activeConsentHandle, setActiveConsentHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBankData();
  }, []);

  const fetchBankData = async () => {
    setIsLoading(true);
    try {
      const data = await api.bankConnections.getAll();
      setConnections(data.connections || []);
      setAccounts(data.accounts || []);
      setConsents(data.consents || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load bank connections.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateConsent = async () => {
    setIsInitiating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.bankConnections.initiate(
        selectedBank,
        'Personal Finance Management & Smart Transaction Analytics',
        180
      );
      setActiveConsentHandle(res.consentHandle);
      setMessage('Consent request initiated. Please authorize or simulate the Account Aggregator authorization.');
      await fetchBankData();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Account Aggregator consent.');
    } finally {
      setIsInitiating(false);
    }
  };

  const handleConsentAction = async (action: 'approve' | 'reject') => {
    if (!activeConsentHandle) return;
    try {
      const res = await api.bankConnections.consentCallback(activeConsentHandle, action);
      setMessage((res as any).message || 'Account Aggregator consent processed');
      setActiveConsentHandle(null);
      await fetchBankData();
    } catch (err: any) {
      setError(err.message || 'Failed to process consent decision.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Landmark className="w-6 h-6 text-indigo-500" />
            <span>Account Aggregator & Bank Integration</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            RBI-compliant Account Aggregator framework enabling consent-driven financial data sharing.
          </p>
        </div>

        <Badge variant="info">RBI AA Sandbox Active</Badge>
      </div>

      {/* Critical Security & Compliance Commitments Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md text-xs space-y-2">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Credential Harvesting Commitment</span>
        </div>
        <p className="text-slate-300">
          FinovaX does <strong>not</strong> scrape banking websites and <strong>never</strong> requests your net-banking password, ATM PIN, or OTP. All integrations operate exclusively via authorized digital consent artifacts regulated by the Reserve Bank of India (RBI).
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Initiate Connection Card */}
      <Card className="p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center space-x-2">
          <PlusCircle className="w-4 h-4 text-indigo-500" />
          <span>Connect a Financial Institution</span>
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Select your bank to create a 180-day digital consent artifact for automated deposit statement aggregation.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {INSTITUTIONS.map((inst) => (
              <option key={inst.code} value={inst.name}>{inst.name} ({inst.code})</option>
            ))}
          </select>

          <Button
            variant="primary"
            onClick={handleInitiateConsent}
            disabled={isInitiating}
            className="w-full sm:w-auto flex items-center space-x-2"
          >
            {isInitiating && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Initiate Digital Consent</span>
          </Button>
        </div>

        {/* Pending Consent Authorization Simulation Modal/Box */}
        {activeConsentHandle && (
          <div className="mt-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Account Aggregator Sandbox Authorization
                </p>
                <p className="text-[11px] text-slate-500">
                  Consent Artifact: <span className="font-mono">{activeConsentHandle}</span>
                </p>
              </div>
              <Badge variant="warning">Awaiting Authorization</Badge>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              In a live production environment, you would be redirected to your registered AA application (e.g. Setu, Anamorphic, or OneMoney) to grant cryptographic OTP consent. In this sandbox major project mode, simulate your decision:
            </p>

            <div className="flex space-x-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleConsentAction('approve')}
              >
                Approve & Link Masked Account
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConsentAction('reject')}
              >
                Decline Consent
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Linked Accounts List */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
          <Building className="w-4 h-4 text-slate-500" />
          <span>Connected Bank Accounts ({accounts.length})</span>
        </h2>

        {accounts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No bank accounts linked yet. Use the digital consent initiator above or upload statement files.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc._id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{acc.bankName}</span>
                  <Badge variant={acc.status === 'active' ? 'success' : 'neutral'}>{acc.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono">{acc.accountNumberMasked}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Balance:</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {formatCurrency(acc.currentBalance, acc.currency || userProfile.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
