'use strict';
const util = require('../util/util');
const errors = require('../util/errors');
const error = errors.create(500, 'NeedFunctionOverride');
const reference = Symbol('reference');
const schemaRef = Symbol('schemaRef');
const idRef = Symbol('idRef');
const instances = {};

class BaseFactory {
    /**
    * BaseFactory stores:
    *   - id reference for the name of the factory
    *   - Reference for object store
    *   - Schema reference for creating models
    * @method constructor
    */
    constructor(id, schema, appName = null) {
        this[idRef] = id;
        this[reference] = {};
        this[schemaRef] = schema;
    }

    /**
     * Getter for the firebase reference
     * @property ref
     * @return {Object} firebaseReference
     */
    get ref() {
        return this[reference];
    }

    /**
    * Helper function to create the firebase og object model
    * @method createModel
    * @param {Object} modelData         The data to instantiate with
    * @param {Object} user              The user performing the action
    * @returns {FirebaseObject}         The firebase og model
    */
    createModel(modelData, user) {
        throw error;
    }

    /**
    * Method to generate keys for creating new objects
    * @method generateNewKey
    * @param {Object} modelData         The model data to set
    * @returns {String}                 The id to use
    */
    generateNewKey(modelData) {
        throw error;
    }

    /**
    * Method to retreive a firebase og instance
    * @method get
    * @param {String} id                The id of the model to look up
    * @param {Object} user              The user performing the action
    * @returns {FirebaseObject}         The firebase og model
    */
    get(params, user) {
        throw error;
    }

    /**
    * Method to retreive an array of firebase og instance
    * @method getBulk
    * @param {Array|Object} ids         The ids to get
    * @returns {Array}                  An array of og models
    */
    getBulk(keys) {
        throw error;
    }

    /**
    * Method to retreive an array of json
    * @method getBulkJson
    * @param {Array|Object} ids         The ids to get
    * @param {UserModel} user           The user requesting
    * @returns {Array}                  An array of og models
    */
    getBulkJson(keys, user) {
        throw error;
    }

    /**
    * Method to retreive an array of firebase og instances
    * @method list
    * @param {Object} query             The request query object
    * @param {Object} user              The user performing the action
    * @returns {Array}                  An Array of firebase og models
    */
    list(query, user) {
        throw error;
    }

    /**
    * Method to create and save a firebase og model
    * @method create
    * @param {Object} modelData         The model data to set
    * @param {Object} user              The user performing the action
    * @returns {FirebaseObject}         The firebase og model
    */
    create(modelData, user, params) {
        throw error;
    }

    /**
    * Method to update and save a firebase og model
    * @method update
    * @param {Object} params            The request parameters
    * @param {Object} modelData         The model data to set
    * @param {Object} user              The user performing the action
    * @returns {FirebaseObject}         The firebase og model
    */
    update(params, modelData, user) {
        throw error;
    }

    /**
    * Method to remove a firebase og model
    * @method remove
    * @param {Object} params            The request parameters
    * @param {Object} user              The user performing the action
    * @returns {FirebaseObject}         The firebase og model
    */
    remove(params, user) {
        throw error;
    }

    /**
    * Method to get instance of factory
    * @static getInstance
    * @param {String} id                The id of the model
    * @param {Object} schema            The joi schema object for the model
    * @returns {DynamicFactory}         The factory instance
    */
    static getInstance(id, schema) {
        if (!instances[id]) {
            instances[id] = new BaseFactory(id, schema);
        }

        return instances[id];
    }
}

module.exports = BaseFactory;
