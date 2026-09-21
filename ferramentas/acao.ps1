# Automação simples da janela do Própons IA para testes:
#   acao.ps1 -clique x,y   (coordenadas relativas à janela)
#   acao.ps1 -teclas '^b'  (formato SendKeys)
param([int[]]$clique, [string]$teclas, [int]$espera = 300)
Add-Type -AssemblyName System.Windows.Forms
if (-not ('Mouse' -as [type])) { Add-Type @"
using System; using System.Runtime.InteropServices;
public class Mouse { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint f,uint x,uint y,uint d,UIntPtr e);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out R r); public struct R{public int L,T,R2,B;}
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); }
"@ }
[Mouse]::SetProcessDPIAware() | Out-Null
$p = Get-Process | Where-Object { $_.Name -like 'Pr*pons IA' -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
[Mouse]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; Start-Sleep -Milliseconds 200
$r = New-Object Mouse+R; [Mouse]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
if ($clique) {
  [Mouse]::SetCursorPos($r.L + $clique[0], $r.T + $clique[1]) | Out-Null
  [Mouse]::mouse_event(2,0,0,0,[UIntPtr]::Zero); [Mouse]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds $espera
}
if ($teclas) { [System.Windows.Forms.SendKeys]::SendWait($teclas); Start-Sleep -Milliseconds $espera }
