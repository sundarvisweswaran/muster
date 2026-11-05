// Muster's board: every herd, PR watch and queued spec on every machine, in columns by stage, plus what
// finished recently. Opened from the Muster sidebar panel's "Board" button. Reads `muster ls --json` every 5 s.
import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { exec, machines, run, theme, props, closeOverlay } from "herdr";

const COLUMNS = ["Queued", "Planning", "Building", "Verifying", "PR", "Done"];

function age(min) {
  if (min >= 1440) return `${Math.floor(min / 1440)}d`;
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}m` : `${min}m`;
}

function column(h) {
  if (h.pr) return "PR";
  if (h.stage === "Starting") return "Planning";
  if (h.stage === "Escalated") return "Verifying";
  return h.stage;
}

export default class Board extends View {
  init(_props, cx) {
    this.data = {};
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

  card(t, c) {
    const alert = c.needs?.length || c.alert;
    return v_flex()
      .id(`mb-${c.key}`)
      .flex_none()
      .gap(4)
      .p(10)
      .rounded(8)
      .bg(t.raised ?? t.background)
      .border(1)
      .border_color(alert ? t.blocked : t.border)
      .when(Boolean(c.space), (el) => el.cursor_pointer().hover((s) => s.border_color(t.accent))
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => run("space.select", { id: c.space })))
      .child(h_flex().gap(6).items_center()
        .child(div().flex_1().min_w(0).truncate().font_medium().text_color(t.foreground).child(c.name))
        .when(Boolean(c.machine), (el) => el.child(div().flex_none().px(5).rounded(4).bg(t.hover).text_size(10.5).text_color(t.dim).child(c.machine))))
      .child(h_flex().gap(6).items_center().text_size(11.5).text_color(t.dim)
        .when(Boolean(c.working), (el) => el.child(svg("mods/workspace-chrome/spinner.svg").size(11).flex_none().text_color(t.working).spin(900)))
        .child(div().flex_1().min_w(0).truncate().child(c.detail))
        .when(Boolean(c.age), (el) => el.child(div().flex_none().child(c.age))))
      .when(Boolean(c.needs?.length), (el) => el.child(div().self_start().px(6).h(18).rounded(5).bg(t.blocked + "26").text_size(10.5)
        .font_semibold().text_color(t.blocked).flex().items_center().child(`Needs you: ${c.needs.join(", ")}`)));
  }

  render(cx) {
    const t = theme();
    const cols = Object.fromEntries(COLUMNS.map((c) => [c, []]));
    let running = 0;
    let queued = 0;
    for (const [machine, d] of Object.entries(this.data)) {
      const space = (s) => (machine ? `${machine}/` : "") + s;
      running += d.running;
      queued += d.queue.length;
      for (const h of d.herds) {
        cols[column(h)].push({ key: space(h.space), name: h.name, machine, space: space(h.space), needs: h.needs_you,
          alert: h.stage === "Escalated", working: !h.needs_you.length, detail: h.stage, age: age(h.age_min) });
      }
      for (const q of d.queue) {
        cols.Queued.push({ key: `q-${machine}-${q.name}`, name: q.name, machine, detail: `#${q.position} in line` });
      }
      for (const r of d.recent ?? []) {
        const col = r.status.startsWith("In review") ? "PR" : "Done";
        cols[col].push({ key: `r-${machine}-${r.name}`, name: r.name, machine, alert: r.status.startsWith("Muster failed"),
          detail: r.status, age: `${age(r.age_min)} ago` });
      }
    }
    const overlay = props()?.overlay;
    return v_flex()
      .size_full()
      .bg(t.background)
      .rounded(10)
      .border(1)
      .border_color(t.border)
      .text_size(13)
      .child(
        h_flex()
          .h(40)
          .px(16)
          .flex_none()
          .items_center()
          .gap(10)
          .border_b(1)
          .border_color(t.border)
          .child(div().font_semibold().text_color(t.foreground).child("Muster board"))
          .child(div().text_size(11.5).text_color(t.dim).child(`${running} running · ${queued} queued`))
          .child(div().flex_1())
          .child(div()
            .id("mb-close")
            .px(6)
            .rounded(4)
            .text_color(t.dim)
            .hover((s) => s.bg(t.hover).text_color(t.foreground))
            .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
            .on_click(() => overlay && closeOverlay(overlay))
            .child("✕")),
      )
      .child(
        h_flex()
          .flex_1()
          .min_h(0)
          .items_stretch() // h_flex centers children; columns own a header and a scrolling list
          .gap(10)
          .p(12)
          .children(COLUMNS.map((name) =>
            v_flex()
              .id(`mb-col-${name}`)
              .flex_1()
              .min_w(150)
              .h_full()
              .min_h(0)
              .gap(8)
              .p(8)
              .rounded(10)
              .bg(t.chrome)
              .child(h_flex().px(4).pb(2).gap(6).items_center()
                .child(div().text_size(11.5).font_medium().text_color(t.dim).child(name))
                .child(div().text_size(11).text_color(t.dim).child(String(cols[name].length))))
              .child(v_flex().id(`mb-list-${name}`).flex_1().min_h(0).gap(8).overflow_y_scrollbar()
                .children(cols[name].map((c) => this.card(t, c))))
          )),
      );
  }
}
