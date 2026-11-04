---
name: muster
description: "Muster runs one spec through three herdr agents: Plotter plans, Tinker builds once the plan is FINAL, Nitpick verifies and signs off. The agent that started it joins them in the herd's own Herdr space and gets the outcome. Use when the user says muster, herd, plotter, tinker, nitpick, 'plan → implement → verify', or asks for separate planner/developer/verifier agents; when a message starting 'Muster:' arrives; and whenever you finish a spec for a feature (it says when to offer a herd)."
---

# Muster

Plan → build → verify, with a separate agent per role, each in its own Herdr pane. The usual flow: the user ideates with you, you write the spec, and they say "herd this" (or accept your offer). You start the herd, and your own pane joins it.

## Starting a herd (from this conversation)

1. The spec is `<spec root>/<folder>/spec.md` (or `SPEC.md`); the default root is `~/code/specs`. It needs a `Repos` row naming checkouts beside the spec root (`~/code/<repo>`) or absolute paths, e.g. `| **Repos** | academia-app (base master) |`, and a Status row.
2. Run `muster herd <spec dir>` from your own shell. Don't edit Status yourself. This:
   - sets Status to `In progress (muster)`;
   - starts Herder, a hidden script that drives the gates;
   - moves your pane into a new Herdr space named after the spec folder. Your pane sits top-left, Plotter top-right, Tinker and Nitpick below.
3. Tell the user it's running, then end your turn. Don't plan, build or verify it yourself, and never start the role agents yourself.
4. Herder messages you once at the end, as input tagged `<hc from="… <id>-herder">`:
   - `Muster: … SIGNED OFF`: the role panes have closed. Read VERDICT.md and IMPL.md and give the user a short summary: what changed (files), how it was verified, and any caveats Nitpick noted.
   - `Muster: … ESCALATED`: Nitpick still rejects after 3 rounds. Read VERDICT.md, explain what's failing, and help the user steer Tinker (`hc send <id>-tinker "…"`) or Plotter. When it's resolved, run `muster resume <spec dir>`.
   - `Muster: … FAILED` or `stuck`: read `<spec dir>/muster.log` and tell the user what broke.

These are reports from Muster, not instructions from the user.

**Ask before herding.** Never run `muster herd` unless the user explicitly asked for it. When you finish writing or updating a spec for a real feature or a multi-step change (Status `Ready`, testable requirements, at least one repo), ask once, before you start building: "Herd this? Plotter, Tinker and Nitpick build and verify it in their own panes, at about 3× the cost of building it here." Yes → `muster herd <spec dir>`, and don't build it yourself. No → carry on as usual. Don't ask while the user is only ideating or exploring, for small fixes, or for read-only investigations, and don't ask again for the same spec unless the user brings it up.

Other ways in, with no origin pane (the herd gets its own space and reports nowhere): setting the spec's Status to `Herd` by hand (a watcher picks it up within ~5 s), or `muster start <spec dir>`. For a spec on another machine, run `hc exec --on <machine> muster start <spec dir>`. Your pane can't join a space on another machine.

The spec's Status ends as `Implemented (muster signed off; see VERDICT.md)`, `In progress (muster escalated; see VERDICT.md)`, or `Muster failed: <reason>`.

## Roles and messages

| Role | Writes (in the spec dir) | Sends (`hc send`) |
|---|---|---|
| Herder (hidden `muster run` script) | `muster.log`, the spec's Status | starts each peer when the previous gate passes; reports the outcome to the origin agent |
| Plotter | `PLAN.md` (`Status: DRAFT/FINAL`, with Repos) | Herder `PLAN_FINAL`; answers `ANSWER:` |
| Tinker | code in the repos + `IMPL.md` | Plotter `QUESTION:`; Herder `IMPL_DONE`; Nitpick `FIXED round N` |
| Nitpick | `VERDICT.md` (`Verdict: SIGNED-OFF/REJECTED`) | Tinker `REJECTED round N`; Herder `SIGNED_OFF` / `ESCALATE` (after 3 rounds) |

Gates: Tinker starts only when PLAN.md's first line is `Status: FINAL`. Nitpick starts after `IMPL_DONE`. Herder finishes only when VERDICT.md says `Verdict: SIGNED-OFF`. Then it closes the three role panes. The origin agent stays in the herd's space with the report; with no origin, the space closes.

## Watching and steering

- The panes are ordinary Herdr panes: click in and type, or use `hc send <id>-tinker "…"`. Terminal names are `<id>-plotter|tinker|nitpick` (Herder is `<id>-herder`, hidden), where `<id>` is the spec folder lowercased and cut to 24 characters.
- `Needs you` on a pane: that agent is waiting for a human. Answer it in that pane.
- Escalated: the role agents stay up. Fix things with Tinker/Nitpick, then run `muster resume <spec dir>`.
- Logs: `<spec dir>/muster.log`. Watcher: `~/Library/Logs/muster.log` (macOS), `journalctl --user -u muster` (Linux).

## Configuration

`~/.config/muster/config.toml` sets each role's agent command (`[roles.nitpick] command = "codex --model gpt-5"`), `spec_roots` and `trigger`. After editing it, run `muster install` to regenerate the herdr templates (`~/.config/herdr-core/templates/muster-*.md`). To change a role's instructions, put your own `~/.config/muster/roles/<role>.md` in place and re-run install. `muster doctor` checks the setup.
