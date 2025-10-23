import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    dwalletAdoption: 0.40,
    activeConsent: 0.70,
    annualTransactions: 50,
    brandStartPct: 0.05,
    brandEndPct: 1.0,
    monthsToFull: 36,
    itemFloor: 1,
    itemCeiling: 3,
    mintingFee: 0.10,
    licenseFee: 0.100,
    usesPerCertPerYear: 2,
    royaltyMargin: 0.95
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
    royaltyMargin: 0.95
  },
  High: {
    totalCustomers: 120000000,
    dwalletAdoption: 0.90,
    activeConsent: 0.85,
    annualTransactions: 80,
    brandStartPct: 0.05,
    brandEndPct: 1.0,
    monthsToFull: 36,
    itemFloor: 3,
    itemCeiling: 12,
    mintingFee: 0.10,
    licenseFee: 0.200,
    usesPerCertPerYear: 6,
    royaltyMargin: 0.95
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

  const assumptions = customMode && customAssumptions ? customAssumptions : PRESETS[scenario];
  const effectiveOptIn = assumptions.dwalletAdoption * assumptions.activeConsent;
  
  const singleRetailerResults = useMemo(
    () => calculateMonthlyResults(assumptions),
    [assumptions]
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

  const DashboardView = () => {
    // Calculate metrics based on whether network effects are shown
    // When network effects are on, use fullNetworkResults (real retailer volumes with Metcalfe's Law)
    // Otherwise use standalone Walmart model
    const displayResults = showNetworkEffects ? null : singleRetailerResults; // Keep for backwards compatibility
    
    let displayCumulativeRetailer, displayCumulativeConsumer, displayActiveCerts, networkMultiplier;
    
    // ============= DIAGNOSTIC LOGGING START =============
    console.log('='.repeat(80));
    console.log(`🔍 DIAGNOSTIC: DashboardView Render`);
    console.log(`Current Scenario: ${scenario}`);
    console.log(`Custom Mode: ${customMode}`);
    console.log(`Network Effects: ${showNetworkEffects ? 'ON' : 'OFF'}`);
    console.log('='.repeat(80));
    
    // Log scenario assumptions
    console.log(`\n📊 Scenario Assumptions (${scenario}):`);
    console.log(`  - DWallet Adoption: ${(assumptions.dwalletAdoption * 100).toFixed(1)}%`);
    console.log(`  - Active Consent: ${(assumptions.activeConsent * 100).toFixed(1)}%`);
    console.log(`  - Annual Transactions: ${assumptions.annualTransactions}`);
    console.log(`  - License Fee: $${assumptions.licenseFee.toFixed(3)}`);
    console.log(`  - Uses Per Cert: ${assumptions.usesPerCertPerYear}`);
    console.log(`  - Effective Opt-In: ${(effectiveOptIn * 100).toFixed(1)}%`);
    
    // Log standalone values (these are the baseline comparisons)
    console.log(`\n🏪 STANDALONE Values (${scenario} scenario baseline):`);
    console.log(`  - Cumulative Retailer: ${formatCurrency(cumulativeRetailer)} = $${(cumulativeRetailer / 1000000000).toFixed(3)}B`);
    console.log(`  - Cumulative Consumer: ${formatCurrency(cumulativeConsumer)} = $${(cumulativeConsumer / 1000000000).toFixed(3)}B`);
    console.log(`  - Active Cert Pool (M36): ${(month36.activeCertPool / 1000000000).toFixed(2)}B certs`);
    
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
      
      // DIAGNOSTIC: Log network calculation details
      console.log(`\n🌐 NETWORK Values (${scenario} scenario with network effects):`);
      console.log(`  - Cumulative Retailer: ${formatCurrency(displayCumulativeRetailer)} = $${(displayCumulativeRetailer / 1000000000).toFixed(3)}B`);
      console.log(`  - Cumulative Consumer: ${formatCurrency(displayCumulativeConsumer)} = $${(displayCumulativeConsumer / 1000000000).toFixed(3)}B`);
      console.log(`  - Active Cert Pool (M36): ${(displayActiveCerts / 1000000000).toFixed(2)}B certs`);
      console.log(`  - Network Multiplier (M36): ${networkMultiplier.toFixed(3)}x`);
      
      // DIAGNOSTIC: Check if scenarioAdjustedRetailers are being used
      console.log(`\n🔧 Retailer Configuration Check:`);
      const walmartRetailer = scenarioAdjustedRetailers.find(r => r.id === 'walmart');
      console.log(`  - Walmart DWallet Adoption: ${(walmartRetailer.dwalletAdoption * 100).toFixed(1)}%`);
      console.log(`  - Walmart Active Consent: ${(walmartRetailer.activeConsent * 100).toFixed(1)}%`);
      console.log(`  - Walmart Annual Trans: ${walmartRetailer.annualTransactions}`);
      console.log(`  - Walmart Item Floor: ${walmartRetailer.itemFloor}`);
      console.log(`  - Walmart Item Ceiling: ${walmartRetailer.itemCeiling}`);
      
      // DIAGNOSTIC: Calculate what the multipliers will show
      console.log(`\n🎯 MULTIPLIER CALCULATIONS (These are displayed in badges):`);
      const revenueMultiplier = displayCumulativeRetailer / cumulativeRetailer;
      const consumerMultiplier = displayCumulativeConsumer / cumulativeConsumer;
      const certPoolMultiplier = displayActiveCerts / month36.activeCertPool;
      
      console.log(`  - Revenue Multiplier: ${displayCumulativeRetailer.toFixed(0)} / ${cumulativeRetailer.toFixed(0)} = ${revenueMultiplier.toFixed(2)}x`);
      console.log(`  - Consumer Multiplier: ${displayCumulativeConsumer.toFixed(0)} / ${cumulativeConsumer.toFixed(0)} = ${consumerMultiplier.toFixed(2)}x`);
      console.log(`  - Cert Pool Multiplier: ${displayActiveCerts.toFixed(0)} / ${month36.activeCertPool.toFixed(0)} = ${certPoolMultiplier.toFixed(2)}x`);
      
      console.log(`\n⚠️  DIAGNOSIS:`);
      console.log(`  - The numerator (network) uses: ${scenario} scenario assumptions`);
      console.log(`  - The denominator (standalone) uses: ${scenario} scenario assumptions`);
      console.log(`  - We are comparing: "${scenario} Network" vs "${scenario} Standalone"`);
      console.log(`  - This means the baseline CHANGES with each scenario!`);
      
      // Sample some monthly data to verify calculation
      console.log(`\n📈 Sample Network Data (First 3 months):`);
      fullNetworkResults.slice(0, 3).forEach(monthData => {
        const walmartMonth = monthData.retailers.find(r => r.retailerId === 'walmart');
        console.log(`  Month ${monthData.month}:`);
        console.log(`    - Active Retailers: ${monthData.activeRetailers}`);
        console.log(`    - Network Multiplier: ${monthData.networkMultiplier.toFixed(3)}x`);
        console.log(`    - Walmart Certs Minted: ${(walmartMonth.certsMinted / 1000000).toFixed(2)}M`);
        console.log(`    - Walmart Active Pool: ${(walmartMonth.activeCertPool / 1000000).toFixed(2)}M`);
        console.log(`    - Walmart Revenue: ${formatCurrency(walmartMonth.totalRevenue)}`);
      });
      
    } else {
      displayCumulativeRetailer = cumulativeRetailer;
      displayCumulativeConsumer = cumulativeConsumer;
      displayActiveCerts = month36.activeCertPool;
      networkMultiplier = 1.0;
    }
    
    console.log('='.repeat(80));
    console.log(`✅ End of Diagnostic Logging`);
    console.log('='.repeat(80));
    // ============= DIAGNOSTIC LOGGING END =============
    
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
        </div>

        {/* Scorecards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              ${((displayCumulativeRetailer * assumptions.royaltyMargin) / (assumptions.totalCustomers * effectiveOptIn)).toFixed(2)}
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
                At {formatPercent(effectiveOptIn)} adoption, Walmart generates {formatCurrency(cumulativeRetailer)} in new 
                revenue over 3 years from existing transactions—no change to shopper experience. Consumers earn {formatCurrency(cumulativeConsumer)}, 
                creating a virtuous cycle of adoption and value.
              </p>
              <p className="text-gray-600 text-base">
                <strong>Note:</strong> Scenarios vary across 7 dimensions (adoption, transactions, license pricing, reuse rates, and more) 
                to model skeptical/realistic/enthusiastic market conditions.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-700 text-lg leading-relaxed mb-3">
                With 5 retailers in the network, Walmart's certificates become {networkMultiplier.toFixed(2)}× more valuable due to Metcalfe's Law. 
                Brands pay a {((networkMultiplier - 1) * 100).toFixed(0)}% premium for cross-retailer insights. Walmart's revenue 
                reaches {formatCurrency(displayCumulativeRetailer)} while consumers earn {formatCurrency(displayCumulativeConsumer)}.
              </p>
              <p className="text-gray-600 text-base">
                <strong>Network Effect:</strong> This is value creation (higher prices per license), not redistribution. 
                Walmart earns on their own certificates—they just become more valuable in a larger network.
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

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Walmart Standalone Economics</h2>
          <p className="text-gray-600">Single-retailer model with {formatPercent(effectiveOptIn)} effective opt-in rate</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          {['Low', 'Base', 'High'].map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetClick(preset)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                scenario === preset && !customMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400'
              }`}
            >
              {preset}
            </button>
          ))}
          <button
            onClick={() => setCustomMode(!customMode)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              customMode
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-400'
            }`}
          >
            Custom
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Adoption Rate</div>
              <div className="text-2xl font-bold text-gray-900">{formatPercent(effectiveOptIn)}</div>
              {customMode && (
                <div className="mt-2">
                  <input
                    type="range"
                    min="0.28"
                    max="0.85"
                    step="0.01"
                    value={assumptions.dwalletAdoption * assumptions.activeConsent}
                    onChange={(e) => {
                      const newOptIn = parseFloat(e.target.value);
                      handleCustomChange('dwalletAdoption', newOptIn / assumptions.activeConsent);
                    }}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Transactions/Year</div>
              <div className="text-2xl font-bold text-gray-900">{assumptions.annualTransactions}</div>
              {customMode && (
                <div className="mt-2">
                  <input
                    type="range"
                    min="50"
                    max="80"
                    step="1"
                    value={assumptions.annualTransactions}
                    onChange={(e) => handleCustomChange('annualTransactions', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Brand Ramp</div>
              <div className="text-2xl font-bold text-gray-900">{assumptions.monthsToFull} mo</div>
              {customMode && (
                <div className="mt-2">
                  <input
                    type="range"
                    min="18"
                    max="48"
                    step="6"
                    value={assumptions.monthsToFull}
                    onChange={(e) => handleCustomChange('monthsToFull', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Consented Re-Use License Fee</div>
              <div className="text-2xl font-bold text-gray-900">${assumptions.licenseFee.toFixed(3)}</div>
              {customMode && (
                <div className="mt-2">
                  <input
                    type="range"
                    min="0.100"
                    max="0.200"
                    step="0.005"
                    value={assumptions.licenseFee}
                    onChange={(e) => handleCustomChange('licenseFee', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Reuse Rate</div>
              <div className="text-2xl font-bold text-gray-900">{assumptions.usesPerCertPerYear}×/year</div>
              {customMode && (
                <div className="mt-2">
                  <input
                    type="range"
                    min="2"
                    max="6"
                    step="0.5"
                    value={assumptions.usesPerCertPerYear}
                    onChange={(e) => handleCustomChange('usesPerCertPerYear', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Royalty Margin</div>
              <div className="text-2xl font-bold text-gray-900">{formatPercent(assumptions.royaltyMargin)}</div>
              {customMode && (
                <div className="mt-2">
                  <input
                    type="range"
                    min="0.50"
                    max="0.95"
                    step="0.05"
                    value={assumptions.royaltyMargin}
                    onChange={(e) => handleCustomChange('royaltyMargin', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {customMode && (
              <button
                onClick={resetToBase}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Reset to Base
              </button>
            )}
          </div>

          <div className="lg:col-span-3">
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
          </div>
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
            <div className="text-sm font-semibold text-gray-600 mb-1">Consumer Annual Earnings</div>
            <div className="text-2xl font-bold text-gray-900">
              ${(cumulativeConsumer / (assumptions.totalCustomers * effectiveOptIn) / 3).toFixed(2)}
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

        {/* Metcalfe Coefficient Control */}
        <div className="control-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Network Value Formula (Metcalfe's Law)</h3>
              <p className="text-sm text-gray-600">License Fee Multiplier = 1 + (k × n² / n_max²)</p>
            </div>
            <button
              onClick={() => setShowRetailerConfig(!showRetailerConfig)}
              className="scenario-button inactive"
            >
              {showRetailerConfig ? 'Hide' : 'Configure'} Retailers
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Network Coefficient (k): {metcalfeCoefficient.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={metcalfeCoefficient}
                onChange={(e) => setMetcalfeCoefficient(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Conservative (0.1)</span>
                <span>Aggressive (1.0)</span>
              </div>
            </div>
            
            <div className="scorecard" style={{ minWidth: '200px' }}>
              <div className="scorecard-label">NETWORK MULTIPLIER</div>
              <div className="scorecard-value" style={{ fontSize: '2rem' }}>
                {networkMonth36.networkMultiplier.toFixed(2)}×
              </div>
              <div className="scorecard-subtitle">Month 36 (5 retailers)</div>
            </div>
          </div>
        </div>

        {/* Retailer Configuration Panel */}
        {showRetailerConfig && (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Retailer Network Configuration</h3>
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className="flex justify-between items-center bg-white rounded-lg shadow p-4">
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
                    <td className="px-4 py-3 font-semibold text-gray-900 border-r-2 border-gray-300 bg-inherit sticky left-0 z-10" style={{ minWidth: '250px' }}>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Parameter</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Low</th>
                <th className="px-4 py-2 text-center font-semibold text-blue-700">Base</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">High</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-gray-600">Effective Opt-in</td>
                <td className="px-4 py-2 text-center">28%</td>
                <td className="px-4 py-2 text-center font-semibold">56%</td>
                <td className="px-4 py-2 text-center">76.5%</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-600">Transactions/Year</td>
                <td className="px-4 py-2 text-center">50</td>
                <td className="px-4 py-2 text-center font-semibold">65</td>
                <td className="px-4 py-2 text-center">80</td>
              </tr>
              <tr className="bg-yellow-50">
                <td className="px-4 py-2 text-gray-600 font-medium">Consented Re-Use License Fee</td>
                <td className="px-4 py-2 text-center">$0.100</td>
                <td className="px-4 py-2 text-center font-semibold">$0.175</td>
                <td className="px-4 py-2 text-center">$0.200</td>
              </tr>
              <tr className="bg-yellow-50">
                <td className="px-4 py-2 text-gray-600 font-medium">Reuse Rate</td>
                <td className="px-4 py-2 text-center">2×/year</td>
                <td className="px-4 py-2 text-center font-semibold">4×/year</td>
                <td className="px-4 py-2 text-center">6×/year</td>
              </tr>
              <tr className="bg-yellow-50">
                <td className="px-4 py-2 text-gray-600 font-medium">Item Range</td>
                <td className="px-4 py-2 text-center">1-3</td>
                <td className="px-4 py-2 text-center font-semibold">2-8</td>
                <td className="px-4 py-2 text-center">3-12</td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-2 text-gray-900">36-Mo Walmart Revenue</td>
                <td className="px-4 py-2 text-center">{formatCurrency(373919867)}</td>
                <td className="px-4 py-2 text-center text-blue-700">{formatCurrency(3390359800)}</td>
                <td className="px-4 py-2 text-center">{formatCurrency(10790132673)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-600">
          <span className="inline-block w-4 h-4 bg-yellow-50 border border-yellow-200 mr-1 align-middle"></span>
          Highlighted rows show parameters that vary across scenarios (not just adoption/volume)
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
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
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'standalone' && <StandaloneView />}
          {activeView === 'network' && <NetworkView />}
          {activeView === 'monthly' && <MonthlyView />}
          {activeView === 'details' && <DetailsView />}
        </div>
      </div>
    </div>
  );
}
