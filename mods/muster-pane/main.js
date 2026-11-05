// A pane's header, for layouts that frame their panes:
//   { "tab": "active", "pane": { "header": { "content": { "mod": "muster-pane" } } } }
// Shows the program's icon (the app's program table), the agent's name or
// the terminal's title, the folder, and the agent's status; buttons split, zoom and close
// this pane. Props from the app: { pane, terminal }. Click: focus the pane.
// Clone of the shipped `pane` mod: terminals labeled muster.role=<role> (Muster
// agents) lead with their role, e.g. "Plotter · omp"; every other pane is unchanged.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, theme, home, terminals } from "herdr";

const ROLES = { herder: "Herder", plotter: "Plotter", tinker: "Tinker", nitpick: "Nitpick", scribe: "Scribe" };
// Each role's color, from the theme's ANSI palette so it follows any theme. "you": the agent that started the herd.
const ROLE_COLOR = { you: "ansi6", plotter: "ansi5", tinker: "ansi3", nitpick: "ansi2", herder: "ansi4", scribe: "ansi4" };

function terminalOf(address) {
  if (!address) return null;
  const local = address.includes("/") ? address.slice(address.indexOf("/") + 1) : address;
  const machine = address.includes("/") ? address.slice(0, address.indexOf("/")) : null;
  return terminals().find((x) => x.address === address
    || (x.address === local && (x.machine ?? null) === machine)) ?? null;
}

// The spec link: Herder labels each herd terminal (and the origin agent) with the spec file and the
// editor command (a JSON argv) resolved on that terminal's machine.
function specOf(term) {
  const file = term?.labels?.["muster.specfile"];
  if (!file) return null;
  let editor;
  try { editor = JSON.parse(term.labels["muster.editor"] ?? "[]"); } catch { editor = []; }
  const parts = file.split("/");
  return { file, label: parts.slice(-2).join("/"), argv: [...(editor.length ? editor : ["vi"]), file] };
}

function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class Pane extends View {
  init() { this.hovered = false; }

  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  button(t, id, icon, command, args) {
    return div()
      .id(id)
      .p(3)
      .rounded(4)
      .text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/muster-pane/${icon}.svg`).size(14));
  }

  render(cx) {
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const program = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const term = terminalOf(p.terminal);
    const key = term?.labels?.["muster.role"] || (term?.labels?.["muster.spec"] ? "you" : null);
    const role = key === "you" ? "You" : ROLES[key] ?? null;
    const color = key ? t[ROLE_COLOR[key]] ?? t.accent : null;
    const name = program; // the role, if any, gets its own colored label before it
    const spec = specOf(term);
    const pic = icon(p.program, 14, t.dim);
    const st = p.status;
    const pane = p.pane;
    return h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .pl(0)
      .pr(10)
      .gap(8)
      .items_center()
      .bg(t.background)
      .when(Boolean(color), (el) => el.bg(color + "33")) // a wash of the role's color across the header
      .border_b(color ? 2 : 1)
      .border_color(color ?? t.border)
      .text_size(12)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .child(color ? div().w(4).h_full().flex_none().bg(color) : div().w(2).flex_none())
      .when(Boolean(pic), (el) => el.child(pic))
      .when(Boolean(role), (el) => el.child(div().flex_none().px(7).h(19).flex().items_center().rounded(5).bg(color)
        .text_size(11.5).font_bold().text_color(t.background).child(role)))
      .child(div().flex_none().truncate().max_w(260).font_medium().text_color(role ? t.muted : t.foreground).child(name))
      .child(div().flex_1().truncate().text_color(t.dim).child(folder(p.cwd)))
      .when(Boolean(spec), el => el.child(h_flex()
        .id(`ph-spec-${pane}`)
        .flex_none()
        .gap(4)
        .px(6)
        .h(20)
        .items_center()
        .rounded(4)
        .text_color(t.accent)
        .hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => {
          cx.stop_propagation();
          run("pane.split", { direction: "right", pane, argv: spec.argv });
        })
        .child(svg("mods/files/file.svg").size(12).flex_none())
        .child(div().max_w(220).truncate().underline().child(spec.label))))
      .when(st === "working", el => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
      .when(st === "blocked", el => el.child(div().flex_none().px(6).h(18).flex().items_center().rounded(5).bg(t.blocked + "26").text_size(10.5).font_semibold().text_color(t.blocked).child("Needs you")))
      .when(st === "done", el => el.child(div().size(7).flex_none().rounded(4).bg(t.done)))
      .when(this.hovered, el => el
        .child(this.button(t, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(t, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        .child(this.button(t, `ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
        .child(this.button(t, `ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}
