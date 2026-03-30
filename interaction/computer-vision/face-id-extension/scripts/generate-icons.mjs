import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const svgPath = path.join(root, "public", "svg", "icon.svg");

for (const size of [16, 48, 128]) {
	await sharp(svgPath)
		.resize(size, size)
		.png()
		.toFile(path.join(root, "public", `icon-${size}.png`));
	console.log(`Generated icon-${size}.png`);
}
