const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PLATFORM = process.platform; // 'win32' | 'darwin' | 'linux'

/** @type {import('child_process').ChildProcess | null} */
let currentSoundProcess = null;

// ─── Windows: wscript.exe + VBScript (works on ALL Windows, no PS needed) ───
function playSoundWindows(context, soundPath) {
    // Kill previous sound if still playing
    if (currentSoundProcess && !currentSoundProcess.killed) {
        try { currentSoundProcess.kill(); } catch (_) { }
    }

    const vbsScript = path.join(context.extensionPath, 'playAudio.vbs');

    const proc = spawn('wscript.exe', ['//B', vbsScript, soundPath], {
        stdio: 'ignore',
        windowsHide: true
    });

    currentSoundProcess = proc;

    proc.on('error', (err) => {
        console.error(`[BugLOL] wscript.exe error: ${err.message}`);
    });

    proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.warn(`[BugLOL] wscript.exe exited with code ${code}`);
        }
        if (currentSoundProcess === proc) currentSoundProcess = null;
    });
}

// ─── macOS: afplay (built-in, supports MP3 natively) ────────────────────────
function playSoundMac(soundPath) {
    if (currentSoundProcess && !currentSoundProcess.killed) {
        try { currentSoundProcess.kill(); } catch (_) { }
    }
    const proc = spawn('afplay', [soundPath], { stdio: 'ignore' });
    currentSoundProcess = proc;
    proc.on('error', (err) => console.error(`[BugLOL] afplay error: ${err.message}`));
    proc.on('exit', () => { if (currentSoundProcess === proc) currentSoundProcess = null; });
}

// ─── Linux: mpg123 → ffplay → paplay fallback chain ─────────────────────────
const LINUX_PLAYERS = [
    { cmd: 'mpg123', args: (f) => ['-q', f] },
    { cmd: 'ffplay', args: (f) => ['-nodisp', '-autoexit', '-loglevel', 'quiet', f] },
    { cmd: 'paplay', args: (f) => [f] },
];

function playSoundLinux(soundPath, playerIndex = 0) {
    if (playerIndex >= LINUX_PLAYERS.length) {
        console.error('[BugLOL] No audio player found on Linux. Install mpg123 or ffplay.');
        return;
    }
    if (currentSoundProcess && !currentSoundProcess.killed) {
        try { currentSoundProcess.kill(); } catch (_) { }
    }
    const { cmd, args } = LINUX_PLAYERS[playerIndex];
    const proc = spawn(cmd, args(soundPath), { stdio: 'ignore' });
    currentSoundProcess = proc;
    proc.on('error', () => {
        console.warn(`[BugLOL] ${cmd} not found, trying next...`);
        playSoundLinux(soundPath, playerIndex + 1);
    });
    proc.on('exit', () => { if (currentSoundProcess === proc) currentSoundProcess = null; });
}

// ─── Play any sound file (used for preview + error sounds) ──────────────────
/**
 * Plays an arbitrary MP3 file. Cross-platform.
 * @param {vscode.ExtensionContext} context
 * @param {string} filePath
 */
function playSoundFile(context, filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[BugLOL] Sound file not found: ${filePath}`);
        return;
    }
    if (PLATFORM === 'win32') {
        playSoundWindows(context, filePath);
    } else if (PLATFORM === 'darwin') {
        playSoundMac(filePath);
    } else {
        playSoundLinux(filePath);
    }
}

/**
 * Stops any currently playing sound.
 */
function stopSound() {
    if (currentSoundProcess && !currentSoundProcess.killed) {
        try { currentSoundProcess.kill(); } catch (_) { }
        currentSoundProcess = null;
    }
}

// ─── Unified playSound (reads from config) ──────────────────────────────────
/**
 * Plays the selected error sound. Cross-platform. Respects enabled setting.
 * @param {vscode.ExtensionContext} context
 */
function playSound(context) {
    const config = vscode.workspace.getConfiguration('errorSoundEffect');
    if (!config.get('enabled', true)) return;

    const selectedSoundFile = config.get('selectedSoundFilename', '');
    if (!selectedSoundFile) return;

    const soundPath = path.join(context.globalStorageUri.fsPath, selectedSoundFile);
    playSoundFile(context, soundPath);
}

/**
 * Activates error sound monitoring.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let lastErrorCount = 0;
    let debounceTimer = null;

    console.log(`[BugLOL] Platform: ${PLATFORM} — audio engine ready`);

    // Listen to changes in diagnostics (problems panel).
    // Debounced 300ms: language servers often fire multiple rapid events
    // for the same save (one per file). Without debounce you'd get
    // N sounds for N files with errors simultaneously.
    const diagnosticsDisposable = vscode.languages.onDidChangeDiagnostics(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            try {
                let currentErrorCount = 0;
                vscode.languages.getDiagnostics().forEach(([, diagnostics]) => {
                    currentErrorCount += diagnostics.filter(
                        (d) => d.severity === vscode.DiagnosticSeverity.Error
                    ).length;
                });

                if (currentErrorCount > lastErrorCount) {
                    playSound(context);
                }
                lastErrorCount = currentErrorCount;
            } catch (err) {
                console.error('[BugLOL] Diagnostics handler error:', err.message);
            }
        }, 300);
    });
    context.subscriptions.push(diagnosticsDisposable);

    // Terminal error detection (VS Code 1.93+)
    if (vscode.window.onDidEndTerminalShellExecution) {
        const terminalDisposable = vscode.window.onDidEndTerminalShellExecution((e) => {
            if (e.exitCode !== undefined && e.exitCode !== 0) {
                console.log(`[BugLOL] Terminal command failed with exit code ${e.exitCode}`);
                playSound(context);
            }
        });
        context.subscriptions.push(terminalDisposable);
        console.log('[BugLOL] Terminal error detection enabled');
    }

    // Cleanup on deactivation
    context.subscriptions.push({
        dispose: () => {
            if (currentSoundProcess && !currentSoundProcess.killed) {
                try { currentSoundProcess.kill(); } catch (_) { }
            }
        }
    });
}

module.exports = { activate, playSoundFile, stopSound };
