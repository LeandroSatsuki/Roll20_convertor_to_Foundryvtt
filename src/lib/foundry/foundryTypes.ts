export type FoundryActor = {
  _id?: string
  name: string
  type: 'character'
  img: string
  system: Record<string, unknown>
  prototypeToken: Record<string, unknown>
  items: FoundryItem[]
  effects: unknown[]
  flags: Record<string, unknown>
  _stats: {
    systemId: 'dnd5e'
    systemVersion: '5.2.4'
    coreVersion?: '13.351'
    createdTime?: number
    modifiedTime?: number
  }
}

export type FoundryItem = {
  _id: string
  name: string
  type: string
  img: string
  system: Record<string, unknown>
  effects: unknown[]
  folder: null
  flags: Record<string, unknown>
  _stats: Record<string, unknown>
}
