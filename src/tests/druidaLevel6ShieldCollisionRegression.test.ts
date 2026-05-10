import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

const nannaPath = 'C:/Users/rhdig/Downloads/Nanna Amastacia.xlsx'
const runIfNannaExists = existsSync(nannaPath) ? it : it.skip

describe('druida-level6ShieldCollisionRegression', () => {
  runIfNannaExists('exports Nanna with unique Shield identifiers', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync(nannaPath)), 'Nanna Amastacia.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const bundle = buildConversionBundle(parsed.character, parsed.debug)
    const shields = bundle.actor.items.filter((item) => item.name === 'Shield')
    const identifiers = shields.map((item) => String(item.system.identifier))

    expect(bundle.audit.summary.errorCount).toBe(0)
    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(bundle.audit.summary.invalidIdentifierCount).toBe(0)
    expect(bundle.audit.summary.duplicateIdentifierCount).toBe(0)
    expect(bundle.audit.validations.some((entry) => entry.code === 'FOUNDRY_ITEM_IDENTIFIER_DUPLICATE')).toBe(false)
    expect(shields.some((item) => item.type === 'spell')).toBe(true)
    expect(shields.some((item) => item.type === 'equipment')).toBe(true)
    expect(new Set(identifiers).size).toBe(identifiers.length)
    expect(identifiers).toEqual(expect.arrayContaining(['equipment-shield', 'spell-shield']))
  })
})
