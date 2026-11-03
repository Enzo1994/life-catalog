import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import { loadCatalog, persistCatalog } from "../src/storage.js";
import { seedData, STORAGE_KEY } from "../src/model.mjs";
globalThis.indexedDB = indexedDB;
const old = new Map();
globalThis.localStorage = {
  getItem: (key) => old.get(key) ?? null,
  removeItem: (key) => old.delete(key),
};
test("browser prototype records migrate once, preserving original and cutout images beyond localStorage size limits", async () => {
  const previous = seedData(new Date(2026, 9, 24));
  previous.items[0].photo =
    "data:image/png;base64," + "A".repeat(6 * 1024 * 1024);
  previous.items[0].cutout = "data:image/png;base64,transparent";
  old.set(STORAGE_KEY, JSON.stringify(previous));
  const migrated = await loadCatalog();
  assert.deepEqual(migrated, previous);
  assert.equal(old.has(STORAGE_KEY), false);
  migrated.items[0].name = "离线抠图后的杯子";
  await persistCatalog(migrated);
  const restored = await loadCatalog();
  assert.equal(restored.items[0].name, "离线抠图后的杯子");
  assert.equal(restored.items[0].photo, previous.items[0].photo);
  assert.equal(restored.items[0].cutout, previous.items[0].cutout);
});
