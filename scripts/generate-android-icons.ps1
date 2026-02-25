# Android Icon Generator Script
# Resizes a source icon image to all required Android mipmap sizes
# Usage: .\generate-android-icons.ps1 -SourceImage "path\to\icon.png"

param(
    [Parameter(Mandatory=$true)]
    [string]$SourceImage
)

Add-Type -AssemblyName System.Drawing

$resDir = Join-Path $PSScriptRoot "..\android\app\src\main\res"

# Android mipmap sizes
# ic_launcher: standard icon
# ic_launcher_round: round icon (same image, Android masks it)
# ic_launcher_foreground: adaptive icon foreground (108dp, image centered in 72dp safe zone)
$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$foregroundSizes = @{
    "mipmap-mdpi"    = 108
    "mipmap-hdpi"    = 162
    "mipmap-xhdpi"   = 216
    "mipmap-xxhdpi"  = 324
    "mipmap-xxxhdpi" = 432
}

$source = [System.Drawing.Image]::FromFile((Resolve-Path $SourceImage).Path)

function Resize-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [string]$OutputPath
    )
    
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($Image, 0, 0, $Width, $Height)
    $graphics.Dispose()
    
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Resize-Foreground {
    param(
        [System.Drawing.Image]$Image,
        [int]$CanvasSize,
        [string]$OutputPath
    )
    
    # Adaptive icon foreground: 108dp canvas, icon is in the center 72dp (66.67%)
    $iconSize = [int]($CanvasSize * 72 / 108)
    $padding = [int](($CanvasSize - $iconSize) / 2)
    
    $bmp = New-Object System.Drawing.Bitmap($CanvasSize, $CanvasSize)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    # Transparent background
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($Image, $padding, $padding, $iconSize, $iconSize)
    $graphics.Dispose()
    
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# Generate standard and round launcher icons
foreach ($entry in $sizes.GetEnumerator()) {
    $dir = Join-Path $resDir $entry.Key
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    
    $launcherPath = Join-Path $dir "ic_launcher.png"
    $roundPath = Join-Path $dir "ic_launcher_round.png"
    
    Write-Host "Generating $($entry.Key) ($($entry.Value)x$($entry.Value))..."
    Resize-Image -Image $source -Width $entry.Value -Height $entry.Value -OutputPath $launcherPath
    Resize-Image -Image $source -Width $entry.Value -Height $entry.Value -OutputPath $roundPath
}

# Generate adaptive icon foregrounds
foreach ($entry in $foregroundSizes.GetEnumerator()) {
    $dir = Join-Path $resDir $entry.Key
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    
    $fgPath = Join-Path $dir "ic_launcher_foreground.png"
    
    Write-Host "Generating foreground $($entry.Key) ($($entry.Value)x$($entry.Value))..."
    Resize-Foreground -Image $source -CanvasSize $entry.Value -OutputPath $fgPath
}

$source.Dispose()

Write-Host "`nDone! All icons generated."
