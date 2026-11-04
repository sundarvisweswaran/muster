// Names a Sheepdog agent's omp session "<Role> · <spec>" so its Herdr pane title shows the role.
// Role comes from SHEEPDOG_ROLE (set by the template command); spec from the first message's "Spec dir: <path>".
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

function inputText(event: unknown): string {
	if (event && typeof event === "object" && "text" in event && typeof event.text === "string") return event.text;
	return "";
}

export default function (pi: ExtensionAPI) {
	const role = process.env.SHEEPDOG_ROLE;
	if (!role) return;
	pi.on("input", async event => {
		if (pi.getSessionName()) return;
		const dir = /Spec dir:\s*(\S+?)\.?(?:\s|$)/.exec(inputText(event))?.[1];
		const spec = dir?.replace(/\/+$/, "").split("/").pop();
		await pi.setSessionName(spec ? `${role} · ${spec}` : role);
	});
}
