export const STORAGE_KEY = "life-catalog.prototype.v1";
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function seedData(now = new Date()) {
  const year = now.getFullYear() - 1;
  const date = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.min(now.getDate(), new Date(year, now.getMonth() + 1, 0).getDate())).padStart(2, "0")}`;
  const names = [
    "京都带回的小杯子",
    "大阪的地铁票",
    "旅途中的胶片相机",
    "海边捡到的贝壳",
    "富士山的钥匙扣",
    "清水寺的明信片",
  ];
  return {
    collections: [
      {
        id: "travel",
        name: "旅行带回来的",
        description: "把走过的地方，装进一本小小的图鉴。",
        color: "mint",
        mode: "free",
        container: "paper",
      },
      {
        id: "daily",
        name: "每天的小确幸",
        description: "普通日子里，那些让我嘴角上扬的东西。",
        color: "butter",
        mode: "free",
        container: "paper",
      },
      {
        id: "old",
        name: "旧物有回声",
        description: "有些东西旧了，故事却一直都在。",
        color: "linen",
        mode: "free",
        container: "paper",
      },
      {
        id: "casual",
        name: "随手收藏",
        description: "先收起来，故事以后慢慢写。",
        color: "sage",
        mode: "free",
        container: "paper",
      },
    ],
    items: names.map((name, i) => ({
      id: `sample-${i}`,
      name,
      asset: i,
      collectionId: i < 4 ? "travel" : i === 4 ? "daily" : "old",
      date: i === 0 ? date : `${year}-10-${String(22 - i).padStart(2, "0")}`,
      story:
        i === 0
          ? "那天下着小雨，我们在巷子里的小店躲了一整个下午。\n\n后来每次用它喝茶，都会想起那个慢悠悠的雨天。"
          : i === 3
            ? "那天在海边散步，捡起这枚贝壳的时候，夕阳刚好落在手心里。"
            : "把那一刻的心情，也一起收好了。",
      source: i === 0 ? "别人送的" : i === 3 ? "捡到的" : "自己买的",
      tags: i === 0 ? ["旅行", "纪念"] : i === 3 ? ["自然", "旅行"] : ["日常"],
      rating: 0,
    })),
    version: 1,
  };
}
export const collectionItems = (data, id) =>
  data.items.filter((item) => item.collectionId === id);
export function canAdd(data, id) {
  const c = data.collections.find((c) => c.id === id);
  return (
    !!c && (c.mode !== "complete" || collectionItems(data, id).length < c.total)
  );
}
export function validateCollection(name, mode, total, count = 0) {
  if (!name.trim()) return "给这本图鉴取个名字吧";
  if (
    mode === "complete" &&
    (!Number.isInteger(Number(total)) ||
      Number(total) < Math.max(1, count) ||
      Number(total) > 200)
  )
    return "总数需为 1–200 的整数，且不能少于已收录数量";
  return "";
}
export function findMemories(items, now = new Date()) {
  return items.filter(
    (i) =>
      /^\d{4}-\d{2}-\d{2}$/.test(i.date) &&
      Number(i.date.slice(0, 4)) === now.getFullYear() - 1 &&
      i.date.slice(5) === localDate(now).slice(5),
  );
}
export function searchItems(data, query, tag = "全部") {
  const q = query.trim().toLowerCase();
  return data.items.filter(
    (i) =>
      (tag === "全部" || i.tags.includes(tag)) &&
      [
        i.name,
        i.story,
        i.source,
        ...i.tags,
        data.collections.find((c) => c.id === i.collectionId)?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
}
export function addItem(data, item) {
  if (!canAdd(data, item.collectionId))
    throw new Error("这本图鉴已集齐，请选择其他系列");
  return { ...data, items: [item, ...data.items] };
}
