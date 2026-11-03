import Capacitor

@objc(CatalogViewController)
final class CatalogViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SubjectCutoutPlugin())
    }
}
