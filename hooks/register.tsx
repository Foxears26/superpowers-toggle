import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const enabled = atom({ plugin: 'superpowers-toggle', key: 'enabled' } as const, false)

const isOn = (v: unknown): boolean => v === true

const ORANGE = '#D97757'
const GRAY = '#8A8A8A'

const ON_TEXT =
  '用户已通过输入框上方的开关启用 Superpowers。接到任务（要做的事，而不只是提问或闲聊）时，直接使用 Superpowers 流程，先调用相应的 superpowers 技能，不要再问是否使用。这一条覆盖 CLAUDE.md 中"先问是否使用 Superpowers"的规则。纯问题和闲聊不受影响。'

export const register: Register = on => {
  // Rides with each prompt: a thread's system prompt is fixed once sent,
  // so a section would not change mid-conversation.
  on('prompt.submit', async ($, e, next) =>
    (await read($, enabled)) ? next({ ...e, context: [...(e.context ?? []), ON_TEXT] }) : next(e),
  )

  on('session.start', async ($, e, next) => {
    const stored = await $.store.get('enabled')
    await update($, enabled, () => isOn(stored))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    // Other plugins share this band (a Reply button, say): draw theirs too.
    const beneath = await next(e)
    const isEnabled = await read($, enabled)
    const table = $.ui.resolve(e)
    const { Box, Button, Text } = table
    // Desktop, VS Code and mobile draw an Svg; the terminal draws none.
    const Svg = e.surface !== 'terminal' && 'Svg' in table ? table.Svg : undefined

    const toggle = async () => {
      const value = await update($, enabled, v => !v)
      await $.store.set('enabled', value)
      $.ui.toast(value ? 'Superpowers 已打开' : 'Superpowers 已关闭')
    }

    // Desktop draws no color on a Button's text, so the state is a dot beside it:
    // orange on, gray off. One chip per switch; more switches line up here later.
    const fill = isEnabled ? ORANGE : GRAY
    const dot = Svg ? (
      <Svg
        alt={isEnabled ? 'Superpowers on' : 'Superpowers off'}
        width={10}
        height={10}
        source={`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="5" cy="5" r="4.5" fill="${fill}"/></svg>`}
      />
    ) : (
      <Text color={fill}>●</Text>
    )

    const chip = (
      <Box flexDirection="row" gap={1} alignItems="center">
        {dot}
        <Button key="toggle" plain label="Superpowers" onPress={toggle} />
      </Box>
    )

    return (
      <Box flexDirection="row" gap={2}>
        {chip}
        {beneath}
      </Box>
    )
  })
}
