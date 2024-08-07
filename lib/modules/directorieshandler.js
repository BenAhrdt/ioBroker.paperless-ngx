
class directorieshandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		this.adapterObjects = {};
	}

	async generateRekursivObjects(obj,startDirectory,datainformation){
		const activeFunction = "generateRekursivObjects";
		this.adapter.log.debug(`Function ${activeFunction} started. Startdirectory: ${startDirectory}`);
		try{
			// just proceed with ojects
			if(typeof obj === "object"){
				// go to every element in the object
				for(const elementName in obj){
					// Skip empty Objects
					if((typeof obj[elementName] === "object" && !obj[elementName]) || obj[elementName] === null){
						continue;
					}
					// Check the the elementname is not in ignored object
					// Check if the element is an object

					if(typeof obj[elementName] === "object" && (!obj[elementName].additionalObjectinformations || obj[elementName].additionalObjectinformations.type !== "state")){
						// Ask for filled Object, or arrys with entries
						if(Object.keys(obj[elementName]).length !== 0){
							// Generate the desired id
							let objectId = `${startDirectory}.${elementName}`;
							if(objectId.indexOf(".") === 0){
								objectId = objectId.substring(1,objectId.length);
							}
							// Extend Object
							this.adapter.log.silly(`object ${objectId} will be extend`);
							datainformation.present[objectId] = {};
							await this.adapter.extendObjectAsync(objectId,{
								type: obj[elementName].additionalObjectinformations?.type? obj[elementName].additionalObjectinformations.type : "folder",
								common: {
									name: obj[elementName].additionalObjectinformations?.common?.name? obj[elementName].additionalObjectinformations.common.name : elementName,
									icon: obj[elementName].additionalObjectinformations?.common?.icon? obj[elementName].additionalObjectinformations.common.icon : "",
								},
								native: {},
							});
							// Delete AdditionalObjectinformations if they are present
							if(obj[elementName].additionalObjectinformations){
								delete obj[elementName].additionalObjectinformations;
							}
							// Jump into next step (next directory / attribute)
							await this.generateRekursivObjects(obj[elementName],objectId,datainformation);
						}
					}
					else{
						let objectId = `${startDirectory}.${elementName}`;
						if(objectId.indexOf(".") === 0){
							objectId = objectId.substring(1,objectId.length);
						}
						datainformation.present[objectId] = {};
						await this.adapter.extendObjectAsync(objectId,{
							type: "state",
							common: {
								type: obj[elementName].additionalObjectinformations?.common?.type? obj[elementName].additionalObjectinformations.common.type : typeof obj[elementName],
								name: elementName,
								role: obj[elementName].additionalObjectinformations?.common?.role? obj[elementName].additionalObjectinformations.common.role : "value",
								icon: obj[elementName].additionalObjectinformations?.common?.icon? obj[elementName].additionalObjectinformations.common.icon : "",
								read: true,
								write: false
							},
							native: {},
						});
						if(typeof obj[elementName] === "object"){
							obj[elementName] = JSON.stringify(obj[elementName].additionalObjectinformations.objectValue);
						}
						if(obj[elementName] !== undefined){
							// Set State from Objectpath
							await this.adapter.setStateAsync(`${objectId}`,obj[elementName],true);
						}
					}
				}
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
		}
	}

	async getAdapterObjects(){
		this.adapterObjects = await this.adapter.getAdapterObjectsAsync();
	}

	async deleteNotPresentSubfolders(foldertype){
		const activeFunction = "deleteNotPresentSubfolders - " + foldertype.deleteStartDirectory;
		this.adapter.log.debug(`Function ${activeFunction} started.`);
		try{
			for(const adapterObject of Object.values(this.adapterObjects)){
				if(adapterObject._id.indexOf(`${this.adapter.namespace}.${foldertype.deleteStartDirectory}`) === 0){
					const idWithoutNamespace = this.getIdWithoutNamespace(adapterObject._id);
					if(!foldertype.present[idWithoutNamespace]){
						await this.adapter.delObjectAsync(adapterObject._id);
					}
				}
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
		}
	}

	getIdWithoutNamespace(id){
		if(id.indexOf(this.adapter.namespace) === 0){
			return id.substring(this.adapter.namespace.length + 1,id.length);
		}
		else{
			return id;
		}
	}

	async deleteNotPresentSubfolders_old(foldertype){
		const activeFunction = "deleteNotPresentSubfolders - " + foldertype.startDirectory;
		this.adapter.log.debug(`Function ${activeFunction} started.`);
		try{
			for(const adapterObject of Object.values(this.adapterObjects)){
				if(adapterObject._id.indexOf(`${this.adapter.namespace}.${foldertype.startDirectory}.`) === 0){
					const idWithoutStart = adapterObject._id.substring(`${this.adapter.namespace}.${foldertype.startDirectory}.`.length,adapterObject._id.length);
					let firstString = idWithoutStart;
					const indexOfFistDot = idWithoutStart.indexOf(".");
					if(indexOfFistDot !== -1){
						firstString = idWithoutStart.substring(0,indexOfFistDot);
						if(!foldertype.present[firstString]){
							await this.adapter.delObjectAsync(adapterObject._id);
						}
					}
					else{
						if(adapterObject.type === "folder" || foldertype.readOutLevel === 0){
							await this.adapter.delObjectAsync(adapterObject._id);
						}
					}
				}
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
		}
	}
}

module.exports = directorieshandlerClass;