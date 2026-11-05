# Muster

Plan → build → verify for one spec, with a separate coding agent for each step. Your agent drafts the plan, Plotter reviews it, Tinker builds it and Nitpick checks it, in the spec's own Herdr space. It also watches pull requests, fixing failed checks and review comments until they're green. This mod is Muster's pane header: each pane names its role (`Plotter · omp`) and links to the spec, and a click opens the spec in your editor in a split. Every other pane looks exactly as it does with Herdr's shipped `pane` header. A second mod, `muster`, is a sidebar panel listing running herds, PR watches and the queue on every machine (from `muster ls --json`). The rest of Muster (the CLI, the watcher and the agent templates) installs from the repo's README.

![Muster](preview.png)

## What you see

- A 30px bar across the top of each pane, in the theme's `background` with a 1px `border` line underneath, 10px horizontal padding, 8px gaps, 12px text.
- From left to right:
  - the program's 14px icon (dim);
  - the label: for a Muster terminal, its role (`Herder`, `Plotter`, `Tinker`, `Nitpick`), then ` · `, then the program name (`Plotter · omp`); if the role and program names match (the Herder script reports `herder`), just the role. For other panes, the shipped header's label: the agent's or shell's program name, else the terminal title, else `shell`. Medium weight, foreground color, truncated at 260px.
  - the pane's folder (dim, `~` for home, truncated, takes the remaining width);
  - for a herd pane (and the agent that started the herd), a spec link: a 12px file icon and `<spec folder>/spec.md`, underlined in the theme's `accent`, 20px tall with 6px padding, truncated at 220px;
  - a status marker at the right end.

## How it behaves

- **working:** a 12px spinner in the theme's `working` color, one turn per 900 ms.
- **blocked:** a "Needs you" pill, 18px tall, radius 5, `blocked` at 15% opacity behind 10.5px semibold `blocked` text.
- **done:** a 7px round dot in `done`.
- **idle:** no marker.
- **Hover:** four 14px icon buttons appear: split right, split down, zoom/unzoom, close. Each has 3px padding and radius 4; hovering one gives it the `hover` background and foreground color. A click runs `pane.split {direction, pane}`, `pane.zoom {pane}` or `pane.close {pane}` without focusing the pane.
- **Click elsewhere on the bar:** `pane.focus {pane}`.
- Labels update live as terminals start and stop; the mod never polls.

## Built from

- **The mod:** `mods/muster-pane/` is a copy of the shipped `pane` mod (`mod.json`: `"place": "none"`). Its icons `split-right`, `split-down`, `zoom`, `unzoom` and `close` are SVGs referenced as `mods/muster-pane/<name>.svg`. The spinner is the shipped `mods/workspace-chrome/spinner.svg`.
- **Wiring:** a layout uses it as its pane header: `"pane": {"header": {"content": {"mod": "muster-pane"}, "height": 30, "position": "top", "reveal": "always"}}`. Herdr passes `props()` = `{pane, terminal}`.
- **`herdr` calls:**
  - `panes()` finds this pane: program, title, cwd, status, zoomed.
  - `terminals()` reads the terminal's labels.
  - `theme()`, `home()`, and `run()` for the pane commands.
- **Role:** the `muster.role` label (`herder` | `plotter` | `tinker` | `nitpick`) on the core terminal, which Muster sets when it starts each agent. A remote pane's terminal is `machine/tN`. Match it either to a `terminals()` entry with that full address, or to one whose `address` is `tN` and whose `machine` is that machine.
- **Spec link:** the labels `muster.specfile` (absolute path) and `muster.editor` (a JSON argv such as `["nvim"]`, resolved by Muster on the terminal's machine). A click runs `pane.split {direction: "right", pane, argv: [...editor, specfile]}` and stops propagation, so the bar doesn't also focus. The split runs on the pane's machine, so a remote herd opens the spec there. If `muster.editor` is missing or invalid, use `["vi"]`. The icon is the shipped `mods/files/file.svg`.
- **Programs:** the only program it starts is that editor, in a new terminal pane, when the link is clicked. No network, and no files read outside its folder. The rest of Muster (the CLI, the watcher service and the agent templates) is in this repo but isn't part of the mod. See the README.

## Watch out

- Remote terminals: without the machine-aware address match, panes on other machines lose their role and fall back to the program name.
- The shipped label prefers the program name for agents, so an omp pane alone just says "omp". The role has to come from the label, not the title.
- Copy `pane` with `mod.clone` rather than editing the shipped mod. The app restores shipped mods.
- It only changes the header. The 2×2 grid, the spaces and the agents come from the `muster` CLI.

## Done when

- `herdr-app check mods/muster-pane` passes, and `herdr-app status` shows no errors once it is set as the active layout's header.
- In a running herd, the role headers read `Plotter · <agent>`, `Tinker · <agent>`, `Nitpick · <agent>` (Herder itself runs hidden), including for a herd on another machine. The agent that started the herd keeps its normal label and also shows the spec link.
- A pane that isn't part of a herd shows exactly what the shipped `pane` header shows.
- The status markers and hover buttons behave as above.
- In a herd pane, clicking the spec link opens a split to the right running the editor on the spec; clicking elsewhere on the bar only focuses the pane.
