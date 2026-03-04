# BugLOL Audio Player — Persistent Background Process
# Uses Win32 mciSendString API for reliable MP3 playback.
# No STA/MTA/WPF dispatcher required — works in any headless process.

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class BugLOLMCI {
    [DllImport("winmm.dll", CharSet = CharSet.Auto)]
    public static extern int mciSendString(string lpstrCommand, StringBuilder lpstrReturnString, int uReturnLength, IntPtr hwndCallback);
}
"@

# Signal that we are ready
Write-Output "READY"

$alias = "buglolAudio"

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }

    $audioPath = $line.Trim()
    if ($audioPath -eq "" -or $audioPath -eq "EXIT") { break }

    try {
        # Close any previous instance first
        [BugLOLMCI]::mciSendString("close $alias", $null, 0, [IntPtr]::Zero) | Out-Null

        # Open the MP3 file
        $ret = [BugLOLMCI]::mciSendString("open `"$audioPath`" type mpegvideo alias $alias", $null, 0, [IntPtr]::Zero)

        if ($ret -eq 0) {
            # Play and wait for completion
            [BugLOLMCI]::mciSendString("play $alias wait", $null, 0, [IntPtr]::Zero) | Out-Null
            [BugLOLMCI]::mciSendString("close $alias", $null, 0, [IntPtr]::Zero) | Out-Null
        }
        else {
            [Console]::Error.WriteLine("BugLOL: mciSendString open failed with code $ret for: $audioPath")
        }
    }
    catch {
        [Console]::Error.WriteLine("BugLOL ERROR: $_")
    }

    Write-Output "DONE"
}
