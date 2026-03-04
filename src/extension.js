const vscode = require('vscode');

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    try {
        console.log('[BugLOL] Extension activating...');

        // ── Sound Manager (command palette + initial state) ──────────────────
        try {
            const soundManager = require('./soundManager.js');
            soundManager.registerSelectSoundCommand(context);
            soundManager.checkInitialSoundState(context);
        } catch (err) {
            console.error('[BugLOL] soundManager failed to load:', err.message);
            // Non-fatal — sound selection UI won't work but diagnostics listener still will
        }

        // ── Status Bar ────────────────────────────────────────────────────────
        try {
            createStatusBarButton(context);
        } catch (err) {
            console.error('[BugLOL] Status bar failed:', err.message);
        }

        // ── Welcome notification (first install only) ─────────────────────────
        showWelcomeOnFirstInstall(context).catch((err) => {
            console.warn('[BugLOL] Welcome notification failed:', err.message);
        });

        // ── Core error sound listener ─────────────────────────────────────────
        try {
            require('./errorSound.js').activate(context);
        } catch (err) {
            console.error('[BugLOL] errorSound failed to activate:', err.message);
        }

        console.log('[BugLOL] Extension activated successfully.');
    } catch (err) {
        // Last-resort catch — extension host should never crash
        console.error('[BugLOL] Critical activation failure:', err.message);
    }
}

/**
 * Creates a persistent status bar button for quick sound search access.
 * @param {vscode.ExtensionContext} context
 */
function createStatusBarButton(context) {
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );

    const config = vscode.workspace.getConfiguration('errorSoundEffect');
    const currentSound = config.get('selectedSoundName', 'Fahhh');

    statusBarItem.text = `$(unmute) BugLOL`;
    statusBarItem.tooltip = `🎵 Current Sound: ${currentSound}\nClick to search & change sounds`;
    statusBarItem.command = 'errorSoundEffect.selectSound';
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);

    // Update tooltip when config changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('errorSoundEffect.selectedSoundName')) {
            const updatedConfig = vscode.workspace.getConfiguration('errorSoundEffect');
            const updatedSound = updatedConfig.get('selectedSoundName', 'Fahhh');
            statusBarItem.tooltip = `🎵 Current Sound: ${updatedSound}\nClick to search & change sounds`;
        }
    });

    context.subscriptions.push(configWatcher);
}

/**
 * Shows a welcome notification only on the very first install.
 * @param {vscode.ExtensionContext} context
 */
async function showWelcomeOnFirstInstall(context) {
    const WELCOME_SHOWN_KEY = 'buglol.welcomeShown';
    const hasSeenWelcome = context.globalState.get(WELCOME_SHOWN_KEY, false);

    if (!hasSeenWelcome) {
        await context.globalState.update(WELCOME_SHOWN_KEY, true);

        const selection = await vscode.window.showInformationMessage(
            '🎉 Welcome to BugLOL! Search 100k+ meme sounds for your error effects. Pick a sound now!',
            '🔍 Search Sounds',
            'Maybe Later'
        );

        if (selection === '🔍 Search Sounds') {
            vscode.commands.executeCommand('errorSoundEffect.selectSound');
        }
    }
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
};
