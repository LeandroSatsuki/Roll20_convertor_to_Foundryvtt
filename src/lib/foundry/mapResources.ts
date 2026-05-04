import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'

export function mapResources(character: NormalizedCharacter): Record<string, unknown> {
  const slots = ['primary', 'secondary', 'tertiary']
  const result: Record<string, unknown> = {}
  character.resources.slice(0, 3).forEach((resource, index) => {
    result[slots[index]] = {
      value: resource.value.value,
      max: resource.max.value,
      sr: resource.recovery.value === 'sr',
      lr: resource.recovery.value === 'lr',
      label: resource.label.value,
    }
  })
  for (let index = character.resources.length; index < 3; index += 1) {
    result[slots[index]] = { value: null, max: null, sr: false, lr: false, label: '' }
  }
  return result
}
