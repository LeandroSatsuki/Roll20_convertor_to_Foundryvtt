import { describe, expect, it } from 'vitest'
import { bonfireV21IgnoredSheetNames, bonfireV21Template } from '../lib/sheets/templates/bonfireV21Template'

describe('bonfireV21Template', () => {
  it('loads the fixed template with the expected sheets', () => {
    expect(bonfireV21Template.id).toBe('bonfire-v2.1')
    expect(bonfireV21Template.selectedSheets).toEqual(['LOG', 'Personagem', 'Magias'])
    expect(bonfireV21Template.optionalSheets).toEqual(['Personagem', 'Magias'])
  })

  it('declares auxiliary sheets as ignored', () => {
    expect(bonfireV21IgnoredSheetNames).toEqual(
      expect.arrayContaining(['Aventuras', 'Mercado', 'Attack Info', 'Gear Info', 'Race Info', 'Class Info']),
    )
  })
})
