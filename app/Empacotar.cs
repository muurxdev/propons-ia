// Junta o programa + todos os arquivos da pasta payload em um único .exe.
// Uso: Empacotar.exe <nucleo.exe> <pasta payload> <saida.exe>
// Formato: [nucleo][arquivos...][índice UTF-8][int64 tamanho do índice]["PROPONS1"]
// Índice: "build|<id>" e uma linha por arquivo "caminho|início|tamanho|sha256".
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;

class Empacotar
{
    static int Main(string[] a)
    {
        string nucleo = a[0], raiz = Path.GetFullPath(a[1]).TrimEnd('\\') + "\\", saida = a[2];
        List<string> arquivos = new List<string>(Directory.GetFiles(raiz, "*", SearchOption.AllDirectories));
        arquivos.Sort(StringComparer.OrdinalIgnoreCase);
        StringBuilder idx = new StringBuilder();
        byte[] buf = new byte[4 << 20];
        using (FileStream o = new FileStream(saida, FileMode.Create, FileAccess.Write))
        using (SHA256 geral = SHA256.Create())
        {
            byte[] n = File.ReadAllBytes(nucleo);
            o.Write(n, 0, n.Length);
            geral.TransformBlock(n, 0, n.Length, null, 0);
            foreach (string f in arquivos)
            {
                string rel = f.Substring(raiz.Length);
                long inicio = o.Position;
                string sha;
                using (SHA256 h = SHA256.Create())
                using (FileStream i = File.OpenRead(f))
                {
                    int k;
                    while ((k = i.Read(buf, 0, buf.Length)) > 0) { o.Write(buf, 0, k); h.TransformBlock(buf, 0, k, null, 0); }
                    h.TransformFinalBlock(new byte[0], 0, 0);
                    sha = BitConverter.ToString(h.Hash).Replace("-", "").ToLowerInvariant();
                }
                byte[] linha = Encoding.UTF8.GetBytes(rel + "|" + sha);
                geral.TransformBlock(linha, 0, linha.Length, null, 0);
                idx.Append(rel).Append('|').Append(inicio).Append('|').Append(o.Position - inicio).Append('|').Append(sha).Append('\n');
            }
            geral.TransformFinalBlock(new byte[0], 0, 0);
            string build = BitConverter.ToString(geral.Hash).Replace("-", "").Substring(0, 12).ToLowerInvariant();
            byte[] ib = Encoding.UTF8.GetBytes("build|" + build + "\n" + idx);
            o.Write(ib, 0, ib.Length);
            o.Write(BitConverter.GetBytes((long)ib.Length), 0, 8);
            o.Write(Encoding.ASCII.GetBytes("PROPONS1"), 0, 8);
            Console.WriteLine("build {0} | {1} arquivos | {2:N1} MB", build, arquivos.Count, o.Length / 1048576.0);
        }
        return 0;
    }
}
