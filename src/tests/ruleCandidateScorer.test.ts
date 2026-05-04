import { describe, expect, it } from 'vitest'
import { findRuleCandidates } from '../lib/rules/resolution/entityMatcher'
import { scoreRuleCandidate } from '../lib/rules/resolution/ruleCandidateScorer'

function bestScore(rawName: string, context: Parameters<typeof scoreRuleCandidate>[2]) {
  return findRuleCandidates(rawName, context)
    .map((candidate) => scoreRuleCandidate(rawName, candidate, context))
    .sort((a, b) => b.score - a.score)[0]
}

describe('ruleCandidateScorer', () => {
  it('scores class and race context', () => {
    expect(bestScore('Conjuração', { className: 'Clérigo', level: 5, section: 'class' }).confidence).toBe('high')
    expect(bestScore('Retomar Fôlego', { className: 'Guerreiro', level: 6, section: 'class' }).confidence).toBe('high')
    expect(bestScore('Retomar Fôlego', { className: 'Clérigo', level: 5, section: 'class' }).conflicts.length).toBeGreaterThan(0)
    expect(['high', 'medium']).toContain(bestScore('Agilidade dos Pequeninos', { race: 'Folken Limalumes', section: 'race' }).confidence)
    expect(bestScore('Agilidade dos Pequeninos', { race: 'Humano Goruun', section: 'race' }).conflicts.length).toBeGreaterThan(0)
  })
})

