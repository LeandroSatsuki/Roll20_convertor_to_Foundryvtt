export type PactMagicSlots = {
  pact: {
    value: number
    override: number | null
    level: number
  }
}

const pactByLevel: Record<number, { slots: number; level: number }> = {
  1: { slots: 1, level: 1 },
  2: { slots: 2, level: 1 },
  3: { slots: 2, level: 2 },
  4: { slots: 2, level: 2 },
  5: { slots: 2, level: 3 },
  6: { slots: 2, level: 3 },
  7: { slots: 2, level: 4 },
  8: { slots: 2, level: 4 },
  9: { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
}

export function calculatePactMagicSlots(level: number): PactMagicSlots {
  const bounded = Math.max(1, Math.min(20, Math.trunc(level || 1)))
  const value = pactByLevel[bounded] ?? { slots: 0, level: 0 }
  return { pact: { value: value.slots, override: null, level: value.level } }
}
