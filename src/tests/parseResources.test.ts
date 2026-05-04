import { describe, expect, it } from 'vitest'
import { parseResources } from '../lib/parser/parseResources'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'

describe('parseResources', () => {
  it('extracts known limited resources', () => {
    const { resources } = parseResources(sampleHeyzelText)
    const byName = Object.fromEntries(resources.map((resource) => [resource.label.value, resource]))
    expect(byName['Retomar Fôlego'].value.value).toBe(1)
    expect(byName['Retomar Fôlego'].max.value).toBe(2)
    expect(byName['Legado Implacável'].value.value).toBe(1)
    expect(byName['Legado Implacável'].max.value).toBe(1)
    expect(byName['Dados de Combate'].value.value).toBe(2)
    expect(byName['Dados de Combate'].max.value).toBe(5)
    expect(byName['Superstição Tribal'].value.value).toBe(3)
    expect(byName['Superstição Tribal'].max.value).toBe(3)
    expect(byName['Surto de Ação'].value.value).toBe(1)
    expect(byName['Surto de Ação'].max.value).toBe(1)
  })
})
