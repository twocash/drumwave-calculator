import React from 'react';

const SummaryFooter = ({
  incrementalRevenue,
  isNetworkEnabled,
  onExploreStandalone,
  onSeeNetworkEffects,
}) => {
  // Format the revenue for display
  const formatRevenue = (value) => {
    if (!value || value === 0) return '$0';
    
    const billions = value / 1_000_000_000;
    if (billions >= 1) {
      return `$${billions.toFixed(2)}B`;
    }
    
    const millions = value / 1_000_000;
    return `$${millions.toFixed(0)}M`;
  };

  return (
    <div className="summary-footer">
      <div className="summary-footer__content">
        <div className="summary-footer__metric">
          <span className="summary-footer__value">
            {formatRevenue(incrementalRevenue)}
          </span>
          <span className="summary-footer__label">
            {' '}annually from existing transactions
          </span>
        </div>
        
        <p className="summary-footer__subtitle">
          Fully incremental to Walmart Connect.
          {isNetworkEnabled && ' Network effects enabled.'}
        </p>
      </div>

      <div className="summary-footer__actions">
        <button 
          className="btn btn-primary"
          onClick={onExploreStandalone}
        >
          Explore Standalone Model →
        </button>
        <button 
          className="btn btn-secondary"
          onClick={onSeeNetworkEffects}
        >
          See Network Effects →
        </button>
      </div>
    </div>
  );
};

export default SummaryFooter;