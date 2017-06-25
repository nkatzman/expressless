'use strict';
const path = require('path');
const Joi = require('joi');
const logger = require('./util/logger').getLogger();
const errors = require('./util/errors');
const util = require('./util/util');
const routeHandlers = util.getExportsFromDirectory(path.join(__dirname, '../routes'));
const defaultHandler = require('./routes/defaultHandler');
const forbidden = errors.create(403);
// Validation for a flattened schema
// const trimString = Joi.string().trim();
const keyStringRegex = /[a-zA-z]{0,20}/;
const javascriptFunctionRegex = /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/;
const javascriptFunctionString = Joi.string().regex(javascriptFunctionRegex);
const relativeUrlString = Joi.string().uri({ relativeOnly: true });
const fileNameString = relativeUrlString;
const funcSchema = Joi.func();
const routeObject = {
    id: Joi.string().regex(keyStringRegex)
        .description('The identifier to use for naming this class of objects'),
    method: Joi.string().valid([
        'get',
        'list',
        'delete',
        'put',
        'post',
        'option',
        'head'
    ]).description('The http method for the route'),
    path: relativeUrlString
        .description('A path to set for all the routes'),
    headerValidation: Joi.object().schema()
        .description('The joi object to validate req.headers against'),
    validation: Joi.object().schema()
        .description('The joi object to validate the req.body against'),
    postValidation: fileNameString
        .description('A handler to be called after header/body validation'),
    loadFactory: fileNameString
        .description('A handler called to load a factory into the req context'),
    useFactory: fileNameString
        .description('An identifier for the name of the factory to use'),
    useFactoryMethod: javascriptFunctionString
        .description('An identifier for the factory method to call'),
    handler: fileNameString
        .description('A handler that will be called. This handler must send an HTTP response back'),
    postHandler: fileNameString
        .description('A handler that will be called after a response is sent back'),
    middlewares: Joi.array().items(funcSchema)
        .description('A set of middleware functions. Setup as the first things to run')
};
const schemaValidation = Joi.object({
    id: Joi.string().regex(keyStringRegex)
        .description('The identifier to use for naming this class of objects'),
    schema: Joi.object()
        .description('The Model schema for the set of routes'),
    useFactory: fileNameString
        .description('String for the Factory Class name to use'),
    path: relativeUrlString
        .description('A base path to set for all the routes'),
    routes: Joi.object().pattern(keyStringRegex, [routeObject, relativeUrlString, ''])
        .description('A set of routes for this model'),
    middlewares: Joi.array().items(funcSchema)
        .description('A set of middleware functions. Setup as the first things to run')
});

/**
 * Helper function to combine two potential arrays
 * @method combineArrays
 * @param {Array} arr1        The first array
 * @param {Array} arr2        The second array
 */
function combineArrays(arr1 = [], arr2 = []) {
    return arr1.concat(arr2);
}

/**
 * Helper function to check and see if a routeHandler exists for a function name
 * @method routeHandlerIfExists
 * @param {String} functionName           The function name to check for
 * @returns {Function}                    The function reference taken from require('./routes')
 */
function routeHandlerIfExists(functionName) {
    if (!functionName) {
        return null;
    }
    const keys = functionName.trim().split('.');
    let key;
    let ref = routeHandlers;

    while (keys.length > 1) {
        key = keys.shift();
        if (!ref[key]) {
            return null;
        }
        ref = ref[key];
    }

    key = keys.shift();
    ref = ref[key];

    if (!ref) {
        return null;
    }

    return ref;
}

/**
 * Helper function to conver the handler method into an HTTP method
 * @method convertToHttpMethod
 * @param {String} handlerMethod        The method to used with the dynamic handler
 */
function convertToHttpMethod(handlerMethod) {
    switch (handlerMethod) {
    case 'list':
        return 'get';
    case 'get':
    case 'put':
    case 'post':
    case 'delete':
    case 'patch':
        return handlerMethod;
    default:
        throw new Error(`Invalid Handler Method (${handlerMethod})`);
    }
}

/**
 * Helper function to get the path from the object
 * @method getPathString
 * @param {Object} route        The route data
 */
function getPathString(route) {
    if (route.path) {
        return route.path;
    }

    if (typeof route === 'string') {
        return route;
    }

    return '';
}

/**
 * Helper method to decide whether a path component should be extracted
 * @method isId
 * @param {String} pathComponent   A component from the path
 * @returns {Boolean}
 */
function isId(pathComponent) {
    return pathComponent[0] === ':';
}

class ExpresslessHandler {
    constructor(params, schema) {
        this.schema = schema;
        this.schemaId = params.schemaId;
        this.routeId = params.routeId;
        this.route = this.schema.routes[this.routeId];
        this.defaultHandlers = Object.assign({}, defaultHandler, params.defaultHandlers)
        this.methods = [];

        this.flatten();
    }

    flatten() {
        const {
            schema,
            route,
            schemaId,
            routeId,
            defaultHandlers
        } = this;
        const dynamicHandle = defaultHandlers;
        const id = route.id || schema.id || schemaId;
        const useFactory = route.useFactory || schema.useFactory;
        const useFactoryMethod = route.useFactoryMethod;
        const methods = [];
        const handlerMethod = route.method || routeId;
        const httpMethod = convertToHttpMethod(handlerMethod);
        const httpRoute = path.join(getPathString(schema), getPathString(route));
        const loadFactoryHandler = routeHandlerIfExists(route.loadFactory || schema.loadFactory);
        const postValidationHandler = routeHandlerIfExists(route.postValidation);
        const routeHandler = routeHandlerIfExists(route.handler);
        const postRouteHandlerHandler = routeHandlerIfExists(route.postHandler);
        const middlewares = combineArrays(schema.middlewares, route.middlewares);
        const bindArgs = {
            id,
            schema: schema.schema,
            useFactory,
            useFactoryMethod
        };

        logger.log(`Handling route: ${JSON.stringify({
            id,
            handlerMethod,
            httpMethod,
            httpRoute,
            usingFactory: useFactory,
            hasFactoryLoader: route.loadFactory || schema.loadFactory,
            hasValidation: route.validation !== undefined ? 'true' : 'false',
            hasHeaderValidation: route.headerValidation !== undefined ? 'true' : 'false',
            hasPostValidationHandler: route.postValidation,
            hasRouteHandler: route.handler,
            hasPostRouteHandler: route.postHandler,
            numMiddlewares: route.middlewares ? route.middlewares.length : 0,
            isValidationOnly: route.validationOnly
        })}`);

        middlewares.forEach(m => methods.push(m));

        // .5 header validation
        if (route.headerValidation) {
            methods.push(dynamicHandle.validateHeaders.bind(null, route.headerValidation));
        }

        // 1: validation
        if (route.validation) {
            methods.push(dynamicHandle.validateBody.bind(null, route.validation));
        }

        // 1.5 load User into req handler
        methods.push(dynamicHandle.loadUser.bind(null, bindArgs));

        // 2: load factory into req handler
        if (loadFactoryHandler) {
            methods.push(loadFactoryHandler.bind(null, bindArgs));
        } else {
            methods.push(dynamicHandle.loadFactory.bind(null, bindArgs));
        }

        // 3: postValidation handler
        if (postValidationHandler) {
            methods.push(postValidationHandler.bind(null, bindArgs));
        }

        // 4: Response handler
        if (routeHandler) {
            methods.push(routeHandler.bind(null, bindArgs));
        } else {
            // dynamicRouteHandler[get/post/put/delete/list](obj, req, res, next)
            methods.push(dynamicHandle[handlerMethod].bind(null, bindArgs));
        }

        // 5: Post response handler
        if (postRouteHandlerHandler) {
            methods.push(postRouteHandlerHandler.bind(null, bindArgs));
        }

        this.methods = methods;
        this.httpMethod = httpMethod;
        this.httpRoute = httpRoute;

        return this;
    }

    validateRequest(method, contentType) {
        // const method = req.method;
        // const contentType = req.get('content-type');
        const routeMethod = this.httpMethod.toUpperCase();

        if ((method === 'POST' || method === 'PUT')
            && (contentType !== 'application/json'
                && contentType !== 'application/x-www-form-urlencoded')) {
            logger.log('Needs to be application/json');

            throw forbidden;
        }

        if (method !== 'OPTIONS' && method !== routeMethod) {
            logger.log(`Invalid method ${method}.. wanted ${routeMethod}`);

            throw forbidden;
        }

        return true;
    }

    extractParams(requestPath = '') {
        const routePath = this.httpRoute;
        const params = {};

        requestPath = requestPath || '';

        // This must mean that the path does not have any ids in it
        if (routePath === requestPath) {
            return params;
        }

        const comps = routePath.split('/');
        const sentComps = requestPath.split('/');

        if (!routePath || comps.length !== sentComps.length) {
            throw forbidden;
        }

        comps.forEach((c, i) => {
            if (isId(c)) {
                params[c] = sentComps[i];

                return;
            } else if (c !== sentComps[i]) {
                throw forbidden;
            }
        });

        return params;
    }

    run(req, res) {
        return this.methods.reduce((p, fxn) => p.then(() => {
            return new Promise(resolve => fxn(req, res, () => resolve()));
        }), Promise.resolve()).catch((err) => {
            // Here we will catch all err from the fxns and response appropriately
            logger.log(err);
            // req.status(500).json({ foo: 'bar' });
        });
    }

    static validateSchema(s) {
        Joi.assert(s, schemaValidation);
    }

    static create(schemaConfig) {
        const schema = schemaConfig.schema;
        const schemaId = schemaConfig.schemaId;
        const s = schema[schemaId] || schema;

        this.validateSchema(s);

        return new ExpresslessHandler(schemaConfig, s);
    }

    static config(config) {

    }
}

module.exports = ExpresslessHandler;