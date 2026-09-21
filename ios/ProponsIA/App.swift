import SwiftUI
import WebKit
import CryptoKit
import os

@main
struct ProponsIAApp: App {
    var body: some Scene {
        WindowGroup {
            Tela().ignoresSafeArea(.container, edges: .bottom)
        }
    }
}

/// A interface web (a mesma do Windows/Linux/Android) dentro de um WKWebView.
struct Tela: UIViewRepresentable {
    func makeCoordinator() -> Ponte { Ponte() }
    func makeUIView(context: Context) -> WKWebView { context.coordinator.criarWebView() }
    func updateUIView(_ v: WKWebView, context: Context) {}
}

struct ModeloIA {
    let id, nome, descricao, arquivo, sha256: String
    let tamanho: Int64, ramMin: Int
    var url: URL { URL(string: "https://huggingface.co/unsloth/\(arquivo.replacingOccurrences(of: "-Q4_K_M.gguf", with: ""))-GGUF/resolve/main/\(arquivo)")! }
    static let todos = [
        ModeloIA(id: "leve", nome: "Leve (0.8B)", descricao: "mais rápido, para iPhones com pouca memória", arquivo: "Qwen3.5-0.8B-Q4_K_M.gguf",
                 sha256: "bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517", tamanho: 532517120, ramMin: 3),
        ModeloIA(id: "normal", nome: "Normal (2B)", descricao: "equilíbrio entre velocidade e qualidade", arquivo: "Qwen3.5-2B-Q4_K_M.gguf",
                 sha256: "aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223", tamanho: 1280835840, ramMin: 6),
        ModeloIA(id: "avancado", nome: "Avançado (4B)", descricao: "respostas melhores (grande demais para iPhone)", arquivo: "Qwen3.5-4B-Q4_K_M.gguf",
                 sha256: "00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4", tamanho: 2740937888, ramMin: 8),
    ]
}

/// Ponte página ↔ app. A página manda {t:'pedido', id, acao, args}; respondemos com window.__proponsMsg({...}).
final class Ponte: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    private var web: WKWebView!
    private let motor = Motor()
    private var modelo: ModeloIA!
    private var naSplash = true
    private var trocando = false
    private let fm = FileManager.default

    private lazy var suporte: URL = {
        let u = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Propons IA", isDirectory: true)
        try? fm.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()
    private var pastaModelos: URL {
        let u = suporte.appendingPathComponent("modelos", isDirectory: true)
        if !fm.fileExists(atPath: u.path) {
            try? fm.createDirectory(at: u, withIntermediateDirectories: true)
            var v = URLResourceValues(); v.isExcludedFromBackup = true; var uu = u; try? uu.setResourceValues(v)
        }
        return u
    }
    private var arquivoConversas: URL { suporte.appendingPathComponent("conversas.json") }
    private let ram = ProcessInfo.processInfo.physicalMemory

    func criarWebView() -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.userContentController.add(self, name: "propons")
        cfg.defaultWebpagePreferences.allowsContentJavaScript = true
        web = WKWebView(frame: .zero, configuration: cfg)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.isOpaque = false
        web.backgroundColor = .systemBackground
        web.scrollView.contentInsetAdjustmentBehavior = .never
        if #available(iOS 16.4, *) { web.isInspectable = true }
        let id = UserDefaults.standard.string(forKey: "modelo")
        modelo = ModeloIA.todos.first { $0.id == id && $0.id != "avancado" } ?? (ram < 5_500_000_000 ? ModeloIA.todos[0] : ModeloIA.todos[1])
        mostrarSplash()
        Task { await iniciar() }
        return web
    }

    // MARK: início
    private func mostrarSplash() {
        guard let u = Bundle.main.url(forResource: "splash", withExtension: "html"), var html = try? String(contentsOf: u) else { return }
        html = html.replacingOccurrences(of: "{{TEMA}}", with: UITraitCollection.current.userInterfaceStyle == .dark ? "escuro" : "claro")
        web.loadHTMLString(html, baseURL: nil)
    }
    private func splash(_ v: Double, _ t: String, _ s: String) {
        guard naSplash else { return }
        js("window.p && p(\(v), \(jsonTexto(t)), \(jsonTexto(s)))")
    }
    private var aoTentar: CheckedContinuation<Void, Never>?

    private func iniciar() async {
        while true {
            let arq = acharModelo(modelo)
            if arq == nil {
                do { _ = try await baixar(modelo, naTela: true) }
                catch { await mostrarFalha(titulo: "Sem conexão para baixar a IA", texto: mensagem(erro: error)); continue }
            }
            splash(-1, "Iniciando", "")
            do {
                try await carregarMotor()
                naSplash = false
                await MainActor.run {
                    let dir = Bundle.main.resourceURL!.appendingPathComponent("interface", isDirectory: true)
                    web.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
                }
                return
            } catch {
                await mostrarFalha(titulo: "Não foi possível abrir a IA", texto: error.localizedDescription + " Tente o modelo Leve.")
                UserDefaults.standard.set("leve", forKey: "modelo"); modelo = ModeloIA.todos[0]
            }
        }
    }
    private func mostrarFalha(titulo: String, texto: String) async {
        splash(-2, titulo, texto)
        await withCheckedContinuation { c in aoTentar = c }
        splash(-1, "Tentando de novo", "")
    }
    private func mensagem(erro: Error) -> String {
        let s = (erro as NSError).localizedDescription
        if s == "sem espaço" { return "Libere cerca de \((modelo.tamanho >> 20) + 400) MB no iPhone e tente de novo." }
        if s == "corrompido" { return "O arquivo veio com defeito e foi descartado. Tente de novo." }
        return "Na primeira vez é preciso internet (de preferência Wi-Fi). Mantenha o app aberto durante o download."
    }

    private func carregarMotor() async throws {
        guard let arq = acharModelo(modelo) else { throw Motor.Erro.modelo }
        #if targetEnvironment(simulator)
        let gpu = false
        #else
        let gpu = true
        #endif
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            motor.fila.async { [motor] in
                do { try motor.carregar(caminho: arq.path, gpu: gpu, contexto: 4096); c.resume() } catch { c.resume(throwing: error) }
            }
        }
    }

    private func acharModelo(_ m: ModeloIA) -> URL? {
        let u = pastaModelos.appendingPathComponent(m.arquivo)
        return tamanho(u) == m.tamanho ? u : nil
    }

    private func tamanho(_ u: URL) -> Int64 { ((try? fm.attributesOfItem(atPath: u.path))?[.size] as? NSNumber)?.int64Value ?? 0 }
    private func espacoLivre(_ u: URL) -> Int64 { ((try? u.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]))?.volumeAvailableCapacityForImportantUsage) ?? Int64.max }

    // download com retomada + SHA-256
    private func baixar(_ m: ModeloIA, naTela: Bool) async throws -> URL {
        let final = pastaModelos.appendingPathComponent(m.arquivo), parcial = pastaModelos.appendingPathComponent(m.arquivo + ".baixando")
        if espacoLivre(pastaModelos) < m.tamanho - tamanho(parcial) + (400 << 20) {
            throw NSError(domain: "propons", code: 1, userInfo: [NSLocalizedDescriptionKey: "sem espaço"])
        }
        var falhas = 0
        var ultimo = Date.distantPast
        let b = Baixador { [weak self] feito in
            guard let self = self, Date().timeIntervalSince(ultimo) > 0.25 else { return }
            ultimo = Date(); let v = Double(feito) / Double(m.tamanho)
            if naTela { self.splash(v, "Baixando a IA", "Só na primeira vez · (feito >> 20) de (m.tamanho >> 20) MB") }
            else { self.evento("download", ["pct": v, "feito": feito, "total": m.tamanho, "nome": m.nome]) }
        }
        while tamanho(parcial) < m.tamanho {
            let ja = tamanho(parcial)
            do { try await b.baixar(m.url, para: parcial, desde: ja); falhas = 0 }
            catch {
                falhas = tamanho(parcial) > ja ? 0 : falhas + 1
                if falhas >= 4 { throw error }
                try? await Task.sleep(nanoseconds: UInt64(2_000_000_000 * (falhas + 1)))
            }
        }
        if naTela { splash(-1, "Verificando o download", "") }
        var hash = SHA256()
        let leitor = try FileHandle(forReadingFrom: parcial)
        while let d = try leitor.read(upToCount: 1 << 20), !d.isEmpty { hash.update(data: d) }
        try leitor.close()
        guard hash.finalize().map({ String(format: "%02x", $0) }).joined() == m.sha256 else {
            try? fm.removeItem(at: parcial); throw NSError(domain: "propons", code: 2, userInfo: [NSLocalizedDescriptionKey: "corrompido"])
        }
        try? fm.removeItem(at: final); try fm.moveItem(at: parcial, to: final)
        return final
    }

    // MARK: ponte
    func userContentController(_ uc: WKUserContentController, didReceive msg: WKScriptMessage) {
        guard let m = msg.body as? [String: Any] else { return }
        if m["t"] as? String == "tentar" { aoTentar?.resume(); aoTentar = nil; return }
        guard m["t"] as? String == "pedido" else { return }
        let id = m["id"], acao = m["acao"] as? String ?? "", args = m["args"] as? [String: Any] ?? [:]
        switch acao {
        case "gerar": gerar(id: id, args: args)
        case "parar": motor.pedirParada(); responder(id, true)
        case "estado": responder(id, ["pronto": motor.carregado && !trocando, "n_ctx": Int(motor.nCtx), "modelo": modelo.arquivo, "model_path": modelo.arquivo])
        case "conhecimento":
            let u = Bundle.main.url(forResource: "conhecimento", withExtension: "md", subdirectory: "interface")
            responder(id, u.flatMap { try? String(contentsOf: $0) } ?? "")
        case "carregar": responder(id, carregarConversas())
        case "salvar": salvarConversas(args["dados"] as? String ?? "[]"); responder(id, true)
        case "sistema": responder(id, sistema())
        case "tema": responder(id, true)
        case "link":
            if let s = args["url"] as? String, let u = URL(string: s), ["http", "https"].contains(u.scheme ?? "") { DispatchQueue.main.async { UIApplication.shared.open(u) } }
            responder(id, true)
        case "modelo":
            guard let novo = ModeloIA.todos.first(where: { $0.id == args["id"] as? String }), novo.id != "avancado" else { erro(id, "modelo indisponível no iPhone"); return }
            responder(id, true)
            if novo.id != modelo.id { Task { await trocarModelo(novo) } }
        case "salvarArquivo": compartilhar(id: id, nome: args["nome"] as? String ?? "arquivo.txt", conteudo: args["conteudo"] as? String ?? "")
        default: erro(id, "ação desconhecida: \(acao)")
        }
    }

    private func gerar(id: Any?, args: [String: Any]) {
        let msgs = (args["mensagens"] as? [[String: Any]] ?? []).map { (papel: $0["role"] as? String ?? "user", texto: $0["content"] as? String ?? "") }
        let maxT = args["maxTokens"] as? Int ?? 1500
        let temp = Float(args["temperatura"] as? Double ?? 0.3)
        let continuar = args["continuar"] as? Bool ?? false
        motor.fila.async { [weak self] in
            guard let self = self else { return }
            do {
                var buf = "", ultimo = Date()
                let r = try self.motor.gerar(msgs, maxTokens: maxT, temperatura: temp, continuar: continuar) { t in
                    buf += t
                    if Date().timeIntervalSince(ultimo) > 0.05 { self.enviar(["t": "token", "id": id ?? NSNull(), "texto": buf]); buf = ""; ultimo = Date() }
                }
                if !buf.isEmpty { self.enviar(["t": "token", "id": id ?? NSNull(), "texto": buf]) }
                self.responder(id, ["fim": r.fim, "timings": ["predicted_per_second": r.geracaoTPS, "prompt_per_second": r.leituraTPS, "predicted_n": r.tokens]])
            } catch { self.erro(id, error.localizedDescription) }
        }
    }

    private func trocarModelo(_ novo: ModeloIA) async {
        trocando = true; defer { trocando = false }
        let antigo = modelo!
        UserDefaults.standard.set(novo.id, forKey: "modelo"); modelo = novo
        if acharModelo(novo) == nil {
            do { _ = try await baixar(novo, naTela: false) } catch {
                modelo = antigo; UserDefaults.standard.set(antigo.id, forKey: "modelo")
                evento("motor", ["estado": "erro", "mensagem": mensagem(erro: error)]); return
            }
        }
        evento("motor", ["estado": "trocando"])
        do { try await carregarMotor(); evento("motor", ["estado": "pronto", "nome": novo.nome]) }
        catch { modelo = antigo; try? await carregarMotor(); evento("motor", ["estado": "erro", "mensagem": error.localizedDescription]) }
    }

    private func carregarConversas() -> String {
        for u in [arquivoConversas, arquivoConversas.appendingPathExtension("bak")] {
            if let d = try? Data(contentsOf: u), (try? JSONSerialization.jsonObject(with: d)) != nil { return String(decoding: d, as: UTF8.self) }
        }
        return fm.fileExists(atPath: arquivoConversas.path) ? "{corrompido" : "[]"
    }
    private func salvarConversas(_ s: String) {
        let bak = arquivoConversas.appendingPathExtension("bak")
        if fm.fileExists(atPath: arquivoConversas.path) { try? fm.removeItem(at: bak); try? fm.copyItem(at: arquivoConversas, to: bak) }
        try? Data(s.utf8).write(to: arquivoConversas, options: .atomic)
    }

    private func sistema() -> [String: Any] {
        var u = utsname(); uname(&u)
        let maquina = withUnsafeBytes(of: &u.machine) { String(decoding: $0.prefix(while: { $0 != 0 }), as: UTF8.self) }
        let livre = espacoLivre(suporte)
        let modelos: [[String: Any]] = ModeloIA.todos.map { m in
            var d: [String: Any] = ["id": m.id, "nome": m.nome, "descricao": m.descricao, "arquivo": m.arquivo, "tamanho": m.tamanho, "ramMin": m.ramMin,
                                    "baixado": acharModelo(m) != nil, "atual": m.id == modelo.id]
            if m.id == "avancado" { d["bloqueado"] = "indisponível no iPhone" }
            return d
        }
        return ["ramTotal": Int64(ram), "ramLivre": Int64(os_proc_available_memory()), "cpu": maquina, "nucleos": ProcessInfo.processInfo.activeProcessorCount,
                "discoLivre": livre == Int64.max ? 0 : livre, "pastaDados": "armazenamento do app", "so": "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion) · \(maquina)",
                "versao": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?", "modelos": modelos]
    }

    private func compartilhar(id: Any?, nome: String, conteudo: String) {
        let u = fm.temporaryDirectory.appendingPathComponent(nome)
        do { try Data(conteudo.utf8).write(to: u) } catch { erro(id, error.localizedDescription); return }
        DispatchQueue.main.async {
            let vc = UIActivityViewController(activityItems: [u], applicationActivities: nil)
            vc.completionWithItemsHandler = { _, ok, _, _ in self.responder(id, ok) }
            vc.popoverPresentationController?.sourceView = self.web
            vc.popoverPresentationController?.sourceRect = CGRect(x: self.web.bounds.midX, y: self.web.bounds.midY, width: 1, height: 1)
            self.web.window?.rootViewController?.present(vc, animated: true)
        }
    }

    // MARK: envio para a página
    private func enviar(_ obj: [String: Any]) {
        guard let d = try? JSONSerialization.data(withJSONObject: obj), let s = String(data: d, encoding: .utf8) else { return }
        js("window.__proponsMsg && window.__proponsMsg(\(s))")
    }
    private func responder(_ id: Any?, _ dados: Any) { enviar(["t": "resposta", "id": id ?? NSNull(), "ok": true, "dados": dados]) }
    private func erro(_ id: Any?, _ msg: String) { enviar(["t": "resposta", "id": id ?? NSNull(), "ok": false, "erro": msg]) }
    private func evento(_ nome: String, _ dados: [String: Any]) { enviar(["t": "evento", "nome": nome, "dados": dados]) }
    private func js(_ codigo: String) { DispatchQueue.main.async { self.web.evaluateJavaScript(codigo, completionHandler: nil) } }
    private func jsonTexto(_ s: String) -> String {
        (try? JSONSerialization.data(withJSONObject: [s])).flatMap { String(data: $0, encoding: .utf8) }.map { String($0.dropFirst().dropLast()) } ?? "\"\""
    }

    // MARK: navegação e diálogos
    func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = a.request.url, ["http", "https"].contains(u.scheme ?? ""), a.navigationType == .linkActivated || a.targetFrame == nil {
            UIApplication.shared.open(u); decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }
    func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration, for a: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let u = a.request.url { UIApplication.shared.open(u) }
        return nil
    }
    func webView(_ w: WKWebView, runJavaScriptAlertPanelWithMessage m: String, initiatedByFrame f: WKFrameInfo, completionHandler: @escaping () -> Void) {
        alerta(m, cancelar: false) { _ in completionHandler() }
    }
    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage m: String, initiatedByFrame f: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        alerta(m, cancelar: true, completionHandler)
    }
    private func alerta(_ m: String, cancelar: Bool, _ fim: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: m, preferredStyle: .alert)
        if cancelar { a.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in fim(false) }) }
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in fim(true) })
        web.window?.rootViewController?.present(a, animated: true)
    }
}
