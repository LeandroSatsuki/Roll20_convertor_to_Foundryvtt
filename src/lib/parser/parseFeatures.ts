import { field } from '../normalize/confidence'
import type { NormalizedFeature } from '../normalize/normalizedCharacterTypes'
import { compactText } from './parserUtils'

const featureNames: Array<{ name: string; sourceType: NormalizedFeature['sourceType'] }> = [
  { name: 'Habilidoso', sourceType: 'race' },
  { name: 'Poliglota', sourceType: 'race' },
  { name: 'Jeitinho Humano', sourceType: 'race' },
  { name: 'Legado Implacável', sourceType: 'race' },
  { name: 'Ameaça Latente', sourceType: 'race' },
  { name: 'Visão no Escuro', sourceType: 'race' },
  { name: 'Sangue Órquico', sourceType: 'race' },
  { name: 'Superstição Tribal', sourceType: 'race' },
  { name: 'Sobrevivente Calejado', sourceType: 'background' },
  { name: 'Soldado', sourceType: 'background' },
  { name: 'Robusto', sourceType: 'feat' },
  { name: 'Mestre da Ambidestria', sourceType: 'feat' },
  { name: 'Resiliente (Sabedoria)', sourceType: 'feat' },
  { name: 'Two-Weapon Fighting', sourceType: 'class' },
  { name: 'Retomar Fôlego', sourceType: 'class' },
  { name: 'Fundamentos de Batalha', sourceType: 'class' },
  { name: 'Arremesso Rápido', sourceType: 'maneuver' },
  { name: 'Ataque Distrativo', sourceType: 'maneuver' },
  { name: 'Ataque de Manobra', sourceType: 'maneuver' },
  { name: 'Ataque Preparado', sourceType: 'maneuver' },
  { name: 'Ataque Preciso', sourceType: 'maneuver' },
  { name: 'Surto de Ação', sourceType: 'class' },
  { name: 'Mente Tática', sourceType: 'class' },
  { name: 'Campeão', sourceType: 'subclass' },
  { name: 'Guerreiro do Corpo e do Instinto', sourceType: 'subclass' },
]

export function parseFeatures(text: string): NormalizedFeature[] {
  const compact = compactText(text)
  return featureNames
    .filter((feature) => compactText(feature.name).length > 0 && compact.match(new RegExp(compactText(feature.name).replace(/[()]/g, '\\$&'), 'i')))
    .map((feature) => ({
      name: field(feature.name, 'medium', feature.name),
      sourceType: feature.sourceType,
      description: field('', 'low', feature.name, ['Descrição completa não foi estruturada no MVP; revisar no Foundry.']),
      raw: feature.name,
    }))
}
