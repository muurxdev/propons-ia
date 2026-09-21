// Grava um arquivo no pendrive sem cache (write-through) e lê de volta direto do dispositivo (no-buffering).
using System;
using System.IO;
using System.Security.Cryptography;

class V
{
    const FileOptions NoBuffering = (FileOptions)0x20000000;
    static int Main(string[] a)
    {
        string src = a[0], dst = a[1];
        byte[] buf = new byte[4 << 20];
        DateTime t = DateTime.Now;
        using (FileStream i = File.OpenRead(src))
        using (FileStream o = new FileStream(dst, FileMode.Create, FileAccess.Write, FileShare.None, 4096, FileOptions.WriteThrough))
        {
            int n; while ((n = i.Read(buf, 0, buf.Length)) > 0) o.Write(buf, 0, n);
            o.Flush(true);
        }
        long tam = new FileInfo(src).Length;
        Console.WriteLine("gravou {0:N0} MB em {1:N0}s", tam >> 20, (DateTime.Now - t).TotalSeconds);

        string h1 = Hash(File.OpenRead(src));
        string h2;
        using (FileStream r = new FileStream(dst, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, NoBuffering))
        using (SHA256 sha = SHA256.Create())
        {
            byte[] b = new byte[4 << 20]; long lido = 0; int n;
            while ((n = r.Read(b, 0, b.Length)) > 0)
            {
                int usar = (int)Math.Min(n, tam - lido); // a última leitura pode vir alinhada ao setor
                sha.TransformBlock(b, 0, usar, null, 0); lido += usar;
                if (lido >= tam) break;
            }
            sha.TransformFinalBlock(new byte[0], 0, 0);
            h2 = BitConverter.ToString(sha.Hash).Replace("-", "").ToLower();
        }
        Console.WriteLine("original : " + h1);
        Console.WriteLine("pendrive : " + h2);
        Console.WriteLine(h1 == h2 ? "RESULTADO: OK, o pendrive guardou certo" : "RESULTADO: CORROMPIDO");
        return h1 == h2 ? 0 : 1;
    }
    static string Hash(Stream s)
    {
        using (s) using (SHA256 sha = SHA256.Create())
            return BitConverter.ToString(sha.ComputeHash(s)).Replace("-", "").ToLower();
    }
}
