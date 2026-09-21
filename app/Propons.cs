// Própons IA — executável único e leve.
// Interface + motor vão anexados ao final do .exe e são extraídos para %LOCALAPPDATA%\Propons IA.
// O modelo é baixado da internet na primeira vez em cada PC (com retomada e verificação SHA-256).
// As conversas ficam salvas ao lado do .exe (no pendrive), numa pasta oculta "dados".
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

static class Program
{
    public const string Titulo = "Própons IA";
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
        bool leve = Array.Exists(args, delegate (string a) { return a.Equals("--leve", StringComparison.OrdinalIgnoreCase); });
        Iniciar(leve);
        GC.KeepAlive(unica);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    static void Iniciar(bool leve) { Application.Run(new Janela(leve)); }

    public static void Log(string m)
    {
        try { File.AppendAllText(Path.Combine(Path.GetTempPath(), "Propons-IA-log.txt"), DateTime.Now.ToString("dd/MM HH:mm:ss ") + m + Environment.NewLine); } catch { }
    }
}

// ---------- modelos disponíveis (baixados na 1ª vez) ----------
class Modelo
{
    public string Arquivo, Url, Sha256; public long Tamanho;
    public static readonly Modelo Normal = new Modelo { Arquivo = "Qwen3.5-2B-Q4_K_M.gguf", Tamanho = 1280835840,
        Url = "https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/main/Qwen3.5-2B-Q4_K_M.gguf",
        Sha256 = "aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223" };
    public static readonly Modelo Leve = new Modelo { Arquivo = "Qwen3.5-0.8B-Q4_K_M.gguf", Tamanho = 532517120,
        Url = "https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf",
        Sha256 = "bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517" };
}

// ---------- pacote anexado ao .exe ----------
// formato: [arquivos...][índice UTF-8][int64 tamanho do índice]["PROPONS1"]
static class Pacote
{
    public class Item { public string Caminho; public long Inicio, Tamanho; }
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
                    string[] p = linha.Split('|');
                    if (p.Length == 2 && p[0] == "build") Build = p[1].Trim();
                    if (p.Length != 3) continue;
                    Itens.Add(new Item { Caminho = p[0], Inicio = long.Parse(p[1]), Tamanho = long.Parse(p[2].Trim()) });
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

    public static void Extrair(string destino, Predicate<Item> quero)
    {
        byte[] buf = new byte[1 << 20];
        using (FileStream src = new FileStream(Origem, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 16, FileOptions.SequentialScan))
        {
            foreach (Item i in Itens)
            {
                if (!quero(i)) continue;
                string alvo = Path.Combine(destino, i.Caminho);
                FileInfo fi = new FileInfo(alvo);
                bool renovar = i.Caminho.StartsWith("interface\\", StringComparison.OrdinalIgnoreCase);
                if (!renovar && fi.Exists && fi.Length == i.Tamanho) continue;
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
            }
        }
    }
}

class Janela : Form
{
    readonly bool leve;
    WebView2 web;
    Process motor;
    int porta = 8765;
    string pasta;                  // interface + motor extraídos
    Modelo modelo;
    string arquivoModelo;
    TaskCompletionSource<bool> tentarDeNovo;
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };

    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string c, string t);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
    public static void TrazerParaFrente()
    {
        IntPtr h = FindWindow(null, Program.Titulo);
        if (h != IntPtr.Zero) { ShowWindow(h, 9); SetForegroundWindow(h); }
    }

    public Janela(bool leve)
    {
        this.leve = leve;
        Text = Program.Titulo;
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.Manual;
        BackColor = Escuro() ? Color.FromArgb(0x17, 0x17, 0x1b) : Color.White;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
    }

    // janela pequena ao abrir (tipo mini player), centralizada, em pixels reais conforme a escala da tela
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr h);
    protected override void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        uint dpi = 96; try { dpi = GetDpiForWindow(Handle); } catch { }
        if (dpi < 96) dpi = 96;
        float esc = dpi / 96f;
        Rectangle area = Screen.FromPoint(Cursor.Position).WorkingArea;
        int w = Math.Min((int)(460 * esc), area.Width - 40), h = Math.Min((int)(720 * esc), area.Height - 40);
        MinimumSize = new Size((int)(360 * esc), (int)(480 * esc));
        Bounds = new Rectangle(area.Left + (area.Width - w) / 2, area.Top + (area.Height - h) / 2, w, h);
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

    // ---------- início ----------
    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        if (!Pacote.Abrir()) { Erro("O arquivo do Própons IA está incompleto. Copie o Própons IA.exe de novo."); return; }
        modelo = (leve || RamGB() < 6) ? Modelo.Leve : Modelo.Normal;

        try { pasta = await Task.Run(delegate { return Preparar(); }); }
        catch (Exception ex) { Program.Log("preparar: " + ex); Erro("Não foi possível preparar o Própons IA neste PC.\n" + ex.Message); return; }

        try
        {
            web = new WebView2();
            web.Dock = DockStyle.Fill;
            web.DefaultBackgroundColor = BackColor;
            Controls.Add(web);
            CoreWebView2Environment.SetLoaderDllFolderPath(pasta);
            string args = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --renderer-process-limit=1";
            if (Environment.GetEnvironmentVariable("PROPONS_DEPURAR") == "1") args += " --remote-debugging-port=9333"; // só para testes
            CoreWebView2EnvironmentOptions op = new CoreWebView2EnvironmentOptions(args);
            CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Raiz(), "webview"), op);
            await web.EnsureCoreWebView2Async(env);
            CoreWebView2Settings s = web.CoreWebView2.Settings;
            s.AreDevToolsEnabled = false;
            s.IsStatusBarEnabled = false;
            s.AreBrowserAcceleratorKeysEnabled = false;
            s.IsPasswordAutosaveEnabled = false;
            s.IsGeneralAutofillEnabled = false;
            web.CoreWebView2.NewWindowRequested += delegate (object o, CoreWebView2NewWindowRequestedEventArgs a) { a.Handled = true; try { Process.Start(a.Uri); } catch { } };
            web.CoreWebView2.WebMessageReceived += Mensagem;
            await Navegar(Splash());
        }
        catch (Exception ex) { Program.Log("webview: " + ex); Erro("Este PC não tem o componente de janela do Windows (WebView2)."); return; }

        // modelo: já existe neste PC? senão baixa (só na 1ª vez)
        arquivoModelo = AcharModelo(modelo);
        while (arquivoModelo == null)
        {
            string falha = null;
            try { arquivoModelo = await Baixar(modelo); }
            catch (Exception ex) { falha = ex.Message; }
            if (falha == null) break;
            Program.Log("download: " + falha);
            bool semEspaco = falha == "sem espaço";
            Splash(-2, semEspaco ? "Pouco espaço neste PC" : "Sem conexão para baixar a IA",
                semEspaco ? "A IA precisa de cerca de 1,6 GB livres no disco deste PC." : "Na primeira vez em cada PC é preciso internet. Verifique a conexão e tente de novo.");
            tentarDeNovo = new TaskCompletionSource<bool>();
            await tentarDeNovo.Task;
        }
        Splash(-1, "Iniciando", "");
        await LigarMotor();
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

    static string Raiz()
    {
        string b = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (string.IsNullOrEmpty(b)) b = Path.GetTempPath();
        return Path.Combine(b, "Propons IA");
    }

    string Preparar()
    {
        if (Pacote.PastaSolta != null) return Pacote.PastaSolta;
        string destino = Path.Combine(Raiz(), Pacote.Build);
        Directory.CreateDirectory(destino);
        try
        {   // limpa versões antigas (mantém modelos e dados do navegador)
            foreach (string d in Directory.GetDirectories(Raiz()))
            {
                string n = Path.GetFileName(d);
                if (n != Pacote.Build && n != "webview" && n != "modelos") try { Directory.Delete(d, true); } catch { }
            }
        }
        catch { }
        Pacote.Extrair(destino, delegate (Pacote.Item i) { return true; });
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

    async Task<string> Baixar(Modelo m)
    {
        string dir = Path.Combine(Raiz(), "modelos");
        Directory.CreateDirectory(dir);
        string final = Path.Combine(dir, m.Arquivo), parcial = final + ".baixando";
        try
        {
            long livre = new DriveInfo(Path.GetPathRoot(dir)).AvailableFreeSpace;
            if (livre < m.Tamanho + (400L << 20)) throw new IOException("sem espaço");
        }
        catch (IOException) { throw; } catch { }

        const string titulo = "Baixando a IA";
        const string sub = "Só na primeira vez neste PC";
        Splash(0, titulo, sub);
        await Task.Run(delegate
        {
            for (int tentativa = 1; ; tentativa++)
            {
                long ja = File.Exists(parcial) ? new FileInfo(parcial).Length : 0;
                if (ja >= m.Tamanho) break;
                try
                {
                    HttpWebRequest r = (HttpWebRequest)WebRequest.Create(m.Url);
                    r.UserAgent = "ProponsIA/1.0";
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
                            f.Write(buf, 0, n); ja += n;
                            if ((DateTime.Now - ultimo).TotalMilliseconds > 200)
                            {
                                ultimo = DateTime.Now; long jaMB = ja >> 20, totMB = m.Tamanho >> 20; double v = (double)ja / m.Tamanho;
                                BeginInvoke((Action)delegate { Splash(v, titulo, sub + " · " + jaMB + " de " + totMB + " MB"); });
                            }
                        }
                    }
                }
                catch (Exception) { if (tentativa >= 4) throw; Thread.Sleep(2000 * tentativa); }
            }
        });

        Splash(-1, "Verificando o download", "");
        bool ok = await Task.Run(delegate
        {
            using (SHA256 sha = SHA256.Create()) using (FileStream f = new FileStream(parcial, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 20, FileOptions.SequentialScan))
                return BitConverter.ToString(sha.ComputeHash(f)).Replace("-", "").ToLowerInvariant() == m.Sha256;
        });
        if (!ok) { try { File.Delete(parcial); } catch { } throw new IOException("arquivo baixado corrompido"); }
        if (File.Exists(final)) File.Delete(final);
        File.Move(parcial, final);
        return final;
    }

    async Task LigarMotor()
    {
        string exe = Path.Combine(pasta, @"motor\llama-server.exe");
        porta = PortaLivre(8765);
        try
        {
            ProcessStartInfo psi = new ProcessStartInfo(exe,
                "-m \"" + arquivoModelo + "\" --host 127.0.0.1 --port " + porta +
                " --path \"" + Path.Combine(pasta, "interface") + "\"" +
                " -c 8192 -np 1 --cache-ram 0 -ctxcp 2 --reasoning off --reasoning-budget 0");
            psi.WorkingDirectory = pasta; psi.UseShellExecute = false; psi.CreateNoWindow = true; psi.WindowStyle = ProcessWindowStyle.Hidden;
            motor = Process.Start(psi);
            Job.Prender(motor);
        }
        catch (Exception ex) { Program.Log("motor: " + ex); Erro("O motor da IA foi bloqueado neste PC (antivírus)."); return; }

        DateTime ini = DateTime.Now;
        while ((DateTime.Now - ini).TotalSeconds < 180)
        {
            if (motor.HasExited) { Erro("O motor da IA fechou sozinho neste PC (provavelmente bloqueado pelo antivírus)."); return; }
            if (await Saudavel(porta)) { web.CoreWebView2.Navigate("http://127.0.0.1:" + porta + "/"); return; }
            await Task.Delay(250);
        }
        Erro("A IA demorou demais para iniciar neste PC.");
    }

    // ---------- mensagens da página ----------
    void Mensagem(object o, CoreWebView2WebMessageReceivedEventArgs a)
    {
        Dictionary<string, object> m;
        try { m = json.Deserialize<Dictionary<string, object>>(a.WebMessageAsJson); } catch { return; }
        object t; if (m == null || !m.TryGetValue("t", out t)) return;
        switch (t as string)
        {
            case "tema": Tema((m["v"] as string) == "escuro"); break;
            case "tentar": if (tentarDeNovo != null) tentarDeNovo.TrySetResult(true); break;
            case "carregar":
                string dados = "[]"; try { string p = ArquivoConversas(false); if (File.Exists(p)) dados = File.ReadAllText(p, Encoding.UTF8); } catch { }
                web.CoreWebView2.PostWebMessageAsJson(json.Serialize(new Dictionary<string, object> { { "t", "historico" }, { "dados", dados } }));
                break;
            case "salvar":
                object d; if (!m.TryGetValue("dados", out d)) return;
                try
                {
                    string p = ArquivoConversas(true), tmp = p + ".tmp";
                    File.WriteAllText(tmp, (string)d, Encoding.UTF8);
                    if (File.Exists(p)) File.Delete(p);
                    File.Move(tmp, p);
                }
                catch (Exception ex) { Program.Log("salvar: " + ex.Message); }
                break;
        }
    }

    // conversas ao lado do .exe (pasta oculta "dados"); se não der para gravar lá, no PC
    static string ArquivoConversas(bool criar)
    {
        string perto = Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "dados");
        try
        {
            if (criar && !Directory.Exists(perto)) { DirectoryInfo di = Directory.CreateDirectory(perto); di.Attributes |= FileAttributes.Hidden; }
            if (Directory.Exists(perto))
            {
                string teste = Path.Combine(perto, ".w"); File.WriteAllText(teste, ""); File.Delete(teste);
                return Path.Combine(perto, "conversas.json");
            }
        }
        catch { }
        string local = Path.Combine(Raiz(), "dados"); Directory.CreateDirectory(local);
        return Path.Combine(local, "conversas.json");
    }

    void Erro(string m)
    {
        Matar();
        if (web != null && web.CoreWebView2 != null) Splash(-2, "Não foi possível abrir", m);
        else { MessageBox.Show(this, m, Program.Titulo, MessageBoxButtons.OK, MessageBoxIcon.Warning); Close(); }
    }

    protected override void OnFormClosing(FormClosingEventArgs e) { Matar(); base.OnFormClosing(e); }
    void Matar() { try { if (motor != null && !motor.HasExited) motor.Kill(); } catch { } }

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
.b{text-align:center;width:260px}
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
document.getElementById('r').onclick=function(){window.chrome.webview.postMessage({t:'tentar'});};
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
