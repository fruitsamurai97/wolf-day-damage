$ppt = New-Object -ComObject PowerPoint.Application
$deck = $ppt.Presentations.Open("C:\Users\benda\Desktop\Hackathon\Data\Damage_Intelligence_EN.pptx", $true, $false, $false)
$out = "C:\Users\benda\Desktop\Hackathon\Data\deck_png"
if (!(Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$deck.SaveAs($out, 18)  # 18 = ppSaveAsPNG
$deck.Close()
$ppt.Quit()
Write-Output "exported"
