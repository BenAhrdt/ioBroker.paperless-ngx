'use strict';

/*
 * Created with @iobroker/create-adapter v2.6.3
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
const paperlesscommunicationClass = require('./lib/modules/paperlessCommunication');
const schedule = require('node-schedule');

class PaperlessNgx extends utils.Adapter {
    /**
     * @param [options] options of the adapter
     */
    constructor(options) {
        super({
            ...options,
            name: 'paperless-ngx',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on('unload', this.onUnload.bind(this));

        this.cronJobs = {};
        this.cronJobIds = {
            refreshCycle: 'refreshCycle',
        };
        this.isUnloaded = false;

        this.currentStep = 'info.currentStep';
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        this.paperlessCommunication = new paperlesscommunicationClass(this);

        // Keep command states subscribed even while Paperless is offline so
        // requests can be acknowledged and report a useful connection error.
        await this.subscribeStatesAsync('search.*.query*');
        await this.subscribeStatesAsync('control.requestTrigger');
        await this.setStateAsync('info.connection', false, true);

        if (await this.paperlessCommunication.checkConnection()) {
            await this.setStateAsync('info.connection', true, true);

            await this.paperlessCommunication.readActualData();
            await this.setIdle();
        } else {
            this.log.error('No active connection to paperless API');
            await this.setIdle();
        }

        // Keep retrying on the configured cycle when Paperless was offline
        // during startup. The cycle checks the connection before reading.
        this.cronJobs[this.cronJobIds.refreshCycle] = schedule.scheduleJob(
            this.config.refreshCycle,
            this.readActualDataCyclic.bind(this),
        );
    }

    async readActualDataCyclic() {
        const connected = await this.paperlessCommunication?.checkConnection();
        await this.setStateAsync('info.connection', connected === true, true);
        if (connected) {
            await this.paperlessCommunication?.readActualData();
        }
        await this.setIdle();
    }

    clearAllSchedules() {
        for (const cronJob in this.cronJobs) {
            schedule.cancelJob(this.cronJobs[cronJob]);
            delete this.cronJobs[cronJob];
        }
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback function wich is called after shutdown adapter
     */
    onUnload(callback) {
        try {
            this.clearAllSchedules();
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

            callback();
        } catch (e) {
            this.log.error(e);
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    // 	if (obj) {
    // 		// The object was changed
    // 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    // 	} else {
    // 		// The object was deleted
    // 		this.log.info(`object ${id} deleted`);
    // 	}
    // }

    /**
     * Is called if a subscribed state changes
     *
     * @param id id of the changed state
     * @param state state (val & ack) of the changed state-id
     */
    async onStateChange(id, state) {
        if (!state || state.ack) {
            return;
        }

        try {
            if (id.endsWith('control.requestTrigger')) {
                const connected = await this.paperlessCommunication?.checkConnection();
                await this.setStateAsync('info.connection', connected === true, true);
                if (connected) {
                    await this.paperlessCommunication?.readActualData();
                }
                await this.setState(id, false, true);
                await this.setIdle();
                return;
            }

            if (id.includes('search.global.query')) {
                await this.paperlessCommunication?.sendGlobalSearchQuery(state.val);
                await this.setIdle();
                await this.setState(id, state.val, true);
                return;
            }

            if (!id.includes('search.documents.')) {
                return;
            }

            const query = await this.getStateAsync(`${this.namespace}.search.documents.query`);
            const tags = await this.getStateAsync(`${this.namespace}.search.documents.queryTags`);
            const blockedTags = await this.getStateAsync(`${this.namespace}.search.documents.queryBlockedTags`);
            const allTags = await this.getStateAsync(`${this.namespace}.search.documents.queryAllTags`);
            await this.paperlessCommunication?.sendDocumentsSearchQuery(
                id.endsWith('.query') ? state.val : query?.val,
                id.endsWith('.queryTags') ? state.val : tags?.val,
                id.endsWith('.queryBlockedTags') ? state.val : blockedTags?.val,
                id.endsWith('.queryAllTags') ? state.val : allTags?.val,
            );
            await this.setIdle();
            await this.setState(id, state.val, true);
        } catch (error) {
            this.log.error(`Error handling state ${id}: ${error}`);
            try {
                await this.setState(id, state.val, true);
            } catch (ackError) {
                this.log.error(`Could not acknowledge state ${id}: ${ackError}`);
            }
            await this.setIdle();
        }
    }

    async onMessage(obj) {
        if (!obj || !obj.callback) {
            return;
        }

        try {
            if (obj.command === 'dashboardInfo') {
                const connection = await this.getStateAsync('info.connection');
                const currentStep = await this.getStateAsync(this.currentStep);
                this.sendTo(
                    obj.from,
                    obj.command,
                    {
                        ok: true,
                        baseUrl: this.paperlessCommunication?.address || '',
                        connection: connection?.val === true,
                        currentStep: currentStep?.val || 'idle',
                    },
                    obj.callback,
                );
                return;
            }

            if (obj.command === 'dashboardGlobalSearch') {
                const query = typeof obj.message?.query === 'string' ? obj.message.query : '';
                if (!query.trim()) {
                    this.sendTo(
                        obj.from,
                        obj.command,
                        { ok: false, error: 'Bitte gib einen Suchbegriff ein.' },
                        obj.callback,
                    );
                    return;
                }
                await this.setStateAsync('search.global.query', query, true);
                const result = await this.paperlessCommunication?.sendGlobalSearchQuery(query);
                await this.setIdle();
                this.sendTo(
                    obj.from,
                    obj.command,
                    result || { ok: false, error: 'Adapter is not ready' },
                    obj.callback,
                );
                return;
            }

            if (obj.command === 'dashboardSearch') {
                const message = obj.message || {};
                const normalizeTagIds = value =>
                    (Array.isArray(value) ? value : [])
                        .map(Number)
                        .filter(value => Number.isInteger(value) && value > 0);
                const query = typeof message.query === 'string' ? message.query : '';
                const tags = normalizeTagIds(message.tags);
                const blockedTags = normalizeTagIds(message.blockedTags);
                const allTags = message.allTags !== false;

                await this.setStateAsync('search.documents.query', query, true);
                await this.setStateAsync('search.documents.queryTags', JSON.stringify(tags), true);
                await this.setStateAsync('search.documents.queryBlockedTags', JSON.stringify(blockedTags), true);
                await this.setStateAsync('search.documents.queryAllTags', allTags, true);

                const result = await this.paperlessCommunication?.sendDocumentsSearchQuery(
                    query,
                    tags,
                    blockedTags,
                    allTags,
                );
                await this.setIdle();
                this.sendTo(
                    obj.from,
                    obj.command,
                    result || { ok: false, error: 'Adapter is not ready' },
                    obj.callback,
                );
                return;
            }

            if (obj.command === 'dashboardRefresh') {
                if (this.paperlessCommunication?.inProgress.readData) {
                    this.sendTo(obj.from, obj.command, { ok: false, busy: true }, obj.callback);
                    return;
                }
                const connected = await this.paperlessCommunication?.checkConnection();
                await this.setStateAsync('info.connection', connected === true, true);
                if (!connected) {
                    this.sendTo(
                        obj.from,
                        obj.command,
                        { ok: false, error: 'Paperless is not reachable' },
                        obj.callback,
                    );
                    return;
                }
                await this.paperlessCommunication?.readActualData();
                await this.setIdle();
                this.sendTo(obj.from, obj.command, { ok: true }, obj.callback);
            }
        } catch (error) {
            this.log.error(`Dashboard command ${obj.command} failed: ${error}`);
            this.sendTo(obj.from, obj.command, { ok: false, error: error.message || String(error) }, obj.callback);
        }
    }

    inProgress() {
        let inProgress = false;
        for (const progress in this.paperlessCommunication?.inProgress) {
            if (this.paperlessCommunication?.inProgress[progress]) {
                inProgress = true;
                break;
            }
        }
        return inProgress;
    }

    async setIdle() {
        if (!this.inProgress()) {
            await this.setState(this.currentStep, 'idle', true);
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    // 	if (typeof obj === "object" && obj.message) {
    // 		if (obj.command === "send") {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info("send command");

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    // 		}
    // 	}
    // }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param [options] options of the adapter
     */
    module.exports = options => new PaperlessNgx(options);
} else {
    // otherwise start the instance directly
    new PaperlessNgx();
}
