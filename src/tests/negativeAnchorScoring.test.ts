import { describe, expect, it } from 'vitest'
import { detectCharacterSheetCandidates } from '../lib/sheets/detectSheetTemplate'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('negative anchor scoring', () => {
  it('marks auxiliary data sheets as low confidence', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([{ name: 'Aux', rows: [['Artífice'], ['◅ Associated Skills'], ['bludgeoning'], ['piercing']] }]),
      'aux.xlsx',
    )

    const [candidate] = detectCharacterSheetCandidates(workbook)
    expect(candidate.confidence).toBe('low')
    expect(candidate.score).toBeLessThan(0)
    expect(candidate.rejectionReasons).toContain('auxiliary-data')
  })
})
