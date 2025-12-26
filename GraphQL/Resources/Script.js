function show(enabled, useSettingsInsteadOfPreferences) {
    if (useSettingsInsteadOfPreferences) {
        document.getElementsByClassName('state-on')[0].innerHTML = 
            '<span class="status-badge on">Active</span>' +
            'The extension is enabled. Click the toolbar icon in Safari to view GraphQL requests.';
        document.getElementsByClassName('state-off')[0].innerHTML = 
            '<span class="status-badge off">Disabled</span>' +
            'The extension is currently disabled. Enable it in Safari Settings.';
        document.getElementsByClassName('state-unknown')[0].innerText = 
            'Enable the extension in Safari Settings to start inspecting GraphQL requests.';
        document.getElementsByClassName('open-preferences')[0].innerText = 
            'Open Safari Settings…';
    }

    if (typeof enabled === "boolean") {
        document.body.classList.toggle('state-on', enabled);
        document.body.classList.toggle('state-off', !enabled);
    } else {
        document.body.classList.remove('state-on');
        document.body.classList.remove('state-off');
    }
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

document.querySelector("button.open-preferences").addEventListener("click", openPreferences);
