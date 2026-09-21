# Tira foto de uma janela pelo título (ex.: janelas do Linux via WSLg):  foto-titulo.ps1 "Própons" saida.png
param([string]$titulo, [string]$saida)
Add-Type -AssemblyName System.Drawing
if (-not ([System.Management.Automation.PSTypeName]'Jan').Type) {
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices; using System.Collections.Generic;
public class Jan {
  public delegate bool Cb(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Cb f, IntPtr p);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  public struct RECT { public int L,T,R,B; }
  public static List<KeyValuePair<IntPtr,string>> Todas() {
    var l = new List<KeyValuePair<IntPtr,string>>();
    EnumWindows((h,p) => { if (IsWindowVisible(h)) { var s = new StringBuilder(256); GetWindowText(h, s, 256); if (s.Length>0) l.Add(new KeyValuePair<IntPtr,string>(h, s.ToString())); } return true; }, IntPtr.Zero);
    return l; } }
"@ }
[Jan]::SetProcessDPIAware() | Out-Null
$j = [Jan]::Todas() | Where-Object { $_.Value -like "*$titulo*" } | Select-Object -First 1
if (-not $j) { "janela não encontrada"; [Jan]::Todas() | Select-Object -ExpandProperty Value | Select-Object -First 25; exit 1 }
$h = $j.Key; [Jan]::SetForegroundWindow($h) | Out-Null; Start-Sleep -Milliseconds 500
$r = New-Object Jan+RECT; [Jan]::GetWindowRect($h, [ref]$r) | Out-Null
$b = New-Object Drawing.Bitmap ($r.R-$r.L), ($r.B-$r.T); $g = [Drawing.Graphics]::FromImage($b); $dc = $g.GetHdc()
$g.ReleaseHdc($dc); $g.CopyFromScreen($r.L, $r.T, 0, 0, $b.Size); $b.Save($saida); "ok '$($j.Value)' $($b.Width)x$($b.Height)"
