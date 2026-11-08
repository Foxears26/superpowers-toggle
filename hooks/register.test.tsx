import { expect, test } from 'claude-code/testing'

const OFF = 'off'
const ON = 'on'
const ORANGE = '#D97757'
const GRAY = '#8A8A8A'

const band = (surface: 'terminal' | 'desktop', hasSurvey = false) =>
  ({
    plugin: 'superpowers-toggle',
    component: 'AbovePrompt',
    surface,
    props: {
      hasSurvey,
      isWorking: false,
      maxRows: 10,
      bodyColumns: 80,
      scroll: { offset: 0, bodyRows: 10 },
      view: {},
    },
  }) as const

const SURFACES = ['terminal', 'desktop'] as const

// Stands for the engine: the plugin's global store, in memory, readable by the test.
const engine = (on: any, stored: Record<string, unknown> = {}, beneath: 'text' | 'reply' | 'none' = 'text') => {
  const store = { ...stored }
  on('store.get', (_: unknown, e: { key: string }) => ({ value: store[e.key] }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => {
    store[e.key] = e.value
    return { value: undefined }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('ui.render', ($: any, e: any) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    if (beneath === 'none') return <Box />
    return beneath === 'reply' ? <Button key="reply" label="Reply" onPress={() => {}} /> : <Text>engine</Text>
  })
  return store
}

const begin = ($: any) => $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

// The chip: a colored dot (an Svg where the surface has one, else a Text ●)
// beside a Button labelled "Superpowers" in the default text color.
const color = async (ui: any): Promise<string | undefined> => {
  const svg = await ui.find({ type: 'Svg' })
  if (svg) return /fill="([^"]+)"/.exec(String(svg.props.source))?.[1]
  return (await ui.find({ type: 'Text', text: /●/ }))?.props.color
}
const label = async (ui: any) => {
  const button = await ui.find({ type: 'Button', key: 'toggle' })
  if (!button) return undefined
  expect(button.props.label).toBe('Superpowers')
  const c = await color(ui)
  return c === ORANGE ? ON : c === GRAY ? OFF : c
}

test('defaults to off', async ($, on) => {
  engine(on)
  await begin($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(band(surface))
    expect(await label(ui)).toBe(OFF)
    expect(await color(ui)).toBe(GRAY)
    expect(await ui.find({ type: 'Button', key: 'toggle' })).toBeDefined()
    await ui.unmount()
  }
})

test('desktop draws the dot as an Svg, the terminal as a Text', async ($, on) => {
  engine(on)
  await begin($)
  const desk = await $.ui.mount(band('desktop'))
  expect(await desk.find({ type: 'Svg' })).toBeDefined()
  await desk.unmount()
  const term = await $.ui.mount(band('terminal'))
  expect(await term.find({ type: 'Svg' })).toBeUndefined()
  expect((await term.find({ type: 'Text', text: /●/ }))?.props.color).toBe(GRAY)
  await term.unmount()
})

test("keeps another plugin's band beside the switch", async ($, on) => {
  engine(on, {}, 'reply')
  await begin($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(band(surface))
    expect((await ui.find({ type: 'Button', key: 'reply' }))?.props.label).toBe('Reply')
    expect(await label(ui)).toBe(OFF)
    await ui.unmount()
  }
})

test('draws the switch when the band beneath is empty', async ($, on) => {
  engine(on, {}, 'none')
  await begin($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(band(surface))
    expect(await label(ui)).toBe(OFF)
    await ui.unmount()
  }
})

test('press turns it on and remembers it', async ($, on) => {
  const store = engine(on)
  await begin($)
  const first = await $.ui.mount(band('desktop'))
  await first.press({ key: 'toggle' })
  await first.unmount()
  expect(store.enabled).toBe(true)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(band(surface))
    expect(await label(ui)).toBe(ON)
    expect(await color(ui)).toBe(ORANGE)
    await ui.unmount()
  }
})

test('pressing twice turns it back off', async ($, on) => {
  const store = engine(on)
  await begin($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(band(surface))
    await ui.press({ key: 'toggle' })
    await ui.press({ key: 'toggle' })
    expect(await label(ui)).toBe(OFF)
    expect(store.enabled).toBe(false)
    await ui.unmount()
  }
})

test('restores on from an earlier session', async ($, on) => {
  engine(on, { enabled: true })
  await begin($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(band(surface))
    expect(await label(ui)).toBe(ON)
    expect(await color(ui)).toBe(ORANGE)
    await ui.unmount()
  }
})

test('non-boolean stored value counts as off', async ($, on) => {
  engine(on, { enabled: 'true' })
  await begin($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(band(surface))
    expect(await label(ui)).toBe(OFF)
    await ui.unmount()
  }
})

// Stands for the engine beneath: records the context the prompt entered with.
const submitter = (on: any) =>
  on('prompt.submit', (_: unknown, e: { text: string; context?: readonly string[] }) => ({
    text: e.text,
    context: e.context,
  }))

const submit = async ($: any) => (await $.prompt.submit({ text: 'do a task' })).context ?? []

const hasNote = (context: readonly string[]) => context.some(c => c.includes('Superpowers'))

test('off adds no context to the prompt', async ($, on) => {
  engine(on)
  submitter(on)
  await begin($)
  expect(await submit($)).toEqual([])
})

test('on attaches the note once per prompt', async ($, on) => {
  engine(on, { enabled: true })
  submitter(on)
  await begin($)
  for (let i = 0; i < 2; i++) {
    const context = await submit($)
    expect(context.length).toBe(1)
    expect(hasNote(context)).toBe(true)
  }
})

test('toggle takes effect on the next prompt', async ($, on) => {
  engine(on)
  submitter(on)
  await begin($)
  expect(hasNote(await submit($))).toBe(false)
  const ui = await $.ui.mount(band('desktop'))
  await ui.press({ key: 'toggle' })
  await ui.unmount()
  expect(hasNote(await submit($))).toBe(true)
})

test('two presses at once still cancel out', async ($, on) => {
  const store = engine(on)
  await begin($)
  const ui = await $.ui.mount(band('desktop'))
  await Promise.all([ui.press({ key: 'toggle' }), ui.press({ key: 'toggle' })])
  expect(await label(ui)).toBe(OFF)
  expect(store.enabled).toBe(false)
  await ui.unmount()
})

test('yields to a survey', async ($, on) => {
  engine(on, { enabled: true })
  await begin($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount(band(surface, true))
    expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
    expect(await ui.find({ type: 'Button', key: 'toggle' })).toBeUndefined()
    expect(await ui.find({ type: 'Svg' })).toBeUndefined()
    await ui.unmount()
  }
})

