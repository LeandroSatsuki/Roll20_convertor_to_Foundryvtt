import { describe, expect, it } from 'vitest'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('merged anchor dedup scoring', () => {
  it('counts merged ANTECEDENTE only once for scoring', async () => {
    const workbook = await readWorkbook(
      createWorkbookData([
        {
          name: 'Personagem',
          rows: Array.from({ length: 50 }, (_, row) => (row === 42 ? ['', 'ANTECEDENTE'] : [''])),
          merges: [{ s: { r: 42, c: 1 }, e: { r: 42, c: 8 } }],
        },
      ]),
      'merged-anchors.xlsx',
    )

    const detection = detectBestCharacterSheet(workbook, { selectedSheetName: 'Personagem' })
    expect(detection.discardedDuplicateAnchors.length).toBeGreaterThan(0)
    expect(detection.discardedDuplicateAnchors.every((anchor) => anchor.mergeSourceAddress === 'B43')).toBe(true)
  })
})
