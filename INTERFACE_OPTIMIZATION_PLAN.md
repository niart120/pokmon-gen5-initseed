# WASM-TypeScript Interface Optimization Plan

## Current State Analysis

### Interface Limitations Identified

1. **Constructor Parameter Gap**
   - Current: `(mac, nazo, version, frame)`
   - Missing: `hardware`, `keyInput`
   - Impact: Cannot handle hardware-specific PM flag, keyInput fixed at 0x2FFF

2. **Search Method Parameter Explosion**
   - Current: 12 individual parameters
   - Issues: Type safety reduced, parameter ordering fragile
   - Maintenance: Difficult to add new parameters

3. **Static Value Hardcoding**
   - `keyInput = 0x2FFF` (line 133 in integrated_search.rs)
   - `gx_stat = 0x06000000u32` (line 122)
   - Hardware-agnostic PM flag calculation

## Optimization Strategy

### Phase 1: Enhanced Constructor (Immediate Priority)

**Goal**: Pass all fixed parameters during construction to eliminate repeated calculations

**New Constructor Signature**:
```rust
pub fn new(
    mac: &[u8], 
    nazo: &[u32], 
    hardware: &str,    // "DS", "DS_LITE", "3DS"
    key_input: u32,    // Configurable instead of 0x2FFF
    gx_stat: u32,      // Configurable instead of hardcoded
    frame: u32
) -> Result<IntegratedSeedSearcher, JsValue>
```

**Benefits**:
- Hardware-specific PM flag calculation support
- Configurable key input (currently missing from interface)
- Eliminates repeated parameter validation
- Cleaner separation of fixed vs dynamic parameters

### Phase 2: Structured Search Parameters (Medium Priority)

**Goal**: Replace 12-parameter method with structured approach

**New Search Method**:
```rust
pub fn search_seeds_integrated(
    &self,
    search_params: &SearchParameters,  // Structured input
    target_seeds: &[u32]
) -> js_sys::Array
```

**SearchParameters Structure**:
```rust
#[wasm_bindgen]
pub struct SearchParameters {
    year_start: u32,
    month_start: u32,
    day_start: u32,
    hour_start: u32,
    minute_start: u32, 
    second_start: u32,
    range_seconds: u32,
    timer0_min: u32,
    timer0_max: u32,
    vcount_min: u32,
    vcount_max: u32,
}
```

**Benefits**:
- Type safety improvement
- Easier parameter passing from TypeScript
- Future extensibility without signature changes
- Better documentation through structure

### Phase 3: TypeScript Integration Layer (Final Priority)

**Goal**: Create TypeScript wrapper that maps SearchConditions to optimized WASM interface

**Integration Class**:
```typescript
export class OptimizedWasmSeedSearcher {
  private searcher: IntegratedSeedSearcher;
  
  constructor(conditions: SearchConditions, romParams: ROMParameters) {
    // Map SearchConditions to optimized constructor
    this.searcher = new IntegratedSeedSearcher(
      conditions.macAddress,
      romParams.nazo,
      conditions.hardware,
      conditions.keyInput,
      this.calculateGxStat(conditions.romVersion),
      this.calculateFrame(conditions.romVersion)
    );
  }
  
  searchSeeds(conditions: SearchConditions, targetSeeds: number[]): InitialSeedResult[] {
    const searchParams = this.createSearchParameters(conditions);
    return this.searcher.search_seeds_integrated(searchParams, targetSeeds);
  }
}
```

## Implementation Priority

### Critical Issues (Phase 1 - Immediate)
1. **Hardware Parameter Missing**: Cannot calculate PM flags correctly for DS/DS_LITE
2. **KeyInput Hardcoded**: User input for key combinations ignored
3. **DateTime Code Issues**: 7 identified problems from previous analysis

### Performance Optimizations (Phase 2 - Medium)
1. **Parameter Structure**: Reduce overhead from 12-parameter calls
2. **Type Safety**: Prevent parameter ordering mistakes
3. **Extension Support**: Enable future parameters without breaking changes

### Developer Experience (Phase 3 - Final)
1. **TypeScript Integration**: Seamless SearchConditions mapping
2. **Error Handling**: Better error messages with structured parameters
3. **Documentation**: Self-documenting interface through types

## Expected Impact

### Performance Improvements
- **Reduced Parameter Overhead**: ~15-20% reduction in call overhead
- **Eliminated Redundant Calculations**: Hardware-specific logic cached at construction
- **Better Memory Layout**: Structured parameters improve cache performance

### Correctness Improvements
- **Hardware-Specific Logic**: Proper PM flag calculation for DS/DS_LITE
- **User Input Respect**: KeyInput parameter properly passed through
- **Parameter Validation**: Structure-based validation prevents errors

### Maintainability Improvements
- **Type Safety**: Compile-time parameter checking
- **Future Extensibility**: Add parameters without breaking existing code
- **Clear Interfaces**: Self-documenting parameter structures

## Migration Strategy

1. **Backward Compatibility**: Keep existing interface during transition
2. **Gradual Migration**: Implement new interface alongside old
3. **Testing Coverage**: Comprehensive tests for both interfaces
4. **Performance Validation**: Benchmark both approaches
5. **Documentation Update**: Update all interface documentation

## Risk Assessment

### Low Risk
- **Constructor Enhancement**: Additive change, existing code unaffected
- **TypeScript Wrapper**: Pure addition, no existing code changes

### Medium Risk  
- **Search Method Change**: Requires careful parameter mapping
- **WASM Binding Updates**: Potential serialization issues

### Mitigation
- **Comprehensive Testing**: All parameter combinations tested
- **Gradual Rollout**: Feature flags for interface selection
- **Rollback Plan**: Keep old interface as fallback

## Success Metrics

1. **Correctness**: All existing tests pass with new interface
2. **Performance**: >=95% of current performance maintained
3. **Usability**: Reduced parameter-related bugs in development
4. **Extensibility**: New parameters added without breaking changes

## Next Steps

1. Implement Phase 1 constructor enhancements
2. Create comprehensive test coverage for new interface
3. Benchmark performance impact
4. Begin Phase 2 structured parameter implementation
5. Document interface migration guide
