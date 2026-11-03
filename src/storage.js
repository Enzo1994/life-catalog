import { STORAGE_KEY, seedData } from "./model.mjs";
const database = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("life-catalog", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("catalog");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
export async function persistCatalog(data) {
  const db = await database();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("catalog", "readwrite");
      tx.objectStore("catalog").put(data, "current");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("保存已中止"));
    });
  } finally {
    db.close();
  }
}
export async function loadCatalog() {
  try {
    const db = await database();
    const stored = await new Promise((resolve, reject) => {
      const req = db
        .transaction("catalog")
        .objectStore("catalog")
        .get("current");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (
      stored?.version === 1 &&
      Array.isArray(stored.items) &&
      Array.isArray(stored.collections)
    )
      return stored;
    const previous = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      previous?.version === 1 &&
      Array.isArray(previous.items) &&
      Array.isArray(previous.collections)
    ) {
      await persistCatalog(previous);
      localStorage.removeItem(STORAGE_KEY);
      return previous;
    }
  } catch (error) {
    console.warn("读取本地图鉴失败", error);
    throw new Error("本地图鉴读取失败，请重新打开；原有数据未被覆盖");
  }
  return seedData();
}
