import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import type { R20ExporterCampaignJson } from './types'

export function parseCampaignJson(_campaign: R20ExporterCampaignJson): NormalizedCharacter[] {
  throw new Error('R20Exporter campaign.json parsing is planned for a later phase and is not part of the MVP.')
}
