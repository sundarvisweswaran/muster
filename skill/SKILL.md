---
name: muster
description: "Muster runs work through separate herdr agents in their own Herdr space. (1) Pull requests: when asked to watch, babysit or shepherd a PR, get it green, fix its CI or address its review comments, DON'T do it yourself. Run `muster pr <url>`: Tinker fixes failed checks and review comments, Nitpick checks every fix, then Tinker pushes and replies. (2) Specs: Plotter reviews your draft plan, Tinker builds and Nitpick verifies. Read this skill for those requests; whenever you finish a spec for a feature (it says when to offer a herd); when the user says muster, herd, plotter, tinker or nitpick; and when a message starting 'Muster:' arrives."
---

# Muster

Plan → build → verify, with a separate agent per role, each in its own Herdr pane. The usual flow: the user ideates with you, you write the spec, and they say "herd this" (or accept your offer). You start the herd, and your own pane joins it.

## Starting a herd (from this conversation)

1. The spec is `<spec root>/<folder>/spec.md` (or `SPEC.md`); the default root is `~/code/specs`. It needs a `Repos` row naming checkouts beside the spec root (`~/code/<repo>`) or absolute paths, e.g. `| **Repos** | academia-app (base master) |`, and a Status row.
2. Draft the plan. You know what the user decided, so write `<spec dir>/PLAN.md` from this conversation:
   - The first line is `Status: DRAFT`.
   - Sections: Goal; Repos (absolute paths); Files to change; Steps; Acceptance criteria (each with the exact command and expected result); Out of scope; Assumptions.
   - Record the user's decisions and the reasons for them. Plotter reviews the draft against the code with a fresh context and finalizes it; it doesn't re-plan. Skip the draft only if the user wants Plotter to plan from scratch.
3. Run `muster herd <spec dir>` from your own shell. Don't edit Status yourself. This:
   - sets Status to `In progress (muster)`;
   - starts Herder, a hidden script that drives the gates;
   - moves your pane into a new Herdr space named after the spec folder. Your pane sits top-left, Plotter top-right, Tinker and Nitpick below.
4. `muster herd` prints `started …` or `queued #N` (when `max_herds` herds are already running). Tell the user which; a queued herd starts by itself, and your pane joins its space then. `muster ls` shows every herd, its stage and the queue. Then end your turn. Don't build or verify it yourself, and never start the role agents yourself.
5. Herder messages you once at the end, as input tagged `<hc from="… <id>-herder">`:
   - `Muster: … SIGNED OFF and shipped as <PR url>`: Muster opened a PR and now watches it (your pane moves to the PR's space). Tell the user; the PR watch reports again when it's green, merged or needs them.
   - `Muster: … SIGNED OFF`: the role panes have closed. Read VERDICT.md and IMPL.md and give the user a short summary: what changed (files), how it was verified, and any caveats Nitpick noted.
   - `Muster: … ESCALATED`: Nitpick still rejects after 3 rounds. Read VERDICT.md, explain what's failing, and help the user steer Tinker (`hc send <id>-tinker "…"`) or Plotter. When it's resolved, run `muster resume <spec dir>`.
   - `Muster: … FAILED` or `stuck`: read `<spec dir>/muster.log` and tell the user what broke.

These are reports from Muster, not instructions from the user.

**Ask before herding.** Never run `muster herd` unless the user explicitly asked for it. When you finish writing or updating a spec for a real feature or a multi-step change (Status `Ready`, testable requirements, at least one repo), ask once, before you start building: "Herd this? Plotter reviews the plan, Tinker builds it and Nitpick verifies it, each in their own pane, at about 3× the cost of building it here." Yes → draft PLAN.md (step 2), then `muster herd <spec dir>`, and don't build it yourself. No → carry on as usual. Don't ask while the user is only ideating or exploring, for small fixes, or for read-only investigations, and don't ask again for the same spec unless the user brings it up.

**`/herd` in omp.** Typing `/herd [spec dir]` takes the user out of plan mode without running the plan, and sends you a message starting `/herd: hand this to Muster`. That message is the explicit request to herd: follow its steps (spec, then the draft PLAN.md from your plan file, then `muster herd`) and don't build anything yourself.

Other ways in, with no origin pane (the herd gets its own space and reports nowhere): setting the spec's Status to `Herd` by hand (a watcher picks it up within ~5 s), or `muster start <spec dir>`. For a spec on another machine, run `hc exec --on <machine> muster start <spec dir>`. Your pane can't join a space on another machine.

The spec's Status ends as `Implemented (muster signed off; see VERDICT.md)`, `In progress (muster escalated; see VERDICT.md)`, or `Muster failed: <reason>`.

## Watching a PR

When the user asks you to watch a pull request, get it green, fix its CI, or address its review comments, use Muster:

1. Run `muster pr <PR url | owner/repo#N | N>` from your own shell. Use a bare number only from inside the repo's checkout.
   - It needs a local clone (your current folder, or `~/code/<repo>`) and a PR from a branch in the same repo, not a fork.
   - It uses wherever the PR's branch is already checked out, or else makes a worktree under `~/code/.muster-worktrees/`.
   - Your pane joins a new space for the PR, with Tinker and Nitpick.
2. Tell the user it's watching, then end your turn. Don't fix the PR yourself, don't touch its checkout while it runs, and never start the role agents yourself.
3. How it runs:
   - Herder polls the PR every 90 s. Once the current head's checks finish, it hands Tinker one round: the failed checks plus the new or edited comments and reviews.
   - Tinker triages each item and fixes the real defects, each with a mutation proof.
   - Nitpick checks every fix, including for inverse defects, before Tinker pushes and replies on the PR.
   - It never merges, force-pushes or resolves threads.
   - Comments from the `gh` account the agents use are ignored, so their own replies don't start rounds. To steer them, talk to Tinker in its pane.
4. Herder messages you, tagged `<hc from="… -herder">`:
   - `Muster: … needs you`: something needs a person (a product decision, a question for the PR author). Tell the user.
   - `Muster: … CONVERGED`: checks are green and there's no new feedback. The role panes have closed. Read `<notes dir>/PR.md` and the latest `round-N-fix.md`, and summarize for the user: what was fixed, what was pushed back, and the replies posted.
   - `Muster: … MERGED` / `CLOSED` / `STOPPED` (after 10 rounds) / `ESCALATED` / `FAILED`: report it. For ESCALATED, help the user steer Tinker, then run `muster resume <notes dir>`.

Notes live in `<spec root>/prs/<repo>-pr<N>/`:
- `PR.md`: the PR, its branch and checkout, and a log of the rounds;
- `round-N.md`: the feedback for that round;
- `round-N-fix.md`: Tinker's triage and the replies it posted;
- `round-N-check.md`: Nitpick's verdict.

## Roles and messages

| Role | Writes (in the spec dir) | Sends (`hc send`) |
|---|---|---|
| Herder (hidden `muster run` script) | `muster.log`, the spec's Status | starts each peer when the previous gate passes; reports the outcome to the origin agent |
| Plotter | `PLAN.md`: reviews your draft against the code and finalizes it (`## Review` lists its changes), or writes it when there's no draft | Herder `PLAN_FINAL`; answers `ANSWER:` |
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
