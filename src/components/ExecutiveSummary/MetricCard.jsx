import React from 'react';

const MetricCard = ({
  icon,
  title,
  value,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`metric-card ${className}`}>
      <div className="metric-card__header">
        {/* Icon */}
        <span className="metric-card__icon">
          {icon}
        </span>
        
        {/* Title */}
        <h3 className="metric-card__title">
          {title}
        </h3>
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
  );
};

export default MetricCard;