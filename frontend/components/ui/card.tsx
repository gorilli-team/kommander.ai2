'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={`rounded-lg shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => {
  return (
    <h2 className={`text-lg font-bold text-gray-900 dark:text-white ${className}`}>{children}</h2>
  );
};

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => {
  return <div className={`px-4 py-4 ${className}`}>{children}</div>;
};