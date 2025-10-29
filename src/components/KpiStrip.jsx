import React from "react";
import KpiMetric from "./KpiMetric";

const KpiStrip = ({
  walmartRevenue,
  walmartEbit,
  consumerEarnings,
  optedInCustomers,
  networkLiftPercent,
  showNetworkEffects,
}) => {
  // Protect against divide-by-zero / undefined props
  const safeRevenue = walmartRevenue || 0;
  const safeEbit = walmartEbit || 0;
  const safeConsumerEarnings = consumerEarnings || 0;
  const safeOptedInCustomers = optedInCustomers || 1; // avoid divide by zero
  
  // Calculate EBIT Margin: EBIT / Revenue (not royaltyMargin)
  const ebitMarginPct = safeRevenue > 0
    ? (safeEbit / safeRevenue) * 100
    : 0;
  
  // Calculate Consumer Dividend per customer per year
  const consumerDividend = safeOptedInCustomers > 0
    ? safeConsumerEarnings / safeOptedInCustomers
    : 0;

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Key Performance Indicators</h2>
        <p className="text-sm text-gray-600">Benchmarked against industry standards</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-6">
        <KpiMetric
          title="EBIT Margin"
          value={`${ebitMarginPct.toFixed(1)}%`}
          subtitle="Operating profitability"
          baseline="Baseline: 11.5%"
          tooltip="EBIT = (Revenue × Royalty Margin) − [Revenue × (Bank Share + DrumWave Share + Operating Overhead + SG&A)]. Costs shown are already deducted in this percentage."
        />
        
        <KpiMetric
          title="Consumer Dividend"
          value={`$${Math.round(consumerDividend)}`}
          subtitle="Per opt-in customer / year"
          baseline="Benchmarked vs. leading loyalty programs"
          tooltip="Average annual cash-like value a consenting shopper earns by letting Walmart license their purchase history. This creates loyalty and higher spend per household."
        />
        
        <KpiMetric
          title="Network Lift"
          value={
            showNetworkEffects
              ? `+${networkLiftPercent.toFixed(1)}%`
              : "—"
          }
          subtitle="Incremental gain from Network Effects"
          baseline="Baseline: 0%"
          tooltip="Incremental gain vs. Walmart standalone based on cumulative 36-month revenue when Network Effects are enabled."
        />
      </div>
    </div>
  );
};

export default KpiStrip;
