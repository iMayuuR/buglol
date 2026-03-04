' BugLOL Audio Player — Windows VBScript
' Usage: wscript.exe //B playAudio.vbs "C:\path\to\sound.mp3"
' Works on ALL Windows versions (XP/7/10/11) — no PowerShell needed!

If WScript.Arguments.Count = 0 Then WScript.Quit(1)

Dim soundPath : soundPath = WScript.Arguments(0)

On Error Resume Next

Dim wmp
Set wmp = CreateObject("WMPlayer.OCX.7")

If Err.Number <> 0 Then
    ' Fallback: try older WMPlayer progID
    Err.Clear
    Set wmp = CreateObject("WMPlayer.OCX")
End If

If Err.Number <> 0 Then
    WScript.Quit(2)
End If

wmp.URL = soundPath
wmp.controls.play

' Wait for playback to finish (max 30 seconds)
Dim timeout : timeout = 0
Do While wmp.playState <> 1 And timeout < 300
    WScript.Sleep 100
    timeout = timeout + 1
Loop

wmp.controls.stop
Set wmp = Nothing
WScript.Quit(0)
