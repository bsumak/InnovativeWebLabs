import Human, { type Config } from "@vladmandic/human";

const humanConfig: Partial<Config> = {
	modelBasePath: "https://vladmandic.github.io/human-models/models/",
	face: {
		enabled: true,
		detector: { enabled: true, maxDetected: 1, rotation: false },
		mesh: { enabled: true },
		description: { enabled: true }, // generates face embeddings
		emotion: { enabled: false },
		iris: { enabled: false },
		antispoof: { enabled: false },
		liveness: { enabled: false },
	},
	body: { enabled: false },
	hand: { enabled: false },
	object: { enabled: false },
	gesture: { enabled: false },
	segmentation: { enabled: false },
};

const human = new Human(humanConfig);

export default human;
