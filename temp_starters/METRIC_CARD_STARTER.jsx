// MetricCard Component Starter Template
// This goes in /src/components/ExecutiveSummary/MetricCard.jsx

import React from 'react';

const MetricCard = ({
  icon,
  title,
  value,
  subtitle,
  className = '',
  tooltip = null,
}) => {
  return (
    <div className={`metric-card ${className}`}>
      {/* Icon Section */}
      <div className="metric-card__icon-wrapper">
        <span className="metric-card__icon">{icon}</span>
      </div>

      {/* Content Section */}
      <div className="metric-card__content">
        {/* Title with optional tooltip */}
        <div className="metric-card__header">
          <h3 className="metric-card__title">{title}</h3>
          {tooltip && (
            <span 
              className="metric-card__tooltip"
              title={tooltip}
            >
              ⓘ
            </span>
          )}
        </div>

        {/* Main Value */}
        <div className="metric-card__value">
          {value}
        </div>

        {/* Subtitle */}
        <p className="metric-card__subtitle">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default MetricCard;