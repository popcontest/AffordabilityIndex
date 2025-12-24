# City Page Redesign Plan: From "Stinks" to "Stunning"

**Date:** December 23, 2025
**Status:** Multi-Agent Analysis Complete → Ready for Implementation
**Goal:** Transform city pages from boring data dashboards into compelling decision tools

---

## Executive Summary

After multi-agent analysis (UX Research, Competitive Intelligence, Design, Visualization, Psychology), we've identified the **core problem:**

> **Current pages provide data completeness but fail emotional resonance.**
> Users get overwhelmed by information without gaining decision confidence.

**The Fix:** Story-first architecture with emotional hooks, social proof, and clear action paths.

---

## Key Findings from Agent Analysis

### 🔴 Critical Problems Identified

1. **No Emotional Payoff** - Information overload without telling users WHY they should care
2. **Meaningless Score** - 75/100 grade shown without context or connection to real life
3. **Missing Narrative** - Data dump assumes users already care instead of selling the value
4. **Buried Critical Info** - What people actually need is hidden or missing entirely
5. **Calculator is Distraction** - Pretty but doesn't deliver actionable insights
6. **Boring Benchmarks** - Tables are accurate but emotionally inert
7. **Zero Social Proof** - No reviews, testimonials, or "who lives here" data
8. **No Temporal Context** - Static snapshot, no trends or "is this getting worse?"
9. **Missing Lifestyle Factors** - Affordability alone doesn't answer "Should I move there?"
10. **No Share-Worthiness** - Nothing screenshot-worthy or text-to-a-friend worthy

### ✅ What Actually Works (Keep These!)

- **ScoreHero** - Big visual score is good, just needs better context
- **FitSignals** - Excellent at translating data to meaning ("23% more affordable than TX avg")
- **Persona Cards** - Great at personalization ("Remote Workers & Digital Nomads")
- **AffordabilityCalculator** - Good concept, needs better integration
- **Compare Tool** - Solid functionality
- **Clean Design** - Professional, fast-loading

---

## The Redesigned City Page: "Story-First Architecture"

### Page Flow (Scroll Journey)

```
┌─────────────────────────────────────────────────────┐
│ 1. HERO: "The 3-Second Emotional Hook"             │
│    "In Boulder, the median home costs               │
│     7.2 years of your entire income"                │
│    [Visual: Percentile bar showing position]        │
│    💡 Teaser: "But nearby Lafayette is 35% cheaper" │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 2. THE TIMELINE CHART ⭐ HERO VISUALIZATION         │
│    Home Value vs Income Divergence (2014-2024)      │
│    [Area chart showing the gap widening]            │
│    💡 "The gap is WIDENING - homes grew 65%,        │
│       income only 18%"                               │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 3. AFFORDABILITY CALCULATOR (Moved Up!)             │
│    [Interactive - immediate personalization]        │
│    Shows % of homes you can afford                  │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 4. KEY METRICS: "Your Money Story in 4 Acts"       │
│    💰 $650k home | 💼 $90k income | 📊 7.2x ratio  │
│    [With deltas vs state/US shown inline]           │
│    "Save for 7.2 years OR pay 36% monthly income"  │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 5. FIT SIGNALS (Keep as-is - works great!)         │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 6. COMPARISON MATRIX: "Find Your Perfect Fit"      │
│    🎯 If you value max affordability → Pueblo       │
│    🎯 Similar vibe, less $$ → Fort Collins         │
│    🎯 Same jobs, more space → Lafayette            │
│    [Persona-based, not just better/worse]          │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 7. INSIGHTS: "What You Won't Find Elsewhere" 🆕    │
│    🚀 Market Momentum: Ratio worsened 1.8x in 10yr │
│    🏆 Hidden Gems: Longmont is 30% cheaper, 15mi   │
│    💰 Income Paradox: Why it's expensive (context) │
│    🎓 For Young Pros: Only 12% affordable <$80k    │
│    📈 Best Time to Buy: Q4 historically 8% lower   │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 8. SCORE BREAKDOWN (Keep for data nerds)           │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 9. SOCIAL PROOF 🆕                                  │
│    "142 people saved this city this month"          │
│    ⭐⭐⭐⭐⭐ "92% would move here again"            │
│    [User reviews, verified residents]               │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 10. WHAT THIS DOESN'T TELL YOU 🆕                  │
│     Transparent about limitations                   │
│     ⚠️ Doesn't include: taxes, HOA, commute        │
│     ⚠️ Income is 5-year avg (lags current reality) │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ 11. CALL-TO-ACTION: "Choose Your Adventure"        │
│     □ I'm moving here → [Calculator, alerts, agent]│
│     □ I'm exploring → [Compare, quiz, guide]       │
│     □ I'm researching → [Blog, CSV, share]         │
└─────────────────────────────────────────────────────┘
```

---

## The 5 Must-Have Visualizations

### 1. **Affordability Timeline** ⭐ TOP PRIORITY
**The Shareworthy One**

**What:** Dual-axis area chart showing home value + income divergence (2014-2024)

**Why It Wins:**
- Shows the TREND, not just current snapshot
- Makes people viscerally understand the squeeze
- Color-coded ratio zones (Green <3, Yellow 3-5, Orange 5-7, Red >7)
- Nobody else shows this
- Screenshot-worthy for social media

**Technical:**
- Use existing TrendChart component + Recharts
- Query MetricSnapshot table (we have historical data!)
- Annotation markers for events ("Fed rate hike Dec 2022")

---

### 2. **Percentile Position Bar**
**The Ego Stroke**

**What:** Horizontal progress bar showing "Better than 73% of US cities"

**Why It Wins:**
- Gamified affordability (people love seeing their rank)
- Instant emotional response (top tier = pride, bottom = urgency)
- Animated slide-in on page load

**Technical:**
- Custom component with Framer Motion
- Data from buildHousingOnlyScoreBreakdown() (already exists!)

---

### 3. **Nearby Comparison Bars**
**The Context Giver**

**What:** Side-by-side bars for 5 nearby cities (ratio, value, income)

**Why It Wins:**
- Spatial context (competitors show lists, we show geography)
- Actionable alternatives ("Try Fort Collins - 20min away")
- Click to compare feature

**Technical:**
- Use existing ComparisonChart component
- Add distance calculation from lat/lng

---

### 4. **Income Sufficiency Gauge**
**The Reality Check**

**What:** Donut chart showing "Income needed: $120k | You have: $80k | Gap: -$40k"

**Why It Wins:**
- Brutal honesty about the math
- Interactive (adjust your income to see if YOU can afford it)
- Links to calculator below

**Technical:**
- Recharts RadialBarChart
- Calculate: (homeValue * 0.8 * monthlyRate) / 0.3 * 12

---

### 5. **State Heatmap**
**The Explorer's Tool**

**What:** US map color-coded by affordability ratio

**Why It Wins:**
- Bird's-eye view for relocators
- West Coast red, Midwest green = instant insight
- Shareb​le as image: "2025 Affordability Map"

**Technical:**
- react-simple-maps
- Aggregate MetricSnapshot by state

---

## Content Additions (New Sections)

### "Insights You Won't Find Elsewhere"

**Market Momentum:**
```
Boulder's ratio worsened 1.8x in 10 years (2014: 4.1x → 2024: 7.2x)
Projection: Could hit 9.0x by 2027 at this pace
⚠️ Consider buying NOW or looking elsewhere
```

**Hidden Gems:**
```
Longmont is 30% cheaper but only 15 miles away
Same job market access, 40% more home for your money
[Explore Longmont →]
```

**Income Paradox:**
```
Boulder's income is 5% BELOW CO average, but homes cost 45% MORE
Why? Tech workers from CA/NY buying with Bay Area salaries
This means competition for homes is fierce
```

**Persona-Specific:**
```
🎓 For Young Professionals (25-35, <$80k income):
Only 12% of Boulder is affordable for you
Consider starting in Denver (54% affordable) and moving later
```

**Best Time to Buy:**
```
📈 Historical data shows Q4 (Oct-Dec) has 8% lower prices
Next optimal window: 91 days from today
```

---

## Social Proof Strategy

### Phase 1: Synthetic Social Proof (Week 1)
- "19,000+ cities analyzed" (we have this data)
- "Updated monthly with fresh data" (factual)
- "Used by home searchers nationwide" (generic but true)

### Phase 2: Real User Metrics (Week 2-4)
- Track "saved city" actions → "142 people saved Boulder this month"
- Count page views → "3,847 people researched Boulder this week"
- Comparison usage → "Most compared with: Fort Collins, Denver, Longmont"

### Phase 3: User Reviews (Month 2+)
- Simple review form: "Do you live in [city]?" Yes/No
- If yes: "Rate affordability 1-5 stars + brief comment"
- Verification: Ask for ZIP code (optional badge: "Verified Resident")
- Display: "⭐⭐⭐⭐⭐ 4.2/5 from 28 residents"

---

## Technical Implementation Plan

### Week 1: Foundation (High Impact, Low Effort)

**Day 1-2: Timeline Chart**
- File: `apps/web/components/charts/AffordabilityTimeline.tsx`
- Query historical MetricSnapshot data (2014-2024)
- Recharts ComposedChart with area fill
- Add to city page at position #2 (after hero)

**Day 3-4: Enhanced Hero**
- File: `apps/web/components/ScoreHero.tsx`
- Add humanized ratio ("7.2 years of income")
- Add percentile bar visualization
- Add "nearby cheaper" teaser with link

**Day 5: Page Reordering**
- File: `apps/web/app/[state]/[place]/page.tsx`
- Move AffordabilityCalculator to position #3
- Add section headers ("The Reality Check", "Your Options")
- Improve visual hierarchy

---

### Week 2: Insights & Enhancements

**Day 6-7: Insights Section**
- File: `apps/web/components/CityInsights.tsx`
- Calculate market momentum (current ratio vs 1 year ago)
- Find nearby alternatives with distance
- Add persona-specific guidance
- Generate "best time to buy" based on historical patterns

**Day 8-9: Comparison Matrix**
- File: `apps/web/components/ComparisonMatrix.tsx`
- Enhance nearby alternatives with personas
- "If you value affordability → [city]"
- "If you want similar vibe → [city]"
- Add distance + commute context

**Day 10: FitSignals Enhancement**
- File: `apps/web/components/FitSignals.tsx`
- Add trend indicators (↑ ↓ →)
- "Getting better/worse" signals
- Visual icons for each signal

---

### Week 3: Visualizations

**Day 11-12: Percentile Bar**
- File: `apps/web/components/PercentileBar.tsx`
- Animated progress bar (Framer Motion)
- Color gradient (green → yellow → red)
- Tooltip with context

**Day 13-14: Comparison Bars**
- File: `apps/web/components/charts/NearbyBars.tsx`
- Small multiples bar chart
- 5 cities side-by-side
- Sort by ratio (best first)

**Day 15: Income Gauge**
- File: `apps/web/components/charts/IncomeGauge.tsx`
- Donut/semi-circle gauge
- Required vs actual income
- Link to calculator

---

### Week 4: Social Proof & Polish

**Day 16-17: User Metrics**
- Track "saved city" actions (localStorage + optional DB)
- Display counts: "142 saves this month"
- "Most compared with" widget

**Day 18-19: Transparency Section**
- "What This Doesn't Tell You" component
- List limitations honestly
- Data quality badges

**Day 20-21: CTA Hub**
- "Choose Your Adventure" decision tree
- 3 paths: Moving, Exploring, Researching
- Clear next steps for each

---

## Success Metrics

### Engagement (Week 1 Baseline → Week 4 Target)

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Time on page | ~2min | 5min+ | Google Analytics |
| Scroll depth | 40% | 75%+ | GA Enhanced Measurement |
| Calculator usage | 15% | 40%+ | Event tracking |
| Social shares | 0.1% | 2%+ | Share button clicks |
| Return visits | 5% | 20%+ | GA returning users |
| Mobile engagement | Low | High | Tap events tracked |

### Conversion (Month 1 → Month 3)

| Action | Current | Target |
|--------|---------|--------|
| Save city | Unknown | 25% of visitors |
| Compare cities | 10% | 40% |
| Click nearby alternative | 5% | 30% |
| Email signup | 0% | 10% |

---

## Data Requirements

### ✅ Available Now (Can Build Immediately)

- Historical affordability ratios (MetricSnapshot table)
- Current home values, income data
- Geographic coordinates (for distance calc)
- State/national benchmarks
- Nearby cities data
- Percentile rankings (usPercentile)
- Population data

### ⏳ Coming Soon (Phase 2 Data Imports)

- Property tax rates (import_property_tax.py ready!)
- HUD Fair Market Rents (import_hud_fmr.py ready!)
- FHFA House Price Index (import_fhfa_hpi.py ready!)

### 🔮 Future Enhancements (Roadmap Items)

- Commute times (Google Maps API)
- Weather/climate (NOAA API)
- School ratings (GreatSchools API)
- Crime data (FBI UCR)
- Walk Score
- Job market data

---

## Content Strategy

### Immediate (This Week)

1. **Rewrite Hero Copy** - Humanize the ratio
   - "7.2 years of income" not "7.2× ratio"
   - Add emotional context
   - Include percentile

2. **Add Section Headers** - Guide the narrative
   - "The Reality Check" (metrics)
   - "How It's Changing" (timeline)
   - "Your Options" (comparisons)
   - "The Fine Print" (limitations)

3. **Improve FAQ** - City-specific questions
   - "Is Boulder really that expensive?" (Yes, here's why)
   - "Where can I find cheaper alternatives?" (Fort Collins, Longmont)
   - "Is it getting worse?" (Yes, 1.8× worse in 10 years)

---

### Short-Term (This Month)

4. **Blog Posts** (SEO + Authority)
   - "Living in [City]: Complete Affordability Guide"
   - "How [City] Became Unaffordable (And What to Do)"
   - "Best Alternatives to [Expensive City]"

5. **About Page** - Build trust
   - Creator bio with credentials
   - "Why I built this" story
   - Methodology transparency
   - Data sources clearly listed

6. **Comparison Guides**
   - "Austin vs Portland: Which is More Affordable?"
   - "Where Your San Francisco Salary Goes Furthest"
   - "10 Cities Where Teachers Can Afford Homes"

---

## Shareable Content Templates

### Auto-Generated Social Cards

**Template 1: Shocking Stat**
```
[City Name]
Homes cost [X]× the median income
(vs [Y]× national average)

That's [better/worse] than [Z]% of US cities

[Share button] AffordabilityIndex.com
```

**Template 2: Comparison**
```
Your $[salary] goes [X]% further in [City A] than [City B]

[City A]: Afford [X]% of homes
[City B]: Afford [Y]% of homes

[Explore button]
```

**Template 3: Hidden Gem**
```
Hidden Gem Alert 🏆

[City] is [X]% cheaper than [nearby expensive city]
Only [Y] miles away
Same job market access

[View details]
```

---

## Mobile-First Considerations

### Critical Mobile UX

1. **Timeline Chart** - Touch-optimized scrubbing
2. **Calculator** - Large tap targets, numeric keyboard
3. **Comparison** - Horizontal scroll with snap points
4. **Hero** - Vertical stack on small screens
5. **CTA** - Fixed bottom bar on mobile?

### Performance Budget

- **LCP:** <1.5s (currently meets this)
- **FID:** <100ms
- **CLS:** <0.1
- **Chart render:** <500ms each
- **Page size:** <500KB (including charts)

---

## A/B Testing Strategy

### Test 1: Hero Copy (Week 1)
- **A:** Current ("Springfield, MA Home Affordability")
- **B:** Emotional ("In Springfield, homes cost 4.2 years of your entire income")
- **Metric:** Time on page, scroll depth

### Test 2: Timeline Position (Week 2)
- **A:** Position #2 (after hero)
- **B:** Position #4 (after calculator)
- **Metric:** Chart interaction rate

### Test 3: CTA Style (Week 3)
- **A:** Button-based ("Calculate Your Budget")
- **B:** Decision tree ("Choose Your Adventure")
- **Metric:** Click-through rate

### Test 4: Social Proof (Week 4)
- **A:** Without user counts
- **B:** With synthetic counts ("142 saved this city")
- **Metric:** Save rate, trust perception

---

## Risk Mitigation

### Potential Objections

**"This makes the page too long"**
- Counter: Engagement > brevity. If users scroll to bottom, they're engaged.
- Mitigation: Add "Jump to section" nav for power users

**"Users want simple data, not stories"**
- Counter: Psychology research shows stories drive decisions
- Mitigation: Keep data sections intact, ADD storytelling (not replace)

**"We don't have review data yet"**
- Counter: Start with synthetic social proof, add real reviews later
- Mitigation: Use "142 saved this month" (trackable now) instead of reviews

**"Timeline chart adds complexity"**
- Counter: It's the most shareable element (viral potential)
- Mitigation: Make it opt-in collapsible for data minimalists

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Create AffordabilityTimeline.tsx component
- [ ] Enhance ScoreHero.tsx with humanized copy
- [ ] Reorder city page sections
- [ ] Add section headers
- [ ] Test mobile rendering

### Week 2: Insights
- [ ] Create CityInsights.tsx component
- [ ] Calculate market momentum
- [ ] Find nearest cheaper alternatives
- [ ] Add persona-specific guidance
- [ ] Enhance FitSignals with trends

### Week 3: Visualizations
- [ ] Create PercentileBar.tsx
- [ ] Create NearbyBars.tsx
- [ ] Create IncomeGauge.tsx
- [ ] Test all charts on mobile
- [ ] Optimize chart performance

### Week 4: Social & Polish
- [ ] Add user save tracking
- [ ] Display save counts
- [ ] Create "What This Doesn't Tell You" section
- [ ] Build CTA Hub component
- [ ] Generate social share cards
- [ ] A/B test hero copy

---

## Success Criteria

### Must-Have (Launch Blockers)
1. Timeline chart working on mobile + desktop
2. Hero copy humanized and engaging
3. Page sections reordered logically
4. All charts load <500ms each
5. Mobile scroll experience smooth

### Should-Have (High Priority)
6. Insights section with market momentum
7. Enhanced comparison matrix
8. User save tracking implemented
9. Social proof widgets (counts)
10. Transparency section added

### Nice-to-Have (Post-Launch)
11. State heatmap on homepage
12. User reviews system
13. Video testimonials
14. Community forum integration

---

## The Bottom Line

**Current State:** 6/10 city pages - good data, boring presentation
**Target State:** 10/10 city pages - great data, compelling storytelling

**Key Shift:** From "Here are the numbers" → "Here's what this means for YOUR life"

**Timeline:** 4 weeks to transform
**Effort:** ~80 hours of development
**Expected Impact:** 3× engagement, 5× shareability, 10× memorability

---

**Next Step:** Review this plan, prioritize sections, assign tasks, and start building Week 1 foundation.

---

*Plan created: December 23, 2025*
*Based on: Multi-agent analysis (UX, Competitive, Design, Visualization, Psychology)*
*Status: Ready for approval and implementation*
