import Capacitor

/// WidgetSyncPlugin is a local (non-npm) plugin, so Capacitor's `cap sync`-generated
/// `packageClassList` never includes it — that list is derived only from npm plugin
/// packages. Register it explicitly here so the JS `WidgetSync` proxy reaches native
/// code instead of rejecting as unimplemented.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetSyncPlugin())
    }
}
