import { Capacitor, registerPlugin } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const SubjectCutout = registerPlugin("SubjectCutout");
export const isNative = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform();
if (isNative) document.documentElement.classList.add("native-app");

export async function pickNativePhoto(source) {
  const photo = await Camera.getPhoto({
    source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    resultType: CameraResultType.DataUrl,
    quality: 100,
    allowEditing: false,
    correctOrientation: true,
    saveToGallery: false,
    promptLabelHeader: "留下这件物品",
    promptLabelPhoto: "从相册选择",
    promptLabelPicture: "拍一张照片",
  });
  if (!photo.dataUrl) throw new Error("没有读取到照片，请再试一次");
  return photo.dataUrl;
}
export async function cutoutPhoto(dataUrl) {
  if (!isNative) throw new Error("苹果与安卓离线抠图需要在安装后的 App 中使用");
  const available = await SubjectCutout.availability();
  if (!available.available)
    throw new Error(available.reason || "当前设备暂不支持主体分离");
  const result = await SubjectCutout.segment({ base64: dataUrl.split(",")[1] });
  if (!result.dataUrl?.startsWith("data:image/png;base64,"))
    throw new Error("没有获得有效的透明图片");
  return result;
}
export async function saveNativeFile(blob, name) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const safeName = name.replace(/[\\/:*?"<>|]/g, "-");
  const path = `exports/${Date.now()}-${safeName}`;
  const saved = await Filesystem.writeFile({
    path,
    directory: Directory.Cache,
    data: dataUrl.split(",")[1],
    recursive: true,
  });
  await Share.share({
    title: name,
    files: [saved.uri],
    dialogTitle: "保存或分享图鉴",
  });
}
