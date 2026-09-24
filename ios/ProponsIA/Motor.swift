import Foundation
import llama

/// Motor da IA dentro do app (o iOS não permite rodar um servidor separado).
/// Usa o llama.cpp (llama.xcframework, b11070): carrega o GGUF, aplica o modelo de chat do próprio arquivo
/// e gera tokens em streaming. Toda chamada roda na fila `fila` (uma geração por vez).
final class Motor {
    enum Erro: LocalizedError {
        case modelo, contexto, prompt, decodificar
        var errorDescription: String? {
            switch self {
            case .modelo: return "Não foi possível carregar o modelo (memória insuficiente?)"
            case .contexto: return "Não foi possível preparar a IA (memória insuficiente?)"
            case .prompt: return "A conversa ficou longa demais para a memória da IA"
            case .decodificar: return "Falha ao processar o texto"
            }
        }
    }

    struct Resultado { var fim: String; var tokens: Int; var geracaoTPS: Double; var leituraTPS: Double }

    let fila = DispatchQueue(label: "propons.motor", qos: .userInitiated)
    private var model: OpaquePointer?
    private var ctx: OpaquePointer?
    private var vocab: OpaquePointer?
    private var parar = false
    private(set) var nCtx: Int32 = 4096
    private(set) var caminho: String?
    var carregado: Bool { ctx != nil }

    init() { llama_backend_init() }
    deinit { descarregar() }

    func pedirParada() { parar = true }

    func descarregar() {
        if let c = ctx { llama_free(c) }
        if let m = model { llama_model_free(m) }
        ctx = nil; model = nil; vocab = nil; caminho = nil
    }

    /// Carrega um GGUF. gpu=true usa Metal (iPhone/Mac); no simulador use false.
    /// Sem o interface/motor.json (não deveria acontecer: vai no pacote), o menor degrau do celular.
    static let contextoPadrao: Int32 = 4096
    func carregar(caminho: String, gpu: Bool, contexto: Int32) throws {
        descarregar()
        var mp = llama_model_default_params()
        mp.n_gpu_layers = gpu ? 99 : 0
        guard let m = llama_model_load_from_file(caminho, mp) else { throw Erro.modelo }
        var cp = llama_context_default_params()
        cp.n_ctx = UInt32(contexto)
        cp.n_batch = 512
        cp.n_ubatch = 512
        let nucleos = ProcessInfo.processInfo.activeProcessorCount
        let threads = Int32(max(1, min(nucleos - 2, 4)))
        cp.n_threads = threads
        cp.n_threads_batch = threads
        guard let c = llama_init_from_model(m, cp) else { llama_model_free(m); throw Erro.contexto }
        model = m; ctx = c; vocab = llama_model_get_vocab(m)
        nCtx = contexto; self.caminho = caminho
    }

    /// Formata a conversa com o modelo de chat embutido no GGUF (ChatML no Qwen). Sem modelo reconhecido, usa ChatML.
    func formatar(_ msgs: [(papel: String, texto: String)], adicionarAssistente: Bool) -> String {
        let tmpl = llama_model_chat_template(model, nil)
        var ptrs: [UnsafeMutablePointer<CChar>] = []
        var cmsgs: [llama_chat_message] = []
        for m in msgs {
            let r = strdup(m.papel)!, c = strdup(m.texto)!
            ptrs.append(r); ptrs.append(c)
            cmsgs.append(llama_chat_message(role: UnsafePointer(r), content: UnsafePointer(c)))
        }
        defer { ptrs.forEach { free($0) } }
        var tamanho = Int32(8192 + msgs.reduce(0) { $0 + $1.texto.utf8.count } * 2)
        var buf = [CChar](repeating: 0, count: Int(tamanho))
        var n = llama_chat_apply_template(tmpl, &cmsgs, cmsgs.count, adicionarAssistente, &buf, tamanho)
        if n > tamanho {
            tamanho = n + 1; buf = [CChar](repeating: 0, count: Int(tamanho))
            n = llama_chat_apply_template(tmpl, &cmsgs, cmsgs.count, adicionarAssistente, &buf, tamanho)
        }
        var saida: String
        if n < 0 {
            saida = msgs.map { "<|im_start|>\($0.papel)\n\($0.texto)<|im_end|>\n" }.joined()
            if adicionarAssistente { saida += "<|im_start|>assistant\n" }
        } else {
            saida = buf.withUnsafeBufferPointer { p in String(decoding: UnsafeRawBufferPointer(start: p.baseAddress, count: Int(n)), as: UTF8.self) }
        }
        // Qwen3/3.5: resposta direta, sem "pensar" (equivale a enable_thinking=false)
        if adicionarAssistente, let t = tmpl, String(cString: t).contains("<think>") { saida += "<think>\n\n</think>\n\n" }
        return saida
    }

    private func tokenizar(_ texto: String) -> [llama_token] {
        let bytes = Int32(texto.utf8.count)
        var toks = [llama_token](repeating: 0, count: Int(bytes) + 8)
        var n = llama_tokenize(vocab, texto, bytes, &toks, Int32(toks.count), true, true)
        if n < 0 { toks = [llama_token](repeating: 0, count: Int(-n)); n = llama_tokenize(vocab, texto, bytes, &toks, Int32(toks.count), true, true) }
        return Array(toks.prefix(Int(max(n, 0))))
    }

    private func pedaco(_ tok: llama_token) -> [UInt8] {
        var buf = [CChar](repeating: 0, count: 64)
        var n = llama_token_to_piece(vocab, tok, &buf, Int32(buf.count), 0, false)
        if n < 0 { buf = [CChar](repeating: 0, count: Int(-n)); n = llama_token_to_piece(vocab, tok, &buf, Int32(buf.count), 0, false) }
        return buf.prefix(Int(max(n, 0))).map { UInt8(bitPattern: $0) }
    }

    /// Gera uma resposta. `continuar`: a última mensagem é uma resposta cortada da IA e o texto segue dela.
    func gerar(_ msgs: [(papel: String, texto: String)], maxTokens: Int, temperatura: Float, continuar: Bool,
               aoTexto: (String) -> Void) throws -> Resultado {
        guard let ctx = ctx, let vocab = vocab else { throw Erro.contexto }
        parar = false
        var prompt: String
        if continuar, let ultima = msgs.last, ultima.papel == "assistant" {
            prompt = formatar(Array(msgs.dropLast()), adicionarAssistente: true) + ultima.texto
        } else {
            prompt = formatar(msgs, adicionarAssistente: true)
        }
        var toks = tokenizar(prompt)
        let limite = Int(nCtx) - maxTokens - 8
        if toks.count > limite {
            guard limite > 256 else { throw Erro.prompt }
            toks = Array(toks.suffix(limite))               // corta o começo se a conversa for longa demais
        }
        llama_memory_clear(llama_get_memory(ctx), true)

        let t0 = Date()
        var i = 0
        while i < toks.count {
            let n = min(512, toks.count - i)
            var fatia = Array(toks[i..<(i + n)])
            let r = fatia.withUnsafeMutableBufferPointer { p in llama_decode(ctx, llama_batch_get_one(p.baseAddress, Int32(n))) }
            if r != 0 { throw Erro.decodificar }
            i += n
            if parar { return Resultado(fim: "stop", tokens: 0, geracaoTPS: 0, leituraTPS: 0) }
        }
        let tLeitura = Date().timeIntervalSince(t0)

        let cadeia = llama_sampler_chain_init(llama_sampler_chain_default_params())
        defer { llama_sampler_free(cadeia) }
        llama_sampler_chain_add(cadeia, llama_sampler_init_penalties(llama_vocab_n_tokens(vocab), 64, 1.05, 0, 0))
        if temperatura <= 0.01 {
            llama_sampler_chain_add(cadeia, llama_sampler_init_greedy())
        } else {
            llama_sampler_chain_add(cadeia, llama_sampler_init_top_k(20))
            llama_sampler_chain_add(cadeia, llama_sampler_init_top_p(0.85, 1))
            llama_sampler_chain_add(cadeia, llama_sampler_init_temp(temperatura))
            llama_sampler_chain_add(cadeia, llama_sampler_init_dist(UInt32.random(in: 1...UInt32.max)))
        }

        var pendentes: [UInt8] = []
        var gerados = 0, fim = "length"
        let t1 = Date()
        while gerados < maxTokens {
            if parar { fim = "stop"; break }
            if toks.count + gerados >= Int(nCtx) - 1 { fim = "length"; break }
            var tok = llama_sampler_sample(cadeia, ctx, -1)
            if llama_vocab_is_eog(vocab, tok) { fim = "stop"; break }
            gerados += 1
            pendentes += pedaco(tok)
            let texto = Motor.extrairUTF8(&pendentes)
            if !texto.isEmpty { aoTexto(texto) }
            let r = withUnsafeMutablePointer(to: &tok) { p in llama_decode(ctx, llama_batch_get_one(p, 1)) }
            if r != 0 { throw Erro.decodificar }
        }
        if !pendentes.isEmpty { aoTexto(String(decoding: pendentes, as: UTF8.self)) }
        let tGeracao = Date().timeIntervalSince(t1)
        return Resultado(fim: fim, tokens: gerados,
                         geracaoTPS: tGeracao > 0 ? Double(gerados) / tGeracao : 0,
                         leituraTPS: tLeitura > 0 ? Double(toks.count) / tLeitura : 0)
    }

    /// Devolve o maior pedaço de UTF-8 válido (tokens podem cortar um caractere acentuado ou emoji ao meio).
    static func extrairUTF8(_ bytes: inout [UInt8]) -> String {
        for corte in 0...min(3, bytes.count) {
            let n = bytes.count - corte
            if let s = String(bytes: bytes[0..<n], encoding: .utf8) { bytes.removeFirst(n); return s }
        }
        let s = String(decoding: bytes, as: UTF8.self); bytes.removeAll(); return s
    }
}
