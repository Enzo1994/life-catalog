# 原生接入验证 · 2026-10-25

## 已通过

- Web 构建与 7 项 Node 测试：原有 6 项 + IndexedDB 迁移与大图片持久化。
- Android `:app:assembleDebug`、`:app:testDebugUnitTest`、`:app:assembleDebugAndroidTest`。
- APK 在 Android 15 / API 35 / arm64 模拟器实际安装成功。
- 原生插件测试：加载 APK 内的模型，将白底杯子转换成透明 PNG；验证尺寸、透明背景和保留主体。
- 原生错误测试：空输入返回 INVALID_IMAGE，不返回伪造的抠图结果。
- 原生界面测试：WebView 标题有可见布局，确认 Capacitor native 模式与 SubjectCutout 插件已注册，保存实际 WebView 绘制结果。
- APK v2 签名通过；ZIP 16KB 对齐检查通过；所有 arm64 原生库 ELF LOAD alignment ≥16384。
- iOS Swift 四个源文件通过 Xcode 26.2 / iOS Simulator SDK 的 `swiftc -typecheck`。完整 Xcode App 构建缺少可用 iOS 平台运行环境，尚未通过。

## 测试证据

- [Android 原生全屏截图](android-home.png)
- [Android WebView 实际绘制结果](android-webview.png)
- [抠图输入白底照片](android-cutout-source.png)
- [抠图结果透明 PNG](android-cutout-result.png)

初次 SwiftShader 模拟器的全屏截图遗漏 WebView 合成层；改用宿主 GPU 后，实际全屏截图正常，三项原生测试再次通过。相机权限、分享面板与性能仍需在实体手机验证。

测试输入是项目内虚构的生成素材，不代表已通过产品要求的 20 件真实物品保真评测。真实相机照片、透明物、反光物、手部接触、低内存设备及 iOS 真机尚待验证。
