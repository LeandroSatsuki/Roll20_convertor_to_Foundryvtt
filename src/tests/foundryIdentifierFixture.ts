import type { FoundryActor, FoundryItem } from '../lib/foundry/foundryTypes'

export function actorWithItems(items: FoundryItem[]): FoundryActor {
  return {
    name: 'Identifier Test',
    type: 'character',
    img: 'icons/svg/mystery-man.svg',
    system: {},
    prototypeToken: {},
    items,
    effects: [],
    flags: { 'roll20-to-foundry': {} },
    _stats: { systemId: 'dnd5e', systemVersion: '5.2.4' },
  }
}

export function item(name: string, type: string, identifier: string): FoundryItem {
  return {
    _id: `${type}${name}`.replace(/[^A-Za-z0-9]/g, '').padEnd(16, '0').slice(0, 16),
    name,
    type,
    img: 'icons/svg/item-bag.svg',
    system: {
      identifier,
      description: { value: `<p>${name}</p>`, chat: '' },
      uses: { spent: null, max: '', recovery: [] },
      activities: {},
    },
    effects: [],
    folder: null,
    flags: { 'roll20-to-foundry': {} },
    _stats: {},
  }
}
