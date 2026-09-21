import Foundation
import UIKit
import UserNotifications

/// Downloads que continuam com a tela apagada ou com o app em segundo plano: quem baixa é o próprio iOS
/// (URLSession de fundo). Se o download cair, continua de onde parou (dados de retomada guardados no disco).
/// Ao terminar com o app fora da tela, avisa com uma notificação.
final class Baixador: NSObject, URLSessionDownloadDelegate {
    static let compartilhado = Baixador()
    static let identificador = "io.github.muurxdev.proponsia.downloads"

    /// o iOS acordou o app só para entregar o fim de um download (AppDelegate guarda isto e chamamos no final)
    var aoTerminarEventosDeFundo: (() -> Void)?

    private struct Pedido { let progresso: (Int64, Int64) -> Void; let cont: CheckedContinuation<Void, Error> }
    private var pedidos: [Int: Pedido] = [:]
    private var erros: [Int: Error] = [:]
    private let trava = NSLock()

    private lazy var sessao: URLSession = {
        let c = URLSessionConfiguration.background(withIdentifier: Baixador.identificador)
        c.isDiscretionary = false
        c.sessionSendsLaunchEvents = true
        c.allowsCellularAccess = true
        c.timeoutIntervalForResource = 60 * 60 * 24
        return URLSession(configuration: c, delegate: self, delegateQueue: nil)
    }()

    /// recria a sessão de fundo (quando o iOS reabre o app para terminar um download)
    func reconectar() { _ = sessao }

    private var pastaRetomada: URL {
        let u = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("retomada", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }
    private func arquivoRetomada(_ destino: URL) -> URL { pastaRetomada.appendingPathComponent(destino.lastPathComponent + ".retomada") }
    func esquecerRetomada(_ destino: URL) { try? FileManager.default.removeItem(at: arquivoRetomada(destino)) }

    /// baixa `url` para `destino` (substitui o arquivo quando termina). progresso(baixado, total)
    func baixar(_ url: URL, para destino: URL, progresso: @escaping (Int64, Int64) -> Void) async throws {
        let tarefas = await sessao.allTasks
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            // app reaberto com o download ainda rodando no iOS: só volta a acompanhar
            if let t = tarefas.first(where: { $0.taskDescription == destino.path && $0.state == .running }) {
                registrar(t.taskIdentifier, Pedido(progresso: progresso, cont: c)); return
            }
            tarefas.filter { $0.taskDescription == destino.path }.forEach { $0.cancel() }
            let t: URLSessionDownloadTask
            if let dados = try? Data(contentsOf: arquivoRetomada(destino)) {
                t = sessao.downloadTask(withResumeData: dados)
                esquecerRetomada(destino)
            } else {
                var req = URLRequest(url: url)
                req.setValue("ProponsIA-iOS", forHTTPHeaderField: "User-Agent")
                t = sessao.downloadTask(with: req)
            }
            t.taskDescription = destino.path
            registrar(t.taskIdentifier, Pedido(progresso: progresso, cont: c))
            t.resume()
        }
    }

    /// "Cancelar download": para e guarda o ponto para continuar depois
    func cancelar() {
        sessao.getAllTasks { tarefas in
            for t in tarefas {
                guard let d = t as? URLSessionDownloadTask, let p = t.taskDescription else { t.cancel(); continue }
                d.cancel(byProducingResumeData: { dados in
                    if let dados = dados { try? dados.write(to: self.arquivoRetomada(URL(fileURLWithPath: p))) }
                })
            }
        }
    }

    private func registrar(_ id: Int, _ p: Pedido) { trava.lock(); pedidos[id] = p; trava.unlock() }
    private func pedido(_ id: Int) -> Pedido? { trava.lock(); defer { trava.unlock() }; return pedidos[id] }

    // MARK: URLSessionDownloadDelegate
    func urlSession(_ s: URLSession, downloadTask t: URLSessionDownloadTask, didWriteData _: Int64, totalBytesWritten feito: Int64, totalBytesExpectedToWrite total: Int64) {
        pedido(t.taskIdentifier)?.progresso(feito, total)
    }

    func urlSession(_ s: URLSession, downloadTask t: URLSessionDownloadTask, didFinishDownloadingTo local: URL) {
        let codigo = (t.response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200...299).contains(codigo), let p = t.taskDescription else {
            trava.lock(); erros[t.taskIdentifier] = URLError(.badServerResponse); trava.unlock(); return
        }
        // o arquivo temporário some quando este método termina: move já
        let destino = URL(fileURLWithPath: p)
        do {
            try? FileManager.default.removeItem(at: destino)
            try FileManager.default.moveItem(at: local, to: destino)
            esquecerRetomada(destino)
        } catch { trava.lock(); erros[t.taskIdentifier] = error; trava.unlock() }
    }

    func urlSession(_ s: URLSession, task t: URLSessionTask, didCompleteWithError e: Error?) {
        if let e = e as NSError?, let dados = e.userInfo[NSURLSessionDownloadTaskResumeData] as? Data, let p = t.taskDescription {
            try? dados.write(to: arquivoRetomada(URL(fileURLWithPath: p)))
        }
        trava.lock()
        let pedido = pedidos.removeValue(forKey: t.taskIdentifier)
        let erroArquivo = erros.removeValue(forKey: t.taskIdentifier)
        trava.unlock()
        if let e = e ?? erroArquivo { pedido?.cont.resume(throwing: e) } else { pedido?.cont.resume() }
        // terminou com o app fora da tela (ou fechado pelo sistema): avisa
        if pedido == nil || !Baixador.appAtivo() {
            if e == nil && erroArquivo == nil { Baixador.notificar("IA baixada", "Abra a Própons IA para começar a usar.") }
            else if (e as NSError?)?.code != NSURLErrorCancelled { Baixador.notificar("O download parou", "Abra a Própons IA para continuar de onde parou.") }
        }
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession s: URLSession) {
        DispatchQueue.main.async { self.aoTerminarEventosDeFundo?(); self.aoTerminarEventosDeFundo = nil }
    }

    // MARK: notificações
    static func pedirPermissao() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }
    static func notificar(_ titulo: String, _ texto: String) {
        let c = UNMutableNotificationContent(); c.title = titulo; c.body = texto; c.sound = .default
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "download", content: c, trigger: nil))
    }
    static func appAtivo() -> Bool {
        if Thread.isMainThread { return UIApplication.shared.applicationState == .active }
        return DispatchQueue.main.sync { UIApplication.shared.applicationState == .active }
    }
}

/// Recebe do iOS o aviso de que um download de fundo terminou enquanto o app estava fechado.
final class Delegado: NSObject, UIApplicationDelegate {
    func application(_ a: UIApplication, handleEventsForBackgroundURLSession id: String, completionHandler: @escaping () -> Void) {
        guard id == Baixador.identificador else { completionHandler(); return }
        Baixador.compartilhado.aoTerminarEventosDeFundo = completionHandler
        Baixador.compartilhado.reconectar()
    }
}
