package io.github.muurxdev.proponsia

import android.annotation.SuppressLint
import android.app.Activity
import android.app.ActivityManager
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.AtomicFile
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.URL
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.Executors
import kotlin.concurrent.thread

/**
 * Própons IA para Android.
 * A mesma interface web (assets/interface) roda numa WebView. O motor é o llama-server do llama.cpp
 * (empacotado como libllama_server.so), executado como processo filho e acessado em http://127.0.0.1.
 * A página conversa com este código pela ponte "ProponsAndroid" ({t:'pedido', id, acao, args}).
 */
class MainActivity : Activity() {

    data class Modelo(val id: String, val nome: String, val descricao: String, val arquivo: String, val tamanho: Long, val sha256: String, val ramMin: Int) {
        val url get() = "https://huggingface.co/unsloth/${arquivo.removeSuffix("-Q4_K_M.gguf")}-GGUF/resolve/main/$arquivo"
    }

    private val modelos = listOf(
        Modelo("leve", "Leve (0.8B)", "mais rápido, para celulares com pouca memória", "Qwen3.5-0.8B-Q4_K_M.gguf", 532517120, "bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517", 3),
        Modelo("normal", "Normal (2B)", "equilíbrio entre velocidade e qualidade", "Qwen3.5-2B-Q4_K_M.gguf", 1280835840, "aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223", 6),
        Modelo("avancado", "Avançado (4B)", "respostas melhores, precisa de celular forte", "Qwen3.5-4B-Q4_K_M.gguf", 2740937888, "00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4", 8),
    )

    private lateinit var web: WebView
    private val ui = Handler(Looper.getMainLooper())
    private val trabalho = Executors.newSingleThreadExecutor()
    private var motor: Process? = null
    private var porta = 8765
    private val chave = ByteArray(18).also { SecureRandom().nextBytes(it) }.let { android.util.Base64.encodeToString(it, android.util.Base64.URL_SAFE or android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING) }
    private lateinit var modelo: Modelo
    @Volatile private var desligando = false
    @Volatile private var trocando = false
    private var naSplash = true
    private var aoTentar: (() -> Unit)? = null
    private var escolhaArquivos: ValueCallback<Array<Uri>>? = null
    private var salvarPendente: String? = null
    private var idSalvarPendente: Any? = null
    private val quedas = ArrayDeque<Long>()

    private val pastaDados by lazy { File(filesDir, "dados").apply { mkdirs() } }
    private val pastaModelos by lazy { File(filesDir, "modelos").apply { mkdirs() } }
    private val pastaInterface by lazy { File(filesDir, "interface") }
    private val prefs by lazy { getSharedPreferences("config", MODE_PRIVATE) }
    private val ramTotal by lazy { ActivityManager.MemoryInfo().also { (getSystemService(ACTIVITY_SERVICE) as ActivityManager).getMemoryInfo(it) }.totalMem }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        val raiz = FrameLayout(this).apply { addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)) }
        setContentView(raiz)
        aplicarMargens(raiz)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = true
            cacheMode = WebSettings.LOAD_NO_CACHE
            textZoom = 100
        }
        web.setBackgroundColor(if (escuro()) Color.parseColor("#17171B") else Color.WHITE)
        web.addJavascriptInterface(Ponte(), "ProponsAndroid")
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                val u = req.url
                if (u.host == "127.0.0.1" || u.scheme == "file" || u.scheme == "data" || u.scheme == "about") return false
                abrirLink(u.toString()); return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, cb: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                escolhaArquivos?.onReceiveValue(null)
                escolhaArquivos = cb
                val i = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
                    .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.mode == FileChooserParams.MODE_OPEN_MULTIPLE)
                return try { startActivityForResult(i, PEDIDO_ARQUIVOS); true } catch (e: Exception) { escolhaArquivos = null; false }
            }
        }
        aplicarTema(escuro())
        mostrarSplash()
        trabalho.execute { iniciar() }
    }

    // conteúdo abaixo da barra de status e acima do teclado/barra de navegação (Android 15 desenha "ponta a ponta")
    private fun aplicarMargens(v: View) {
        v.setOnApplyWindowInsetsListener { view, ins ->
            if (Build.VERSION.SDK_INT >= 30) {
                val b = ins.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.ime() or WindowInsets.Type.displayCutout())
                view.setPadding(b.left, b.top, b.right, b.bottom)
            } else {
                @Suppress("DEPRECATION") view.setPadding(ins.systemWindowInsetLeft, ins.systemWindowInsetTop, ins.systemWindowInsetRight, ins.systemWindowInsetBottom)
            }
            ins
        }
    }

    private fun escuro() = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    private fun aplicarTema(esc: Boolean) {
        val cor = if (esc) Color.parseColor("#17171B") else Color.WHITE
        @Suppress("DEPRECATION") run { window.statusBarColor = cor; window.navigationBarColor = cor }
        window.decorView.setBackgroundColor(cor)
        if (Build.VERSION.SDK_INT >= 30) {
            val claro = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            window.insetsController?.setSystemBarsAppearance(if (esc) 0 else claro, claro)
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = if (esc) 0 else (View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR)
        }
    }

    // ---------------- inicialização ----------------
    private fun iniciar() {
        try { copiarInterface() } catch (e: Exception) { splash(-2.0, "Não foi possível abrir", "Falha ao preparar os arquivos: ${e.message}"); return }
        modelo = modelos.firstOrNull { it.id == prefs.getString("modelo", null) } ?: if (ramTotal < 6L shl 30) modelos[0] else modelos[1]
        prepararModeloEMotor()
    }

    private fun copiarInterface() {
        val marca = File(pastaInterface, ".versao")
        val versao = packageManager.getPackageInfo(packageName, 0).let { if (Build.VERSION.SDK_INT >= 28) it.longVersionCode else @Suppress("DEPRECATION") it.versionCode.toLong() }
        if (marca.exists() && marca.readText() == "$versao") return
        pastaInterface.mkdirs()
        for (nome in assets.list("interface") ?: emptyArray()) assets.open("interface/$nome").use { i -> FileOutputStream(File(pastaInterface, nome)).use { i.copyTo(it) } }
        marca.writeText("$versao")
    }

    private fun prepararModeloEMotor() {
        while (true) {
            var arq = acharModelo(modelo)
            if (arq == null) {
                try { arq = baixar(modelo, true) } catch (e: Exception) {
                    val f = e.message ?: ""
                    splash(-2.0, tituloFalha(f), mensagemFalha(f)); esperarTentar(); continue
                }
            }
            splash(-1.0, "Iniciando", "")
            val erro = ligarMotor(arq)
            if (erro == null) { naSplash = false; ui.post { web.loadUrl("http://127.0.0.1:$porta/#k=$chave") }; return }
            splash(-2.0, "Não foi possível abrir a IA", erro); esperarTentar()
        }
    }

    private fun esperarTentar() {
        val trava = Object(); var ok = false
        aoTentar = { synchronized(trava) { ok = true; (trava as Object).notifyAll() } }
        synchronized(trava) { while (!ok) (trava as Object).wait() }
        splash(-1.0, "Tentando de novo", "")
    }

    private fun tituloFalha(f: String) = when (f) { "sem espaço" -> "Pouco espaço no celular"; "corrompido" -> "Download com defeito"; else -> "Sem conexão para baixar a IA" }
    private fun mensagemFalha(f: String) = when (f) {
        "sem espaço" -> "A IA precisa de cerca de ${(modelo.tamanho shr 20) + 400} MB livres no celular."
        "corrompido" -> "O arquivo baixado veio com defeito e foi descartado. Tente de novo."
        else -> "Na primeira vez é preciso internet (de preferência Wi-Fi). Verifique a conexão e tente de novo."
    }

    private fun acharModelo(m: Modelo): File? = File(pastaModelos, m.arquivo).takeIf { it.length() == m.tamanho }

    // download com retomada + verificação SHA-256
    private fun baixar(m: Modelo, splash: Boolean): File {
        val final = File(pastaModelos, m.arquivo); val parcial = File(pastaModelos, m.arquivo + ".baixando")
        if (pastaModelos.usableSpace < m.tamanho - parcial.length() + (400L shl 20)) throw Exception("sem espaço")
        var falhas = 0; var ultimo = 0L
        while (parcial.length() < m.tamanho) {
            val antes = parcial.length()
            try {
                val c = URL(m.url).openConnection() as HttpURLConnection
                c.connectTimeout = 30000; c.readTimeout = 30000; c.instanceFollowRedirects = true
                c.setRequestProperty("User-Agent", "ProponsIA-Android")
                if (antes > 0) c.setRequestProperty("Range", "bytes=$antes-")
                val continuar = antes > 0 && c.responseCode == 206
                if (c.responseCode !in 200..299) throw Exception("HTTP ${c.responseCode}")
                c.inputStream.use { ins ->
                    FileOutputStream(parcial, continuar).use { out ->
                        val buf = ByteArray(1 shl 20); var ja = if (continuar) antes else 0L
                        while (true) {
                            val n = ins.read(buf); if (n < 0) break
                            out.write(buf, 0, n); ja += n
                            val agora = System.currentTimeMillis()
                            if (agora - ultimo > 250) {
                                ultimo = agora; val v = ja.toDouble() / m.tamanho
                                if (splash) splash(v, "Baixando a IA", "Só na primeira vez · ${ja shr 20} de ${m.tamanho shr 20} MB")
                                else evento("download", JSONObject().put("pct", v).put("feito", ja).put("total", m.tamanho).put("nome", m.nome))
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                if (pastaModelos.usableSpace < (64L shl 20)) throw Exception("sem espaço")
                if (parcial.length() > antes) falhas = 0 else falhas++
                if (falhas >= 4) throw Exception("sem conexão")
                Thread.sleep(2000L * (falhas + 1))
            }
        }
        if (splash) splash(-1.0, "Verificando o download", "")
        val md = MessageDigest.getInstance("SHA-256")
        parcial.inputStream().use { i -> val b = ByteArray(1 shl 20); while (true) { val n = i.read(b); if (n < 0) break; md.update(b, 0, n) } }
        if (md.digest().joinToString("") { "%02x".format(it) } != m.sha256) { parcial.delete(); throw Exception("corrompido") }
        final.delete(); parcial.renameTo(final)
        return final
    }

    // ---------------- motor ----------------
    private fun portaLivre(): Int { for (p in 8765..8795) try { ServerSocket(p).close(); return p } catch (_: Exception) {}; return 8765 }

    private fun ligarMotor(arq: File): String? {
        if (motor == null) porta = portaLivre()
        val dir = applicationInfo.nativeLibraryDir
        val exe = File(dir, "libllama_server.so")
        val nucleos = Runtime.getRuntime().availableProcessors()
        val threads = if (nucleos >= 8) 4 else if (nucleos >= 4) nucleos / 2 + 1 else nucleos
        val pb = ProcessBuilder(exe.path, "-m", arq.path, "--host", "127.0.0.1", "--port", "$porta", "--path", pastaInterface.path,
            "-c", "4096", "-np", "1", "--cache-ram", "0", "-ctxcp", "2", "--reasoning", "off", "--reasoning-budget", "0",
            "--api-key", chave, "-t", "$threads")
        pb.environment()["LD_LIBRARY_PATH"] = dir
        pb.directory(filesDir); pb.redirectErrorStream(true); pb.redirectOutput(File(filesDir, "motor.log"))
        val p = try { pb.start() } catch (e: Exception) { return "O motor da IA não pôde ser iniciado: ${e.message}" }
        motor = p
        val inicio = System.currentTimeMillis()
        while (System.currentTimeMillis() - inicio < 180_000) {
            if (!p.isAlive) return "O motor da IA fechou sozinho. Pode ser falta de memória — tente o modelo Leve."
            if (saudavel()) { vigiar(p); return null }
            Thread.sleep(300)
        }
        return "A IA demorou demais para iniciar."
    }

    private fun saudavel(): Boolean = try {
        val c = URL("http://127.0.0.1:$porta/health").openConnection() as HttpURLConnection
        c.connectTimeout = 1500; c.readTimeout = 1500; val ok = c.responseCode == 200; c.disconnect(); ok
    } catch (_: Exception) { false }

    // vigia: se o motor cair (ex.: Android fechou o processo), religa na mesma porta
    private fun vigiar(p: Process) = thread(isDaemon = true) {
        try { p.waitFor() } catch (_: Exception) {}
        if (desligando || trocando || p !== motor) return@thread
        val agora = System.currentTimeMillis(); quedas.addLast(agora); while (quedas.isNotEmpty() && agora - quedas.first() > 180_000) quedas.removeFirst()
        if (quedas.size > 5) { evento("motor", JSONObject().put("estado", "erro").put("mensagem", "O motor está caindo repetidamente. Use o modelo Leve em Configurações.")); return@thread }
        evento("motor", JSONObject().put("estado", "reiniciando"))
        trabalho.execute {
            val arq = acharModelo(modelo) ?: return@execute
            val erro = ligarMotor(arq)
            evento("motor", if (erro == null) JSONObject().put("estado", "pronto").put("nome", modelo.nome) else JSONObject().put("estado", "erro").put("mensagem", erro))
        }
    }

    private fun pararMotor() { motor?.let { try { it.destroy(); it.waitFor() } catch (_: Exception) {} } }

    private fun trocarModelo(novo: Modelo) = trabalho.execute {
        if (trocando) return@execute
        trocando = true
        try {
            val antigo = modelo
            prefs.edit().putString("modelo", novo.id).apply(); modelo = novo
            if (acharModelo(novo) == null) {
                try { baixar(novo, false) } catch (e: Exception) {
                    modelo = antigo; prefs.edit().putString("modelo", antigo.id).apply()
                    evento("motor", JSONObject().put("estado", "erro").put("mensagem", mensagemFalha(e.message ?: ""))); return@execute
                }
            }
            evento("motor", JSONObject().put("estado", "trocando"))
            pararMotor()
            val erro = ligarMotor(acharModelo(novo)!!)
            evento("motor", if (erro == null) JSONObject().put("estado", "pronto").put("nome", novo.nome) else JSONObject().put("estado", "erro").put("mensagem", erro))
        } finally { trocando = false }
    }

    // ---------------- ponte com a página ----------------
    inner class Ponte {
        @JavascriptInterface fun tentar() { aoTentar?.invoke() }

        @JavascriptInterface fun pedido(texto: String) {
            val m = try { JSONObject(texto) } catch (_: Exception) { return }
            if (m.optString("t") == "tentar") { aoTentar?.invoke(); return }
            val id = m.opt("id"); val acao = m.optString("acao"); val args = m.optJSONObject("args") ?: JSONObject()
            when (acao) {
                "tema" -> ui.post { aplicarTema(args.optString("v") == "escuro") }.also { responder(id, true) }
                "link" -> { abrirLink(args.optString("url")); responder(id, true) }
                "salvarArquivo" -> ui.post { salvarArquivo(id, args.optString("nome"), args.optString("conteudo"), args.optString("tipo")) }
                else -> thread {
                    try {
                        val dados: Any = when (acao) {
                            "carregar" -> carregarConversas()
                            "salvar" -> { salvarConversas(args.optString("dados", "[]")); true }
                            "sistema" -> sistema()
                            "modelo" -> { val novo = modelos.firstOrNull { it.id == args.optString("id") } ?: throw Exception("modelo desconhecido"); if (novo.id != modelo.id) trocarModelo(novo); true }
                            else -> throw Exception("ação desconhecida: $acao")
                        }
                        responder(id, dados)
                    } catch (e: Exception) { responderErro(id, e.message ?: "erro") }
                }
            }
        }
    }

    private fun enviarParaPagina(obj: JSONObject) {
        val js = "window.__proponsMsg && window.__proponsMsg(" + JSONObject.quote(obj.toString()) + ")"
        ui.post { web.evaluateJavascript(js, null) }
    }
    private fun responder(id: Any?, dados: Any?) = enviarParaPagina(JSONObject().put("t", "resposta").put("id", id).put("ok", true).put("dados", dados ?: JSONObject.NULL))
    private fun responderErro(id: Any?, erro: String) = enviarParaPagina(JSONObject().put("t", "resposta").put("id", id).put("ok", false).put("erro", erro))
    private fun evento(nome: String, dados: JSONObject) = enviarParaPagina(JSONObject().put("t", "evento").put("nome", nome).put("dados", dados))

    private val arquivoConversas by lazy { AtomicFile(File(pastaDados, "conversas.json")) }
    @Synchronized private fun carregarConversas(): String = try {
        val s = String(arquivoConversas.readFully(), Charsets.UTF_8); JSONArray(s); s
    } catch (_: java.io.FileNotFoundException) { "[]" } catch (_: Exception) { "{corrompido" }
    @Synchronized private fun salvarConversas(json: String) {
        val out = arquivoConversas.startWrite()
        try { out.write(json.toByteArray(Charsets.UTF_8)); arquivoConversas.finishWrite(out) } catch (e: Exception) { arquivoConversas.failWrite(out); throw e }
    }

    private fun sistema(): JSONObject {
        val am = getSystemService(ACTIVITY_SERVICE) as ActivityManager
        val mi = ActivityManager.MemoryInfo().also { am.getMemoryInfo(it) }
        val soc = if (Build.VERSION.SDK_INT >= 31) "${Build.SOC_MANUFACTURER} ${Build.SOC_MODEL}" else Build.HARDWARE
        val lista = JSONArray()
        for (m in modelos) lista.put(JSONObject().put("id", m.id).put("nome", m.nome).put("descricao", m.descricao).put("arquivo", m.arquivo)
            .put("tamanho", m.tamanho).put("ramMin", m.ramMin).put("baixado", acharModelo(m) != null).put("atual", m.id == modelo.id)
            .apply { if (m.id == "avancado" && ramTotal < 7L shl 30) put("bloqueado", "precisa de 8 GB") })
        return JSONObject().put("ramTotal", mi.totalMem).put("ramLivre", mi.availMem).put("cpu", soc.trim()).put("nucleos", Runtime.getRuntime().availableProcessors())
            .put("discoLivre", filesDir.usableSpace).put("pastaDados", "armazenamento interno do app")
            .put("so", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT}) · ${Build.MANUFACTURER} ${Build.MODEL}")
            .put("versao", packageManager.getPackageInfo(packageName, 0).versionName).put("modelos", lista)
    }

    private fun salvarArquivo(id: Any?, nome: String, conteudo: String, tipo: String) {
        salvarPendente = conteudo; idSalvarPendente = id
        val i = Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(tipo.ifEmpty { "text/plain" }).putExtra(Intent.EXTRA_TITLE, nome)
        try { startActivityForResult(i, PEDIDO_SALVAR) } catch (e: Exception) { responderErro(id, "não há app para salvar arquivos") }
    }

    private fun abrirLink(url: String) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) return
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
    }

    @Deprecated("API antiga, suficiente aqui")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION") super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            PEDIDO_ARQUIVOS -> {
                val cb = escolhaArquivos; escolhaArquivos = null
                val uris = if (resultCode != RESULT_OK || data == null) null
                    else data.clipData?.let { c -> Array(c.itemCount) { c.getItemAt(it).uri } } ?: data.data?.let { arrayOf(it) }
                cb?.onReceiveValue(uris)
            }
            PEDIDO_SALVAR -> {
                val id = idSalvarPendente; val conteudo = salvarPendente; salvarPendente = null; idSalvarPendente = null
                val uri = data?.data
                if (resultCode != RESULT_OK || uri == null) { responder(id, false); return }
                thread {
                    try { contentResolver.openOutputStream(uri)?.use { it.write((conteudo ?: "").toByteArray(Charsets.UTF_8)) }; responder(id, true) }
                    catch (e: Exception) { responderErro(id, e.message ?: "erro ao salvar") }
                }
            }
        }
    }

    // ---------------- tela de carregamento ----------------
    private fun mostrarSplash() {
        val html = assets.open("splash.html").bufferedReader().readText().replace("{{TEMA}}", if (escuro()) "escuro" else "claro")
        web.loadDataWithBaseURL("file:///android_asset/", html, "text/html", "utf-8", null)
    }
    private fun splash(v: Double, titulo: String, sub: String) {
        if (!naSplash) return
        val js = "window.p && p(${"%.3f".format(java.util.Locale.US, v)}, ${JSONObject.quote(titulo)}, ${JSONObject.quote(sub)})"
        ui.post { web.evaluateJavascript(js, null) }
    }

    // ---------------- ciclo de vida ----------------
    @Deprecated("API antiga, suficiente aqui")
    override fun onBackPressed() {
        web.evaluateJavascript("window.__proponsVoltar ? String(window.__proponsVoltar()) : 'false'") { r ->
            if (!r.contains("true")) moveTaskToBack(true)
        }
    }

    override fun onResume() {
        super.onResume()
        // voltou para o app e o Android tinha encerrado o motor: o vigia já religa; aqui só garante
        val p = motor
        if (!naSplash && !trocando && p != null && !p.isAlive && !desligando) trabalho.execute {
            evento("motor", JSONObject().put("estado", "reiniciando"))
            acharModelo(modelo)?.let { ligarMotor(it) }?.let { erro -> evento("motor", JSONObject().put("estado", "erro").put("mensagem", erro)) }
                ?: evento("motor", JSONObject().put("estado", "pronto").put("nome", modelo.nome))
        }
    }

    override fun onDestroy() {
        if (isFinishing) { desligando = true; pararMotor() }
        web.destroy()
        super.onDestroy()
    }

    companion object {
        const val PEDIDO_ARQUIVOS = 1
        const val PEDIDO_SALVAR = 2
    }
}
