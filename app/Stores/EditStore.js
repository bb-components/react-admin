import { EventEmitter } from 'events';
import { Map } from 'immutable';
import objectAssign from 'object-assign';

import AppDispatcher from '../Services/AppDispatcher';

import ReadQueries from 'admin-config/lib/Queries/ReadQueries';
import WriteQueries from 'admin-config/lib/Queries/WriteQueries';
import PromisesResolver from 'admin-config/lib/Utils/PromisesResolver';
import DataStore from 'admin-config/lib/DataStore/DataStore';

import RestWrapper from '../Services/RestWrapper';

class EditStore extends EventEmitter {
    constructor(...args) {
        super(...args);

        this.data = Map({
            originEntityId: null,
            dataStore: new DataStore(),
            values: Map()
        });
    }

    loadData(configuration, view, identifierValue, sortField, sortDir) {
        let dataStore = new DataStore();
        let readQueries = new ReadQueries(new RestWrapper(), PromisesResolver, configuration);
        let rawEntry, entry, nonOptimizedReferencedData, optimizedReferencedData;

        readQueries
            .getOne(view.getEntity(), view.type, identifierValue, view.identifier(), view.getUrl())
            .then((response) => {
                rawEntry = response;

                entry = dataStore.mapEntry(
                    view.entity.name(),
                    view.identifier(),
                    view.getFields(),
                    rawEntry
                );

                return rawEntry;
            }, this)
            .then((rawEntry) => {
                return readQueries.getFilteredReferenceData(view.getNonOptimizedReferences(), [rawEntry]);
            })
            .then((nonOptimizedReference) => {
                nonOptimizedReferencedData = nonOptimizedReference;

                return readQueries.getOptimizedReferencedData(view.getOptimizedReferences(), [rawEntry]);
            })
            .then((optimizedReference) => {
                optimizedReferencedData = optimizedReference;

                var references = view.getReferences(),
                    referencedData = objectAssign(nonOptimizedReferencedData, optimizedReferencedData),
                    referencedEntries;

                for (var name in referencedData) {
                    referencedEntries = dataStore.mapEntries(
                        references[name].targetEntity().name(),
                        references[name].targetEntity().identifier(),
                        [references[name].targetField()],
                        referencedData[name]
                    );

                    dataStore.setEntries(
                        references[name].targetEntity().uniqueId + '_values',
                        referencedEntries
                    );
                }
            })
            .then(() => {
                var referencedLists = view.getReferencedLists();

                return readQueries.getReferencedListData(referencedLists, sortField, sortDir, entry.identifierValue);
            })
            .then((referencedListData) => {
                var referencedLists = view.getReferencedLists();
                var referencedList;
                var referencedListEntries;

                for (var i in referencedLists) {
                    referencedList = referencedLists[i];
                    referencedListEntries = referencedListData[i];

                    referencedListEntries = dataStore.mapEntries(
                        referencedList.targetEntity().name(),
                        referencedList.targetEntity().identifier(),
                        referencedList.targetFields(),
                        referencedListEntries
                    );

                    dataStore.setEntries(
                        referencedList.targetEntity().uniqueId + '_list',
                        referencedListEntries
                    );
                }
            })
            .then(() => {
                return readQueries.getAllReferencedData(view.getReferences());
            })
            .then((filterData) => {
                var choices = view.getReferences();
                var choiceEntries;

                for (var name in filterData) {
                    choiceEntries = dataStore.mapEntries(
                        choices[name].targetEntity().name(),
                        choices[name].targetEntity().identifier(),
                        [choices[name].targetField()],
                        filterData[name]
                    );

                    dataStore.setEntries(
                        choices[name].targetEntity().uniqueId + '_choices',
                        choiceEntries
                    );
                }
            })
            .then(() => {
                dataStore.fillReferencesValuesFromEntry(entry, view.getReferences(), true);

                dataStore.addEntry(view.getEntity().uniqueId, entry);

                return entry;
            })
            .then((entry) => {
                this.data = this.data.update('originEntityId', v => identifierValue);
                this.data = this.data.update('dataStore', v => dataStore);
                this.data = this.data.update('values', v => {
                    v = v.clear();

                    for (let fieldName in entry.values) {
                        v = v.set(fieldName, entry.values[fieldName]);
                    }

                    return v;
                });
                this.emitChange();
            });
    }

    updateData(fieldName, value) {
        this.data = this.data.update('values', v => v.update(fieldName, val => value));
        this.emitChange();
    }

    saveData(configuration, view) {
        let rawEntity = {};
        let values = this.data.get('values');
        let id = this.data.get('originEntityId');

        for (let [name, value] of values) {
            rawEntity[name] = value;
        }

        let writeQueries = new WriteQueries(new RestWrapper(), PromisesResolver, configuration);
        writeQueries.updateOne(view, rawEntity, id);
    }

    getState() {
        return { data: this.data };
    }

    emitChange() {
        this.emit('edit_load');
    }

    addChangeListener(callback) {
        this.on('edit_load', callback);
    }

    removeChangeListener(callback) {
        this.removeListener('edit_load', callback);
    }
}

let store = new EditStore();

AppDispatcher.register((action) => {
    switch(action.actionType) {
        case 'load_edit_data':
            store.loadData(action.configuration, action.view, action.id, action.sortField, action.sortDir);
            break;
        case 'update_edit_data':
            store.updateData(action.fieldName, action.value);
            break;
        case 'save_edit_data':
            store.saveData(action.configuration, action.view);
            break;
    }
});

export default store;
