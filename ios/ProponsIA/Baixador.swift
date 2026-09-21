import Foundation

/// Baixa um arquivo grande em blocos (não byte a byte), continuando de onde parou (cabeçalho Range).
final class Baixador: NSObject, URLSessionDataDelegate {
    private var handle: FileHandle?
    private var arquivo: URL!
    private var feito: Int64 = 0
    private var codigo = 0
    private var cont: CheckedContinuation<Void, Error>?
    private var tarefa: URLSessionDataTask?
    private let progresso: (Int64) -> Void

    init(progresso: @escaping (Int64) -> Void) { self.progresso = progresso }

    func baixar(_ url: URL, para arquivo: URL, desde: Int64) async throws {
        self.arquivo = arquivo
        feito = desde
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 60
        cfg.waitsForConnectivity = false
        let sessao = URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
        defer { sessao.finishTasksAndInvalidate() }
        var req = URLRequest(url: url)
        req.setValue("ProponsIA-iOS", forHTTPHeaderField: "User-Agent")
        if desde > 0 { req.setValue("bytes=\(desde)-", forHTTPHeaderField: "Range") }
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Error>) in
            self.cont = c
            let t = sessao.dataTask(with: req); self.tarefa = t; t.resume()
        }
    }

    /// "Cancelar download" na tela de modelos
    func cancelar() { tarefa?.cancel() }

    func urlSession(_ s: URLSession, dataTask: URLSessionDataTask, didReceive resp: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        codigo = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200...299).contains(codigo) else { completionHandler(.cancel); return }
        do {
            if !FileManager.default.fileExists(atPath: arquivo.path) { FileManager.default.createFile(atPath: arquivo.path, contents: nil) }
            let h = try FileHandle(forWritingTo: arquivo)
            if codigo == 206 { try h.seekToEnd() } else { try h.truncate(atOffset: 0); feito = 0 }
            handle = h
            completionHandler(.allow)
        } catch { completionHandler(.cancel) }
    }

    func urlSession(_ s: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        do { try handle?.write(contentsOf: data) } catch { dataTask.cancel(); return }
        feito += Int64(data.count)
        progresso(feito)
    }

    func urlSession(_ s: URLSession, task: URLSessionTask, didCompleteWithError e: Error?) {
        try? handle?.close(); handle = nil
        if let e = e { cont?.resume(throwing: e) }
        else if !(200...299).contains(codigo) { cont?.resume(throwing: URLError(.badServerResponse)) }
        else { cont?.resume() }
        cont = nil
    }
}
