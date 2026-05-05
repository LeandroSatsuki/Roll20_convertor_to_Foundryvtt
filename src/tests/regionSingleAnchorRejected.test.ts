import { describe, expect, it } from 'vitest'
import { detectCharacterSheetCandidates } from '../lib/sheets/detectSheetTemplate'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('single-anchor region rejection', () => {
  it('rejects a region that only contains repeated ANTECEDENTE anchors', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        {
          name: 'Personagem',
          rows: Array.from({ length: 50 }, (_, row) => (row === 42 ? ['', 'ANTECEDENTE'] : [''])),
          merges: [{ s: { r: 42, c: 1 }, e: { r: 42, c: 8 } }],
        },
      ]),
      'single-anchor.xlsx',
    )

    const [candidate] = detectCharacterSheetCandidates(workbook)
    expect(candidate.selectedRegion?.rejectionReasons).toContain('REGION_TOO_NARROW_ONLY_ONE_ANCHOR_CATEGORY')
    expect(candidate.selectedRegion?.confidence).toBe('low')
  })
})
