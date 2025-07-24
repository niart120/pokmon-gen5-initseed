# Pokémon BW/BW2 Initial Seed Search - Product Requirements Document

## Core Purpose & Success

**Mission Statement**: To provide a comprehensive, web-based tool for searching and identifying initial seed values in Pokémon Black/White and Black2/White2 games, enabling competitive players to perform accurate RNG manipulation.

**Success Indicators**: 
- Accurate seed generation matching the original algorithm
- Real-time search capabilities with pause/resume functionality
- Precise matching against user-provided target seed lists
- Comprehensive support for all 28 ROM/region combinations

**Experience Qualities**: Precise, Reliable, Professional

## Project Classification & Approach

**Complexity Level**: Complex Application (advanced functionality with comprehensive state management)

**Primary User Activity**: Acting (performing complex calculations and searches)

## Essential Features

### Core Search Engine
- **SHA-1 based seed generation**: Implements the exact algorithm used by Pokémon BW/BW2
- **Multi-parameter search**: Timer0, VCount, date/time ranges, MAC address, key input
- **Real-time progress tracking**: Live updates with pause/resume capability
- **Efficient matching**: Fast lookup against user-defined target seed lists

### ROM Configuration Management
- **28 ROM/region combinations**: Complete support for all official releases
- **Auto-parameter loading**: Automatic Timer0/VCount ranges based on ROM selection
- **VCount offset handling**: Special logic for BW2 German/Italian versions
- **Manual override capability**: Expert users can customize parameters

### Target Seed Management
- **Flexible input formats**: Hexadecimal seeds with various formatting options
- **Real-time validation**: Immediate feedback on input errors
- **Duplicate handling**: Automatic deduplication of target seeds
- **Bulk operations**: Clear all, import/export functionality

## Design Direction

### Visual Tone & Identity
**Emotional Response**: Confidence, precision, technical competence
**Design Personality**: Professional, clean, focused on functionality
**Visual Metaphors**: Technical interfaces, precision instruments
**Simplicity Spectrum**: Clean but feature-rich interface

### Color Strategy
**Color Scheme Type**: Monochromatic with technical accent
**Primary Color**: Deep blue (oklch(0.4 0.15 240)) - conveying reliability and technical precision
**Secondary Colors**: Cool grays for supporting UI elements
**Accent Color**: Green (oklch(0.7 0.2 120)) - for success states and matches
**Color Psychology**: Blue conveys trust and technical competence, green provides clear success feedback

### Typography System
**Font Pairing Strategy**: Inter for UI, JetBrains Mono for technical data
**Typographic Hierarchy**: Clear distinction between headings, body text, and monospace technical data
**Font Personality**: Modern, clean, highly legible
**Readability Focus**: Optimized for long calculation sessions

### Component Selection
**Primary Components**: Cards for sectioned content, Tables for results, Progress bars for search status
**Form Elements**: Select dropdowns for ROM parameters, Number inputs for ranges, Textarea for seed lists
**Navigation**: Tab-based primary navigation for main sections
**Feedback**: Toast notifications for actions, Real-time validation messaging

## Implementation Strategy

### Phase 1: Core Algorithm Implementation
- SHA-1 calculation engine with exact BW/BW2 compatibility
- Message generation with proper endian conversion
- ROM parameter database with all 28 configurations
- Basic search loop with Timer0/VCount iteration

### Phase 2: User Interface & Experience
- Responsive React interface with shadcn components
- Real-time search progress with pause/resume
- Target seed input with validation and error handling
- Results display with sorting and filtering

### Phase 3: Advanced Features
- Search result export (CSV, JSON)
- Search condition presets
- Performance optimizations for large searches
- Comprehensive error handling and recovery

## Technical Architecture

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **State Management**: Zustand for application state
- **Calculations**: Custom SHA-1 implementation optimized for Pokemon algorithm
- **Data Storage**: Local storage for user preferences and search history

### Algorithm Implementation
- **Message Format**: 16 × 32-bit words following exact BW/BW2 specification
- **Endian Handling**: Proper little-endian conversion for required fields
- **Date/Time Encoding**: BCD-like decimal to hex conversion
- **Hardware Variations**: DS/DS Lite PM time adjustment, 3DS Frame values

### Performance Considerations
- **Efficient Target Lookup**: Set-based O(1) seed matching
- **Progress Batching**: UI updates every 50 iterations for responsiveness
- **Memory Management**: Controlled result storage to prevent browser memory issues
- **Search Interruption**: Proper pause/resume with state preservation

## Quality Assurance

### Validation Strategy
- **Algorithm Verification**: Test cases against known reference implementations
- **Cross-ROM Testing**: Validation across all supported ROM/region combinations
- **Edge Case Handling**: Boundary conditions for dates, Timer0 ranges, VCount offsets
- **Performance Testing**: Large search scenarios to validate responsiveness

### User Experience Testing
- **Input Validation**: Comprehensive testing of seed input formats
- **Search Flow**: Complete workflows from setup through results
- **Error Recovery**: Graceful handling of invalid inputs and failed searches
- **Accessibility**: Keyboard navigation and screen reader compatibility

## Success Metrics

### Functional Metrics
- **Algorithm Accuracy**: 100% compatibility with reference implementations
- **Search Performance**: Sub-second response for UI interactions
- **Coverage Completeness**: Support for all 28 ROM/region combinations
- **Result Precision**: Exact matching of target seeds with zero false positives

### User Experience Metrics
- **Setup Efficiency**: Quick configuration with sensible defaults
- **Search Control**: Reliable pause/resume functionality
- **Result Clarity**: Clear presentation of matching conditions
- **Error Guidance**: Helpful error messages with recovery suggestions

This PRD establishes the foundation for a professional-grade Pokemon BW/BW2 initial seed search tool that meets the exacting requirements of competitive players while maintaining a clean, efficient user experience.