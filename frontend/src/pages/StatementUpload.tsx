import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Building2,
  FileCheck
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const SUPPORTED_BANKS = [
  'Generic Bank Statement',
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank'
];

export const StatementUpload: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState<string>('Generic Bank Statement');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const processSelectedFile = (selected: File) => {
    const ext = selected.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'pdf'].includes(ext || '')) {
      setError('Unsupported format. Please select a valid CSV, XLSX, XLS, or PDF statement.');
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
      setError('Please select a file to upload.');
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      const res = await api.statements.upload(file, 'bank_statement', bankName);
      navigate(`/import/preview/${res.importId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and parse statement.');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <UploadCloud className="w-6 h-6 text-emerald-500" />
          <span>Upload Bank Statement</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Ingest account statements in CSV, Excel (XLSX), or PDF format into your unified financial transaction ledger.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleUpload} className="space-y-6">
          {/* Bank Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Issuing Financial Institution / Parser Profile</span>
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {SUPPORTED_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Drag and Drop Zone */}
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
              id="statement-file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="statement-file" className="cursor-pointer flex flex-col items-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner transition-colors ${
                isDragging
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
              }`}>
                {file ? <FileCheck className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {file ? file.name : isDragging ? 'Drop your statement file here' : 'Click to select or drag and drop your statement file'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supported formats: CSV, Excel (.xlsx/.xls), Bank PDF (Maximum 10 MB)
              </p>
              {file && (
                <span className="mt-2 inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Ready: {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </label>
          </div>

          {/* Security Notice */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Data Protection & Zero Mock Guarantee</span>
            </div>
            <p>
              Uploaded statement documents are processed in server memory, parsed into standardized records, and purged. FinovaX never archives raw unencrypted banking files on public storage and never creates transactions without your explicit preview confirmation.
            </p>
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
              <span>{isUploading ? 'Parsing Transactions...' : 'Upload & Preview Records'}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
