import { fileURLToPath } from "node:url";
import sharp from "sharp";

const file = (relativePath) => fileURLToPath(new URL(relativePath, import.meta.url));

await sharp(file("../assets/icon.svg"))
  .resize(1024, 1024)
  .png()
  .toFile(file("../assets/icon.png"));

await sharp(file("../assets/adaptive-icon.svg"))
  .resize(1024, 1024)
  .png()
  .toFile(file("../assets/adaptive-icon.png"));

console.log("Generated assets/icon.png and assets/adaptive-icon.png");
