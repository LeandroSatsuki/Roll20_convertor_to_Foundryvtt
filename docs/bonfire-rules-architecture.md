# Bonfire Rules Architecture

Bonfire rules are represented as a local Rule Store.

The app does not scrape World Anvil at runtime. World Anvil is the human-maintained reference source; the converter uses curated seed files and TypeScript seed objects that can be expanded over time.

Rule areas:

- Classes
- Subclasses
- Races
- Backgrounds
- Feats
- Weapons and equipment
- Spell overrides

Seed data lives in `/data/bonfire`. Runtime seed objects live in `src/lib/rules/bonfireSeedRules.ts`.

The normalized character remains the boundary between sources and Foundry output. That keeps PDF, XLSX, future Google Sheets link import, and manual JSON import from coupling directly to Foundry item shapes.

References reviewed:

- Bonfire Tales players category: https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/c/jogadores-category
- Bonfire Tales Clérigo article: https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/a/clerigo-article
- 5e.tools spell list reference for override names: https://5e.tools/spells.html
