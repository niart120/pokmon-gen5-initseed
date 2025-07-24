# Pokémon BW/BW2 Initial Seed Search Web App

A specialized web application for searching and verifying initial seed values for Pokémon Black/White and Black2/White2 games, enabling efficient RNG manipulation through SHA-1 hash calculation and seed matching.

**Experience Qualities**: 
1. **Precise and Technical** - Complex numerical calculations presented with scientific accuracy for serious competitive players
2. **Efficient and Fast** - Real-time computation with progress tracking and interruption capabilities for long searches
3. **Accessible and Educational** - Clear explanations of complex algorithms making advanced RNG concepts understandable

**Complexity Level**: Complex Application (advanced functionality, accounts)
  - Multi-parameter calculation engine with WebAssembly optimization, persistent user settings, and sophisticated data management capabilities

## Essential Features

### Initial Seed Search Engine
- **Functionality**: Generate SHA-1 hash from ROM parameters and extract 32-bit initial seed
- **Purpose**: Enable precise RNG manipulation for competitive Pokémon play
- **Trigger**: User configures ROM version, region, hardware, datetime range, and MAC address
- **Progression**: Parameter input → Message generation → SHA-1 calculation → Seed extraction → Target list comparison → Results display
- **Success Criteria**: Accurate seed generation matching C# reference implementation with sub-second response time

### Advanced Parameter Configuration
- **Functionality**: Auto-configure ROM-specific parameters with manual override capability
- **Purpose**: Simplify complex technical setup while allowing expert customization
- **Trigger**: ROM version/region selection or manual parameter checkbox activation
- **Progression**: ROM selection → Auto-parameter loading → Optional manual override → Validation → Search execution
- **Success Criteria**: All 28 ROM/region combinations supported with accurate Nazo values and Timer0 ranges

### Target Seed List Management
- **Functionality**: Import, validate, and manage lists of target seed values
- **Purpose**: Enable batch searching against multiple desired seeds
- **Trigger**: Text input of hexadecimal seed values or file import
- **Progression**: Raw input → Format validation → Normalization → Duplicate removal → List storage
- **Success Criteria**: Support 1000+ seeds with real-time validation and clear error reporting

### Real-time Progress Monitoring
- **Functionality**: Display search progress with pause/resume capability
- **Purpose**: Manage long-running calculations and provide user control
- **Trigger**: Search execution start
- **Progression**: Calculation start → Progress updates → Match detection → Result accumulation → Completion summary
- **Success Criteria**: Sub-second progress updates with accurate time estimates and seamless interruption

### Results Analysis and Export
- **Functionality**: Sort, filter, and export matching seed results
- **Purpose**: Enable detailed analysis and data sharing
- **Trigger**: Search completion or result interaction
- **Progression**: Result generation → Display formatting → Sort/filter application → Export format selection → File generation
- **Success Criteria**: Multiple export formats with comprehensive filtering options

## Edge Case Handling
- **Invalid Parameter Combinations**: Graceful validation with specific error messages for impossible date/time combinations
- **WebAssembly Loading Failures**: Fallback to JavaScript implementation with performance warnings
- **Large Search Spaces**: Automatic chunking with memory management and browser responsiveness preservation
- **Malformed Seed Input**: Line-by-line validation with detailed error reporting and recovery suggestions
- **Browser Compatibility**: Progressive enhancement with feature detection and appropriate fallbacks

## Design Direction
The interface should feel scientifically precise yet approachable - combining the technical accuracy of research software with the usability of modern web applications, using clean typography and organized layouts that respect the complexity of the calculations while making them accessible to dedicated players.

## Color Selection
Triadic color scheme emphasizing trust, precision, and energy to reflect the scientific nature of RNG manipulation while maintaining visual interest.

- **Primary Color**: Deep Blue `oklch(0.4 0.15 240)` - Communicates reliability and technical precision
- **Secondary Colors**: 
  - Cool Gray `oklch(0.7 0.02 240)` for backgrounds and supporting elements
  - Warm Gray `oklch(0.5 0.02 60)` for muted text and borders
- **Accent Color**: Electric Green `oklch(0.7 0.2 120)` for CTAs, progress indicators, and successful matches
- **Foreground/Background Pairings**:
  - Background (Light Gray `oklch(0.97 0.01 240)`): Dark Gray text `oklch(0.2 0.02 240)` - Ratio 14.2:1 ✓
  - Primary (Deep Blue `oklch(0.4 0.15 240)`): White text `oklch(1 0 0)` - Ratio 8.9:1 ✓
  - Accent (Electric Green `oklch(0.7 0.2 120)`): Dark Gray text `oklch(0.2 0.02 240)` - Ratio 6.1:1 ✓

## Font Selection
Technical precision with excellent readability for numerical data requires a monospace font for calculations and a clean sans-serif for interface elements.

- **Typographic Hierarchy**:
  - H1 (Page Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter SemiBold/24px/normal letter spacing  
  - H3 (Subsections): Inter Medium/18px/normal letter spacing
  - Body Text: Inter Regular/16px/relaxed line height (1.6)
  - Code/Data: JetBrains Mono Regular/14px/normal letter spacing

## Animations
Purposeful motion that enhances calculation feedback and data visualization without interfering with precision work.

- **Purposeful Meaning**: Subtle progress animations and data updates that communicate system status without distraction
- **Hierarchy of Movement**: Progress indicators receive primary animation focus, with secondary motion for result updates and form validation feedback

## Component Selection
- **Components**: Card for parameter groups, DataGrid for results, Stepper for guided setup, Chips for ROM selections, LinearProgress for calculations, Tabs for navigation, Dialog for detailed seed information
- **Customizations**: Custom hex input components with validation, specialized timer range sliders, MAC address input with automatic formatting
- **States**: Form validation states with clear error/success indicators, loading states for WebAssembly operations, progress states for long calculations
- **Icon Selection**: Scientific/technical icons emphasizing precision - Calculate, DataArray, Timer, Memory, Settings, Download
- **Spacing**: Generous padding (24px sections, 16px cards, 8px form elements) using Material-UI's spacing scale
- **Mobile**: Collapsible parameter sections, simplified results table with detail modals, touch-optimized number inputs with steppers