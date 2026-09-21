// Junta o programa + todos os arquivos da pasta payload em um único .exe.
// Uso: Empacotar.exe <nucleo.exe> <pasta payload> <saida.exe>
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
        {
            byte[] n = File.ReadAllBytes(nucleo);
            o.Write(n, 0, n.Length);
            foreach (string f in arquivos)
            {
                string rel = f.Substring(raiz.Length);
                long inicio = o.Position;
                using (FileStream i = File.OpenRead(f)) { int k; while ((k = i.Read(buf, 0, buf.Length)) > 0) o.Write(buf, 0, k); }
                idx.Append(rel).Append('|').Append(inicio).Append('|').Append(o.Position - inicio).Append('\n');
                Console.WriteLine("  + {0,-45} {1,10:N0} KB", rel, (o.Position - inicio) / 1024);
            }
            string corpo = idx.ToString();
            string build;
            using (SHA1 sha = SHA1.Create())
                build = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(corpo + Convert.ToBase64String(sha.ComputeHash(n))))).Replace("-", "").Substring(0, 12).ToLower();
            byte[] ib = Encoding.UTF8.GetBytes("build|" + build + "\n" + corpo);
            o.Write(ib, 0, ib.Length);
            o.Write(BitConverter.GetBytes((long)ib.Length), 0, 8);
            byte[] magic = Encoding.ASCII.GetBytes("PROPONS1");
            o.Write(magic, 0, 8);
            Console.WriteLine("build {0} | {1} arquivos | {2:N0} MB", build, arquivos.Count, o.Length >> 20);
        }
        return 0;
    }
}
