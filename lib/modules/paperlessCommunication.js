const axios = require('axios');
const directorieshandlerClass = require('./directorieshandler');

/**
 * class that handles the communication to the paperless instance
 */
class paperlesscommunicationClass {
    /**
     * @param adapter whole data from the adater (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.config = {
            timeout: 3000,
        };
        if (!adapter.config.useToken) {
            this.config.auth = { username: adapter.config.username, password: adapter.config.password };
        } else {
            this.config.headers = { Authorization: `Token ${adapter.config.token}` };
        }

        this.address = `http://${adapter.config.ipUrl}:${adapter.config.port}`;

        this.directoryhandler = new directorieshandlerClass(this.adapter);

        this.api = {
            address: '/api/',
        };

        this.globalSearch = {
            present: {},
            address: 'search/?query=',
            generateStartDirectory: 'search.global',
            deleteStartDirectory: 'search.global',
            datastructure: {},
            readOutLevel: 1,
        };

        this.documentsSearch = {
            present: {},
            address: 'documents/?',
            generateStartDirectory: 'search.documents',
            deleteStartDirectory: 'search.documents',
            datastructure: {},
            readOutLevel: 1,
        };

        this.tags = {
            present: {},
            address: 'tags/',
            generateStartDirectory: '',
            deleteStartDirectory: 'tags',
            datastructure: {},
            readOutLevel: this.adapter.config.tagsLoglevel,
        };

        this.documents = {
            present: {},
            address: 'documents/',
            generateStartDirectory: '',
            deleteStartDirectory: 'documents',
            datastructure: {},
            readOutLevel: this.adapter.config.documentsLoglevel,
        };

        this.document_types = {
            present: {},
            address: 'document_types/',
            generateStartDirectory: '',
            deleteStartDirectory: 'document_types',
            datastructure: {},
            readOutLevel: this.adapter.config.documentTypesLoglevel,
        };

        this.users = {
            present: {},
            address: 'users/',
            generateStartDirectory: '',
            deleteStartDirectory: 'users',
            datastructure: {},
            readOutLevel: this.adapter.config.usersLoglevel,
        };

        this.correspondents = {
            present: {},
            address: 'correspondents/',
            generateStartDirectory: '',
            deleteStartDirectory: 'correspondents',
            datastructure: {},
            readOutLevel: this.adapter.config.correspondentsLoglevel,
        };

        this.inProgress = {
            readData: false,
            sendGlobalQuery: false,
            sendDocumentsQuery: false,
        };
    }

    /**
     * function to prefix "00" to an index
     *
     * @param surceindex index to expand with "00"
     */
    expandIndex(surceindex) {
        const doubleZero = '00';
        return (doubleZero + surceindex).slice(-3);
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */
    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * checks connection to the paperless instace
     */
    async checkConnection() {
        const activeFunction = 'checkConnection';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            await this.adapter.setState(this.adapter.currentStep, 'check connection', true);
            const erg = await axios.get(this.address + this.api.address + this.documents.address, this.config);
            if (erg.data) {
                return true;
            }
        } catch (error) {
            if (JSON.stringify(error).indexOf('403') !== -1) {
                this.adapter.log.info('Error 403');
                return true;
            }
            this.adapter.log.error(error);
            return false;
        }
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * sending a global query to the paperless instance
     *
     * @param query query, to send
     */
    async sendGlobalSearchQuery(query) {
        if (!this.inProgress.sendGlobalQuery) {
            const activeFunction = `sendGlobalSearchQuery - ${query}`;
            this.adapter.log.debug(`Function ${activeFunction} started.`);
            try {
                await this.adapter.setState(this.adapter.currentStep, 'sending global query', true);
                this.inProgress.sendGlobalQuery = true;
                await this.directoryhandler.getAdapterObjects();
                const erg = await axios.get(
                    `${this.address}${this.api.address}${this.globalSearch.address}${query}`,
                    this.config,
                );
                // delete the present data
                this.globalSearch.present = { 'search.global.query': {} };
                // set the folders and states for the results
                //Assign the Datastructure
                this.globalSearch.datastructure = {
                    results: {},
                };

                // Assign Count
                this.globalSearch.datastructure.results.total = erg.data.total;

                // Assign the whole structure
                for (const element in erg.data) {
                    this.globalSearch.datastructure.results[element] = {};
                    if (typeof erg.data[element] !== 'object') {
                        this.globalSearch.datastructure.results[element] = erg.data[element];
                    } else {
                        for (const elementdata of erg.data[element]) {
                            this.globalSearch.datastructure.results[element][this.expandIndex(elementdata.id)] =
                                elementdata;
                            this.globalSearch.datastructure.results[element][
                                this.expandIndex(elementdata.id)
                            ].additionalObjectinformations = {
                                common: {
                                    name: elementdata.name
                                        ? elementdata.name
                                        : elementdata.title
                                          ? elementdata.title
                                          : this.expandIndex(elementdata.id),
                                },
                            };
                        }
                    }
                }

                // Assign document specific data
                for (const document in this.globalSearch.datastructure.results.documents) {
                    //Assign Links to documentfolder
                    const id = this.globalSearch.datastructure.results.documents[document].id;
                    this.globalSearch.datastructure.results.documents[document].links = {
                        download: {
                            additionalObjectinformations: {
                                type: 'state',
                                common: {
                                    name: 'link to download the document',
                                    type: 'string',
                                    role: 'text.url',
                                },
                                objectValue: `${this.address}${this.api.address}${this.documents.address}${id}/download/`,
                            },
                        },
                        preview: {
                            additionalObjectinformations: {
                                type: 'state',
                                common: {
                                    name: 'link to preview the document',
                                    type: 'string',
                                    role: 'text.url',
                                },
                                objectValue: `${this.address}${this.api.address}${this.documents.address}${id}/preview/`,
                            },
                        },
                        thumbnail: {
                            additionalObjectinformations: {
                                type: 'state',
                                common: {
                                    name: 'link to the tumbnail of the document',
                                    type: 'string',
                                    role: 'text.url',
                                },
                                objectValue: `${this.address}${this.api.address}${this.documents.address}${id}/thumb/`,
                            },
                        },
                    };

                    // Assign the type of tags
                    this.globalSearch.datastructure.results.documents[document].tags = {
                        additionalObjectinformations: {
                            type: 'state',
                            common: {
                                name: 'tags',
                                type: 'array',
                            },
                            objectValue: this.globalSearch.datastructure.results.documents[document].tags,
                        },
                    };
                }

                // Assign Data
                await this.assignData(this.globalSearch);

                // Delete not assigned ids
                await this.directoryhandler.deleteNotPresentSubfolders(this.globalSearch);

                // reset in Progress
                this.inProgress.sendGlobalQuery = false;
            } catch (error) {
                this.inProgress.sendGlobalQuery = false;
                if (JSON.stringify(error).indexOf('403') !== -1) {
                    this.adapter.log.warn(`Send global query is forbidden.`);
                } else {
                    this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
                }
            }
        }
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * sending a document query to the paperless instance
     *
     * @param query query, to send
     * @param tags tags, wich have to be in queried documents
     * @param blockedTags tags, wich not have to be in queried documents
     * @param allTags true => no selection of blocked or specific tags
     */
    async sendDocumentsSearchQuery(query, tags, blockedTags, allTags) {
        if (!this.inProgress.sendDocumentsQuery) {
            const activeFunction = `sendDocumentsSearchQuery - ${query}`;
            this.adapter.log.debug(`Function ${activeFunction} started.`);
            try {
                await this.adapter.setState(this.adapter.currentStep, 'sending documents query', true);
                this.inProgress.sendDocumentsQuery = true;
                await this.directoryhandler.getAdapterObjects();
                let tagsString = '';
                let blockedTagsString = '';
                let holeQuery = '';
                // Zuweisen des Query nur, wenn etwas drin steht
                if (query !== '') {
                    holeQuery = `query=${query}`;
                }
                if (tags) {
                    tags = JSON.parse(tags);
                    if (typeof tags === 'object') {
                        if (tags.length > 0) {
                            for (let i = 0; i < tags.length; i++) {
                                if (tagsString != '') {
                                    tagsString += ',';
                                }
                                tagsString += `${tags[i]}`;
                            }
                            if (allTags) {
                                tagsString = `&tags__id__all=${tagsString}`;
                            } else {
                                tagsString = `&tags__id__in=${tagsString}`;
                            }
                            holeQuery += tagsString;
                        }
                    }
                }
                if (blockedTags) {
                    blockedTags = JSON.parse(blockedTags);
                    if (typeof blockedTags === 'object') {
                        if (blockedTags.length > 0) {
                            for (let i = 0; i < blockedTags.length; i++) {
                                if (blockedTagsString != '') {
                                    blockedTagsString += ',';
                                }
                                blockedTagsString += `${blockedTags[i]}`;
                            }
                            blockedTagsString = `&tags__id__none=${blockedTagsString}`;
                            holeQuery += blockedTagsString;
                        }
                    }
                }
                const sendquery = `${this.address}${this.api.address}${this.documentsSearch.address}${holeQuery}`;
                this.adapter.log.debug(`${sendquery} was sendet to API`);
                let erg = await axios.get(sendquery, this.config);

                // delete the present data
                this.documentsSearch.present = {
                    'search.documents.query': {},
                    'search.documents.queryTags': {},
                    'search.documents.queryBlockedTags': {},
                    'search.documents.queryAllTags': {},
                };
                // set the folders and states for the results
                //Assign the Datastructure
                this.documentsSearch.datastructure = {
                    results: {
                        documents: {},
                    },
                };

                // Assign the count
                this.documentsSearch.datastructure.results.count = erg.data.count;

                // Assign the "all" element
                this.documentsSearch.datastructure.results.all = {
                    additionalObjectinformations: {
                        type: 'state',
                        common: {
                            name: 'all results',
                            type: 'array',
                        },
                        objectValue: erg.data.all,
                    },
                };

                //Assign results for documents
                for (const result of erg.data.results) {
                    this.documentsSearch.datastructure.results.documents[this.expandIndex(result.id)] = result;
                    this.documentsSearch.datastructure.results.documents[
                        this.expandIndex(result.id)
                    ].additionalObjectinformations = {
                        common: {
                            name: result.title,
                        },
                    };
                }
                while (erg.data.next) {
                    erg = await axios.get(erg.data.next, this.config);
                    if (erg.data) {
                        for (const result of erg.data.results) {
                            this.documentsSearch.datastructure.results.documents[this.expandIndex(result.id)] = result;
                            this.documentsSearch.datastructure.results.documents[
                                this.expandIndex(result.id)
                            ].additionalObjectinformations = {
                                common: {
                                    name: result.title,
                                },
                            };
                        }
                    }
                }

                // Assigns for documents
                for (const document in this.documentsSearch.datastructure.results.documents) {
                    //Assign Links to resultfolder
                    const id = this.documentsSearch.datastructure.results.documents[document].id;
                    this.documentsSearch.datastructure.results.documents[document].links = {
                        download: {
                            additionalObjectinformations: {
                                type: 'state',
                                common: {
                                    name: 'link to download the document',
                                    type: 'string',
                                    role: 'text.url',
                                },
                                objectValue: `${this.address}${this.api.address}${this.documents.address}${id}/download/`,
                            },
                        },
                        preview: {
                            additionalObjectinformations: {
                                type: 'state',
                                common: {
                                    name: 'link to preview the document',
                                    type: 'string',
                                    role: 'text.url',
                                },
                                objectValue: `${this.address}${this.api.address}${this.documents.address}${id}/preview/`,
                            },
                        },
                        thumbnail: {
                            additionalObjectinformations: {
                                type: 'state',
                                common: {
                                    name: 'link to the tumbnail of the document',
                                    type: 'string',
                                    role: 'text.url',
                                },
                                objectValue: `${this.address}${this.api.address}${this.documents.address}${id}/thumb/`,
                            },
                        },
                    };

                    // Assign the type of tags
                    this.documentsSearch.datastructure.results.documents[document].tags = {
                        additionalObjectinformations: {
                            type: 'state',
                            common: {
                                name: 'tags',
                                type: 'array',
                            },
                            objectValue: this.documentsSearch.datastructure.results.documents[document].tags,
                        },
                    };
                }

                // Assign Data
                await this.assignData(this.documentsSearch);

                // Delete not assigned ids
                await this.directoryhandler.deleteNotPresentSubfolders(this.documentsSearch);

                // reset in progress
                this.inProgress.sendDocumentsQuery = false;
            } catch (error) {
                this.inProgress.sendDocumentsQuery = false;
                if (JSON.stringify(error).indexOf('403') !== -1) {
                    this.adapter.log.warn(`Send documents query is forbidden.`);
                } else {
                    this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
                }
            }
        }
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * assign data to the internal structur to build rekuirsive object (ids)
     *
     * @param datainformation information about the data from the paperless instance
     */
    async assignData(datainformation) {
        const activeFunction = `assignData  -${datainformation.startDirectory}`;
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            await this.directoryhandler.generateRekursivObjects(
                datainformation.datastructure,
                datainformation.generateStartDirectory,
                datainformation,
            );
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * read actual Data from paperless structure
     */
    async readActualData() {
        if (!this.inProgress.readData) {
            const activeFunction = 'readActualData';
            this.adapter.log.debug(`Function ${activeFunction} started.`);
            try {
                await this.adapter.setState(this.adapter.currentStep, 'reading data', true);
                this.inProgress.readData = true;
                await this.directoryhandler.getAdapterObjects();

                await this.readTags();

                await this.readDocuments();

                await this.readDocumentTypes();

                await this.readUsers();

                await this.readCorrespondents();

                this.inProgress.readData = false;
            } catch (error) {
                this.inProgress.readData = false;
                this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            }
        }
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * read tags from paperless structure
     */
    async readTags() {
        const activeFunction = 'readTags';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            await this.adapter.setState(this.adapter.currentStep, 'reading tags', true);
            if (this.tags.readOutLevel !== 0) {
                let erg = await axios.get(this.address + this.api.address + this.tags.address, this.config);
                if (erg.data) {
                    // delete the present data
                    this.tags.present = {};

                    //Assigns general datastructure
                    this.tags.datastructure = {
                        tags: {
                            additionalObjectinformations: {
                                type: 'channel',
                                common: {
                                    name: 'tags',
                                    icon: 'img/tags.png',
                                },
                            },
                            basic: {},
                            detailed: {},
                        },
                    };

                    //Assign the Basicstructure
                    this.tags.datastructure.tags.basic.count = erg.data.count;

                    // Assign the "all" element
                    this.tags.datastructure.tags.basic.all = {
                        additionalObjectinformations: {
                            type: 'state',
                            common: {
                                name: 'all results',
                                type: 'array',
                            },
                            objectValue: erg.data.all,
                        },
                    };

                    if (this.tags.readOutLevel >= 2) {
                        //Assign Detailedstructure
                        for (const result of erg.data.results) {
                            this.tags.datastructure.tags.detailed[this.expandIndex(result.id)] = result;
                            this.tags.datastructure.tags.detailed[
                                this.expandIndex(result.id)
                            ].additionalObjectinformations = {
                                common: {
                                    name: result.name,
                                },
                            };
                        }
                        while (erg.data.next) {
                            erg = await axios.get(erg.data.next, this.config);
                            if (erg.data) {
                                for (const result of erg.data.results) {
                                    this.tags.datastructure.tags.detailed[this.expandIndex(result.id)] = result;
                                    this.tags.datastructure.tags.detailed[
                                        this.expandIndex(result.id)
                                    ].additionalObjectinformations = {
                                        common: {
                                            name: result.name,
                                        },
                                    };
                                }
                            }
                        }
                    }

                    // Assign Data
                    await this.assignData(this.tags);

                    // Delete not assigned ids
                    await this.directoryhandler.deleteNotPresentSubfolders(this.tags);
                }
            }
            // Delete not assigned ids
            await this.directoryhandler.deleteNotPresentSubfolders(this.tags);
        } catch (error) {
            if (JSON.stringify(error).indexOf('403') !== -1) {
                this.adapter.log.warn(
                    `Read Data ${this.tags.deleteStartDirectory} is forbidden. Please deactivate in the config`,
                );
            } else {
                this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            }
        }
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * read documents from paperless structure
     */
    async readDocuments() {
        const activeFunction = 'readDocuments';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            await this.adapter.setState(this.adapter.currentStep, 'reading documents', true);
            if (this.documents.readOutLevel !== 0) {
                let erg = await axios.get(this.address + this.api.address + this.documents.address, this.config);
                if (erg.data) {
                    // delete the present data
                    this.documents.present = {};

                    //Assigns general datastructure
                    this.documents.datastructure = {
                        documents: {
                            additionalObjectinformations: {
                                type: 'channel',
                                common: {
                                    name: 'documents',
                                    icon: 'img/documents.png',
                                },
                            },
                            basic: {},
                            detailed: {},
                        },
                    };

                    //Assign the Basicstructure
                    this.documents.datastructure.documents.basic.count = erg.data.count;

                    // Assign the "all" element
                    this.documents.datastructure.documents.basic.all = {
                        additionalObjectinformations: {
                            type: 'state',
                            common: {
                                name: 'all results',
                                type: 'array',
                            },
                            objectValue: erg.data.all,
                        },
                    };

                    if (this.documents.readOutLevel >= 2) {
                        //Assign Detailedstructure
                        for (const result of erg.data.results) {
                            this.documents.datastructure.documents.detailed[this.expandIndex(result.id)] = result;
                            this.documents.datastructure.documents.detailed[
                                this.expandIndex(result.id)
                            ].additionalObjectinformations = {
                                common: {
                                    name: result.title,
                                },
                            };
                        }
                        while (erg.data.next) {
                            erg = await axios.get(erg.data.next, this.config);
                            if (erg.data) {
                                for (const result of erg.data.results) {
                                    this.documents.datastructure.documents.detailed[this.expandIndex(result.id)] =
                                        result;
                                    this.documents.datastructure.documents.detailed[
                                        this.expandIndex(result.id)
                                    ].additionalObjectinformations = {
                                        common: {
                                            name: result.title,
                                        },
                                    };
                                }
                            }
                        }
                    }

                    // Assigns for documents
                    for (const document in this.documents.datastructure.documents.detailed) {
                        //Assign Links to documentfolder
                        const id = this.documents.datastructure.documents.detailed[document].id;
                        this.documents.datastructure.documents.detailed[document].links = {
                            download: {
                                additionalObjectinformations: {
                                    type: 'state',
                                    common: {
                                        name: 'link to download the document',
                                        type: 'string',
                                        role: 'text.url',
                                    },
                                    objectValue: `${this.address}${this.api.address}${this.documents.address}${id}/download/`,
                                },
                            },
                            preview: {
                                additionalObjectinformations: {
                                    type: 'state',
                                    common: {
                                        name: 'link to preview the document',
                                        type: 'string',
                                        role: 'text.url',
                                    },
                                    objectValue: `${this.address}${this.api.address}${this.documents.address}${id}/preview/`,
                                },
                            },
                            thumbnail: {
                                additionalObjectinformations: {
                                    type: 'state',
                                    common: {
                                        name: 'link to the tumbnail of the document',
                                        type: 'string',
                                        role: 'text.url',
                                    },
                                    objectValue: `${this.address}${this.api.address}${this.documents.address}${id}/thumb/`,
                                },
                            },
                        };

                        // Assign the type of tags
                        this.documents.datastructure.documents.detailed[document].tags = {
                            additionalObjectinformations: {
                                type: 'state',
                                common: {
                                    name: 'tags',
                                    type: 'array',
                                },
                                objectValue: this.documents.datastructure.documents.detailed[document].tags,
                            },
                        };
                    }

                    // Assign Data
                    await this.assignData(this.documents);

                    // Delete not assigned ids
                    await this.directoryhandler.deleteNotPresentSubfolders(this.documents);
                }
            }
            // Delete not assigned ids
            await this.directoryhandler.deleteNotPresentSubfolders(this.documents);
        } catch (error) {
            if (JSON.stringify(error).indexOf('403') !== -1) {
                this.adapter.log.warn(
                    `Read Data ${this.documents.deleteStartDirectory} is forbidden. Please deactivate in the config`,
                );
            } else {
                this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            }
        }
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * read document types from paperless structure
     */
    async readDocumentTypes() {
        const activeFunction = 'readDocumentTypes';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            await this.adapter.setState(this.adapter.currentStep, 'reading document_types', true);
            if (this.document_types.readOutLevel !== 0) {
                let erg = await axios.get(this.address + this.api.address + this.document_types.address, this.config);
                if (erg.data) {
                    // delete the present data
                    this.document_types.present = {};

                    //Assigns general datastructure
                    this.document_types.datastructure = {
                        document_types: {
                            additionalObjectinformations: {
                                type: 'channel',
                                common: {
                                    name: 'document Types',
                                    icon: 'img/document_types.png',
                                },
                            },
                            basic: {},
                            detailed: {},
                        },
                    };

                    //Assign the Basicstructure
                    this.document_types.datastructure.document_types.basic.count = erg.data.count;

                    // Assign the "all" element
                    this.document_types.datastructure.document_types.basic.all = {
                        additionalObjectinformations: {
                            type: 'state',
                            common: {
                                name: 'all results',
                                type: 'array',
                            },
                            objectValue: erg.data.all,
                        },
                    };

                    if (this.document_types.readOutLevel >= 2) {
                        //Assign Detailedstructure
                        for (const result of erg.data.results) {
                            this.document_types.datastructure.document_types.detailed[this.expandIndex(result.id)] =
                                result;
                            this.document_types.datastructure.document_types.detailed[
                                this.expandIndex(result.id)
                            ].additionalObjectinformations = {
                                common: {
                                    name: result.name,
                                },
                            };
                        }
                        while (erg.data.next) {
                            erg = await axios.get(erg.data.next, this.config);
                            if (erg.data) {
                                for (const result of erg.data.results) {
                                    this.document_types.datastructure.document_types.detailed[
                                        this.expandIndex(result.id)
                                    ] = result;
                                    this.document_types.datastructure.document_types.detailed[
                                        this.expandIndex(result.id)
                                    ].additionalObjectinformations = {
                                        common: {
                                            name: result.name,
                                        },
                                    };
                                }
                            }
                        }
                    }

                    // Assign Data
                    await this.assignData(this.document_types);

                    // Delete not assigned ids
                    await this.directoryhandler.deleteNotPresentSubfolders(this.document_types);
                }
            }
            // Delete not assigned ids
            await this.directoryhandler.deleteNotPresentSubfolders(this.document_types);
        } catch (error) {
            if (JSON.stringify(error).indexOf('403') !== -1) {
                this.adapter.log.warn(
                    `Read Data ${this.document_types.deleteStartDirectory} is forbidden. Please deactivate in the config`,
                );
            } else {
                this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            }
        }
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * read users from paperless structure
     */
    async readUsers() {
        const activeFunction = 'readUsers';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            await this.adapter.setState(this.adapter.currentStep, 'reading users', true);
            if (this.users.readOutLevel !== 0) {
                let erg = await axios.get(this.address + this.api.address + this.users.address, this.config);
                if (erg.data) {
                    // delete the present data
                    this.users.present = {};

                    //Assigns general datastructure
                    this.users.datastructure = {
                        users: {
                            additionalObjectinformations: {
                                type: 'channel',
                                common: {
                                    name: 'users',
                                    icon: 'img/users.png',
                                },
                            },
                            basic: {},
                            detailed: {},
                        },
                    };

                    //Assign the Basicstructure
                    this.users.datastructure.users.basic.count = erg.data.count;

                    // Assign the "all" element
                    this.users.datastructure.users.basic.all = {
                        additionalObjectinformations: {
                            type: 'state',
                            common: {
                                name: 'all results',
                                type: 'array',
                            },
                            objectValue: erg.data.all,
                        },
                    };

                    if (this.users.readOutLevel >= 2) {
                        //Assign Detailedstructure
                        for (const result of erg.data.results) {
                            this.users.datastructure.users.detailed[this.expandIndex(result.id)] = result;
                            this.users.datastructure.users.detailed[
                                this.expandIndex(result.id)
                            ].additionalObjectinformations = {
                                common: {
                                    name: result.username,
                                },
                            };
                        }
                        while (erg.data.next) {
                            erg = await axios.get(erg.data.next, this.config);
                            if (erg.data) {
                                for (const result of erg.data.results) {
                                    this.users.datastructure.users.detailed[this.expandIndex(result.id)] = result;
                                    this.users.datastructure.users.detailed[
                                        this.expandIndex(result.id)
                                    ].additionalObjectinformations = {
                                        common: {
                                            name: result.username,
                                        },
                                    };
                                }
                            }
                        }
                    }

                    // Assign the type of inherited_permissions
                    for (const user in this.users.datastructure.users.detailed) {
                        this.users.datastructure.users.detailed[user].inherited_permissions = {
                            additionalObjectinformations: {
                                type: 'state',
                                common: {
                                    name: 'inherited_permissions',
                                    type: 'array',
                                },
                                objectValue: this.users.datastructure.users.detailed[user].inherited_permissions,
                            },
                        };
                    }

                    // Assign Data
                    await this.assignData(this.users);

                    // Delete not assigned ids
                    await this.directoryhandler.deleteNotPresentSubfolders(this.users);
                }
            }
            // Delete not assigned ids
            await this.directoryhandler.deleteNotPresentSubfolders(this.users);
        } catch (error) {
            if (JSON.stringify(error).indexOf('403') !== -1) {
                this.adapter.log.warn(
                    `Read Data ${this.users.deleteStartDirectory} is forbidden. Please deactivate in the config`,
                );
            } else {
                this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            }
        }
    }

    /******************************************************************************************************
     * *****************************************************************************************************
     **************************************************************************************************** */

    /**
     * read correspondents from paperless structure
     */
    async readCorrespondents() {
        const activeFunction = 'readCorrespondents';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            await this.adapter.setState(this.adapter.currentStep, 'reading correspondents', true);
            if (this.correspondents.readOutLevel !== 0) {
                let erg = await axios.get(this.address + this.api.address + this.correspondents.address, this.config);
                if (erg.data) {
                    // delete the present data
                    this.correspondents.present = {};

                    //Assigns general datastructure
                    this.correspondents.datastructure = {
                        correspondents: {
                            additionalObjectinformations: {
                                type: 'channel',
                                common: {
                                    name: 'corresondents',
                                    icon: 'img/correspondents.png',
                                },
                            },
                            basic: {},
                            detailed: {},
                        },
                    };

                    //Assign the Basicstructure
                    this.correspondents.datastructure.correspondents.basic.count = erg.data.count;

                    // Assign the "all" element
                    this.correspondents.datastructure.correspondents.basic.all = {
                        additionalObjectinformations: {
                            type: 'state',
                            common: {
                                name: 'all results',
                                type: 'array',
                            },
                            objectValue: erg.data.all,
                        },
                    };

                    if (this.correspondents.readOutLevel >= 2) {
                        //Assign Detailedstructure
                        for (const result of erg.data.results) {
                            this.correspondents.datastructure.correspondents.detailed[this.expandIndex(result.id)] =
                                result;
                            this.correspondents.datastructure.correspondents.detailed[
                                this.expandIndex(result.id)
                            ].additionalObjectinformations = {
                                common: {
                                    name: result.title,
                                },
                            };
                        }
                        while (erg.data.next) {
                            erg = await axios.get(erg.data.next, this.config);
                            if (erg.data) {
                                for (const result of erg.data.results) {
                                    this.correspondents.datastructure.correspondents.detailed[
                                        this.expandIndex(result.id)
                                    ] = result;
                                    this.correspondents.datastructure.correspondents.detailed[
                                        this.expandIndex(result.id)
                                    ].additionalObjectinformations = {
                                        common: {
                                            name: result.title,
                                        },
                                    };
                                }
                            }
                        }
                    }

                    // Assign Data
                    await this.assignData(this.correspondents);

                    // Delete not assigned ids
                    await this.directoryhandler.deleteNotPresentSubfolders(this.correspondents);
                }
            }
            // Delete not assigned ids
            await this.directoryhandler.deleteNotPresentSubfolders(this.correspondents);
        } catch (error) {
            if (JSON.stringify(error).indexOf('403') !== -1) {
                this.adapter.log.warn(
                    `Read Data ${this.correspondents.deleteStartDirectory} is forbidden. Please deactivate in the config`,
                );
            } else {
                this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
            }
        }
    }
}
module.exports = paperlesscommunicationClass;
