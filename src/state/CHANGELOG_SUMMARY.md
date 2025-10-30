# Changelog Summary: Variable Registry v1.0

**Date:** 2025-01-28  
**Step:** 1 of Configuration Flyout Build  
**Status:** ✅ Complete

---

## What We Built

**Created comprehensive Variable Registry documenting all 26 adjustable variables in the DrumWave calculator:**

- 13 core Walmart standalone variables (customers, adoption, transactions, pricing, brand ramp)
- 2 network effect controls (toggle, Metcalfe coefficient)
- 11 per-retailer configuration variables (name, customers, adoption, launch timing)

**Files Created:**
- `/src/state/variable_registry.json` - Complete variable documentation with metadata
- `/src/state/open_questions.md` - 5 strategic questions for configuration flyout design
- `/src/state/checkpoint_step1.json` - Progress checkpoint for handoff

---

## Key Findings

**Current State of Adjustability:**
- Only 8 out of 13 scenario-dependent variables have UI controls today
- Standalone Model tab exposes: adoption, transactions/year, brand ramp, license fee, reuse rate, royalty margin
- Network Effects tab exposes: 4 retailer properties (customers, adoption, transactions, launch month)
- Several high-impact variables are currently fixed across all scenarios

**What's Fixed (But Maybe Shouldn't Be):**
- Minting Fee: $0.10 (never changes)
- Active Consent Rate: 80-85% (baked into scenarios)
- Total Customers: 120M (Walmart's base, but could model different segments)
- Item Floor/Ceiling: Varies by scenario but not adjustable

**Naming Inconsistencies Identified:**
1. "Adoption Rate" means different things on Standalone tab vs. Network Config (dwalletAdoption vs. effectiveOptIn)
2. "Transactions/Year" vs. "annualTransactions" - same concept, different labels
3. Retailer-specific variables lack clear namespacing (totalCustomers vs. retailer_totalCustomers)

**Minimal-Impact Variable:**
- Royalty Margin is adjustable but only affects EBIT per Customer calculation
- Changing it from 50% to 95% doesn't touch any revenue projections
- Consider hiding or making read-only

---

## Strategic Questions to Resolve

Before building the Configuration Flyout UI, we need decisions on:

**1. Pitch-Safe vs. Internal-Only Variables**
- Which variables should Walmart see live in a pitch?
- Should pricing assumptions (license fee, minting fee) be exposed or kept confidential?
- Does showing Royalty Margin strengthen transparency or weaken negotiating position?

**2. Configuration Tiers**
- Two-tier (Basic + Advanced) or three-tier (Basic + Advanced + Admin)?
- Should "Advanced Settings" be collapsed by default?

**3. Specific Variable Decisions**
- Royalty Margin: Show, hide, or move to Advanced?
- Launch Month: Does it telegraph roadmap timing inappropriately?
- Network Coefficient: Too technical for C-suite? Move to Advanced Settings?

**4. UI Pattern**
- Slide-in flyout from right (desktop) + full-screen modal (mobile)?
- How to handle state persistence across tabs and page refreshes?

**5. Change Indicators**
- Show "Modified from Base" badges when sliders are moved?
- "Reset to Base" button placement?

---

## Recommended Variable Grouping for Config Flyout

**TIER 1: Always Visible (Pitch-Safe)**
- Scenario Selector (Low/Base/High/Custom)
- Adoption Rate (effectiveOptIn)
- Transactions/Year
- Brand Ramp Duration
- Network Effects Toggle

**TIER 2: Advanced Settings (Collapsed by Default)**
- Consented Re-Use License Fee
- Reuse Rate
- Royalty Margin
- Item Range (Floor/Ceiling)
- Minting Fee
- Network Coefficient (k)

**TIER 3: Developer/Internal Only (Not in Config Flyout)**
- Total Customers (hardcoded 120M)
- Active Consent Rate (baked into scenarios)
- Brand Start/End %
- Per-retailer brand ramp parameters

---

## Next Step

**STEP 2: Design & Implement Configuration Flyout Component**

Prerequisites:
- Jim's feedback on which variables are pitch-safe
- Confirmation on two-tier UI pattern
- Decision on Royalty Margin visibility

Deliverables:
- Wireframe/mockup of Configuration Flyout UI
- React component with collapsible sections
- State management for custom configurations
- Validation and change indicators
- Mobile responsiveness

---

**Questions for Jim:**

1. Should Walmart see pricing variables (license fee $0.150-$0.200) live in a pitch?
2. Is Royalty Margin (95%) too revealing of internal economics?
3. Do Launch Month parameters (Target: Month 6, Kroger: Month 12) set wrong expectations?
4. Two-tier (Basic + Advanced) sufficient, or do we need Admin-only third tier?
5. Should config state persist across page refreshes (localStorage)?

---

**Status:** Ready for Step 2 pending strategic decisions.
