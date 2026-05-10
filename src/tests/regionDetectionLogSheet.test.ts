import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('region detection for clerigo-level5 sheet', () => {
  it('selects a medium or high confidence character region and avoids far auxiliary columns', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const detection = detectBestCharacterSheet(workbook)

    expect(detection.regionCandidates.length).toBeGreaterThan(0)
    expect(detection.selectedSheetName).toMatch(/^(LOG|Ficha)$/)
    expect(detection.selectedRegion).toBeDefined()
    expect(detection.selectedRegion?.confidence).toMatch(/^(medium|high)$/)
    expect(detection.selectedRegion?.bounds.endCol).toBeLessThan(56)
    expect(detection.selectedRegion?.positiveAnchors.map((anchor) => anchor.label)).toEqual(expect.arrayContaining(['CLASSE(S) & NIVEL(EIS)', 'RACA', 'FORCA', 'SABEDORIA']))
  })
})
