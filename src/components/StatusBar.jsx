import React, { useState } from 'react';
import './StatusBar.css';

const StatusBar = ({ 
  scenario, 
  customMode, 
  assumptions,
  showNetworkEffects, 
  onNetworkEffectsToggle,
  onOpenConfiguration,
  standaloneRevenue,
  networkRevenue
}) => {

  // Calculate dynamic values from assumptions
  const optInRate = Math.round(assumptions.dwalletAdoption * assumptions.activeConsent * 100);
  const transactions = assumptions.annualTransactions;
  const reuseRate = assumptions.usesPerCertPerYear.toFixed(1);
  const networkRetailers = assumptions.networkRetailers || 5;

  // Calculate revenue impact
  const revenueDelta = networkRevenue - standaloneRevenue;
  const revenuePercentLift = standaloneRevenue > 0 
    ? ((networkRevenue / standaloneRevenue - 1) * 100).toFixed(1)
    : 0;

  return (
    <div className="scenario-info-box">
      <div className="scenario-info-content">
        
        {/* Left side: Current Model Status */}
        <div className="scenario-info-left">
          <div className="scenario-info-title">
            Current Model: {customMode ? 'Custom' : scenario}
          </div>
          <div className="scenario-info-params">
            {optInRate}% opt-in • {transactions} transactions/year • {reuseRate}× reuse rate
          </div>
          <button
            onClick={onOpenConfiguration}
            className="scenario-info-adjust"
          >
            <span className="scenario-info-icon">⊖</span>Adjust assumptions
          </button>
        </div>

        {/* Right side: Network Effects Toggle */}
        <div className="scenario-info-right">
          <label className="scenario-info-checkbox-container">
            <input
              type="checkbox"
              checked={showNetworkEffects}
              onChange={onNetworkEffectsToggle}
              className="scenario-info-checkbox"
            />
            <span className="scenario-info-checkbox-label">
              Network Effects
            </span>
          </label>
          
          <div className="scenario-info-network-status">
            {networkRetailers} Retailers
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;