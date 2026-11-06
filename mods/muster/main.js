// Muster's sidebar panel: running herds and PR watches (stage, needs you), and the queue, on every machine.
// Reads `muster ls --json` on each connected machine every 5 s. Click a herd to open its space.
import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { exec, machines, run, theme, openOverlay, props, layout } from "herdr";

// Fold: the layout passes this section's block id as props().fold. Folding shrinks the block to its header
// (layout.resize px); unfolding restores the weight it had, kept in localStorage.
function foldNode(n, id) {
  if (!n) return null;
  if (n.id === id) return n;
  for (const c of n.children ?? []) { const f = foldNode(c, id); if (f) return f; }
  return null;
}
function isFolded(id, px) {
  const s = id && foldNode(layout(), id)?.size;
  return Boolean(s?.px && s.px <= px + 1);
}
function toggleFold(id, px) {
  const s = foldNode(layout(), id)?.size ?? {};
  if (s.px && s.px <= px + 1) run("layout.resize", { id, weight: Number(localStorage.getItem("fold.weight")) || 1 });
  else {
    localStorage.setItem("fold.weight", String(s.weight ?? 1));
    run("layout.resize", { id, px });
  }
}
function foldChevron(t, id, px) {
  return div().id("fold").size(16).flex_none().flex().items_center().justify_center().rounded(4).text_color(t.dim)
    .hover((s) => s.bg(t.hover).text_color(t.foreground))
    .tooltip(isFolded(id, px) ? "Expand" : "Collapse")
    .on_click((_e, cx) => { cx.stop_propagation(); toggleFold(id, px); })
    .child(svg(`mods/workspace-chrome/chevron-${isFolded(id, px) ? "right" : "down"}.svg`).size(12));
}
const FOLD_PX = 42; // the header (41) and its top border

const WORKING = new Set(["Starting", "Planning", "Building", "Verifying"]);

function age(min) {
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}m` : `${min}m`;
}

export default class Muster extends View {
  init(_props, cx) {
    this.data = {}; // machine name ("" = this computer) -> `muster ls --json`
    this.busy = false;
    cx.timer.after(30, (cx) => this.refresh(cx));
    cx.timer.every(5000, (cx) => this.refresh(cx));
  }

  refresh(cx) {
    if (this.busy) return;
    this.busy = true;
    cx.spawn(async (cx) => {
      const next = {};
      for (const m of machines()) {
        if (m.name !== null && m.layout === "unavailable") continue;
        try {
          const r = await exec("muster", ["ls", "--json"], { on: m.name });
          if (r.code === 0) next[m.name ?? ""] = JSON.parse(r.stdout);
        } catch {
          // Muster isn't installed there, or the machine dropped: leave it out.
        }
      }
      this.data = next;
      this.busy = false;
      cx.notify();
    });
  }

  marker(t, h) {
    if (h.needs_you.length) {
      return div().flex_none().px(6).h(18).rounded(5).bg(t.blocked + "26").text_size(10.5).font_semibold()
        .text_color(t.blocked).flex().items_center().child("Needs you");
    }
    if (WORKING.has(h.stage) || h.pr) {
      return svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900);
    }
    return div().size(7).mx(2).flex_none().rounded(4).bg(t.blocked);
  }

  herdRow(t, machine, h, multi) {
    const id = (machine ? `${machine}/` : "") + h.space;
    return h_flex()
      .id(`mu-${id}`)
      .h(26)
      .px(8)
      .gap(8)
      .flex_none()
      .items_center()
      .rounded(8)
      .text_size(12.5)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click(() => run("space.select", { id }))
      .tooltip(`${h.name}: ${h.stage}${h.needs_you.length ? ` · ${h.needs_you.join(", ")} needs you` : ""} · ${age(h.age_min)}`)
      .child(this.marker(t, h))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(h.name))
      .when(multi && Boolean(machine), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(machine)))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(h.stage));
  }

  scribeRow(t, machine, s, multi) {
    const id = (machine ? `${machine}/` : "") + s.space;
    const working = s.status === "working";
    return h_flex()
      .id(`mu-scribe-${id}`)
      .h(26)
      .px(8)
      .gap(8)
      .flex_none()
      .items_center()
      .rounded(8)
      .text_size(12.5)
      .cursor_pointer()
      .hover((st) => st.bg(t.hover))
      .on_click(() => run("space.select", { id }))
      .tooltip(working ? "Scribe is checking Linear and drafting specs" : "Scribe finished its last check; the next one starts on schedule")
      .child(working
        ? svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)
        : div().size(7).mx(2).flex_none().rounded(4).border(1.5).border_color(t.dim))
      .child(div().flex_1().min_w(0).truncate().text_color(working ? t.foreground : t.muted).child("Scribe"))
      .when(multi && Boolean(machine), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(machine)))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(working ? "Drafting" : "Idle"));
  }

  inboxRow(t, machine, i, multi) {
    return h_flex()
      .id(`mu-i-${machine}-${i.name}`)
      .h(26)
      .px(8)
      .gap(8)
      .flex_none()
      .items_center()
      .text_size(12.5)
      .tooltip(`${i.ticket ?? i.name}: drafted by Scribe. Review ${i.spec}/spec.md, then set its Status to Herd (or /herd) to build it.`)
      .child(div().size(7).mx(2).flex_none().rounded(4).bg(t.accent))
      .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(i.name))
      .when(multi && Boolean(machine), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(machine)))
      .child(div().flex_none().text_size(11).text_color(t.dim).child("To review"));
  }

  queueRow(t, machine, q, multi) {
    return h_flex()
      .id(`mu-q-${machine}-${q.name}`)
      .h(26)
      .px(8)
      .gap(8)
      .flex_none()
      .items_center()
      .text_size(12.5)
      .tooltip(`${q.name}: queued #${q.position}; starts when a slot frees`)
      .child(div().size(7).mx(2).flex_none().rounded(4).border(1.5).border_color(t.dim))
      .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(q.name))
      .when(multi && Boolean(machine), (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child(machine)))
      .child(div().flex_none().text_size(11).text_color(t.dim).child(`Queued #${q.position}`));
  }

  render(cx) {
    const t = theme();
    const entries = Object.entries(this.data);
    const multi = entries.length > 1;
    let running = 0;
    const caps = []; // "this computer 2/2", "yolo 0/2": max_herds is per machine
    let queued = 0;
    let drafts = 0; // Scribe's specs waiting for you to mark Herd
    const rows = [];
    for (const [machine, d] of entries) {
      running += d.running;
      caps.push(`${machine || "this computer"} ${d.running}/${d.max_herds}`);
      queued += d.queue.length;
      drafts += (d.inbox ?? []).length;
      for (const h of d.herds) rows.push(this.herdRow(t, machine, h, multi));
      for (const q of d.queue) rows.push(this.queueRow(t, machine, q, multi));
      for (const s of d.scribe ?? []) rows.push(this.scribeRow(t, machine, s, multi));
      for (const i of d.inbox ?? []) rows.push(this.inboxRow(t, machine, i, multi));
    }
    const fold = props()?.fold;
    const folded = isFolded(fold, FOLD_PX);
    return v_flex()
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .text_size(13)
      .child(
        h_flex()
          .px(16)
          .h(41)
          .pt(14)
          .pb(5)
          .flex_none()
          .items_center()
          .justify_between()
          .child(h_flex().gap(8).items_center()
            .child(h_flex().gap(4).items_center().ml(-4)
              .when(Boolean(fold), (el) => el.child(foldChevron(t, fold, FOLD_PX)))
              .child(div().text_size(11.5).font_medium().text_color(t.dim).child("Muster")))
            .child(div()
              .id("mu-board")
              .px(5)
              .rounded(4)
              .text_size(11)
              .text_color(t.dim)
              .hover((s) => s.bg(t.hover).text_color(t.foreground))
              .tooltip("Open the Muster board: every herd by stage, the queue, and what finished recently")
              .on_click(() => openOverlay({ mod: "muster-board", kind: "window", key: "muster-board", width: 1180, height: 620 }))
              .child("Board ↗")))
          .child(div().id("mu-count").text_size(11).text_color(t.dim)
            .tooltip(`Herds running / max_herds, per machine: ${caps.join(", ")}`)
            .child(entries.length ? [running && `${running} running`, queued && `${queued} queued`].filter(Boolean).join(" · ") : "")),
      )
      .when(rows.length === 0 && !folded, (el) =>
        el.child(div().px(16).text_size(12).text_color(t.dim).child(entries.length
          ? "No herds. Type /herd in omp, or set a spec's Status to Herd."
          : "Looking for Muster…")))
      .when(!folded, (el) => el.child(v_flex().id("mu-list").flex_1().min_h(0).px(8).overflow_y_scrollbar().children(rows)));
  }
}
