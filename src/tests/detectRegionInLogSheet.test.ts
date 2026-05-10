import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'

describe('detectRegionInLogSheet', () => {
  it('finds a strong character region inside the LOG sheet of clerigo-level5.xlsx', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')

    const detection = detectBestCharacterSheet(workbook)

    expect(detection.selectedSheetName).toBe('LOG')
    expect(detection.selectedRegion).toBeDefined()
    expect(detection.selectedRegion?.confidence).toMatch(/^(medium|high)$/)
    expect(detection.selectedRegion?.positiveAnchors.map((anchor) => anchor.label)).toEqual(
      expect.arrayContaining(['CLASSE(S) & NIVEL(EIS)', 'RACA', 'PV', 'PERICIAS', 'FORCA', 'DESTREZA', 'CONSTITUICAO', 'INTELIGENCIA', 'SABEDORIA', 'CARISMA']),
    )
  })
})
