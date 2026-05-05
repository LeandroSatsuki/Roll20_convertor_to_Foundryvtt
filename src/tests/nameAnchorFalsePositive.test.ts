import { describe, expect, it } from 'vitest'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'
import { isAnchorMatch } from '../lib/sheets/sheetAnchors'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import type { SheetAnchor } from '../lib/sheets/sheetTypes'
import { createWorkbookData } from './sheetTestWorkbook'

const nameAnchor: SheetAnchor = {
  label: 'NOME DO PERSONAGEM',
  aliases: ['NOME DO PERSONAGEM', 'PERSONAGEM', 'CHARACTER NAME', 'NOME'],
  matchMode: 'phrase',
  maxWords: 4,
}

describe('name anchor false positives', () => {
  it('blocks appearance/personagem false positives and weak labels alone do not create high confidence', async () => {
    expect(isAnchorMatch('APARÊNCIA DO PERSONAGEM', nameAnchor)).toBe(false)
    expect(isAnchorMatch('Este personagem escreveu uma entrada muito longa de diário com mais de oitenta caracteres para enganar o matcher.', nameAnchor)).toBe(false)

    const workbook = await readWorkbook(
      createWorkbookData([{ name: 'Bestiário', rows: [['NOME'], ['Goblin'], ['descricao longa sem atributos nem combate']] }]),
      'name-only.xlsx',
    )

    const detection = detectBestCharacterSheet(workbook)
    expect(detection.confidence).toBe('low')
  })
})
