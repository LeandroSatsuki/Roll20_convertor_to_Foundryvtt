import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'

describe('negativeAnchorsOutsideRegionIgnored', () => {
  it('ignores auxiliary negatives that live outside the selected LOG character region', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')

    const detection = detectBestCharacterSheet(workbook)
    const region = detection.selectedRegion

    expect(detection.selectedSheetName).toBe('LOG')
    expect(region?.confidence).toMatch(/^(medium|high)$/)
    expect(region?.negativeAnchors.map((anchor) => anchor.label)).not.toEqual(expect.arrayContaining(['Associated Skills', 'bludgeoning', 'piercing', 'slashing', 'Artifice']))
    expect(region?.ignoredOutsideRegion?.map((anchor) => anchor.label)).toEqual(expect.arrayContaining(['Associated Skills', 'bludgeoning', 'piercing', 'slashing', 'Artifice']))
  })
})
