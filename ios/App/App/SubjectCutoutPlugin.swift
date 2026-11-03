import Foundation
import Capacitor
import Vision
import UIKit
import CoreImage

@objc(SubjectCutoutPlugin)
public final class SubjectCutoutPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SubjectCutoutPlugin"
    public let jsName = "SubjectCutout"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "segment", returnType: CAPPluginReturnPromise)
    ]
    private let worker = DispatchQueue(label: "com.enzolabs.lifecatalog.cutout", qos: .userInitiated)

    @objc func availability(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            call.resolve(["available": true, "engine": "Apple Vision · on-device"])
        } else {
            call.resolve(["available": false, "reason": "苹果主体分离需要 iOS 17 或更新版本"])
        }
    }

    @objc func segment(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.reject("苹果主体分离需要 iOS 17 或更新版本", "UNSUPPORTED_OS"); return
        }
        guard let encoded = call.getString("base64"), encoded.count <= 32 * 1024 * 1024,
              let data = Data(base64Encoded: encoded, options: .ignoreUnknownCharacters),
              let image = UIImage(data: data) else {
            call.reject("无法读取照片", "INVALID_IMAGE"); return
        }
        worker.async {
            autoreleasepool {
                do {
                    // Normalize orientation before creating both the handler and the final mask.
                    let size = image.size
                    let format = UIGraphicsImageRendererFormat()
                    format.scale = 1
                    let normalized = UIGraphicsImageRenderer(size: size, format: format).image { _ in
                        image.draw(in: CGRect(origin: .zero, size: size))
                    }
                    guard let cgImage = normalized.cgImage else {
                        call.reject("无法读取照片像素", "INVALID_IMAGE"); return
                    }
                    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
                    let request = VNGenerateForegroundInstanceMaskRequest()
                    try handler.perform([request])
                    guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
                        call.reject("没有识别到主体，试试换个背景重拍", "NO_SUBJECT"); return
                    }
                    let pixels = try observation.generateMaskedImage(
                        ofInstances: observation.allInstances,
                        from: handler,
                        croppedToInstancesExtent: false
                    )
                    let ciImage = CIImage(cvPixelBuffer: pixels)
                    let context = CIContext(options: [.cacheIntermediates: false])
                    guard let result = context.createCGImage(ciImage, from: ciImage.extent),
                          let png = UIImage(cgImage: result).pngData() else {
                        call.reject("透明图片导出失败", "ENCODING_FAILED"); return
                    }
                    call.resolve([
                        "dataUrl": "data:image/png;base64," + png.base64EncodedString(),
                        "width": result.width, "height": result.height,
                        "engine": "Apple Vision"
                    ])
                } catch {
                    call.reject("抠图失败，请换张照片重试", "SEGMENTATION_FAILED", error)
                }
            }
        }
    }
}
