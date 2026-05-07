import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

const nannaPath = 'C:/Users/rhdig/Downloads/Nanna Amastacia.xlsx'
const runIfNannaExists = existsSync(nannaPath) ? it : it.skip

describe('knownClassNoFallbackRegression', () => {
  runIfNannaExists('keeps Druid 6 on known wisdom casting rules', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync(nannaPath)), 'Nanna Amastacia.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const bundle = buildConversionBundle(parsed.character, parsed.debug)
    const attributes = bundle.actor.system.attributes as Record<string, unknown>
    const spells = bundle.actor.system.spells as Record<string, Record<string, unknown>>
    const classItem = bundle.actor.items.find((item) => item.type === 'class' && item.name === 'Druida')
    const validationCodes = bundle.audit.validations.map((validation) => validation.code)

    expect(attributes.spellcasting).toBe('wis')
    expect(spells.spell1.value).toBe(4)
    expect(spells.spell2.value).toBe(3)
    expect(spells.spell3.value).toBe(3)
    expect(classItem?.system.hitDice).toBe('d8')
    expect(validationCodes).not.toContain('CLASS_RULE_UNKNOWN')
    expect(validationCodes).not.toContain('CLASS_HIT_DIE_UNKNOWN')
  })
})
