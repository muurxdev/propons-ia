# Tira foto da janela do Própons IA:  foto.ps1 <arquivo.png>
param([string]$saida)
Add-Type -AssemblyName System.Drawing
if (-not ([System.Management.Automation.PSTypeName]"Win").Type) {
Add-Type @"
using System; using System.Runtime.InteropServices;
public class Win { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 public struct RECT { public int L,T,R,B; } }
"@
}
[Win]::SetProcessDPIAware() | Out-Null
$p = Get-Process | Where-Object { $_.Name -like 'Pr*pons IA' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
$h = $p.MainWindowHandle; [Win]::SetForegroundWindow($h) | Out-Null; Start-Sleep -Milliseconds 400
$r = New-Object Win+RECT; [Win]::GetWindowRect($h, [ref]$r) | Out-Null
$bmp = New-Object Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T); $g = [Drawing.Graphics]::FromImage($bmp); $dc = $g.GetHdc()
[Win]::PrintWindow($h, $dc, 2) | Out-Null; $g.ReleaseHdc($dc); $bmp.Save($saida); "ok $($bmp.Width)x$($bmp.Height)"
