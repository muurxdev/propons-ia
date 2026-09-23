import SwiftUI
import WebKit
import CryptoKit
import Speech
import os

@main
struct ProponsIAApp: App {
    @UIApplicationDelegateAdaptor(Delegado.self) var delegado   // downloads de fundo terminados com o app fechado
    var body: some Scene {
        WindowGroup {
            // tela cheia: a página usa env(safe-area-inset-*) para o notch e a barra de início; só o teclado encolhe a tela
            Tela().ignoresSafeArea(.container, edges: .all)
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
    private var escolhendo = false
    private var cancelarBaixar = false
    private var baixandoId: String?
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
        web.scrollView.bounces = false
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }   // inspetor só na compilação de depuração
        #endif
        let id = UserDefaults.standard.string(forKey: "modelo")
        modelo = ModeloIA.todos.first { $0.id == id && $0.id != "avancado" } ?? (ram < 5_500_000_000 ? ModeloIA.todos[0] : ModeloIA.todos[1])
        // modelo configurado ausente: usa o maior já baixado (sem pedir download de novo)
        if acharModelo(modelo!) == nil, let m = ModeloIA.todos.filter({ $0.id != "avancado" && acharModelo($0) != nil }).last { modelo = m }
        // a GPU não pode ser usada com o app fora da tela: se sair no meio de uma resposta, ela é interrompida
        // (e o botão "Continuar" segue de onde parou quando voltar)
        NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            self?.motor.pedirParada()
        }
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
        // abertura fria: a interface abre na hora, sem carregar a IA; ela carrega na primeira mensagem
        do {
            escolhendo = true; naSplash = false
            let temModelo = acharModelo(modelo) != nil
            await MainActor.run {
                let dir = Bundle.main.resourceURL!.appendingPathComponent("interface", isDirectory: true)
                let u = URL(string: dir.appendingPathComponent("index.html").absoluteString + "#escolher" + (temModelo ? "&modelo=" + modelo.id : ""))!
                web.loadFileURL(u, allowingReadAccessTo: dir)
            }
            return
        }
        while true {
            let arq = acharModelo(modelo)
            if arq == nil {
                do { _ = try await baixar(modelo, naTela: true) }
                catch { await mostrarFalha(titulo: "Sem conexão para baixar a IA", texto: mensagem(erro: error)); continue }
            }
            await esperarAtivo()
            splash(-1, "", "")
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
    /// o download pode terminar com a tela apagada; a IA só é carregada (GPU) com o app na tela
    private func esperarAtivo() async {
        while !(await MainActor.run { UIApplication.shared.applicationState == .active }) {
            try? await Task.sleep(nanoseconds: 500_000_000)
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
        if s == "cancelado" { return "Download cancelado." }
        return "Na primeira vez é preciso internet (de preferência Wi-Fi). O download continua mesmo com a tela apagada."
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

    // download pelo iOS em segundo plano (continua com a tela apagada) + retomada + SHA-256
    private func baixar(_ m: ModeloIA, naTela: Bool) async throws -> URL {
        let final = pastaModelos.appendingPathComponent(m.arquivo), parcial = pastaModelos.appendingPathComponent(m.arquivo + ".baixando")
        let completo = tamanho(parcial) == m.tamanho
        if !completo && espacoLivre(pastaModelos) < m.tamanho + (400 << 20) {
            throw NSError(domain: "propons", code: 1, userInfo: [NSLocalizedDescriptionKey: "sem espaço"])
        }
        cancelarBaixar = false
        Baixador.pedirPermissao()
        let cancelado = NSError(domain: "propons", code: 3, userInfo: [NSLocalizedDescriptionKey: "cancelado"])
        var falhas = 0
        var ultimo = Date.distantPast
        if !completo {
            if tamanho(parcial) > 0 { try? fm.removeItem(at: parcial) }   // sobra do jeito antigo (não serve para a retomada do iOS)
            while true {
                if cancelarBaixar { throw cancelado }
                do {
                    try await Baixador.compartilhado.baixar(m.url, para: parcial) { [weak self] feito, _ in
                        guard let self = self, Date().timeIntervalSince(ultimo) > 0.25 else { return }
                        ultimo = Date(); let v = Double(feito) / Double(m.tamanho)
                        if naTela { self.splash(v, "Baixando a IA", "Só na primeira vez · \(feito >> 20) de \(m.tamanho >> 20) MB · pode apagar a tela") }
                        else { self.evento("download", ["id": m.id, "pct": v, "feito": feito, "total": m.tamanho, "nome": m.nome]) }
                    }
                    if tamanho(parcial) == m.tamanho { break }
                    throw URLError(.cannotDecodeContentData)
                } catch {
                    if cancelarBaixar { throw cancelado }
                    falhas += 1
                    if falhas >= 6 { throw error }
                    try? await Task.sleep(nanoseconds: UInt64(3_000_000_000 * falhas))
                }
            }
        }
        if naTela { splash(-1, "Verificando o download", "") }
        else { evento("download", ["id": m.id, "pct": 1.0, "feito": m.tamanho, "total": m.tamanho, "nome": m.nome, "fase": "verificando"]) }
        guard sha256(parcial) == m.sha256 else {
            try? fm.removeItem(at: parcial); throw NSError(domain: "propons", code: 2, userInfo: [NSLocalizedDescriptionKey: "corrompido"])
        }
        try? fm.removeItem(at: final); try fm.moveItem(at: parcial, to: final)
        return final
    }

    // MARK: ponte
    func userContentController(_ uc: WKUserContentController, didReceive msg: WKScriptMessage) {
        // só a nossa página local (arquivo do app), no quadro principal
        let o = msg.frameInfo.securityOrigin
        guard msg.frameInfo.isMainFrame, o.protocol == "file" || o.host.isEmpty else { return }
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
            if baixandoId != nil || trocando { erro(id, "espere o download ou a troca atual terminar"); return }
            responder(id, true)
            if novo.id != modelo.id { Task { await trocarModelo(novo) } }
        case "salvarArquivo": compartilhar(id: id, nome: args["nome"] as? String ?? "arquivo.txt", conteudo: args["conteudo"] as? String ?? "", base64: args["base64"] as? Bool == true)
        case "escolherModelo":
            guard let m = ModeloIA.todos.first(where: { $0.id == args["id"] as? String }), m.id != "avancado" else { erro(id, "modelo indisponível no iPhone"); return }
            if !escolhendo { erro(id, "o modelo já foi escolhido"); return }
            if baixandoId != nil { erro(id, "já há um download em andamento"); return }
            responder(id, true)
            Task { await escolherPrimeiro(m) }
        case "baixarModelo":
            guard let m = ModeloIA.todos.first(where: { $0.id == args["id"] as? String }), m.id != "avancado" else { erro(id, "modelo indisponível no iPhone"); return }
            if baixandoId != nil || trocando { erro(id, "já há um download em andamento"); return }
            responder(id, true)
            if acharModelo(m) != nil { evento("download-fim", ["id": m.id, "ok": true]) } else { Task { await soBaixar(m) } }
        case "cancelarDownload": cancelarBaixar = true; Baixador.compartilhado.cancelar(); responder(id, true)
        case "apagarModelo":
            guard let m = ModeloIA.todos.first(where: { $0.id == args["id"] as? String }) else { erro(id, "modelo desconhecido"); return }
            if m.id == modelo.id { erro(id, "este modelo está em uso; troque de modelo antes de apagar"); return }
            if baixandoId == m.id { erro(id, "cancele o download antes de apagar"); return }
            try? fm.removeItem(at: pastaModelos.appendingPathComponent(m.arquivo)); try? fm.removeItem(at: pastaModelos.appendingPathComponent(m.arquivo + ".baixando"))
            Baixador.compartilhado.esquecerRetomada(pastaModelos.appendingPathComponent(m.arquivo + ".baixando"))
            if acharModelo(m) == nil { responder(id, true) } else { erro(id, "não foi possível apagar o arquivo") }
        case "verificarModelos": DispatchQueue.global(qos: .userInitiated).async { self.responder(id, self.verificarModelos()) }
        case "abrirLoja": abrirLoja(id)
        case "compartilhar": compartilharTexto(id: id, texto: args["texto"] as? String ?? "")
        // transcrição: a página manda o áudio em partes; o reconhecimento de fala do iOS (no aparelho) faz o texto
        case "audioInicio":
            let ext = ["wav", "m4a", "mp3", "ogg", "flac"].contains(args["ext"] as? String ?? "") ? args["ext"] as! String : "wav"
            let ida = UUID().uuidString
            let u = fm.temporaryDirectory.appendingPathComponent("audio-\(ida).\(ext)")
            fm.createFile(atPath: u.path, contents: nil); audios[ida] = u; responder(id, ida)
        case "audioParte":
            guard let ida = args["id"] as? String, let u = audios[ida], let d = Data(base64Encoded: args["dados"] as? String ?? ""), let h = try? FileHandle(forWritingTo: u) else { erro(id, "áudio desconhecido"); return }
            h.seekToEndOfFile(); h.write(d); h.closeFile(); responder(id, true)
        case "transcrever":
            guard let ida = args["id"] as? String, let u = audios.removeValue(forKey: ida) else { erro(id, "áudio desconhecido"); return }
            transcrever(id: id, arquivo: u)
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
        modelo = novo
        if acharModelo(novo) == nil {
            baixandoId = novo.id; cancelarBaixar = false
            defer { baixandoId = nil }
            do { _ = try await baixar(novo, naTela: false) } catch {
                modelo = antigo
                evento("motor", ["estado": "erro", "mensagem": mensagem(erro: error)]); return
            }
        }
        evento("motor", ["estado": "trocando"])
        await esperarAtivo()
        // a escolha só é gravada quando o modelo novo carrega; se não carrega (memória), volta o anterior
        do { try await carregarMotor(); UserDefaults.standard.set(novo.id, forKey: "modelo"); UserDefaults.standard.set(0, forKey: "falhasBoot"); evento("motor", ["estado": "pronto", "nome": novo.nome]) }
        catch { modelo = antigo; try? await carregarMotor(); evento("motor", ["estado": "erro", "mensagem": error.localizedDescription]) }
    }

    // MARK: transcrição (reconhecimento de fala do iOS, no aparelho quando disponível)
    private var audios: [String: URL] = [:]
    private var tarefaFala: SFSpeechRecognitionTask?
    private func transcrever(id: Any?, arquivo: URL) {
        SFSpeechRecognizer.requestAuthorization { st in
            let limpar = { try? self.fm.removeItem(at: arquivo); self.tarefaFala = nil }
            guard st == .authorized else { limpar(); self.erro(id, "permita o reconhecimento de fala em Ajustes → Própons IA"); return }
            guard let rec = SFSpeechRecognizer(locale: Locale(identifier: "pt-BR")), rec.isAvailable else { limpar(); self.erro(id, "reconhecimento de fala em português indisponível neste iPhone"); return }
            let req = SFSpeechURLRecognitionRequest(url: arquivo)
            if rec.supportsOnDeviceRecognition { req.requiresOnDeviceRecognition = true }
            req.shouldReportPartialResults = false
            if #available(iOS 16, *) { req.addsPunctuation = true }
            let t0 = Date()
            DispatchQueue.main.async {
                self.tarefaFala = rec.recognitionTask(with: req) { r, e in
                    if let r = r, r.isFinal { limpar(); self.responder(id, ["texto": r.bestTranscription.formattedString, "segundos": Date().timeIntervalSince(t0)]) }
                    else if let e = e { limpar(); self.erro(id, e.localizedDescription) }
                }
            }
        }
    }

    // primeira abertura: baixa o modelo escolhido (continua com a tela apagada), liga a IA e abre o chat
    private func escolherPrimeiro(_ m: ModeloIA) async {
        modelo = m
        if acharModelo(m) == nil {
            baixandoId = m.id
            do { _ = try await baixar(m, naTela: false) } catch {
                baixandoId = nil
                let s = (error as NSError).localizedDescription
                evento("download-fim", ["id": m.id, "ok": false, "erro": s == "cancelado" ? "cancelado" : mensagem(erro: error)]); return
            }
            baixandoId = nil
        }
        evento("motor", ["estado": "ligando"])
        await esperarAtivo()
        do { try await carregarMotor() } catch {
            // duas falhas seguidas com este modelo: da próxima vez o app abre com o Lume
            let f = UserDefaults.standard.integer(forKey: "falhasBoot") + 1; UserDefaults.standard.set(f, forKey: "falhasBoot")
            if f >= 2, m.id != "leve" { UserDefaults.standard.set("leve", forKey: "modelo") }
            evento("motor", ["estado": "erro", "mensagem": error.localizedDescription]); return
        }
        UserDefaults.standard.set(m.id, forKey: "modelo"); UserDefaults.standard.set(0, forKey: "falhasBoot")
        escolhendo = false
        await MainActor.run {
            let dir = Bundle.main.resourceURL!.appendingPathComponent("interface", isDirectory: true)
            web.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
        }
    }

    // MARK: gerenciar modelos
    private func soBaixar(_ m: ModeloIA) async {
        baixandoId = m.id; cancelarBaixar = false
        var falha: String? = nil
        do { _ = try await baixar(m, naTela: false) }
        catch { let s = (error as NSError).localizedDescription; falha = s == "cancelado" ? "cancelado" : mensagem(erro: error) }
        baixandoId = nil
        evento("download-fim", ["id": m.id, "ok": falha == nil, "erro": falha ?? NSNull()])
    }

    /// confere o SHA-256 de cada modelo baixado; os com defeito são apagados (menos o que está em uso)
    private func verificarModelos() -> [[String: Any]] {
        var r: [[String: Any]] = []
        for m in ModeloIA.todos {
            guard let u = acharModelo(m), m.id != baixandoId else { continue }
            let ok = sha256(u) { v in self.evento("verificacao", ["id": m.id, "nome": m.nome, "pct": v]) } == m.sha256
            var apagado = false
            if !ok && m.id != modelo.id { apagado = (try? fm.removeItem(at: u)) != nil }
            r.append(["id": m.id, "nome": m.nome, "ok": ok, "apagado": apagado])
        }
        return r
    }

    private func sha256(_ u: URL, progresso: ((Double) -> Void)? = nil) -> String {
        guard let h = try? FileHandle(forReadingFrom: u) else { return "" }
        defer { try? h.close() }
        var hash = SHA256()
        let total = Double(max(1, tamanho(u)))
        var lido = 0.0, ultimo = Date.distantPast
        while let d = try? h.read(upToCount: 1 << 20), !d.isEmpty {
            hash.update(data: d); lido += Double(d.count)
            if let p = progresso, Date().timeIntervalSince(ultimo) > 0.3 { ultimo = Date(); p(lido / total) }
        }
        return hash.finalize().map { String(format: "%02x", $0) }.joined()
    }

    // MARK: atualização (no iPhone quem instala é o SideStore/AltStore)
    private func abrirLoja(_ id: Any?) {
        let opcoes = ["sidestore://", "altstore://"].compactMap { URL(string: $0) }
        func tentar(_ i: Int) {
            guard i < opcoes.count else { responder(id, false); return }
            UIApplication.shared.open(opcoes[i], options: [:]) { ok in if ok { self.responder(id, true) } else { tentar(i + 1) } }
        }
        DispatchQueue.main.async { tentar(0) }
    }

    private func compartilharTexto(id: Any?, texto: String) {
        DispatchQueue.main.async {
            let vc = UIActivityViewController(activityItems: [texto], applicationActivities: nil)
            vc.completionWithItemsHandler = { _, ok, _, _ in self.responder(id, ok) }
            vc.popoverPresentationController?.sourceView = self.web
            vc.popoverPresentationController?.sourceRect = CGRect(x: self.web.bounds.midX, y: self.web.bounds.midY, width: 1, height: 1)
            self.web.window?.rootViewController?.present(vc, animated: true)
        }
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
                "discoLivre": livre == Int64.max ? 0 : livre, "pastaDados": "armazenamento do app", "pastaModelos": "armazenamento do app", "so": "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion) · \(maquina)",
                "versao": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?", "modelos": modelos, "temTranscricao": true, "temVisao": false]
    }

    private func compartilhar(id: Any?, nome: String, conteudo: String, base64: Bool = false) {
        let u = fm.temporaryDirectory.appendingPathComponent(nome)
        let dados = base64 ? (Data(base64Encoded: conteudo) ?? Data()) : Data(conteudo.utf8)
        do { try dados.write(to: u) } catch { erro(id, error.localizedDescription); return }
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
    // microfone (🎤 falar): só para a página do próprio app
    @available(iOS 15.0, *)
    func webView(_ w: WKWebView, requestMediaCapturePermissionFor origem: WKSecurityOrigin, initiatedByFrame f: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(type == .microphone ? .grant : .deny)
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
