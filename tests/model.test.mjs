import test from "node:test";
import assert from "node:assert/strict";
import {
  seedData,
  collectionItems,
  canAdd,
  validateCollection,
  findMemories,
  searchItems,
  addItem,
  localDate,
} from "../src/model.mjs";
test("recall uses the same exact date one year ago and ignores fuzzy dates", () => {
  const now = new Date(2026, 9, 24);
  const data = seedData(now);
  assert.equal(findMemories(data.items, now).length, 1);
  assert.equal(
    findMemories(
      [{ date: "2025" }, { date: "2025-10" }, { date: "2024-10-24" }],
      now,
    ).length,
    0,
  );
  assert.equal(localDate(now), "2026-10-24");
});
test("free collection has no fixed capacity", () => {
  let data = seedData();
  for (let n = 0; n < 250; n++)
    data = addItem(data, { id: `n${n}`, collectionId: "casual" });
  assert.equal(collectionItems(data, "casual").length, 250);
  assert.equal(canAdd(data, "casual"), true);
});
test("complete collection stops at its total without losing the original data", () => {
  const data = {
    version: 1,
    collections: [{ id: "c", mode: "complete", total: 1 }],
    items: [],
  };
  const filled = addItem(data, { id: "a", collectionId: "c" });
  assert.equal(canAdd(filled, "c"), false);
  assert.throws(() => addItem(filled, { id: "b", collectionId: "c" }), /集齐/);
  assert.equal(data.items.length, 0);
  assert.equal(filled.items.length, 1);
});
test("invalid collection totals and empty titles are rejected", () => {
  for (const total of [0, -1, 1.3, "", 201, "no"])
    assert.ok(validateCollection("盲盒", "complete", total));
  assert.ok(validateCollection("盲盒", "complete", 2, 3));
  assert.ok(validateCollection("  ", "free", 0));
  assert.equal(validateCollection("随手收藏", "free", 0), "");
  assert.equal(validateCollection("六款", "complete", 6), "");
});
test("search works across series, story, source and tag, then intersects the selected tag", () => {
  const data = seedData(new Date(2026, 9, 24));
  assert.equal(searchItems(data, "巷子").length, 1);
  assert.equal(searchItems(data, "旅行带回来的").length, 4);
  assert.equal(searchItems(data, "别人送的", "纪念").length, 1);
  assert.equal(searchItems(data, "别人送的", "自然").length, 0);
});
test("an item can be saved with no optional name or story and persists as one record", () => {
  const data = seedData();
  const next = addItem(data, {
    id: "one",
    collectionId: "casual",
    date: "2026-10-24",
    name: "",
    story: "",
    tags: [],
  });
  const restored = JSON.parse(JSON.stringify(next));
  assert.equal(restored.items.filter((i) => i.id === "one").length, 1);
  assert.equal(collectionItems(restored, "casual").length, 1);
  assert.equal(restored.items[0].name, "");
});
