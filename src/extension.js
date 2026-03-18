const vscode = require('vscode');

/** @type {vscode.StatusBarItem} */
let statusBarItemSound;
/** @type {vscode.StatusBarItem} */
let statusBarItemToggle;

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
        }

        // ── Status Bar (2 items: sound list + on/off toggle) ─────────────────
        try {
            createStatusBarButtons(context);
        } catch (err) {
            console.error('[BugLOL] Status bar failed:', err.message);
        }

        // ── Toggle command ────────────────────────────────────────────────────
        const toggleDisposable = vscode.commands.registerCommand('errorSoundEffect.toggleEnabled', () => {
            const config = vscode.workspace.getConfiguration('errorSoundEffect');
            const current = config.get('enabled', true);
            config.update('enabled', !current, vscode.ConfigurationTarget.Global);
        });
        context.subscriptions.push(toggleDisposable);

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
        console.error('[BugLOL] Critical activation failure:', err.message);
    }
}

/**
 * Creates two status bar items: (1) BugLOL — opens sound list (2) speaker icon — toggles on/off.
 * Both reflect enabled state: when off, both show mute and BugLOL looks disabled.
 * @param {vscode.ExtensionContext} context
 */
function createStatusBarButtons(context) {
    // Left: BugLOL — click opens sound search
    statusBarItemSound = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        99
    );
    statusBarItemSound.command = 'errorSoundEffect.selectSound';

    // Right: speaker icon — click toggles on/off
    statusBarItemToggle = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItemToggle.command = 'errorSoundEffect.toggleEnabled';

    updateStatusBar();
    statusBarItemSound.show();
    statusBarItemToggle.show();
    context.subscriptions.push(statusBarItemSound);
    context.subscriptions.push(statusBarItemToggle);

    const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('errorSoundEffect')) {
            updateStatusBar();
        }
    });
    context.subscriptions.push(configWatcher);
}

function updateStatusBar() {
    const config = vscode.workspace.getConfiguration('errorSoundEffect');
    const enabled = config.get('enabled', true);
    const currentSound = config.get('selectedSoundName', 'Fahhh');

    if (enabled) {
        statusBarItemSound.text = `$(music) BugLOL`;
        statusBarItemSound.tooltip = `🎵 ${currentSound}\nClick to search & change sounds`;
        statusBarItemSound.backgroundColor = undefined;

        statusBarItemToggle.text = '$(unmute)';
        statusBarItemToggle.tooltip = 'BugLOL is ON — click to turn off';
        statusBarItemToggle.backgroundColor = undefined;
    } else {
        statusBarItemSound.text = `$(mute) BugLOL`;
        statusBarItemSound.tooltip = `🔇 BugLOL is OFF\nClick to open sound search\nUse the $(unmute) icon to turn on`;
        statusBarItemSound.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');

        statusBarItemToggle.text = '$(mute)';
        statusBarItemToggle.tooltip = 'BugLOL is OFF — click to turn on';
        statusBarItemToggle.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
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
