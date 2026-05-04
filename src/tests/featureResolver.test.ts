import { describe, expect, it } from 'vitest'
import { resolveFeature } from '../lib/rules/featureResolver'

const context = { className: 'Clérigo', level: 5, race: 'Folken Limalumes', background: 'Espião', subclass: 'Clérigo do Caos' }

describe('featureResolver', () => {
  it('resolves Cleric features from Bonfire seeds', () => {
    expect(resolveFeature('Conjuração', context).kind).toBe('spellcasting')
    expect(resolveFeature('Conjuração', context).confidence).toBe('high')
    expect(resolveFeature('Ordem Sagrada', context).kind).toBe('classFeature')
    expect(resolveFeature('Ritos Sacros', context).kind).toBe('classFeature')
    const channel = resolveFeature('Canalizar Divindade', context)
    expect(channel.kind).toBe('resource')
    expect(channel.confidence).toBe('high')
    const chaos = resolveFeature('Clérigo do Caos', context)
    expect(chaos.kind).toBe('subclassFeature')
    expect(chaos.confidence).toBe('high')
  })

  it('marks incomplete or racial features with review confidence', () => {
    expect(['low', 'medium', 'high']).toContain(resolveFeature('Marca Anômala', context).confidence)
    const agility = resolveFeature('Agilidade dos Pequeninos', context)
    expect(agility.kind).toBe('raceFeature')
    expect(['high', 'medium']).toContain(agility.confidence)
  })
})
