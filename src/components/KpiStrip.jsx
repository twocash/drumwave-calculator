import React, { useState } from "react";
import "./KpiStrip.css";

const KpiStrip = ({
  walmartRevenue,
  walmartEbit,
  consumerEarnings,
  optedInCustomers,
  networkLiftPercent,
  showNetworkEffects,
}) => {
  // Tooltip state
  const [tooltipInfo, setTooltipInfo] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    metric: ''
  });
  
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

  // Tooltip content definitions
  const tooltips = {
    ebit: `Walmart's share of marketplace revenue after all costs. Every dollar earned here is pure incremental profit—an ${ebitMarginPct.toFixed(0)}%+ margin business built on data, not inventory.`,
    consumer: `The annual reward shoppers earn for sharing their purchase data with consent. It turns privacy into loyalty—creating a reason to shop more, not just save more.`,
    network: `As more retailers and data partners join, each certificate becomes more valuable. Brands gain a more complete view of the customer, connecting purchases across stores and categories. Greater accuracy means less ad waste, higher ROI, and stronger demand for Walmart's data—driving roughly a ${networkLiftPercent.toFixed(0)}% revenue lift on the same certificates.`
  };

  // Handle mouse enter on metric card
  const handleMouseEnter = (metric, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipInfo({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      content: tooltips[metric],
      metric
    });
  };

  // Handle mouse move to update tooltip position
  const handleMouseMove = (event) => {
    if (tooltipInfo.visible) {
      setTooltipInfo(prev => ({
        ...prev,
        x: event.clientX,
        y: event.clientY
      }));
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setTooltipInfo({
      visible: false,
      x: 0,
      y: 0,
      content: '',
      metric: ''
    });
  };

  return (
    <div className="kpi-strip">
      {/* Section Header */}
      <div className="kpi-strip__header">
        <h2 className="kpi-strip__title">Key Performance Indicators</h2>
        <p className="kpi-strip__subtitle">Benchmarked against industry standards</p>
      </div>

      {/* KPI Grid */}
      <div className="kpi-strip__grid">
        {/* EBIT Margin */}
        <div 
          className="kpi-card"
          onMouseEnter={(e) => handleMouseEnter('ebit', e)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="kpi-card__label">
            <span className="kpi-card__emoji">💹</span>
            EBIT Margin
          </div>
          <div className="kpi-card__value">{ebitMarginPct.toFixed(1)}%</div>
          <div className="kpi-card__subtitle">Operating profitability</div>
          <div className="kpi-card__baseline">Baseline: 11.5%</div>
        </div>
        
        {/* Consumer Dividend */}
        <div 
          className="kpi-card"
          onMouseEnter={(e) => handleMouseEnter('consumer', e)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="kpi-card__label">
            <span className="kpi-card__emoji">💰</span>
            Consumer Dividend
          </div>
          <div className="kpi-card__value">${Math.round(consumerDividend)}</div>
          <div className="kpi-card__subtitle">Per opt-in customer / year</div>
          <div className="kpi-card__baseline">Benchmarked vs. leading loyalty programs</div>
        </div>
        
        {/* Network Lift */}
        <div 
          className="kpi-card"
          onMouseEnter={(e) => handleMouseEnter('network', e)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="kpi-card__label">
            <span className="kpi-card__emoji">📈</span>
            Network Lift
          </div>
          <div className="kpi-card__value">
            {showNetworkEffects ? `+${networkLiftPercent.toFixed(1)}%` : "—"}
          </div>
          <div className="kpi-card__subtitle">Incremental gain from Network Effects</div>
          <div className="kpi-card__baseline">Baseline: 0%</div>
        </div>
      </div>
      
      {/* Mouse-following Tooltip */}
      {tooltipInfo.visible && (
        <div 
          className="kpi-tooltip"
          style={{
            position: 'fixed',
            left: tooltipInfo.x + 15,
            top: tooltipInfo.y - 10,
            transform: 'translateY(-100%)',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div className="kpi-tooltip__content">
            {tooltipInfo.content}
          </div>
        </div>
      )}
    </div>
  );
};

export default KpiStrip;