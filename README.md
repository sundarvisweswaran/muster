# Muster

Plan → build → verify for one spec, with a separate coding agent for each step, side by side in [Herdr](https://herdr.dev).

![Muster running a spec: Herder starts Plotter, Tinker and Nitpick in a 2×2 Herdr space; Tinker asks Plotter a question, Nitpick rejects round 1, Tinker fixes it, Nitpick signs off](docs/demo.gif)

*A real run, sped up about 6×: spec Status set to `Herd` → plan → build (Tinker asks Plotter a question) → Nitpick rejects round 1 → fix → signed off, in under 2 minutes.*

The flow: you ideate with your agent and it writes the spec. When you say "let's herd this" (or accept its offer), it runs `muster herd <spec dir>`. Your agent's pane moves into a new Herdr space named after the spec, next to the three role agents:

| | |
|---|---|
| **Your agent**: where you started; gets the outcome | **Plotter**: writes `PLAN.md` |
| **Tinker**: builds the FINAL plan | **Nitpick**: re-checks everything, rejects or signs off |

The agents talk to each other directly with `hc send`: Tinker asks Plotter questions, and Nitpick sends rejections back to Tinker until it signs off (or escalates after 3 rounds). A hidden script, Herder, starts each one when the previous gate passes. When it's done, the role panes close, the spec's Status says `Implemented (muster signed off…)`, and your agent gets the result and summarizes it. You're left with one space for the item: your conversation, with the outcome.

Every herd pane's header has a 📄 link to the spec. Click it to open the spec in a split pane, in your editor.

## Why

- **The checker didn't write the code.** A single agent tends to approve its own work. Nitpick re-runs every acceptance check from scratch.
- **Each role starts with a clean context.** Planning exploration doesn't crowd the build.
- **Hard gates in files.** The build starts only when `PLAN.md` says `Status: FINAL`, and the work is done only when `VERDICT.md` says `Verdict: SIGNED-OFF`. The plan, implementation notes and verdict stay as an audit trail.
- **Trigger it and walk away.** It runs in herdr-core, so a herd on a remote box keeps going while your laptop sleeps.
- **You can see and steer every agent.** Unlike hidden subagents, every role is a real pane you can watch, type into or answer.
- **Any agent per role.** For example, omp plans, Claude builds and Codex verifies, so a different model checks the work.

Skip it for small fixes: a herd runs three agents, so it costs roughly three times a single session.

## Requirements

- herdr-core (`hc`) on each machine that runs herds. The Herdr app is optional; it's only needed to see the panes.
- Python 3.9+.
- The agents you configure, installed and logged in on that machine.

## Set it up by asking your agent

Paste this into your coding agent (omp, Claude Code, Codex, …), running in a terminal on the machine where you want herds:

```text
Set up Muster (https://github.com/sundarvisweswaran/muster) on this machine and verify it end to end.

1. Read its README first. Check that herdr-core's `hc` is installed (`hc --version`); if it isn't, stop and tell me to install Herdr from https://herdr.dev/download/.
2. Clone it to ~/code/muster (pull if it's already there) and run `~/code/muster/bin/muster install`.
3. Ask me which agent should run each role: Plotter (plans), Tinker (builds), Nitpick (verifies). Use only agents installed and logged in here; suggest a different model for Nitpick than for Tinker. Write them to ~/.config/muster/config.toml, with whatever flag each agent needs to run without permission prompts, then run `muster install` again.
4. If the Herdr app is installed, set the pane header in my active layout (~/.config/herdr-app/layouts/<layout>.json, "header" → "content" → "mod") to "muster-pane". Change nothing else.
5. Run `muster doctor` and fix anything it reports.
6. Smoke test: create a throwaway git repo ~/code/muster-smoke and a spec ~/code/specs/muster-smoke/spec.md with `| **Status** | Ready |`, `| **Repos** | muster-smoke |`, and one small requirement (e.g. an add(a, b) function with a unit test). Run `muster herd ~/code/specs/muster-smoke` from your own shell: your pane joins the herd's space. End your turn; Herder sends you a "Muster: … SIGNED OFF" message when it's done. Then confirm the spec's Status says "Implemented (muster signed off…)" and VERDICT.md starts with "Verdict: SIGNED-OFF", show me the result, and delete the smoke repo and spec.
7. If I have other machines in `hc machine ls`, ask whether to install there too (`muster install --on <machine>`).
```

## Install

```sh
git clone <this repo> ~/code/muster
~/code/muster/bin/muster install            # this machine
~/code/muster/bin/muster install --on vps   # any machine added with `hc machine add`
muster doctor
```

`install` puts these in place:
- the CLI at `~/.local/bin/muster` and a default `~/.config/muster/config.toml`;
- herdr-core templates `muster-{plotter,tinker,nitpick}`;
- the skill at `~/.agents/skills/muster`, so agents know to offer a herd once a spec is written (they ask first);
- a watcher service (launchd on macOS, `systemd --user` on Linux);
- the `muster-pane` Herdr mod, if the Herdr app is installed.

Re-running it is safe: it refreshes everything and keeps your config.

To see roles in the pane headers, set your layout's pane header to the mod: in `~/.config/herdr-app/layouts/<layout>.json`, change `"header": {"content": {"mod": "pane"}}` to `"mod": "muster-pane"`. Other panes look the same as before.

## Configure

```toml
# ~/.config/muster/config.toml
spec_roots = ["~/code/specs"]
trigger = "Herd"
editor = "nvim"   # opens the spec link; default: $VISUAL/$EDITOR, else nvim/hx/vim/nano/vi

[roles.plotter]
command = "omp"

[roles.tinker]
command = "claude --dangerously-skip-permissions"

[roles.nitpick]
command = "codex --model gpt-5"
```

Then run `muster install` again. The editor is resolved on the machine running the herd, so a herd on a remote box opens the spec there.

**Unattended running.** Agents must not stop for permission prompts. Use your agent's own flag (Claude `--dangerously-skip-permissions`, etc.). For omp, Muster adds an overlay that turns off startup plan mode and approval prompts, plus an extension that titles each session `<Role> · <spec>`. Codex automatically gets `--no-daemon`, which hc requires.

**Agents that don't report status to Herdr** get `ready = "quiet"` (wait for the screen to settle). Set it yourself for agents not on the built-in list.

**Role instructions** live in `roles/*.md`. To use your own, put them in `~/.config/muster/roles/<role>.md`.

## Specs

`<spec root>/<folder>/spec.md` (or `SPEC.md`). Muster reads two fields, in any of these forms:

```markdown
| **Status** | Herd |
| **Repos** | my-app (base main), /abs/path/other-repo |
```
or `**Status:** Herd`, or `Status: Herd`. Repo names resolve to `<spec root>/../<name>`. If none resolve, Plotter finds the checkouts and lists them in `PLAN.md`.

## Ways to start a herd

- **From your agent:** `muster herd <spec dir>`. The skill makes this the default, and the agent asks before herding. Your agent's pane joins the herd's space and gets the outcome.
- **Hands-off:** set the spec's Status to `Herd` in any editor. The watcher starts it within ~5 s. There's no origin pane; the space closes once it's signed off.
- **By hand:** `muster start <spec dir>`. Same as hands-off, without touching Status.
- If a herd escalates, Nitpick still rejects after 3 rounds and everything stays up. Steer Tinker or Plotter in their panes, then run `muster resume <spec dir>`.

## How it works

- `muster watch` (the service) checks the spec roots every 5 s. When it finds the trigger, it sets Status to `In progress (muster)` and runs `muster start`.
- Herder (`muster run`) is a small hidden script, not an AI agent. It starts each role with `hc run <template>`. The roles report with `hc send <herder>`, and the messages arrive on Herder's input. With `muster herd`, it also records the calling terminal (`$HC_TERMINAL_ID`) as the origin, moves that pane into the herd's space, and sends it the outcome.
- Panes: each herd gets its own space (one tab, the 2×2 grid). Every terminal carries the `herdr.space` / `herdr.tab` labels. Herder writes the grid into herdr-core's `herdr-app` layout document, so the layout exists even with no window open, and remote herds appear in your Herdr app under that machine.
- Spec link: Herder labels each herd terminal with `muster.specfile` and `muster.editor`, a JSON argv resolved on that machine. The `muster-pane` header shows the link and runs `pane.split {direction: "right", argv: [...editor, spec]}`.

## Limitations

- The layout uses the Herdr app's layout document (`doc.get` / `doc.set`), which isn't a documented format. If a Herdr update changes it, the grid can break; the pipeline still runs.
- Role agents run without permission prompts. Use it on machines and repos where that's acceptable.
