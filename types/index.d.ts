export type Enabled = boolean

declare module 'claude-code' {
  interface PluginState {
    'superpowers-toggle': { enabled: Enabled }
  }
}
