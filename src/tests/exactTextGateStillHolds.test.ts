import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { getBonfireRuleEntity } from '../lib/rules/store/bonfireRuleStore'

const transeElfico =
  'Elfos não precisam dormir. Em vez disso, meditam profundamente, permanecendo semiconscientes, durante 4 horas por dia. Após descansar dessa forma, você ganha os mesmos benefícios que um humano ganharia após 8 horas de sono.'
const predadorAgil =
  'Seu deslocamento base aumenta em 1,5 metro [5 pés]. Além disso, você ganha deslocamento de Escalada igual ao seu deslocamento de caminhada.'
const menteGenial =
  'Sua mente opera em caminhos não lineares que a magia hostil tem dificuldade de prender. Você tem Vantagem em Testes de Resistência de Inteligência, Sabedoria e Carisma contra magias e efeitos mágicos.'

describe('exactTextGateStillHolds', () => {
  it('keeps canonical Bonfire exact-text cases intact', () => {
    const cases = [
      { id: 'elfo-da-lua-transe-elfico', name: 'Transe Élfico', text: transeElfico },
      { id: 'race-feature-felinar-predador-agil', name: 'Predador Ágil', text: predadorAgil },
      { id: 'folken-mente-genial', name: 'Mente Genial', text: menteGenial },
    ]

    for (const testCase of cases) {
      const entity = getBonfireRuleEntity(testCase.id)
      const meta = buildRuleDescriptionMeta({ itemName: testCase.name, itemKind: entity?.kind ?? 'raceFeature', ruleId: testCase.id })

      expect(entity).toBeTruthy()
      expect(entity?.descriptionStatus).toBe('complete')
      expect(entity?.descriptionText).toBe(testCase.text)
      expect(meta.html).toContain(testCase.text)
    }
  })
})
