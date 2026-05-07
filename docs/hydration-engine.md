# Hydration Engine

Hydration replaces converter-built fallback items with cloned Foundry items from the local reference library when the match confidence is high.

Priority:

1. Bonfire custom rule requirements remain the semantic source.
2. Foundry Reference Library provides complete item structure when a high-confidence match exists.
3. Bonfire Rule Store remains the local fallback.
4. Existing builders remain the safe fallback.

When cloning a library item, the converter:

- generates a new `_id`;
- preserves `name`, `type`, `img`, `system`, `system.activities`, `effects`, Plutonium flags, Midi-QOL fields, and compendium source data;
- removes `folder`, `ownership`, and stale sort data;
- sanitizes references to the source Actor/item where detectable;
- records `flags["roll20-to-foundry"].hydration` with source actor, source file, source item, match score, confidence, preserved metadata, and warnings.

If no high-confidence match exists, the existing item is kept and marked with hydration fallback metadata. This never blocks export.

The **Hidratação** UI panel shows requested item, matched item, source actor, score, confidence, preserved metadata, fallback usage, and warnings.
