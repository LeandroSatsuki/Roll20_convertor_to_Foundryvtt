import { describe, expect, it } from 'vitest'
import { extractInlineSubRules } from '../lib/rules/import/extractInlineSubRules'

describe('extractInlineBoldSubRules', () => {
  it('extracts a complete inline bold subrule from trusted body HTML', () => {
    const html = '<p><strong>Predador Ágil:</strong> Seu deslocamento base aumenta em 1,5 metro [5 pés]. Além disso, você ganha deslocamento de Escalada igual ao seu deslocamento de caminhada.</p>'
    const result = extractInlineSubRules({
      htmlNode: html,
      parentRule: { id: 'race-felinar', name: 'Felinar', displayName: 'Felinar (Felinos)', raceName: 'Felinar' },
      parentKind: 'race',
      sourceUrl: 'https://example.invalid/felinar',
    })

    expect(result.subRules).toHaveLength(1)
    expect(result.subRules[0]?.name).toBe('Predador Ágil')
    expect(result.subRules[0]?.descriptionText).toBe('Seu deslocamento base aumenta em 1,5 metro [5 pés]. Além disso, você ganha deslocamento de Escalada igual ao seu deslocamento de caminhada.')
    expect(result.subRules[0]?.descriptionStatus).toBe('complete')
    expect(result.subRules[0]?.descriptionSource).toBe('inline-bold-subrule')
  })
})
