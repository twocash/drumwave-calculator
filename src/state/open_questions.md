# Open Questions: Global Configuration Flyout Design

**Created:** 2025-01-28  
**Context:** Step 1 of Configuration Flyout Implementation  
**Purpose:** Resolve strategic questions before building the ⚙ Configuration Flyout UI component

---

## Strategic Questions

### 1. WHICH VARIABLES SHOULD BE LIVE-ADJUSTABLE IN A WALMART PITCH?

**Context:** Some variables are "show your work" modeling inputs. Others telegraph internal assumptions or roadmap timing that may distract from the value proposition.

**Variables to Consider:**

**✅ SAFE FOR LIVE ADJUSTMENT (High confidence)**
- Adoption Rate (effectiveOptIn) - Shows scenarios under different adoption levels
- Transactions/Year - Demonstrates volume sensitivity
- Brand Ramp Duration - Shows patience vs. aggressive rollout
- Reuse Rate - Illustrates remarketing intensity

**⚠️ QUESTIONABLE FOR LIVE ADJUSTMENT (Need discussion)**
- Consented Re-Use License Fee ($0.150-$0.200) - Reveals pricing strategy; may anchor negotiations
- Royalty Margin (95%) - Shows internal margin structure; typically confidential
- Minting Fee ($0.10) - Fixed infrastructure cost; changing it may confuse value prop

**❌ LIKELY SHOULD STAY HIDDEN (Internal modeling only)**
- Item Floor/Ceiling - Product mix assumptions that are too granular for C-suite
- Brand Start/End % - Implementation details that clutter the story
- Active Consent Rate - Already baked into Adoption Rate; exposing it adds complexity

**DECISION NEEDED:**
- Should Walmart see pricing variables (license fee, minting fee) live?
- If yes: Does this strengthen transparency or weaken negotiating position?
- If no: How do we communicate that these are validated assumptions?

---

### 2. INTERNAL-ONLY VS. PITCH-READY CONTROLS

**Proposed Segmentation:**

**TIER 1: Always Visible (Pitch-Safe Scenario Drivers)**
- Scenario Selector (Low/Base/High) - already prominent
- Adoption Rate slider
- Transactions/Year slider
- Brand Ramp Duration slider
- Network Effects toggle

**TIER 2: Advanced Configuration (Behind "Advanced Settings" or "Internal Only" toggle)**
- Consented Re-Use License Fee
- Reuse Rate (usesPerCertPerYear)
- Royalty Margin
- Minting Fee
- Item Floor/Ceiling

**TIER 3: Developer/Admin Only (Not exposed in Config Flyout)**
- Total Customers (fixed at 120M)
- Active Consent Rate (baked into scenarios)
- Brand Start/End %
- Individual retailer brand ramp parameters

**DECISION NEEDED:**
- Is a two-tier config UI (Basic + Advanced) sufficient?
- Should we use a "Demo Mode" toggle that shows only safe variables?

---

### 3. ROYALTY MARGIN: EXPOSE OR HIDE?

**Current State:**
- Royalty Margin is adjustable (50-95%) in Standalone Model tab
- Only affects "EBIT per Customer" calculation
- NOT used in any revenue projections (it's a post-revenue margin assumption)
- Currently set to 95% across all scenarios

**The Question:**
- Does exposing this variable add strategic value in a pitch?
- OR does it signal internal margin structure that should remain confidential?

**Arguments FOR exposure:**
- Shows DrumWave's confidence in low operating costs (95% margin = 5% opex)
- Lets Walmart model their own cost structure assumptions
- Demonstrates transparency

**Arguments AGAINST exposure:**
- Margin structure is typically confidential in partnerships
- 95% margin may seem unrealistic without context (infrastructure is low-touch)
- Adds complexity without changing top-line value prop

**RECOMMENDATION:** Hide by default, optionally show in "Advanced Settings" panel.

---

### 4. LAUNCH MONTH: ROADMAP SIGNAL OR SCENARIO TOOL?

**Current State:**
- Network Effects tab shows per-retailer Launch Month (0, 6, 12, 18, 24)
- This is a phased rollout assumption for multi-retailer scenario
- Currently editable in Retailer Config panel

**The Question:**
- Does showing launch months telegraph DrumWave's roadmap timing?
- If Walmart sees "Target: Month 6, Kroger: Month 12," does that set expectations?

**Arguments FOR exposure:**
- Demonstrates realistic phased rollout vs. unrealistic "all at once" model
- Lets Walmart model what network effects look like at different stages
- Shows strategic thinking about sequencing

**Arguments AGAINST exposure:**
- Signals specific partnership timing that may be premature
- Creates expectations ("When will you actually sign Target?")
- Network Effects tab is already complex; this adds cognitive load

**RECOMMENDATION:** Keep in Retailer Config panel but add disclaimer: "Launch months are illustrative scenarios, not confirmed roadmap."

---

### 5. NETWORK COEFFICIENT (k): TOO TECHNICAL FOR WALMART?

**Current State:**
- Metcalfe Coefficient slider (k = 0.1 to 1.0) on Network Effects tab
- Controls how aggressively license fees increase with network size
- Very technical; requires understanding of Metcalfe's Law

**The Question:**
- Is this too "under the hood" for a C-suite pitch?
- Should it be hidden behind "Advanced Settings"?

**Arguments FOR exposure:**
- Demonstrates rigor ("We're not making up 10× claims; here's the math")
- Lets skeptical finance teams stress-test assumptions
- Slider makes it tangible ("Move this, see revenue change")

**Arguments AGAINST exposure:**
- Introduces jargon (Metcalfe's Law, network coefficient)
- Most execs won't know what value to use (is 0.5 aggressive? conservative?)
- Adds decision fatigue in a pitch setting

**RECOMMENDATION:** Move to "Advanced Settings" or add tooltip/help text: "Conservative (0.3) vs. Aggressive (0.7)" with context.

---

## Proposed Config Flyout Structure

Based on above analysis, here's a DRAFT structure:

```
⚙ Configuration Flyout (Slide-in Panel from Right)

┌─────────────────────────────────────────┐
│ MODEL CONFIGURATION                     │
├─────────────────────────────────────────┤
│                                         │
│ Scenario Presets                        │
│ ○ Low  ● Base  ○ High   [Custom]       │
│                                         │
│ ▼ ADOPTION & VOLUME                     │
│   Adoption Rate: [===●======] 56%      │
│   Transactions/Year: [====●=====] 65   │
│                                         │
│ ▼ BRAND PARTICIPATION                   │
│   Brand Ramp: [====●=====] 36 months   │
│                                         │
│ ▼ NETWORK EFFECTS                       │
│   □ Show Network Effects (5 retailers)  │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ [⚙ Advanced Settings ▼]                │
│   (collapsed by default)                │
│                                         │
│   ▼ PRICING ASSUMPTIONS                 │
│     License Fee: [===●====] $0.175     │
│     Reuse Rate: [====●=====] 4×/year   │
│     Royalty Margin: [========●=] 95%   │
│                                         │
│   ▼ CERTIFICATE DYNAMICS                │
│     Item Range: 2-8 items              │
│     Minting Fee: $0.10 (fixed)         │
│                                         │
│   ▼ NETWORK PARAMETERS                  │
│     Network Coefficient: [===●===] 0.5 │
│                                         │
└─────────────────────────────────────────┘
```

---

## Next Steps / Decisions Required

1. **Review with Jim:** Which variables are "pitch-safe" vs. "internal only"?
2. **Two-tier vs. Three-tier:** Basic, Advanced, Admin? Or just Basic + Advanced?
3. **Royalty Margin:** Show in Advanced or hide completely?
4. **Launch Month:** Keep editable or make read-only with disclaimer?
5. **Network Coefficient:** Advanced Settings or keep visible?
6. **UI Pattern:** Slide-in flyout (right side) vs. modal vs. collapsible sidebar?

---

## Additional Considerations

### Mobile Responsiveness
- Config Flyout will be challenging on mobile
- Consider: Mobile version uses full-screen modal instead of flyout?

### State Management
- Should config state persist across tab switches?
- Should it persist across page refreshes (localStorage)?
- How do we track "Custom" vs. preset scenarios?

### Change Indicators
- If a slider is moved, should we show "Modified from Base" badges?
- Should there be a "Reset to Base" button?

### Validation
- Min/max ranges for sliders (already defined in registry)
- Should unrealistic combinations trigger warnings? (e.g., 85% adoption + $0.200 license fee + 6× reuse = overly optimistic)

---

**STATUS:** Awaiting Jim's feedback on strategic questions 1-5 before proceeding to Step 2 (UI design + implementation).
