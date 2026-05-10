import { describe, expect, it } from 'vitest'
import { extractInlineSubRules } from '../lib/rules/import/extractInlineSubRules'

describe('parentChildRuleGeneration', () => {
  it('preserves parent metadata and source url for table-row subrules', () => {
    const html = `
      <table>
        <tr>
          <td><b>Felinar</b> (Felinos)</td>
          <td><b>Predador Ágil:</b> Seu deslocamento base aumenta em 1,5 metro [5 pés]. Além disso, você ganha deslocamento de Escalada igual ao seu deslocamento de caminhada.</td>
        </tr>
      </table>
    `

    const result = extractInlineSubRules({
      htmlNode: html,
      parentRule: { id: 'essencia-bestial', name: 'Essência Bestial', displayName: 'Essência Bestial' },
      parentKind: 'race',
      sourceUrl: 'https://example.invalid/bestial',
    })

    expect(result.subRules).toHaveLength(1)
    expect(result.subRules[0]?.parentName).toBe('Felinar')
    expect(result.subRules[0]?.parentDisplayName).toBe('Felinar (Felinos)')
    expect(result.subRules[0]?.raceName).toBe('Felinar')
    expect(result.subRules[0]?.sourceUrl).toBe('https://example.invalid/bestial')
  })
})
