// swift-tools-version:5.3
import PackageDescription
// Exact official Capacitor 8.5.3 binaries, verified by scripts/prepare-ios-runtime.mjs.
let package = Package(
    name: "capacitor-swift-pm",
    products: [.library(name: "Capacitor", targets: ["Capacitor"]), .library(name: "Cordova", targets: ["Cordova"])],
    targets: [.binaryTarget(name: "Capacitor", path: "Capacitor.xcframework"), .binaryTarget(name: "Cordova", path: "Cordova.xcframework")]
)
