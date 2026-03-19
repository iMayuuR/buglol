const vscode = require('vscode');

const KEY = 'buglol.enabled';

/**
 * Returns whether BugLOL sound is enabled. Uses globalState (toggle) first, then config.
 * @param {vscode.ExtensionContext} context
 * @returns {boolean}
 */
function getEnabled(context) {
    const fromState = context.globalState.get(KEY);
    if (typeof fromState === 'boolean') return fromState;
    return vscode.workspace.getConfiguration('errorSoundEffect').get('enabled', true);
}

/**
 * Sets enabled state in globalState (avoids writing to User Settings).
 * @param {vscode.ExtensionContext} context
 * @param {boolean} value
 */
async function setEnabled(context, value) {
    await context.globalState.update(KEY, value);
}

module.exports = { getEnabled, setEnabled };
