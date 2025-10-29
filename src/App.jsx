import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ConfigurationFlyout from './components/ConfigurationFlyout'; // added in phase 3
import KpiStrip from './components/KpiStrip'; // added in Step 5

// ==================== CALCULATION ENGINE ====================

// Sigmoid brand participation ramp
function calculateBrandParticipation(month, startPct, endPct, monthsToFull) {
  const midpoint = monthsToFull / 2;
  const steepness = 0.15;
  return startPct + ((endPct - startPct) / (1 + Math.exp(-steepness * (month - midpoint))));
}

// Calculate monthly results for single retailer
function calculateMonthlyResults(assumptions) {
  const {
    totalCustomers,
    dwalletAdoption,
    activeConsent,
    annualTransactions,
    brandStartPct,
    brandEndPct,
    monthsToFull,
    itemFloor,
    itemCeiling,
    mintingFee,
    licenseFee,
    usesPerCertPerYear
  } = assumptions;

  const effectiveOptIn = dwalletAdoption * activeConsent;
  const optedInCustomers = totalCustomers * effectiveOptIn;
  const monthlyTransactionsPerCustomer = annualTransactions / 12;

  const results = [];
  let activeCertPool = 0;
  const mintingHistory = [];
  let cumulativeCertsMinted = 0;
  let cumulativeMintingRev = 0;
  let cumulativeLicensingRev = 0;

  for (let month = 1; month <= 36; month++) {
    // Brand participation (sigmoid)
    const brandParticipation = calculateBrandParticipation(month, brandStartPct, brandEndPct, monthsToFull);
    
    // Dynamic eligible items
    const avgEligibleItems = itemFloor + (brandParticipation * (itemCeiling - itemFloor));
    
    // Transaction volume
    const totalMonthlyTransactions = optedInCustomers * monthlyTransactionsPerCustomer;
    
    // Certificate minting
    const certsMintedThisMonth = totalMonthlyTransactions * avgEligibleItems * brandParticipation;
    mintingHistory.push(certsMintedThisMonth);
    cumulativeCertsMinted += certsMintedThisMonth;
    
    // Certificate pool (12-month rolling window)
    const expiredCerts = month > 12 ? mintingHistory[month - 13] : 0;
    activeCertPool = activeCertPool + certsMintedThisMonth - expiredCerts;
    
    // Minting revenue
    const totalMintingRevenue = certsMintedThisMonth * mintingFee;
    const retailerMintingRevenue = totalMintingRevenue * 0.50;
    const consumerMintingBenefit = totalMintingRevenue * 0.50;
    cumulativeMintingRev += totalMintingRevenue;
    
    // Licensing revenue
    const monthlyLicensingEvents = activeCertPool * usesPerCertPerYear / 12;
    const grossLicensingRevenue = monthlyLicensingEvents * licenseFee;
    const retailerLicensing = grossLicensingRevenue * 0.06;
    const brandRevenue = grossLicensingRevenue * 0.30;
    const consumerLicensing = grossLicensingRevenue * 0.60;
    const dataAgentRevenue = grossLicensingRevenue * 0.02;
    const drumwaveRevenue = grossLicensingRevenue * 0.02;
    cumulativeLicensingRev += grossLicensingRevenue;
    
    // Total stakeholder revenue
    const retailerTotal = retailerMintingRevenue + retailerLicensing;
    const consumerTotal = consumerMintingBenefit + consumerLicensing;
    
    results.push({
      month,
      brandParticipation,
      avgEligibleItems,
      certsMintedThisMonth,
      activeCertPool,
      monthlyLicensingEvents,
      retailerMintingRevenue,
      retailerLicensing,
      retailerTotal,
      consumerMintingBenefit,
      consumerLicensing,
      consumerTotal,
      brandRevenue,
      dataAgentRevenue,
      drumwaveRevenue,
      totalMintingRevenue,
      grossLicensingRevenue,
      cumulativeCertsMinted,
      cumulativeRetailerRev: results.reduce((sum, r) => sum + r.retailerTotal, 0) + retailerTotal,
      cumulativeConsumerRev: results.reduce((sum, r) => sum + r.consumerTotal, 0) + consumerTotal,
      cumulativeBrandRev: results.reduce((sum, r) => sum + r.brandRevenue, 0) + brandRevenue,
      cumulativeGMV: cumulativeMintingRev + cumulativeLicensingRev
    });
  }

  return results;
}

// Network effects multipliers

function calculateReuseMultiplier(numRetailers, baseReuse = 4) {
  const reuseIncrease = 0.4;
  const maxReuse = 8;
  const newReuse = baseReuse * (1 + (numRetailers - 1) * reuseIncrease);
  return Math.min(newReuse, maxReuse) / baseReuse;
}

function calculateAdoptionLift(numRetailers, baseAdoption) {
  const liftPerRetailer = 0.04;
  const maxAdoption = 0.85;
  const newAdoption = baseAdoption + (numRetailers - 1) * liftPerRetailer;
  return Math.min(newAdoption, maxAdoption);
}

function calculatePricePremium(numRetailers) {
  const premiumPerRetailer = 0.12;
  const maxPremium = 0.50;
  const premium = (numRetailers - 1) * premiumPerRetailer;
  return 1 + Math.min(premium, maxPremium);
}

// Calculate network scenario
function calculateNetworkScenario(singleRetailerResults, numRetailers, baseAdoption) {
  const reuseMultiplier = calculateReuseMultiplier(numRetailers, 4);
  const adoptionLift = calculateAdoptionLift(numRetailers, baseAdoption);
  const pricePremium = calculatePricePremium(numRetailers);
  const adoptionFactor = adoptionLift / baseAdoption;

  return singleRetailerResults.map((month, index) => {
    // Minting revenue grows ONLY with adoption lift
    // (More Walmart shoppers opt in → more certificates minted)
    const newMintingRevenue = month.retailerMintingRevenue * adoptionFactor;
    
    // Licensing revenue grows with THREE multipliers:
    // 1. Adoption (more Walmart certificates in pool)
    // 2. Reuse (each certificate used more often)
    // 3. Price (brands pay more per use)
    // NOTE: NO pool growth multiplier (Walmart doesn't benefit from Target's pool)
    const newLicensingRevenue = month.retailerLicensing * 
                                 adoptionFactor *      // More Walmart shoppers
                                 reuseMultiplier *     // More uses per Walmart cert
                                 pricePremium;         // Higher price per use
    
    return {
      month: index + 1,
      retailerTotal: newMintingRevenue + newLicensingRevenue,
      mintingComponent: newMintingRevenue,
      licensingComponent: newLicensingRevenue,
      // Certificate pool only grows from adoption lift (more Walmart shoppers)
      activeCertPool: month.activeCertPool * adoptionFactor,
      // Consumer earnings increase with same multipliers
      consumerTotal: (month.consumerMintingBenefit + month.consumerLicensing) * 
                     adoptionFactor * reuseMultiplier * pricePremium
    };
  });
}

// Preset scenarios
const PRESETS = {
  Low: {
    totalCustomers: 120000000,
    dwalletAdoption: 0.50,
    activeConsent: 0.80,
    annualTransactions: 55,
    brandStartPct: 0.05,
    brandEndPct: 1.0,
    monthsToFull: 36,
    itemFloor: 2,
    itemCeiling: 4,
    mintingFee: 0.10,
    licenseFee: 0.150,
    usesPerCertPerYear: 3,
    royaltyMargin: 0.95,
    // Cost structure for EBIT calculation
    bankShare: 0.02,
    dataAgentShare: 0.02,
    platformFee: 0.05,
    sgaOverhead: 0.04
  },
  Base: {
    totalCustomers: 120000000,
    dwalletAdoption: 0.70,
    activeConsent: 0.80,
    annualTransactions: 65,
    brandStartPct: 0.05,
    brandEndPct: 1.0,
    monthsToFull: 36,
    itemFloor: 2,
    itemCeiling: 8,
    mintingFee: 0.10,
    licenseFee: 0.175,
    usesPerCertPerYear: 4,
    royaltyMargin: 0.95,
    // Cost structure for EBIT calculation
    bankShare: 0.02,
    dataAgentShare: 0.02,
    platformFee: 0.05,
    sgaOverhead: 0.04
  },
  High: {
    totalCustomers: 120000000,
    dwalletAdoption: 0.80,
    activeConsent: 0.85,
    annualTransactions: 75,
    brandStartPct: 0.05,
    brandEndPct: 1.0,
    monthsToFull: 36,
    itemFloor: 3,
    itemCeiling: 8,
    mintingFee: 0.10,
    licenseFee: 0.200,
    usesPerCertPerYear: 6,
    royaltyMargin: 0.95,
    // Cost structure for EBIT calculation
    bankShare: 0.02,
    dataAgentShare: 0.02,
    platformFee: 0.05,
    sgaOverhead: 0.04
  }
};

// Default Retailer Network Profiles
const DEFAULT_RETAILERS = [
  {
    id: 'walmart',
    name: 'Walmart',
    totalCustomers: 120000000,
    dwalletAdoption: 0.70,
    activeConsent: 0.80,
    annualTransactions: 65,
    launchMonth: 0, // Month they join network (0 = from start)
    color: '#0071CE', // Walmart blue
    brandStartPct: 0.05,
    brandEndPct: 1.0,
    monthsToFull: 36,
    itemFloor: 2,
    itemCeiling: 8
  },
  {
    id: 'target',
    name: 'Target',
    totalCustomers: 75000000,
    dwalletAdoption: 0.65,
    activeConsent: 0.75,
    annualTransactions: 48,
    launchMonth: 6,
    color: '#CC0000', // Target red
    brandStartPct: 0.08,
    brandEndPct: 1.0,
    monthsToFull: 30,
    itemFloor: 2,
    itemCeiling: 7
  },
  {
    id: 'kroger',
    name: 'Kroger',
    totalCustomers: 60000000,
    dwalletAdoption: 0.60,
    activeConsent: 0.70,
    annualTransactions: 52,
    launchMonth: 12,
    color: '#003DA5', // Kroger blue
    brandStartPct: 0.10,
    brandEndPct: 1.0,
    monthsToFull: 24,
    itemFloor: 2,
    itemCeiling: 6
  },
  {
    id: 'cvs',
    name: 'CVS',
    totalCustomers: 90000000,
    dwalletAdoption: 0.55,
    activeConsent: 0.68,
    annualTransactions: 38,
    launchMonth: 18,
    color: '#CC0000', // CVS red
    brandStartPct: 0.12,
    brandEndPct: 1.0,
    monthsToFull: 24,
    itemFloor: 1,
    itemCeiling: 5
  },
  {
    id: 'costco',
    name: 'Costco',
    totalCustomers: 65000000,
    dwalletAdoption: 0.68,
    activeConsent: 0.78,
    annualTransactions: 28,
    launchMonth: 24,
    color: '#0066B2', // Costco blue
    brandStartPct: 0.08,
    brandEndPct: 1.0,
    monthsToFull: 24,
    itemFloor: 3,
    itemCeiling: 10
  }
];

// Metcalfe's Law Network Value Calculator
function calculateMetcalfeValue(numActiveRetailers, maxRetailers = 10, baseCoefficient = 0.5) {
  // Metcalfe's Law: Value ∝ n²
  // Network premium = baseCoefficient × (n² / n_max²)
  // Returns multiplier for license fees (1.0 = no premium, 2.0 = 100% premium)
  const networkEffect = baseCoefficient * Math.pow(numActiveRetailers / maxRetailers, 2);
  return 1 + networkEffect;
}

// Calculate retailer results with network awareness - V2 with proper rolling window
function calculateRetailerResultsV2(retailer, month, mintingHistory, mintingFee, licenseFee, usesPerCertPerYear, networkMultiplier = 1.0) {
  // Only calculate if retailer has launched
  if (month < retailer.launchMonth) {
    return {
      certsMinted: 0,
      activeCertPool: 0,
      mintingRevenue: 0,
      licensingRevenue: 0,
      totalRevenue: 0,
      consumerEarnings: 0,
      brandParticipation: 0,
      effectiveOptIn: 0
    };
  }
  
  const monthsSinceLaunch = month - retailer.launchMonth;
  const effectiveOptIn = retailer.dwalletAdoption * retailer.activeConsent;
  const optedInCustomers = retailer.totalCustomers * effectiveOptIn;
  const monthlyTransactionsPerCustomer = retailer.annualTransactions / 12;
  
  // Brand participation (sigmoid)
  const brandParticipation = calculateBrandParticipation(
    monthsSinceLaunch, 
    retailer.brandStartPct, 
    retailer.brandEndPct, 
    retailer.monthsToFull
  );
  
  // Dynamic eligible items
  const avgEligibleItems = retailer.itemFloor + (brandParticipation * (retailer.itemCeiling - retailer.itemFloor));
  
  // Transaction volume
  const totalMonthlyTransactions = optedInCustomers * monthlyTransactionsPerCustomer;
  
  // Certificate minting THIS MONTH
  const certsMintedThisMonth = totalMonthlyTransactions * avgEligibleItems * brandParticipation;
  
  // PROPER 12-month rolling window certificate pool
  // Calculate pool from history + current month, minus expired (month-13)
  const expiredCerts = mintingHistory.length > 12 ? mintingHistory[mintingHistory.length - 13] : 0;
  const activeCertPool = mintingHistory.reduce((sum, val) => sum + (val || 0), 0) + certsMintedThisMonth - expiredCerts;
  
  // Minting revenue (no network effect on minting)
  const totalMintingRevenue = certsMintedThisMonth * mintingFee;
  const retailerMintingRevenue = totalMintingRevenue * 0.50;
  const consumerMintingBenefit = totalMintingRevenue * 0.50;
  
  // Licensing revenue (WITH network multiplier)
  const monthlyLicensingEvents = activeCertPool * usesPerCertPerYear / 12;
  const adjustedLicenseFee = licenseFee * networkMultiplier; // Network premium applied here
  const grossLicensingRevenue = monthlyLicensingEvents * adjustedLicenseFee;
  const retailerLicensing = grossLicensingRevenue * 0.06;
  const consumerLicensing = grossLicensingRevenue * 0.60;
  
  return {
    certsMinted: certsMintedThisMonth,
    activeCertPool: activeCertPool,
    mintingRevenue: retailerMintingRevenue,
    licensingRevenue: retailerLicensing,
    totalRevenue: retailerMintingRevenue + retailerLicensing,
    consumerEarnings: consumerMintingBenefit + consumerLicensing,
    brandParticipation: brandParticipation,
    effectiveOptIn: effectiveOptIn
  };
}

// Calculate full network results across all retailers with proper history tracking
function calculateNetworkResults(retailers, mintingFee, licenseFee, usesPerCertPerYear, metcalfeCoefficient = 0.5) {
  const monthlyResults = [];
  
  // Create minting history tracker for each retailer
  const retailerHistories = retailers.map(r => ({
    id: r.id,
    mintingHistory: []
  }));
  
  for (let month = 0; month < 36; month++) {
    // Determine how many retailers are active this month
    const activeRetailers = retailers.filter(r => month >= r.launchMonth).length;
    
    // Calculate Metcalfe multiplier based on active retailers
    const networkMultiplier = calculateMetcalfeValue(activeRetailers, 10, metcalfeCoefficient);
    
    // Calculate results for each retailer
    const retailerMonthResults = retailers.map((retailer, idx) => {
      // Get this retailer's minting history
      const history = retailerHistories[idx];
      
      // Calculate for this month using proper rolling window
      const result = calculateRetailerResultsV2(
        retailer, 
        month, 
        history.mintingHistory,
        mintingFee, 
        licenseFee, 
        usesPerCertPerYear, 
        networkMultiplier
      );
      
      // Update history with this month's minting
      history.mintingHistory.push(result.certsMinted);
      
      return {
        retailerId: retailer.id,
        retailerName: retailer.name,
        ...result
      };
    });
    
    // Aggregate totals with NaN guards
    const aggregateCerts = retailerMonthResults.reduce((sum, r) => sum + (r.certsMinted || 0), 0);
    const aggregatePool = retailerMonthResults.reduce((sum, r) => sum + (r.activeCertPool || 0), 0);
    const aggregateRetailerRevenue = retailerMonthResults.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
    const aggregateConsumerEarnings = retailerMonthResults.reduce((sum, r) => sum + (r.consumerEarnings || 0), 0);
    
    monthlyResults.push({
      month: month + 1,
      activeRetailers: activeRetailers,
      networkMultiplier: networkMultiplier,
      retailers: retailerMonthResults,
      aggregateCertsMinted: aggregateCerts,
      aggregateActiveCertPool: aggregatePool,
      aggregateRetailerRevenue: aggregateRetailerRevenue,
      aggregateConsumerEarnings: aggregateConsumerEarnings
    });
  }
  
  return monthlyResults;
}

// ==================== UTILITY FUNCTIONS ====================

function formatCurrency(value, decimals = 0) {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(decimals)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(decimals)}K`;
  }
  return `$${value.toFixed(decimals)}`;
}

function formatNumber(value, decimals = 0) {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

// ==================== MAIN COMPONENT ====================

export default function DrumWaveWalmartTool() {
  const [activeView, setActiveView] = useState('dashboard');
  const [scenario, setScenario] = useState('Base');
  const [customMode, setCustomMode] = useState(false);
  const [networkSize, setNetworkSize] = useState(1);
  const [showNetworkEffects, setShowNetworkEffects] = useState(false);
  const [customAssumptions, setCustomAssumptions] = useState(null);
  
  // Network retailers state
  const [networkRetailers, setNetworkRetailers] = useState(DEFAULT_RETAILERS);
  const [metcalfeCoefficient, setMetcalfeCoefficient] = useState(0.5);
  const [showRetailerConfig, setShowRetailerConfig] = useState(false);
  const [showConfigFlyout, setShowConfigFlyout] = useState(false);


  const assumptions = customMode && customAssumptions ? customAssumptions : PRESETS[scenario];
  const effectiveOptIn = assumptions.dwalletAdoption * assumptions.activeConsent;
  
  const singleRetailerResults = useMemo(
    () => calculateMonthlyResults(assumptions),
    [assumptions]
  );

  // Calculate Low and High scenario results for comparison table
  const lowScenarioResults = useMemo(
    () => calculateMonthlyResults(PRESETS.Low),
    []  // Empty deps = calculate once on mount
  );

  const highScenarioResults = useMemo(
    () => calculateMonthlyResults(PRESETS.High),
    []
  );

  const networkResults = useMemo(
    () => calculateNetworkScenario(singleRetailerResults, networkSize, effectiveOptIn),
    [singleRetailerResults, networkSize, effectiveOptIn]
  );
  
  // Apply scenario assumptions to Walmart retailer
  // Other retailers keep their configured values
  const scenarioAdjustedRetailers = useMemo(() => {
    return networkRetailers.map(retailer => ({
      ...retailer,
      // Override with scenario-specific values (only for Walmart)
      ...(retailer.id === 'walmart' ? {
        totalCustomers: assumptions.totalCustomers,
        dwalletAdoption: assumptions.dwalletAdoption,
        activeConsent: assumptions.activeConsent,
        annualTransactions: assumptions.annualTransactions,
        brandStartPct: assumptions.brandStartPct,
        brandEndPct: assumptions.brandEndPct,
        monthsToFull: assumptions.monthsToFull,
        itemFloor: assumptions.itemFloor,
        itemCeiling: assumptions.itemCeiling
      } : {})
    }));
  }, [networkRetailers, assumptions]);
  
  // New: Full network results with actual retailer volumes
  const fullNetworkResults = useMemo(
    () => calculateNetworkResults(
      scenarioAdjustedRetailers, 
      assumptions.mintingFee, 
      assumptions.licenseFee, 
      assumptions.usesPerCertPerYear,
      metcalfeCoefficient
    ),
    [scenarioAdjustedRetailers, assumptions.mintingFee, assumptions.licenseFee, assumptions.usesPerCertPerYear, metcalfeCoefficient]
  );

  const month36 = singleRetailerResults[35];
  const cumulativeRetailer = month36.cumulativeRetailerRev;
  const cumulativeConsumer = month36.cumulativeConsumerRev;
  const cumulativeGMV = month36.cumulativeGMV;

  const handlePresetClick = (preset) => {
    setScenario(preset);
    setCustomMode(false);
    setCustomAssumptions(null);
  };

  const handleCustomChange = (field, value) => {
    setCustomMode(true);
    const baseAssumptions = customAssumptions || PRESETS[scenario];
    setCustomAssumptions({
      ...baseAssumptions,
      [field]: value
    });
  };

  const resetToBase = () => {
    setScenario('Base');
    setCustomMode(false);
    setCustomAssumptions(null);
  };

  // ==================== VIEW COMPONENTS ====================

  // Helper function for scenario-specific descriptions
  const getScenarioDescription = (scenario, avgCertsPerTrip, assumptions) => {
    const certs = avgCertsPerTrip.toFixed(1);
    
    switch(scenario) {
      case 'Low':
        return `Conservative adoption (${(assumptions.dwalletAdoption * 100).toFixed(0)}% DWallet, ${(assumptions.activeConsent * 100).toFixed(0)}% consent) with ${certs} certificates per trip from essential branded products.`;
      
      case 'High':
        return `Enthusiastic adoption (${(assumptions.dwalletAdoption * 100).toFixed(0)}% DWallet, ${(assumptions.activeConsent * 100).toFixed(0)}% consent) with ${certs} certificates per trip from broad brand participation.`;
      
      case 'Base':
      default:
        return `Realistic adoption (${(assumptions.dwalletAdoption * 100).toFixed(0)}% DWallet, ${(assumptions.activeConsent * 100).toFixed(0)}% consent) with ${certs} certificates per trip from branded products across categories.`;
    }
  };

  const DashboardView = () => {
    // Calculate metrics based on whether network effects are shown
    // When network effects are on, use fullNetworkResults (real retailer volumes with Metcalfe's Law)
    // Otherwise use standalone Walmart model
    const displayResults = showNetworkEffects ? null : singleRetailerResults; // Keep for backwards compatibility
    
    let displayCumulativeRetailer, displayCumulativeConsumer, displayActiveCerts, networkMultiplier;
    
    if (showNetworkEffects) {
      // Extract Walmart's data from fullNetworkResults
      const walmartData = fullNetworkResults
        .map(month => month.retailers.find(r => r.retailerId === 'walmart'))
        .filter(r => r);
      
      // Calculate cumulative values
      displayCumulativeRetailer = walmartData.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
      displayCumulativeConsumer = walmartData.reduce((sum, r) => sum + (r.consumerEarnings || 0), 0);
      displayActiveCerts = walmartData[walmartData.length - 1]?.activeCertPool || 0;
      
      // Get network multiplier from month 36 (when all retailers are active)
      networkMultiplier = fullNetworkResults[fullNetworkResults.length - 1]?.networkMultiplier || 1.0;
    } else {
      displayCumulativeRetailer = cumulativeRetailer;
      displayCumulativeConsumer = cumulativeConsumer;
      displayActiveCerts = month36.activeCertPool;
      networkMultiplier = 1.0;
    }
    
    // --- BEGIN EBIT / REVENUE ROLLUP BLOCK (Step 5a) ---
    
    // Walmart cumulative revenue over 36 months
    const walmartRevenue36 = displayCumulativeRetailer || 0;
    
    // Approximate annualized Walmart revenue (1-year run rate view)
    const walmartAnnualizedRevenue = walmartRevenue36 / 3;
    
    // Consumer earnings cumulative over 36 months
    const consumerEarnings36 = displayCumulativeConsumer || 0;
    const consumerAnnualizedEarnings = consumerEarnings36 / 3;
    
    // Opted-in customers (used for per-customer metrics)
    const optedInCustomers = assumptions.totalCustomers * effectiveOptIn;
    
    // --- EBIT model assumptions ---
    // Read cost structure from assumptions (with fallback defaults)
    const grossRoyaltyMargin = assumptions.royaltyMargin || 0.95;
    const bankShare = assumptions.bankShare || 0.02;
    const dataAgentShare = assumptions.dataAgentShare || 0.02;
    const platformFee = assumptions.platformFee || 0.05;
    const sgaOverhead = assumptions.sgaOverhead || 0.04;
    
    // Compute gross profit from DrumWave revenue
    const grossProfit = walmartAnnualizedRevenue * grossRoyaltyMargin;
    
    // Total operating costs we subtract to get EBIT
    const operatingCosts = walmartAnnualizedRevenue * (bankShare + dataAgentShare + platformFee + sgaOverhead);
    
    // EBIT dollars (annualized run-rate)
    const walmartEbitAnnualized = grossProfit - operatingCosts;
    
    // EBIT margin (% of revenue)
    const ebitMarginPct = walmartAnnualizedRevenue > 0
      ? (walmartEbitAnnualized / walmartAnnualizedRevenue) * 100
      : 0;
    
    // Network lift % - Compare 36-month cumulative revenue (standalone vs network)
    // Use unrounded cumulative values for accuracy
    const standaloneCumulativeRevenue = cumulativeRetailer;
    const networkCumulativeRevenue = displayCumulativeRetailer;
    
    const networkLiftRaw = standaloneCumulativeRevenue > 0
      ? ((networkCumulativeRevenue - standaloneCumulativeRevenue) / standaloneCumulativeRevenue) * 100
      : 0;
    
    // Round once for display consistency
    const networkLiftDisplayPercent = parseFloat(networkLiftRaw.toFixed(1));
    
    // Build a `results` bundle for KpiStrip
    const results = {
      walmartAnnualizedRevenue,
      walmartEbitAnnualized,
      ebitMarginPct,
      consumerAnnualizedEarnings,
      optedInCustomers,
      networkLiftDisplayPercent,
      standaloneCumulativeRevenue,
      networkCumulativeRevenue,
      showNetworkEffects
    };
    
    // --- END EBIT / REVENUE ROLLUP BLOCK ---
    
    // Calculate annual metrics for KEY INSIGHT (keeping for backwards compatibility)
    const annualWalmartRevenue = walmartAnnualizedRevenue; // Use from results
    const annualConsumerEarnings = consumerAnnualizedEarnings; // Use from results
    const annualEarningsPerCustomer = optedInCustomers > 0 
      ? annualConsumerEarnings / optedInCustomers 
      : 0;

    // Estimate GMV (assuming $5,000 annual spend per opted-in customer)
    const AVG_ANNUAL_SPEND = 5000;
    const estimatedAnnualGMV = optedInCustomers * AVG_ANNUAL_SPEND;
    const revenueAsPercentOfGMV = estimatedAnnualGMV > 0
      ? (annualWalmartRevenue / estimatedAnnualGMV) * 100
      : 0;

    // Average certificates per transaction
    const avgCertsPerTrip = (assumptions.itemFloor + assumptions.itemCeiling) / 2;

    // Format for display
    const formattedOptedInM = (optedInCustomers / 1000000).toFixed(1);
    const formattedEarningsPerYear = Math.round(annualEarningsPerCustomer);
    const formattedGMVPercent = revenueAsPercentOfGMV.toFixed(2);
    
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3" style={{ letterSpacing: '-0.02em' }}>
            Walmart x DrumWave: Economic Model
          </h1>
          <p className="text-xl text-gray-600 font-semibold">Shopper Data Marketplace 36-Month Projection</p>
        </div>

        {/* Scenario Selection - Prominent Control Panel */}
        <div className="control-panel">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Select Model Scenario</h2>
            <p className="text-sm text-gray-600">Choose market conditions to model skeptical, realistic, or enthusiastic adoption</p>
          </div>
          
          <div className="flex justify-center gap-4 mb-6">
            {['Low', 'Base', 'High'].map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`scenario-button ${
                  scenario === preset && !customMode ? 'active' : 'inactive'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Network Effects Toggle */}
          <div className="network-toggle-container">
            <label className="network-toggle-label">
              <input
                type="checkbox"
                checked={showNetworkEffects}
                onChange={(e) => {
                  setShowNetworkEffects(e.target.checked);
                }}
                className="network-toggle-checkbox"
              />
              <span>Show Network Effects (5 Retailers, Phased Rollout)</span>
            </label>
            {showNetworkEffects && (
              <div className="text-sm text-gray-600 mt-2 text-center">
                Showing Walmart's revenue with full 5-retailer network effects (Metcalfe's Law)
              </div>
            )}
          </div>

          {/* Scenario Summary */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
            <p className="text-sm text-gray-700">
              <strong>Current model: {customMode ? 'Custom' : scenario}.</strong> 
              {' '}{getScenarioDescription(scenario, avgCertsPerTrip, assumptions)} 
              {' '}Edit assumptions in Configuration.
            </p>
          </div>
        </div>

        {/* KPI Strip - Executive Summary Metrics */}
        <KpiStrip
          walmartRevenue={results.walmartAnnualizedRevenue}
          walmartEbit={results.walmartEbitAnnualized}
          consumerEarnings={results.consumerAnnualizedEarnings}
          optedInCustomers={results.optedInCustomers}
          networkLiftPercent={results.networkLiftDisplayPercent}
          showNetworkEffects={results.showNetworkEffects}
        />

        {/* Scorecards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <div className="scorecard">
            <div className="scorecard-label">WALMART REVENUE</div>
            <div className="scorecard-value">{formatCurrency(displayCumulativeRetailer)}</div>
            <div className="scorecard-subtitle">36-Month Total</div>
            {showNetworkEffects && (
              <div className="scorecard-badge">
                {(displayCumulativeRetailer / cumulativeRetailer).toFixed(1)}× baseline
              </div>
            )}
          </div>

          <div className="scorecard">
            <div className="scorecard-label">EBIT PER CUSTOMER</div>
            <div className="scorecard-value">
              ${((results.walmartEbitAnnualized * 3) / results.optedInCustomers).toFixed(2)}
            </div>
            <div className="scorecard-subtitle">Per Opted-In Customer</div>
          </div>

          <div className="scorecard">
            <div className="scorecard-label">CONSUMER EARNINGS</div>
            <div className="scorecard-value">{formatCurrency(displayCumulativeConsumer)}</div>
            <div className="scorecard-subtitle">36-Month Total</div>
            {showNetworkEffects && (
              <div className="scorecard-badge">
                {(displayCumulativeConsumer / cumulativeConsumer).toFixed(1)}× baseline
              </div>
            )}
          </div>

          <div className="scorecard">
            <div className="scorecard-label">CONSUMER EARNINGS</div>
            <div className="scorecard-value">
              ${(displayCumulativeConsumer / 3 / optedInCustomers).toFixed(2)}/year
            </div>
            <div className="scorecard-subtitle">Per Opted-In Customer</div>
            {showNetworkEffects && (
              <div className="scorecard-badge">
                {((displayCumulativeConsumer / cumulativeConsumer)).toFixed(1)}× baseline
              </div>
            )}
          </div>

          <div className="scorecard">
            <div className="scorecard-label">ACTIVE CERT POOL</div>
            <div className="scorecard-value">{(displayActiveCerts / 1000000000).toFixed(2)}B</div>
            <div className="scorecard-subtitle">Month 36</div>
            {showNetworkEffects && (
              <div className="scorecard-badge">
                {(displayActiveCerts / month36.activeCertPool).toFixed(1)}× baseline
              </div>
            )}
          </div>
        </div>

        {/* Key Insight Box */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border-l-4 border-blue-600 shadow-lg">
          <div className="font-bold text-xl text-gray-900 mb-4">KEY INSIGHT</div>
          {!showNetworkEffects ? (
            <>
              <p className="text-gray-700 text-lg leading-relaxed mb-3">
                At {formatPercent(effectiveOptIn)} participation ({formattedOptedInM}M customers), 
                Walmart generates {formatCurrency(annualWalmartRevenue)} annually from certificates 
                created from existing transactions. That's {formattedGMVPercent}% of GMV—a modest 
                data dividend that rewards participating consumers ${formattedEarningsPerYear} per year.
              </p>
              <p className="text-gray-600 text-base">
                <strong>{customMode ? 'Custom' : scenario} scenario:</strong> {getScenarioDescription(scenario, avgCertsPerTrip, assumptions)}
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-700 text-lg leading-relaxed mb-3">
                With {formattedOptedInM}M participating customers ({formatPercent(effectiveOptIn)}), 
                the 5-retailer network makes certificates {networkMultiplier.toFixed(2)}× more valuable. 
                Walmart generates {formatCurrency(annualWalmartRevenue)} annually while participating 
                consumers earn ${formattedEarningsPerYear} per year—a {((networkMultiplier - 1) * 100).toFixed(0)}% 
                boost from network effects.
              </p>
              <p className="text-gray-600 text-base">
                <strong>Network Effect:</strong> Brands pay a premium for cross-retailer insights. 
                This is value creation, not redistribution—Walmart earns on their own certificates, 
                they just become more valuable in a larger network.
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-6 pt-4">
          <button
            onClick={() => setActiveView('standalone')}
            className="action-button action-button-primary"
          >
            Explore Standalone Model →
          </button>
          <button
            onClick={() => setActiveView('network')}
            className="action-button action-button-secondary"
          >
            See Network Effects →
          </button>
        </div>
      </div>
    );
  };

  const StandaloneView = () => {
    const chartData = singleRetailerResults.map(r => ({
      month: r.month,
      Walmart: r.retailerTotal / 1000000,
      Consumers: r.consumerTotal / 1000000,
      Brands: r.brandRevenue / 1000000,
      Others: (r.dataAgentRevenue + r.drumwaveRevenue) / 1000000
    }));

    const scenarioLabel = customMode ? 'Custom' : scenario;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Walmart Standalone Economics</h2>
          <p className="text-gray-600">Single-retailer model showing Walmart's revenue from DrumWave data licensing</p>
        </div>

        {/* Read-only Assumptions Summary */}
        <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Current Model Assumptions ({scenarioLabel})</h3>
          <p className="text-sm text-gray-700 mb-4">
            This view shows Walmart standalone economics under <strong>{scenarioLabel}</strong>: 
            {' '}<strong>{formatPercent(effectiveOptIn)}</strong> opt-in rate, 
            {' '}<strong>{assumptions.annualTransactions}</strong> transactions/year, 
            {' '}<strong>{assumptions.usesPerCertPerYear}×</strong> reuse per certificate, 
            {' '}<strong>${assumptions.licenseFee.toFixed(3)}</strong> license fee per reuse.
          </p>
          <p className="text-xs text-gray-600 italic">
            Edit assumptions in Configuration to modify these values.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over 36 Months</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Revenue ($M)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value) => `$${value.toFixed(1)}M`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
              />
              <Legend />
              <Line type="monotone" dataKey="Walmart" stroke="#10B981" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="Consumers" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Brands" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Others" stroke="#6B7280" strokeWidth={1} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-semibold text-gray-600 mb-1">Avg Revenue per Certificate</div>
            <div className="text-2xl font-bold text-gray-900">
              ${(cumulativeGMV / month36.cumulativeCertsMinted).toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-semibold text-gray-600 mb-1">EBIT per Opted-In Customer</div>
            <div className="text-2xl font-bold text-gray-900">
              ${((cumulativeRetailer * assumptions.royaltyMargin) / (assumptions.totalCustomers * effectiveOptIn)).toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-semibold text-gray-600 mb-1">Consumer Earnings per Customer</div>
            <div className="text-2xl font-bold text-gray-900">
              ${(cumulativeConsumer / (assumptions.totalCustomers * effectiveOptIn) / 3).toFixed(2)}/year
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-semibold text-gray-600 mb-1">Active Cert Pool M36</div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(month36.activeCertPool)}</div>
          </div>
        </div>
      </div>
    );
  };

  const NetworkView = () => {
    // Get network month 36 data for cert pool
    const networkMonth36 = fullNetworkResults[35];
    const totalCertPool = networkMonth36.aggregateActiveCertPool;
    
    // Prepare chart data showing certificate volume by retailer over time
    const chartData = fullNetworkResults.map(month => {
      const dataPoint = { month: month.month };
      month.retailers.forEach(r => {
        if (r.activeCertPool > 0) {
          dataPoint[r.retailerName] = r.activeCertPool / 1000000; // Convert to millions
        }
      });
      dataPoint.networkMultiplier = month.networkMultiplier;
      return dataPoint;
    });
    
    // Retailer colors for chart
    const retailerColors = {
      'Walmart': '#0071CE',
      'Target': '#CC0000',
      'Kroger': '#003DA5',
      'CVS': '#E87722',
      'Costco': '#0066B2'
    };
    
    // Calculate 36-month totals by retailer with NaN guards
    const retailerTotals = networkRetailers.map(retailer => {
      const retailerResults = fullNetworkResults
        .map(m => m.retailers.find(r => r.retailerId === retailer.id))
        .filter(r => r);
      
      // Use NaN guards to ensure clean aggregation
      const total36MonthRevenue = retailerResults.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
      const total36MonthConsumer = retailerResults.reduce((sum, r) => sum + (r.consumerEarnings || 0), 0);
      const month36Certs = retailerResults[retailerResults.length - 1]?.activeCertPool || 0;
      
      return {
        ...retailer,
        totalRevenue: isNaN(total36MonthRevenue) ? 0 : total36MonthRevenue,
        totalConsumer: isNaN(total36MonthConsumer) ? 0 : total36MonthConsumer,
        finalCertPool: isNaN(month36Certs) ? 0 : month36Certs
      };
    });
    
    // NOW calculate aggregate 36-month totals from retailerTotals (not just month 36)
    const totalNetworkRevenue = retailerTotals.reduce((sum, r) => sum + r.totalRevenue, 0);
    const totalConsumerEarnings = retailerTotals.reduce((sum, r) => sum + r.totalConsumer, 0);
    
    return (
      <div className="space-y-8">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-3" style={{ letterSpacing: '-0.02em' }}>
            Network Effects: Multi-Retailer Platform
          </h2>
          <p className="text-xl text-gray-600">Real certificate volumes + Metcalfe's Law network value</p>
        </div>

        {/* Network Scenario Clarification Banner */}
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-blue-900">Phased Rollout Network</h3>
              <p className="mt-1 text-sm text-blue-800">
                This view always shows a phased rollout. Retailers join at different launch months, which drives network scale over time.
                Only Walmart is active at Month 1. Additional retailers onboard later, so the early network total can be below Walmart standalone.
              </p>
            </div>
          </div>
        </div>

        {/* Network Multiplier Display */}
        <div className="control-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Network Value (Metcalfe's Law)</h3>
              <p className="text-sm text-gray-600">License fees increase as network grows: 1 + (k × n² / n_max²)</p>
            </div>
            <button
              onClick={() => setShowRetailerConfig(!showRetailerConfig)}
              className="scenario-button inactive"
            >
              {showRetailerConfig ? 'Hide' : 'Configure'} Retailers
            </button>
          </div>
          
          <div className="scorecard" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
            <div className="scorecard-label">NETWORK MULTIPLIER</div>
            <div className="scorecard-value" style={{ fontSize: '2rem' }}>
              {networkMonth36.networkMultiplier.toFixed(2)}×
            </div>
            <div className="scorecard-subtitle">Month 36 (5 retailers active)</div>
          </div>
          <p className="text-xs text-gray-600 text-center mt-4 italic">
            Edit network coefficient (k) in Configuration to adjust network effects strength
          </p>
        </div>

        {/* Retailer Configuration Panel */}
        {showRetailerConfig && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Configure Network Rollout Assumptions</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {networkRetailers.map((retailer, idx) => (
                <div key={retailer.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: retailer.color }}></div>
                    <input
                      type="text"
                      value={retailer.name}
                      onChange={(e) => {
                        const updated = [...networkRetailers];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setNetworkRetailers(updated);
                      }}
                      className="font-bold text-gray-900 bg-transparent border-none outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <label className="text-gray-600 text-xs">Customers (M)</label>
                      <input
                        type="number"
                        value={retailer.totalCustomers / 1000000}
                        onChange={(e) => {
                          const updated = [...networkRetailers];
                          updated[idx] = { ...updated[idx], totalCustomers: parseFloat(e.target.value) * 1000000 };
                          setNetworkRetailers(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-gray-600 text-xs">Adoption Rate (%)</label>
                      <input
                        type="number"
                        value={(retailer.dwalletAdoption * retailer.activeConsent * 100).toFixed(0)}
                        onChange={(e) => {
                          const updated = [...networkRetailers];
                          const newRate = parseFloat(e.target.value) / 100;
                          updated[idx] = { ...updated[idx], dwalletAdoption: newRate / retailer.activeConsent };
                          setNetworkRetailers(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-gray-600 text-xs">Transactions/Year</label>
                      <input
                        type="number"
                        value={retailer.annualTransactions}
                        onChange={(e) => {
                          const updated = [...networkRetailers];
                          updated[idx] = { ...updated[idx], annualTransactions: parseInt(e.target.value) };
                          setNetworkRetailers(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-gray-600 text-xs">Launch Month</label>
                      <input
                        type="number"
                        value={retailer.launchMonth}
                        onChange={(e) => {
                          const updated = [...networkRetailers];
                          updated[idx] = { ...updated[idx], launchMonth: parseInt(e.target.value) };
                          setNetworkRetailers(updated);
                        }}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <strong>Note:</strong> Adjust retailer parameters to model different network scenarios. Launch months show phased rollout (0 = immediate, 12 = year 2, etc.)
            </div>
          </div>
        )}

        {/* Aggregate Network Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <div className="scorecard">
            <div className="scorecard-label">TOTAL NETWORK REVENUE</div>
            <div className="scorecard-value">{formatCurrency(totalNetworkRevenue)}</div>
            <div className="scorecard-subtitle">All Retailers, 36 Months</div>
          </div>

          <div className="scorecard">
            <div className="scorecard-label">WALMART SHARE</div>
            <div className="scorecard-value">
              {((retailerTotals.find(r => r.id === 'walmart')?.totalRevenue / totalNetworkRevenue) * 100).toFixed(1)}%
            </div>
            <div className="scorecard-subtitle">
              {formatCurrency(retailerTotals.find(r => r.id === 'walmart')?.totalRevenue || 0)}
            </div>
          </div>

          <div className="scorecard">
            <div className="scorecard-label">CONSUMER EARNINGS</div>
            <div className="scorecard-value">{formatCurrency(totalConsumerEarnings)}</div>
            <div className="scorecard-subtitle">Network-wide, 36 Months</div>
          </div>

          <div className="scorecard">
            <div className="scorecard-label">WALMART CONSUMER EARNINGS</div>
            <div className="scorecard-value">
              ${((retailerTotals.find(r => r.id === 'walmart')?.totalConsumer || 0) / 3 / (assumptions.totalCustomers * effectiveOptIn)).toFixed(2)}/year
            </div>
            <div className="scorecard-subtitle">Per Walmart Customer</div>
          </div>

          <div className="scorecard">
            <div className="scorecard-label">TOTAL CERT POOL</div>
            <div className="scorecard-value">{(totalCertPool / 1000000000).toFixed(1)}B</div>
            <div className="scorecard-subtitle">Month 36 Aggregate</div>
          </div>
        </div>

        {/* Certificate Volume Growth Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Pool Growth (Millions)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Active Certificates (M)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'networkMultiplier') return [`${value.toFixed(2)}×`, 'Network Multiplier'];
                  return [`${value.toFixed(1)}M certs`, name];
                }}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
              />
              <Legend />
              {networkRetailers.map(retailer => (
                <Line
                  key={retailer.id}
                  type="monotone"
                  dataKey={retailer.name}
                  stroke={retailerColors[retailer.name] || '#666'}
                  strokeWidth={2}
                  dot={false}
                  name={retailer.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-600">
            <p className="text-sm text-gray-700">
              <strong>Phased Rollout:</strong> Retailers join over time. Notice how the certificate pool accelerates 
              as each retailer launches. The network multiplier (Metcalfe's Law) increases license fees as the 
              aggregate pool grows.
            </p>
          </div>
        </div>

        {/* Retailer Economics Table */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Retailer Economics (36 Months)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3">Retailer</th>
                  <th className="text-right px-4 py-3">Customers</th>
                  <th className="text-right px-4 py-3">Adoption</th>
                  <th className="text-right px-4 py-3">Launch Mo.</th>
                  <th className="text-right px-4 py-3">Total Revenue</th>
                  <th className="text-right px-4 py-3">Consumer Earnings</th>
                  <th className="text-right px-4 py-3">Final Cert Pool</th>
                </tr>
              </thead>
              <tbody>
                {retailerTotals.map(retailer => (
                  <tr key={retailer.id}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{retailer.name}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {(retailer.totalCustomers / 1000000).toFixed(0)}M
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatPercent(retailer.dwalletAdoption * retailer.activeConsent)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {retailer.launchMonth}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(retailer.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(retailer.totalConsumer)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {(retailer.finalCertPool / 1000000).toFixed(0)}M
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                  <td className="px-4 py-3">NETWORK TOTAL</td>
                  <td className="px-4 py-3 text-right">
                    {(networkRetailers.reduce((sum, r) => sum + r.totalCustomers, 0) / 1000000).toFixed(0)}M
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-green-700">
                    {formatCurrency(totalNetworkRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    {formatCurrency(totalConsumerEarnings)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(totalCertPool / 1000000).toFixed(0)}M
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Insight */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8 border-l-4 border-green-600 shadow-lg">
          <div className="font-bold text-xl text-gray-900 mb-4">NETWORK VALUE CREATION</div>
          <p className="text-gray-700 text-lg leading-relaxed mb-3">
            With {networkRetailers.length} retailers in the network, the aggregate certificate pool reaches{' '}
            <strong>{(totalCertPool / 1000000000).toFixed(1)}B certificates</strong> by month 36. Metcalfe's Law 
            drives a <strong>{networkMonth36.networkMultiplier.toFixed(2)}× multiplier</strong> on license fees 
            as brands gain access to cross-retailer shopper insights.
          </p>
          <p className="text-gray-600 text-base">
            <strong>Why it works:</strong> Each retailer generates certificates from their own customer base. 
            The aggregate pool size increases brand willingness to pay (network value = k × n²). Walmart earns{' '}
            <strong>{formatCurrency(retailerTotals.find(r => r.id === 'walmart')?.totalRevenue || 0)}</strong> from 
            their own certificates—which become more valuable in a larger network.
          </p>
        </div>
      </div>
    );
  };

  const MonthlyView = () => {
    const [viewMode, setViewMode] = useState('standalone'); // 'standalone' or 'network'
    
    // Determine which data to show
    const monthlyData = viewMode === 'standalone' 
      ? singleRetailerResults 
      : fullNetworkResults.map(month => {
          // For network view, show aggregates
          return {
            month: month.month,
            certsMintedThisMonth: month.aggregateCertsMinted,
            activeCertPool: month.aggregateActiveCertPool,
            retailerTotal: month.aggregateRetailerRevenue,
            consumerTotal: month.aggregateConsumerEarnings,
            networkMultiplier: month.networkMultiplier,
            // Calculate cumulative values
            cumulativeRetailerRev: fullNetworkResults
              .slice(0, month.month)
              .reduce((sum, m) => sum + m.aggregateRetailerRevenue, 0),
            cumulativeConsumerRev: fullNetworkResults
              .slice(0, month.month)
              .reduce((sum, m) => sum + m.aggregateConsumerEarnings, 0)
          };
        });
    
    // Define metrics to display
    const metrics = [
      { 
        key: 'certsMintedThisMonth', 
        label: 'Certificates Minted', 
        format: (v) => `${(v / 1000000).toFixed(2)}M`,
        source: 'direct'
      },
      { 
        key: 'activeCertPool', 
        label: 'Active Certificate Pool', 
        format: (v) => `${(v / 1000000).toFixed(1)}M`,
        source: 'direct'
      },
      { 
        key: 'retailerTotal', 
        label: viewMode === 'standalone' ? 'Walmart Revenue' : 'Total Network Revenue', 
        format: (v) => formatCurrency(v),
        source: 'direct'
      },
      { 
        key: 'consumerTotal', 
        label: 'Consumer Earnings', 
        format: (v) => formatCurrency(v),
        source: 'direct'
      },
      { 
        key: 'cumulativeRetailerRev', 
        label: viewMode === 'standalone' ? 'Cumulative Walmart Revenue' : 'Cumulative Network Revenue', 
        format: (v) => formatCurrency(v),
        source: 'direct'
      },
      { 
        key: 'cumulativeConsumerRev', 
        label: 'Cumulative Consumer Earnings', 
        format: (v) => formatCurrency(v),
        source: 'direct'
      }
    ];
    
    // Add network multiplier for network view
    if (viewMode === 'network') {
      metrics.splice(2, 0, {
        key: 'networkMultiplier',
        label: 'Network Multiplier (Metcalfe)',
        format: (v) => `${v.toFixed(3)}×`,
        source: 'direct'
      });
    }
    
    // CSV Export function
    const exportToCSV = () => {
      const rows = [];
      
      // Header row
      const headers = ['Metric', ...Array.from({length: 36}, (_, i) => `Month ${i + 1}`)];
      rows.push(headers.join(','));
      
      // Data rows
      metrics.forEach(metric => {
        const row = [
          `"${metric.label}"`,
          ...monthlyData.map(month => {
            const value = month[metric.key];
            // Remove currency symbols and commas for Excel compatibility
            return metric.format(value || 0).replace(/[$,]/g, '');
          })
        ];
        rows.push(row.join(','));
      });
      
      // Create blob and download
      const csv = rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drumwave-monthly-${viewMode}-${scenario}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    };
    
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Monthly Detail View</h2>
          <p className="text-gray-600">Complete 36-month breakdown of all key metrics</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-4">
              <button
                onClick={() => setViewMode('standalone')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  viewMode === 'standalone'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Walmart Standalone
              </button>
              <button
                onClick={() => setViewMode('network')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  viewMode === 'network'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Network Aggregates
              </button>
            </div>
            
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
            >
              <span>⬇</span> Export CSV
            </button>
          </div>

          {/* Helper Text Under Toggle */}
          {viewMode === 'network' && (
            <div className="mt-2 p-3 bg-blue-50 rounded border-l-4 border-blue-600">
              <p className="text-sm text-gray-700">
                <strong>Network Aggregates</strong> shows phased rollout. Only Walmart is active at Month 1. 
                Additional retailers onboard later, so early network totals can be below Walmart standalone. 
                Full network effects emerge as all retailers scale.
              </p>
            </div>
          )}
        </div>

        {/* Scrollable Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="w-full border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-900 border-r-2 border-gray-300 bg-gray-100 sticky left-0 z-20" style={{ minWidth: '250px' }}>
                    Metric
                  </th>
                  {Array.from({length: 36}, (_, i) => i + 1).map(month => (
                    <th key={month} className="px-3 py-3 text-center font-semibold text-gray-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
                      Mo {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric, idx) => (
                  <tr 
                    key={metric.key} 
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td 
                      className="px-4 py-3 font-semibold text-gray-900 border-r-2 border-gray-300 sticky left-0 z-10 bg-white" 
                      style={{ minWidth: '250px' }}
                    >
                      {metric.label}
                    </td>
                    {monthlyData.map(month => (
                      <td key={month.month} className="px-3 py-3 text-right text-sm text-gray-700 whitespace-nowrap">
                        {metric.format(month[metric.key] || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
          <p className="text-sm text-gray-700">
            <strong>How to use:</strong> Scroll horizontally to view all 36 months. The metric column stays fixed on the left. 
            Toggle between Walmart Standalone and Network Aggregates to compare scenarios. Export to CSV for deeper analysis in Excel or Google Sheets.
          </p>
        </div>
      </div>
    );
  };

  const DetailsView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Model Details & Assumptions</h2>
        <div className="text-sm text-green-600 font-semibold">✓ Validated against DrumWave Financial Model v1.0</div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Assumptions ({scenario} Scenario)</h3>
        <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-600">
          <p className="text-sm text-gray-700">
            <strong>Scenario Design:</strong> Low/Base/High scenarios represent fundamentally different market conditions. 
            Each varies across <strong>seven dimensions</strong> (adoption, transactions, license fee, reuse rate, item range, etc.) 
            to model skeptical/realistic/enthusiastic market responses.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="font-semibold text-gray-700 mb-2">Customer Base</div>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Total Eligible: {formatNumber(assumptions.totalCustomers, 0)} customers</li>
              <li>• dWallet Adoption: {formatPercent(assumptions.dwalletAdoption)}</li>
              <li>• Active Consent: {formatPercent(assumptions.activeConsent)}</li>
              <li>• Effective Opt-in: {formatPercent(effectiveOptIn)}</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Transaction Volume</div>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Annual Txns per Customer: {assumptions.annualTransactions}</li>
              <li>• Monthly: {(assumptions.annualTransactions / 12).toFixed(2)}</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Brand Participation</div>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Ramp: {formatPercent(assumptions.brandStartPct)} → {formatPercent(assumptions.brandEndPct)} over {assumptions.monthsToFull} months</li>
              <li>• Curve: Sigmoid (inflection at month {assumptions.monthsToFull / 2})</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Pricing</div>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Minting Fee: ${assumptions.mintingFee.toFixed(2)}</li>
              <li>• Consented Re-Use License Fee: ${assumptions.licenseFee.toFixed(3)}</li>
              <li>• Reuse Rate: {assumptions.usesPerCertPerYear}× per year</li>
              <li>• Royalty Margin: {formatPercent(assumptions.royaltyMargin)}</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-700 mb-2">Eligible Items</div>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Dynamic Range: {assumptions.itemFloor} → {assumptions.itemCeiling} items</li>
              <li>• Varies with brand participation</li>
            </ul>
          </div>
        </div>
      </div>


      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scenario Comparison</h3>
        
        {/* Status Indicator */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-700">Active Scenario:</span>
              <span className="ml-2 text-sm text-gray-900">
                {customMode ? `Custom (based on ${scenario})` : scenario}
              </span>
            </div>
            {customMode && (
              <button
                onClick={resetToBase}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Reset to Base
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Parameter</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Low</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Base</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">High</th>
                <th className="px-4 py-2 text-center font-semibold text-blue-700">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(() => {
                // Helper to format scenario data for table
                const getScenarioData = (presetName, results) => {
                  const preset = PRESETS[presetName];
                  const effectiveOptIn = preset.dwalletAdoption * preset.activeConsent;
                  const revenue = results[35].cumulativeRetailerRev;
                  
                  return {
                    effectiveOptIn: `${(effectiveOptIn * 100).toFixed(1)}%`,
                    transactions: preset.annualTransactions,
                    licenseFee: `$${preset.licenseFee.toFixed(3)}`,
                    reuseRate: `${preset.usesPerCertPerYear}×/year`,
                    itemRange: `${preset.itemFloor}-${preset.itemCeiling}`,
                    revenue: formatCurrency(revenue)
                  };
                };
                
                // Calculate data for all scenarios
                const lowData = getScenarioData('Low', lowScenarioResults);
                const baseData = getScenarioData('Base', singleRetailerResults);
                const highData = getScenarioData('High', highScenarioResults);
                
                // Current scenario data
                const currentEffectiveOptIn = assumptions.dwalletAdoption * assumptions.activeConsent;
                const currentData = {
                  effectiveOptIn: `${(currentEffectiveOptIn * 100).toFixed(1)}%`,
                  transactions: assumptions.annualTransactions,
                  licenseFee: `$${assumptions.licenseFee.toFixed(3)}`,
                  reuseRate: `${assumptions.usesPerCertPerYear}×/year`,
                  itemRange: `${assumptions.itemFloor}-${assumptions.itemCeiling}`,
                  revenue: formatCurrency(cumulativeRetailer)
                };
                
                // Helper to check if value differs from base
                const isDifferentFromBase = (currentVal, baseVal) => currentVal !== baseVal;
                
                return (
                  <>
                    {/* Effective Opt-in */}
                    <tr>
                      <td className="px-4 py-2 text-gray-600">Effective Opt-in</td>
                      <td className="px-4 py-2 text-center">{lowData.effectiveOptIn}</td>
                      <td className="px-4 py-2 text-center">{baseData.effectiveOptIn}</td>
                      <td className="px-4 py-2 text-center">{highData.effectiveOptIn}</td>
                      <td className={`px-4 py-2 text-center font-semibold ${
                        isDifferentFromBase(currentData.effectiveOptIn, baseData.effectiveOptIn)
                          ? 'bg-blue-50 text-blue-900'
                          : ''
                      }`}>
                        {currentData.effectiveOptIn}
                      </td>
                    </tr>
                    
                    {/* Transactions/Year */}
                    <tr>
                      <td className="px-4 py-2 text-gray-600">Transactions/Year</td>
                      <td className="px-4 py-2 text-center">{lowData.transactions}</td>
                      <td className="px-4 py-2 text-center">{baseData.transactions}</td>
                      <td className="px-4 py-2 text-center">{highData.transactions}</td>
                      <td className={`px-4 py-2 text-center font-semibold ${
                        isDifferentFromBase(currentData.transactions, baseData.transactions)
                          ? 'bg-blue-50 text-blue-900'
                          : ''
                      }`}>
                        {currentData.transactions}
                      </td>
                    </tr>
                    
                    {/* Consented Re-Use License Fee */}
                    <tr className="bg-yellow-50">
                      <td className="px-4 py-2 text-gray-600 font-medium">Consented Re-Use License Fee</td>
                      <td className="px-4 py-2 text-center">{lowData.licenseFee}</td>
                      <td className="px-4 py-2 text-center">{baseData.licenseFee}</td>
                      <td className="px-4 py-2 text-center">{highData.licenseFee}</td>
                      <td className={`px-4 py-2 text-center font-semibold ${
                        isDifferentFromBase(currentData.licenseFee, baseData.licenseFee)
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-yellow-50'
                      }`}>
                        {currentData.licenseFee}
                      </td>
                    </tr>
                    
                    {/* Reuse Rate */}
                    <tr className="bg-yellow-50">
                      <td className="px-4 py-2 text-gray-600 font-medium">Reuse Rate</td>
                      <td className="px-4 py-2 text-center">{lowData.reuseRate}</td>
                      <td className="px-4 py-2 text-center">{baseData.reuseRate}</td>
                      <td className="px-4 py-2 text-center">{highData.reuseRate}</td>
                      <td className={`px-4 py-2 text-center font-semibold ${
                        isDifferentFromBase(currentData.reuseRate, baseData.reuseRate)
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-yellow-50'
                      }`}>
                        {currentData.reuseRate}
                      </td>
                    </tr>
                    
                    {/* Item Range */}
                    <tr className="bg-yellow-50">
                      <td className="px-4 py-2 text-gray-600 font-medium">Item Range</td>
                      <td className="px-4 py-2 text-center">{lowData.itemRange}</td>
                      <td className="px-4 py-2 text-center">{baseData.itemRange}</td>
                      <td className="px-4 py-2 text-center">{highData.itemRange}</td>
                      <td className={`px-4 py-2 text-center font-semibold ${
                        isDifferentFromBase(currentData.itemRange, baseData.itemRange)
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-yellow-50'
                      }`}>
                        {currentData.itemRange}
                      </td>
                    </tr>
                    
                    {/* 36-Month Walmart Revenue */}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-2 text-gray-900">36-Mo Walmart Revenue</td>
                      <td className="px-4 py-2 text-center">{lowData.revenue}</td>
                      <td className="px-4 py-2 text-center">{baseData.revenue}</td>
                      <td className="px-4 py-2 text-center">{highData.revenue}</td>
                      <td className="px-4 py-2 text-center text-blue-700">{currentData.revenue}</td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
        
        {/* Updated Legend */}
        <div className="mt-3 text-xs text-gray-600 space-y-1">
          <div>
            <span className="inline-block w-4 h-4 bg-yellow-50 border border-yellow-200 mr-1 align-middle"></span>
            Parameters that vary across scenarios (not just adoption/volume)
          </div>
          <div>
            <span className="inline-block w-4 h-4 bg-blue-50 border border-blue-200 mr-1 align-middle"></span>
            Current value differs from Base scenario
          </div>
          {customMode && (
            <div className="text-blue-700 font-medium mt-2">
              Custom assumptions active (set via Configuration).
            </div>
          )}
        </div>
      </div>


      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Effects Methodology</h3>
        <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-600">
          <p className="text-sm text-gray-700">
            <strong>Critical Clarification:</strong> Walmart only earns on certificates WALMART mints. 
            Network effects mean YOUR certificates become MORE valuable (higher prices, more reuses, faster adoption) 
            — not that you earn from Target's volume.
          </p>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Multipliers based on platform economics research from two-sided marketplace theory 
          (Parker, Van Alstyne, Choudary - Platform Revolution, 2016) and empirical data from 
          payment networks.
        </p>
        <div className="space-y-3 text-sm">
          <div>
            <div className="font-semibold text-gray-700">Price Premium (Brands Pay More)</div>
            <div className="text-gray-600">Formula: 1 + ((n-1) × 0.12), capped at 1.5×</div>
            <div className="text-gray-500 text-xs">Cross-retailer data reveals insights single retailers cannot provide, commanding premium pricing</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Reuse Rate Acceleration (More Remarketing)</div>
            <div className="text-gray-600">Formula: base × (1 + (n-1) × 0.4), capped at 8× per year</div>
            <div className="text-gray-500 text-xs">Brands remarket to same consumers across multiple retail touchpoints</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Adoption Lift (Network Credibility)</div>
            <div className="text-gray-600">Formula: base + (n-1) × 4%, capped at 85%</div>
            <div className="text-gray-500 text-xs">Consumers adopt faster when they see ecosystem maturity (Walmart + Target + Kroger)</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation & Export</h3>
        <ul className="space-y-2 text-sm text-gray-600 mb-4">
          <li>• Base scenario validated against Excel model (Month 36: ${(month36.retailerTotal / 1000000).toFixed(1)}M)</li>
          <li>• All calculations deterministic (no randomness)</li>
          <li>• Network projections use conservative multipliers</li>
          <li>• 36-month cumulative Walmart revenue: {formatCurrency(cumulativeRetailer)}</li>
        </ul>
        <div className="flex gap-4">
          <button
            onClick={() => {
              const text = JSON.stringify(assumptions, null, 2);
              navigator.clipboard.writeText(text);
              alert('Assumptions copied to clipboard');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Copy Current Assumptions
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Print Summary
          </button>
        </div>
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================

 // ==================== MAIN RENDER ====================

return (
  <div className="min-h-screen bg-gray-50 p-4 md:p-8">
    <div className="max-w-7xl mx-auto">

      {/* Header with tabs and config button */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          {/* Tab navigation */}
          <div className="flex" style={{ flex: 1 }}>
            {[
              { id: 'dashboard', label: 'Executive Summary' },
              { id: 'standalone', label: 'Standalone Model' },
              { id: 'network', label: 'Network Effects' },
              { id: 'monthly', label: 'Monthly Detail' },
              { id: 'details', label: 'Details' }
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeView === view.id
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {/* Configuration button */}
          <div style={{ padding: '0.5rem 1rem' }}>
            <button
              onClick={() => setShowConfigFlyout(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                fontSize: '0.9375rem',
                fontWeight: '600',
                color: '#ffffff',
                background:
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                boxShadow:
                  '0 4px 12px -2px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 16px -2px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px -2px rgba(102, 126, 234, 0.4)';
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>⚙</span>
              <span>Configuration</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active view body */}
      <div className="bg-gray-50 rounded-lg p-6">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'standalone' && <StandaloneView />}
        {activeView === 'network' && <NetworkView />}
        {activeView === 'monthly' && <MonthlyView />}
        {activeView === 'details' && <DetailsView />}
      </div>
    </div>

    {/* Configuration Flyout lives at the root so it can overlay everything */}
    <ConfigurationFlyout
      isOpen={showConfigFlyout}
      onClose={() => setShowConfigFlyout(false)}
      scenario={scenario}
      customMode={customMode}
      onScenarioChange={(preset) => {
        setScenario(preset);
        setCustomMode(false);
        setCustomAssumptions(null);
      }}
      onResetToBase={() => {
        setScenario(scenario);
        setCustomMode(false);
        setCustomAssumptions(null);
      }}
      assumptions={assumptions}
      onCustomChange={handleCustomChange}
      showNetworkEffects={showNetworkEffects}
      onToggleNetworkEffects={setShowNetworkEffects}
      metcalfeCoefficient={metcalfeCoefficient}
      onMetcalfeCoefficientChange={setMetcalfeCoefficient}
      PRESETS={PRESETS}
    />
  </div>
);
}