import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('fighterNoSpellcastingRegression', () => {
  it('does not assign spellcasting ability to a non-caster fighter and uses d10 hit die', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    parsed.character.identity.classText.value = 'Guerreiro 6'
    parsed.character.identity.classes = [{ name: 'Guerreiro', level: 6 }]
    parsed.character.spells.ability.value = null
    parsed.character.spells.cantrips = []
    Object.values(parsed.character.spells.levels).forEach((level) => {
      level.spells = []
      level.slotsMax.value = 0
      level.slotsUsed.value = 0
    })

    const bundle = buildConversionBundle(parsed.character, parsed.debug)
    const attributes = bundle.actor.system.attributes as Record<string, unknown>
    const classItem = bundle.actor.items.find((item) => item.type === 'class' && item.name === 'Guerreiro')

    expect(attributes.spellcasting).toBe('')
    expect(classItem?.system.hitDice).toBe('d10')
    expect(bundle.audit.validations.some((entry) => entry.code === 'SPELLCASTING_ABILITY_UNKNOWN')).toBe(false)
  })
})
