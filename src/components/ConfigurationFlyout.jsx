import React, { useState, useEffect } from 'react';

/**
 * ConfigurationFlyout - Global configuration panel for model assumptions
 * 
 * Provides two-tier control structure:
 * - BASIC: Variables safe for client pitch, visible by default
 * - ADVANCED: Internal modeling assumptions, collapsed by default
 * 
 * Responsive behavior:
 * - Desktop (≥768px): Slide-in panel from right
 * - Mobile (<768px): Full-screen modal
 */
export default function ConfigurationFlyout({
  // Visibility control
  isOpen,
  onClose,
  
  // Scenario management
  scenario,
  customMode,
  onScenarioChange,
  onResetToBase,
  
  // Current assumptions
  assumptions,
  
  // State setters for individual controls
  onCustomChange,
  
  // Network effects
  showNetworkEffects,
  onToggleNetworkEffects,
  metcalfeCoefficient,
  onMetcalfeCoefficientChange,
  
  // Presets for comparison
  PRESETS
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when flyout is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  // Helper to check if value differs from current scenario preset
  const isDifferentFromPreset = (field, value) => {
    if (!customMode) return false;
    const presetValue = PRESETS[scenario][field];
    return Math.abs(value - presetValue) > 0.001; // Float comparison tolerance
  };

  // Calculate effective opt-in for display
  const effectiveOptIn = assumptions.dwalletAdoption * assumptions.activeConsent;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="config-flyout-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Flyout panel */}
      <div 
        className={`config-flyout-panel ${isMobile ? 'mobile' : 'desktop'}`}
        style={{
          position: 'fixed',
          top: 0,
          right: isMobile ? 0 : 'auto',
          bottom: 0,
          left: isMobile ? 0 : 'auto',
          width: isMobile ? '100%' : '480px',
          maxWidth: '100vw',
          backgroundColor: '#ffffff',
          zIndex: 1000,
          overflowY: 'auto',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.2)',
          animation: isMobile ? 'slideUpIn 0.3s ease-out' : 'slideInRight 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          backgroundColor: '#ffffff',
          borderBottom: '2px solid #e2e8f0',
          padding: '1.5rem',
          zIndex: 10
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '0.25rem'
              }}>
                ⚙ Configuration
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b'
              }}>
                Adjust model assumptions
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '1.5rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f1f5f9';
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          
          {/* Scenario Presets Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
              marginBottom: '1rem'
            }}>
              SCENARIO PRESETS
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              {['Low', 'Base', 'High'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onScenarioChange(preset)}
                  className={scenario === preset && !customMode ? 'active' : 'inactive'}
                  style={{
                    padding: '0.75rem',
                    fontSize: '1rem',
                    fontWeight: '700',
                    borderRadius: '0.5rem',
                    border: '2px solid',
                    borderColor: scenario === preset && !customMode ? '#2563eb' : '#cbd5e1',
                    backgroundColor: scenario === preset && !customMode ? '#2563eb' : '#ffffff',
                    color: scenario === preset && !customMode ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
            
            {customMode && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#eff6ff',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#1e40af',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Custom mode active</span>
                <button
                  onClick={onResetToBase}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    borderRadius: '0.375rem',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Reset to {scenario}
                </button>
              </div>
            )}
          </div>

          {/* Basic Controls Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
              marginBottom: '1rem'
            }}>
              ADOPTION & VOLUME
            </h3>

            {/* Adoption Rate */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  Adoption Rate
                </label>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: isDifferentFromPreset('dwalletAdoption', assumptions.dwalletAdoption) ? '#2563eb' : '#0f172a'
                }}>
                  {(effectiveOptIn * 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0.28"
                max="0.85"
                step="0.01"
                value={effectiveOptIn}
                onChange={(e) => {
                  const newOptIn = parseFloat(e.target.value);
                  // Maintain the same activeConsent ratio, adjust dwalletAdoption
                  onCustomChange('dwalletAdoption', newOptIn / assumptions.activeConsent);
                }}
                style={{
                  width: '100%',
                  accentColor: isDifferentFromPreset('dwalletAdoption', assumptions.dwalletAdoption) ? '#2563eb' : '#64748b'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginTop: '0.25rem'
              }}>
                <span>28%</span>
                <span>85%</span>
              </div>
            </div>

            {/* Transactions per Year */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  Transactions/Year
                </label>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: isDifferentFromPreset('annualTransactions', assumptions.annualTransactions) ? '#2563eb' : '#0f172a'
                }}>
                  {assumptions.annualTransactions}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="80"
                step="1"
                value={assumptions.annualTransactions}
                onChange={(e) => onCustomChange('annualTransactions', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: isDifferentFromPreset('annualTransactions', assumptions.annualTransactions) ? '#2563eb' : '#64748b'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginTop: '0.25rem'
              }}>
                <span>50</span>
                <span>80</span>
              </div>
            </div>
          </div>

          {/* Brand Participation Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
              marginBottom: '1rem'
            }}>
              BRAND PARTICIPATION
            </h3>

            {/* Brand Ramp Duration */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  Brand Ramp Duration
                </label>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: isDifferentFromPreset('monthsToFull', assumptions.monthsToFull) ? '#2563eb' : '#0f172a'
                }}>
                  {assumptions.monthsToFull} months
                </span>
              </div>
              <input
                type="range"
                min="18"
                max="48"
                step="6"
                value={assumptions.monthsToFull}
                onChange={(e) => onCustomChange('monthsToFull', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: isDifferentFromPreset('monthsToFull', assumptions.monthsToFull) ? '#2563eb' : '#64748b'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginTop: '0.25rem'
              }}>
                <span>18 mo</span>
                <span>48 mo</span>
              </div>
            </div>
          </div>

          {/* Network Effects Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#64748b',
              marginBottom: '1rem'
            }}>
              NETWORK EFFECTS
            </h3>

            {/* Network Effects Toggle */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#334155'
              }}>
                <input
                  type="checkbox"
                  checked={showNetworkEffects}
                  onChange={(e) => onToggleNetworkEffects(e.target.checked)}
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    cursor: 'pointer',
                    accentColor: '#2563eb'
                  }}
                />
                <span>Show Network Effects (5 Retailers)</span>
              </label>
            </div>

            {/* Network Coefficient (k-value) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  Network Strength (k)
                </label>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: '#0f172a'
                }}>
                  {metcalfeCoefficient.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={metcalfeCoefficient}
                onChange={(e) => onMetcalfeCoefficientChange(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#22c55e'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#94a3b8',
                marginTop: '0.25rem'
              }}>
                <span>Conservative</span>
                <span>Aggressive</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{
            height: '1px',
            backgroundColor: '#e2e8f0',
            margin: '2rem 0'
          }} />

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '0.875rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#475569',
              backgroundColor: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{showAdvanced ? '▲' : '▼'} Advanced Settings</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '400' }}>
              {showAdvanced ? 'Collapse' : 'Expand'}
            </span>
          </button>

          {/* Advanced Settings Section */}
          {showAdvanced && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              backgroundColor: '#fefce8',
              borderRadius: '0.75rem',
              border: '2px solid #fde047'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#854d0e',
                marginBottom: '1.5rem',
                fontWeight: '600'
              }}>
                ⚠️ Internal modeling assumptions - adjust with caution
              </div>

              {/* Pricing Assumptions */}
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                marginBottom: '1rem'
              }}>
                PRICING ASSUMPTIONS
              </h3>

              {/* License Fee */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    License Fee (per use)
                  </label>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: isDifferentFromPreset('licenseFee', assumptions.licenseFee) ? '#2563eb' : '#0f172a'
                  }}>
                    ${assumptions.licenseFee.toFixed(3)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.100"
                  max="0.200"
                  step="0.005"
                  value={assumptions.licenseFee}
                  onChange={(e) => onCustomChange('licenseFee', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: isDifferentFromPreset('licenseFee', assumptions.licenseFee) ? '#2563eb' : '#64748b'
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem'
                }}>
                  <span>$0.100</span>
                  <span>$0.200</span>
                </div>
              </div>

              {/* Reuse Rate */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    Reuse Rate (uses/cert/year)
                  </label>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: isDifferentFromPreset('usesPerCertPerYear', assumptions.usesPerCertPerYear) ? '#2563eb' : '#0f172a'
                  }}>
                    {assumptions.usesPerCertPerYear}×
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="6"
                  step="0.5"
                  value={assumptions.usesPerCertPerYear}
                  onChange={(e) => onCustomChange('usesPerCertPerYear', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: isDifferentFromPreset('usesPerCertPerYear', assumptions.usesPerCertPerYear) ? '#2563eb' : '#64748b'
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem'
                }}>
                  <span>2×</span>
                  <span>6×</span>
                </div>
              </div>

              {/* Minting Fee (Read-only for now) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    Minting Fee
                  </label>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#64748b'
                  }}>
                    ${assumptions.mintingFee.toFixed(2)}
                  </span>
                </div>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  fontStyle: 'italic'
                }}>
                  Fixed across all scenarios
                </div>
              </div>

              {/* Margin Assumptions */}
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                marginBottom: '1rem',
                marginTop: '1.5rem'
              }}>
                MARGIN ASSUMPTIONS
              </h3>

              {/* Royalty Margin */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    Royalty Margin (EBIT)
                  </label>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: isDifferentFromPreset('royaltyMargin', assumptions.royaltyMargin) ? '#2563eb' : '#0f172a'
                  }}>
                    {(assumptions.royaltyMargin * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={assumptions.royaltyMargin}
                  onChange={(e) => onCustomChange('royaltyMargin', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: isDifferentFromPreset('royaltyMargin', assumptions.royaltyMargin) ? '#2563eb' : '#64748b'
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem'
                }}>
                  <span>50%</span>
                  <span>95%</span>
                </div>
              </div>

              {/* Cost Structure */}
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                marginBottom: '0.25rem',
                marginTop: '1.5rem'
              }}>
                COST STRUCTURE
              </h3>
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                marginBottom: '1rem',
                lineHeight: '1.5'
              }}>
                These are Walmart's ongoing operating costs to run the program. 
                They're already deducted when we show EBIT Margin.
              </div>

              {/* Cost Structure Sliders */}
              {[
                { 
                  id: "bankShare", 
                  label: "Bank Share", 
                  default: 0.02, 
                  min: 0.00, 
                  max: 0.05,
                  help: "Share paid to the issuing bank or payments partner for running card-linked credits." 
                },
                { 
                  id: "dataAgentShare", 
                  label: "DrumWave Share", 
                  default: 0.02, 
                  min: 0.00, 
                  max: 0.05,
                  help: "Portion of revenue paid to DrumWave for providing the shopper data marketplace and managing certificate issuance." 
                },
                { 
                  id: "platformFee", 
                  label: "Operating Overhead", 
                  default: 0.05, 
                  min: 0.00, 
                  max: 0.10,
                  help: "Walmart's internal technology and operational costs to support marketplace integration." 
                },
                { 
                  id: "sgaOverhead", 
                  label: "SG&A Overhead", 
                  default: 0.04, 
                  min: 0.00, 
                  max: 0.10,
                  help: "Sales, marketing, and administrative support for scaling the program." 
                }
              ].map((v) => {
                const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
                const currentValue = assumptions[v.id] ?? v.default;
                
                return (
                  <div key={v.id} style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <label style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#334155'
                      }}>
                        {v.label}
                      </label>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: isDifferentFromPreset(v.id, currentValue) ? '#2563eb' : '#0f172a'
                      }}>
                        {(currentValue * 100).toFixed(1)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={v.min}
                      max={v.max}
                      step={0.005}
                      value={currentValue}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value);
                        const safe = clamp(raw, v.min, v.max);
                        onCustomChange(v.id, safe);
                      }}
                      style={{
                        width: '100%',
                        accentColor: isDifferentFromPreset(v.id, currentValue) ? '#2563eb' : '#64748b'
                      }}
                    />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      marginTop: '0.25rem'
                    }}>
                      <span>{(v.min * 100).toFixed(0)}%</span>
                      <span>{(v.max * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#64748b',
                      marginTop: '0.375rem',
                      lineHeight: '1.4'
                    }}>
                      {v.help}
                    </div>
                  </div>
                );
              })}

              {/* Item Range (Read-only) */}
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                marginBottom: '1rem',
                marginTop: '1.5rem'
              }}>
                CERTIFICATE DYNAMICS
              </h3>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f1f5f9',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#334155'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.25rem'
                }}>
                  <span style={{ fontWeight: '600' }}>Item Range:</span>
                  <span>{assumptions.itemFloor}-{assumptions.itemCeiling} items</span>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginTop: '0.5rem',
                  fontStyle: 'italic'
                }}>
                  Varies by scenario (read-only)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideUpIn {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
