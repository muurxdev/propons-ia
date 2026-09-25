# Pacote da Microsoft Store (MSIX): o app roda direto de dentro do pacote (pasta "IA" ao lado do .exe, sem extrair
# nada em %LOCALAPPDATA%), então tudo o que executa — o programa, o motor da IA e a transcrição — é assinado pela Store
# e passa pelo Controle Inteligente de Aplicativos do Windows 11.
# Uso (depois do build.ps1):  powershell -ExecutionPolicy Bypass -File ferramentas\loja\pacote.ps1
# Resultado: dist\loja\layout (a pasta do pacote) e dist\Propons-IA-Windows.msix (se o Windows SDK estiver instalado).
$ErrorActionPreference = 'Stop'
$R = (Resolve-Path "$PSScriptRoot\..\..").Path
$id = Get-Content "$PSScriptRoot\identidade.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$versao = (Get-Content "$R\VERSAO" -Raw).Trim() + '.0'   # a Store exige o 4º número = 0
if (-not (Test-Path "$R\app\nucleo.exe")) { throw 'rode o build.ps1 antes (falta app\nucleo.exe)' }

$L = "$R\dist\loja\layout"
if (Test-Path $L) { Remove-Item $L -Recurse -Force }
New-Item -ItemType Directory -Force "$L\Assets" | Out-Null
Copy-Item "$R\app\nucleo.exe" "$L\Propons IA.exe"
Copy-Item "$R\payload" "$L\IA" -Recurse

# ícones do pacote a partir da logo (a mesma do .exe)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile("$R\logo\logo256.png")
function Png($w, $h, $lado, $nome) {
  $b = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($src, [int](($w - $lado) / 2), [int](($h - $lado) / 2), $lado, $lado)
  $b.Save("$L\Assets\$nome", [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $b.Dispose()
}
Png 44 44 44 'Square44x44Logo.png'
Png 150 150 120 'Square150x150Logo.png'
Png 310 150 120 'Wide310x150Logo.png'
Png 50 50 50 'StoreLogo.png'
$src.Dispose()

$m = Get-Content "$PSScriptRoot\AppxManifest.xml" -Raw -Encoding UTF8
$m = $m.Replace('{NOME}', $id.nome).Replace('{PUBLISHER}', $id.publisher).Replace('{PUBLISHERNOME}', $id.publisherNome).Replace('{VERSAO}', $versao)
[IO.File]::WriteAllText("$L\AppxManifest.xml", $m, (New-Object Text.UTF8Encoding $false))
Write-Host "pasta do pacote: $L (versão $versao, identidade $($id.nome))"

$mk = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin\*\x64\makeappx.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $mk) { Write-Host 'makeappx não encontrado (Windows SDK): ficou só a pasta do pacote'; return }
& $mk.FullName pack /o /d $L /p "$R\dist\Propons-IA-Windows.msix" | Select-Object -Last 3
if ($LASTEXITCODE -ne 0) { throw 'falha no makeappx' }
Write-Host "pacote: $R\dist\Propons-IA-Windows.msix"
