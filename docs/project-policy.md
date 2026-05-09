# Project Policy

1. The project is not a converter for one specific character sheet.
2. Every fix must be generalizable.
3. A new sheet failure must not become a character-specific patch.
4. A Bonfire rule failure must become a Bonfire seed, an extractor improvement, or a coverage report entry.
5. Foundry Library provides mechanics, not Bonfire rules.
6. Bonfire Rule Store is the primary source for classes, subclasses, races, ancestries, backgrounds, feats, features, and level resources.
7. Excel defines what the character has.
8. Rule Store defines what the rule means.
9. Foundry Library defines how mechanics may be implemented.
10. The main UI must not expose dev tools.

## Coverage Policy

Coverage is tracked by Bonfire class, not by character name. The canonical class list lives in `data/bonfire/class-index.json`.

When local Bonfire HTML is incomplete or ambiguous, generated seeds must use `descriptionStatus: "needs-review"` or `descriptionStatus: "fallback"` instead of inventing missing rules. Character-specific fixes belong in `data/bonfire/review/coverage-report.json` as missing coverage, not in parser logic.

Items and equipment continue to use Foundry/Plutonium as their primary mechanical source. Spells continue to use Foundry/Plutonium as their primary mechanical source, with Bonfire spell overrides applied only when present.

## Description Fidelity

- Bonfire descriptions must be copied faithfully from Bonfire source text when the full rule text is locally available.
- Summary cards, previews, teasers, and list snippets are not full rule text.
- Summary/card text may be stored only as `shortDescription`.
- `descriptionStatus: "complete"` is reserved for verified full Bonfire rule text.
- Features, feats, race traits, class features, subclass features, backgrounds, races, and classes do not hydrate from Foundry Library automatically.
- Foundry Library may appear only as a suggestion for those Bonfire rules; it must not replace the Bonfire name, rule text, or description.
