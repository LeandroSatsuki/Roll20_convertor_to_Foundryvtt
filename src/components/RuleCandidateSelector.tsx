import type { RuleResolutionCandidate } from '../lib/rules/schema/bonfireEntityTypes'

export function RuleCandidateSelector({ candidates }: { candidates: RuleResolutionCandidate[] }) {
  if (!candidates.length) return <span>sem candidatos</span>
  return (
    <select aria-label="Candidatos de regra" defaultValue={candidates[0]?.entity.id}>
      {candidates.slice(0, 5).map((candidate) => (
        <option key={candidate.entity.id} value={candidate.entity.id}>
          {candidate.entity.name} ({candidate.entity.kind}, {candidate.score})
        </option>
      ))}
    </select>
  )
}

