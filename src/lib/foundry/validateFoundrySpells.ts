import { isRecord, validation, type FoundryValidationResult } from './foundryValidationReport'

export function validateFoundrySpells(actor: unknown): FoundryValidationResult[] {
  const actorRecord = isRecord(actor) ? actor : {}
  const system = isRecord(actorRecord.system) ? actorRecord.system : {}
  const spells = isRecord(system.spells) ? system.spells : {}
  const results: FoundryValidationResult[] = []
  for (let level = 1; level <= 9; level += 1) {
    const key = `spell${level}`
    const slot = spells[key]
    if (!isRecord(slot)) {
      results.push(validation('FOUNDRY_SPELL_LEVEL_MISSING', 'error', `${key} ausente em system.spells.`, `system.spells.${key}`))
      continue
    }
    if (typeof slot.value !== 'number') {
      results.push(validation('FOUNDRY_SPELL_SLOT_VALUE_INVALID', 'error', `${key}.value deve ser numérico.`, `system.spells.${key}.value`))
    }
  }
  const attributes = isRecord(system.attributes) ? system.attributes : {}
  if (attributes.spellcasting === 'wis') {
    const expected = { spell1: 4, spell2: 3, spell3: 2, spell4: 0, spell5: 0, spell6: 0, spell7: 0, spell8: 0, spell9: 0 }
    for (const [key, value] of Object.entries(expected)) {
      const slot = spells[key]
      if (isRecord(slot) && slot.value !== value) {
        results.push(validation('FOUNDRY_CLERIC5_SLOTS_INVALID', 'error', `Slots de Clérigo 5 inválidos em ${key}; esperado ${value}.`, `system.spells.${key}.value`))
      }
    }
  }
  return results
}
