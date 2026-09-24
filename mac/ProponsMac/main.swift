// Própons IA para Mac: janela nativa (WKWebView) com a mesma interface das outras versões.
// O motor (llama-server do llama.cpp) roda como processo filho e responde em http://127.0.0.1; a página conversa
// com este programa pela ponte "proponsMac" ({t:'pedido', id, acao, args} → window.__proponsMsg({t:'resposta', ...})).
// Modelos, visão (ler fotos) e vozes (whisper) são baixados na primeira vez, com retomada e SHA-256.
import AppKit
import WebKit
import CryptoKit
import IOKit.pwr_mgt
import UserNotifications

let VERSAO = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
let REPO = "muurxdev/propons-ia"

// MARK: - modelos, visão e vozes
struct Modelo {
    let id, nome, descricao, arquivo, sha256, url: String
    let tamanho: Int64, ramMin: Int
    var visaoTamanho: Int64 = 0, visaoSha = ""
    func visao() -> Modelo {
        let base = arquivo.replacingOccurrences(of: "-Q4_K_M.gguf", with: "")
        return Modelo(id: "visao-\(id)", nome: "Visão (\(nome))", descricao: "", arquivo: "mmproj-\(base)-F16.gguf", sha256: visaoSha,
                      url: "https://huggingface.co/unsloth/\(base)-GGUF/resolve/main/mmproj-F16.gguf", tamanho: visaoTamanho, ramMin: 0)
    }
    static func qwen(_ id: String, _ nome: String, _ desc: String, _ tam: String, _ bytes: Int64, _ sha: String, _ ram: Int, _ vb: Int64, _ vs: String) -> Modelo {
        let a = "Qwen3.5-\(tam)-Q4_K_M.gguf"
        return Modelo(id: id, nome: nome, descricao: desc, arquivo: a, sha256: sha, url: "https://huggingface.co/unsloth/Qwen3.5-\(tam)-GGUF/resolve/main/\(a)",
                      tamanho: bytes, ramMin: ram, visaoTamanho: vb, visaoSha: vs)
    }
    static let todos = [
        qwen("leve", "Leve (0.8B)", "mais rápido, para Macs com pouca memória", "0.8B", 532517120, "bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517", 3,
             204987232, "56e4c6cfe73b0c82e3e82bc518d7591997e61d81f723fc41a586f4fa69ea2453"),
        qwen("normal", "Normal (2B)", "equilíbrio entre velocidade e qualidade", "2B", 1280835840, "aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223", 6,
             668227264, "7035e9cb8d7c6a9681d07eef9a364783e86ea4cd73faab2eabb4f43a101830c7"),
        qwen("avancado", "Avançado (4B)", "respostas e códigos melhores, mais lento", "4B", 2740937888, "00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4", 8,
             672423616, "cd88edcf8d031894960bb0c9c5b9b7e1fea6ebee02b9f7ce925a00d12891f864"),
    ]
    static let vozes = [
        Modelo(id: "voz-base", nome: "Voz Base", descricao: "rápida", arquivo: "ggml-base-q5_1.bin", sha256: "422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898",
               url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin", tamanho: 59707625, ramMin: 0),
        Modelo(id: "voz-small", nome: "Voz Small", descricao: "mais precisa, mais lenta", arquivo: "ggml-small-q5_1.bin", sha256: "ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb",
               url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin", tamanho: 190085487, ramMin: 0),
    ]
}

// MARK: - download em blocos com retomada (cabeçalho Range)
final class Baixador: NSObject, URLSessionDataDelegate {
    private var handle: FileHandle?
    private var arquivo: URL!
    private var feito: Int64 = 0
    private var codigo = 0
    private var cont: CheckedContinuation<Void, Error>?
    private var tarefa: URLSessionDataTask?
    private let progresso: (Int64, Int64) -> Void
    private var total: Int64 = 0
    init(progresso: @escaping (Int64, Int64) -> Void) { self.progresso = progresso }
    func cancelar() { tarefa?.cancel() }
    func baixar(_ url: URL, para arquivo: URL, desde: Int64) async throws {
        self.arquivo = arquivo; feito = desde
        let cfg = URLSessionConfiguration.default; cfg.timeoutIntervalForRequest = 60
        let sessao = URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
        defer { sessao.finishTasksAndInvalidate() }
        var req = URLRequest(url: url)
        req.setValue("ProponsIA-Mac/\(VERSAO)", forHTTPHeaderField: "User-Agent")
        if desde > 0 { req.setValue("bytes=\(desde)-", forHTTPHeaderField: "Range") }
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            self.cont = c
            let t = sessao.dataTask(with: req); self.tarefa = t; t.resume()
        }
    }
    func urlSession(_ s: URLSession, dataTask: URLSessionDataTask, didReceive resp: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        codigo = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200...299).contains(codigo) else { completionHandler(.cancel); return }
        do {
            if !FileManager.default.fileExists(atPath: arquivo.path) { FileManager.default.createFile(atPath: arquivo.path, contents: nil) }
            let h = try FileHandle(forWritingTo: arquivo)
            if codigo == 206 { try h.seekToEnd() } else { try h.truncate(atOffset: 0); feito = 0 }
            total = feito + max(0, resp.expectedContentLength)
            handle = h; completionHandler(.allow)
        } catch { completionHandler(.cancel) }
    }
    func urlSession(_ s: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        do { try handle?.write(contentsOf: data) } catch { dataTask.cancel(); return }
        feito += Int64(data.count); progresso(feito, total)
    }
    func urlSession(_ s: URLSession, task: URLSessionTask, didCompleteWithError e: Error?) {
        try? handle?.close(); handle = nil
        if let e = e { cont?.resume(throwing: e) }
        else if !(200...299).contains(codigo) { cont?.resume(throwing: NSError(domain: "propons", code: codigo, userInfo: [NSLocalizedDescriptionKey: "HTTP \(codigo)"])) }
        else { cont?.resume() }
        cont = nil
    }
}

func erro(_ s: String) -> NSError { NSError(domain: "propons", code: 1, userInfo: [NSLocalizedDescriptionKey: s]) }

func sha256(_ u: URL, progresso: ((Double) -> Void)? = nil) -> String {
    guard let h = try? FileHandle(forReadingFrom: u) else { return "" }
    defer { try? h.close() }
    var hash = SHA256()
    let total = Double(max(1, tamanho(u))); var lido = 0.0; var ultimo = Date.distantPast
    while let d = try? h.read(upToCount: 1 << 20), !d.isEmpty {
        hash.update(data: d); lido += Double(d.count)
        if let p = progresso, Date().timeIntervalSince(ultimo) > 0.3 { ultimo = Date(); p(lido / total) }
    }
    return hash.finalize().map { String(format: "%02x", $0) }.joined()
}
func tamanho(_ u: URL) -> Int64 { ((try? FileManager.default.attributesOfItem(atPath: u.path))?[.size] as? NSNumber)?.int64Value ?? 0 }

// MARK: - aplicativo
final class App: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    var janela: NSWindow!
    var web: WKWebView!
    let fm = FileManager.default
    let chave: String = { var b = [UInt8](repeating: 0, count: 18); _ = SecRandomCopyBytes(kSecRandomDefault, 18, &b)
        return Data(b).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "") }()
    var porta = 8765
    var motor: Process?
    var modelo = Modelo.todos[1]
    var naSplash = true, trocando = false, desligando = false, visaoAtiva = false, escolhendo = false
    var baixandoId: String?, cancelarBaixar = false, baixadorAtual: Baixador?
    var quedas: [Date] = []
    var aoTentar: CheckedContinuation<Void, Never>?
    var audios: [String: URL] = [:]
    var assercao: IOPMAssertionID = 0, acordado = 0, respondendo = false
    var autoteste: String? = ProcessInfo.processInfo.environment["PROPONS_AUTOTESTE"]

    lazy var suporte: URL = {
        let u = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Propons IA", isDirectory: true)
        try? fm.createDirectory(at: u, withIntermediateDirectories: true); return u
    }()
    var pastaModelos: URL { let u = suporte.appendingPathComponent("modelos", isDirectory: true); try? fm.createDirectory(at: u, withIntermediateDirectories: true); return u }
    var pastaDados: URL { let u = suporte.appendingPathComponent("dados", isDirectory: true); try? fm.createDirectory(at: u, withIntermediateDirectories: true); return u }
    var recursos: URL { Bundle.main.resourceURL! }
    var pastaMotor: URL {
        #if arch(arm64)
        return recursos.appendingPathComponent("motor-arm64", isDirectory: true)
        #else
        return recursos.appendingPathComponent("motor-x64", isDirectory: true)
        #endif
    }

    // MARK: configuração (config.json)
    func lerConfig() -> [String: Any] { (try? JSONSerialization.jsonObject(with: Data(contentsOf: pastaDados.appendingPathComponent("config.json")))) as? [String: Any] ?? [:] }
    func salvarConfig(_ c: [String: Any]) { if let d = try? JSONSerialization.data(withJSONObject: c) { try? d.write(to: pastaDados.appendingPathComponent("config.json"), options: .atomic) } }
    var ram: UInt64 { ProcessInfo.processInfo.physicalMemory }

    // MARK: início
    func applicationDidFinishLaunching(_ n: Notification) {
        // instância única: abrir de novo só traz a janela que já existe (dois apps = dois motores = memória em dobro)
        if let id = Bundle.main.bundleIdentifier {
            let outras = NSRunningApplication.runningApplications(withBundleIdentifier: id).filter { $0.processIdentifier != ProcessInfo.processInfo.processIdentifier }
            if let outra = outras.first { outra.activate(options: [.activateIgnoringOtherApps]); NSApp.terminate(nil); return }
        }
        let tela = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1280, height: 800)
        let w: CGFloat = 480, h: CGFloat = min(760, tela.height - 60)
        janela = NSWindow(contentRect: NSRect(x: tela.midX - w / 2, y: tela.midY - h / 2, width: w, height: h),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        janela.title = "Própons IA"; janela.minSize = NSSize(width: 380, height: 500)
        janela.delegate = self
        let cfg = WKWebViewConfiguration()
        cfg.userContentController.add(self, name: "proponsMac")
        cfg.userContentController.add(self, name: "propons")          // botão "Tentar novamente" da tela de carregamento
        // inspetor web só em depuração/autoteste (em uso normal ninguém precisa abrir o DevTools da interface)
        let env = ProcessInfo.processInfo.environment
        if env["PROPONS_DEPURAR"] == "1" || env["PROPONS_AUTOTESTE"] != nil { cfg.preferences.setValue(true, forKey: "developerExtrasEnabled") }
        web = WKWebView(frame: janela.contentView!.bounds, configuration: cfg)
        web.autoresizingMask = [.width, .height]
        web.navigationDelegate = self; web.uiDelegate = self
        web.setValue(false, forKey: "drawsBackground")
        if #available(macOS 13.3, *) { web.isInspectable = true }
        janela.contentView?.addSubview(web)
        janela.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        let c = lerConfig(), forcado = ProcessInfo.processInfo.environment["PROPONS_MODELO"]
        modelo = Modelo.todos.first { $0.id == (forcado ?? c["modelo"] as? String) } ?? (ram < 5_500_000_000 ? Modelo.todos[0] : Modelo.todos[1])
        matarOrfao()
        if forcado == nil, acharModelo(modelo) == nil, let m = melhorBaixado(exceto: nil) { modelo = m }
        mostrarSplash()
        Task { await iniciar() }
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ n: Notification) { desligando = true; pararMotor() }

    func mostrarSplash() {
        guard let u = Bundle.main.url(forResource: "splash", withExtension: "html"), var html = try? String(contentsOf: u) else { return }
        let escuro = NSApp.effectiveAppearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        html = html.replacingOccurrences(of: "{{TEMA}}", with: escuro ? "escuro" : "claro")
        web.loadHTMLString(html, baseURL: nil)
    }
    func splash(_ v: Double, _ t: String, _ s: String) { guard naSplash else { return }; js("window.p && p(\(v), \(jsonTexto(t)), \(jsonTexto(s)))") }

    func iniciar() async {
        // primeira abertura: abre a interface para a pessoa escolher o modelo (nada é baixado antes)
        // abertura fria: a interface abre na hora, sem ligar a IA; ela liga na primeira mensagem. O autoteste liga já.
        let env = ProcessInfo.processInfo.environment
        if env["PROPONS_MODELO"] == nil && (env["PROPONS_AUTOTESTE"] == nil || acharModelo(modelo) == nil),
           var html = try? String(contentsOf: recursos.appendingPathComponent("interface/index.html"), encoding: .utf8) {
            escolhendo = true; naSplash = false
            let ini = acharModelo(modelo) != nil ? "window.PROPONS_MODELO=" + jsonTexto(modelo.id) + ";" : ""
            html = html.replacingOccurrences(of: "<head>", with: "<head><script>window.PROPONS_ESCOLHER=true;" + ini + "</script>")
            await MainActor.run { web.loadHTMLString(html, baseURL: URL(string: "https://propons.local/")) }
            return
        }
        while true {
            if acharModelo(modelo) == nil {
                do { _ = try await baixar(modelo, naTela: true) }
                catch { await falha("Sem conexão para baixar a IA", mensagem(error, modelo)); continue }
            }
            if visaoLigada(), acharModelo(modelo.visao()) == nil { _ = try? await baixar(modelo.visao(), naTela: true) }
            splash(-1, "", "")
            if let e = await ligarMotor() {
                if registrarFalhaBoot() >= 2, let menor = melhorBaixado(exceto: modelo) {   // caiu 2x seguidas: tenta o melhor modelo baixado que cabe
                    modelo = menor; var c = lerConfig(); c["modelo"] = menor.id; c["falhasBoot"] = 0; salvarConfig(c); continue
                }
                await falha("Não foi possível abrir a IA", e); continue
            }
            var c = lerConfig(); if (c["falhasBoot"] as? Int ?? 0) != 0 { c["falhasBoot"] = 0; salvarConfig(c) }
            naSplash = false
            await MainActor.run { web.load(URLRequest(url: URL(string: "http://127.0.0.1:\(porta)/#k=\(chave)")!)) }
            return
        }
    }
    func falha(_ t: String, _ s: String) async {
        splash(-2, t, s)
        if autoteste != nil { gravarAutoteste(["erro": "\(t): \(s)"]) }
        await withCheckedContinuation { c in aoTentar = c }
        splash(-1, "Tentando de novo", "")
    }
    func mensagem(_ e: Error, _ m: Modelo) -> String {
        switch (e as NSError).localizedDescription {
        case "sem espaço": return "A IA precisa de cerca de \((m.tamanho >> 20) + 400) MB livres neste Mac."
        case "corrompido": return "O arquivo baixado veio com defeito e foi descartado. Tente de novo."
        case "cancelado": return "Download cancelado."
        default: return "Na primeira vez é preciso internet. Verifique a conexão e tente de novo."
        }
    }

    // MARK: arquivos de modelo
    func acharModelo(_ m: Modelo) -> URL? { let u = pastaModelos.appendingPathComponent(m.arquivo); return tamanho(u) == m.tamanho ? u : nil }
    func livre() -> Int64 { ((try? pastaModelos.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]))?.volumeAvailableCapacityForImportantUsage) ?? 0 }

    func baixar(_ m: Modelo, naTela: Bool) async throws -> URL {
        let final = pastaModelos.appendingPathComponent(m.arquivo), parcial = pastaModelos.appendingPathComponent(m.arquivo + ".baixando")
        if livre() > 0 && livre() < m.tamanho - tamanho(parcial) + (400 << 20) { throw erro("sem espaço") }
        cancelarBaixar = false
        manterAcordado(true); defer { manterAcordado(false) }
        var ultimo = Date.distantPast, falhas = 0
        let b = Baixador { [weak self] feito, _ in
            guard let self = self, Date().timeIntervalSince(ultimo) > 0.25 else { return }
            ultimo = Date(); let v = Double(feito) / Double(m.tamanho)
            if naTela { self.splash(v, "Baixando a IA", "Só na primeira vez · \(feito >> 20) de \(m.tamanho >> 20) MB") }
            else { self.evento("download", ["id": m.id, "pct": v, "feito": feito, "total": m.tamanho, "nome": m.nome]) }
        }
        baixadorAtual = b; defer { baixadorAtual = nil }
        while tamanho(parcial) < m.tamanho {
            if cancelarBaixar { throw erro("cancelado") }
            let ja = tamanho(parcial)
            do { try await b.baixar(URL(string: m.url)!, para: parcial, desde: ja) }
            catch {
                if cancelarBaixar { throw erro("cancelado") }
                falhas = tamanho(parcial) > ja ? 0 : falhas + 1
                if falhas >= 9 { throw erro("sem conexão") }
                try? await Task.sleep(nanoseconds: UInt64(min(30, 3 * falhas)) * 1_000_000_000)
            }
        }
        if naTela { splash(-1, "Verificando o download", "") }
        else { evento("download", ["id": m.id, "pct": 1.0, "feito": m.tamanho, "total": m.tamanho, "nome": m.nome, "fase": "verificando"]) }
        guard sha256(parcial) == m.sha256 else { try? fm.removeItem(at: parcial); throw erro("corrompido") }
        try? fm.removeItem(at: final); try fm.moveItem(at: parcial, to: final)
        if !naTela && NSApp.isActive == false { avisar("IA baixada", "\(m.nome) está pronto para usar.") }
        return final
    }
    func soBaixar(_ m: Modelo) async {
        baixandoId = m.id
        var falha: String? = nil
        do { _ = try await baixar(m, naTela: false) } catch { let s = (error as NSError).localizedDescription; falha = s == "cancelado" ? "cancelado" : mensagem(error, m) }
        baixandoId = nil
        evento("download-fim", ["id": m.id, "ok": falha == nil, "erro": falha ?? NSNull()])
    }

    // primeira abertura: baixa o modelo escolhido, liga a IA e abre o chat
    func escolherPrimeiro(_ m: Modelo) async {
        modelo = m
        if acharModelo(m) == nil {
            baixandoId = m.id
            do { _ = try await baixar(m, naTela: false) } catch {
                baixandoId = nil
                let s = (error as NSError).localizedDescription
                evento("download-fim", ["id": m.id, "ok": false, "erro": s == "cancelado" ? "cancelado" : mensagem(error, m)]); return
            }
            baixandoId = nil
        }
        evento("motor", ["estado": "ligando"])
        if let e = await ligarMotor() { _ = registrarFalhaBoot(); evento("motor", ["estado": "erro", "mensagem": e]); return }
        var c = lerConfig(); c["modelo"] = m.id; c["falhasBoot"] = 0; salvarConfig(c)
        escolhendo = false
        let u = URL(string: "http://127.0.0.1:\(porta)/#k=\(chave)")!
        await MainActor.run { web.load(URLRequest(url: u)) }
    }

    // MARK: motor
    func visaoLigada() -> Bool { lerConfig()["visao"] as? Bool ?? false }
    func portaLivre() -> Int {
        for p in 8765...8795 {
            let s = socket(AF_INET, SOCK_STREAM, 0); defer { close(s) }
            var a = sockaddr_in(); a.sin_family = sa_family_t(AF_INET); a.sin_port = in_port_t(UInt16(p).bigEndian); a.sin_addr.s_addr = inet_addr("127.0.0.1")
            let r = withUnsafePointer(to: &a) { $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { Darwin.bind(s, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) } }
            if r == 0 { return p }
        }
        return 8765
    }
    // argumentos do motor vêm de interface/motor.json (gerado de src/motor.json, igual nos 5 sistemas): contexto pelo
    // degrau de RAM do Mac, cache KV, raciocínio e o resto; nada disso fica escrito aqui
    func configMotor() -> (args: [String], imagem: Int) {
        let url = recursos.appendingPathComponent("interface/motor.json")
        guard let d = try? Data(contentsOf: url), let j = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
              let pc = j["pc"] as? [String: Any], let degraus = pc["contexto"] as? [[Double]], let extra = pc["args"] as? [String] else { return ([], 400) }
        var ctx = 0
        for d in degraus where ctx == 0 || Double(ram) >= d[0] * 0.93 * 1_073_741_824 { ctx = Int(d[1]) }   // "8 GB" aparece como 7,8
        return (["-c", "\(ctx)"] + extra, pc["imagemMaxTokens"] as? Int ?? 400)
    }
    func ligarMotor() async -> String? {
        guard let arq = acharModelo(modelo) else { return "O modelo não está baixado." }
        if motor == nil { porta = portaLivre() }
        let exe = pastaMotor.appendingPathComponent("llama-server")
        let cfg = configMotor()
        var args = ["-m", arq.path, "--host", "127.0.0.1", "--port", "\(porta)", "--path", recursos.appendingPathComponent("interface").path]
            + cfg.args + ["--api-key-file", arquivoChave().path]
        if visaoLigada(), let v = acharModelo(modelo.visao()) { args += ["--mmproj", v.path, "--image-max-tokens", "\(cfg.imagem)"]; visaoAtiva = true } else { visaoAtiva = false }
        if ProcessInfo.processInfo.environment["PROPONS_SEM_GPU"] == "1" { args += ["-ngl", "0"] }   // testes em máquina virtual sem GPU
        let p = Process(); p.executableURL = exe; p.arguments = args; p.currentDirectoryURL = pastaMotor
        let log = suporte.appendingPathComponent("motor.log"); fm.createFile(atPath: log.path, contents: nil)
        if let h = try? FileHandle(forWritingTo: log) { p.standardOutput = h; p.standardError = h }
        p.qualityOfService = .utility   // prioridade menor que a da janela: a interface continua lisa
        p.terminationHandler = { [weak self] q in DispatchQueue.main.async { self?.motorSaiu(q) } }
        do { try p.run() } catch { return "O motor da IA não pôde ser iniciado: \(error.localizedDescription)" }
        motor = p
        try? "\(p.processIdentifier)".write(to: suporte.appendingPathComponent("motor.pid"), atomically: true, encoding: .utf8)
        let t0 = Date()
        while Date().timeIntervalSince(t0) < 180 {
            if !p.isRunning { motorFalhou(); return "O motor da IA fechou sozinho. Pode ser falta de memória: tente o modelo Leve." }
            if await saudavel() { return nil }
            try? await Task.sleep(nanoseconds: 250_000_000)
        }
        motorFalhou(); return "A IA demorou demais para iniciar."
    }
    // motor que não subiu (pendurado ou morto): mata antes de tentar de novo, sem o vigia achar que foi queda
    var ignorarSaida: Process?
    func motorFalhou() { ignorarSaida = motor; pararMotor() }
    // a chave do motor vai num arquivo só deste usuário, não na linha de comando (que qualquer processo vê)
    func arquivoChave() -> URL {
        let u = suporte.appendingPathComponent("motor.chave")
        try? (chave + "\n").write(to: u, atomically: true, encoding: .utf8)
        try? fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: u.path)
        return u
    }
    // llama-server de uma abertura anterior que morreu sem fechar o motor (crash, kill): mata antes de subir outro
    func matarOrfao() {
        let u = suporte.appendingPathComponent("motor.pid")
        defer { try? fm.removeItem(at: u) }
        guard let s = try? String(contentsOf: u), let pid = Int32(s.trimmingCharacters(in: .whitespacesAndNewlines)), pid > 1 else { return }
        var buf = [CChar](repeating: 0, count: 4096)
        guard proc_pidpath(pid, &buf, UInt32(buf.count)) > 0, String(cString: buf).hasSuffix("/llama-server") else { return }
        kill(pid, SIGKILL)
    }
    func saudavel() async -> Bool {
        var r = URLRequest(url: URL(string: "http://127.0.0.1:\(porta)/health")!); r.timeoutInterval = 1.5
        return ((try? await URLSession.shared.data(for: r))?.1 as? HTTPURLResponse)?.statusCode == 200
    }
    func pararMotor() { if let p = motor, p.isRunning { p.terminate(); p.waitUntilExit() } }
    // vigia: se o motor cair sem a gente pedir, religa na mesma porta (até 5 vezes em 3 minutos)
    func motorSaiu(_ p: Process) {
        guard !desligando, !trocando, p === motor, p !== ignorarSaida else { return }
        quedas.append(Date()); quedas = quedas.filter { Date().timeIntervalSince($0) < 180 }
        if quedas.count > 5 { evento("motor", ["estado": "erro", "mensagem": "O motor da IA está caindo repetidamente. Use um modelo menor."]); return }
        evento("motor", ["estado": "reiniciando"])
        Task { let e = await ligarMotor(); evento("motor", e == nil ? ["estado": "pronto", "nome": modelo.nome] : ["estado": "erro", "mensagem": e!]) }
    }
    func registrarFalhaBoot() -> Int { var c = lerConfig(); let f = (c["falhasBoot"] as? Int ?? 0) + 1; c["falhasBoot"] = f; salvarConfig(c); return f }
    // o maior modelo já baixado que cabe na memória deste Mac (Lume 3 GB, Aurora 4 GB, Ápice 8 GB), diferente de "exceto"
    func melhorBaixado(exceto: Modelo?) -> Modelo? {
        var melhor: Modelo? = nil
        for m in Modelo.todos where m.id != exceto?.id {
            let precisa: Double = m.id == "leve" ? 3 : m.id == "normal" ? 4 : 8
            if acharModelo(m) != nil && (m.id == "leve" || Double(ram) >= precisa * 1_073_741_824 * 0.93) { melhor = m }
        }
        return melhor
    }
    func religar(_ antes: () -> Void = {}) async {
        trocando = true; defer { trocando = false }
        evento("motor", ["estado": "trocando"])
        pararMotor(); antes()
        let e = await ligarMotor()
        evento("motor", e == nil ? ["estado": "pronto", "nome": modelo.nome, "visao": visaoAtiva] : ["estado": "erro", "mensagem": e!])
    }
    func trocarModelo(_ novo: Modelo) async {
        var c = lerConfig(); let antigo = modelo
        modelo = novo
        if acharModelo(novo) == nil {
            baixandoId = novo.id
            do { _ = try await baixar(novo, naTela: false) } catch {
                baixandoId = nil; modelo = antigo
                evento("motor", ["estado": "erro", "mensagem": mensagem(error, novo)]); return
            }
            baixandoId = nil
        }
        trocando = true; defer { trocando = false }
        evento("motor", ["estado": "trocando"])
        pararMotor()
        if let e = await ligarMotor() {   // o modelo novo não subiu (memória?): volta o anterior e não grava a escolha
            modelo = antigo; if acharModelo(antigo) != nil { _ = await ligarMotor() }
            evento("motor", ["estado": "erro", "mensagem": e]); return
        }
        c["modelo"] = novo.id; c["falhasBoot"] = 0; salvarConfig(c)
        evento("motor", ["estado": "pronto", "nome": modelo.nome, "visao": visaoAtiva])
    }
    func ligarVisao(_ ligar: Bool) async {
        var c = lerConfig(); c["visao"] = ligar; salvarConfig(c)
        if ligar, acharModelo(modelo.visao()) == nil {
            let v = modelo.visao(); baixandoId = v.id
            do { _ = try await baixar(v, naTela: false) } catch {
                baixandoId = nil; c["visao"] = false; salvarConfig(c)
                let s = (error as NSError).localizedDescription
                evento("download-fim", ["id": v.id, "ok": false, "erro": s == "cancelado" ? "cancelado" : mensagem(error, v)]); return
            }
            baixandoId = nil; evento("download-fim", ["id": v.id, "ok": true])
        }
        await religar()
    }

    // MARK: Mac acordado durante downloads e respostas; avisos
    func manterAcordado(_ sim: Bool, resposta: Bool = false) {
        DispatchQueue.main.async {
            if resposta { if sim == self.respondendo { return }; self.respondendo = sim }
            self.acordado = max(0, self.acordado + (sim ? 1 : -1))
            if self.acordado > 0 && self.assercao == 0 {
                IOPMAssertionCreateWithName(kIOPMAssertionTypePreventUserIdleSystemSleep as CFString, IOPMAssertionLevel(kIOPMAssertionLevelOn), "Própons IA trabalhando" as CFString, &self.assercao)
            } else if self.acordado == 0 && self.assercao != 0 { IOPMAssertionRelease(self.assercao); self.assercao = 0 }
        }
    }
    func avisar(_ t: String, _ s: String) {
        DispatchQueue.main.async {
            if NSApp.isActive { return }                      // janela em uso: não incomoda
            NSApp.requestUserAttention(.informationalRequest); NSApp.dockTile.badgeLabel = "✓"
            let c = UNUserNotificationCenter.current()
            c.requestAuthorization(options: [.alert, .sound]) { ok, _ in
                guard ok else { return }
                let n = UNMutableNotificationContent(); n.title = t; n.body = s
                c.add(UNNotificationRequest(identifier: "propons-resposta", content: n, trigger: nil))
            }
        }
    }
    func applicationDidBecomeActive(_ n: Notification) { NSApp.dockTile.badgeLabel = nil }

    // MARK: ponte com a página
    func userContentController(_ uc: WKUserContentController, didReceive msg: WKScriptMessage) {
        // só a nossa página (quadro principal): a servida pelo motor em 127.0.0.1 ou as locais (about:blank / propons.local)
        let o = msg.frameInfo.securityOrigin
        guard msg.frameInfo.isMainFrame, o.host == "127.0.0.1" || o.host == "propons.local" || o.host.isEmpty else { return }
        guard let m = msg.body as? [String: Any] else { return }
        if m["t"] as? String == "tentar" { aoTentar?.resume(); aoTentar = nil; return }
        guard m["t"] as? String == "pedido", msg.name == "proponsMac" else { return }
        let id = m["id"], acao = m["acao"] as? String ?? "", a = m["args"] as? [String: Any] ?? [:]
        Task { @MainActor in
            do { responder(id, try await atender(acao, a)) } catch { erroPonte(id, (error as NSError).localizedDescription) }
        }
    }
    func modeloDe(_ a: [String: Any]) throws -> Modelo { guard let m = Modelo.todos.first(where: { $0.id == a["id"] as? String }) else { throw erro("modelo desconhecido") }; return m }
    func vozDe(_ a: [String: Any]) throws -> Modelo { guard let m = Modelo.vozes.first(where: { $0.id == a["id"] as? String }) else { throw erro("voz desconhecida") }; return m }
    func vozAtual() -> Modelo { Modelo.vozes.first { $0.id == lerConfig()["voz"] as? String } ?? Modelo.vozes[0] }

    @MainActor func atender(_ acao: String, _ a: [String: Any]) async throws -> Any {
        switch acao {
        case "carregar": return carregarConversas()
        case "salvar": try salvarConversas(a["dados"] as? String ?? "[]"); return true
        case "sistema": return sistema()
        case "tema": return true
        case "link":
            if let s = a["url"] as? String, let u = URL(string: s), ["http", "https"].contains(u.scheme ?? "") { NSWorkspace.shared.open(u) }
            return true
        // pesquisa na internet: a janela web não lê sites de fora (política de origem), então o app busca
        case "buscar": return try await paginaDaWeb(a["url"] as? String ?? "")
        case "ocupado": manterAcordado(a["sim"] as? Bool ?? false, resposta: true); return true
        case "modelo":
            let novo = try modeloDe(a)
            if baixandoId != nil || trocando { throw erro("espere o download ou a troca atual terminar") }
            if novo.id != modelo.id { Task { await trocarModelo(novo) } }
            return true
        case "escolherModelo":
            let m = try modeloDe(a)
            if !escolhendo { throw erro("o modelo já foi escolhido") }
            if baixandoId != nil { throw erro("já há um download em andamento") }
            Task { await escolherPrimeiro(m) }
            return true
        case "baixarModelo", "baixarVoz":
            let m = acao == "baixarVoz" ? try vozDe(a) : try modeloDe(a)
            if baixandoId != nil || trocando { throw erro("já há um download em andamento") }
            if acharModelo(m) == nil { Task { await soBaixar(m) } } else { evento("download-fim", ["id": m.id, "ok": true]) }
            return true
        case "cancelarDownload": cancelarBaixar = true; baixadorAtual?.cancelar(); return true
        case "apagarModelo":
            let m = try modeloDe(a)
            if m.id == modelo.id { throw erro("este modelo está em uso; troque de modelo antes de apagar") }
            if baixandoId == m.id { throw erro("cancele o download antes de apagar") }
            try? fm.removeItem(at: pastaModelos.appendingPathComponent(m.arquivo)); try? fm.removeItem(at: pastaModelos.appendingPathComponent(m.arquivo + ".baixando"))
            return true
        case "verificarModelos":
            let atual = modelo, ativa = visaoAtiva
            return await Task.detached { () -> [[String: Any]] in
                var r: [[String: Any]] = []
                for m in Modelo.todos {
                    let u = self.pastaModelos.appendingPathComponent(m.arquivo)
                    guard tamanho(u) == m.tamanho else { continue }
                    let ok = sha256(u) { v in self.evento("verificacao", ["id": m.id, "nome": m.nome, "pct": v]) } == m.sha256
                    var apagado = false
                    if !ok && m.id != atual.id { apagado = (try? FileManager.default.removeItem(at: u)) != nil }
                    r.append(["id": m.id, "nome": m.nome, "ok": ok, "apagado": apagado])
                }
                _ = ativa
                return r
            }.value
        case "notificar":   // resposta pronta com a janela em segundo plano (avisar só mostra se o app não está ativo)
            avisar(a["titulo"] as? String ?? "Própons IA", a["texto"] as? String ?? "")
            return true
        case "visao":
            if baixandoId != nil || trocando { throw erro("espere o download ou a troca atual terminar") }
            let ligar = a["ligar"] as? Bool ?? false
            Task { await ligarVisao(ligar) }; return true
        case "apagarVisao":
            let m = try modeloDe(a)
            if visaoAtiva && m.id == modelo.id { throw erro("a visão deste modelo está em uso; desligue a visão antes de apagar") }
            try? fm.removeItem(at: pastaModelos.appendingPathComponent(m.visao().arquivo)); return true
        case "usarVoz": _ = try vozDe(a); var c = lerConfig(); c["voz"] = a["id"]; salvarConfig(c); return true
        case "apagarVoz":
            let v = try vozDe(a); if baixandoId == v.id { throw erro("cancele o download antes de apagar") }
            try? fm.removeItem(at: pastaModelos.appendingPathComponent(v.arquivo)); try? fm.removeItem(at: pastaModelos.appendingPathComponent(v.arquivo + ".baixando")); return true
        case "audioInicio":
            let ext = ["wav", "mp3", "m4a", "ogg", "flac"].contains(a["ext"] as? String ?? "") ? a["ext"] as! String : "wav"
            let id = UUID().uuidString, u = fm.temporaryDirectory.appendingPathComponent("propons-audio-\(id).\(ext)")
            fm.createFile(atPath: u.path, contents: nil); audios[id] = u; return id
        case "audioParte":
            guard let id = a["id"] as? String, let u = audios[id], let d = Data(base64Encoded: a["dados"] as? String ?? "") else { throw erro("áudio desconhecido") }
            let h = try FileHandle(forWritingTo: u); try h.seekToEnd(); try h.write(contentsOf: d); try h.close()
            if tamanho(u) > 200 << 20 { throw erro("áudio grande demais") }
            return true
        case "transcrever":
            guard let id = a["id"] as? String, let u = audios.removeValue(forKey: id) else { throw erro("áudio desconhecido") }
            defer { try? fm.removeItem(at: u); try? fm.removeItem(atPath: u.path + ".txt") }
            return try await transcrever(u)
        case "salvarArquivo":
            let p = NSSavePanel(); p.nameFieldStringValue = a["nome"] as? String ?? "arquivo.txt"
            p.directoryURL = fm.urls(for: .documentDirectory, in: .userDomainMask).first
            guard p.runModal() == .OK, let u = p.url else { return false }
            let txt = a["conteudo"] as? String ?? ""
            if a["base64"] as? Bool == true, let d = Data(base64Encoded: txt) { try d.write(to: u) }
            else { try txt.write(to: u, atomically: true, encoding: .utf8) }
            return true
        case "atualizar": return try await atualizar(a["versao"] as? String ?? "")
        default: throw erro("ação desconhecida: \(acao)")
        }
    }

    // baixa uma página da internet como texto (limite de tempo e de tamanho; só http/https)
    func paginaDaWeb(_ endereco: String) async throws -> String {
        guard let u = URL(string: endereco), ["http", "https"].contains(u.scheme ?? "") else { throw erro("endereço inválido") }
        var req = URLRequest(url: u, timeoutInterval: 15)
        req.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) ProponsIA/(VERSAO)", forHTTPHeaderField: "User-Agent")
        req.setValue("pt-BR,pt;q=0.9,en;q=0.6", forHTTPHeaderField: "Accept-Language")
        req.setValue("text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5", forHTTPHeaderField: "Accept")
        let (d, _) = try await URLSession.shared.data(for: req)
        let corte = d.count > 500_000 ? d.prefix(500_000) : d[...]
        return String(decoding: corte, as: UTF8.self)
    }

    // MARK: conversas (com .bak)
    var arquivoConversas: URL { pastaDados.appendingPathComponent("conversas.json") }
    func carregarConversas() -> String {
        for u in [arquivoConversas, arquivoConversas.appendingPathExtension("bak")] {
            if let d = try? Data(contentsOf: u), (try? JSONSerialization.jsonObject(with: d)) != nil { return String(decoding: d, as: UTF8.self) }
        }
        return fm.fileExists(atPath: arquivoConversas.path) ? "{corrompido" : "[]"
    }
    func salvarConversas(_ s: String) throws {
        let bak = arquivoConversas.appendingPathExtension("bak")
        if fm.fileExists(atPath: arquivoConversas.path) { try? fm.removeItem(at: bak); try? fm.copyItem(at: arquivoConversas, to: bak) }
        try Data(s.utf8).write(to: arquivoConversas, options: .atomic)
    }

    // MARK: sistema
    func sysctlTexto(_ n: String) -> String {
        var t = 0; sysctlbyname(n, nil, &t, nil, 0); guard t > 0 else { return "" }
        var b = [CChar](repeating: 0, count: t); sysctlbyname(n, &b, &t, nil, 0); return String(cString: b)
    }
    func ramLivre() -> Int64 {
        var st = vm_statistics64(); var n = mach_msg_type_number_t(MemoryLayout<vm_statistics64>.size / MemoryLayout<integer_t>.size)
        let r = withUnsafeMutablePointer(to: &st) { $0.withMemoryRebound(to: integer_t.self, capacity: Int(n)) { host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &n) } }
        guard r == KERN_SUCCESS else { return 0 }
        return Int64(st.free_count + st.inactive_count) * Int64(vm_kernel_page_size)
    }
    func sistema() -> [String: Any] {
        let cpu = sysctlTexto("machdep.cpu.brand_string")
        var modelos: [[String: Any]] = []
        for m in Modelo.todos {
            var d: [String: Any] = ["id": m.id, "nome": m.nome, "descricao": m.descricao, "arquivo": m.arquivo]
            d["tamanho"] = m.tamanho; d["ramMin"] = m.ramMin
            d["baixado"] = acharModelo(m) != nil; d["atual"] = m.id == modelo.id
            d["visaoTamanho"] = m.visaoTamanho; d["visaoBaixada"] = acharModelo(m.visao()) != nil
            modelos.append(d)
        }
        let atualVoz = vozAtual()
        var vozes: [[String: Any]] = []
        for v in Modelo.vozes {
            var d: [String: Any] = ["id": v.id, "nome": v.nome, "descricao": v.descricao]
            d["tamanho"] = v.tamanho; d["baixado"] = acharModelo(v) != nil; d["atual"] = v.id == atualVoz.id
            vozes.append(d)
        }
        let v = ProcessInfo.processInfo.operatingSystemVersion
        var s: [String: Any] = [:]
        s["ramTotal"] = Int64(ram); s["ramLivre"] = ramLivre()
        s["cpu"] = cpu.isEmpty ? sysctlTexto("hw.model") : cpu; s["nucleos"] = ProcessInfo.processInfo.activeProcessorCount
        s["discoLivre"] = livre(); s["pastaDados"] = pastaDados.path; s["pastaModelos"] = pastaModelos.path
        s["so"] = "macOS \(v.majorVersion).\(v.minorVersion).\(v.patchVersion) · " + sysctlTexto("hw.model")
        s["versao"] = VERSAO; s["modelos"] = modelos; s["vozes"] = vozes
        s["visaoLigada"] = visaoLigada(); s["visaoAtiva"] = visaoAtiva; s["temVisao"] = true
        s["temTranscricao"] = fm.isExecutableFile(atPath: recursos.appendingPathComponent("voz/whisper-cli").path)
        return s
    }

    // MARK: transcrição (whisper-cli)
    func transcrever(_ arq: URL) async throws -> [String: Any] {
        let voz = vozAtual()
        guard let modeloVoz = acharModelo(voz) else { throw erro("a voz \(voz.nome) não está baixada") }
        let exe = recursos.appendingPathComponent("voz/whisper-cli")
        guard fm.isExecutableFile(atPath: exe.path) else { throw erro("transcrição não disponível nesta versão") }
        let p = Process(); p.executableURL = exe
        p.arguments = ["-m", modeloVoz.path, "-f", arq.path, "-l", "pt", "-pp", "-mc", "0", "-t", "\(max(1, min(8, ProcessInfo.processInfo.activeProcessorCount / 2)))", "-otxt", "-of", arq.path]
        let tubo = Pipe(); p.standardError = tubo; p.standardOutput = FileHandle.nullDevice
        p.qualityOfService = .utility
        tubo.fileHandleForReading.readabilityHandler = { [weak self] h in
            guard let s = String(data: h.availableData, encoding: .utf8) else { return }
            if let r = s.range(of: #"progress\s*=\s*(\d+)%"#, options: .regularExpression) {
                let n = Double(s[r].filter(\.isNumber)) ?? 0
                self?.evento("transcricao", ["pct": n / 100])
            }
        }
        manterAcordado(true); defer { manterAcordado(false) }
        let t0 = Date()
        try p.run()
        await withCheckedContinuation { c in DispatchQueue.global().async { p.waitUntilExit(); c.resume() } }
        tubo.fileHandleForReading.readabilityHandler = nil
        guard let txt = try? String(contentsOfFile: arq.path + ".txt", encoding: .utf8) else { throw erro("não foi possível transcrever este áudio") }
        let texto = txt.replacingOccurrences(of: "\r", with: "").components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " ")
        return ["texto": texto, "segundos": Date().timeIntervalSince(t0)]
    }

    // MARK: atualização: baixa o .zip do Mac da release, confere com o SHA256SUMS, troca o app e abre de novo
    func atualizar(_ versao: String) async throws -> Any {
        guard versao.range(of: #"^\d{1,3}\.\d{1,3}\.\d{1,3}$"#, options: .regularExpression) != nil else { throw erro("versão inválida") }
        let base = "https://github.com/\(REPO)/releases/download/v\(versao)/"
        let (dSomas, _) = try await URLSession.shared.data(from: URL(string: base + "SHA256SUMS")!)
        var esperado = ""
        for linha in String(decoding: dSomas, as: UTF8.self).components(separatedBy: "\n") {
            let partes = linha.components(separatedBy: CharacterSet(charactersIn: " *")).filter { !$0.isEmpty }
            if partes.count == 2 && partes[1] == "Propons-IA-Mac.zip" { esperado = partes[0].lowercased() }
        }
        if esperado.isEmpty { throw erro("a versão \(versao) não tem o app do Mac") }
        let pasta = fm.temporaryDirectory.appendingPathComponent("propons-atualizacao-\(versao)", isDirectory: true)
        try? fm.removeItem(at: pasta); try fm.createDirectory(at: pasta, withIntermediateDirectories: true)
        let zip = pasta.appendingPathComponent("Propons-IA-Mac.zip")
        manterAcordado(true); defer { manterAcordado(false) }
        var ultimo = Date.distantPast
        let b = Baixador { [weak self] feito, total in
            guard Date().timeIntervalSince(ultimo) > 0.25 else { return }; ultimo = Date()
            self?.evento("atualizacao", ["fase": "baixando", "pct": total > 0 ? Double(feito) / Double(total) : 0, "feito": feito, "total": total])
        }
        try await b.baixar(URL(string: base + "Propons-IA-Mac.zip")!, para: zip, desde: 0)
        evento("atualizacao", ["fase": "verificando", "pct": 1])
        guard sha256(zip) == esperado else { throw erro("o arquivo baixado veio com defeito. Tente de novo.") }
        let x = Process(); x.executableURL = URL(fileURLWithPath: "/usr/bin/ditto"); x.arguments = ["-x", "-k", zip.path, pasta.path]
        try x.run(); x.waitUntilExit()
        guard let novo = try fm.contentsOfDirectory(at: pasta, includingPropertiesForKeys: nil).first(where: { $0.pathExtension == "app" }) else { throw erro("pacote da atualização incompleto") }
        evento("atualizacao", ["fase": "instalando", "pct": 1])
        let alvo = Bundle.main.bundleURL.path
        let q = { (s: String) in "'" + s.replacingOccurrences(of: "'", with: "'\\''") + "'" }
        let script = """
        while kill -0 \(ProcessInfo.processInfo.processIdentifier) 2>/dev/null; do sleep 0.3; done
        rm -rf \(q(alvo + ".antigo")); mv \(q(alvo)) \(q(alvo + ".antigo")) && ditto \(q(novo.path)) \(q(alvo)) && rm -rf \(q(alvo + ".antigo")) || mv \(q(alvo + ".antigo")) \(q(alvo))
        xattr -dr com.apple.quarantine \(q(alvo)) 2>/dev/null
        open \(q(alvo))
        """
        let s = Process(); s.executableURL = URL(fileURLWithPath: "/bin/bash"); s.arguments = ["-c", script]
        try s.run()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { NSApp.terminate(nil) }
        return true
    }

    // MARK: envio para a página
    func enviar(_ obj: [String: Any]) {
        guard let d = try? JSONSerialization.data(withJSONObject: obj), let s = String(data: d, encoding: .utf8) else { return }
        js("window.__proponsMsg && window.__proponsMsg(\(s))")
    }
    func responder(_ id: Any?, _ dados: Any) { enviar(["t": "resposta", "id": id ?? NSNull(), "ok": true, "dados": dados]) }
    func erroPonte(_ id: Any?, _ msg: String) { enviar(["t": "resposta", "id": id ?? NSNull(), "ok": false, "erro": msg]) }
    func evento(_ nome: String, _ dados: [String: Any]) { enviar(["t": "evento", "nome": nome, "dados": dados]) }
    func js(_ codigo: String) { DispatchQueue.main.async { self.web.evaluateJavaScript(codigo, completionHandler: nil) } }
    func jsonTexto(_ s: String) -> String { (try? JSONSerialization.data(withJSONObject: [s])).flatMap { String(data: $0, encoding: .utf8) }.map { String($0.dropFirst().dropLast()) } ?? "\"\"" }

    // MARK: navegação, arquivos, permissões e diálogos
    func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = a.request.url, ["http", "https"].contains(u.scheme ?? ""), u.host != "127.0.0.1" { NSWorkspace.shared.open(u); decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
    func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration, for a: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let u = a.request.url { NSWorkspace.shared.open(u) }; return nil
    }
    func webView(_ w: WKWebView, runOpenPanelWith p: WKOpenPanelParameters, initiatedByFrame f: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let o = NSOpenPanel(); o.allowsMultipleSelection = p.allowsMultipleSelection; o.canChooseDirectories = false
        o.beginSheetModal(for: janela) { r in completionHandler(r == .OK ? o.urls : nil) }
    }
    @available(macOS 12.0, *)
    func webView(_ w: WKWebView, requestMediaCapturePermissionFor origem: WKSecurityOrigin, initiatedByFrame f: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(origem.host == "127.0.0.1" ? .grant : .deny)   // webcam e microfone só para a página do próprio app
    }
    func webView(_ w: WKWebView, runJavaScriptAlertPanelWithMessage m: String, initiatedByFrame f: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = NSAlert(); a.messageText = m; a.runModal(); completionHandler()
    }
    func webView(_ w: WKWebView, runJavaScriptConfirmPanelWithMessage m: String, initiatedByFrame f: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert(); a.messageText = m; a.addButton(withTitle: "OK"); a.addButton(withTitle: "Cancelar"); completionHandler(a.runModal() == .alertFirstButtonReturn)
    }

    // MARK: autoteste (CI): responde uma pergunta, roda o Diagnóstico, grava o resultado e fecha
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
        guard let saida = autoteste, !naSplash, w.url?.host == "127.0.0.1" else { return }
        autoteste = nil
        let codigo = """
        for (let i = 0; i < 600 && !online; i++) await new Promise(r => setTimeout(r, 500));
        let resposta = '';
        const g = await PLATAFORMA.gerar([{ role: 'user', content: 'Quanto é 7 vezes 8? Responda só com o número.' }], { temperatura: 0, maxTokens: 16 }, t => resposta += t);
        abrirConfig('diagnostico'); await new Promise(r => setTimeout(r, 700)); await rodarDiagnostico();
        const s = await PLATAFORMA.sistema();
        return JSON.stringify({ tipo: PLATAFORMA.tipo, online, resposta, velocidade: g && g.timings && g.timings.predicted_per_second, diagnostico: window.__diagnostico, sistema: s });
        """
        web.callAsyncJavaScript(codigo, arguments: [:], in: nil, in: .page) { r in
            switch r {
            case .success(let v): self.gravarAutoteste(["resultado": v as? String ?? ""])
            case .failure(let e): self.gravarAutoteste(["erro": e.localizedDescription])
            }
        }
    }
    func gravarAutoteste(_ d: [String: Any]) {
        guard let saida = ProcessInfo.processInfo.environment["PROPONS_AUTOTESTE"] else { return }
        if let j = try? JSONSerialization.data(withJSONObject: d) { try? j.write(to: URL(fileURLWithPath: saida)) }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { NSApp.terminate(nil) }
    }
}

// menu mínimo (copiar/colar/sair funcionam com os atalhos do Mac)
func montarMenu() {
    let barra = NSMenu()
    let app = NSMenuItem(); barra.addItem(app)
    let ma = NSMenu(); ma.addItem(withTitle: "Esconder a Própons IA", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
    ma.addItem(.separator()); ma.addItem(withTitle: "Sair da Própons IA", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"); app.submenu = ma
    let editar = NSMenuItem(); barra.addItem(editar)
    let me = NSMenu(title: "Editar")
    me.addItem(withTitle: "Desfazer", action: Selector(("undo:")), keyEquivalent: "z")
    me.addItem(withTitle: "Refazer", action: Selector(("redo:")), keyEquivalent: "Z")
    me.addItem(.separator())
    me.addItem(withTitle: "Recortar", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
    me.addItem(withTitle: "Copiar", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
    me.addItem(withTitle: "Colar", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
    me.addItem(withTitle: "Selecionar tudo", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
    editar.submenu = me
    NSApp.mainMenu = barra
}

let aplicativo = NSApplication.shared
let delegado = App()
aplicativo.delegate = delegado
aplicativo.setActivationPolicy(.regular)
montarMenu()
aplicativo.run()
