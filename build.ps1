# Monta a interface, gera o icone, compila e empacota:  dist\Propons IA.exe (com acento)
# Uso (Windows 10/11, PowerShell):  powershell -ExecutionPolicy Bypass -File build.ps1
# Requer: Node.js (para montar a interface) e Microsoft Edge (para gerar o icone).
$ErrorActionPreference = 'Stop'
$R = $PSScriptRoot
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'

# 0) dependencias que nao ficam no Git (baixadas so se faltarem)
$ProgressPreference = 'SilentlyContinue'
$llama = 'b11070'; $wv2 = '1.0.4191.47'
if (-not (Test-Path "$R\payload\motor\llama-server.exe")) {
  Write-Host 'baixando o motor llama.cpp para Windows...'
  $z = "$env:TEMP\llama-win.zip"; $x = "$env:TEMP\llama-win"
  Invoke-WebRequest "https://github.com/ggml-org/llama.cpp/releases/download/$llama/llama-$llama-bin-win-cpu-x64.zip" -OutFile $z
  Expand-Archive $z $x -Force
  New-Item -ItemType Directory -Force "$R\payload\motor" | Out-Null
  Get-ChildItem $x | Where-Object { $_.Name -eq 'llama-server.exe' -or ($_.Extension -eq '.dll' -and ($_.Name -notmatch '-impl\.dll$' -or $_.Name -eq 'llama-server-impl.dll')) } | Copy-Item -Destination "$R\payload\motor\"
}
if (-not (Test-Path "$R\app\Microsoft.Web.WebView2.Core.dll") -or -not (Test-Path "$R\payload\WebView2Loader.dll")) {
  Write-Host 'baixando o WebView2 SDK...'
  $z = "$env:TEMP\wv2.zip"; $x = "$env:TEMP\wv2"
  Invoke-WebRequest "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$wv2/microsoft.web.webview2.$wv2.nupkg" -OutFile $z
  Expand-Archive $z $x -Force
  Copy-Item "$x\lib\net462\Microsoft.Web.WebView2.Core.dll","$x\lib\net462\Microsoft.Web.WebView2.WinForms.dll" "$R\app\"
  Copy-Item "$x\runtimes\win-x64\native\WebView2Loader.dll" "$R\payload\"
}

# 1) interface (modelo + blocos testados)
node "$R\src\montar.js"
if ($LASTEXITCODE -ne 0) { throw 'falha ao montar a interface' }

# 2) icone a partir da logo (renderizada nitida pelo Edge)
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
"<html><body style='margin:0;background:transparent'><img src='logo.svg' style='width:256px;height:256px;display:block'></body></html>" | Set-Content "$R\logo\r256.html" -Encoding UTF8
Start-Process $edge -ArgumentList '--headless=new','--disable-gpu','--hide-scrollbars','--default-background-color=00000000','--window-size=256,256',"--screenshot=$R\logo\logo256.png","--user-data-dir=$env:TEMP\edge-icone","file:///$($R.Replace('\','/'))/logo/r256.html" -Wait
& "$R\logo\icone.ps1" | Out-Null

Push-Location "$R\app"
try {
  # 3) programa (DLLs do WebView2 embutidas como recurso)
  & $csc /nologo /target:winexe /platform:x64 /optimize+ /out:nucleo.exe "/win32icon:$R\logo\Propons.ico" `
    /r:Microsoft.Web.WebView2.Core.dll /r:Microsoft.Web.WebView2.WinForms.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Web.Extensions.dll `
    /resource:Microsoft.Web.WebView2.Core.dll,Microsoft.Web.WebView2.Core.dll `
    /resource:Microsoft.Web.WebView2.WinForms.dll,Microsoft.Web.WebView2.WinForms.dll Propons.cs
  if ($LASTEXITCODE -ne 0) { throw 'falha ao compilar o programa' }
  & $csc /nologo /optimize+ /out:Empacotar.exe Empacotar.cs
  if ($LASTEXITCODE -ne 0) { throw 'falha ao compilar o empacotador' }

  # 4) empacota tudo num .exe so (nome ASCII na passagem; acento aplicado aqui)
  New-Item -ItemType Directory -Force "$R\dist" | Out-Null
  & "$R\app\Empacotar.exe" "$R\app\nucleo.exe" "$R\payload" "$R\dist\saida.tmp" | Select-Object -Last 1
  if ($LASTEXITCODE -ne 0) { throw 'falha ao empacotar' }
  Move-Item -LiteralPath "$R\dist\saida.tmp" -Destination "$R\dist\Pr$([char]0xF3)pons IA.exe" -Force
} finally { Pop-Location }
