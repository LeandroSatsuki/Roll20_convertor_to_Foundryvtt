import { describe, expect, it } from 'vitest'
import { extractInlineSubRules } from '../lib/rules/import/extractInlineSubRules'

describe('noSubRuleFromPlainParagraph', () => {
  it('does not create subrules from plain paragraphs without trusted bold structure', () => {
    const result = extractInlineSubRules({
      htmlNode: '<p>Predador Ágil: Seu deslocamento base aumenta em 1,5 metro [5 pés].</p>',
      parentRule: { id: 'race-felinar', name: 'Felinar', displayName: 'Felinar (Felinos)' },
      parentKind: 'race',
      sourceUrl: 'https://example.invalid/felinar',
    })

    expect(result.subRules).toHaveLength(0)
  })
})
