import React, { useState } from 'react';

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
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left side: Current Model Status with DYNAMIC values */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900">Current Model: {customMode ? 'Custom' : scenario}</span>
          </div>
          <p className="text-sm text-gray-600">
            {/* DYNAMIC values from assumptions object */}
            {optInRate}% opt-in • {transactions} transactions/year • {reuseRate}× reuse rate
          </p>
          <button
            onClick={onOpenConfiguration}
            className="text-sm text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1"
          >
            <span>⚙</span> Adjust assumptions
          </button>
        </div>

        {/* Right side: Network Effects Toggle with dynamic impact */}
        <div className="flex-1 md:text-right">
          <div className="flex items-center gap-3 md:justify-end">
            <input
              type="checkbox"
              id="networkEffectsToggle"
              checked={showNetworkEffects}
              onChange={onNetworkEffectsToggle}
              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
              aria-label="Toggle Network Effects"
            />
            <label 
              htmlFor="networkEffectsToggle"
              className="font-semibold text-gray-900 cursor-pointer select-none"
            >
              Network Effects
            </label>
          </div>
          
          <p className="text-sm text-gray-600 mt-1">
            {showNetworkEffects 
              ? `${networkRetailers} Retailers, Phased Rollout` 
              : 'Walmart Standalone'}
          </p>
          
          {/* Show actual calculated impact when network effects are on */}
          {showNetworkEffects && revenueDelta > 0 && (
            <p className="text-sm font-semibold text-green-600 mt-1">
              +${(revenueDelta / 1e9).toFixed(2)}B revenue ({revenuePercentLift}% lift)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
