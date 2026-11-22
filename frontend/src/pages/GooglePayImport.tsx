import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  Smartphone,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  ShieldAlert,
  FileCheck
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const GooglePayImport: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const processSelectedFile = (selected: File) => {
    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf') {
      setError('Google Pay statements must be in PDF format exported directly from Google Pay or Google Takeout.');
      setFile(null);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError(`File size (${(selected.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 10 MB.`);
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select your Google Pay activity statement PDF.');
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      const res = await api.statements.upload(file, 'gpay', 'Google Pay UPI');
      navigate(`/import/preview/${res.importId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to parse Google Pay statement.');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Smartphone className="w-6 h-6 text-emerald-500" />
          <span>Google Pay Statement Ingestion</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Import and categorize your UPI transactions directly from your Google Pay activity statement.
        </p>
      </div>

      {/* Critical Limitation & Security Disclosure */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs space-y-2">
        <div className="font-bold flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Important Disclosure & Architecture Limitations</span>
        </div>
        <p>
          Google does not provide a public direct API for third-party automated access to user Google Pay accounts. FinovaX will <strong>never</strong> ask for your Google account credentials, UPI PIN, OTP, or debit card numbers.
        </p>
        <p className="text-amber-800/80 dark:text-amber-300/80">
          A Google Pay activity statement represents transactions completed through the Google Pay application only and does not contain bank account balances or offline cash withdrawals.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Form */}
      <Card className="p-6 sm:p-8">
        <form onSubmit={handleUpload} className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 bg-slate-50/50 dark:bg-slate-900/50'
            }`}
          >
            <input
              type="file"
              id="gpay-file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="gpay-file" className="cursor-pointer flex flex-col items-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner transition-colors ${
                isDragging
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
              }`}>
                {file ? <FileCheck className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {file ? file.name : isDragging ? 'Drop your Google Pay PDF statement here' : 'Select or drag and drop your Google Pay statement (PDF)'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Accepted: Google Pay transaction summary PDF (Maximum 10 MB)
              </p>
              {file && (
                <span className="mt-2 inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Ready: {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
            </label>
          </div>

          {/* Export Instructions Accordion / Steps */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              How to export your statement from the Google Pay app:
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li>Open Google Pay on your mobile device and tap your profile avatar (top right).</li>
              <li>Navigate to <strong>Manage Google Account</strong> or <strong>Data & Privacy</strong>.</li>
              <li>Under Activity & Timeline, select <strong>Google Pay Activity</strong>.</li>
              <li>Choose <strong>Download Statement / Export as PDF</strong> for your desired date range.</li>
              <li>Upload the downloaded PDF here for automated UPI parsing and duplicate review.</li>
            </ol>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/transactions')}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!file || isUploading}
              className="flex items-center space-x-2"
            >
              {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isUploading ? 'Extracting UPI Transactions...' : 'Upload & Review Preview'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
