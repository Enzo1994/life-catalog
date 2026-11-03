import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const destination = resolve(root, "native/capacitor-swift-pm");
const binaries = [
  [
    "Capacitor",
    "9316f568444411d362dcb4d1946e7572d4aef5d690c122ff6f1cb8a44a920c9f",
  ],
  [
    "Cordova",
    "bdcd8eab2d62a077efd76c3c8b9629e65ae7043c1462289a1e55de9be19bbf1f",
  ],
];
mkdirSync(destination, { recursive: true });
for (const [name, checksum] of binaries) {
  if (existsSync(resolve(destination, `${name}.xcframework/Info.plist`)))
    continue;
  const archive = resolve(tmpdir(), `life-catalog-${name}-8.5.3.zip`);
  const fetch = spawnSync(
    "curl",
    [
      "-fsSL",
      "--retry",
      "2",
      "--max-time",
      "120",
      `https://github.com/ionic-team/capacitor-swift-pm/releases/download/8.5.3/${name}.xcframework.zip`,
      "-o",
      archive,
    ],
    { stdio: "inherit" },
  );
  if (fetch.status !== 0) throw Error(`下载 ${name} 失败`);
  if (
    createHash("sha256").update(readFileSync(archive)).digest("hex") !==
    checksum
  )
    throw Error(`${name} SHA256 校验失败`);
  const unzip = spawnSync("unzip", ["-qo", archive, "-d", destination], {
    stdio: "inherit",
  });
  if (unzip.status !== 0) throw Error("解压失败");
}
const manifest = resolve(root, "ios/App/CapApp-SPM/Package.swift");
let source = readFileSync(manifest, "utf8");
source = source.replace(
  '.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.5.3")',
  '.package(path: "../../../native/capacitor-swift-pm")',
);
writeFileSync(manifest, source);
console.log(
  "iOS runtime ready: official Capacitor 8.5.3 binaries, local SwiftPM package.",
);
