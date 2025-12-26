// GraphQL Network Inspector - Content Script
// Intercepts GraphQL requests and sends them to the background script

(function() {
    'use strict';

    // Inject script into page context to intercept requests
    const script = document.createElement('script');
    script.textContent = `
    (function() {
        'use strict';

        const GRAPHQL_ENDPOINTS = ['/graphql', '/gql', '/api/graphql', '/query'];
        
        function isGraphQLRequest(url, body) {
            // Check URL patterns
            const urlLower = url.toLowerCase();
            if (GRAPHQL_ENDPOINTS.some(endpoint => urlLower.includes(endpoint))) {
                return true;
            }
            
            // Check body for GraphQL signature
            if (body) {
                try {
                    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
                    if (parsed && (parsed.query || parsed.mutation || parsed.operationName)) {
                        return true;
                    }
                    // Check for batched queries
                    if (Array.isArray(parsed) && parsed.some(item => item.query || item.mutation)) {
                        return true;
                    }
                } catch (e) {
                    // Not JSON, check for query string
                    if (typeof body === 'string' && (body.includes('query') || body.includes('mutation'))) {
                        return true;
                    }
                }
            }
            return false;
        }

        function parseGraphQLQuery(body) {
            try {
                const parsed = typeof body === 'string' ? JSON.parse(body) : body;
                
                // Handle batched queries
                if (Array.isArray(parsed)) {
                    return parsed.map(item => ({
                        operationName: item.operationName || extractOperationName(item.query),
                        query: item.query,
                        variables: item.variables || {},
                        isBatched: true
                    }));
                }
                
                return {
                    operationName: parsed.operationName || extractOperationName(parsed.query),
                    query: parsed.query,
                    variables: parsed.variables || {},
                    isBatched: false
                };
            } catch (e) {
                return null;
            }
        }

        function extractOperationName(query) {
            if (!query) return 'Anonymous';
            
            // Match query/mutation/subscription name
            const match = query.match(/(?:query|mutation|subscription)\\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (match) return match[1];
            
            // Try to extract from the first field
            const fieldMatch = query.match(/\\{\\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (fieldMatch) return fieldMatch[1];
            
            return 'Anonymous';
        }

        function getOperationType(query) {
            if (!query) return 'query';
            const trimmed = query.trim().toLowerCase();
            if (trimmed.startsWith('mutation')) return 'mutation';
            if (trimmed.startsWith('subscription')) return 'subscription';
            return 'query';
        }

        function headersToObject(headers) {
            const obj = {};
            if (headers instanceof Headers) {
                headers.forEach((value, key) => {
                    obj[key] = value;
                });
            } else if (headers && typeof headers === 'object') {
                Object.keys(headers).forEach(key => {
                    obj[key] = headers[key];
                });
            }
            return obj;
        }

        function sendToExtension(data) {
            window.postMessage({
                type: 'GRAPHQL_REQUEST',
                payload: data
            }, '*');
        }

        // Intercept fetch
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const [resource, config] = args;
            const url = typeof resource === 'string' ? resource : resource.url;
            const method = config?.method || 'GET';
            const body = config?.body;
            const requestHeaders = headersToObject(config?.headers);

            if (method.toUpperCase() === 'POST' && isGraphQLRequest(url, body)) {
                const startTime = performance.now();
                const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
                
                const parsedQuery = parseGraphQLQuery(body);
                
                try {
                    const response = await originalFetch.apply(this, args);
                    const endTime = performance.now();
                    const duration = Math.round(endTime - startTime);
                    
                    // Clone response to read body
                    const clonedResponse = response.clone();
                    let responseBody = null;
                    
                    // Capture response headers
                    const responseHeaders = headersToObject(response.headers);
                    
                    try {
                        responseBody = await clonedResponse.json();
                    } catch (e) {
                        try {
                            responseBody = await clonedResponse.text();
                        } catch (e2) {
                            responseBody = 'Unable to read response';
                        }
                    }

                    const requestData = {
                        id: requestId,
                        url: url,
                        method: method,
                        timestamp: Date.now(),
                        duration: duration,
                        status: response.status,
                        statusText: response.statusText,
                        request: parsedQuery,
                        requestBody: body,
                        requestHeaders: requestHeaders,
                        response: responseBody,
                        responseHeaders: responseHeaders,
                        operationType: Array.isArray(parsedQuery) 
                            ? 'batched' 
                            : getOperationType(parsedQuery?.query),
                        hasErrors: responseBody?.errors?.length > 0 || 
                                   (Array.isArray(responseBody) && responseBody.some(r => r.errors?.length > 0))
                    };

                    sendToExtension(requestData);
                    return response;
                } catch (error) {
                    const endTime = performance.now();
                    const duration = Math.round(endTime - startTime);
                    
                    sendToExtension({
                        id: requestId,
                        url: url,
                        method: method,
                        timestamp: Date.now(),
                        duration: duration,
                        status: 0,
                        statusText: 'Network Error',
                        request: parsedQuery,
                        requestBody: body,
                        requestHeaders: requestHeaders,
                        response: { error: error.message },
                        responseHeaders: {},
                        operationType: Array.isArray(parsedQuery) 
                            ? 'batched' 
                            : getOperationType(parsedQuery?.query),
                        hasErrors: true
                    });
                    
                    throw error;
                }
            }

            return originalFetch.apply(this, args);
        };

        // Intercept XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._graphqlData = {
                method: method,
                url: url,
                startTime: null,
                requestHeaders: {}
            };
            return originalXHROpen.apply(this, [method, url, ...args]);
        };

        XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
            if (this._graphqlData) {
                this._graphqlData.requestHeaders[name] = value;
            }
            return originalXHRSetRequestHeader.apply(this, [name, value]);
        };

        XMLHttpRequest.prototype.send = function(body) {
            const xhr = this;
            const { method, url, requestHeaders } = xhr._graphqlData || {};

            if (method?.toUpperCase() === 'POST' && isGraphQLRequest(url, body)) {
                xhr._graphqlData.startTime = performance.now();
                xhr._graphqlData.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
                xhr._graphqlData.parsedQuery = parseGraphQLQuery(body);
                xhr._graphqlData.requestBody = body;

                const originalOnReadyStateChange = xhr.onreadystatechange;
                const originalOnLoad = xhr.onload;
                const originalOnError = xhr.onerror;

                const handleComplete = () => {
                    const endTime = performance.now();
                    const duration = Math.round(endTime - xhr._graphqlData.startTime);
                    
                    let responseBody = null;
                    try {
                        responseBody = JSON.parse(xhr.responseText);
                    } catch (e) {
                        responseBody = xhr.responseText || 'Unable to read response';
                    }

                    // Parse response headers
                    const responseHeaders = {};
                    const headerStr = xhr.getAllResponseHeaders();
                    if (headerStr) {
                        headerStr.split('\\r\\n').forEach(line => {
                            const parts = line.split(': ');
                            if (parts.length === 2) {
                                responseHeaders[parts[0]] = parts[1];
                            }
                        });
                    }

                    const parsedQuery = xhr._graphqlData.parsedQuery;
                    
                    sendToExtension({
                        id: xhr._graphqlData.requestId,
                        url: url,
                        method: method,
                        timestamp: Date.now(),
                        duration: duration,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        request: parsedQuery,
                        requestBody: xhr._graphqlData.requestBody,
                        requestHeaders: requestHeaders,
                        response: responseBody,
                        responseHeaders: responseHeaders,
                        operationType: Array.isArray(parsedQuery) 
                            ? 'batched' 
                            : getOperationType(parsedQuery?.query),
                        hasErrors: responseBody?.errors?.length > 0 ||
                                   (Array.isArray(responseBody) && responseBody.some(r => r.errors?.length > 0))
                    });
                };

                xhr.onreadystatechange = function(...args) {
                    if (xhr.readyState === 4) {
                        handleComplete();
                    }
                    if (originalOnReadyStateChange) {
                        originalOnReadyStateChange.apply(this, args);
                    }
                };

                xhr.onload = function(...args) {
                    if (!xhr.onreadystatechange) {
                        handleComplete();
                    }
                    if (originalOnLoad) {
                        originalOnLoad.apply(this, args);
                    }
                };

                xhr.onerror = function(...args) {
                    const endTime = performance.now();
                    const duration = Math.round(endTime - xhr._graphqlData.startTime);
                    
                    sendToExtension({
                        id: xhr._graphqlData.requestId,
                        url: url,
                        method: method,
                        timestamp: Date.now(),
                        duration: duration,
                        status: 0,
                        statusText: 'Network Error',
                        request: xhr._graphqlData.parsedQuery,
                        requestBody: xhr._graphqlData.requestBody,
                        requestHeaders: requestHeaders,
                        response: { error: 'Network request failed' },
                        responseHeaders: {},
                        operationType: 'query',
                        hasErrors: true
                    });

                    if (originalOnError) {
                        originalOnError.apply(this, args);
                    }
                };
            }

            return originalXHRSend.apply(this, [body]);
        };

        // Listen for replay requests from extension
        window.addEventListener('message', function(event) {
            if (event.source !== window) return;
            
            // Simple replay (fire and forget)
            if (event.data?.type === 'GRAPHQL_REPLAY_REQUEST') {
                const { url, method, headers, body } = event.data.payload;
                
                originalFetch(url, {
                    method: method || 'POST',
                    headers: headers || {},
                    body: body
                }).then(response => {
                    console.log('[GraphQL Inspector] Replay completed');
                }).catch(error => {
                    console.error('[GraphQL Inspector] Replay failed:', error);
                });
            }
            
            // Replay with response - return the result
            if (event.data?.type === 'GRAPHQL_REPLAY_WITH_RESPONSE') {
                const { url, method, headers, body } = event.data.payload;
                const replayId = event.data.replayId;
                
                const startTime = performance.now();
                
                originalFetch(url, {
                    method: method || 'POST',
                    headers: headers || { 'Content-Type': 'application/json' },
                    body: body
                }).then(async response => {
                    const endTime = performance.now();
                    const duration = Math.round(endTime - startTime);
                    
                    let responseBody;
                    try {
                        responseBody = await response.clone().json();
                    } catch (e) {
                        responseBody = await response.text();
                    }
                    
                    // Get response headers
                    const responseHeaders = {};
                    response.headers.forEach((value, key) => {
                        responseHeaders[key] = value;
                    });
                    
                    window.postMessage({
                        type: 'GRAPHQL_REPLAY_RESPONSE',
                        replayId: replayId,
                        result: {
                            status: response.status,
                            statusText: response.statusText,
                            response: responseBody,
                            responseHeaders: responseHeaders,
                            duration: duration
                        }
                    }, '*');
                }).catch(error => {
                    window.postMessage({
                        type: 'GRAPHQL_REPLAY_RESPONSE',
                        replayId: replayId,
                        result: {
                            error: error.message
                        }
                    }, '*');
                });
            }
        });

        console.log('[GraphQL Inspector] Request interception initialized');
    })();
    `;

    // Inject the script
    (document.head || document.documentElement).appendChild(script);
    script.remove();

    // Listen for messages from injected script
    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        if (event.data?.type === 'GRAPHQL_REQUEST') {
            // Forward to background script
            browser.runtime.sendMessage({
                action: 'ADD_REQUEST',
                payload: event.data.payload
            }).catch(err => {
                // Extension context might be invalidated
                console.log('[GraphQL Inspector] Could not send message:', err);
            });
        }
    });

    // Listen for replay requests from popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'REPLAY_REQUEST') {
            window.postMessage({
                type: 'GRAPHQL_REPLAY_REQUEST',
                payload: message.payload
            }, '*');
            return Promise.resolve({ success: true });
        }
        
        // Handle replay with response - execute fetch and return result
        if (message.action === 'REPLAY_REQUEST_WITH_RESPONSE') {
            const { url, method, headers, body } = message.payload;
            
            // Create a unique ID for this replay
            const replayId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            // Post message to page context to make the request
            window.postMessage({
                type: 'GRAPHQL_REPLAY_WITH_RESPONSE',
                replayId: replayId,
                payload: { url, method, headers, body }
            }, '*');
            
            // Return a promise that will be resolved when we get the response
            return new Promise((resolve) => {
                const handler = (event) => {
                    if (event.source !== window) return;
                    if (event.data?.type === 'GRAPHQL_REPLAY_RESPONSE' && event.data.replayId === replayId) {
                        window.removeEventListener('message', handler);
                        resolve(event.data.result);
                    }
                };
                window.addEventListener('message', handler);
                
                // Timeout after 30 seconds
                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    resolve({ error: 'Request timeout' });
                }, 30000);
            });
        }
    });

    // Notify background that content script is ready
    browser.runtime.sendMessage({ action: 'CONTENT_SCRIPT_READY' }).catch(() => {});
})();
