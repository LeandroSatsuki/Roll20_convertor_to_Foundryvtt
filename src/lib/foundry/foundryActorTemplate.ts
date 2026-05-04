import type { FoundryActor } from './foundryTypes'

export function createFoundryActorTemplate(name: string): FoundryActor {
  const now = Date.now()
  return {
    name,
    type: 'character',
    img: 'icons/svg/mystery-man.svg',
    system: {
      currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
      abilities: {},
      skills: {},
      spells: {},
      attributes: {
        ac: { calc: 'flat', flat: null },
        hp: { value: null, max: null, temp: null, tempmax: null },
        movement: { burrow: null, climb: null, fly: null, swim: null, walk: null, units: 'ft', hover: false },
        senses: { darkvision: null, blindsight: null, tremorsense: null, truesight: null, units: 'ft', special: '' },
        init: { ability: '', bonus: '' },
        spellcasting: '',
      },
      details: {
        alignment: '',
        biography: { value: '', public: '' },
        race: '',
        background: '',
        type: { value: 'humanoid', subtype: '', swarm: '', custom: '' },
      },
      traits: { size: 'med' },
      resources: {
        primary: { value: null, max: null, sr: false, lr: false, label: '' },
        secondary: { value: null, max: null, sr: false, lr: false, label: '' },
        tertiary: { value: null, max: null, sr: false, lr: false, label: '' },
      },
      tools: {},
    },
    prototypeToken: {
      name,
      displayName: 20,
      actorLink: true,
      disposition: 1,
      texture: { src: 'icons/svg/mystery-man.svg', scaleX: 1, scaleY: 1 },
      width: 1,
      height: 1,
    },
    items: [],
    effects: [],
    flags: {},
    _stats: {
      coreVersion: '13.351',
      systemId: 'dnd5e',
      systemVersion: '5.2.4',
      createdTime: now,
      modifiedTime: now,
    },
  }
}
