import type { NormalizedCharacter } from '../lib/character/normalizedCharacterTypes'
import { CharacterReviewForm } from './CharacterReviewForm'

export function CharacterReviewPanel({ character, onChange }: { character: NormalizedCharacter | null; onChange: (character: NormalizedCharacter) => void }) {
  return <CharacterReviewForm character={character} onChange={onChange} />
}
