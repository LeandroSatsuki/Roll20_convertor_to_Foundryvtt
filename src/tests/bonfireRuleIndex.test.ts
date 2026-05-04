import { describe, expect, it } from 'vitest'
import { searchBonfireRuleIndex } from '../lib/rules/store/bonfireRuleIndex'

describe('bonfireRuleIndex', () => {
  it('finds rules by exact name, identifier, accents and aliases', () => {
    expect(searchBonfireRuleIndex('Canalizar Divindade')[0]?.name).toBe('Canalizar Divindade')
    expect(searchBonfireRuleIndex('clerigo-canalizar-divindade')[0]?.name).toBe('Canalizar Divindade')
    expect(searchBonfireRuleIndex('Canalizar Divindade')[0]?.identifier).toBe('clerigo-canalizar-divindade')
    expect(searchBonfireRuleIndex('Conjuracao')[0]?.name).toBe('Conjuração')
    expect(searchBonfireRuleIndex('Second Wind')[0]?.name).toBe('Retomar Fôlego')
  })

  it('does not confuse Cleric and Fighter classes', () => {
    expect(searchBonfireRuleIndex('Clérigo', { kinds: ['class'] })[0]?.id).toBe('clerigo')
    expect(searchBonfireRuleIndex('Guerreiro', { kinds: ['class'] })[0]?.id).toBe('guerreiro')
  })
})

