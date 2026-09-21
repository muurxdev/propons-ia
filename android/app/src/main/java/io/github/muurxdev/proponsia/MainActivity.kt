package io.github.muurxdev.proponsia

import android.annotation.SuppressLint
import android.app.Activity
import android.app.ActivityManager
import android.app.PendingIntent
import android.content.pm.PackageInstaller
import android.provider.Settings
import android.view.WindowManager
import android.content.ClipData
import android.content.Intent
import android.provider.MediaStore
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
import android.webkit.PermissionRequest
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

    data class Modelo(val id: String, val nome: String, val descricao: String, val arquivo: String, val tamanho: Long, val sha256: String, val ramMin: Int,
                      val visaoTamanho: Long = 0, val visaoSha: String = "", val urlFixa: String? = null) {
        val url get() = urlFixa ?: "https://huggingface.co/unsloth/${arquivo.removeSuffix("-Q4_K_M.gguf")}-GGUF/resolve/main/$arquivo"
        // módulo de visão (ler fotos): baixado só quando a pessoa manda a primeira foto
        fun visao(): Modelo {
            val base = arquivo.removeSuffix("-Q4_K_M.gguf")
            return Modelo("visao-$id", "Visão ($nome)", "", "mmproj-$base-F16.gguf", visaoTamanho, visaoSha, 0, urlFixa = "https://huggingface.co/unsloth/$base-GGUF/resolve/main/mmproj-F16.gguf")
        }
    }

    private val modelos = listOf(
        Modelo("leve", "Leve (0.8B)", "mais rápido, para celulares com pouca memória", "Qwen3.5-0.8B-Q4_K_M.gguf", 532517120, "bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517", 3,
            204987232, "56e4c6cfe73b0c82e3e82bc518d7591997e61d81f723fc41a586f4fa69ea2453"),
        Modelo("normal", "Normal (2B)", "equilíbrio entre velocidade e qualidade", "Qwen3.5-2B-Q4_K_M.gguf", 1280835840, "aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223", 6,
            668227264, "7035e9cb8d7c6a9681d07eef9a364783e86ea4cd73faab2eabb4f43a101830c7"),
        Modelo("avancado", "Avançado (4B)", "respostas melhores, precisa de celular forte", "Qwen3.5-4B-Q4_K_M.gguf", 2740937888, "00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4", 8,
            672423616, "cd88edcf8d031894960bb0c9c5b9b7e1fea6ebee02b9f7ce925a00d12891f864"),
    )

    // vozes para transcrever áudio (whisper.cpp), baixadas no primeiro uso
    private val vozes = listOf(
        Modelo("voz-base", "Voz Base", "rápida", "ggml-base-q5_1.bin", 59707625, "422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898", 0,
            urlFixa = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin"),
        Modelo("voz-small", "Voz Small", "mais precisa, mais lenta", "ggml-small-q5_1.bin", 190085487, "ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb", 0,
            urlFixa = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin"),
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
    @Volatile private var cancelarBaixar = false
    @Volatile private var baixandoId: String? = null
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
            override fun onPageFinished(view: WebView, url: String?) { if (cssMargens.isNotEmpty()) view.evaluateJavascript(cssMargens, null) }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(req: PermissionRequest) {
                val audio = PermissionRequest.RESOURCE_AUDIO_CAPTURE
                if (req.origin?.host != "127.0.0.1" || !req.resources.contains(audio)) { req.deny(); return }
                if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == android.content.pm.PackageManager.PERMISSION_GRANTED) { req.grant(arrayOf(audio)); return }
                pedidoMicrofone = req
                requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), PEDIDO_MICROFONE)
            }
            override fun onShowFileChooser(view: WebView, cb: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                escolhaArquivos?.onReceiveValue(null)
                escolhaArquivos = cb
                val tipos = params.acceptTypes.filter { it.isNotBlank() }
                val soImagens = tipos.isNotEmpty() && tipos.all { it.startsWith("image/") }
                val varias = params.mode == FileChooserParams.MODE_OPEN_MULTIPLE
                val camera = params.isCaptureEnabled && soImagens
                val i = when {
                    camera -> intentCamera()
                    soImagens && Build.VERSION.SDK_INT >= 33 -> Intent(MediaStore.ACTION_PICK_IMAGES).apply { if (varias) putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, 3) }
                    soImagens -> Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*").putExtra(Intent.EXTRA_ALLOW_MULTIPLE, varias)
                    else -> Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*").putExtra(Intent.EXTRA_ALLOW_MULTIPLE, varias)
                }
                return try { startActivityForResult(i, if (camera) PEDIDO_CAMERA else PEDIDO_ARQUIVOS); true } catch (e: Exception) { escolhaArquivos = null; false }
            }
        }
        aplicarTema(escuro())
        mostrarSplash()
        trabalho.execute { iniciar() }
    }

    // tela cheia "ponta a ponta": o app desenha atrás da barra de status e da barra de navegação.
    // As medidas dessas barras (e do recorte da câmera) vão para a página como variáveis CSS (--sa-*);
    // só o teclado encolhe a janela, para a caixa de mensagem ficar sempre visível.
    private var cssMargens = ""
    private fun aplicarMargens(v: View) {
        if (Build.VERSION.SDK_INT >= 30) window.setDecorFitsSystemWindows(false)
        else window.decorView.systemUiVisibility = window.decorView.systemUiVisibility or View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        window.attributes = window.attributes.apply { layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES }
        window.statusBarColor = Color.TRANSPARENT; window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= 29) { window.isNavigationBarContrastEnforced = false; window.isStatusBarContrastEnforced = false }
        v.setOnApplyWindowInsetsListener { view, ins ->
            val d = resources.displayMetrics.density
            var t: Int; var b: Int; var l: Int; var r: Int; var teclado: Int
            if (Build.VERSION.SDK_INT >= 30) {
                val s = ins.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                t = s.top; b = s.bottom; l = s.left; r = s.right
                teclado = ins.getInsets(WindowInsets.Type.ime()).bottom
            } else {
                t = ins.systemWindowInsetTop; b = ins.systemWindowInsetBottom; l = ins.systemWindowInsetLeft; r = ins.systemWindowInsetRight
                teclado = if (b > 150 * d) b else 0            // Android 9/10: o teclado vem somado à barra de baixo
            }
            view.setPadding(0, 0, 0, teclado)
            val px = { x: Int -> "${"%.1f".format(java.util.Locale.US, x / d)}px" }
            cssMargens = "(function(){var s=document.documentElement.style;s.setProperty('--sa-t','${px(t)}');s.setProperty('--sa-b','${px(if (teclado > 0) 0 else b)}');" +
                "s.setProperty('--sa-l','${px(l)}');s.setProperty('--sa-r','${px(r)}')})()"
            web.evaluateJavascript(cssMargens, null)
            ins
        }
    }

    private fun escuro() = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    private fun aplicarTema(esc: Boolean) {
        val cor = if (esc) Color.parseColor("#17171B") else Color.WHITE
        window.decorView.setBackgroundColor(cor)
        web.setBackgroundColor(cor)
        if (Build.VERSION.SDK_INT >= 30) {
            val claro = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
            window.insetsController?.setSystemBarsAppearance(if (esc) 0 else claro, claro)
        } else {
            val base = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            window.decorView.systemUiVisibility = base or (if (esc) 0 else (View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR))
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
            if (desligando) return
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

    private fun tituloFalha(f: String) = when (f) { "sem espaço" -> "Pouco espaço no celular"; "corrompido" -> "Download com defeito"; "cancelado" -> "Download cancelado"; else -> "Sem conexão para baixar a IA" }
    private fun mensagemFalha(f: String, m: Modelo = modelo) = when (f) {
        "cancelado" -> "Download cancelado."
        "sem espaço" -> "A IA precisa de cerca de ${(m.tamanho shr 20) + 400} MB livres no celular."
        "corrompido" -> "O arquivo baixado veio com defeito e foi descartado. Tente de novo."
        else -> "Na primeira vez é preciso internet (de preferência Wi-Fi). Verifique a conexão e tente de novo."
    }

    private fun acharModelo(m: Modelo): File? = File(pastaModelos, m.arquivo).takeIf { it.length() == m.tamanho }

    // download com retomada + verificação SHA-256
    private fun baixar(m: Modelo, splash: Boolean): File {
        val final = File(pastaModelos, m.arquivo); val parcial = File(pastaModelos, m.arquivo + ".baixando")
        if (pastaModelos.usableSpace < m.tamanho - parcial.length() + (400L shl 20)) throw Exception("sem espaço")
        cancelarBaixar = false
        pedirNotificacoes()
        val titulo = if (splash) "Baixando a IA" else "Baixando ${m.nome}"
        ServicoDownload.aoCancelar = { cancelarBaixar = true }
        ServicoDownload.iniciar(this, titulo, "Preparando…", parcial.length().toDouble() / m.tamanho)
        var sucesso = false
        try { return baixarComServico(m, splash, final, parcial, titulo).also { sucesso = true } }
        finally {
            if (sucesso) ServicoDownload.terminar(this, if (emPrimeiroPlano) null else "IA baixada", "${m.nome} está pronto para usar.")
            else ServicoDownload.terminar(this, if (emPrimeiroPlano || cancelarBaixar) null else "O download parou", "Abra a Própons IA para continuar de onde parou.")
        }
    }

    private fun baixarComServico(m: Modelo, splash: Boolean, final: File, parcial: File, titulo: String): File {
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
                            if (cancelarBaixar) throw Exception("cancelado")
                            out.write(buf, 0, n); ja += n
                            val agora = System.currentTimeMillis()
                            if (agora - ultimo > 250) {
                                ultimo = agora; val v = ja.toDouble() / m.tamanho
                                ServicoDownload.progresso(this, titulo, "${ja shr 20} de ${m.tamanho shr 20} MB · ${(v * 100).toInt()}%", v)
                                if (splash) splash(v, "Baixando a IA", "Só na primeira vez · ${ja shr 20} de ${m.tamanho shr 20} MB")
                                else evento("download", JSONObject().put("id", m.id).put("pct", v).put("feito", ja).put("total", m.tamanho).put("nome", m.nome))
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                if (e.message == "cancelado") throw e
                if (pastaModelos.usableSpace < (64L shl 20)) throw Exception("sem espaço")
                if (parcial.length() > antes) falhas = 0 else falhas++
                // tela apagada ou troca de rede: espera a conexão voltar (até ~4 min sem nenhum progresso)
                if (falhas >= 9) throw Exception("sem conexão")
                ServicoDownload.progresso(this, titulo, "Esperando a internet voltar…", parcial.length().toDouble() / m.tamanho)
                for (i in 0 until (3 * (falhas + 1)).coerceAtMost(30)) { if (cancelarBaixar) throw Exception("cancelado"); Thread.sleep(1000) }
            }
        }
        ServicoDownload.progresso(this, titulo, "Conferindo o arquivo…", -1.0)
        if (splash) splash(-1.0, "Verificando o download", "")
        else evento("download", JSONObject().put("id", m.id).put("pct", 1.0).put("feito", m.tamanho).put("total", m.tamanho).put("nome", m.nome).put("fase", "verificando"))
        if (sha256(parcial) != m.sha256) { parcial.delete(); throw Exception("corrompido") }
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
        // prioridade menor (nice) que a da tela: a interface continua lisa enquanto a IA responde
        val nice = if (File("/system/bin/nice").exists()) arrayOf("/system/bin/nice", "-n", "5") else emptyArray()
        val pb = ProcessBuilder(*nice, exe.path, "-m", arq.path, "--host", "127.0.0.1", "--port", "$porta", "--path", pastaInterface.path,
            "-c", "4096", "-np", "1", "--cache-ram", "0", "-ctxcp", "2", "--reasoning", "off", "--reasoning-budget", "0",
            "--api-key", chave, "-t", "$threads", *argsVisao())
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

    @Volatile private var visaoAtiva = false
    private fun argsVisao(): Array<String> {
        val arq = if (prefs.getBoolean("visao", false)) acharModelo(modelo.visao()) else null
        visaoAtiva = arq != null
        return if (arq == null) emptyArray() else arrayOf("--mmproj", arq.path, "--image-max-tokens", "300")
    }

    // liga/desliga a visão: baixa o módulo do modelo atual se preciso e religa o motor
    private fun ligarVisao(ligar: Boolean) = trabalho.execute {
        prefs.edit().putBoolean("visao", ligar).apply()
        if (ligar) {
            val v = modelo.visao()
            if (acharModelo(v) == null) {
                baixandoId = v.id; cancelarBaixar = false
                var erro: String? = null
                try { baixar(v, false) } catch (e: Exception) { erro = if (e.message == "cancelado") "cancelado" else mensagemFalha(e.message ?: "", v) } finally { baixandoId = null }
                if (erro != null) {
                    prefs.edit().putBoolean("visao", false).apply()
                    evento("download-fim", JSONObject().put("id", v.id).put("ok", false).put("erro", erro)); return@execute
                }
                evento("download-fim", JSONObject().put("id", v.id).put("ok", true))
            }
        }
        trocando = true
        try {
            evento("motor", JSONObject().put("estado", "trocando"))
            pararMotor()
            val arq = acharModelo(modelo) ?: return@execute
            val erro = ligarMotor(arq)
            evento("motor", if (erro == null) JSONObject().put("estado", "pronto").put("nome", modelo.nome).put("visao", visaoAtiva) else JSONObject().put("estado", "erro").put("mensagem", erro))
        } finally { trocando = false }
    }

    // câmera: o app de câmera do Android grava a foto no ProvedorFotos
    private var fotoCamera: Uri? = null
    private fun intentCamera(): Intent {
        val pasta = File(cacheDir, "camera").apply { mkdirs(); listFiles()?.forEach { it.delete() } }
        val nome = "foto-${System.currentTimeMillis()}.jpg"
        File(pasta, nome).createNewFile()
        val uri = Uri.parse("content://$packageName.fotos/$nome")
        fotoCamera = uri
        return Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, uri)
            .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            .apply { clipData = ClipData.newRawUri("", uri) }
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
                baixandoId = novo.id; cancelarBaixar = false
                try { baixar(novo, false) } catch (e: Exception) {
                    modelo = antigo; prefs.edit().putString("modelo", antigo.id).apply()
                    evento("motor", JSONObject().put("estado", "erro").put("mensagem", mensagemFalha(e.message ?: "", novo))); return@execute
                } finally { baixandoId = null }
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
                            "modelo" -> {
                                val novo = modeloDe(args)
                                if (baixandoId != null || trocando) throw Exception("espere o download ou a troca atual terminar")
                                if (novo.id != modelo.id) trocarModelo(novo); true
                            }
                            "baixarModelo" -> {
                                val m = modeloDe(args)
                                if (baixandoId != null || trocando) throw Exception("já há um download em andamento")
                                if (acharModelo(m) == null) soBaixar(m) else evento("download-fim", JSONObject().put("id", m.id).put("ok", true)); true
                            }
                            "cancelarDownload" -> { cancelarBaixar = true; true }
                            "apagarModelo" -> apagarModelo(modeloDe(args))
                            "baixarVoz" -> {
                                val v = vozes.firstOrNull { it.id == args.optString("id") } ?: throw Exception("voz desconhecida")
                                if (baixandoId != null) throw Exception("já há um download em andamento")
                                if (acharModelo(v) == null) soBaixar(v) else evento("download-fim", JSONObject().put("id", v.id).put("ok", true)); true
                            }
                            "usarVoz" -> { val v = vozes.firstOrNull { it.id == args.optString("id") } ?: throw Exception("voz desconhecida"); prefs.edit().putString("voz", v.id).apply(); true }
                            "apagarVoz" -> {
                                val v = vozes.firstOrNull { it.id == args.optString("id") } ?: throw Exception("voz desconhecida")
                                if (baixandoId == v.id) throw Exception("cancele o download antes de apagar")
                                File(pastaModelos, v.arquivo).delete(); File(pastaModelos, v.arquivo + ".baixando").delete(); true
                            }
                            "audioInicio" -> {
                                val ext = args.optString("ext").takeIf { Regex("^(wav|mp3|m4a|ogg|flac)$").matches(it) } ?: "wav"
                                val id = java.util.UUID.randomUUID().toString().replace("-", "")
                                val f = File(cacheDir, "audio-$id.$ext"); f.writeBytes(ByteArray(0)); audios[id] = f; id
                            }
                            "audioParte" -> {
                                val f = audios[args.optString("id")] ?: throw Exception("áudio desconhecido")
                                java.io.FileOutputStream(f, true).use { it.write(android.util.Base64.decode(args.optString("dados"), android.util.Base64.DEFAULT)) }
                                if (f.length() > 200L shl 20) throw Exception("áudio grande demais"); true
                            }
                            "transcrever" -> {
                                val f = audios.remove(args.optString("id")) ?: throw Exception("áudio desconhecido")
                                try { transcrever(f) } finally { f.delete() }
                            }
                            "visao" -> {
                                if (baixandoId != null || trocando) throw Exception("espere o download ou a troca atual terminar")
                                ligarVisao(args.optBoolean("ligar")); true
                            }
                            "apagarVisao" -> {
                                val m = modeloDe(args)
                                if (visaoAtiva && m.id == modelo.id) throw Exception("a visão deste modelo está em uso; desligue a visão antes de apagar")
                                File(pastaModelos, m.visao().arquivo).delete(); File(pastaModelos, m.visao().arquivo + ".baixando").delete(); true
                            }
                            "verificarModelos" -> verificarModelos()
                            "atualizar" -> atualizar(args.optString("versao"))
                            "ocupado" -> { ocupado(args.optBoolean("sim")); true }
                            "compartilhar" -> { val t = args.optString("texto"); ui.post { compartilhar(t) }; true }
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
        ui.post { if (!isDestroyed) web.evaluateJavascript(js, null) }
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
            .put("visaoTamanho", m.visaoTamanho).put("visaoBaixada", acharModelo(m.visao()) != null)
            .apply { if (m.id == "avancado" && ramTotal < 7L shl 30) put("bloqueado", "precisa de 8 GB") })
        return JSONObject().put("ramTotal", mi.totalMem).put("ramLivre", mi.availMem).put("cpu", soc.trim()).put("nucleos", Runtime.getRuntime().availableProcessors())
            .put("discoLivre", filesDir.usableSpace).put("pastaDados", "armazenamento interno do app").put("pastaModelos", "armazenamento interno do app")
            .put("visaoLigada", prefs.getBoolean("visao", false)).put("visaoAtiva", visaoAtiva).put("temVisao", true)
            .put("temTranscricao", File(applicationInfo.nativeLibraryDir, "libwhisper_cli.so").exists()).put("vozes", listaVozes())
            .put("so", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT}) · ${Build.MANUFACTURER} ${Build.MODEL}")
            .put("versao", packageManager.getPackageInfo(packageName, 0).versionName).put("modelos", lista)
    }

    // ---------------- gerenciar modelos ----------------
    private fun modeloDe(args: JSONObject) = modelos.firstOrNull { it.id == args.optString("id") } ?: throw Exception("modelo desconhecido")

    private fun soBaixar(m: Modelo) = thread {
        baixandoId = m.id; cancelarBaixar = false
        var erro: String? = null
        try { baixar(m, false) } catch (e: Exception) { erro = if (e.message == "cancelado") "cancelado" else mensagemFalha(e.message ?: "", m) } finally { baixandoId = null }
        evento("download-fim", JSONObject().put("id", m.id).put("ok", erro == null).put("erro", erro ?: JSONObject.NULL))
    }

    private fun apagarModelo(m: Modelo): Boolean {
        if (m.id == modelo.id) throw Exception("este modelo está em uso; troque de modelo antes de apagar")
        if (baixandoId == m.id) throw Exception("cancele o download antes de apagar")
        File(pastaModelos, m.arquivo).delete(); File(pastaModelos, m.arquivo + ".baixando").delete()
        if (acharModelo(m) != null) throw Exception("não foi possível apagar o arquivo")
        return true
    }

    // confere o SHA-256 de cada modelo baixado; os com defeito são apagados (menos o que está em uso)
    private fun verificarModelos(): JSONArray {
        val r = JSONArray()
        for (m in modelos) {
            val f = acharModelo(m) ?: continue
            if (m.id == baixandoId) continue
            val ok = sha256(f) { v -> evento("verificacao", JSONObject().put("id", m.id).put("nome", m.nome).put("pct", v)) } == m.sha256
            val apagado = !ok && m.id != modelo.id && f.delete()
            r.put(JSONObject().put("id", m.id).put("nome", m.nome).put("ok", ok).put("apagado", apagado))
        }
        return r
    }

    private fun sha256(f: File, progresso: ((Double) -> Unit)? = null): String {
        val md = MessageDigest.getInstance("SHA-256"); val total = f.length().coerceAtLeast(1); var lido = 0L; var ultimo = 0L
        f.inputStream().use { i ->
            val b = ByteArray(1 shl 20)
            while (true) {
                val n = i.read(b); if (n < 0) break
                md.update(b, 0, n); lido += n
                val agora = System.currentTimeMillis()
                if (progresso != null && agora - ultimo > 300) { ultimo = agora; progresso(lido.toDouble() / total) }
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    // ---------------- atualização do app ----------------
    // baixa o APK da release, confere com o SHA256SUMS dela e entrega ao instalador do Android (PackageInstaller)
    private fun atualizar(versao: String): Any {
        if (!Regex("""^\d{1,3}\.\d{1,3}\.\d{1,3}$""").matches(versao)) throw Exception("versão inválida")
        val base = "https://github.com/muurxdev/propons-ia/releases/download/v$versao/"
        val esperado = lerTexto(base + "SHA256SUMS").lines().map { it.trim().split(Regex("[ *]+")) }
            .firstOrNull { it.size == 2 && it[1] == "Propons-IA-Android.apk" }?.get(0)?.lowercase() ?: throw Exception("a versão $versao não tem o app do Android")
        cacheDir.listFiles()?.filter { it.name.startsWith("atualizacao-") && !it.name.contains(versao) }?.forEach { it.delete() }
        val apk = File(cacheDir, "atualizacao-$versao.apk")
        if (!(apk.exists() && sha256(apk) == esperado)) {
            val c = URL(base + "Propons-IA-Android.apk").openConnection() as HttpURLConnection
            c.connectTimeout = 30000; c.readTimeout = 30000; c.instanceFollowRedirects = true
            c.setRequestProperty("User-Agent", "ProponsIA-Android")
            if (c.responseCode !in 200..299) throw Exception("HTTP ${c.responseCode} ao baixar a versão nova")
            val total = c.contentLengthLong
            pedirNotificacoes()
            ServicoDownload.aoCancelar = null
            ServicoDownload.iniciar(this, "Baixando a Própons IA $versao", "Preparando…")
            try { c.inputStream.use { ins -> FileOutputStream(apk).use { out ->
                val buf = ByteArray(1 shl 18); var ja = 0L; var ultimo = 0L
                while (true) {
                    val n = ins.read(buf); if (n < 0) break
                    out.write(buf, 0, n); ja += n
                    val agora = System.currentTimeMillis()
                    if (agora - ultimo > 250) {
                        ultimo = agora; val v = if (total > 0) ja.toDouble() / total else 0.0
                        evento("atualizacao", JSONObject().put("fase", "baixando").put("pct", v).put("feito", ja).put("total", total))
                        ServicoDownload.progresso(this, "Baixando a Própons IA $versao", "${ja shr 20} de ${total shr 20} MB · ${(v * 100).toInt()}%", v)
                    }
                }
            } } } finally { ServicoDownload.terminar(this, if (emPrimeiroPlano) null else "Atualização baixada", "Abra a Própons IA para instalar a versão $versao.") }
            evento("atualizacao", JSONObject().put("fase", "verificando").put("pct", 1.0))
            if (sha256(apk) != esperado) { apk.delete(); throw Exception("o arquivo baixado veio com defeito. Tente de novo.") }
        }
        if (!packageManager.canRequestPackageInstalls()) {
            ui.post { try { startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName"))) } catch (_: Exception) {} }
            return JSONObject().put("precisaPermissao", true)
        }
        evento("atualizacao", JSONObject().put("fase", "instalando").put("pct", 1.0))
        val instalador = packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply { setAppPackageName(packageName) }
        val sessao = instalador.createSession(params)
        instalador.openSession(sessao).use { s ->
            s.openWrite("propons-ia.apk", 0, apk.length()).use { out -> apk.inputStream().use { it.copyTo(out) }; s.fsync(out) }
            val i = Intent(this, MainActivity::class.java).setAction(ACAO_INSTALACAO).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
            s.commit(PendingIntent.getActivity(this, 7, i, flags).intentSender)
        }
        return true
    }

    private fun lerTexto(url: String): String {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 20000; c.readTimeout = 20000; c.instanceFollowRedirects = true
        c.setRequestProperty("User-Agent", "ProponsIA-Android")
        if (c.responseCode !in 200..299) throw Exception("sem acesso à versão nova (HTTP ${c.responseCode})")
        return c.inputStream.bufferedReader().use { it.readText() }
    }

    // resposta do instalador: pede a confirmação do usuário ou avisa se deu errado
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.action != ACAO_INSTALACAO) return
        when (val st = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirmar: Intent? = if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                    else @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_INTENT)
                try { if (confirmar != null) startActivity(confirmar) } catch (e: Exception) {
                    evento("atualizacao", JSONObject().put("fase", "erro").put("mensagem", "Não foi possível abrir o instalador: ${e.message}"))
                }
            }
            PackageInstaller.STATUS_SUCCESS -> {}
            else -> evento("atualizacao", JSONObject().put("fase", "erro").put("mensagem",
                if (st == PackageInstaller.STATUS_FAILURE_ABORTED) "Instalação cancelada." else "O Android não instalou a atualização: ${intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "erro $st"}"))
        }
    }

    private fun compartilhar(texto: String) {
        val i = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, texto)
        try { startActivity(Intent.createChooser(i, "Compartilhar")) } catch (_: Exception) {}
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
            PEDIDO_CAMERA -> {
                val cb = escolhaArquivos; escolhaArquivos = null
                val u = fotoCamera; fotoCamera = null
                val tirou = resultCode == RESULT_OK && u != null && File(File(cacheDir, "camera"), u.lastPathSegment ?: "").length() > 0
                cb?.onReceiveValue(if (tirou) arrayOf(u!!) else null)
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

    // ---------------- segundo plano ----------------
    @Volatile private var emPrimeiroPlano = true
    private var travaResposta: android.os.PowerManager.WakeLock? = null
    // enquanto a IA responde, a CPU continua acordada mesmo com a tela apagada (máx. 10 min por resposta)
    private fun ocupado(sim: Boolean) {
        val pm = getSystemService(POWER_SERVICE) as android.os.PowerManager
        if (travaResposta == null) travaResposta = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "ProponsIA:resposta").apply { setReferenceCounted(false) }
        try { if (sim) travaResposta?.acquire(10 * 60 * 1000L) else travaResposta?.takeIf { it.isHeld }?.release() } catch (_: Exception) {}
    }
    // Android 13+: pede uma vez a permissão para mostrar a notificação do download
    private fun pedirNotificacoes() {
        if (Build.VERSION.SDK_INT < 33 || prefs.getBoolean("pediuNotificacoes", false)) return
        if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) return
        prefs.edit().putBoolean("pediuNotificacoes", true).apply()
        ui.post { try { requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 3) } catch (_: Exception) {} }
    }
    override fun onPause() { super.onPause(); emPrimeiroPlano = false }

    private var pedidoMicrofone: PermissionRequest? = null
    override fun onRequestPermissionsResult(codigo: Int, permissoes: Array<out String>, resultados: IntArray) {
        super.onRequestPermissionsResult(codigo, permissoes, resultados)
        if (codigo != PEDIDO_MICROFONE) return
        val r = pedidoMicrofone; pedidoMicrofone = null
        if (resultados.firstOrNull() == android.content.pm.PackageManager.PERMISSION_GRANTED) r?.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else r?.deny()
    }

    // ---------------- transcrição de áudio (whisper-cli) ----------------
    private val audios = java.util.concurrent.ConcurrentHashMap<String, File>()
    private fun vozAtual() = vozes.firstOrNull { it.id == prefs.getString("voz", null) } ?: vozes[0]
    private fun listaVozes(): JSONArray = JSONArray().apply {
        val atual = vozAtual()
        for (v in vozes) put(JSONObject().put("id", v.id).put("nome", v.nome).put("descricao", v.descricao).put("tamanho", v.tamanho)
            .put("baixado", acharModelo(v) != null).put("atual", v.id == atual.id))
    }
    private fun transcrever(arq: File): JSONObject {
        val voz = vozAtual()
        val modeloVoz = acharModelo(voz) ?: throw Exception("a voz ${voz.nome} não está baixada")
        val exe = File(applicationInfo.nativeLibraryDir, "libwhisper_cli.so")
        if (!exe.exists()) throw Exception("transcrição não disponível nesta versão")
        val nucleos = Runtime.getRuntime().availableProcessors()
        val threads = if (nucleos >= 8) 4 else (nucleos / 2).coerceAtLeast(1)
        val nice = if (File("/system/bin/nice").exists()) arrayOf("/system/bin/nice", "-n", "5") else emptyArray()
        val pb = ProcessBuilder(*nice, exe.path, "-m", modeloVoz.path, "-f", arq.path, "-l", "pt", "-nt", "-pp", "-mc", "0", "-t", "$threads", "-otxt", "-of", arq.path)
        pb.directory(cacheDir); pb.redirectErrorStream(true)
        val t0 = System.currentTimeMillis()
        ocupado(true)
        try {
            val p = pb.start()
            val re = Regex("""progress\s*=\s*(\d+)%""")
            val log = StringBuilder()
            p.inputStream.bufferedReader().forEachLine { l ->
                val m = re.find(l)
                if (m != null) evento("transcricao", JSONObject().put("pct", m.groupValues[1].toInt() / 100.0)) else if (log.length < 4000) log.appendLine(l)
            }
            p.waitFor()
            val txt = File(arq.path + ".txt")
            if (!txt.exists()) throw Exception("não foi possível transcrever este áudio")
            val texto = txt.readText().replace("\r", "").trim().replace(Regex("""\s*\n\s*"""), " ")
            return JSONObject().put("texto", texto).put("segundos", (System.currentTimeMillis() - t0) / 1000.0)
        } finally { ocupado(false); File(arq.path + ".txt").delete() }
    }

    override fun onResume() {
        super.onResume()
        emPrimeiroPlano = true
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
        ocupado(false)
        web.destroy()
        super.onDestroy()
    }

    companion object {
        const val PEDIDO_ARQUIVOS = 1
        const val PEDIDO_SALVAR = 2
        const val PEDIDO_CAMERA = 4
        const val PEDIDO_MICROFONE = 5
        const val ACAO_INSTALACAO = "io.github.muurxdev.proponsia.INSTALACAO"
    }
}
