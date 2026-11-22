import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  headerAction,
  hoverable = false
}) => {
  return (
    <div
      className={`glass-panel rounded-2xl p-5 sm:p-6 transition-all duration-200 ${
        hoverable ? 'card-hover' : ''
      } ${className}`}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800/80 gap-2">
          <div>
            {title && (
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="self-start sm:self-center">{headerAction}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
