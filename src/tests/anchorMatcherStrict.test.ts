import { describe, expect, it } from 'vitest'
import { isAnchorMatch } from '../lib/sheets/sheetAnchors'
import type { SheetAnchor } from '../lib/sheets/sheetTypes'

function anchor(label: string, matchMode: SheetAnchor['matchMode'] = 'word', maxWords = 4): SheetAnchor {
  return { label, aliases: [label], matchMode, maxWords }
}

describe('strict sheet anchor matching', () => {
  it('does not match short labels inside unrelated words or long log text', () => {
    expect(isAnchorMatch('CONJURAÇÃO', anchor('RACA'))).toBe(false)
    expect(isAnchorMatch('CONJURAÇÃO', anchor('CONSTITUICAO', 'phrase', 2))).toBe(false)
    expect(isAnchorMatch('Força Fantasma', anchor('FORCA'))).toBe(false)
    expect(isAnchorMatch('Força', anchor('FORCA'))).toBe(true)
    expect(isAnchorMatch('RAÇA', anchor('RACA'))).toBe(true)
    expect(isAnchorMatch('CLASSE(S) & NÍVEL(EIS)', anchor('CLASSE(S) & NIVEL(EIS)', 'phrase', 5))).toBe(true)
    expect(isAnchorMatch('O personagem abriu o diário e escreveu outra entrada longa de log.', anchor('NOME DO PERSONAGEM', 'phrase', 4))).toBe(false)
  })
})
