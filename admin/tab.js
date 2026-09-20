'use strict';

/* global document, window */

(() => {
    const adapterName = 'paperless-ngx';
    const fieldsForDocuments = new Set([
        'id',
        'title',
        'created',
        'modified',
        'added',
        'correspondent',
        'document_type',
        'tags',
        'archive_serial_number',
        'links.preview',
        'links.download',
    ]);
    const fieldsForDirectory = new Set(['id', 'name', 'username', 'color', 'document_count', 'slug']);
    const strings = {
        de: {
            home: 'Startseite',
            documents: 'Dokumente',
            tags: 'Tags',
            correspondents: 'Korrespondenten',
            'document-types': 'Dokumenttypen',
            users: 'Benutzer',
            overview: 'Übersicht deiner Paperless-ngx-Instanz',
            globalResults: 'Suchergebnisse',
            globalSearchHint: 'Ergebnisse aus Dokumenten, Tags und Metadaten',
            documentSearchHint: 'Durchsuche Paperless und filtere nach Tags',
            welcome: 'Dein Dokumentenarchiv auf einen Blick.',
            totalDocuments: 'Dokumente insgesamt',
            resultCount: 'Suchtreffer',
            tagCount: 'Tags',
            correspondentCount: 'Korrespondenten',
            typeCount: 'Dokumenttypen',
            recentDocuments: 'Zuletzt gefundene Dokumente',
            quickAccess: 'Schnellzugriff',
            searchDocuments: 'Dokumente durchsuchen',
            searchDescription: 'Mit Volltext und Tag-Filtern suchen',
            refresh: 'Daten aktualisieren',
            openPaperless: 'Paperless öffnen',
            includeTags: 'Diese Tags müssen enthalten sein',
            excludeTags: 'Diese Tags ausschließen',
            allTags: 'Alle ausgewählten Tags müssen zutreffen',
            search: 'Suchen',
            queryPlaceholder: 'Titel, Inhalt oder Korrespondent suchen…',
            searchPrompt: 'Gib einen Suchbegriff ein, um Dokumente zu finden.',
            results: 'Treffer',
            title: 'Dokument',
            correspondent: 'Korrespondent',
            documentType: 'Dokumenttyp',
            date: 'Datum',
            actions: 'Aktionen',
            open: 'Ansehen',
            download: 'Download',
            noResults: 'Keine Dokumente gefunden.',
            notLoaded:
                'Diese Daten sind nicht im Adapter geladen. Stelle den Datensatz in der Adapterkonfiguration auf „Detailed“ und aktualisiere die Daten.',
            noEntries: 'Keine Einträge verfügbar.',
            filter: 'Einträge filtern…',
            count: 'Einträge',
            refreshStarted: 'Aktualisierung gestartet…',
            searchStarted: 'Paperless-Suche läuft…',
            connected: 'Verbunden',
            disconnected: 'Nicht verbunden',
            connecting: 'Verbinde…',
            loading: 'Paperless wird geladen…',
            loadingInstances: 'Keine Paperless-ngx-Instanz gefunden.',
            busy: 'Der Adapter arbeitet bereits. Bitte warte kurz und versuche es erneut.',
            emptySearch: 'Bitte gib zuerst einen Suchbegriff ein.',
            refreshDone: 'Daten wurden aktualisiert.',
            searchDone: 'Suche abgeschlossen.',
            apiUnavailable: 'Paperless ist nicht erreichbar. Prüfe den Verbindungsstatus des Adapters.',
            reload: 'Neu laden',
            currentStep: 'Status',
            enabled: 'aktiv',
            unavailableCount: 'Nicht geladen',
            previous: 'Zurück',
            next: 'Weiter',
            page: 'Seite',
        },
        en: {
            home: 'Home',
            documents: 'Documents',
            tags: 'Tags',
            correspondents: 'Correspondents',
            'document-types': 'Document types',
            users: 'Users',
            overview: 'Your Paperless-ngx instance at a glance',
            globalResults: 'Search results',
            globalSearchHint: 'Results from documents, tags, and metadata',
            documentSearchHint: 'Search Paperless and filter by tags',
            welcome: 'Your document archive at a glance.',
            totalDocuments: 'Documents total',
            resultCount: 'Search results',
            tagCount: 'Tags',
            correspondentCount: 'Correspondents',
            typeCount: 'Document types',
            recentDocuments: 'Recently found documents',
            quickAccess: 'Quick access',
            searchDocuments: 'Search documents',
            searchDescription: 'Search full text and filter by tags',
            refresh: 'Refresh data',
            openPaperless: 'Open Paperless',
            includeTags: 'Documents must contain these tags',
            excludeTags: 'Exclude these tags',
            allTags: 'All selected tags must match',
            search: 'Search',
            queryPlaceholder: 'Search title, content, or correspondent…',
            searchPrompt: 'Enter a search term to find documents.',
            results: 'Results',
            title: 'Document',
            correspondent: 'Correspondent',
            documentType: 'Document type',
            date: 'Date',
            actions: 'Actions',
            open: 'View',
            download: 'Download',
            noResults: 'No documents found.',
            notLoaded:
                'This data is not loaded by the adapter. Set this data set to “Detailed” in the adapter configuration and refresh.',
            noEntries: 'No entries available.',
            filter: 'Filter entries…',
            count: 'Entries',
            refreshStarted: 'Refreshing data…',
            searchStarted: 'Searching Paperless…',
            connected: 'Connected',
            disconnected: 'Disconnected',
            connecting: 'Connecting…',
            loading: 'Loading Paperless…',
            loadingInstances: 'No Paperless-ngx instance found.',
            busy: 'The adapter is busy. Wait a moment and try again.',
            emptySearch: 'Enter a search term first.',
            refreshDone: 'Data refreshed.',
            searchDone: 'Search completed.',
            apiUnavailable: 'Paperless is unavailable. Check the adapter connection status.',
            reload: 'Reload',
            currentStep: 'Status',
            enabled: 'active',
            unavailableCount: 'Not loaded',
            previous: 'Previous',
            next: 'Next',
            page: 'Page',
        },
    };

    const language = (navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en';
    const t = key => strings[language][key] || strings.en[key] || key;
    const pageContent = document.getElementById('page-content');
    const connectionPill = document.getElementById('connection-pill');
    const connectionText = document.getElementById('connection-text');
    const currentStepNode = document.getElementById('current-step');
    const toastNode = document.getElementById('toast');
    const instanceSelect = document.getElementById('instance-select');
    const paperlessLink = document.getElementById('paperless-link');
    const numberFormat = new Intl.NumberFormat(language);
    const socket = window.io ? window.io.connect(window.location.origin) : null;

    let namespace = '';
    let baseUrl = '';
    let instances = [];
    let activeView = 'home';
    let data = { counts: {}, tags: [], correspondents: [], documentTypes: [], users: [], documents: [], global: {} };
    let currentQuery = '';
    let currentGlobalQuery = '';
    let selectedTags = [];
    let selectedBlockedTags = [];
    let allTags = true;
    let documentPage = 0;
    let toastTimer;
    let suppressStateReload = false;
    let watchedNamespace = '';

    function node(tag, className, text) {
        const item = document.createElement(tag);
        if (className) {
            item.className = className;
        }
        if (text !== undefined && text !== null) {
            item.textContent = String(text);
        }
        return item;
    }

    function showToast(message, kind = 'success') {
        window.clearTimeout(toastTimer);
        toastNode.textContent = message;
        toastNode.dataset.kind = kind;
        toastNode.hidden = false;
        toastTimer = window.setTimeout(() => {
            toastNode.hidden = true;
        }, 4200);
    }

    function socketCall(event, ...args) {
        return new Promise((resolve, reject) => {
            if (!socket) {
                reject(new Error('ioBroker socket.io konnte nicht geladen werden.'));
                return;
            }
            const timeout = window.setTimeout(() => reject(new Error(`Socket-Aufruf ${event} timed out`)), 30000);
            const callback = (...values) => {
                window.clearTimeout(timeout);
                if (values.length > 1) {
                    if (values[0]) {
                        reject(values[0] instanceof Error ? values[0] : new Error(String(values[0])));
                    } else {
                        resolve(values[1]);
                    }
                    return;
                }
                const value = values[0];
                if (value && typeof value === 'object' && value.error && value.ok === false) {
                    resolve(value);
                } else {
                    resolve(value);
                }
            };
            socket.emit(event, ...args, callback);
        });
    }

    function sendTo(instance, command, message = {}) {
        return socketCall('sendTo', instance, command, message).then(result => {
            if (result && typeof result === 'object' && result.result?.ok !== undefined) {
                return result.result;
            }
            return result;
        });
    }

    function postLoaded() {
        if (window.parent !== window) {
            try {
                window.parent.postMessage('iobLoaded', '*');
            } catch {
                // The tab remains usable even when the Admin frame blocks messages.
            }
        }
    }

    function stateValue(states, id) {
        const state = states && states[id];
        return state && Object.prototype.hasOwnProperty.call(state, 'val') ? state.val : undefined;
    }

    async function readBranch(path, fields) {
        const prefix = `${namespace}.${path}`;
        const view = await socketCall('getObjectView', 'system', 'state', {
            startkey: `${prefix}.`,
            endkey: `${prefix}.\u9999`,
        });
        const rows = view && Array.isArray(view.rows) ? view.rows : [];
        const ids = rows
            .map(row => row.id)
            .filter(id => {
                const relative = id.slice(prefix.length + 1);
                const fieldStart = relative.indexOf('.');
                return fieldStart !== -1 && fields.has(relative.slice(fieldStart + 1));
            });
        if (!ids.length) {
            return {};
        }
        return (await socketCall('getStates', ids)) || {};
    }

    function entitiesFromStates(states, prefix) {
        const entities = new Map();
        for (const [id, state] of Object.entries(states || {})) {
            const relative = id.slice(`${prefix}.`.length);
            const separator = relative.indexOf('.');
            if (separator === -1) {
                continue;
            }
            const key = relative.slice(0, separator);
            const field = relative.slice(separator + 1);
            if (!entities.has(key)) {
                entities.set(key, { key });
            }
            entities.get(key)[field] = state?.val;
        }
        return [...entities.values()].sort((a, b) => Number(a.id || a.key) - Number(b.id || b.key));
    }

    function cleanValue(value) {
        if (typeof value !== 'string') {
            return value;
        }
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    async function loadData() {
        if (!namespace) {
            return;
        }
        const countIds = [
            `${namespace}.documents.basic.count`,
            `${namespace}.tags.basic.count`,
            `${namespace}.correspondents.basic.count`,
            `${namespace}.document_types.basic.count`,
            `${namespace}.users.basic.count`,
            `${namespace}.search.documents.results.count`,
            `${namespace}.search.documents.query`,
            `${namespace}.search.global.results.total`,
            `${namespace}.search.global.query`,
        ];
        const [counts, tags, correspondents, documentTypes, users, documentStates] = await Promise.all([
            socketCall('getStates', countIds),
            readBranch('tags.detailed', fieldsForDirectory),
            readBranch('correspondents.detailed', fieldsForDirectory),
            readBranch('document_types.detailed', fieldsForDirectory),
            readBranch('users.detailed', fieldsForDirectory),
            readBranch('search.documents.results.documents', fieldsForDocuments),
        ]);
        const tagsPrefix = `${namespace}.tags.detailed`;
        const correspondentsPrefix = `${namespace}.correspondents.detailed`;
        const typesPrefix = `${namespace}.document_types.detailed`;
        const usersPrefix = `${namespace}.users.detailed`;
        const documentsPrefix = `${namespace}.search.documents.results.documents`;
        data = {
            counts: {
                documents: stateValue(counts, `${namespace}.documents.basic.count`),
                tags: stateValue(counts, `${namespace}.tags.basic.count`),
                correspondents: stateValue(counts, `${namespace}.correspondents.basic.count`),
                documentTypes: stateValue(counts, `${namespace}.document_types.basic.count`),
                users: stateValue(counts, `${namespace}.users.basic.count`),
                results: stateValue(counts, `${namespace}.search.documents.results.count`) || 0,
                globalResults: stateValue(counts, `${namespace}.search.global.results.total`) || 0,
            },
            tags: entitiesFromStates(tags, tagsPrefix),
            correspondents: entitiesFromStates(correspondents, correspondentsPrefix),
            documentTypes: entitiesFromStates(documentTypes, typesPrefix),
            users: entitiesFromStates(users, usersPrefix),
            documents: entitiesFromStates(documentStates, documentsPrefix).map(document => ({
                ...document,
                tags: cleanValue(document.tags) || [],
            })),
        };
        data.documents.sort((a, b) =>
            String(b.created || b.added || '').localeCompare(String(a.created || a.added || '')),
        );
        currentQuery = String(stateValue(counts, `${namespace}.search.documents.query`) || currentQuery || '');
        currentGlobalQuery = String(stateValue(counts, `${namespace}.search.global.query`) || currentGlobalQuery || '');
        const count = data.tags.length;
        document.getElementById('nav-tags-count').textContent = count ? numberFormat.format(count) : '';
    }

    async function loadGlobalResults() {
        if (!namespace) {
            return;
        }
        const [countStates, documentStates, tagStates, correspondentStates, typeStates, userStates] = await Promise.all(
            [
                socketCall('getStates', [
                    `${namespace}.search.global.results.total`,
                    `${namespace}.search.global.query`,
                ]),
                readBranch('search.global.results.documents', fieldsForDocuments),
                readBranch('search.global.results.tags', fieldsForDirectory),
                readBranch('search.global.results.correspondents', fieldsForDirectory),
                readBranch('search.global.results.document_types', fieldsForDirectory),
                readBranch('search.global.results.users', fieldsForDirectory),
            ],
        );
        const documentsPrefix = `${namespace}.search.global.results.documents`;
        const tagPrefix = `${namespace}.search.global.results.tags`;
        const correspondentPrefix = `${namespace}.search.global.results.correspondents`;
        const typePrefix = `${namespace}.search.global.results.document_types`;
        const userPrefix = `${namespace}.search.global.results.users`;
        data.global = {
            total: stateValue(countStates, `${namespace}.search.global.results.total`) || 0,
            documents: entitiesFromStates(documentStates, documentsPrefix).map(document => ({
                ...document,
                tags: cleanValue(document.tags) || [],
            })),
            tags: entitiesFromStates(tagStates, tagPrefix),
            correspondents: entitiesFromStates(correspondentStates, correspondentPrefix),
            documentTypes: entitiesFromStates(typeStates, typePrefix),
            users: entitiesFromStates(userStates, userPrefix),
        };
    }

    function showConnection(connected) {
        connectionPill.dataset.connected = connected ? 'true' : 'false';
        connectionText.textContent = connected ? t('connected') : t('disconnected');
    }

    async function refreshInfo() {
        if (!namespace) {
            return;
        }
        const result = await sendTo(namespace, 'dashboardInfo');
        if (result && result.ok) {
            baseUrl = result.baseUrl || '';
            paperlessLink.href = baseUrl || '#';
            paperlessLink.hidden = !baseUrl;
            showConnection(Boolean(result.connection));
            currentStepNode.textContent = result.currentStep || 'idle';
        }
    }

    function watchInstanceStates() {
        if (watchedNamespace) {
            const oldIds = [
                `${watchedNamespace}.info.connection`,
                `${watchedNamespace}.info.currentStep`,
                `${watchedNamespace}.search.documents.results.count`,
            ];
            socket.emit('unsubscribeStates', oldIds, () => undefined);
        }
        watchedNamespace = namespace;
        const ids = [
            `${namespace}.info.connection`,
            `${namespace}.info.currentStep`,
            `${namespace}.search.documents.results.count`,
        ];
        socket.emit('subscribeStates', ids, () => undefined);
    }

    function setView(view) {
        activeView = view;
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        render();
    }

    function pageHeading(title, subtitle, actions) {
        const heading = node('div', 'page-heading');
        const copy = node('div', 'heading-copy');
        copy.append(node('h1', '', title), node('p', '', subtitle));
        heading.append(copy);
        if (actions) {
            heading.append(actions);
        }
        return heading;
    }

    function makeActions(openLink = false) {
        const actions = node('div', 'page-actions');
        if (openLink && baseUrl) {
            const link = node('a', 'button');
            link.href = baseUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.append(node('span', 'button-icon', '↗'), document.createTextNode(t('openPaperless')));
            actions.append(link);
        }
        return actions;
    }

    function statCard(label, value, detail) {
        const card = node('article', 'stat-card');
        card.append(node('div', 'stat-label', label), node('div', 'stat-value', value ?? t('unavailableCount')));
        if (detail) {
            card.append(node('div', 'stat-detail', detail));
        }
        return card;
    }

    function byId(items) {
        const lookup = new Map();
        for (const item of items || []) {
            if (item.id !== undefined) {
                lookup.set(String(item.id), item.name || String(item.id));
            }
            if (item.key !== undefined) {
                lookup.set(String(Number(item.key)), item.name || String(item.key));
            }
        }
        return lookup;
    }

    function renderHome() {
        pageContent.replaceChildren();
        pageContent.append(pageHeading(t('home'), t('overview'), makeActions(true)));
        const connected = connectionPill.dataset.connected === 'true';
        const welcome = node('div', 'welcome-strip');
        welcome.append(
            document.createTextNode(connected ? '● ' : '○ '),
            node('strong', '', connected ? t('connected') : t('disconnected')),
            document.createTextNode(` · ${t('welcome')}`),
        );
        pageContent.append(welcome);

        const stats = node('div', 'stats-grid');
        stats.append(
            statCard(t('totalDocuments'), data.counts.documents, t('documents')),
            statCard(t('resultCount'), data.counts.results, t('documents')),
            statCard(t('tagCount'), data.counts.tags, t('tags')),
            statCard(t('correspondentCount'), data.counts.correspondents, t('correspondents')),
        );
        pageContent.append(stats);

        const grid = node('div', 'dashboard-grid');
        const recent = node('section', 'panel');
        const recentHeading = node('div', 'panel-heading');
        recentHeading.append(
            node('h2', '', t('recentDocuments')),
            node('small', '', `${numberFormat.format(data.documents.length)} ${t('results').toLowerCase()}`),
        );
        recent.append(recentHeading);
        const recentBody = node('div', 'panel-body');
        const documents = data.documents.slice(0, 7);
        if (documents.length) {
            renderDocumentTable(recentBody, documents, false);
        } else {
            recentBody.append(emptyState(t('searchPrompt'), '⌕'));
        }
        recent.append(recentBody);

        const quick = node('section', 'panel');
        quick.append(node('div', 'panel-heading', t('quickAccess')));
        const quickBody = node('div', 'panel-body');
        const links = node('div', 'quick-links');
        const searchLink = node('button', 'quick-link');
        searchLink.type = 'button';
        searchLink.append(node('span', 'quick-link-icon', '⌕'));
        const searchCopy = node('span');
        searchCopy.append(node('strong', '', t('searchDocuments')), node('span', '', t('searchDescription')));
        searchLink.append(searchCopy);
        searchLink.addEventListener('click', () => setView('documents'));
        links.append(searchLink);
        const refreshLink = node('button', 'quick-link');
        refreshLink.type = 'button';
        refreshLink.append(node('span', 'quick-link-icon', '⟳'));
        const refreshCopy = node('span');
        refreshCopy.append(node('strong', '', t('refresh')), node('span', '', currentStepNode.textContent || 'idle'));
        refreshLink.append(refreshCopy);
        refreshLink.addEventListener('click', refreshData);
        links.append(refreshLink);
        if (baseUrl) {
            const paperlessAction = node('a', 'quick-link');
            paperlessAction.href = baseUrl;
            paperlessAction.target = '_blank';
            paperlessAction.rel = 'noopener noreferrer';
            paperlessAction.append(node('span', 'quick-link-icon', '↗'));
            const paperlessCopy = node('span');
            paperlessCopy.append(node('strong', '', t('openPaperless')), node('span', '', baseUrl));
            paperlessAction.append(paperlessCopy);
            links.append(paperlessAction);
        }
        quickBody.append(links);
        quick.append(quickBody);
        grid.append(recent, quick);
        pageContent.append(grid);
    }

    function emptyState(message, symbol = '▤') {
        const empty = node('div', 'empty-state');
        empty.append(node('span', 'empty-icon', symbol), node('strong', '', message));
        return empty;
    }

    function formatDate(value) {
        if (!value) {
            return '–';
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? String(value)
            : date.toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function tagsForDocument(value, lookup) {
        const values = Array.isArray(value) ? value : [];
        return values.map(tag => lookup.get(String(tag)) || String(tag)).filter(Boolean);
    }

    function renderDocumentTable(container, documents, paginate = true) {
        const correspondentLookup = byId([...(data.correspondents || []), ...(data.global?.correspondents || [])]);
        const typeLookup = byId([...(data.documentTypes || []), ...(data.global?.documentTypes || [])]);
        const tagLookup = byId([...(data.tags || []), ...(data.global?.tags || [])]);
        if (!documents.length) {
            container.append(emptyState(t('noResults')));
            return;
        }
        const pageSize = 30;
        const totalPages = Math.max(1, Math.ceil(documents.length / pageSize));
        documentPage = Math.min(documentPage, totalPages - 1);
        const visibleDocuments = paginate
            ? documents.slice(documentPage * pageSize, (documentPage + 1) * pageSize)
            : documents;
        const tableWrap = node('div', 'table-wrap');
        const table = node('table', 'document-table');
        const head = document.createElement('thead');
        const headerRow = document.createElement('tr');
        [t('title'), t('correspondent'), t('documentType'), t('date'), t('actions')].forEach(label =>
            headerRow.append(node('th', '', label)),
        );
        head.append(headerRow);
        const body = document.createElement('tbody');
        for (const item of visibleDocuments) {
            const row = document.createElement('tr');
            const titleCell = document.createElement('td');
            const titleLink = node('a', 'document-title', item.title || `${t('documents')} ${item.id || item.key}`);
            const previewUrl = item['links.preview'];
            titleLink.href = previewUrl || '#';
            titleLink.target = '_blank';
            titleLink.rel = 'noopener noreferrer';
            titleCell.append(titleLink, node('div', 'document-date', `#${item.id || item.key}`));

            const correspondentCell = node('td', '', correspondentLookup.get(String(item.correspondent)) || '–');
            const typeCell = node('td', '', typeLookup.get(String(item.document_type)) || '–');
            const dateCell = node('td', '', formatDate(item.created || item.added));
            const actionsCell = document.createElement('td');
            const actionGroup = node('div', 'row-actions');
            if (previewUrl) {
                const viewLink = node('a', 'row-action', t('open'));
                viewLink.href = previewUrl;
                viewLink.target = '_blank';
                viewLink.rel = 'noopener noreferrer';
                actionGroup.append(viewLink);
            }
            if (item['links.download']) {
                const downloadLink = node('a', 'row-action', t('download'));
                downloadLink.href = item['links.download'];
                downloadLink.target = '_blank';
                downloadLink.rel = 'noopener noreferrer';
                actionGroup.append(downloadLink);
            }
            actionsCell.append(actionGroup);

            const tagsCell = document.createElement('td');
            const tagNames = tagsForDocument(item.tags, tagLookup);
            if (tagNames.length) {
                const tagList = node('div', 'tag-list');
                tagNames.slice(0, 4).forEach(name => tagList.append(node('span', 'tag-chip', name)));
                if (tagNames.length > 4) {
                    tagList.append(node('span', 'tag-chip', `+${tagNames.length - 4}`));
                }
                tagsCell.append(tagList);
            } else {
                tagsCell.textContent = '–';
            }
            titleCell.append(tagsCell);
            row.append(titleCell, correspondentCell, typeCell, dateCell, actionsCell);
            body.append(row);
        }
        table.append(head, body);
        tableWrap.append(table);
        container.append(tableWrap);
        if (paginate && totalPages > 1) {
            const pager = node('div', 'result-toolbar');
            pager.append(node('span', '', `${t('page')} ${documentPage + 1} / ${totalPages}`));
            const controls = node('div', 'row-actions');
            const previous = node('button', 'button', t('previous'));
            previous.type = 'button';
            previous.disabled = documentPage === 0;
            previous.addEventListener('click', () => {
                documentPage -= 1;
                render();
            });
            const next = node('button', 'button', t('next'));
            next.type = 'button';
            next.disabled = documentPage >= totalPages - 1;
            next.addEventListener('click', () => {
                documentPage += 1;
                render();
            });
            controls.append(previous, next);
            pager.append(controls);
            container.append(pager);
        }
    }

    function makeTagSelect(label, options, selected) {
        const group = node('div', 'filter-group');
        group.append(node('label', '', label));
        const select = document.createElement('select');
        select.multiple = true;
        select.setAttribute('aria-label', label);
        select.disabled = options.length === 0;
        select.size = Math.min(6, Math.max(3, options.length));
        for (const option of options) {
            const entry = node('option', '', option.name || option.id || option.key);
            entry.value = String(option.id || Number(option.key));
            entry.selected = selected.includes(entry.value);
            select.append(entry);
        }
        group.append(select);
        return { group, select };
    }

    async function runSearch(queryInput, button) {
        const query = queryInput.value.trim();
        if (!query) {
            showToast(t('emptySearch'), 'error');
            queryInput.focus();
            return;
        }
        const originalLabel = button.textContent;
        button.disabled = true;
        button.textContent = t('searchStarted');
        suppressStateReload = true;
        try {
            const result = await sendTo(namespace, 'dashboardSearch', {
                query,
                tags: selectedTags,
                blockedTags: selectedBlockedTags,
                allTags,
            });
            if (!result || result.ok !== true) {
                throw new Error(result?.busy ? t('busy') : result?.error || t('apiUnavailable'));
            }
            currentQuery = query;
            documentPage = 0;
            await loadData();
            await refreshInfo();
            render();
            showToast(`${t('searchDone')} ${numberFormat.format(result.count || 0)} ${t('results').toLowerCase()}.`);
        } catch (error) {
            showToast(error.message || t('apiUnavailable'), 'error');
        } finally {
            suppressStateReload = false;
            button.disabled = false;
            button.textContent = originalLabel || t('search');
        }
    }

    async function runGlobalSearch(query) {
        const searchTerm = String(query || '').trim();
        if (!searchTerm) {
            showToast(t('emptySearch'), 'error');
            return;
        }
        activeView = 'global';
        pageContent.replaceChildren(emptyState(t('searchStarted'), '⌕'));
        try {
            const result = await sendTo(namespace, 'dashboardGlobalSearch', { query: searchTerm });
            if (!result || result.ok !== true) {
                throw new Error(result?.busy ? t('busy') : result?.error || t('apiUnavailable'));
            }
            currentGlobalQuery = searchTerm;
            await loadGlobalResults();
            await refreshInfo();
            render();
            showToast(`${t('searchDone')} ${numberFormat.format(result.count || 0)} ${t('results').toLowerCase()}.`);
        } catch (error) {
            showToast(error.message || t('apiUnavailable'), 'error');
            render();
        }
    }

    function renderDocuments() {
        pageContent.replaceChildren();
        pageContent.append(pageHeading(t('documents'), t('documentSearchHint'), makeActions(true)));
        const layout = node('div', 'search-layout');
        const filters = node('section', 'panel filter-panel');
        filters.append(node('h2', '', language === 'de' ? 'Filter' : 'Filters'));
        const queryGroup = node('div', 'filter-group filter-query');
        queryGroup.append(node('label', '', language === 'de' ? 'Suchbegriff' : 'Search term'));
        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.className = 'filter-query-input';
        searchInput.placeholder = t('queryPlaceholder');
        searchInput.value = currentQuery;
        searchInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchButton.click();
            }
        });
        queryGroup.append(searchInput);
        const include = makeTagSelect(t('includeTags'), data.tags, selectedTags);
        include.select.addEventListener('change', () => {
            selectedTags = [...include.select.selectedOptions].map(option => option.value);
        });
        const exclude = makeTagSelect(t('excludeTags'), data.tags, selectedBlockedTags);
        exclude.select.addEventListener('change', () => {
            selectedBlockedTags = [...exclude.select.selectedOptions].map(option => option.value);
        });
        filters.append(queryGroup, include.group, exclude.group);
        const allLabel = node('label', 'filter-check');
        const allCheckbox = document.createElement('input');
        allCheckbox.type = 'checkbox';
        allCheckbox.checked = allTags;
        allCheckbox.addEventListener('change', () => {
            allTags = allCheckbox.checked;
        });
        allLabel.append(allCheckbox, document.createTextNode(t('allTags')));
        filters.append(allLabel);
        if (!data.tags.length) {
            filters.append(node('p', 'filter-hint', t('notLoaded')));
        }
        const searchButton = node('button', 'button button-primary');
        searchButton.type = 'button';
        searchButton.append(node('span', 'button-icon', '⌕'), document.createTextNode(t('search')));
        searchButton.addEventListener('click', () => runSearch(searchInput, searchButton));
        filters.append(searchButton);

        const resultsPanel = node('section', 'document-panel');
        const toolbar = node('div', 'result-toolbar');
        const resultLabel = node(
            'strong',
            '',
            `${numberFormat.format(data.counts.results || 0)} ${t('results').toLowerCase()}`,
        );
        const queryLabel = node('span', '', currentQuery ? `“${currentQuery}”` : '');
        toolbar.append(resultLabel, queryLabel);
        resultsPanel.append(toolbar);
        const resultsBody = node('div', 'results-body');
        if (data.documents.length) {
            renderDocumentTable(resultsBody, data.documents);
        } else {
            resultsBody.append(emptyState(currentQuery ? t('noResults') : t('searchPrompt')));
        }
        resultsPanel.append(resultsBody);
        layout.append(filters, resultsPanel);
        pageContent.append(layout);
    }

    function renderGlobalResults() {
        pageContent.replaceChildren();
        pageContent.append(pageHeading(t('globalResults'), t('globalSearchHint'), makeActions(true)));
        const total = Number(data.global?.total || 0);
        const summary = node('div', 'welcome-strip');
        summary.append(
            document.createTextNode(`${numberFormat.format(total)} ${t('results').toLowerCase()} · `),
            node('strong', '', `“${currentGlobalQuery}”`),
        );
        pageContent.append(summary);

        const docsPanel = node('section', 'document-panel');
        const docsHeading = node('div', 'result-toolbar');
        docsHeading.append(
            node('strong', '', `${t('documents')} (${numberFormat.format(data.global?.documents?.length || 0)})`),
            node('span', '', currentGlobalQuery),
        );
        docsPanel.append(docsHeading);
        const docsBody = node('div', 'results-body');
        if (data.global?.documents?.length) {
            renderDocumentTable(docsBody, data.global.documents);
        } else {
            docsBody.append(emptyState(t('noResults')));
        }
        docsPanel.append(docsBody);
        pageContent.append(docsPanel);

        const categories = [
            [t('tags'), data.global?.tags || []],
            [t('correspondents'), data.global?.correspondents || []],
            [t('documentTypes'), data.global?.documentTypes || []],
            [t('users'), data.global?.users || []],
        ].filter(([, entries]) => entries.length);
        if (categories.length) {
            const grid = node('div', 'directory-grid global-categories');
            for (const [title, entries] of categories) {
                const card = node('section', 'panel');
                card.append(node('div', 'panel-heading', `${title} (${numberFormat.format(entries.length)})`));
                const body = node('div', 'panel-body directory-items');
                for (const entry of entries.slice(0, 8)) {
                    body.append(
                        node(
                            'div',
                            'directory-name',
                            entry.name || entry.username || `${title} ${entry.id || entry.key}`,
                        ),
                    );
                }
                if (entries.length > 8) {
                    body.append(node('div', 'directory-meta', `+${entries.length - 8}`));
                }
                card.append(body);
                grid.append(card);
            }
            pageContent.append(grid);
        }
    }

    function renderDirectory(title, subtitle, entries, icon) {
        pageContent.replaceChildren();
        pageContent.append(pageHeading(title, subtitle, makeActions(true)));
        const toolbar = node('div', 'directory-toolbar');
        const filter = document.createElement('input');
        filter.type = 'search';
        filter.placeholder = t('filter');
        filter.setAttribute('aria-label', t('filter'));
        const count = node('span', '', `${numberFormat.format(entries.length)} ${t('count').toLowerCase()}`);
        toolbar.append(filter, count);
        pageContent.append(toolbar);

        const grid = node('div', 'directory-grid');
        const renderEntries = () => {
            grid.replaceChildren();
            const query = filter.value.trim().toLocaleLowerCase(language);
            const visible = entries.filter(entry =>
                String(entry.name || entry.username || entry.key)
                    .toLocaleLowerCase(language)
                    .includes(query),
            );
            count.textContent = `${numberFormat.format(visible.length)} ${t('count').toLowerCase()}`;
            if (!visible.length) {
                grid.append(emptyState(entries.length ? t('noEntries') : t('notLoaded'), icon));
                return;
            }
            for (const entry of visible) {
                const card = node('article', 'directory-card');
                card.append(node('span', 'directory-symbol', icon));
                const copy = node('div');
                copy.append(
                    node('div', 'directory-name', entry.name || entry.username || `${title} ${entry.id || entry.key}`),
                );
                const info = [
                    entry.id && `ID ${entry.id}`,
                    entry.document_count && `${entry.document_count} ${t('documents').toLowerCase()}`,
                    entry.slug,
                ]
                    .filter(Boolean)
                    .join(' · ');
                copy.append(node('div', 'directory-meta', info || 'Paperless-ngx'));
                card.append(copy);
                grid.append(card);
            }
        };
        filter.addEventListener('input', renderEntries);
        renderEntries();
        pageContent.append(grid);
        if (!entries.length) {
            pageContent.append(node('p', 'notice', t('notLoaded')));
        }
    }

    function render() {
        if (activeView === 'home') {
            return renderHome();
        }
        if (activeView === 'global') {
            return renderGlobalResults();
        }
        if (activeView === 'documents') {
            return renderDocuments();
        }
        if (activeView === 'tags') {
            return renderDirectory(t('tags'), t('tagCount'), data.tags, '◇');
        }
        if (activeView === 'correspondents') {
            return renderDirectory(t('correspondents'), t('correspondentCount'), data.correspondents, '♙');
        }
        if (activeView === 'document-types') {
            return renderDirectory(t('documentTypes'), t('typeCount'), data.documentTypes, '#');
        }
        if (activeView === 'users') {
            return renderDirectory(t('users'), t('users'), data.users, '♧');
        }
        renderHome();
    }

    async function refreshData() {
        const button = document.getElementById('refresh-button');
        button.disabled = true;
        showToast(t('refreshStarted'));
        try {
            const result = await sendTo(namespace, 'dashboardRefresh');
            if (!result || result.ok !== true) {
                throw new Error(result?.busy ? t('busy') : result?.error || t('apiUnavailable'));
            }
            await loadData();
            await refreshInfo();
            render();
            showToast(t('refreshDone'));
        } catch (error) {
            showToast(error.message || t('apiUnavailable'), 'error');
        } finally {
            button.disabled = false;
        }
    }

    async function changeInstance(instance) {
        namespace = instance;
        sessionStorage.setItem('paperless-ngx.adminTab.instance', namespace);
        connectionText.textContent = t('connecting');
        connectionPill.dataset.connected = 'false';
        currentStepNode.textContent = '–';
        baseUrl = '';
        paperlessLink.hidden = true;
        selectedTags = [];
        selectedBlockedTags = [];
        currentQuery = '';
        currentGlobalQuery = '';
        watchInstanceStates();
        try {
            await Promise.all([refreshInfo(), loadData()]);
            if (data.counts.globalResults && currentGlobalQuery) {
                await loadGlobalResults();
            }
            render();
        } catch (error) {
            pageContent.replaceChildren(emptyState(error.message || t('apiUnavailable'), '⚠'));
        }
    }

    async function init() {
        if (!socket) {
            pageContent.replaceChildren(emptyState('ioBroker Socket-Verbindung konnte nicht geladen werden.', '⚠'));
            postLoaded();
            return;
        }
        connectionText.textContent = t('connecting');
        try {
            const view = await socketCall('getObjectView', 'system', 'instance', {
                startkey: `system.adapter.${adapterName}.`,
                endkey: `system.adapter.${adapterName}.\u9999`,
            });
            instances = (view?.rows || []).map(row => ({
                namespace: row.id.replace(/^system\.adapter\./, ''),
                number: row.id.slice(`system.adapter.${adapterName}.`.length),
                enabled: row.value?.common?.enabled === true,
            }));
            instances.sort((a, b) => Number(a.number) - Number(b.number));
            if (!instances.length) {
                pageContent.replaceChildren(emptyState(t('loadingInstances'), '⚠'));
                postLoaded();
                return;
            }
            instanceSelect.replaceChildren();
            instances.forEach(instance => {
                const option = node(
                    'option',
                    '',
                    `${adapterName}.${instance.number}${instance.enabled ? '' : ' (deaktiviert)'}`,
                );
                option.value = instance.namespace;
                option.disabled = !instance.enabled;
                instanceSelect.append(option);
            });
            const params = new URLSearchParams(window.location.search);
            const urlInstance = params.get('instance');
            const remembered = sessionStorage.getItem('paperless-ngx.adminTab.instance');
            const selected = [
                urlInstance && (urlInstance.includes('.') ? urlInstance : `${adapterName}.${urlInstance}`),
                remembered,
            ].find(value => value && instances.some(instance => instance.namespace === value));
            const first = selected || instances.find(instance => instance.enabled)?.namespace || instances[0].namespace;
            instanceSelect.value = first;
            await changeInstance(first);
            postLoaded();
        } catch (error) {
            pageContent.replaceChildren(emptyState(error.message || t('apiUnavailable'), '⚠'));
            postLoaded();
        }
    }

    document
        .querySelectorAll('.nav-item[data-view]')
        .forEach(item => item.addEventListener('click', () => setView(item.dataset.view)));
    document.getElementById('refresh-button').addEventListener('click', refreshData);
    instanceSelect.addEventListener('change', () => changeInstance(instanceSelect.value));
    document.getElementById('top-search-form').addEventListener('submit', event => {
        event.preventDefault();
        const value = document.getElementById('top-search').value;
        runGlobalSearch(value);
    });

    if (socket) {
        socket.on('connect', init);
        socket.on('disconnect', () => {
            showConnection(false);
            connectionText.textContent = t('disconnected');
        });
        socket.on('stateChange', (id, state) => {
            if (!namespace || !state) {
                return;
            }
            if (id === `${namespace}.info.connection`) {
                showConnection(state.val === true);
            }
            if (id === `${namespace}.info.currentStep`) {
                currentStepNode.textContent = state.val || 'idle';
            }
            if (id === `${namespace}.search.documents.results.count` && state.ack && !suppressStateReload) {
                loadData()
                    .then(render)
                    .catch(error => showToast(error.message, 'error'));
            }
        });
        if (socket.connected) {
            init();
        }
    }
})();
