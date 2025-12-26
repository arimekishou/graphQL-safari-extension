// GraphQL Inspector - Popup Script
// Displays and manages GraphQL requests

class GraphQLInspector {
    constructor() {
        this.requests = [];
        this.filteredRequests = [];
        this.selectedRequest = null;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.activeTabId = null;
        this.currentDetailTab = 'query'; // Track current detail tab
        
        // Edit mode
        this.editMode = {
            query: false,
            variables: false
        };

        this.init();
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        await this.loadRequests();
        this.listenForNewRequests();
    }

    bindElements() {
        // Header
        this.requestCountEl = document.getElementById('requestCount');
        this.clearBtn = document.getElementById('clearBtn');

        // Filters
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.searchInput = document.getElementById('searchInput');

        // Request List
        this.requestListEl = document.getElementById('requestList');
        this.emptyStateEl = document.getElementById('emptyState');

        // Detail
        this.detailPlaceholder = document.getElementById('detailPlaceholder');
        this.detailContent = document.getElementById('detailContent');
        this.detailBadge = document.getElementById('detailBadge');
        this.detailName = document.getElementById('detailName');
        this.detailStatus = document.getElementById('detailStatus');
        this.detailDuration = document.getElementById('detailDuration');
        this.detailUrl = document.getElementById('detailUrl');
        this.replayBtn = document.getElementById('replayBtn');
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabPanes = document.querySelectorAll('.tab-pane');
        this.queryCode = document.getElementById('queryCode');
        this.variablesCode = document.getElementById('variablesCode');
        this.responseCode = document.getElementById('responseCode');
        this.headersCode = document.getElementById('headersCode');
        this.copyBtns = document.querySelectorAll('.copy-btn');
        
        // Editors
        this.queryEditor = document.getElementById('queryEditor');
        this.variablesEditor = document.getElementById('variablesEditor');
        this.editQueryBtn = document.getElementById('editQueryBtn');
        this.editVariablesBtn = document.getElementById('editVariablesBtn');

        // Pagination
        this.paginationEl = document.getElementById('pagination');
        this.prevPageBtn = document.getElementById('prevPage');
        this.nextPageBtn = document.getElementById('nextPage');
        this.pageInfoEl = document.getElementById('pageInfo');

        // Toast
        this.toast = document.getElementById('toast');
        this.toastMessage = this.toast.querySelector('.toast-message');
    }

    bindEvents() {
        // Clear button
        this.clearBtn.addEventListener('click', () => this.clearRequests());

        // Filter buttons
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.filterRequests();
        });

        // Tab buttons
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveTab(e.target.dataset.tab);
            });
        });

        // Copy buttons
        this.copyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.copyToClipboard(e.target.closest('.copy-btn'));
            });
        });

        // Pagination
        this.prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        this.nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));

        // Replay button
        this.replayBtn.addEventListener('click', () => this.replayRequest());

        // Edit buttons
        this.editQueryBtn.addEventListener('click', () => this.toggleEditMode('query'));
        this.editVariablesBtn.addEventListener('click', () => this.toggleEditMode('variables'));
    }

    async loadRequests() {
        try {
            const response = await browser.runtime.sendMessage({ action: 'GET_REQUESTS' });
            if (response && response.requests) {
                this.requests = response.requests;
                this.activeTabId = response.tabId;
                this.filterRequests();
            }
        } catch (error) {
            console.error('[GraphQL Inspector] Failed to load requests:', error);
        }
    }

    listenForNewRequests() {
        browser.runtime.onMessage.addListener((message) => {
            if (message.action === 'REQUEST_ADDED' && message.tabId === this.activeTabId) {
                const newRequest = message.payload;
                newRequest._isNew = true; // Mark as new for highlighting
                
                // Add new request to the beginning
                this.requests.unshift(newRequest);
                this.filterRequests();

                // Remove _isNew flag after animation
                setTimeout(() => {
                    newRequest._isNew = false;
                }, 2000);
            }
        });
    }

    async clearRequests() {
        try {
            await browser.runtime.sendMessage({ action: 'CLEAR_REQUESTS' });
            this.requests = [];
            this.selectedRequest = null;
            this.filterRequests();
            this.hideDetail();
        } catch (error) {
            console.error('[GraphQL Inspector] Failed to clear requests:', error);
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;

        // Update active button
        this.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.filterRequests();
    }

    filterRequests() {
        let filtered = [...this.requests];

        // Apply type filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(req => {
                if (this.currentFilter === 'error') {
                    return req.hasErrors || req.status >= 400 || req.status === 0;
                }
                return req.operationType === this.currentFilter;
            });
        }

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(req => {
                const name = this.getOperationName(req).toLowerCase();
                const query = req.request?.query?.toLowerCase() || '';
                return name.includes(this.searchQuery) || query.includes(this.searchQuery);
            });
        }

        this.filteredRequests = filtered;
        this.updateRequestCount();
        this.renderRequestList();
        this.updatePagination();
    }

    updateRequestCount() {
        const total = this.requests.length;
        const filtered = this.filteredRequests.length;
        
        if (total === filtered) {
            this.requestCountEl.textContent = `${total} request${total !== 1 ? 's' : ''}`;
        } else {
            this.requestCountEl.textContent = `${filtered} of ${total}`;
        }
    }

    getOperationName(request) {
        if (Array.isArray(request.request)) {
            const names = request.request.map(r => r.operationName || 'Anonymous');
            return names.join(', ');
        }
        return request.request?.operationName || 'Anonymous';
    }

    renderRequestList() {
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageRequests = this.filteredRequests.slice(startIndex, endIndex);

        // Clear list (keep empty state)
        const items = this.requestListEl.querySelectorAll('.request-item');
        items.forEach(item => item.remove());

        // Show/hide empty state
        if (this.filteredRequests.length === 0) {
            this.emptyStateEl.style.display = 'flex';
            return;
        }
        this.emptyStateEl.style.display = 'none';

        // Render items
        pageRequests.forEach(request => {
            const item = this.createRequestItem(request);
            this.requestListEl.appendChild(item);
        });
    }

    createRequestItem(request) {
        const item = document.createElement('div');
        item.className = 'request-item';
        if (request.hasErrors || request.status >= 400 || request.status === 0) {
            item.classList.add('error');
        }
        if (this.selectedRequest?.id === request.id) {
            item.classList.add('active');
        }
        if (request._isNew) {
            item.classList.add('new-request');
        }

        const operationType = request.operationType || 'query';
        const operationName = this.getOperationName(request);
        const isError = request.hasErrors || request.status >= 400 || request.status === 0;
        const statusClass = isError ? 'error' : 'success';
        const statusText = request.status === 0 ? 'ERR' : request.status;

        item.innerHTML = `
            <div class="request-item-header">
                <span class="operation-badge ${operationType}">${operationType}</span>
                <span class="request-name">${this.escapeHtml(operationName)}</span>
            </div>
            <div class="request-item-meta">
                <span class="request-status ${statusClass}">${statusText}</span>
                <span class="request-duration">${request.duration}ms</span>
                <span class="request-time">${this.formatTime(request.timestamp)}</span>
            </div>
        `;

        item.addEventListener('click', () => {
            this.selectRequest(request, item);
        });

        return item;
    }

    selectRequest(request, itemEl) {
        // Reset edit mode when switching requests
        this.resetEditMode();
        
        // Update selection
        this.selectedRequest = request;

        // Update active state
        const items = this.requestListEl.querySelectorAll('.request-item');
        items.forEach(item => item.classList.remove('active'));
        itemEl.classList.add('active');

        // Show detail
        this.showDetail(request);
    }

    showDetail(request, preserveTab = false) {
        this.detailPlaceholder.style.display = 'none';
        this.detailContent.style.display = 'flex';

        // Update header
        const operationType = request.operationType || 'query';
        this.detailBadge.textContent = operationType.toUpperCase();
        this.detailBadge.className = `operation-badge ${operationType}`;
        this.detailName.textContent = this.getOperationName(request);

        const isError = request.hasErrors || request.status >= 400 || request.status === 0;
        this.detailStatus.textContent = request.status === 0 ? 'Error' : `${request.status} ${request.statusText}`;
        this.detailStatus.className = `status${isError ? ' error' : ''}`;
        this.detailDuration.textContent = `${request.duration}ms`;
        
        // Show URL
        const url = request.url || '';
        this.detailUrl.textContent = url;
        this.detailUrl.title = url;

        // Update code blocks with safe highlighting
        this.renderHighlightedCode(this.queryCode, this.formatQuery(request), 'graphql');
        this.renderHighlightedCode(this.variablesCode, this.formatVariables(request), 'json');
        this.renderHighlightedCode(this.responseCode, this.formatResponse(request), 'json');
        this.renderHighlightedCode(this.headersCode, this.formatHeaders(request), 'json');
        
        // Pre-populate editors with current values
        this.queryEditor.value = request.request?.query || '';
        this.variablesEditor.value = JSON.stringify(request.request?.variables || {}, null, 2);

        // Set tab - preserve current or reset to query
        if (preserveTab && this.currentDetailTab) {
            this.setActiveTab(this.currentDetailTab);
        } else {
            this.setActiveTab('query');
        }
    }

    hideDetail() {
        this.detailPlaceholder.style.display = 'flex';
        this.detailContent.style.display = 'none';
    }

    formatQuery(request) {
        if (Array.isArray(request.request)) {
            return request.request.map((r, i) => {
                return `# Query ${i + 1}: ${r.operationName || 'Anonymous'}\n${r.query || 'No query'}`;
            }).join('\n\n');
        }
        return request.request?.query || 'No query';
    }

    formatVariables(request) {
        if (Array.isArray(request.request)) {
            const combined = {};
            request.request.forEach((r, i) => {
                const vars = r.variables || {};
                const inlineArgs = this.extractInlineArguments(r.query);
                combined[`Query ${i + 1} (${r.operationName || 'Anonymous'})`] = {
                    variables: vars,
                    inlineArguments: inlineArgs
                };
            });
            return JSON.stringify(combined, null, 2);
        }
        
        const variables = request.request?.variables || {};
        const query = request.request?.query || '';
        const inlineArgs = this.extractInlineArguments(query);
        
        const hasVariables = Object.keys(variables).length > 0;
        const hasInlineArgs = Object.keys(inlineArgs).length > 0;
        
        if (!hasVariables && !hasInlineArgs) {
            return '{\n  "note": "No variables or inline arguments found"\n}';
        }
        
        const result = {};
        
        if (hasVariables) {
            result.variables = variables;
        }
        
        if (hasInlineArgs) {
            result.inlineArguments = inlineArgs;
        }
        
        return JSON.stringify(result, null, 2);
    }

    // Extract inline arguments from GraphQL query
    extractInlineArguments(query) {
        if (!query) return {};
        
        const args = {};
        
        // Match field calls with arguments: fieldName(arg: value) or fieldName(arg: { nested })
        const fieldWithArgsRegex = /(\w+)\s*\(\s*([^)]+)\)/g;
        let match;
        
        while ((match = fieldWithArgsRegex.exec(query)) !== null) {
            const fieldName = match[1];
            const argsString = match[2].trim();
            
            // Skip if it's a variable definition like ($var: Type)
            if (argsString.startsWith('$') && argsString.includes(':') && /^\$\w+\s*:\s*\w+/.test(argsString)) {
                continue;
            }
            
            try {
                const parsedArgs = this.parseGraphQLArguments(argsString);
                if (Object.keys(parsedArgs).length > 0) {
                    args[fieldName] = parsedArgs;
                }
            } catch (e) {
                // If parsing fails, store as raw string
                args[fieldName] = argsString;
            }
        }
        
        return args;
    }

    // Parse GraphQL arguments string into object
    parseGraphQLArguments(argsString) {
        const result = {};
        
        // Simple parser for common patterns
        // Handles: key: value, key: "string", key: { nested: value }, key: [array]
        let remaining = argsString.trim();
        
        while (remaining.length > 0) {
            // Match key: 
            const keyMatch = remaining.match(/^(\w+)\s*:\s*/);
            if (!keyMatch) break;
            
            const key = keyMatch[1];
            remaining = remaining.slice(keyMatch[0].length);
            
            // Parse value
            const { value, rest } = this.parseGraphQLValue(remaining);
            result[key] = value;
            remaining = rest.trim();
            
            // Skip comma if present
            if (remaining.startsWith(',')) {
                remaining = remaining.slice(1).trim();
            }
        }
        
        return result;
    }

    // Parse a single GraphQL value
    parseGraphQLValue(str) {
        str = str.trim();
        
        // String
        if (str.startsWith('"')) {
            const endQuote = str.indexOf('"', 1);
            if (endQuote !== -1) {
                return {
                    value: str.slice(1, endQuote),
                    rest: str.slice(endQuote + 1)
                };
            }
        }
        
        // Object
        if (str.startsWith('{')) {
            let depth = 1;
            let i = 1;
            while (i < str.length && depth > 0) {
                if (str[i] === '{') depth++;
                else if (str[i] === '}') depth--;
                i++;
            }
            const objStr = str.slice(1, i - 1);
            return {
                value: this.parseGraphQLArguments(objStr),
                rest: str.slice(i)
            };
        }
        
        // Array
        if (str.startsWith('[')) {
            let depth = 1;
            let i = 1;
            while (i < str.length && depth > 0) {
                if (str[i] === '[') depth++;
                else if (str[i] === ']') depth--;
                i++;
            }
            const arrStr = str.slice(1, i - 1);
            // Simple array parsing - split by comma for primitive values
            const items = arrStr.split(',').map(s => {
                const trimmed = s.trim();
                // Try to parse as number/boolean/null
                if (trimmed === 'true') return true;
                if (trimmed === 'false') return false;
                if (trimmed === 'null') return null;
                if (/^-?\d+\.?\d*$/.test(trimmed)) return Number(trimmed);
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
                return trimmed;
            });
            return {
                value: items,
                rest: str.slice(i)
            };
        }
        
        // Variable reference ($varName)
        if (str.startsWith('$')) {
            const varMatch = str.match(/^\$(\w+)/);
            if (varMatch) {
                return {
                    value: `$${varMatch[1]}`,
                    rest: str.slice(varMatch[0].length)
                };
            }
        }
        
        // Boolean, null, number, enum
        const tokenMatch = str.match(/^([^\s,}\]]+)/);
        if (tokenMatch) {
            const token = tokenMatch[1];
            let value;
            
            if (token === 'true') value = true;
            else if (token === 'false') value = false;
            else if (token === 'null') value = null;
            else if (/^-?\d+\.?\d*$/.test(token)) value = Number(token);
            else value = token; // enum or other
            
            return {
                value,
                rest: str.slice(token.length)
            };
        }
        
        return { value: str, rest: '' };
    }

    formatResponse(request) {
        return JSON.stringify(request.response, null, 2);
    }

    formatHeaders(request) {
        const headers = {
            request: request.requestHeaders || {},
            response: request.responseHeaders || {}
        };
        return JSON.stringify(headers, null, 2);
    }

    async replayRequest() {
        if (!this.selectedRequest) return;

        const request = this.selectedRequest;
        
        // Show loading state
        this.replayBtn.classList.add('loading');
        this.replayBtn.disabled = true;
        
        // Show info toast
        const opName = this.getOperationName(request);
        this.showToast(`Sending ${opName}...`, 'info');

        try {
            // Get the active tab and send replay message to content script
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            
            if (!activeTab) {
                throw new Error('No active tab');
            }
            
            // Get the request body (edited or original)
            const requestBody = this.getEditedRequestBody() || request.requestBody;
            
            // Send request through content script (which has page context)
            const result = await browser.tabs.sendMessage(activeTab.id, {
                action: 'REPLAY_REQUEST_WITH_RESPONSE',
                payload: {
                    url: request.url,
                    method: request.method || 'POST',
                    headers: request.requestHeaders || {},
                    body: requestBody
                }
            });
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Update the current request with new data
            request.response = result.response;
            request.responseHeaders = result.responseHeaders || {};
            request.status = result.status;
            request.statusText = result.statusText;
            request.duration = result.duration;
            request.timestamp = Date.now();
            request.hasErrors = result.response?.errors?.length > 0;
            
            // Re-render the detail view with updated data (preserve current tab)
            this.showDetail(request, true);
            
            // Show success
            const hasErrors = result.response?.errors?.length > 0;
            if (hasErrors) {
                this.showToast(`Response received with errors (${result.duration}ms)`, 'error');
            } else {
                this.showToast(`Response updated! (${result.duration}ms)`, 'success');
            }
            
        } catch (error) {
            console.error('[GraphQL Inspector] Failed to replay request:', error);
            this.showToast(`Failed: ${error.message}`, 'error');
        } finally {
            this.replayBtn.classList.remove('loading');
            this.replayBtn.disabled = false;
        }
    }

    toggleEditMode(field) {
        this.editMode[field] = !this.editMode[field];
        
        if (field === 'query') {
            const btn = this.editQueryBtn;
            const code = this.queryCode;
            const editor = this.queryEditor;
            
            if (this.editMode.query) {
                // Enter edit mode
                btn.classList.add('active');
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Done
                `;
                editor.value = this.selectedRequest?.request?.query || '';
                code.style.display = 'none';
                editor.style.display = 'block';
                editor.focus();
            } else {
                // Exit edit mode
                btn.classList.remove('active');
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                `;
                code.style.display = 'block';
                editor.style.display = 'none';
                // Update the display with edited content
                this.renderHighlightedCode(code, editor.value, 'graphql');
            }
        } else if (field === 'variables') {
            const btn = this.editVariablesBtn;
            const code = this.variablesCode;
            const editor = this.variablesEditor;
            
            if (this.editMode.variables) {
                // Enter edit mode
                btn.classList.add('active');
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Done
                `;
                // Show raw variables JSON for editing
                const vars = this.selectedRequest?.request?.variables || {};
                editor.value = JSON.stringify(vars, null, 2);
                code.style.display = 'none';
                editor.style.display = 'block';
                editor.focus();
            } else {
                // Exit edit mode
                btn.classList.remove('active');
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                `;
                code.style.display = 'block';
                editor.style.display = 'none';
                // Update the display with edited content
                this.renderHighlightedCode(code, editor.value, 'json');
            }
        }
    }

    getEditedRequestBody() {
        if (!this.selectedRequest) return null;
        
        // Get edited query or use original
        let query = this.selectedRequest.request?.query || '';
        if (this.editMode.query || this.queryEditor.value) {
            query = this.queryEditor.value || query;
        }
        
        // Get edited variables or use original
        let variables = this.selectedRequest.request?.variables || {};
        if (this.editMode.variables || this.variablesEditor.value) {
            try {
                variables = JSON.parse(this.variablesEditor.value || '{}');
            } catch (e) {
                // If JSON is invalid, use original
                console.warn('[GraphQL Inspector] Invalid variables JSON, using original');
            }
        }
        
        // Build request body
        const body = {
            query: query,
            variables: variables
        };
        
        // Include operationName if it was in the original
        if (this.selectedRequest.request?.operationName) {
            body.operationName = this.selectedRequest.request.operationName;
        }
        
        return JSON.stringify(body);
    }

    resetEditMode() {
        this.editMode.query = false;
        this.editMode.variables = false;
        
        // Reset query editor
        this.editQueryBtn.classList.remove('active');
        this.editQueryBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
        `;
        this.queryCode.style.display = 'block';
        this.queryEditor.style.display = 'none';
        this.queryEditor.value = '';
        
        // Reset variables editor
        this.editVariablesBtn.classList.remove('active');
        this.editVariablesBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
        `;
        this.variablesCode.style.display = 'block';
        this.variablesEditor.style.display = 'none';
        this.variablesEditor.value = '';
    }

    showToast(message, type = 'info') {
        // Remove any existing animation classes
        this.toast.classList.remove('show', 'hide', 'success', 'error', 'info');
        
        // Set message and type
        this.toastMessage.textContent = message;
        this.toast.classList.add(type);
        
        // Force reflow
        void this.toast.offsetWidth;
        
        // Show toast
        this.toast.classList.add('show');
        
        // Hide after delay
        clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
            this.toast.classList.remove('show');
            this.toast.classList.add('hide');
        }, 3000);
    }

    // Safe syntax highlighting using DOM manipulation
    renderHighlightedCode(container, code, language) {
        container.innerHTML = '';
        
        if (!code) {
            container.textContent = '';
            return;
        }

        if (language === 'graphql') {
            this.renderGraphQL(container, code);
        } else if (language === 'json') {
            this.renderJSON(container, code);
        } else {
            container.textContent = code;
        }
    }

    renderGraphQL(container, code) {
        // Tokenize GraphQL
        const tokens = this.tokenizeGraphQL(code);
        
        tokens.forEach(token => {
            const span = document.createElement('span');
            span.textContent = token.value;
            if (token.type !== 'text') {
                span.className = token.type;
            }
            container.appendChild(span);
        });
    }

    tokenizeGraphQL(code) {
        const tokens = [];
        const keywords = /^(query|mutation|subscription|fragment|on|type|enum|interface|union|scalar|input|extend|directive|schema|implements|true|false|null)\b/;
        const variable = /^\$[a-zA-Z_][a-zA-Z0-9_]*/;
        const directive = /^@[a-zA-Z_][a-zA-Z0-9_]*/;
        const typeName = /^[A-Z][a-zA-Z0-9_]*/;
        const fieldName = /^[a-z_][a-zA-Z0-9_]*/;
        const string = /^"(?:[^"\\]|\\.)*"/;
        const number = /^-?\d+\.?\d*/;
        const comment = /^#.*/;
        const punctuation = /^[{}()\[\]:,!=]/;
        const whitespace = /^[\s]+/;

        let remaining = code;
        let pos = 0;

        while (remaining.length > 0) {
            let match;

            if ((match = remaining.match(whitespace))) {
                tokens.push({ type: 'text', value: match[0] });
            } else if ((match = remaining.match(comment))) {
                tokens.push({ type: 'comment', value: match[0] });
            } else if ((match = remaining.match(string))) {
                tokens.push({ type: 'string', value: match[0] });
            } else if ((match = remaining.match(keywords))) {
                tokens.push({ type: 'keyword', value: match[0] });
            } else if ((match = remaining.match(variable))) {
                tokens.push({ type: 'variable', value: match[0] });
            } else if ((match = remaining.match(directive))) {
                tokens.push({ type: 'function', value: match[0] });
            } else if ((match = remaining.match(number))) {
                tokens.push({ type: 'number', value: match[0] });
            } else if ((match = remaining.match(punctuation))) {
                tokens.push({ type: 'punctuation', value: match[0] });
            } else if ((match = remaining.match(typeName))) {
                tokens.push({ type: 'type', value: match[0] });
            } else if ((match = remaining.match(fieldName))) {
                tokens.push({ type: 'property', value: match[0] });
            } else {
                // Single character fallback
                tokens.push({ type: 'text', value: remaining[0] });
                remaining = remaining.slice(1);
                continue;
            }

            remaining = remaining.slice(match[0].length);
        }

        return tokens;
    }

    renderJSON(container, code) {
        const tokens = this.tokenizeJSON(code);
        
        tokens.forEach(token => {
            const span = document.createElement('span');
            span.textContent = token.value;
            if (token.type !== 'text') {
                span.className = token.type;
            }
            container.appendChild(span);
        });
    }

    tokenizeJSON(code) {
        const tokens = [];
        const string = /^"(?:[^"\\]|\\.)*"/;
        const number = /^-?\d+\.?\d*(?:[eE][+-]?\d+)?/;
        const keywords = /^(true|false|null)\b/;
        const punctuation = /^[{}\[\]:,]/;
        const whitespace = /^[\s]+/;

        let remaining = code;
        let expectingKey = true;
        let afterColon = false;

        while (remaining.length > 0) {
            let match;

            if ((match = remaining.match(whitespace))) {
                tokens.push({ type: 'text', value: match[0] });
            } else if ((match = remaining.match(string))) {
                const value = match[0];
                // Determine if this is a key or value
                if (expectingKey && !afterColon) {
                    // Check if it's an error-related key
                    const keyContent = value.slice(1, -1);
                    const isErrorKey = ['errors', 'error', 'message'].includes(keyContent);
                    tokens.push({ type: isErrorKey ? 'error-key' : 'property', value: value });
                } else {
                    tokens.push({ type: 'string', value: value });
                }
                afterColon = false;
            } else if ((match = remaining.match(number))) {
                tokens.push({ type: 'number', value: match[0] });
                afterColon = false;
            } else if ((match = remaining.match(keywords))) {
                tokens.push({ type: 'keyword', value: match[0] });
                afterColon = false;
            } else if ((match = remaining.match(punctuation))) {
                tokens.push({ type: 'punctuation', value: match[0] });
                if (match[0] === ':') {
                    afterColon = true;
                    expectingKey = false;
                } else if (match[0] === ',' || match[0] === '{') {
                    expectingKey = true;
                    afterColon = false;
                } else if (match[0] === '[') {
                    expectingKey = false;
                    afterColon = false;
                }
            } else {
                tokens.push({ type: 'text', value: remaining[0] });
                remaining = remaining.slice(1);
                continue;
            }

            remaining = remaining.slice(match[0].length);
        }

        return tokens;
    }

    setActiveTab(tabName) {
        this.currentDetailTab = tabName; // Remember current tab
        
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        this.tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}Tab`);
        });
    }

    async copyToClipboard(btn) {
        const targetId = btn.dataset.target;
        const codeEl = document.getElementById(targetId);
        const text = codeEl.textContent;

        try {
            await navigator.clipboard.writeText(text);
            
            // Show feedback
            const originalText = btn.innerHTML;
            btn.classList.add('copied');
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                Copied!
            `;

            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = originalText;
            }, 2000);
        } catch (error) {
            console.error('[GraphQL Inspector] Failed to copy:', error);
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredRequests.length / this.itemsPerPage) || 1;
        
        this.prevPageBtn.disabled = this.currentPage <= 1;
        this.nextPageBtn.disabled = this.currentPage >= totalPages;
        this.pageInfoEl.textContent = `Page ${this.currentPage} of ${totalPages}`;
        
        // Show/hide pagination
        this.paginationEl.style.display = totalPages > 1 ? 'flex' : 'none';
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredRequests.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderRequestList();
            this.updatePagination();
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GraphQLInspector();
});
