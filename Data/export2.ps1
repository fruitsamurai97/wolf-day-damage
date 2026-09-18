$ErrorActionPreference = "Stop"
$out = "C:\Users\benda\Desktop\Hackathon\Data\deck_png"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$ppt = New-Object -ComObject PowerPoint.Application
$deck = $ppt.Presentations.Open("C:\Users\benda\Desktop\Hackathon\Data\Damage_Intelligence_EN.pptx", $true, $false, $false)
$n = 0
foreach ($slide in $deck.Slides) {
  $n++
  $path = Join-Path $out ("slide-{0:D2}.png" -f $n)
  $slide.Export($path, "PNG", 1600, 900)
}
$deck.Close()
$ppt.Quit()
Write-Output "exported $n slides"
