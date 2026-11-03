import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const model = readFileSync(
  new URL("../android/app/src/main/assets/models/u2netp.onnx", import.meta.url),
);
const hash = createHash("sha256").update(model).digest("hex");
if (hash !== "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8")
  throw Error("U2NetP 模型校验失败，请勿继续构建");
console.log("U2NetP SHA-256 verified.");
