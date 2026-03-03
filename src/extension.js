const vscode = require('vscode');

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
    console.log('Congratulations, your extension "error-sound-effect" is now active!');

    const soundManager = require('./soundManager.js');
    soundManager.registerSelectSoundCommand(context);
    soundManager.checkInitialSoundState(context);

    // --- Status Bar Button (always visible) ---
    createStatusBarButton(context);

    // --- Welcome Notification (first install only) ---
    showWelcomeOnFirstInstall(context);

    require('./errorSound.js').activate(context);
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
 * Uses globalState to track whether user has seen it.
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
