import Foundation

// Carrega o modelo, gera uma resposta, testa a continuação e mede a velocidade. Sai com código 1 se algo falhar.
let args = CommandLine.arguments
guard args.count > 1 else { print("uso: TesteMotor <modelo.gguf>"); exit(2) }
var falhas = 0
func confere(_ nome: String, _ ok: Bool, _ det: String = "") { print(ok ? "  ✔" : "  ✘", nome, det.isEmpty ? "" : "— \(det.prefix(200))"); if !ok { falhas += 1 } }

let motor = Motor()
let t0 = Date()
do { try motor.carregar(caminho: args[1], gpu: false, contexto: 4096) } catch { print("falhou ao carregar:", error); exit(1) }
confere("modelo carregado", motor.carregado, String(format: "%.1f s", Date().timeIntervalSince(t0)))

let fmt = motor.formatar([("system", "Seja breve."), ("user", "oi")], adicionarAssistente: true)
confere("modelo de chat aplicado", fmt.contains("oi") && fmt.contains("assistant"), fmt.replacingOccurrences(of: "\n", with: "⏎"))

var texto = ""
do {
    let r = try motor.gerar([("user", "Qual é a capital do Brasil? Responda em uma frase.")], maxTokens: 60, temperatura: 0, continuar: false) { texto += $0 }
    confere("gerou resposta", !texto.isEmpty, texto)
    confere("fala de Brasília", texto.lowercased().contains("bras"), texto)
    print(String(format: "     velocidade: %.1f tokens/s gerando, %.0f tokens/s lendo (%d tokens, fim=%@)", r.geracaoTPS, r.leituraTPS, r.tokens, r.fim))
} catch { confere("gerou resposta", false, "\(error)") }

var cont = ""
do {
    let parcial = "1. Mercúrio\n2. Vênus\n3. Terra\n4."
    _ = try motor.gerar([("user", "Liste os planetas do sistema solar em ordem, um por linha, numerados."), ("assistant", parcial)],
                        maxTokens: 40, temperatura: 0, continuar: true) { cont += $0 }
    confere("continuação segue do ponto certo", !cont.contains("1. Mercúrio") && cont.lowercased().contains("marte"), cont)
} catch { confere("continuação", false, "\(error)") }

// um token pode trazer só metade de um caractere acentuado: "a" + primeiro byte de "ã" (0xC3)
var utf: [UInt8] = [0x61, 0xC3]
let parte = Motor.extrairUTF8(&utf)
utf += [0xA3]                                     // chega a outra metade no próximo token
let resto = Motor.extrairUTF8(&utf)
confere("UTF-8 cortado ao meio", parte == "a" && resto == "ã" && utf.isEmpty, parte + "|" + resto)

print(falhas == 0 ? "todos os testes do motor passaram" : "\(falhas) falha(s)")
exit(falhas == 0 ? 0 : 1)
