'use strict';
const Joi = require('joi');
const path = require('path');
const logger = require('../util/logger').getLogger();
const util = require('../util/util');
const BaseFactory = require('../factories/baseFactory');
const factories = util.getExportsFromDirectory(path.join(__dirname, '../../factories'));

/**
 * Helper method to get a factory
 * @method getFactory
 * @param {Object} schema            Joi schema used for validation
 * @param {Object} req               The express request object
 * @returns {Object} factory         The factory instance to be used
 */
function getFactory(routeInfo, req) {
    if (req.context && req.context.factory) {
        return req.context.factory;
    }

    let factory = BaseFactory;

    if (routeInfo.useFactory && factories[routeInfo.useFactory]) {
        factory = factories[routeInfo.useFactory];
    }

    return factory.getInstance(routeInfo.id, routeInfo.schema);
}

/**
 * Simple handler that will just return information about the request
 * @method dumbResponseHandler
 * @param {Object} routeInfo         An object containing routeInfo from the schema
 * @param {Object} req               The express request object
 * @param {Object} res               The express request object
 * @param {Function} next            Callback for next
 */
function dumbResponseHandler(routeInfo, req, res, next) {
    res.json({
        id: routeInfo.id,
        method: req.method,
        path: req.path,
        params: req.params,
        body: req.body,
        query: req.query
    });

    return next();
}

module.exports = {
    /**
     * Method to validate the req.body against the schema
     * @method validation
     * @param {Object} schema            Joi schema used for validation
     * @param {Object} req               The express request object
     * @param {Object} res               The express request object
     * @param  {Callback} next           The express next callback
     */
    validateBody(schema, req, res, next) {
        if (!schema) {
            return next();
        }

        return Joi.validate(req.body, schema, (err, resp) => {
            if (err) {
                logger.log('Body validation failed', err);

                return res.status(400).json({
                    message: 'InvalidRequestPayload',
                    err
                });
            }

            req.body = resp;

            return next();
        });
    },
    /**
     * Method to validate the req.body against the schema
     * @method validation
     * @param {Object} schema            Joi schema used for validation
     * @param {Object} req               The express request object
     * @param {Object} res               The express request object
     * @param  {Callback} next           The express next callback
     */
    validateHeaders(schema, req, res, next) {
        if (!schema) {
            return next();
        }

        const options = {
            allowUnknown: true
        };

        return Joi.validate(req.headers, schema, options, (err) => {
            if (err) {
                logger.log('Header validation failed', err);

                return res.status(400).json({
                    message: 'IncompleteRequestHeaders'
                });
            }

            return next();
        });
    },
    /**
     * Method to load the factory into the context for later handlers to use
     * @method loadFactory
     * @param {Object} routeInfo         An object containing routeInfo from the schema
     * @param {Object} req               The express request object
     * @param {Object} res               The express request object
     */
    loadFactory(routeInfo, req, res, next) {
        if (!req.context) {
            req.context = {};
        }

        req.context.factory = getFactory(routeInfo, req);
        next();
    },
    /**
     * Method to load the user into the context for later handlers to use
     * @method loadUser
     * @param {Object} routeInfo         An object containing routeInfo from the schema
     * @param {Object} req               The express request object
     * @param {Object} res               The express request object
     */
    loadUser(routeInfo, req, res, next) {
        // Token takes priority over session
        if (!req.user) {
            // If no token, and no session || the session is not logged in, set defaults
            if (!req.session || (!req.session.uid && !req.session.loggedIn)) {
                return next();
            }

            // If the session does not have a uid, then it's logged in so set the session as the user
            if (!req.session.uid) {
                req.user = {
                    firstName: req.session.firstName,
                    lastName: req.session.lastName,
                    email: req.session.email
                };

                return next();
            }

            // If there is a uid, use it to load the user
            req.user = {
                id: req.session.uid
            };
        }

        if (!factories.users) {
            return next();
        }

        return factories.users.getInstance().get(req.user)
            .then((user) => {
                req.user = user;

                next();
            })
            .catch(() => {
                logger.log('Could not load user', req.user);

                next();
            });
    },
    list: dumbResponseHandler,
    get: dumbResponseHandler,
    post: dumbResponseHandler,
    put: dumbResponseHandler,
    delete: dumbResponseHandler
};
