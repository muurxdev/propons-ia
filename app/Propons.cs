// Própons IA — executável único e leve para Windows.
// Interface + motor (llama.cpp) vão anexados ao final do .exe e são extraídos para %LOCALAPPDATA%\Propons IA.
// O modelo é baixado na primeira vez em cada PC (retomada + SHA-256). As conversas e a configuração
// ficam ao lado do .exe (pasta oculta "dados"), para irem junto no pendrive.
// A interface conversa com este programa por mensagens {t:'pedido', id, acao, args} → {t:'resposta', id, ok, dados}.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

static class Program
{
    public const string Titulo = "Própons IA";
    public const string Versao = "1.17.0";
    static Mutex unica;

    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr v);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();

    [STAThread]
    static void Main(string[] args)
    {
        // nitidez: sem isso o Windows estica a janela em telas com escala (125%/150%) e tudo fica borrado
        try { if (!SetProcessDpiAwarenessContext(new IntPtr(-4))) SetProcessDPIAware(); } catch { try { SetProcessDPIAware(); } catch { } }
        AppDomain.CurrentDomain.AssemblyResolve += delegate (object s, ResolveEventArgs e)
        {
            string nome = new AssemblyName(e.Name).Name + ".dll";
            using (Stream r = Assembly.GetExecutingAssembly().GetManifestResourceStream(nome))
            {
                if (r == null) return null;
                byte[] b = new byte[r.Length]; int t = 0, n; while (t < b.Length && (n = r.Read(b, t, b.Length - t)) > 0) t += n;
                return Assembly.Load(b);
            }
        };
        bool nova;
        unica = new Mutex(true, "ProponsIA-janela-unica", out nova);
        if (!nova) { Janela.TrazerParaFrente(); return; }
        ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072; // TLS 1.2
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        string forcar = null;
        foreach (string a in args) { if (a.Equals("--leve", StringComparison.OrdinalIgnoreCase)) forcar = "leve"; }
        Iniciar(forcar);
        GC.KeepAlive(unica);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    static void Iniciar(string forcar) { Application.Run(new Janela(forcar)); }

    public static void Log(string m)
    {
        try { File.AppendAllText(Path.Combine(Path.GetTempPath(), "Propons-IA-log.txt"), DateTime.Now.ToString("dd/MM HH:mm:ss ") + m + Environment.NewLine); } catch { }
    }
}

// ---------- modelos disponíveis (baixados na 1ª vez) ----------
class Modelo
{
    public string Id, Nome, Descricao, Arquivo, Url, Sha256; public long Tamanho; public int RamMin;
    public static readonly Modelo Leve = new Modelo { Id = "leve", Nome = "Leve (0.8B)", Descricao = "mais rápido, para PCs com pouca memória",
        Arquivo = "Qwen3.5-0.8B-Q4_K_M.gguf", Tamanho = 532517120, RamMin = 3,
        Url = "https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf",
        Sha256 = "bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517" };
    public static readonly Modelo Normal = new Modelo { Id = "normal", Nome = "Normal (2B)", Descricao = "equilíbrio entre velocidade e qualidade",
        Arquivo = "Qwen3.5-2B-Q4_K_M.gguf", Tamanho = 1280835840, RamMin = 6,
        Url = "https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/main/Qwen3.5-2B-Q4_K_M.gguf",
        Sha256 = "aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223" };
    public static readonly Modelo Avancado = new Modelo { Id = "avancado", Nome = "Avançado (4B)", Descricao = "respostas e códigos melhores, mais lento",
        Arquivo = "Qwen3.5-4B-Q4_K_M.gguf", Tamanho = 2740937888, RamMin = 8,
        Url = "https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_K_M.gguf",
        Sha256 = "00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4" };
    public static readonly Modelo[] Todos = { Leve, Normal, Avancado };
    public static Modelo PorId(string id) { foreach (Modelo m in Todos) if (m.Id == id) return m; return null; }

    // módulo de visão (ler fotos): baixado só quando a pessoa manda a primeira foto
    public long VisaoTamanho; public string VisaoSha;
    public Modelo Visao()
    {
        string tam = Arquivo.Replace("Qwen3.5-", "").Replace("-Q4_K_M.gguf", "");
        return new Modelo { Id = "visao-" + Id, Nome = "Visão (" + Nome + ")", Arquivo = "mmproj-Qwen3.5-" + tam + "-F16.gguf",
            Tamanho = VisaoTamanho, Sha256 = VisaoSha, Url = "https://huggingface.co/unsloth/Qwen3.5-" + tam + "-GGUF/resolve/main/mmproj-F16.gguf" };
    }
    static Modelo()
    {
        Leve.VisaoTamanho = 204987232; Leve.VisaoSha = "56e4c6cfe73b0c82e3e82bc518d7591997e61d81f723fc41a586f4fa69ea2453";
        Normal.VisaoTamanho = 668227264; Normal.VisaoSha = "7035e9cb8d7c6a9681d07eef9a364783e86ea4cd73faab2eabb4f43a101830c7";
        Avancado.VisaoTamanho = 672423616; Avancado.VisaoSha = "cd88edcf8d031894960bb0c9c5b9b7e1fea6ebee02b9f7ce925a00d12891f864";
    }
}

// ---------- vozes para transcrever áudio (whisper.cpp), baixadas no primeiro uso ----------
static class Vozes
{
    public static readonly Modelo Base = new Modelo { Id = "voz-base", Nome = "Voz Base", Descricao = "rápida", Arquivo = "ggml-base-q5_1.bin", Tamanho = 59707625,
        Url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin", Sha256 = "422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898" };
    public static readonly Modelo Small = new Modelo { Id = "voz-small", Nome = "Voz Small", Descricao = "mais precisa, mais lenta", Arquivo = "ggml-small-q5_1.bin", Tamanho = 190085487,
        Url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin", Sha256 = "ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb" };
    public static readonly Modelo[] Todas = { Base, Small };
    public static Modelo PorId(string id) { foreach (Modelo m in Todas) if (m.Id == id) return m; return null; }
}

// ---------- aceleração por GPU: backend Vulkan do llama.cpp (a build "vulkan" da release é a de CPU + este dll), baixada sob demanda ----------
static class Gpu
{
    public const string Build = "b11070";
    public static readonly Modelo Zip = new Modelo { Id = "gpu-vulkan", Nome = "Aceleração por GPU", Descricao = "Vulkan", Arquivo = "llama-" + Build + "-bin-win-vulkan-x64.zip", Tamanho = 31851321,
        Url = "https://github.com/ggml-org/llama.cpp/releases/download/" + Build + "/llama-" + Build + "-bin-win-vulkan-x64.zip", Sha256 = "91487bd1d145dafb58d7b83fc45b72dc8fae771323191b995daddde984a2e099" };
    public const string Dll = "ggml-vulkan.dll"; public const long DllTamanho = 43658240;
    public const string DllSha = "91ae90e4bfe8cc26ad914070e531bfbddd17701083fd626402e8faddb3692141";
}

// ---------- pacote anexado ao .exe ----------
// formato: [arquivos...][índice UTF-8][int64 tamanho do índice]["PROPONS1"]; índice: caminho|início|tamanho|sha256
static class Pacote
{
    public class Item { public string Caminho, Sha; public long Inicio, Tamanho; }
    public static readonly List<Item> Itens = new List<Item>();
    public static string Build = "dev";
    public static string Origem;
    public static string PastaSolta;   // desenvolvimento: pasta "IA" ao lado do .exe

    public static bool Abrir()
    {
        Origem = Application.ExecutablePath;
        try
        {
            using (FileStream f = new FileStream(Origem, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                byte[] fim = new byte[16];
                f.Seek(-16, SeekOrigin.End); Ler(f, fim);
                if (Encoding.ASCII.GetString(fim, 8, 8) != "PROPONS1") return AbrirSolta();
                long tam = BitConverter.ToInt64(fim, 0);
                byte[] idx = new byte[tam];
                f.Seek(-16 - tam, SeekOrigin.End); Ler(f, idx);
                foreach (string linha in Encoding.UTF8.GetString(idx).Split('\n'))
                {
                    string[] p = linha.Trim().Split('|');
                    if (p.Length == 2 && p[0] == "build") Build = p[1];
                    if (p.Length < 3) continue;
                    Itens.Add(new Item { Caminho = p[0], Inicio = long.Parse(p[1]), Tamanho = long.Parse(p[2]), Sha = p.Length > 3 ? p[3] : "" });
                }
                return Itens.Count > 0;
            }
        }
        catch (Exception ex) { Program.Log("pacote: " + ex.Message); return AbrirSolta(); }
    }
    static bool AbrirSolta()
    {
        string p = Path.Combine(Path.GetDirectoryName(Origem), "IA");
        if (!Directory.Exists(p)) return false;
        PastaSolta = p; return true;
    }
    static void Ler(Stream s, byte[] b) { int t = 0, n; while (t < b.Length && (n = s.Read(b, t, b.Length - t)) > 0) t += n; }

    // extrai o que mudou (compara pelo sha256 guardado no manifesto da pasta)
    public static void Extrair(string destino)
    {
        string manif = Path.Combine(destino, "extraido.txt");
        Dictionary<string, string> feito = new Dictionary<string, string>();
        try { foreach (string l in File.ReadAllLines(manif)) { string[] p = l.Split('|'); if (p.Length == 2) feito[p[0]] = p[1]; } } catch { }
        byte[] buf = new byte[1 << 20];
        bool mudou = false;
        using (FileStream src = new FileStream(Origem, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 16, FileOptions.SequentialScan))
        {
            foreach (Item i in Itens)
            {
                string alvo = Path.Combine(destino, i.Caminho);
                FileInfo fi = new FileInfo(alvo);
                string sha;
                if (fi.Exists && fi.Length == i.Tamanho && feito.TryGetValue(i.Caminho, out sha) && sha == i.Sha && i.Sha != "") continue;
                Directory.CreateDirectory(Path.GetDirectoryName(alvo));
                string tmp = alvo + ".parcial";
                src.Seek(i.Inicio, SeekOrigin.Begin);
                using (FileStream dst = new FileStream(tmp, FileMode.Create, FileAccess.Write))
                {
                    long resta = i.Tamanho;
                    while (resta > 0)
                    {
                        int n = src.Read(buf, 0, (int)Math.Min(buf.Length, resta));
                        if (n <= 0) throw new IOException("pacote incompleto: " + i.Caminho);
                        dst.Write(buf, 0, n); resta -= n;
                    }
                }
                if (File.Exists(alvo)) File.Delete(alvo);
                File.Move(tmp, alvo);
                feito[i.Caminho] = i.Sha; mudou = true;
            }
        }
        if (mudou)
        {
            List<string> linhas = new List<string>();
            foreach (KeyValuePair<string, string> kv in feito) linhas.Add(kv.Key + "|" + kv.Value);
            File.WriteAllLines(manif, linhas.ToArray());
        }
    }
}

class Janela : Form
{
    readonly string forcar;
    WebView2 web;
    Process motor;
    int porta = 8765;
    string pasta;                          // interface + motor extraídos
    Modelo modelo;
    string arquivoModelo;
    readonly string chave = GerarChave(); // llama-server --api-key: só a nossa página usa o motor
    TaskCompletionSource<bool> tentarDeNovo;
    bool desligando, trocando;
    bool escolhendo;                       // primeira abertura: a pessoa escolhe o modelo antes de baixar
    volatile bool cancelarBaixar;          // "Cancelar download" na tela de modelos
    string baixandoId;                     // modelo sendo baixado agora (um por vez)
    readonly List<DateTime> quedas = new List<DateTime>();
    StreamWriter logMotor;
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };

    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string c, string t);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
    public static void TrazerParaFrente()
    {
        IntPtr h = FindWindow(null, Program.Titulo);
        if (h != IntPtr.Zero) { ShowWindow(h, 9); SetForegroundWindow(h); }
    }

    public Janela(string forcar)
    {
        this.forcar = forcar;
        Text = Program.Titulo;
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.Manual;
        BackColor = Escuro() ? Color.FromArgb(0x17, 0x17, 0x1b) : Color.White;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
    }

    static string GerarChave()
    {
        byte[] b = new byte[18]; using (RandomNumberGenerator r = RandomNumberGenerator.Create()) r.GetBytes(b);
        return Convert.ToBase64String(b).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    // janela de app de verdade (proporção parecida com a do Claude para PC: 1180x780 em escala 100%), centralizada;
    // o tamanho e a posição da última vez ficam guardados em dados\janela.txt
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr h);
    string ArquivoJanela() { return Path.Combine(Raiz(), @"dados\janela.txt"); }
    protected override void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        uint dpi = 96; try { dpi = GetDpiForWindow(Handle); } catch { }
        if (dpi < 96) dpi = 96;
        float esc = dpi / 96f;
        Rectangle area = Screen.FromPoint(Cursor.Position).WorkingArea;
        MinimumSize = new Size((int)(820 * esc), (int)(560 * esc));   // nunca cai no leiaute de celular
        int w = Math.Min((int)(1180 * esc), area.Width - 48), h = Math.Min((int)(780 * esc), area.Height - 48);
        Rectangle b = new Rectangle(area.Left + (area.Width - w) / 2, area.Top + (area.Height - h) / 2, w, h);
        bool max = false;
        try
        {
            string[] p = File.ReadAllText(ArquivoJanela()).Trim().Split(',');
            if (p.Length == 5)
            {
                Rectangle g = new Rectangle(int.Parse(p[0]), int.Parse(p[1]), int.Parse(p[2]), int.Parse(p[3]));
                Rectangle tela = Screen.FromRectangle(g).WorkingArea;
                if (g.Width >= MinimumSize.Width && g.Height >= MinimumSize.Height && tela.IntersectsWith(g)) { g.Intersect(new Rectangle(tela.Left, tela.Top, tela.Width, tela.Height)); if (g.Width >= MinimumSize.Width && g.Height >= MinimumSize.Height) b = g; }
                max = p[4] == "1";
            }
        }
        catch { }
        Bounds = b;
        if (max) WindowState = FormWindowState.Maximized;
    }
    void GuardarJanela()
    {
        try
        {
            Rectangle r = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
            Directory.CreateDirectory(Path.GetDirectoryName(ArquivoJanela()));
            File.WriteAllText(ArquivoJanela(), r.X + "," + r.Y + "," + r.Width + "," + r.Height + "," + (WindowState == FormWindowState.Maximized ? "1" : "0"));
        }
        catch { }
    }

    // ---------- barra de título no tema ----------
    [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr h, int attr, ref int val, int size);
    protected override void OnHandleCreated(EventArgs e) { base.OnHandleCreated(e); Tema(Escuro()); }
    void Tema(bool escuro)
    {
        int on = escuro ? 1 : 0;
        if (DwmSetWindowAttribute(Handle, 20, ref on, 4) != 0) DwmSetWindowAttribute(Handle, 19, ref on, 4);
        int cor = escuro ? 0x001b1717 : 0x00ffffff;      // COLORREF 0x00BBGGRR
        DwmSetWindowAttribute(Handle, 35, ref cor, 4);
        int txt = escuro ? 0x00f1ecec : 0x00141111;
        DwmSetWindowAttribute(Handle, 36, ref txt, 4);
        int canto = 2; DwmSetWindowAttribute(Handle, 33, ref canto, 4); // cantos arredondados (Windows 11)
    }
    static bool Escuro()
    {
        try
        {
            object v = Microsoft.Win32.Registry.GetValue(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "AppsUseLightTheme", 1);
            return v is int && (int)v == 0;
        }
        catch { return false; }
    }

    // ---------- pastas ----------
    static string Raiz()
    {
        string b = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (string.IsNullOrEmpty(b)) b = Path.GetTempPath();
        return Path.Combine(b, "Propons IA");
    }
    // dados (conversas, config): ao lado do .exe na pasta oculta "dados"; se não der para gravar lá, no PC
    static string PastaDados()
    {
        string perto = Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "dados");
        try
        {
            if (!Directory.Exists(perto)) { DirectoryInfo di = Directory.CreateDirectory(perto); di.Attributes |= FileAttributes.Hidden; }
            string teste = Path.Combine(perto, ".w"); File.WriteAllText(teste, ""); File.Delete(teste);
            return perto;
        }
        catch { }
        string local = Path.Combine(Raiz(), "dados"); Directory.CreateDirectory(local);
        return local;
    }

    // ---------- configuração ----------
    Dictionary<string, object> LerConfig()
    {
        foreach (string p in new[] { Path.Combine(PastaDados(), "config.json"), Path.Combine(Raiz(), @"dados\config.json") })
            try { if (File.Exists(p)) return json.Deserialize<Dictionary<string, object>>(File.ReadAllText(p, Encoding.UTF8)) ?? new Dictionary<string, object>(); } catch { }
        try { return new Dictionary<string, object>(); } catch { }
        return new Dictionary<string, object>();
    }
    // grava ao lado do exe (pendrive) e também em AppData: se uma das cópias sumir (pasta temporária, pendrive tirado), a outra vale
    void SalvarConfig(Dictionary<string, object> c)
    {
        string s = json.Serialize(c);
        try { GravarSeguro(Path.Combine(PastaDados(), "config.json"), s); } catch (Exception ex) { Program.Log("config: " + ex.Message); }
        try { Directory.CreateDirectory(Path.Combine(Raiz(), "dados")); GravarSeguro(Path.Combine(Raiz(), @"dados\config.json"), s); } catch (Exception ex) { Program.Log("config (AppData): " + ex.Message); }
    }

    // grava com arquivo temporário + troca atômica, mantendo um .bak do anterior
    static void GravarSeguro(string p, string conteudo)
    {
        string tmp = p + ".tmp";
        using (FileStream f = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None, 4096, FileOptions.WriteThrough))
        using (StreamWriter w = new StreamWriter(f, new UTF8Encoding(false))) { w.Write(conteudo); w.Flush(); f.Flush(true); }
        if (File.Exists(p)) File.Replace(tmp, p, p + ".bak", true); else File.Move(tmp, p);
    }

    int RegistrarFalhaBoot()
    {
        Dictionary<string, object> c = LerConfig(); int f = 0; object v;
        if (c.TryGetValue("falhasBoot", out v)) { try { f = Convert.ToInt32(v); } catch { } }
        c["falhasBoot"] = ++f; SalvarConfig(c); return f;
    }
    // o maior modelo já baixado que cabe na memória deste PC (Lume 3 GB, Aurora 4 GB, Ápice 8 GB), diferente de "exceto"
    static Modelo MelhorBaixado(Modelo exceto)
    {
        Modelo melhor = null; double ram = RamGB();
        foreach (Modelo m in Modelo.Todos)
        {
            if (exceto != null && m.Id == exceto.Id) continue;
            int precisa = m.Id == "leve" ? 3 : m.Id == "normal" ? 4 : 8;
            if (AcharModelo(m) != null && (m.Id == "leve" || ram == 0 || ram >= precisa * 0.93)) melhor = m;
        }
        return melhor;
    }
    Modelo EscolherModelo()
    {
        if (forcar != null) return Modelo.PorId(forcar) ?? Modelo.Normal;
        object id; Dictionary<string, object> c = LerConfig();
        Modelo escolhido = c.TryGetValue("modelo", out id) ? Modelo.PorId(id as string) : null;
        if (escolhido == null || AcharModelo(escolhido) == null)
        {
            Modelo melhor = MelhorBaixado(null);
            if (melhor != null) { Program.Log("modelo configurado ausente; usando o já baixado: " + melhor.Id); c["modelo"] = melhor.Id; SalvarConfig(c); return melhor; }
        }
        if (escolhido != null) return escolhido;
        return RamGB() < 6 ? Modelo.Leve : Modelo.Normal;
    }

    // ---------- início ----------
    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        if (!Pacote.Abrir()) { Falha("O arquivo do Própons IA está incompleto. Copie o Própons IA.exe de novo."); return; }
        modelo = EscolherModelo();

        string erroPrep = null;
        try { pasta = await Task.Run(delegate { return Preparar(); }); }
        catch (Exception ex) { erroPrep = ex.Message; Program.Log("preparar: " + ex); }
        if (erroPrep != null) { Falha("Não foi possível preparar o Própons IA neste PC.\n" + erroPrep); return; }

        try
        {
            web = new WebView2();
            web.Dock = DockStyle.Fill;
            web.DefaultBackgroundColor = BackColor;
            Controls.Add(web);
            CoreWebView2Environment.SetLoaderDllFolderPath(pasta);
            string args = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --renderer-process-limit=1";
            if (Environment.GetEnvironmentVariable("PROPONS_DEPURAR") == "1") args += " --remote-debugging-port=9333 " + (Environment.GetEnvironmentVariable("PROPONS_TESTE_ARGS") ?? ""); // só para testes
            CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Raiz(), "webview"), new CoreWebView2EnvironmentOptions(args));
            await web.EnsureCoreWebView2Async(env);
            CoreWebView2Settings s = web.CoreWebView2.Settings;
            s.AreDevToolsEnabled = Environment.GetEnvironmentVariable("PROPONS_DEPURAR") == "1";
            s.IsStatusBarEnabled = false;
            s.IsPasswordAutosaveEnabled = false;
            s.IsGeneralAutofillEnabled = false;
            web.CoreWebView2.NewWindowRequested += delegate (object o, CoreWebView2NewWindowRequestedEventArgs a) { a.Handled = true; AbrirLink(a.Uri); };
            web.CoreWebView2.NavigationStarting += delegate (object o, CoreWebView2NavigationStartingEventArgs a)
            {   // links externos nunca navegam dentro da janela do app
                if (a.Uri.StartsWith("http", StringComparison.OrdinalIgnoreCase) && !a.Uri.StartsWith("http://127.0.0.1:", StringComparison.OrdinalIgnoreCase)) { a.Cancel = true; AbrirLink(a.Uri); }
            };
            web.CoreWebView2.WebMessageReceived += Mensagem;
            web.CoreWebView2.PermissionRequested += delegate (object o, CoreWebView2PermissionRequestedEventArgs a)
            {   // a webcam só é liberada para a página da própria Própons IA (quando a pessoa toca em Câmera)
                if ((a.PermissionKind == CoreWebView2PermissionKind.Camera || a.PermissionKind == CoreWebView2PermissionKind.Microphone) && a.Uri.StartsWith("http://127.0.0.1:" + porta + "/")) a.State = CoreWebView2PermissionState.Allow;
            };
            await Navegar(Splash());
        }
        catch (Exception ex) { Program.Log("webview: " + ex); Falha("Este PC não tem o componente de janela do Windows (WebView2)."); return; }

        // abertura fria: a interface abre na hora, sem ligar a IA; ela liga na primeira mensagem (ou, sem modelo
        // baixado, depois da escolha). Nos testes (PROPONS_DEPURAR sem PROPONS_FRIO) liga já, como antes.
        bool teste = Environment.GetEnvironmentVariable("PROPONS_DEPURAR") == "1" && Environment.GetEnvironmentVariable("PROPONS_FRIO") != "1";
        if (forcar == null && (!teste || AcharModelo(modelo) == null))
        {
            escolhendo = true;
            string html = File.ReadAllText(Path.Combine(pasta, @"interface\index.html"), Encoding.UTF8);
            string ini = AcharModelo(modelo) != null ? "window.PROPONS_MODELO=" + json.Serialize(modelo.Id) + ";" : "";
            await Navegar(html.Replace("<head>", "<head><script>window.PROPONS_ESCOLHER=true;" + ini + "</script>"));
            return;
        }
        await PrepararModeloEMotor(true);
    }

    // baixa (se preciso) o modelo atual e liga o motor. Na primeira vez usa a tela de carregamento.
    async Task PrepararModeloEMotor(bool naSplash)
    {
        while (true)
        {
            arquivoModelo = AcharModelo(modelo);
            if (arquivoModelo == null)
            {
                string falha = null;
                try { arquivoModelo = await Baixar(modelo, naSplash); } catch (Exception ex) { falha = ex.Message; }
                if (falha != null)
                {
                    Program.Log("download: " + falha);
                    if (!naSplash) { Evento("motor", Dic("estado", "erro", "mensagem", MensagemDownload(falha))); return; }
                    Splash(-2, TituloDownload(falha), MensagemDownload(falha));
                    tentarDeNovo = new TaskCompletionSource<bool>();
                    await tentarDeNovo.Task;
                    continue;
                }
            }
            if (naSplash) Splash(-1, "", "");
            string erro = await LigarMotor();
            if (erro == null)
            {
                Dictionary<string, object> c0 = LerConfig(); if (!(c0.ContainsKey("falhasBoot") && Convert.ToInt32(c0["falhasBoot"]) == 0)) { c0["falhasBoot"] = 0; SalvarConfig(c0); }
                if (naSplash) web.CoreWebView2.Navigate("http://127.0.0.1:" + porta + "/#k=" + chave);
                else Evento("motor", Dic("estado", "pronto", "nome", modelo.Nome));
                return;
            }
            if (RegistrarFalhaBoot() >= 2)
            {   // caiu duas vezes seguidas ao abrir: tenta o melhor modelo já baixado que cabe na memória (ou o Lume)
                Modelo menor = MelhorBaixado(modelo);
                if (menor != null) { Program.Log("boot: " + modelo.Id + " falhou 2x; trocando para " + menor.Id); modelo = menor; Dictionary<string, object> c1 = LerConfig(); c1["modelo"] = menor.Id; c1["falhasBoot"] = 0; SalvarConfig(c1); continue; }
            }
            if (!naSplash) { Evento("motor", Dic("estado", "erro", "mensagem", erro)); return; }
            Splash(-2, "Não foi possível abrir a IA", erro);
            tentarDeNovo = new TaskCompletionSource<bool>();
            await tentarDeNovo.Task;
        }
    }
    static string TituloDownload(string f) { return f == "sem espaço" ? "Pouco espaço neste PC" : f == "corrompido" ? "Download com defeito" : "Sem conexão para baixar a IA"; }
    string MensagemDownload(string f, Modelo m = null)
    {
        if (f == "cancelado") return "Download cancelado.";
        if (f == "sem espaço") return "A IA precisa de cerca de " + (((m ?? modelo).Tamanho >> 20) + 400) + " MB livres no disco deste PC.";
        if (f == "corrompido") return "O arquivo baixado veio com defeito e foi descartado. Tente de novo.";
        return "Na primeira vez em cada PC é preciso internet. Verifique a conexão e tente de novo.";
    }

    Task Navegar(string html)
    {
        TaskCompletionSource<bool> pronto = new TaskCompletionSource<bool>();
        EventHandler<CoreWebView2NavigationCompletedEventArgs> h = null;
        h = delegate { web.CoreWebView2.NavigationCompleted -= h; pronto.TrySetResult(true); };
        web.CoreWebView2.NavigationCompleted += h;
        web.CoreWebView2.NavigateToString(html);
        return pronto.Task;
    }

    string Preparar()
    {
        if (Pacote.PastaSolta != null) return Pacote.PastaSolta;
        string destino = Path.Combine(Raiz(), Pacote.Build);
        Directory.CreateDirectory(destino);
        try
        {   // limpa versões antigas (mantém modelos, dados e o navegador)
            foreach (string d in Directory.GetDirectories(Raiz()))
            {
                string n = Path.GetFileName(d);
                // só pastas de versões antigas (nome = 12 letras/números hexadecimais); nunca mexe em outras pastas
                if (n != Pacote.Build && Regex.IsMatch(n, "^[0-9a-f]{12}$")) try { Directory.Delete(d, true); } catch { }
            }
        }
        catch { }
        Pacote.Extrair(destino);
        // conhecimento.md ao lado do .exe substitui o embutido (para "moldar" a IA sem recompilar)
        try
        {
            string extra = Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "conhecimento.md");
            if (File.Exists(extra)) File.Copy(extra, Path.Combine(destino, @"interface\conhecimento.md"), true);
        }
        catch { }
        return destino;
    }

    // procura o modelo: ao lado do .exe (pendrive grande) ou já baixado neste PC
    static string AcharModelo(Modelo m)
    {
        string[] lugares = {
            Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), @"modelos\" + m.Arquivo),
            Path.Combine(Raiz(), @"modelos\" + m.Arquivo) };
        foreach (string p in lugares)
            try { FileInfo f = new FileInfo(p); if (f.Exists && f.Length == m.Tamanho) return p; } catch { }
        return null;
    }

    // download com o PC acordado (não entra em suspensão) e aviso na bandeja ao terminar com a janela minimizada
    async Task<string> Baixar(Modelo m, bool naSplash)
    {
        ManterAcordado(true);
        try
        {
            string r = await BaixarInterno(m, naSplash);
            Avisar("IA baixada", m.Nome + " está pronto para usar.");
            return r;
        }
        catch (Exception ex)
        {
            if (!(ex is OperationCanceledException)) Avisar("O download parou", "Abra a Própons IA para continuar de onde parou.");
            throw;
        }
        finally { ManterAcordado(false); }
    }

    async Task<string> BaixarInterno(Modelo m, bool naSplash)
    {
        string dir = Path.Combine(Raiz(), "modelos");
        Directory.CreateDirectory(dir);
        string final = Path.Combine(dir, m.Arquivo), parcial = final + ".baixando";
        long jaTem = File.Exists(parcial) ? new FileInfo(parcial).Length : 0;
        try
        {
            long livre = new DriveInfo(Path.GetPathRoot(dir)).AvailableFreeSpace;
            if (livre < m.Tamanho - jaTem + (400L << 20)) throw new IOException("sem espaço");
        }
        catch (IOException) { throw; } catch { }

        const string sub = "Só na primeira vez neste PC";
        if (naSplash) Splash(0, "Baixando a IA", sub);
        Action<long> progresso = delegate (long ja)
        {
            long jaMB = ja >> 20, totMB = m.Tamanho >> 20; double v = (double)ja / m.Tamanho;
            BeginInvoke((Action)delegate
            {
                if (naSplash) Splash(v, "Baixando a IA", sub + " · " + jaMB + " de " + totMB + " MB");
                else Evento("download", Dic("id", m.Id, "pct", v, "feito", ja, "total", m.Tamanho, "nome", m.Nome));
            });
        };
        await Task.Run(delegate
        {
            int falhasSeguidas = 0;
            while (true)
            {
                long ja = File.Exists(parcial) ? new FileInfo(parcial).Length : 0;
                if (ja >= m.Tamanho) break;
                long antes = ja;
                try
                {
                    HttpWebRequest r = (HttpWebRequest)WebRequest.Create(m.Url);
                    r.UserAgent = "ProponsIA/" + Program.Versao;
                    r.Proxy = WebRequest.GetSystemWebProxy(); r.Proxy.Credentials = CredentialCache.DefaultCredentials;
                    r.Timeout = 30000; r.ReadWriteTimeout = 30000; r.AllowAutoRedirect = true;
                    if (ja > 0) r.AddRange(ja);
                    using (HttpWebResponse resp = (HttpWebResponse)r.GetResponse())
                    using (Stream s = resp.GetResponseStream())
                    using (FileStream f = new FileStream(parcial, ja > 0 && resp.StatusCode == HttpStatusCode.PartialContent ? FileMode.Append : FileMode.Create, FileAccess.Write))
                    {
                        if (f.Position == 0) ja = 0;
                        byte[] buf = new byte[1 << 20]; int n; DateTime ultimo = DateTime.MinValue;
                        while ((n = s.Read(buf, 0, buf.Length)) > 0)
                        {
                            if (cancelarBaixar) throw new OperationCanceledException("cancelado");
                            f.Write(buf, 0, n); ja += n;
                            if ((DateTime.Now - ultimo).TotalMilliseconds > 250) { ultimo = DateTime.Now; progresso(ja); }
                        }
                    }
                }
                catch (Exception ex)
                {
                    if (ex is OperationCanceledException) throw;
                    // disco cheio no meio do download: não adianta tentar de novo
                    if (ex is IOException) { try { if (new DriveInfo(Path.GetPathRoot(dir)).AvailableFreeSpace < (64L << 20)) throw new IOException("sem espaço"); } catch (IOException) { throw; } catch { } }
                    long agora = File.Exists(parcial) ? new FileInfo(parcial).Length : 0;
                    if (agora > antes) falhasSeguidas = 0; else falhasSeguidas++;     // houve progresso: continua tentando
                    // rede caiu ou mudou: espera voltar (até ~4 min sem nenhum progresso)
                    if (falhasSeguidas >= 9) throw new WebException("sem conexão");
                    for (int i = 0; i < Math.Min(30, 3 * (falhasSeguidas + 1)); i++) { if (cancelarBaixar) throw new OperationCanceledException("cancelado"); Thread.Sleep(1000); }
                }
            }
        });

        if (naSplash) Splash(-1, "Verificando o download", "");
        else Evento("download", Dic("id", m.Id, "pct", 1.0, "feito", m.Tamanho, "total", m.Tamanho, "nome", m.Nome, "fase", "verificando"));
        bool ok = await Task.Run(delegate
        {
            using (SHA256 sha = SHA256.Create()) using (FileStream f = new FileStream(parcial, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 20, FileOptions.SequentialScan))
                return BitConverter.ToString(sha.ComputeHash(f)).Replace("-", "").ToLowerInvariant() == m.Sha256;
        });
        if (!ok) { try { File.Delete(parcial); } catch { } throw new IOException("corrompido"); }
        if (File.Exists(final)) File.Delete(final);
        File.Move(parcial, final);
        return final;
    }

    // ---------- motor ----------
    async Task<string> LigarMotor()
    {
        string exe = Path.Combine(pasta, @"motor\llama-server.exe");
        if (motor == null) porta = PortaLivre(8765);   // ao religar ou trocar de modelo, mantém a mesma porta
        string gpuArgs = PrepararGpu();
        try
        {
            try { if (logMotor != null) logMotor.Dispose(); } catch { }
            logMotor = new StreamWriter(Path.Combine(Raiz(), "motor.log"), false, new UTF8Encoding(false)) { AutoFlush = true };
            ProcessStartInfo psi = new ProcessStartInfo(exe,
                "-m \"" + arquivoModelo + "\" --host 127.0.0.1 --port " + porta +
                " --path \"" + Path.Combine(pasta, "interface") + "\"" +
                " -c 8192 -np 1 --cache-ram 0 -ctxcp 2 --reasoning off --reasoning-budget 0 --api-key-file \"" + ArquivoChave() + "\"" + ArgsVisao() + gpuArgs);
            psi.WorkingDirectory = pasta; psi.UseShellExecute = false; psi.CreateNoWindow = true; psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.RedirectStandardOutput = true; psi.RedirectStandardError = true;
            Process p = new Process { StartInfo = psi, EnableRaisingEvents = true };
            DataReceivedEventHandler grava = delegate (object o, DataReceivedEventArgs a) { if (a.Data != null) try { lock (this) logMotor.WriteLine(a.Data); } catch { } };
            p.OutputDataReceived += grava; p.ErrorDataReceived += grava;
            p.Exited += MotorSaiu;
            p.Start(); p.BeginOutputReadLine(); p.BeginErrorReadLine();
            // prioridade menor que a da janela: usa a CPU livre, mas cede na hora de desenhar a interface (sem travadas)
            try { p.PriorityClass = ProcessPriorityClass.BelowNormal; } catch { }
            Job.Prender(p);
            motor = p;
        }
        catch (Exception ex) { Program.Log("motor: " + ex); MotorFalhou(); return "O motor da IA foi bloqueado neste PC (antivírus)."; }

        DateTime ini = DateTime.Now;
        while ((DateTime.Now - ini).TotalSeconds < 180)
        {
            if (motor.HasExited) { MotorFalhou(); if (gpuAtiva) return await SemGpu("fechou"); return "O motor da IA fechou sozinho neste PC. Pode ser falta de memória ou bloqueio do antivírus."; }
            if (await Saudavel(porta)) return null;
            await Task.Delay(250);
        }
        MotorFalhou(); if (gpuAtiva) return await SemGpu("demorou"); return "A IA demorou demais para iniciar neste PC.";
    }
    // a chave do motor vai num arquivo (só este usuário lê), não na linha de comando (que qualquer processo vê)
    string ArquivoChave()
    {
        string p = Path.Combine(Raiz(), @"dados\motor.chave");
        Directory.CreateDirectory(Path.GetDirectoryName(p)); File.WriteAllText(p, chave + "\n", new UTF8Encoding(false));
        return p;
    }
    // motor que não subiu (pendurado ou morto): mata antes de tentar de novo, sem o vigia achar que foi queda
    Process ignorarSaida;
    void MotorFalhou() { ignorarSaida = motor; PararMotor(); }

    bool visaoAtiva;
    bool gpuAtiva, gpuFalhou;              // motor atual usa a GPU; a GPU falhou nesta sessão (caiu para CPU até reabrir ou religar)
    string gpuDispositivo, gpuNome;        // "Vulkan0" e o nome da placa escolhida
    bool VisaoLigada() { object v; return LerConfig().TryGetValue("visao", out v) && v is bool && (bool)v; }
    string ArgsVisao()
    {
        string arq = VisaoLigada() ? AcharModelo(modelo.Visao()) : null;
        visaoAtiva = arq != null;
        return arq == null ? "" : " --mmproj \"" + arq + "\" --image-max-tokens 400";
    }

    // liga/desliga a visão: baixa o módulo do modelo atual se preciso e religa o motor
    async Task LigarVisao(bool ligar)
    {
        Dictionary<string, object> c = LerConfig(); c["visao"] = ligar; SalvarConfig(c);
        if (ligar)
        {
            Modelo v = modelo.Visao();
            if (AcharModelo(v) == null)
            {
                baixandoId = v.Id; cancelarBaixar = false; string falha = null;
                try { await Baixar(v, false); }
                catch (Exception ex) { falha = ex is OperationCanceledException ? "cancelado" : ex.Message; }
                finally { baixandoId = null; }
                if (falha != null)
                {
                    c["visao"] = false; SalvarConfig(c);
                    Evento("download-fim", Dic("id", v.Id, "ok", false, "erro", falha == "cancelado" ? "cancelado" : MensagemDownload(falha, v)));
                    return;
                }
                Evento("download-fim", Dic("id", v.Id, "ok", true));
            }
        }
        trocando = true;
        try
        {
            Evento("motor", Dic("estado", "trocando"));
            PararMotor();
            string erro = await LigarMotor();
            Evento("motor", erro == null ? Dic("estado", "pronto", "nome", modelo.Nome, "visao", visaoAtiva) : Dic("estado", "erro", "mensagem", erro));
        }
        finally { trocando = false; }
    }

    // ---------- GPU (Vulkan) ----------
    static string PastaGpu() { return Path.Combine(Raiz(), @"gpu\" + Gpu.Build); }
    static string DllGpu() { return Path.Combine(PastaGpu(), Gpu.Dll); }
    static bool GpuBaixada() { try { FileInfo f = new FileInfo(DllGpu()); return f.Exists && f.Length == Gpu.DllTamanho; } catch { return false; } }
    bool GpuLigada() { object v; return LerConfig().TryGetValue("gpu", out v) && v is bool && (bool)v; }
    static string Sha256De(string p) { using (FileStream f = File.OpenRead(p)) using (SHA256 s = SHA256.Create()) return BitConverter.ToString(s.ComputeHash(f)).Replace("-", "").ToLowerInvariant(); }
    // tira só o ggml-vulkan.dll do zip da release (o resto é igual ao motor de CPU), confere o SHA-256 e descarta o zip
    void ExtrairGpu()
    {
        string zip = AcharModelo(Gpu.Zip); if (zip == null) throw new Exception("o pacote da GPU não foi baixado");
        Directory.CreateDirectory(PastaGpu());
        string tmp = DllGpu() + ".tmp";
        using (ZipArchive z = ZipFile.OpenRead(zip))
        {
            ZipArchiveEntry e = null; foreach (ZipArchiveEntry x in z.Entries) if (x.Name == Gpu.Dll) { e = x; break; }
            if (e == null) throw new Exception("o pacote da GPU não tem o " + Gpu.Dll);
            e.ExtractToFile(tmp, true);
        }
        if (Sha256De(tmp) != Gpu.DllSha) { File.Delete(tmp); throw new Exception("o " + Gpu.Dll + " veio com defeito; baixe de novo"); }
        if (File.Exists(DllGpu())) File.Delete(DllGpu());
        File.Move(tmp, DllGpu());
        try { File.Delete(zip); } catch { }
    }
    async Task BaixarGpu()
    {
        baixandoId = Gpu.Zip.Id; cancelarBaixar = false; string erro = null;
        try { await Baixar(Gpu.Zip, false); ExtrairGpu(); }
        catch (Exception ex) { erro = ex is OperationCanceledException ? "cancelado" : MensagemDownload(ex.Message, Gpu.Zip); Program.Log("gpu download: " + ex.Message); }
        finally { baixandoId = null; }
        Evento("download-fim", Dic("id", Gpu.Zip.Id, "ok", erro == null, "erro", erro));
    }
    // motor com GPU: o llama.cpp carrega o backend Vulkan se o dll estiver na pasta do motor; sem GPU, o dll sai de lá
    string PrepararGpu()
    {
        string alvo = Path.Combine(pasta, @"motor\" + Gpu.Dll);
        bool usar = GpuLigada() && GpuBaixada() && !gpuFalhou;
        try
        {
            if (!usar) { if (File.Exists(alvo)) File.Delete(alvo); gpuAtiva = false; return ""; }
            FileInfo a = new FileInfo(alvo);
            if (!a.Exists || a.Length != Gpu.DllTamanho) File.Copy(DllGpu(), alvo, true);
        }
        catch (Exception ex) { Program.Log("gpu: " + ex.Message); gpuAtiva = false; return ""; }
        if (gpuDispositivo == null) ListarGpu();
        gpuAtiva = gpuDispositivo != null;
        return gpuAtiva ? " -ngl 999 -dev " + gpuDispositivo : "";
    }
    // "llama-server --list-devices" → "  Vulkan0: NVIDIA GeForce RTX 3050 (6001 MiB, ...)": prefere a placa dedicada à integrada
    void ListarGpu()
    {
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo(Path.Combine(pasta, @"motor\llama-server.exe"), "--list-devices") { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true, WorkingDirectory = Path.Combine(pasta, "motor") };
            Process p = Process.Start(psi); string saida = p.StandardOutput.ReadToEnd() + p.StandardError.ReadToEnd(); p.WaitForExit(20000);
            string primeiro = null, primeiroNome = null;
            foreach (Match m in Regex.Matches(saida, @"^\s*(Vulkan\d+):\s*(.+?)\s*\(", RegexOptions.Multiline))
            {
                string id = m.Groups[1].Value, nome = m.Groups[2].Value;
                if (primeiro == null) { primeiro = id; primeiroNome = nome; }
                bool dedicada = Regex.IsMatch(nome, "NVIDIA|GeForce|RTX|GTX|Radeon RX|Radeon Pro|Arc", RegexOptions.IgnoreCase) && !Regex.IsMatch(nome, @"Radeon\(TM\) Graphics|Radeon Graphics$", RegexOptions.IgnoreCase);
                if (dedicada) { gpuDispositivo = id; gpuNome = nome; return; }
            }
            gpuDispositivo = primeiro; gpuNome = primeiroNome;
        }
        catch (Exception ex) { Program.Log("gpu list: " + ex.Message); }
    }
    // o motor com GPU não subiu: volta para a CPU nesta sessão (a preferência fica; a pessoa pode tentar de novo)
    async Task<string> SemGpu(string motivo) { Program.Log("gpu: motor " + motivo + "; voltando para CPU"); gpuFalhou = true; gpuAtiva = false; return await LigarMotor(); }
    async Task<object> LigarGpu(bool ligar)
    {
        if (ligar && !GpuBaixada()) throw new Exception("baixe a aceleração por GPU primeiro");
        Dictionary<string, object> c = LerConfig(); c["gpu"] = ligar; SalvarConfig(c); gpuFalhou = false;
        trocando = true;
        try
        {
            Evento("motor", Dic("estado", "trocando"));
            PararMotor();
            string erro = await LigarMotor();
            Evento("motor", erro == null ? Dic("estado", "pronto", "nome", modelo.Nome, "visao", visaoAtiva) : Dic("estado", "erro", "mensagem", erro));
            if (erro != null) throw new Exception(erro);
        }
        finally { trocando = false; }
        return Dic("ativa", gpuAtiva, "dispositivo", gpuNome ?? "");
    }
    async Task<object> ApagarGpu()
    {
        if (baixandoId == Gpu.Zip.Id) throw new Exception("cancele o download antes de apagar");
        if (gpuAtiva) await LigarGpu(false); else { Dictionary<string, object> c = LerConfig(); c["gpu"] = false; SalvarConfig(c); }
        foreach (string a in new[] { DllGpu(), Path.Combine(Raiz(), @"modelos\" + Gpu.Zip.Arquivo), Path.Combine(Raiz(), @"modelos\" + Gpu.Zip.Arquivo + ".baixando") })
            try { if (File.Exists(a)) File.Delete(a); } catch (Exception ex) { Program.Log("apagar gpu: " + ex.Message); }
        return true;
    }

    // vigia: se o motor cair sem a gente pedir, religa na mesma porta (até 5 vezes em 3 minutos)
    void MotorSaiu(object o, EventArgs e)
    {
        if (o == ignorarSaida) return;
        if (desligando || trocando || o != motor) return;
        BeginInvoke((Action)async delegate
        {
            if (desligando || trocando) return;
            quedas.Add(DateTime.Now); quedas.RemoveAll(delegate (DateTime d) { return (DateTime.Now - d).TotalMinutes > 3; });
            if (quedas.Count > 5) { Evento("motor", Dic("estado", "erro", "mensagem", "O motor da IA está caindo repetidamente. Veja o Diagnóstico ou use um modelo menor.")); return; }
            Program.Log("motor caiu; religando");
            Evento("motor", Dic("estado", "reiniciando"));
            await Task.Delay(800);
            string erro = await LigarMotor();
            Evento("motor", erro == null ? Dic("estado", "pronto", "nome", modelo.Nome) : Dic("estado", "erro", "mensagem", erro));
        });
    }

    async Task TrocarModelo(Modelo novo)
    {
        if (trocando) return;
        trocando = true;
        try
        {
            Dictionary<string, object> c = LerConfig();
            Modelo antigo = modelo; modelo = novo;
            if (AcharModelo(novo) == null)
            {
                string falha = null;
                baixandoId = novo.Id; cancelarBaixar = false;
                try { await Baixar(novo, false); } catch (Exception ex) { falha = ex is OperationCanceledException ? "cancelado" : ex.Message; } finally { baixandoId = null; }
                if (falha != null) { modelo = antigo; Evento("motor", Dic("estado", "erro", "mensagem", MensagemDownload(falha, novo))); return; }
            }
            Evento("motor", Dic("estado", "trocando"));
            PararMotor();
            arquivoModelo = AcharModelo(novo);
            string erro = await LigarMotor();
            if (erro != null)
            {   // o modelo novo não subiu (memória?): volta o anterior, que funcionava, e não grava a escolha
                modelo = antigo; arquivoModelo = AcharModelo(antigo);
                if (arquivoModelo != null) await LigarMotor();
                Evento("motor", Dic("estado", "erro", "mensagem", erro)); return;
            }
            c["modelo"] = novo.Id; SalvarConfig(c);
            Evento("motor", Dic("estado", "pronto", "nome", novo.Nome));
        }
        finally { trocando = false; }
    }

    void PararMotor()
    {
        try { if (motor != null && !motor.HasExited) { motor.Kill(); motor.WaitForExit(5000); } } catch { }
    }

    // ---------- mensagens da página ----------
    void Mensagem(object o, CoreWebView2WebMessageReceivedEventArgs a)
    {
        // só a nossa página fala com o app: a servida pelo motor (127.0.0.1) ou a local da abertura fria (NavigateToString → about:blank)
        string origem = a.Source ?? "";
        if (!origem.StartsWith("http://127.0.0.1:") && origem != "about:blank") return;
        Dictionary<string, object> m;
        try { m = json.Deserialize<Dictionary<string, object>>(a.WebMessageAsJson); } catch { return; }
        object t; if (m == null || !m.TryGetValue("t", out t)) return;
        if ((t as string) == "tentar") { if (tentarDeNovo != null) tentarDeNovo.TrySetResult(true); return; }
        if ((t as string) != "pedido") return;
        object idO, acaoO, argsO;
        m.TryGetValue("id", out idO); m.TryGetValue("acao", out acaoO); m.TryGetValue("args", out argsO);
        Dictionary<string, object> args = argsO as Dictionary<string, object> ?? new Dictionary<string, object>();
        Atender(idO, acaoO as string, args);
    }

    async void Atender(object id, string acao, Dictionary<string, object> args)
    {
        object dados = null; string erro = null;
        try
        {
            switch (acao)
            {
                case "carregar": dados = await Task.Run(delegate { return CarregarConversas(); }); break;
                case "salvar":
                    string conteudo = Arg(args, "dados") ?? "[]";
                    await Task.Run(delegate { lock (json) GravarSeguro(Path.Combine(PastaDados(), "conversas.json"), conteudo); });
                    dados = true; break;
                case "sistema": dados = await Task.Run(delegate { return Sistema(); }); break;
                case "tema": Tema(Arg(args, "v") == "escuro"); dados = true; break;
                case "link": AbrirLink(Arg(args, "url")); dados = true; break;
                case "modelo":
                    Modelo novo = Modelo.PorId(Arg(args, "id"));
                    if (novo == null) throw new Exception("modelo desconhecido");
                    if (baixandoId != null || trocando) throw new Exception("espere o download ou a troca atual terminar");
                    if (novo.Id != modelo.Id) { var _ = TrocarModelo(novo); }
                    dados = true; break;
                case "salvarArquivo": dados = SalvarArquivo(Arg(args, "nome"), Arg(args, "conteudo")); break;
                case "baixarModelo":
                    Modelo mb = Modelo.PorId(Arg(args, "id"));
                    if (mb == null) throw new Exception("modelo desconhecido");
                    if (baixandoId != null || trocando) throw new Exception("já há um download em andamento");
                    if (AcharModelo(mb) == null) { var _b = SoBaixar(mb); }
                    else Evento("download-fim", Dic("id", mb.Id, "ok", true));
                    dados = true; break;
                case "cancelarDownload": cancelarBaixar = true; dados = true; break;
                case "ocupado": ManterAcordado(args.ContainsKey("sim") && args["sim"] is bool && (bool)args["sim"], true); dados = true; break;
                case "apagarModelo": dados = ApagarModelo(Modelo.PorId(Arg(args, "id"))); break;
                case "escolherModelo":
                    Modelo me = Modelo.PorId(Arg(args, "id"));
                    if (me == null) throw new Exception("modelo desconhecido");
                    if (!escolhendo) throw new Exception("o modelo já foi escolhido");
                    if (baixandoId != null) throw new Exception("já há um download em andamento");
                    { var _e = EscolherPrimeiroModelo(me); }
                    dados = true; break;
                case "baixarVoz":
                    Modelo vb = Vozes.PorId(Arg(args, "id"));
                    if (vb == null) throw new Exception("voz desconhecida");
                    if (baixandoId != null) throw new Exception("já há um download em andamento");
                    if (AcharModelo(vb) == null) { var _vb = SoBaixar(vb); } else Evento("download-fim", Dic("id", vb.Id, "ok", true));
                    dados = true; break;
                case "usarVoz":
                    if (Vozes.PorId(Arg(args, "id")) == null) throw new Exception("voz desconhecida");
                    { Dictionary<string, object> cv = LerConfig(); cv["voz"] = Arg(args, "id"); SalvarConfig(cv); }
                    dados = true; break;
                case "apagarVoz":
                    Modelo va = Vozes.PorId(Arg(args, "id"));
                    if (va == null) throw new Exception("voz desconhecida");
                    if (baixandoId == va.Id) throw new Exception("cancele o download antes de apagar");
                    foreach (string a in new[] { Path.Combine(Raiz(), @"modelos\" + va.Arquivo), Path.Combine(Raiz(), @"modelos\" + va.Arquivo + ".baixando") }) try { if (File.Exists(a)) File.Delete(a); } catch { }
                    dados = true; break;
                case "audioInicio":
                    { string ida = Guid.NewGuid().ToString("N"); File.WriteAllBytes(ArquivoAudio(ida, Arg(args, "ext")), new byte[0]); audios[ida] = ArquivoAudio(ida, Arg(args, "ext")); dados = ida; }
                    break;
                case "audioParte":
                    {
                        string ida = Arg(args, "id"), arqA;
                        if (ida == null || !audios.TryGetValue(ida, out arqA)) throw new Exception("áudio desconhecido");
                        byte[] parte = Convert.FromBase64String(Arg(args, "dados") ?? "");
                        await Task.Run(delegate { using (FileStream fa = new FileStream(arqA, FileMode.Append, FileAccess.Write)) fa.Write(parte, 0, parte.Length); });
                        if (new FileInfo(arqA).Length > 200L << 20) throw new Exception("áudio grande demais");
                        dados = true;
                    }
                    break;
                case "transcrever":
                    {
                        string ida = Arg(args, "id"), arqA;
                        if (ida == null || !audios.TryGetValue(ida, out arqA)) throw new Exception("áudio desconhecido");
                        audios.Remove(ida);
                        try { dados = await Transcrever(arqA); }
                        finally { try { File.Delete(arqA); File.Delete(arqA + ".txt"); } catch { } }
                    }
                    break;
                case "visao":
                    if (baixandoId != null || trocando) throw new Exception("espere o download ou a troca atual terminar");
                    { var _v = LigarVisao(args.ContainsKey("ligar") && args["ligar"] is bool && (bool)args["ligar"]); }
                    dados = true; break;
                case "baixarGpu":
                    if (baixandoId != null || trocando) throw new Exception("espere o download ou a troca atual terminar");
                    { var _g = BaixarGpu(); } dados = true; break;
                case "ligarGpu":
                    if (baixandoId != null || trocando) throw new Exception("espere o download ou a troca atual terminar");
                    dados = await LigarGpu(args.ContainsKey("ligar") && args["ligar"] is bool && (bool)args["ligar"]); break;
                case "apagarGpu": dados = await ApagarGpu(); break;
                case "apagarVisao":
                    Modelo mv = Modelo.PorId(Arg(args, "id"));
                    if (mv == null) throw new Exception("modelo desconhecido");
                    if (visaoAtiva && mv.Id == modelo.Id) throw new Exception("a visão deste modelo está em uso; desligue a visão antes de apagar");
                    foreach (string a in new[] { Path.Combine(Raiz(), @"modelos\" + mv.Visao().Arquivo), Path.Combine(Raiz(), @"modelos\" + mv.Visao().Arquivo + ".baixando") })
                        try { if (File.Exists(a)) File.Delete(a); } catch { }
                    dados = true; break;
                case "verificarModelos": dados = await Task.Run(delegate { return VerificarModelos(); }); break;
                case "atualizar": dados = await Atualizar(Arg(args, "versao")); break;
                default: throw new Exception("ação desconhecida: " + acao);
            }
        }
        catch (Exception ex) { erro = ex.Message; }
        Dictionary<string, object> r = Dic("t", "resposta", "id", id, "ok", erro == null);
        if (erro == null) r["dados"] = dados; else r["erro"] = erro;
        try { web.CoreWebView2.PostWebMessageAsJson(json.Serialize(r)); } catch { }
    }
    static string Arg(Dictionary<string, object> a, string k) { object v; return a.TryGetValue(k, out v) ? v as string : null; }
    static Dictionary<string, object> Dic(params object[] kv) { Dictionary<string, object> d = new Dictionary<string, object>(); for (int i = 0; i + 1 < kv.Length; i += 2) d[(string)kv[i]] = kv[i + 1]; return d; }
    void Evento(string nome, object dados) { try { web.CoreWebView2.PostWebMessageAsJson(json.Serialize(Dic("t", "evento", "nome", nome, "dados", dados))); } catch { } }

    // lê as conversas; se o arquivo estiver danificado, usa o .bak
    string CarregarConversas()
    {
        string p = Path.Combine(PastaDados(), "conversas.json");
        foreach (string c in new[] { p, p + ".bak", p + ".tmp" })
        {
            try { if (!File.Exists(c)) continue; string s = File.ReadAllText(c, Encoding.UTF8); json.DeserializeObject(s); return s; }
            catch { Program.Log("conversas ilegíveis: " + c); }
        }
        return File.Exists(p) ? "{corrompido" : "[]";   // a página detecta e não sobrescreve
    }

    Dictionary<string, object> Sistema()
    {
        MEMSTAT ms = new MEMSTAT(); GlobalMemoryStatusEx(ms);
        string cpu = "?", so = Environment.OSVersion.VersionString;
        try { cpu = (Microsoft.Win32.Registry.GetValue(@"HKEY_LOCAL_MACHINE\HARDWARE\DESCRIPTION\System\CentralProcessor\0", "ProcessorNameString", "?") as string ?? "?").Trim(); } catch { }
        try
        {
            string k = @"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion";
            string nome = Microsoft.Win32.Registry.GetValue(k, "ProductName", "") as string, disp = Microsoft.Win32.Registry.GetValue(k, "DisplayVersion", "") as string;
            object build = Microsoft.Win32.Registry.GetValue(k, "CurrentBuild", "");
            if (!string.IsNullOrEmpty(nome)) so = (Convert.ToInt32(build) >= 22000 ? nome.Replace("Windows 10", "Windows 11") : nome) + (string.IsNullOrEmpty(disp) ? "" : " " + disp) + " (build " + build + ")";
        }
        catch { }
        long disco = 0; try { disco = new DriveInfo(Path.GetPathRoot(Raiz())).AvailableFreeSpace; } catch { }
        List<object> ms2 = new List<object>();
        foreach (Modelo m in Modelo.Todos)
            ms2.Add(Dic("id", m.Id, "nome", m.Nome, "descricao", m.Descricao, "arquivo", m.Arquivo, "tamanho", m.Tamanho, "ramMin", m.RamMin,
                "baixado", AcharModelo(m) != null, "atual", m.Id == modelo.Id, "visaoTamanho", m.VisaoTamanho, "visaoBaixada", AcharModelo(m.Visao()) != null));
        string wv = "?"; try { wv = CoreWebView2Environment.GetAvailableBrowserVersionString(); } catch { }
        return Dic("ramTotal", (long)ms.total, "ramLivre", (long)ms.avail, "cpu", cpu, "nucleos", Environment.ProcessorCount, "discoLivre", disco,
            "pastaDados", PastaDados(), "pastaModelos", Path.Combine(Raiz(), "modelos"), "so", so + " · WebView2 " + wv, "modelos", ms2, "versao", Program.Versao, "motorLog", Path.Combine(Raiz(), "motor.log"), "visaoLigada", VisaoLigada(), "visaoAtiva", visaoAtiva, "temVisao", true,
            "temTranscricao", File.Exists(Path.Combine(pasta, @"voz\whisper-cli.exe")), "vozes", ListaVozes(),
            "gpu", Dic("baixada", GpuBaixada(), "ligada", GpuLigada(), "ativa", gpuAtiva, "dispositivo", gpuNome ?? "", "tamanho", Gpu.Zip.Tamanho, "falhou", gpuFalhou));
    }

    // ---------- transcrição de áudio (whisper.cpp) ----------
    readonly Dictionary<string, string> audios = new Dictionary<string, string>();
    static string ArquivoAudio(string id, string ext)
    {
        if (ext == null || !Regex.IsMatch(ext, "^(wav|mp3|m4a|ogg|flac)$")) ext = "wav";
        return Path.Combine(Path.GetTempPath(), "propons-audio-" + id + "." + ext);
    }
    Modelo VozAtual() { object v; Dictionary<string, object> c = LerConfig(); return (c.TryGetValue("voz", out v) ? Vozes.PorId(v as string) : null) ?? Vozes.Base; }
    List<object> ListaVozes()
    {
        List<object> l = new List<object>(); Modelo atual = VozAtual();
        foreach (Modelo v in Vozes.Todas) l.Add(Dic("id", v.Id, "nome", v.Nome, "descricao", v.Descricao, "tamanho", v.Tamanho, "baixado", AcharModelo(v) != null, "atual", v.Id == atual.Id));
        return l;
    }

    // roda o whisper-cli (prioridade baixa) e devolve o texto; o progresso vai para a página
    async Task<object> Transcrever(string arquivo)
    {
        Modelo voz = VozAtual(); string modeloVoz = AcharModelo(voz);
        if (modeloVoz == null) throw new Exception("a voz " + voz.Nome + " não está baixada");
        string exe = Path.Combine(pasta, @"voz\whisper-cli.exe");
        if (!File.Exists(exe)) throw new Exception("transcrição não disponível nesta versão");
        int threads = Math.Max(1, Math.Min(8, Environment.ProcessorCount / 2));
        ProcessStartInfo psi = new ProcessStartInfo(exe, "-m \"" + modeloVoz + "\" -f \"" + arquivo + "\" -l pt -pp -mc 0 -t " + threads + " -otxt -of \"" + arquivo + "\"");
        psi.WorkingDirectory = Path.Combine(pasta, "voz"); psi.UseShellExecute = false; psi.CreateNoWindow = true;
        psi.RedirectStandardOutput = true; psi.RedirectStandardError = true;
        ManterAcordado(true);
        DateTime t0 = DateTime.Now;
        try
        {
            string erro = await Task.Run(delegate
            {
                StringBuilder err = new StringBuilder();
                using (Process p = new Process { StartInfo = psi })
                {
                    p.ErrorDataReceived += delegate (object o, DataReceivedEventArgs a)
                    {
                        if (a.Data == null) return;
                        Match mm = Regex.Match(a.Data, @"progress\s*=\s*(\d+)%");
                        if (mm.Success) { double v = int.Parse(mm.Groups[1].Value) / 100.0; BeginInvoke((Action)delegate { Evento("transcricao", Dic("pct", v)); }); }
                        else lock (err) err.AppendLine(a.Data);
                    };
                    p.OutputDataReceived += delegate { };
                    p.Start(); p.BeginErrorReadLine(); p.BeginOutputReadLine();
                    Job.Prender(p);
                    try { p.PriorityClass = ProcessPriorityClass.BelowNormal; } catch { }
                    p.WaitForExit();
                    return p.ExitCode == 0 ? null : err.ToString();
                }
            });
            string txt = arquivo + ".txt";
            if (!File.Exists(txt)) throw new Exception("não foi possível transcrever este áudio" + (erro != null && erro.Contains("failed to read") ? " (formato não reconhecido)" : ""));
            string texto = File.ReadAllText(txt, Encoding.UTF8).Replace("\r", "").Trim();
            texto = Regex.Replace(texto, @"\s*\n\s*", " ").Trim();
            return Dic("texto", texto, "segundos", (DateTime.Now - t0).TotalSeconds);
        }
        finally { ManterAcordado(false); }
    }

    // primeira abertura: baixa o modelo escolhido, liga a IA e abre o chat
    async Task EscolherPrimeiroModelo(Modelo m)
    {
        modelo = m;
        if (AcharModelo(m) == null)
        {
            baixandoId = m.Id; cancelarBaixar = false; string falha = null;
            try { await Baixar(m, false); }
            catch (Exception ex) { falha = ex is OperationCanceledException ? "cancelado" : MensagemDownload(ex.Message, m); }
            finally { baixandoId = null; }
            if (falha != null) { Evento("download-fim", Dic("id", m.Id, "ok", false, "erro", falha)); return; }
        }
        arquivoModelo = AcharModelo(m);
        Evento("motor", Dic("estado", "ligando"));
        string erro = await LigarMotor();
        if (erro != null) { RegistrarFalhaBoot(); Evento("motor", Dic("estado", "erro", "mensagem", erro)); return; }
        Dictionary<string, object> c = LerConfig(); c["modelo"] = m.Id; c["falhasBoot"] = 0; SalvarConfig(c);
        escolhendo = false;
        web.CoreWebView2.Navigate("http://127.0.0.1:" + porta + "/#k=" + chave);
    }

    // ---------- gerenciar modelos ----------
    async Task SoBaixar(Modelo m)
    {
        baixandoId = m.Id; cancelarBaixar = false;
        string erro = null;
        try { await Baixar(m, false); }
        catch (Exception ex) { erro = ex is OperationCanceledException ? "cancelado" : MensagemDownload(ex.Message, m); Program.Log("download " + m.Id + ": " + ex.Message); }
        finally { baixandoId = null; }
        Evento("download-fim", Dic("id", m.Id, "ok", erro == null, "erro", erro));
    }

    object ApagarModelo(Modelo m)
    {
        if (m == null) throw new Exception("modelo desconhecido");
        if (m.Id == modelo.Id) throw new Exception("este modelo está em uso; troque de modelo antes de apagar");
        if (baixandoId == m.Id) throw new Exception("cancele o download antes de apagar");
        string[] arquivos = {
            Path.Combine(Raiz(), @"modelos\" + m.Arquivo), Path.Combine(Raiz(), @"modelos\" + m.Arquivo + ".baixando"),
            Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), @"modelos\" + m.Arquivo) };
        foreach (string a in arquivos) try { if (File.Exists(a)) File.Delete(a); } catch (Exception ex) { Program.Log("apagar " + a + ": " + ex.Message); }
        if (AcharModelo(m) != null) throw new Exception("não foi possível apagar o arquivo");
        return true;
    }

    // confere o SHA-256 de cada modelo baixado; os com defeito são apagados (menos o que está em uso)
    List<object> VerificarModelos()
    {
        List<object> r = new List<object>();
        // confere tudo que foi baixado: os 3 modelos, os módulos de visão e as vozes
        List<Modelo> todos = new List<Modelo>(Modelo.Todos);
        foreach (Modelo m in Modelo.Todos) todos.Add(m.Visao());
        todos.AddRange(Vozes.Todas);
        foreach (Modelo m in todos)
        {
            string p = AcharModelo(m);
            if (p == null || m.Id == baixandoId) continue;
            Modelo mm = m;
            bool ok = ShaArquivo(p, delegate (double v) { BeginInvoke((Action)delegate { Evento("verificacao", Dic("id", mm.Id, "nome", mm.Nome, "pct", v)); }); }) == m.Sha256;
            bool apagado = false;
            if (!ok && m.Id != modelo.Id && m.Id != "visao-" + modelo.Id) try { File.Delete(p); apagado = true; } catch { }   // o que está em uso não é apagado
            r.Add(Dic("id", m.Id, "nome", m.Nome, "ok", ok, "apagado", apagado));
        }
        return r;
    }

    static string ShaArquivo(string p, Action<double> progresso)
    {
        using (SHA256 sha = SHA256.Create())
        using (FileStream f = new FileStream(p, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, 1 << 20, FileOptions.SequentialScan))
        {
            byte[] buf = new byte[1 << 20]; int n; long lido = 0; DateTime ultimo = DateTime.MinValue;
            while ((n = f.Read(buf, 0, buf.Length)) > 0)
            {
                sha.TransformBlock(buf, 0, n, null, 0); lido += n;
                if (progresso != null && (DateTime.Now - ultimo).TotalMilliseconds > 300) { ultimo = DateTime.Now; progresso((double)lido / Math.Max(1, f.Length)); }
            }
            sha.TransformFinalBlock(buf, 0, 0);
            return BitConverter.ToString(sha.Hash).Replace("-", "").ToLowerInvariant();
        }
    }

    // ---------- atualização do programa ----------
    // baixa o .exe novo da release, confere com o SHA256SUMS dela e deixa um script trocar o arquivo quando este fechar
    async Task<object> Atualizar(string versao)
    {
        if (versao == null || !Regex.IsMatch(versao, @"^\d{1,3}\.\d{1,3}\.\d{1,3}$")) throw new Exception("versão inválida");
        const string Arquivo = "Propons-IA-Windows.exe";
        string exe = Application.ExecutablePath, dir = Path.GetDirectoryName(exe);
        string baseUrl = "https://github.com/muurxdev/propons-ia/releases/download/v" + versao + "/";
        string novo = Path.Combine(dir, ".propons-atualizacao.tmp");
        try { File.WriteAllText(novo, ""); } catch { throw new Exception("sem permissão para gravar na pasta do programa. Baixe a versão nova pelo site."); }

        ManterAcordado(true);
        try { return await AtualizarInterno(versao, Arquivo, exe, baseUrl, novo); }
        finally { ManterAcordado(false); }
    }

    async Task<object> AtualizarInterno(string versao, string Arquivo, string exe, string baseUrl, string novo)
    {
        string somas = await Task.Run(delegate { return BaixarTexto(baseUrl + "SHA256SUMS"); });
        string esperado = null;
        foreach (string l in somas.Split('\n'))
        {
            string[] p = l.Trim().Split(new[] { ' ', '*' }, StringSplitOptions.RemoveEmptyEntries);
            if (p.Length == 2 && p[1] == Arquivo) esperado = p[0].ToLowerInvariant();
        }
        if (esperado == null) throw new Exception("a versão " + versao + " não tem o programa do Windows");

        await Task.Run(delegate
        {
            HttpWebRequest r = (HttpWebRequest)WebRequest.Create(baseUrl + Arquivo);
            r.UserAgent = "ProponsIA/" + Program.Versao; r.Timeout = 30000; r.ReadWriteTimeout = 30000; r.AllowAutoRedirect = true;
            r.Proxy = WebRequest.GetSystemWebProxy(); r.Proxy.Credentials = CredentialCache.DefaultCredentials;
            using (HttpWebResponse resp = (HttpWebResponse)r.GetResponse())
            using (Stream s = resp.GetResponseStream())
            using (FileStream f = new FileStream(novo, FileMode.Create, FileAccess.Write, FileShare.None, 1 << 16, FileOptions.WriteThrough))
            {
                long total = resp.ContentLength, ja = 0; byte[] buf = new byte[1 << 18]; int n; DateTime ultimo = DateTime.MinValue;
                while ((n = s.Read(buf, 0, buf.Length)) > 0)
                {
                    f.Write(buf, 0, n); ja += n;
                    if ((DateTime.Now - ultimo).TotalMilliseconds > 250)
                    {
                        ultimo = DateTime.Now; long jj = ja;
                        BeginInvoke((Action)delegate { Evento("atualizacao", Dic("fase", "baixando", "pct", total > 0 ? (double)jj / total : 0.0, "feito", jj, "total", total)); });
                    }
                }
                f.Flush(true);
            }
        });
        Evento("atualizacao", Dic("fase", "verificando", "pct", 1.0));
        string sha = await Task.Run(delegate { return ShaArquivo(novo, null); });
        if (sha != esperado) { try { File.Delete(novo); } catch { } throw new Exception("o arquivo baixado veio com defeito. Tente de novo."); }

        Evento("atualizacao", Dic("fase", "instalando", "pct", 1.0));
        // PowerShell (texto em UTF-16 via -EncodedCommand, aceita o "ó" do nome): espera fechar, troca e abre de novo
        string q = "'";
        Func<string, string> lit = delegate (string t) { return q + t.Replace(q, q + q) + q; };
        string ps = "$ErrorActionPreference='Stop';$p=" + Process.GetCurrentProcess().Id + ";$n=" + lit(novo) + ";$e=" + lit(exe) + ";" +
            "while(Get-Process -Id $p -ErrorAction SilentlyContinue){Start-Sleep -Milliseconds 300};" +
            "$ok=$false;for($i=0;$i -lt 60 -and -not $ok;$i++){try{[IO.File]::Copy($n,$e,$true);$ok=$true}catch{Start-Sleep -Milliseconds 500}};" +
            "if($ok){Remove-Item -LiteralPath $n -Force -ErrorAction SilentlyContinue};Start-Process -FilePath $e";
        ProcessStartInfo psi = new ProcessStartInfo("powershell.exe", "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand " + Convert.ToBase64String(Encoding.Unicode.GetBytes(ps)));
        psi.UseShellExecute = false; psi.CreateNoWindow = true; psi.WindowStyle = ProcessWindowStyle.Hidden;
        Process.Start(psi);
        Program.Log("atualizando para " + versao);
        System.Windows.Forms.Timer fechar = new System.Windows.Forms.Timer { Interval = 1500 };
        fechar.Tick += delegate { fechar.Stop(); Close(); };
        fechar.Start();
        return true;
    }

    static string BaixarTexto(string url)
    {
        HttpWebRequest r = (HttpWebRequest)WebRequest.Create(url);
        r.UserAgent = "ProponsIA/" + Program.Versao; r.Timeout = 30000; r.AllowAutoRedirect = true;
        r.Proxy = WebRequest.GetSystemWebProxy(); r.Proxy.Credentials = CredentialCache.DefaultCredentials;
        using (HttpWebResponse resp = (HttpWebResponse)r.GetResponse())
        using (StreamReader sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8)) return sr.ReadToEnd();
    }

    object SalvarArquivo(string nome, string conteudo)
    {
        using (SaveFileDialog d = new SaveFileDialog())
        {
            d.FileName = nome ?? "arquivo.txt";
            string ext = Path.GetExtension(d.FileName).TrimStart('.');
            d.Filter = (ext == "json" ? "JSON|*.json" : ext == "md" ? "Markdown|*.md" : "Texto|*.txt") + "|Todos os arquivos|*.*";
            d.InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            if (d.ShowDialog(this) != DialogResult.OK) return false;
            File.WriteAllText(d.FileName, conteudo ?? "", new UTF8Encoding(false));
            return true;
        }
    }

    static void AbrirLink(string url)
    {
        if (string.IsNullOrEmpty(url) || !(url.StartsWith("https://") || url.StartsWith("http://"))) return;
        try { Process.Start(url); } catch { }
    }

    void Falha(string m)
    {
        if (web != null && web.CoreWebView2 != null) Splash(-2, "Não foi possível abrir", m);
        else { MessageBox.Show(this, m, Program.Titulo, MessageBoxButtons.OK, MessageBoxIcon.Warning); Close(); }
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        GuardarJanela();
        desligando = true; PararMotor();
        try { if (aviso != null) { aviso.Visible = false; aviso.Dispose(); } } catch { }
        base.OnFormClosing(e);
    }

    // ---------- PC acordado e avisos ----------
    [DllImport("kernel32.dll")] static extern uint SetThreadExecutionState(uint f);
    int acordado; bool respondendo;
    // enquanto baixa ou responde, o Windows não entra em suspensão (a tela pode apagar normalmente)
    void ManterAcordado(bool sim, bool resposta = false)
    {
        if (InvokeRequired) { BeginInvoke((Action)delegate { ManterAcordado(sim, resposta); }); return; }
        if (resposta) { if (sim == respondendo) return; respondendo = sim; }
        acordado = Math.Max(0, acordado + (sim ? 1 : -1));
        try { SetThreadExecutionState(acordado > 0 ? 0x80000001u : 0x80000000u); } catch { }
    }
    NotifyIcon aviso;
    void Avisar(string titulo, string texto)
    {
        if (InvokeRequired) { BeginInvoke((Action)delegate { Avisar(titulo, texto); }); return; }
        if (ContainsFocus && WindowState != FormWindowState.Minimized) return;
        try
        {
            if (aviso == null)
            {
                aviso = new NotifyIcon { Icon = Icon ?? SystemIcons.Information, Text = Program.Titulo, Visible = true };
                aviso.BalloonTipClicked += delegate { if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal; Activate(); };
                aviso.Click += delegate { if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal; Activate(); };
            }
            aviso.ShowBalloonTip(10000, titulo, texto, ToolTipIcon.Info);
        }
        catch (Exception ex) { Program.Log("aviso: " + ex.Message); }
    }

    // ---------- tela de carregamento ----------
    void Splash(double v, string titulo, string sub)
    {
        if (web == null || web.CoreWebView2 == null) return;
        string js = "p(" + v.ToString("0.000", System.Globalization.CultureInfo.InvariantCulture) + "," + json.Serialize(titulo) + "," + json.Serialize(sub) + ")";
        try { web.CoreWebView2.ExecuteScriptAsync(js); } catch { }
    }

    const string LogoSvg = "<svg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'><rect width='64' height='64' rx='18' fill='#7c5cff'/><path d='M24 50V24.5' stroke='#fff' stroke-width='7' stroke-linecap='round'/><circle cx='34.5' cy='30' r='9.5' fill='none' stroke='#fff' stroke-width='7'/><circle cx='47' cy='47' r='3.6' fill='#fff'/></svg>";

    string Splash()
    {
        bool esc = Escuro();
        return @"<!doctype html><html data-tema='" + (esc ? "escuro" : "claro") + @"'><head><meta charset='utf-8'><style>
:root{--bg:#fff;--ink:#111114;--mu:#6b6b76;--ln:#e6e6eb;--ac:#7c5cff}
:root[data-tema=escuro]{--bg:#17171b;--ink:#ececf1;--mu:#9d9daa;--ln:#2b2b32;--ac:#8f76ff}
html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);font:15px 'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif;display:grid;place-items:center;user-select:none;cursor:default;-webkit-font-smoothing:antialiased}
.b{text-align:center;width:280px}
.logo{width:52px;height:52px;margin:0 auto 18px}
h1{font-size:17px;font-weight:600;margin:0 0 4px}
#s{color:var(--mu);margin:0;font-size:13px;min-height:18px}
.bar{height:4px;background:var(--ln);border-radius:4px;margin:18px auto 0;overflow:hidden;position:relative}
.bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--ac);border-radius:4px;transition:width .2s}
.bar.ind i{width:35%;animation:s 1.1s ease-in-out infinite}
@keyframes s{0%{left:-35%}100%{left:100%}}
button{margin-top:18px;font:inherit;font-size:14px;font-weight:500;color:#fff;background:var(--ac);border:0;border-radius:10px;padding:8px 18px;cursor:pointer;display:none}
</style></head><body><div class='b'><div class='logo'>" + LogoSvg + @"</div><h1 id='t'>Própons IA</h1><p id='s'></p><div class='bar ind' id='bar'><i id='i'></i></div><button id='r'>Tentar novamente</button></div>
<script>
document.getElementById('r').onclick=function(){window.chrome.webview.postMessage({t:'tentar'});p(-1,'Tentando de novo','');};
function p(v,t,s){document.getElementById('t').textContent=t||'Própons IA';document.getElementById('s').textContent=s||'';
var b=document.getElementById('bar'),i=document.getElementById('i'),r=document.getElementById('r');
r.style.display=v<=-2?'inline-block':'none';b.style.display=v<=-2?'none':'block';
if(v<0){b.className='bar ind';i.style.width='';}else{b.className='bar';i.style.width=(v*100).toFixed(1)+'%';}}
</script></body></html>";
    }

    // ---------- utilitários ----------
    static async Task<bool> Saudavel(int p)
    {
        try
        {
            HttpWebRequest r = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + p + "/health");
            r.Timeout = 1500; r.Proxy = null;
            using (HttpWebResponse resp = (HttpWebResponse)await r.GetResponseAsync()) return resp.StatusCode == HttpStatusCode.OK;
        }
        catch { return false; }
    }
    static int PortaLivre(int inicial)
    {
        for (int p = inicial; p < inicial + 30; p++)
            try { TcpListener t = new TcpListener(IPAddress.Loopback, p); t.Start(); t.Stop(); return p; } catch { }
        return inicial;
    }
    [StructLayout(LayoutKind.Sequential)]
    class MEMSTAT { public uint dwLength = 64; public uint load; public ulong total, avail, pf, pfa, vt, va, ext; }
    [DllImport("kernel32.dll")] static extern bool GlobalMemoryStatusEx([In, Out] MEMSTAT m);
    static double RamGB() { MEMSTAT m = new MEMSTAT(); return GlobalMemoryStatusEx(m) ? m.total / 1073741824.0 : 8; }
}

// Job object: o Windows encerra o motor quando o .exe fecha (mesmo se travar ou for morto)
static class Job
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr CreateJobObject(IntPtr a, string n);
    [DllImport("kernel32.dll")] static extern bool SetInformationJobObject(IntPtr j, int cls, IntPtr info, uint len);
    [DllImport("kernel32.dll")] static extern bool AssignProcessToJobObject(IntPtr j, IntPtr p);
    [StructLayout(LayoutKind.Sequential)] struct BASIC { public long a, b; public uint LimitFlags; public UIntPtr c, d; public uint e; public UIntPtr f; public uint g, h; }
    [StructLayout(LayoutKind.Sequential)] struct IOC { public ulong a, b, c, d, e, f; }
    [StructLayout(LayoutKind.Sequential)] struct EXT { public BASIC Basic; public IOC Io; public UIntPtr p, j, pp, jp; }
    static IntPtr job = IntPtr.Zero;
    public static void Prender(Process p)
    {
        try
        {
            if (job == IntPtr.Zero)
            {
                job = CreateJobObject(IntPtr.Zero, null);
                EXT info = new EXT(); info.Basic.LimitFlags = 0x2000; // KILL_ON_JOB_CLOSE
                int len = Marshal.SizeOf(typeof(EXT)); IntPtr ptr = Marshal.AllocHGlobal(len);
                Marshal.StructureToPtr(info, ptr, false);
                SetInformationJobObject(job, 9, ptr, (uint)len);
                Marshal.FreeHGlobal(ptr);
            }
            AssignProcessToJobObject(job, p.Handle);
        }
        catch { }
    }
}
