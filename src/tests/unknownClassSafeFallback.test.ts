import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('unknownClassSafeFallback', () => {
  it('exports an unknown class with safe class defaults and warnings', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    parsed.character.identity.classText.value = 'Classe Inventada 5'
    parsed.character.identity.classes = [{ name: 'Classe Inventada', level: 5 }]
    parsed.character.spells.cantrips.push({ name: { value: 'Guidance', confidence: 'high', raw: 'Guidance' }, level: 0, raw: 'Guidance', prepared: true })

    const bundle = buildConversionBundle(parsed.character, parsed.debug)
    const attributes = bundle.actor.system.attributes as Record<string, unknown>
    const spells = bundle.actor.system.spells as Record<string, Record<string, unknown>>
    const classItem = bundle.actor.items.find((item) => item.type === 'class' && item.name === 'Classe Inventada')
    const validationCodes = bundle.audit.validations.map((validation) => validation.code)

    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(bundle.audit.summary.errorCount).toBe(0)
    expect(attributes.spellcasting).toBe('')
    expect(spells.spell1.value).toBe(0)
    expect(spells.spell2.value).toBe(0)
    expect(spells.spell3.value).toBe(0)
    expect(classItem?.system.hitDice).toBe('d8')
    expect(validationCodes).toContain('CLASS_RULE_UNKNOWN')
    expect(validationCodes).toContain('CLASS_HIT_DIE_UNKNOWN')
    expect(validationCodes).toContain('SPELLCASTING_RULE_MISSING')
  })
})
