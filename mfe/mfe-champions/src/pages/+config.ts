import vikeReact from "vike-react/config";
import type { Config } from "vike/types";

export default {
	extends: [vikeReact],
	passToClient: ["data"],
	stream: "web",
} satisfies Config;
