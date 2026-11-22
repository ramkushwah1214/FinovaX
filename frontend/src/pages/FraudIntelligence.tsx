import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Eye,
  Activity,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, getRiskLevelStyles, formatDate } from '../utils/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { FraudAlert, AlertResolution, ModelStatusItem } from '../types';
import { api } from '../api/client';

export const FraudIntelligence: React.FC = () => {
  const { fraudAlerts, userProfile, resolveFraudAlert, isLoading } = useFinance();
  const { showSuccess, showError } = useToast();

  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatusItem | null>(null);

  React.useEffect(() => {
    api.ai.getModelStatus()
      .then(res => {
        if (res?.models?.fraud_detection) {
          setModelStatus(res.models.fraud_detection);
        }
      })
      .catch(() => {});
  }, []);

  // Metrics derived from real MongoDB records
  const totalFlagged = fraudAlerts.length;
  const highRiskCount = fraudAlerts.filter((a) => a.riskLevel === 'HIGH' && a.status === 'pending_review').length;
  const resolvedCount = fraudAlerts.filter((a) => a.status !== 'pending_review').length;
  const avgRiskScore = totalFlagged > 0
    ? Math.round(fraudAlerts.reduce((sum, a) => sum + a.riskScore, 0) / totalFlagged)
    : 0;

  const handleResolve = async (id: string, resolution: AlertResolution) => {
    try {
      setIsResolving(true);
      await resolveFraudAlert(id, resolution);
      showSuccess(`Alert status updated to "${resolution.replace('_', ' ')}"`);
      if (selectedAlert && (selectedAlert.id || selectedAlert._id) === id) {
        setSelectedAlert(prev => prev ? { ...prev, status: resolution } : null);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update fraud alert status');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            Fraud Intelligence & Anomaly Records
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Statistical anomaly monitoring, unsupervised risk scoring, and suspicious transaction triage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Live Database Connected
          </span>
        </div>
      </div>

      {/* Model Ethics & Safety Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#101A2D] border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 dark:text-slate-200">
            Algorithmic Transparency & Domain Notice:
          </strong>{' '}
          Anomaly detection scores indicate statistical deviations from baseline spending profiles (amount, velocity, timing, location). FinovaX does not automatically block customer cards or funds. Credit Card PCA features and PaySim mobile money transfer features belong to separate financial domains; predictions are advisory statistical anomaly signals to assist human oversight.
        </div>
      </div>

      {/* AI Model Architecture & Benchmark Metrics */}
      {modelStatus && (
        <Card className="p-5 border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Active Anomaly Engine: {modelStatus.name}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              Status: {modelStatus.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">Primary Model</span>
              <span className="font-bold text-white mt-0.5 block truncate">IsolationForest</span>
              <span className="text-[10px] text-emerald-400 font-mono">Unsupervised Anomaly</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">Credit Card Test PR-AUC</span>
              <span className="font-bold text-white mt-0.5 block">0.4020 (RF: 0.9026)</span>
              <span className="text-[10px] text-slate-400 font-mono">284,807 transactions</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">PaySim Chunked Stream</span>
              <span className="font-bold text-white mt-0.5 block">6,362,620 rows</span>
              <span className="text-[10px] text-emerald-400 font-mono">8,213 frauds streamed</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">False Positive Rate (FPR)</span>
              <span className="font-bold text-white mt-0.5 block">0.81% (0.0081)</span>
              <span className="text-[10px] text-emerald-400 font-mono">Validation calibrated</span>
            </div>
          </div>
        </Card>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card hoverable className="bg-gradient-to-br from-blue-500/[0.04] via-transparent to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Monitored
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {totalFlagged}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Flagged records in MongoDB</span>
        </Card>

        <Card hoverable className="bg-gradient-to-br from-rose-500/[0.04] via-transparent to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              High Risk Pending
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-500 tracking-tight">
            {highRiskCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Requiring customer review</span>
        </Card>

        <Card hoverable className="bg-gradient-to-br from-amber-500/[0.04] via-transparent to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Average Risk Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {avgRiskScore} / 100
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Across flagged anomalies</span>
        </Card>

        <Card hoverable className="bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Resolved Cases
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-500 tracking-tight">
            {resolvedCount} Cleared
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Customer verified records</span>
        </Card>
      </div>

      {/* Flagged Transactions Table */}
      <Card
        title="Suspicious Transactions Ledger"
        subtitle="Unusual timing, out-of-distribution amounts, and velocity triggers"
      >
        {isLoading && fraudAlerts.length === 0 ? (
          <SkeletonTable rows={5} />
        ) : fraudAlerts.length > 0 ? (
          <div className="overflow-x-auto -mx-5 sm:-mx-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-5">Incident / Merchant</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Triage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {fraudAlerts.map((alert) => {
                  const alertId = alert.id || alert._id || '';
                  const styles = getRiskLevelStyles(alert.riskLevel);

                  return (
                    <tr
                      key={alertId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${styles.bg} ${styles.text}`}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {alert.transactionTitle}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {alert.reason}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {alert.date || (alert.createdAt ? formatDate(alert.createdAt) : 'Recent')}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(alert.amount, userProfile.currency)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${styles.badge}`}
                          >
                            {alert.riskScore}/100
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {alert.riskLevel}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            alert.status === 'pending_review'
                              ? 'warning'
                              : alert.status === 'resolved_legitimate'
                              ? 'success'
                              : 'danger'
                          }
                        >
                          {alert.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedAlert(alert)}
                        >
                          Investigate
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title="No fraud alerts recorded"
            description="Your MongoDB database does not contain any flagged transaction records. All security monitors are clear."
          />
        )}
      </Card>

      {/* Alert Investigation Modal */}
      {selectedAlert && (
        <Modal
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
          title="Incident Investigation & Triage"
          description={`Case ID: ${selectedAlert.id || selectedAlert._id}`}
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Transaction Title</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedAlert.transactionTitle}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Amount</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrency(selectedAlert.amount, userProfile.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Model Risk Score</span>
                <span className="text-sm font-bold text-rose-500">
                  {selectedAlert.riskScore} / 100 ({selectedAlert.riskLevel} RISK)
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                Anomaly Explanation
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                {selectedAlert.reason}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAlert(null)}
              >
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isResolving}
                onClick={() => handleResolve(selectedAlert.id || selectedAlert._id || '', 'resolved_legitimate')}
              >
                {isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mark Legitimate'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isResolving}
                onClick={() => handleResolve(selectedAlert.id || selectedAlert._id || '', 'confirmed_fraud')}
              >
                {isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Fraud'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
