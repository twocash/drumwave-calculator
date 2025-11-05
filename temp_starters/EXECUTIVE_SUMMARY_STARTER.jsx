// ExecutiveSummary Component Starter Template
// This is a safe starting point for the UI enhancement work
// Copy this to /src/components/ExecutiveSummary/index.jsx when ready

import React from 'react';
import MetricCard from './MetricCard';
import SummaryFooter from './SummaryFooter';
import './ExecutiveSummary.css';

const ExecutiveSummary = ({ 
  data,
  showNetworkEffects = false,
  scenarioName = 'Base'
}) => {
  // Defensive programming - ensure data exists
  const safeData = data || {};
  
  // Extract and format values with safeguards
  const metrics = {
    walmartRevenue: formatBillions(safeData.walmartRevenue || 0),
    consumerEarningsTotal: formatMillions(safeData.consumerEarningsTotal || 0),
    activeCertificatePool: formatMillions(safeData.activeCertificatePool || 0, 'count'),
    ebitPerCustomer: formatDollars(safeData.ebitPerCustomer || 0),
    annualDividendPerCustomer: formatDollars(safeData.annualDividendPerCustomer || 0),
    brandReuseRate: formatMultiplier(safeData.brandReuseRate || 0),
  };

  // Format helpers
  function formatBillions(value) {
    const billions = value / 1_000_000_000;
    return `$${billions.toFixed(2)}B`;
  }

  function formatMillions(value, type = 'currency') {
    const millions = value / 1_000_000;
    if (type === 'count') {
      return `${Math.round(millions)}M`;
    }
    return `$${Math.round(millions)}M`;
  }

  function formatDollars(value) {
    return `$${value.toFixed(2)}`;
  }

  function formatMultiplier(value) {
    return `${value.toFixed(1)}x`;
  }

  return (
    <div className="executive-summary">
      {/* Header */}
      <div className="executive-summary__header">
        <h2 className="executive-summary__title">Executive Summary</h2>
        <p className="executive-summary__subtitle">
          {scenarioName} Scenario • 36-Month Projection
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="executive-summary__grid">
        {/* Top Row */}
        <MetricCard
          icon="📊"
          title="Walmart Revenue"
          value={metrics.walmartRevenue}
          subtitle="Annual data monetization revenue"
          className="metric-card--revenue"
        />
        
        <MetricCard
          icon="💵"
          title="Consumer Earnings Total"
          value={metrics.consumerEarningsTotal}
          subtitle="Total dividend pool distributed"
          className="metric-card--earnings"
        />
        
        <MetricCard
          icon="👥"
          title="Active Certificate Pool"
          value={metrics.activeCertificatePool}
          subtitle="Total participating customers"
          className="metric-card--pool"
        />

        {/* Bottom Row */}
        <MetricCard
          icon="📈"
          title="EBIT per Customer"
          value={metrics.ebitPerCustomer}
          subtitle="Per participating customer annually"
          className="metric-card--ebit"
        />
        
        <MetricCard
          icon="💰"
          title="Annual Dividend per Customer"
          value={metrics.annualDividendPerCustomer}
          subtitle="Average per active participant"
          className="metric-card--dividend"
        />
        
        <MetricCard
          icon="🔄"
          title="Brand Reuse Rate"
          value={metrics.brandReuseRate}
          subtitle="Average reuses per brand/year"
          className="metric-card--reuse"
        />
      </div>

      {/* Summary Footer */}
      <SummaryFooter
        incrementalRevenue={safeData.incrementalRevenue || 0}
        isNetworkEnabled={showNetworkEffects}
      />
    </div>
  );
};

export default ExecutiveSummary;