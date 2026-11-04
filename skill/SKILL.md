---
name: muster
description: "Muster runs one spec through three herdr agents: Plotter plans, Tinker builds once the plan is FINAL, Nitpick verifies and signs off, in a 2×2 Herdr tab, started by setting the spec's Status to Herd. Use when the user says muster, herd, plotter, tinker, nitpick, 'plan → implement → verify', or asks for separate planner/developer/verifier agents. Also read it whenever you finish a spec for a feature: it says when to offer a herd."
---

# Muster

Plan → build → verify, with a separate agent per role, each in its own Herdr pane. Every machine with Muster installed runs a watcher, so nothing needs starting by hand.

## Starting a herd

1. The spec is `<spec root>/<folder>/spec.md` (or `SPEC.md`); the default root is `~/code/specs`. Its `Repos` row names checkouts beside the spec root (`~/code/<repo>`) or absolute paths, e.g. `| **Repos** | academia-app (base master) |`.
2. Set its Status to the trigger (default `Herd`): `| **Status** | Herd |`, `**Status:** Herd`, or `Status: Herd`.
3. Within ~5 s the status becomes `In progress (muster)` and the herd opens in its own Herdr space, named after the spec folder: Herder | Plotter on top, Tinker | Nitpick below.
4. The spec's Status ends as `Implemented (muster signed off; see VERDICT.md)`, `In progress (muster escalated; see VERDICT.md)`, or `Muster failed: <reason>`.

**Ask before herding.** Never set Status to `Herd` unless the user explicitly asked for it. When you finish writing or updating a spec for a real feature or a multi-step change (Status `Ready`, testable requirements, at least one repo), ask once, before you start building: "Herd this? Plotter, Tinker and Nitpick build and verify it in their own panes, at about 3× the cost of building it here." Yes → set Status to `Herd` and stop: don't build it yourself. No → carry on as usual. Don't ask while the user is only ideating or exploring, for small fixes, or for read-only investigations, and don't ask again for the same spec unless the user brings it up.

Never run the role agents yourself; Herder starts them. `muster start <spec dir>` starts a herd without touching Status. For a spec on another machine, edit it there (`hc file edit --on <machine> …`).

## Roles and messages

| Role | Writes (in the spec dir) | Sends (`hc send`) |
|---|---|---|
| Herder (the `muster run` script) | `muster.log`, the spec's Status | starts each peer when the previous gate passes |
| Plotter | `PLAN.md` (`Status: DRAFT/FINAL`, with Repos) | Herder `PLAN_FINAL`; answers `ANSWER:` |
| Tinker | code in the repos + `IMPL.md` | Plotter `QUESTION:`; Herder `IMPL_DONE`; Nitpick `FIXED round N` |
| Nitpick | `VERDICT.md` (`Verdict: SIGNED-OFF/REJECTED`) | Tinker `REJECTED round N`; Herder `SIGNED_OFF` / `ESCALATE` (after 3 rounds) |

Gates: Tinker starts only when PLAN.md's first line is `Status: FINAL`. Nitpick starts after `IMPL_DONE`. Herder finishes only when VERDICT.md says `Verdict: SIGNED-OFF`. Then it closes the peers and shows "Press Enter to close this herd"; Enter removes the herd's space.

## Watching and steering

- The panes are ordinary Herdr panes: click in and type, or use `hc send <id>-tinker "…"`. Terminal names are `<id>-herder|plotter|tinker|nitpick`, where `<id>` is the spec folder lowercased and cut to 24 characters.
- `Needs you` on a pane: that agent is waiting for a human. Answer it in that pane.
- Escalated: Herder shows Needs you and the agents stay up. Fix things with Tinker/Nitpick, then press Enter in the Herder pane to resume.
- Logs: `<spec dir>/muster.log`. Watcher: `~/Library/Logs/muster.log` (macOS), `journalctl --user -u muster` (Linux).

## Configuration

`~/.config/muster/config.toml` sets each role's agent command (`[roles.nitpick] command = "codex --model gpt-5"`), `spec_roots` and `trigger`. After editing it, run `muster install` to regenerate the herdr templates (`~/.config/herdr-core/templates/muster-*.md`). To change a role's instructions, put your own `~/.config/muster/roles/<role>.md` in place and re-run install. `muster doctor` checks the setup.
