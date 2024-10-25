"use strict";

/*
 * Created with @iobroker/create-adapter v2.6.3
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

// Load your modules here, e.g.:
const paperlesscommunicationClass = require("./lib/modules/paperlessCommunication");
const schedule = require("node-schedule");

class PaperlessNgx extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "paperless-ngx",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));

		this.cronJobs = {};
		this.cronJobIds = {
			refreshCycle: "refreshCycle"
		};
		this.isUnloaded = false;

		this.currentStep = "info.currentStep";
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.paperlessCommunication = new paperlesscommunicationClass(this);
		if(await this.paperlessCommunication.checkConnection()){
			// Subscribe internal writefunctions
			this.subscribeStatesAsync("search.*.query*");
			this.subscribeStatesAsync("control.requestTrigger");

			// Reset the connection indicator during startup
			this.setState("info.connection", true, true);

			await this.paperlessCommunication.readActualData();
			await this.setIdle();

			this.cronJobs[this.cronJobIds.refreshCycle] = schedule.scheduleJob(this.config.refreshCycle,this.readActualDataCyclic.bind(this));
		}
		else{
			this.log.error("No active connection to paperless API");
		}
	}

	async readActualDataCyclic(){
		await this.paperlessCommunication?.readActualData();
		await this.setIdle();
	}

	clearAllSchedules(){
		for(const cronJob in this.cronJobs)
		{
			schedule.cancelJob(this.cronJobs[cronJob]);
			delete this.cronJobs[cronJob];
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
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
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	async onStateChange(id, state) {
		if (state) {
			// The state was changed
			// this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
			// just handle statechanges without ack
			if(!state.ack){
				// Request the actual Data
				if(id.indexOf("control.requestTrigger") !== -1){
					await this.paperlessCommunication?.readActualData();
					this.setState(id,false,true);
					await this.setState(this.currentStep,"idle",true);
				}
				// send search query
				else{
					// Query for global search
					if(id.indexOf("global") !== -1){
						await this.paperlessCommunication?.sendGlobalSearchQuery(state.val);
						await this.setIdle();
					}
					// Query for documents search
					else if(id.indexOf("documents") !== -1){
						if(id.endsWith("query")){
							const tags = await this.getStateAsync(`${this.namespace}.search.documents.queryTags`);
							const allTags = await this.getStateAsync(`${this.namespace}.search.documents.queryAllTags`);
							await this.paperlessCommunication?.sendDocumentsSearchQuery(state.val,tags?.val,allTags?.val);
							await this.setIdle();
						}
						if(id.endsWith("queryTags")){
							const query = await this.getStateAsync(`${this.namespace}.search.documents.query`);
							const allTags = await this.getStateAsync(`${this.namespace}.search.documents.queryAllTags`);
							await this.paperlessCommunication?.sendDocumentsSearchQuery(query?.val,state.val,allTags?.val);
							await this.setIdle();
						}
						if(id.endsWith("queryAllTags")){
							const query = await this.getStateAsync(`${this.namespace}.search.documents.query`);
							const tags = await this.getStateAsync(`${this.namespace}.search.documents.queryTags`);
							await this.paperlessCommunication?.sendDocumentsSearchQuery(query?.val,tags?.val,state.val);
							await this.setIdle();
						}
					}
					await this.setState(id,state.val,true);
				}
			}
		} else {
			// The state was deleted
			// this.log.info(`state ${id} deleted`);
		}
	}

	inProgress(){
		let inProgress = false;
		for(const progress in this.paperlessCommunication?.inProgress){
			if(this.paperlessCommunication?.inProgress[progress]){
				inProgress = true;
				break;
			}
		}
		return inProgress;
	}

	async setIdle(){
		if(!this.inProgress()){
			await this.setState(this.currentStep,"idle",true);
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
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new PaperlessNgx(options);
} else {
	// otherwise start the instance directly
	new PaperlessNgx();
}