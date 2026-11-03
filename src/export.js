import { isNative, saveNativeFile } from "./native.js";
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
async function paintItem(ctx, item, x, y, size) {
  const source = item.cutout || item.photo;
  const img = await loadImage(source || "/assets/objects.png");
  if (source) {
    const ratio = Math.min(size / img.width, size / img.height);
    ctx.drawImage(
      img,
      x + (size - img.width * ratio) / 2,
      y + (size - img.height * ratio) / 2,
      img.width * ratio,
      img.height * ratio,
    );
  } else {
    const sw = img.width / 3,
      sh = img.height / 2;
    ctx.drawImage(
      img,
      (item.asset % 3) * sw,
      Math.floor(item.asset / 3) * sh,
      sw,
      sh,
      x,
      y,
      size,
      size,
    );
  }
}
function wrap(ctx, text, x, y, width, lineHeight, maxLines = 4) {
  let line = "",
    lines = 0;
  for (const c of text) {
    if (c === "\n" || ctx.measureText(line + c).width > width) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = "";
      if (++lines >= maxLines) return y;
    }
    if (c !== "\n") line += c;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}
export async function createShareBlob({
  item,
  collection,
  items,
  story = true,
  date = true,
}) {
  const canvas = document.createElement("canvas");
  const list = item ? [item] : items;
  canvas.width = 1000;
  canvas.height = item
    ? 1400
    : Math.max(1000, 280 + Math.ceil(list.length / 2) * 520 + 100);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#20221f";
  ctx.textAlign = "center";
  ctx.font = '42px "Songti SC",serif';
  ctx.fillText(collection.name, 500, 105);
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#72756f";
  ctx.fillText(
    item
      ? "一件物品，一段留在身边的故事。"
      : `已收录 ${list.length} 件 · 每一件，都有它的故事`,
    500,
    155,
  );
  if (item) {
    await paintItem(ctx, item, 180, 200, 640);
    ctx.fillStyle = "#20221f";
    ctx.font = 'bold 36px "Songti SC",serif';
    const titleBottom = wrap(
      ctx,
      item.name || "未命名物品",
      500,
      900,
      800,
      48,
      2,
    );
    ctx.textAlign = "left";
    ctx.font = "26px sans-serif";
    ctx.fillStyle = "#555a54";
    if (story)
      wrap(ctx, item.story, 100, Math.max(980, titleBottom + 30), 800, 42, 4);
    if (date) {
      ctx.font = "22px sans-serif";
      ctx.fillStyle = "#777";
      ctx.fillText(item.date.replaceAll("-", "."), 100, 1260);
    }
  } else {
    for (let i = 0; i < list.length; i++) {
      const x = 80 + (i % 2) * 460,
        y = 210 + Math.floor(i / 2) * 520;
      await paintItem(ctx, list[i], x, y, 380);
      ctx.fillStyle = "#20221f";
      ctx.font = "27px sans-serif";
      ctx.textAlign = "center";
      wrap(ctx, list[i].name || "未命名物品", x + 190, y + 420, 380, 36, 2);
    }
  }
  ctx.textAlign = "center";
  ctx.font = '22px "Songti SC",serif';
  ctx.fillStyle = "#6a7068";
  ctx.fillText("人生图鉴 · 把日常好好收起来", 500, canvas.height - 48);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
export async function download(blob, name) {
  if (isNative) return saveNativeFile(blob, name);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
