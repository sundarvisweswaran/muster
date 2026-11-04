// `/herd [spec dir]`: hand the current work to Muster instead of building it here.
// In plan mode, use it in place of approving the plan: it leaves plan mode without running the plan, and
// tells this agent to turn the plan into the spec's draft PLAN.md and run `muster herd`. Plotter reviews the
// draft, Tinker builds it and Nitpick verifies it, and this pane joins them in the spec's own Herdr space.
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

// sessionModes.getState() looks like { plan: { status: "active" | "paused" | "inactive", planFilePath?: "local://PLAN.md" }, ... }
function planOf(state: unknown): { status?: string; file?: string } {
	if (!state || typeof state !== "object" || !("plan" in state)) return {};
	const plan = state.plan;
	if (!plan || typeof plan !== "object") return {};
	const status = "status" in plan && typeof plan.status === "string" ? plan.status : undefined;
	const file = "planFilePath" in plan && typeof plan.planFilePath === "string" && plan.planFilePath ? plan.planFilePath : undefined;
	return { status, file };
}

export default function (pi: ExtensionAPI) {
	if (process.env.MUSTER_ROLE) return; // Muster's own role agents never start herds
	pi.registerCommand("herd", {
		description: "Hand this to Muster (Plotter reviews the plan, Tinker builds, Nitpick verifies) instead of building it here",
		handler: async (args, ctx) => {
			const modes = ctx.sessionModes;
			const plan = planOf(modes?.getState());
			const planFile = plan.file;
			const inPlan = plan.status === "active" || plan.status === "paused";
			if (inPlan && modes) {
				const left = await modes.set({ mode: "plan", action: "exit" });
				if (!left.ok) {
					ctx.ui.notify(left.message ?? "Couldn't leave plan mode; try again once the agent is idle.", "warning");
					return;
				}
			}
			const spec = args.trim();
			const source = planFile
				? `the plan you wrote in plan mode (${planFile}); keep its decisions, and fill in any PLAN.md sections it lacks`
				: "this conversation";
			pi.sendUserMessage(
				[
					"/herd: hand this to Muster instead of building it here. Follow the muster skill (skill://muster).",
					spec
						? `1. The spec is ${spec}.`
						: "1. Find this work's spec folder under the spec root (default ~/code/specs). If there is none, create <spec root>/<short-slug>/spec.md from this conversation, with a Status row (Ready), a Repos row and numbered, testable requirements.",
					`2. Write <spec dir>/PLAN.md as a draft (first line \`Status: DRAFT\`) from ${source}. Use the PLAN.md format in the skill.`,
					"3. Run `muster herd <spec dir>` from your shell, tell me it's running, and end your turn.",
					"Don't implement anything yourself.",
				].join("\n"),
			);
		},
	});
}
