# 原生接入与测试包 · 0.2.0

本次日期：2026-10-25。沿用 A 白底版界面，通过 Capacitor 8.5.3 复用 React UI。应用标识暂用 `com.enzolabs.lifecatalog`。

## 安装 Android 测试包

文件：`artifacts/life-catalog-0.2.0-debug.apk`。这是 debug 签名的可安装测试版，不是上架包。支持 Android 7.0 / API 24 及以上 ARM 手机，包含 arm64-v8a、armeabi-v7a。无需 Google Play 服务、开发者付费账号或额外下载抠图模型。

将 APK 传到手机，允许所用文件管理器安装此来源应用后安装。应用自带演示图鉴，想从零体验可在「我的」先导出备份，再选择体验空态。

真实流程：拍摄 → 从相册导入／系统相机 → 自动抠图 → 原图／抠图对比 → 确认主体 → 选系列 → 保存。已有照片也可在详情点「抠图」开始本机处理。拍摄与相册通过系统界面取得照片；相机授权拒绝时仍可改用相册。

## 两端引擎

| 平台 | 接入 | 状态 |
| --- | --- | --- |
| Android | 原生 Java 插件、ONNX Runtime 1.24.3、随包 U²-NetP 模型 | APK 构建、安装及 Android 15 ARM64 模拟器原生测试通过 |
| iOS | 原生 Swift 插件、Apple Vision `VNGenerateForegroundInstanceMaskRequest` | 插件、桥接控制器、AppDelegate、SceneDelegate 经 iOS SDK 类型校验通过；尚未签名、真机验证 |
| 浏览器 | 不调用原生服务 | 保留导入原图路径，并提示安装 App 使用离线抠图 |

两个引擎均在设备端处理，不上传照片。Android 分析模型输入为 320×320，结果遮罩放大后应用于原始画面；超大照片的抠图输出可能降采样至最长边不超过 2560px。iOS 使用 Apple Vision 的主体遮罩。原始照片始终另外保留。

抠图不等于自动去手、补全遮挡或包装 OCR 保真检查。当前只实现基础主体分离；点选多个主体、画笔、一键去手和风格化生成仍未接入。测试样本可见轻微白边，透明／反光／毛绒等需要继续实物验证。

## iPhone 安装

1. 安装 Xcode 所需的 iOS 平台组件，运行 `npm run native:sync`。
2. 打开 `ios/App/App.xcodeproj`，在 Signing & Capabilities 选择自己的 Personal Team。
3. 连接 iOS 17+ iPhone，完成设备配对并按系统提示启用开发者模式，选择该手机运行。
4. 普通 Apple 账号可以免费在自己的设备测试；Personal Team 的签名通常需每 7 天重新部署。TestFlight、App Store 分发需要付费开发者会员。

当前电脑没有可用 iOS 模拟器运行环境；`xcodebuild` 全量构建因“iOS 26.2 is not installed”无法选择目标，因此没有生成可直接安装的 IPA。这里不把 Swift 类型校验描述为完整 App 编译或真机测试。用户登录、签名、手机配对需本人完成。

## 存储与分享

原图、透明 PNG、元数据存于 IndexedDB，可从之前的 localStorage 自动迁移，避免原图加抠图触发 5MB 上限。保存失败会提示且不清空当前草稿。卸载应用或清除应用数据仍会丢失记录；JSON 目前只支持导出。

原生分享使用应用缓存文件与系统分享面板；浏览器仍直接下载。iCloud、云生成、订阅没有接入。Android 禁用应用自动云备份，避免与“仅在设备保存”的说明冲突。

## 复现构建

需要 Node 22+、JDK 21、Android SDK platform 36 / Build Tools 36。这台电脑已将工具安装到：

- JDK：`~/Library/Caches/life-catalog-build/java/`
- Android SDK：`~/Library/Android/sdk/`

```sh
npm ci
npm test
npm run android:apk
```

脚本优先使用 `JAVA_HOME`、`ANDROID_HOME`，否则查找当前电脑已配置的工具。APK 和 SHA-256 写到 artifacts/。源码不包含发布私钥，开发签名由 Gradle 在本机生成。

```sh
npm run native:sync
npm run ios:open
```

iOS 官方 SwiftPM 二进制在当前网络下下载卡住，因此 `prepare-ios-runtime.mjs` 会获取并校验官方 Capacitor 8.5.3 的固定版本二进制，再使用本地 SwiftPM 包。这些生成的 xcframework 不纳入 Git。根依赖对相同身份的本地覆盖在当前 SwiftPM 下存在提示，后续升级 Xcode 时应重新验证或切回正常的远程解析。

## 模型与来源

- [Apple 主体分离说明](https://developer.apple.com/videos/play/wwdc2023/10176/)
- [Capacitor 原生插件](https://capacitorjs.com/docs/plugins)
- [U²-Net](https://github.com/xuebinqin/U-2-Net)，Apache-2.0。
- [rembg U2NetP 会话与模型来源](https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2netp.py)，MIT。
- [ONNX Runtime](https://onnxruntime.ai/docs/install/)，MIT。

模型文件 SHA-256：`309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`。构建脚本校验此值。对应授权文件保存在 licenses/ 并随 APK 打包。

[原生验证记录](qa/README.md)
