// GraphQL Network Inspector - Background Script
// Stores and manages GraphQL requests per tab

const MAX_REQUESTS_PER_TAB = 500;
const requestStore = new Map(); // tabId -> requests[]

// Initialize storage for a tab
function initTabStorage(tabId) {
    if (!requestStore.has(tabId)) {
        requestStore.set(tabId, []);
    }
}

// Add a request to the store
function addRequest(tabId, request) {
    initTabStorage(tabId);
    const requests = requestStore.get(tabId);
    
    // Add to the beginning for newest first
    requests.unshift(request);
    
    // Trim if too many
    if (requests.length > MAX_REQUESTS_PER_TAB) {
        requests.pop();
    }
}

// Get requests for a tab
function getRequests(tabId) {
    return requestStore.get(tabId) || [];
}

// Clear requests for a tab
function clearRequests(tabId) {
    requestStore.set(tabId, []);
}

// Clean up when tab is closed
browser.tabs.onRemoved.addListener((tabId) => {
    requestStore.delete(tabId);
});

// Clean up when tab navigates
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading' && changeInfo.url) {
        // Clear requests when navigating to a new page
        clearRequests(tabId);
    }
});

// Message handler
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    switch (message.action) {
        case 'ADD_REQUEST':
            if (tabId && message.payload) {
                addRequest(tabId, message.payload);
                // Notify popup if open
                browser.runtime.sendMessage({
                    action: 'REQUEST_ADDED',
                    payload: message.payload,
                    tabId: tabId
                }).catch(() => {
                    // Popup might not be open
                });
            }
            break;

        case 'GET_REQUESTS':
            return browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => {
                    const activeTabId = tabs[0]?.id;
                    if (activeTabId) {
                        return { 
                            requests: getRequests(activeTabId),
                            tabId: activeTabId
                        };
                    }
                    return { requests: [], tabId: null };
                });

        case 'CLEAR_REQUESTS':
            return browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => {
                    const activeTabId = tabs[0]?.id;
                    if (activeTabId) {
                        clearRequests(activeTabId);
                        return { success: true };
                    }
                    return { success: false };
                });

        case 'CONTENT_SCRIPT_READY':
            console.log('[GraphQL Inspector] Content script ready for tab:', tabId);
            initTabStorage(tabId);
            break;

        case 'REPLAY_REQUEST':
            // Forward replay request to the active tab's content script
            return browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => {
                    const activeTab = tabs[0];
                    if (activeTab) {
                        return browser.tabs.sendMessage(activeTab.id, {
                            action: 'REPLAY_REQUEST',
                            payload: message.payload
                        });
                    }
                    return { success: false, error: 'No active tab' };
                });
    }

    return false;
});

console.log('[GraphQL Inspector] Background script initialized');
