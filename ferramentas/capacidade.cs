// Mapa de capacidade real do pendrive (estilo H2testw/f3probe), direto no disco físico.
// Grava 1 MB com assinatura única em vários pontos e lê tudo de volta sem cache.
// Uso: capacidade.exe <nº do disco> <tamanho em bytes>
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

class Cap
{
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern SafeFileHandle CreateFile(string n, uint acc, uint share, IntPtr sec, uint disp, uint flags, IntPtr t);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetFilePointerEx(SafeFileHandle h, long d, out long n, uint m);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool WriteFile(SafeFileHandle h, IntPtr b, uint n, out uint w, IntPtr o);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool ReadFile(SafeFileHandle h, IntPtr b, uint n, out uint r, IntPtr o);
    [DllImport("kernel32.dll")] static extern IntPtr VirtualAlloc(IntPtr a, UIntPtr s, uint t, uint p);
    const long MB = 1 << 20;

    static int Main(string[] a)
    {
        string disco = @"\\.\PhysicalDrive" + a[0];
        long tamanho = long.Parse(a[1]);
        var pontos = new List<long>();
        for (long o = 0; o < 4096 * MB && o + MB <= tamanho; o += 16 * MB) pontos.Add(o);
        for (long o = 4096 * MB; o + MB <= tamanho; o += 256 * MB) pontos.Add(o);
        pontos.Add((tamanho / MB - 1) * MB);

        SafeFileHandle h = CreateFile(disco, 0xC0000000, 3, IntPtr.Zero, 3, 0x20000000 | 0x80000000, IntPtr.Zero);
        if (h.IsInvalid) { Console.WriteLine("ERRO abrindo disco: " + Marshal.GetLastWin32Error()); return 2; }
        IntPtr buf = VirtualAlloc(IntPtr.Zero, (UIntPtr)MB, 0x3000, 4);
        DateTime t = DateTime.Now;
        int falhaEscrita = 0;
        foreach (long off in pontos)
        {
            Preencher(buf, off); long x; uint w;
            if (!SetFilePointerEx(h, off, out x, 0) || !WriteFile(h, buf, (uint)MB, out w, IntPtr.Zero) || w != MB) falhaEscrita++;
        }
        double seg = (DateTime.Now - t).TotalSeconds;
        Console.WriteLine("gravadas {0} marcas em {1:N0}s ({2:N1} MB/s), falhas de escrita: {3}", pontos.Count, seg, pontos.Count / Math.Max(seg, 0.001), falhaEscrita);

        var ok = new bool[pontos.Count]; int bons = 0; int zeros = 0, trocadas = 0;
        for (int k = 0; k < pontos.Count; k++)
        {
            long x; uint r; SetFilePointerEx(h, pontos[k], out x, 0);
            bool lido = ReadFile(h, buf, (uint)MB, out r, IntPtr.Zero) && r == MB;
            ok[k] = lido && Confere(buf, pontos[k]);
            if (ok[k]) bons++;
            else if (lido) { if (Marshal.ReadInt64(buf, 0) == 0 && Marshal.ReadInt64(buf, 4096) == 0) zeros++; else trocadas++; }
        }
        h.Close();
        Console.WriteLine("marcas boas: {0}/{1} | voltaram zeradas: {2} | voltaram com dados de outro lugar: {3}", bons, pontos.Count, zeros, trocadas);
        // regiões contínuas
        Console.WriteLine("mapa (cada linha = trecho contínuo):");
        int ini = 0;
        for (int k = 1; k <= pontos.Count; k++)
            if (k == pontos.Count || ok[k] != ok[ini])
            {
                Console.WriteLine("  {0,9:N0} MB a {1,9:N0} MB : {2}", pontos[ini] / MB, (pontos[k - 1] / MB) + 1, ok[ini] ? "OK" : "RUIM");
                ini = k;
            }
        int primeiroRuim = Array.IndexOf(ok, false);
        if (primeiroRuim < 0) Console.WriteLine("RESULTADO: todas as marcas OK");
        else Console.WriteLine("RESULTADO: primeiro ponto ruim em {0:N0} MB ({1:N2} GB)", pontos[primeiroRuim] / MB, pontos[primeiroRuim] / (double)(1L << 30));
        return 0;
    }
    static void Preencher(IntPtr b, long off) { for (int i = 0; i < MB / 8; i++) Marshal.WriteInt64(b, i * 8, off ^ ((long)i * unchecked((long)0x9E3779B97F4A7C15UL)) ^ 0x5A5A1234); }
    static bool Confere(IntPtr b, long off)
    {
        for (int i = 0; i < MB / 8; i += 61) if (Marshal.ReadInt64(b, i * 8) != (off ^ ((long)i * unchecked((long)0x9E3779B97F4A7C15UL)) ^ 0x5A5A1234)) return false;
        return true;
    }
}
