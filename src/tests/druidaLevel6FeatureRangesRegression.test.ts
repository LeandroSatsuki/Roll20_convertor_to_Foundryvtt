import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

const nannaPath = 'C:/Users/rhdig/Downloads/Nanna Amastacia.xlsx'
const runIfNannaExists = existsSync(nannaPath) ? it : it.skip

describe('druida-level6FeatureRangesRegression', () => {
  runIfNannaExists('extracts sheet feature ranges from Nanna and turns them into actor items', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync(nannaPath)), 'Nanna Amastacia.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const bundle = buildConversionBundle(parsed.character, parsed.debug)

    expect(parsed.character.features.length).toBeGreaterThan(2)
    expect(parsed.character.features.every((feature) => feature.source === 'bonfire-v2.1')).toBe(true)
    expect(bundle.actor.items.filter((item) => item.type === 'feat').length).toBeGreaterThan(2)
  })
})
