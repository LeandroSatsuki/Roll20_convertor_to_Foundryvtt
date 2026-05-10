import { describe, expect, it } from 'vitest'
import { detectSheetTemplate } from '../lib/sheets/detectSheetTemplate'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createClerigoLevel5WorkbookData } from './createClerigoLevel5Workbook'

describe('readWorkbook', () => {
  it('opens an xlsx workbook and detects the Bonfire template', async () => {
    const workbook = await readWorkbook(createClerigoLevel5WorkbookData(), 'Pipkin.xlsx')
    const detection = detectSheetTemplate(workbook)
    expect(workbook.sheetNames).toEqual(expect.arrayContaining(['LOG', 'Personagem']))
    expect(detection.detectedTemplate).toBe('bonfire-log-v2')
    expect(detection.confidence).toBe('high')
  })
})
