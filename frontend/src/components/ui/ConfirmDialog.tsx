import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isDestructive = false,
  isLoading = false
}) => {
  const handleClose = onCancel || onClose || (() => {});
  const resolvedVariant = isDestructive ? 'danger' : variant;
  const iconConfig = {
    danger: { icon: AlertTriangle, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
    warning: { icon: AlertCircle, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    info: { icon: Info, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' }
  }[resolvedVariant];

  const Icon = iconConfig.icon;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${iconConfig.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={resolvedVariant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
