import React from 'react';
import MetricCard from './MetricCard';
import SummaryFooter from './SummaryFooter';
import './ExecutiveSummary.css';

const ExecutiveSummary = ({ 
  walmartRevenue,           // Annual revenue
  walmart36MonthRevenue,     // 36-month total revenue
  consumerEarningsTotal,     // 36-month total consumer earnings
  activeCertificatePool,     // Actual certificate pool
  optedInCustomers,
  walmartEbit,              // Annual EBIT
  walmart36MonthEbit,        // 36-month total EBIT
  brandReuseRate = 4.2,
  showNetworkEffects = false,
  scenarioName = 'Base',
  onExploreStandalone,       // Handler for Standalone button
  onSeeNetworkEffects        // Handler for Network Effects button
}) => {
  // Safeguards against division by zero
  const safeOptedInCustomers = optedInCustomers || 1;
  
  // Calculate derived metrics
  const ebitPerCustomer = walmart36MonthEbit / safeOptedInCustomers; // 36-month EBIT per customer
  const annualDividendPerCustomer = consumerEarningsTotal / safeOptedInCustomers / 3; // Annual per customer
  
  // Format functions for display
  const formatBillions = (value, type = 'currency') => {
    if (!value) return type === 'currency' ? '$0' : '0';
    const billions = value / 1_000_000_000;
    if (type === 'count') {
      return `${billions.toFixed(2)}B`;
    }
    return `$${billions.toFixed(2)}B`;
  };

  const formatMillions = (value, type = 'currency') => {
    if (!value) return type === 'currency' ? '$0' : '0';
    const millions = value / 1_000_000;    if (type === 'count') {
      return `${Math.round(millions)}M`;
    }
    return `$${Math.round(millions)}M`;
  };

  const formatDollars = (value) => {
    if (!value || isNaN(value)) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
  };

  const formatMultiplier = (value) => {
    if (!value || isNaN(value)) return '0x';
    return `${value.toFixed(1)}x`;
  };

  return (
    <div className="executive-summary">
      {/* Metrics Grid */}
      <div className="executive-summary__grid">
        {/* Top Row */}
        <MetricCard
          icon="📊"
          title="Walmart Revenue"
          value={formatBillions(walmart36MonthRevenue || (walmartRevenue * 3))}
          subtitle="36-Month Total"
          className="metric-card--revenue"
        />
        
        <MetricCard
          icon="💵"
          title="Consumer Earnings Total"
          value={formatBillions(consumerEarningsTotal)}
          subtitle="36-Month Total"
          className="metric-card--earnings"
        />        
        <MetricCard
          icon="👥"
          title="Active Certificate Pool"
          value={formatBillions(activeCertificatePool, 'count')}
          subtitle="Month 36"
          className="metric-card--pool"
        />

        {/* Bottom Row */}
        <MetricCard
          icon="📈"
          title="EBIT per Customer"
          value={formatDollars(ebitPerCustomer)}
          subtitle="Per Opted-In Customer"
          className="metric-card--ebit"
        />
        
        <MetricCard
          icon="💰"
          title="Annual Dividend per Customer"
          value={formatDollars(annualDividendPerCustomer)}
          subtitle="Average Annual Earnings"
          className="metric-card--dividend"
        />
        
        <MetricCard
          icon="🔄"
          title="Brand Reuse Rate"
          value={formatMultiplier(brandReuseRate)}
          subtitle="Average reuses per brand/year"
          className="metric-card--reuse"
        />
      </div>

      {/* Summary Footer */}
      <SummaryFooter
        incrementalRevenue={walmartRevenue}
        isNetworkEnabled={showNetworkEffects}
        onExploreStandalone={onExploreStandalone}
        onSeeNetworkEffects={onSeeNetworkEffects}
      />
    </div>
  );
};

export default ExecutiveSummary;