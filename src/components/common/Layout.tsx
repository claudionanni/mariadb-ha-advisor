import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            HA Advisor
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            High Availability Configuration Analysis for MariaDB Clusters & MaxScale
          </p>
        </div>
      </header>
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
