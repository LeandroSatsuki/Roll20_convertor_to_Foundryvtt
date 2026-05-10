import { describe, expect, it } from 'vitest'
import { extractInlineSubRules } from '../lib/rules/import/extractInlineSubRules'

const html = '<p><strong>Predador Ágil:</strong> Seu deslocamento base aumenta em 1,5 metro [5 pés].</p>'

describe('genericSubRulesAcrossKinds', () => {
  it('infers the child kind from the parent context', () => {
    expect(extractInlineSubRules({ htmlNode: html, parentRule: { id: 'race-felinar', name: 'Felinar' }, parentKind: 'race', sourceUrl: 'https://example.invalid/race' }).subRules[0]?.kind).toBe('raceFeature')
    expect(extractInlineSubRules({ htmlNode: html, parentRule: { id: 'class-druida', name: 'Druida', className: 'Druida' }, parentKind: 'class', sourceUrl: 'https://example.invalid/class' }).subRules[0]?.kind).toBe('classFeature')
    expect(extractInlineSubRules({ htmlNode: html, parentRule: { id: 'subclass-xama', name: 'Xamã', className: 'Druida', subclassName: 'Xamã' }, parentKind: 'subclass', sourceUrl: 'https://example.invalid/subclass' }).subRules[0]?.kind).toBe('subclassFeature')
    expect(extractInlineSubRules({ htmlNode: html, parentRule: { id: 'background-espiao', name: 'Espião', backgroundName: 'Espião' }, parentKind: 'background', sourceUrl: 'https://example.invalid/background' }).subRules[0]?.kind).toBe('backgroundFeature')
  })
})
