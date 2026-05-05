import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('bonfire log template detection', () => {
  it('detects bonfire-log-v2 and selects LOG as the character sheet', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const detection = detectBestCharacterSheet(workbook)

    expect(detection.templateId).toBe('bonfire-log-v2')
    expect(detection.selectedBy).toBe('template')
    expect(detection.selectedSheetName).toBe('LOG')
    expect(detection.confidence).toMatch(/^(high|medium)$/)
    expect(detection.selectedRegion).toBeDefined()
    expect(detection.selectedRegion?.anchorCategories).toEqual(expect.arrayContaining(['identity', 'abilities', 'combat']))
    expect(detection.selectedRegion?.positiveAnchors.map((anchor) => anchor.label)).not.toEqual(['ANTECEDENTE'])
  })
})
