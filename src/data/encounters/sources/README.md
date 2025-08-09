Encounter sources registry

- Primary: ポケモンの友 (Pokebook) — https://pokebook.jp/
  - Policy: When using data, clearly attribute the source and include a link/URL in documentation or version info.
  - Note: We adapt and normalize data for programmatic use; this project is unofficial and provides no warranty.
- Secondary: Bulbapedia, Serebii for cross-reference

This directory may include mapping helpers, aliases, and manual fixups if certain pages cannot be parsed reliably.
Do not import anything here from production code. Use only for data preparation scripts.

Per-version/method provenance (example template):

- Game: Black/White
  - Method: Normal, ShakingGrass, DustCloud, Surfing, SurfingBubble, Fishing, FishingBubble
  - Source URL: https://pokebook.jp/data/bw/route-1 (example)
  - Retrieved: 2025-01-15
  - Notes: Normalized species names via aliases, mapped Route N → N番道路 in loader.
