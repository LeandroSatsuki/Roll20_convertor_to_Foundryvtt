# Spellcasting Progression

The converter does not copy `system.spells` from library Actors.

Spell slots are calculated from the final character's spreadsheet class and level:

- full caster: cleric, druid, wizard, bard, sorcerer;
- half caster: paladin, ranger, artificer;
- pact caster: warlock;
- non caster: fighter and rogue by default.

Portuguese aliases are supported, including Clérigo, Druida, Mago, Bardo, Feiticeiro, Bruxo, Paladino, Patrulheiro, Artífice, Guerreiro, and Ladino.

For Pipkin, `Clérigo 5` produces:

- spell1 = 4
- spell2 = 3
- spell3 = 2
- spell4-spell9 = 0

Hydrated spell items keep their library activities and effects, but their preparation, source class, and spellcasting ability are adjusted from the final character.
