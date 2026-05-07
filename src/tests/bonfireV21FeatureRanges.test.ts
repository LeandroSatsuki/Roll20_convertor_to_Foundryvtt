import { describe, expect, it } from 'vitest'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { createBonfireV21Workbook } from './bonfireV21TestWorkbook'

describe('bonfireV21FeatureRanges', () => {
  it('reads the configured feature ranges, ignores blanks and preserves source metadata', async () => {
    const workbook = await readWorkbook(createBonfireV21Workbook(), 'feature-ranges.xlsx')
    const result = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })

    const sheetFeatures = result.character.features.filter((feature) => feature.sourceCell)

    expect(result.character.features.length).toBeGreaterThan(5)
    expect(sheetFeatures.length).toBeGreaterThan(5)
    expect(sheetFeatures.some((feature) => /conjura/i.test(feature.name.value) || /conjura/i.test(feature.raw))).toBe(true)
    expect(sheetFeatures.every((feature) => feature.source === 'bonfire-v2.1')).toBe(true)
    expect(sheetFeatures.every((feature) => Boolean(feature.sourceCell))).toBe(true)
    expect(sheetFeatures.every((feature) => Boolean(feature.sourceRange))).toBe(true)
    expect(result.debug.sheetFeatureRangeCount).toBe(6)
    expect(result.debug.sheetFeaturesExtractedCount).toBeGreaterThanOrEqual(result.character.features.length)
    expect(result.debug.detectedFeatures.some((feature) => feature.sourceCell === 'R31')).toBe(true)
  })
})
