# superpowers-toggle

A small switch above the Claude Code prompt that turns the Superpowers workflow on or off.

- **On:** a short note rides along with each message you send (you don't see it, Claude does), telling Claude to use the Superpowers workflow (brainstorming, plan, execute, review) for tasks right away, without asking first.
- **Off:** nothing is added; Claude follows your own instructions (for example, asking once per task).

Press the small "Superpowers" button to switch; the dot beside it is orange when on and gray when off. Other plugins that draw above the prompt (a Reply button, say) stay visible beside it. The choice is stored globally, so new sessions keep it. The row hides while a survey is shown above the prompt.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install superpowers-toggle --marketplace Foxears26/superpowers-toggle
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install superpowers-toggle --marketplace Foxears26/superpowers-toggle
```
