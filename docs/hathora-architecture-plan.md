# TurfLoot Hathora Architecture Plan

## Current Status (December 2024)
- **User Base**: Early MVP, ~0-10 concurrent players
- **Architecture**: On-demand room creation (virtual server browser)
- **Cost**: $0-50/month (pay-per-use)
- **Performance**: 2-3 second room creation delay

## Phase 1: Enhanced On-Demand (Implement Now)
**Target**: Improve UX while keeping costs low

### Improvements to Implement:
1. **Room Pre-warming Pool**:
   ```javascript
   // Keep 1-2 rooms pre-created in peak hours (7-11 PM EST)
   // Warm popular combinations: $0.01 US East, $0.02 EU West
   ```

2. **Better Loading UX**:
   ```javascript
   // Replace instant navigation with loading state
   "Creating your room..." (2-3 seconds)
   "Connecting to Sydney server..." 
   ```

3. **Room Persistence**:
   ```javascript
   // Keep rooms alive 5-10 minutes after last player leaves
   // Allows quick re-joining and better player discovery
   ```

4. **Smart Room Reuse**:
   ```javascript
   // If room exists with <50% capacity, join it
   // Only create new room if existing ones are 75%+ full
   ```

### Expected Results:
- ✅ Faster join experience (0-1 second for pre-warmed rooms)
- ✅ Better player discovery (rooms stay alive longer)
- ✅ Still cost-efficient (~$50-100/month)

## Phase 2: Hybrid System (When 20+ Concurrent Players)
**Target**: Scale with growth, optimize for player experience

### Always-On Servers (Top 5):
1. `$0.01 Cash Game (Washington, D.C.)` - Most popular
2. `$0.01 Cash Game (London)` - EU prime time
3. `$0.02 Cash Game (Washington, D.C.)` - Medium stakes
4. `$0.01 Cash Game (Sydney)` - APAC coverage
5. `$0.05 High Stakes (Washington, D.C.)` - Whale games

### On-Demand Servers:
- All other regions/stakes
- Additional rooms when always-on servers fill up
- Temporary high-demand scaling

### Smart Scheduling:
```javascript
// Time-zone aware room management
EU_PEAK: 6-11 PM CET (keep EU servers always-on)
US_PEAK: 7-12 AM EST (keep US servers always-on)  
APAC_PEAK: 7-11 PM JST (keep APAC servers always-on)
```

### Expected Results:
- ✅ Instant join for popular servers
- ✅ Real player discovery and social gameplay
- ✅ Balanced cost (~$100-200/month)
- ✅ Handles traffic spikes gracefully

## Phase 3: Full Always-On (When 100+ Concurrent Players)
**Target**: Maximum player experience, full social gaming

### Implementation:
- All 35 servers running 24/7
- Real-time player counts and server discovery
- Advanced matchmaking and skill-based routing
- Regional load balancing

### Expected Cost: $300-500/month
### Expected Benefits: 
- Zero wait time joins
- Full social discovery
- Professional esports-level experience

## Decision Matrix

| User Count | Architecture | Monthly Cost | Join Speed | Player Discovery | Recommendation |
|------------|-------------|--------------|------------|------------------|----------------|
| 0-20       | Enhanced On-Demand | $50-100 | 1-3s | Medium | **✅ IMPLEMENT NOW** |
| 20-100     | Hybrid | $100-200 | 0-1s | High | Future Phase |
| 100+       | Always-On | $300-500 | 0s | Maximum | Later Phase |

## Next Steps

### Immediate (This Week):
1. ✅ Keep current on-demand system (working well)
2. ✅ Add room persistence (5-10 min after empty)
3. ✅ Improve loading UX with progress indicators
4. ✅ Monitor usage patterns for future decisions

### When Growth Hits 20+ Concurrent:
1. Implement always-on for top 3-5 server combinations
2. Add smart time-zone scheduling
3. Advanced room management and lifecycle

### Success Metrics:
- **Join Success Rate**: >95% (currently ~90%)
- **Average Join Time**: <2 seconds (currently 2-3s)
- **Player Retention**: +20% from better discovery
- **Cost Efficiency**: <$5 per active player per month