# 人生图鉴 · 白底版 · iOS / Android 测试版

基于已选定的 A「纸间收藏」白底设计，React + Vite + Capacitor。浏览器提供交互预览，Android 已提供可安装测试 APK 和离线抠图，iOS 已接入 Apple Vision 原生桥接源码。

- Android APK：`artifacts/life-catalog-0.2.0-debug.apk`，Android 7+ ARM 手机。
- 安装、iPhone 免费签名测试和原生构建：[原生说明](native/README.md)。
- 一键构建 Android：`npm run android:apk`。

## 本地运行

```sh
npm install
npm run dev
```

打开 http://localhost:5173 。同一局域网可通过终端显示的 Network 地址用手机体验；相机是否可用取决于浏览器和安全上下文，相册导入始终可选。

```sh
npm test
npm run build
```

## 可以体验

- 图鉴架、彩色实体册封面、回顾入口、全局时间线。
- 自由系列与集齐系列，新建、封面配色、集齐上限与空位。
- 系列网格／时间线切换，三套本地容器风格。
- 物品故事、编辑、日期、标签跨系列检索。
- 照片导入／系统相机文件选择 → 照片确认 → 选系列 → 选填信息 → 保存。
- 浏览器导入的原始文件在本机保存，单张限 3 MB，不缩放或压缩；原生端通过系统相机／相册取图。存储空间不足时提示，当前草稿仍保留在页面上供重试。
- 单件 PNG 卡片和系列 PNG 海报导出，单件可隐藏故事、日期。
- 本地持久化、JSON 备份导出、全新空态和演示数据恢复。

## 原型边界

当前为原生壳加 WebView 界面的混合应用，并非全 SwiftUI 界面。Android 已接入 U²-NetP + ONNX Runtime 离线抠图，iOS 接入 Apple Vision（iOS 17+）。浏览器不提供原生抠图。手部检测／去手、画笔、AI 生成、OCR、iCloud、账号与订阅尚未接入。发现页为第二期占位。

默认以六件虚构示例物品体验。初次真实使用，可在「我的 → 体验全新图鉴的空态」清除示例，只保留空的「随手收藏」。此操作会覆盖已有本地记录，请先导出备份。

记录存于设备或浏览器的 IndexedDB，并自动迁移旧 localStorage 数据；清除应用或浏览器数据会丢失；JSON 仅支持导出，尚无导入恢复界面。没有自建后端，照片与故事不会被上传。开发素材由内置图像生成工具制作，不代表模型对真实物品的保真结果；素材提示词见 design/assets.md。

## 设计与验证

- [设计研究和视觉目标](design/README.md)
- [页面交互规范](design/interaction-spec.md)
- [实现验证记录](design/qa/README.md)

网页尚未部署。APK 是开发签名测试包；iOS 尚未签名安装，完整 Xcode App 构建因本机缺少可用 iOS 目标环境未通过，Swift 源文件类型校验通过。`dist/` 为本地构建输出，不纳入版本管理。
