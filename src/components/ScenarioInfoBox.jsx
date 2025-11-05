import React from 'react';

const ScenarioInfoBox = ({ 
  scenario, 
  optInRate, 
  transactionsPerYear, 
  reuseRate,
  onAdjustClick 
}) => {
  return (
    <div className="scenario-info-box">
      <div className="scenario-info-box__content">
        <div className="scenario-info-box__left">
          <h3 className="scenario-info-box__title">
            Current Model: <span className="scenario-info-box__model">{scenario}</span>
          </h3>
          <p className="scenario-info-box__params">
            {Math.round(optInRate * 100)}% opt-in • {transactionsPerYear} transactions/year • {reuseRate}× reuse rate
          </p>
        </div>
        <div className="scenario-info-box__right">
          <button 
            onClick={onAdjustClick}
            className="scenario-info-box__link"
          >
            ⚙️ Adjust assumptions
          </button>
        </div>
      </div>
      
      <div className="scenario-info-box__network">
        <input 
          type="checkbox" 
          id="network-toggle" 
          className="scenario-info-box__checkbox"
        />
        <label htmlFor="network-toggle" className="scenario-info-box__label">
          Network Effects
        </label>
        <span className="scenario-info-box__status">
          Walmart Standalone
        </span>
      </div>
    </div>
  );
};

export default ScenarioInfoBox;