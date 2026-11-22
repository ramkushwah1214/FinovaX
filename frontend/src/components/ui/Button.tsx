import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'teal';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none';

  const sizeStyles = {
    sm: 'min-h-[34px] px-3 py-1.5 text-xs gap-1.5',
    md: 'min-h-[40px] px-4 py-2 text-xs sm:text-sm gap-2',
    lg: 'min-h-[46px] px-5 py-2.5 text-sm sm:text-base gap-2.5'
  }[size];

  const variantStyles = {
    primary:
      'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/25 focus-visible:ring-emerald-500 dark:focus-visible:ring-offset-[#090E17]',
    teal:
      'bg-teal-500 hover:bg-teal-600 text-white shadow-sm shadow-teal-500/25 focus-visible:ring-teal-500 dark:focus-visible:ring-offset-[#090E17]',
    secondary:
      'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-[#090E17]',
    danger:
      'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/25 focus-visible:ring-rose-500 dark:focus-visible:ring-offset-[#090E17]',
    ghost:
      'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-[#090E17]',
    outline:
      'border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 focus-visible:ring-emerald-500 dark:focus-visible:ring-offset-[#090E17]'
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
