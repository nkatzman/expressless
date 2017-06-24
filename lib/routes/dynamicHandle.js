'use strict';
const Joi = require('joi');
const factories = require('../factories');
const DynaFactory = factories.dynamicFactory;
const logger = require('../util/logger').getLogger();

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

    let factory = DynaFactory;

    if (routeInfo.useFactory && factories[routeInfo.useFactory]) {
        factory = factories[routeInfo.useFactory];
    }

    return factory.getInstance(routeInfo.id, routeInfo.schema);
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
                req.user = {
                    uid: `uidOfJamesBond${Date.now()}`,
                    id: `uidOfJamesBond${Date.now()}`
                };

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
    /**
     * Method to list objects from the factory
     * @method list
     * @param {Object} routeInfo         An object containing routeInfo from the schema
     * @param {Object} req               The express request object
     * @param {Object} res               The express request object
     */
    list(routeInfo, req, res, next) {
        const factory = getFactory(routeInfo, req);
        let factoryMethod = routeInfo.useFactoryMethod || 'list';

        if (!factory[factoryMethod]) {
            logger.log(`No factory method for route
                ${routeInfo.id}: ${factoryMethod}... using default`);

            factoryMethod = 'list';
        }

        factory[factoryMethod](req.query, req.user, req.params)
            .then((items) => {
                routeInfo.responseObject = items;

                return Promise.all(
                    items.map((l) => {
                        if (!l.toJson) {
                            return l;
                        }

                        return l.toJson();
                    })
                );
            })
            .then(items => items.filter(i => !!i))
            .then((items) => {
                const obj = {};

                obj[routeInfo.id] = items;

                return obj;
            })
            .then(json => res.json(json))
            .then(() => next())
            .catch((err) => {
                logger.log(`Error getting: ${routeInfo.id}`, err);

                return res.status(err.status || 500).json(err);
            });
    },
    /**
     * Method to get an object from the dynamic factory
     * @method get
     * @param {Object} routeInfo         An object containing routeInfo from the schema
     * @param {Object} req               The express request object
     * @param {Object} res               The express request object
     */
    get(routeInfo, req, res, next) {
        const factory = getFactory(routeInfo, req);
        let factoryMethod = routeInfo.useFactoryMethod || 'get';

        if (!factory[factoryMethod]) {
            logger.log(`No factory method for route
                ${routeInfo.id}: ${factoryMethod}... using default`);

            factoryMethod = 'get';
        }

        return factory[factoryMethod](req.params, req.user)
            .then((dyno) => {
                routeInfo.responseObject = dyno;

                if (!dyno.toJson) {
                    return dyno;
                }

                return dyno.toJson();
            })
            .then(json => res.json(json))
            .then(() => next())
            .catch((err) => {
                logger.log(`Error getting: ${routeInfo.id}`, err);

                return res.status(err.status || 500).json(err);
            });
    },
    /**
     * Method to create an object with the dynamic factory
     * @method post
     * @param {Object} routeInfo         An object containing routeInfo from the schema
     * @param {Object} req               The express request object
     * @param {Object} res               The express request object
     */
    post(routeInfo, req, res, next) {
        const factory = getFactory(routeInfo, req);
        let factoryMethod = routeInfo.useFactoryMethod || 'create';

        if (!factory[factoryMethod]) {
            logger.log(`No factory method for route
                ${routeInfo.id}: ${factoryMethod}... using default`);

            factoryMethod = 'create';
        }

        factory[factoryMethod](req.body, req.user, req.params)
            .then((dyno) => {
                routeInfo.responseObject = dyno;

                if (!dyno.toJson) {
                    return dyno;
                }

                return dyno.toJson();
            })
            .then(json => res.status(201).json(json))
            .then(() => next())
            .catch((err) => {
                logger.log(`Error creating: ${routeInfo.id}`, err);

                return res.status(err.status || 500).json(err);
            });
    },
    /**
     * Method to put an object iwth the dynamic factory
     * @method put
     * @param {Object} routeInfo         An object containing routeInfo from the schema
     * @param {Object} req               The express request object
     * @param {Object} res               The express request object
     */
    put(routeInfo, req, res, next) {
        const factory = getFactory(routeInfo, req);
        let factoryMethod = routeInfo.useFactoryMethod || 'update';

        if (!factory[factoryMethod]) {
            logger.log(`No factory method for route
                ${routeInfo.id}: ${factoryMethod}... using default`);

            factoryMethod = 'update';
        }

        factory[factoryMethod](req.params, req.body, req.user)
            .then((dyno) => {
                routeInfo.responseObject = dyno;

                if (!dyno.toJson) {
                    return dyno;
                }

                return dyno.toJson();
            })
            .then(json => res.json(json))
            .then(() => next())
            .catch((err) => {
                logger.log(`Error updating: ${routeInfo.id}`, err);

                return res.status(err.status || 500).json(err);
            });
    },
    /**
     * Method to delete an object from the dynamic factory
     * @method delete
     * @param {Object} routeInfo         An object containing routeInfo from the schema
     * @param {Object} req               The express request object
     * @param {Object} res               The express request object
     */
    delete(routeInfo, req, res, next) {
        const factory = getFactory(routeInfo, req);
        let factoryMethod = routeInfo.useFactoryMethod || 'remove';

        if (!factory[factoryMethod]) {
            logger.log(`No factory method for route
                ${routeInfo.id}: ${factoryMethod}... using default`);

            factoryMethod = 'remove';
        }

        factory[factoryMethod](req.params, req.user)
            .then(() => res.status(204).json({}))
            .then(() => next())
            .catch((err) => {
                logger.log(`Error creating route: ${routeInfo.id}`, err);

                return res.status(err.status || 500).json(err);
            });
    }
};
