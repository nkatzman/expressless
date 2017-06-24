'use strict';
const path = require('path');
const config = require('config');
const Joi = require('joi');
const routeHandlers = require('./routes');
const logger = require('./util/logger').getLogger();
const schemas = require(path.resolve(__dirname, './schemas'));

const dynamicHandle = routeHandlers.dynamicHandle;
const schemasToUse = config.get('server').schemas;
// Validation for the schemas
const trimString = Joi.string().trim();
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
        .description('The joi object to validate req.headers against. Only requires that these values are present'),
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
    routes: Joi.object().pattern(keyStringRegex, [routeObject, relativeUrlString, ""])
        .description('A set of routes for this model'),
    middlewares: Joi.array().items(funcSchema)
        .description('A set of middleware functions. Setup as the first things to run')
});

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
 * Helper function to combine two potential arrays
 * @method combineArrays
 * @param {Array} arr1        The first array
 * @param {Array} arr2        The second array
 */
function combineArrays(arr1 = [], arr2 = []) {
    return arr1.concat(arr2);
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

function flattenRouteDetails(schemaId, schema, method, route) {
    const id = route.id || schema.id || schemaId;
    const useFactory = route.useFactory || schema.useFactory;
    const useFactoryMethod = route.useFactoryMethod;
    const bindArgs = {
        id,
        schema: schema.schema,
        useFactory,
        useFactoryMethod
    };
    const methods = [];
    const handlerMethod = route.method || method;
    const httpMethod = convertToHttpMethod(handlerMethod);
    const httpRoute = path.join(getPathString(schema), getPathString(route));
    const loadFactoryHandler = routeHandlerIfExists(route.loadFactory || schema.loadFactory);
    const postValidationHandler = routeHandlerIfExists(route.postValidation);
    const routeHandler = routeHandlerIfExists(route.handler);
    const postRouteHandlerHandler = routeHandlerIfExists(route.postHandler);
    const middlewares = combineArrays(schema.middlewares, route.middlewares);

    console.log(`Handling route: ${JSON.stringify({
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

    return {
        httpMethod,
        httpRoute,
        methods
    };
}

/**
 * Helper function to handle adding each route to the express app
 * @method addRoute
 * @param  {Express} app
 * @param {String} id           The id of the route schema
 * @param {Object} schema       The action schema object
 * @param {String} method       The key of the route
 * @param {Object} route        The route data
 */
function addRoute(app, schemaId, schema, method, route) {
    const {
        httpMethod,
        httpRoute,
        methods
    } = flattenRouteDetails(schemaId, schema, method, route);

    app[httpMethod](httpRoute, methods);
}

/**
 * Helper function to handle each schema and route
 * @method handleSchema
 * @param  {Express} app
 * @param {String} id           The id of the route schema
 * @param {Object} schema       The action schema object
 */
function handleSchema(app, id, schema) {
    const routes = schema.routes;

    if (!routes) {
        return false;
    }

    return Object.keys(routes).forEach(method =>
        addRoute(
            app,
            id,
            schema,
            method,
            routes[method]
        )
    );
}

/**
 * Setup dynamic routes based on the schema files
 * @method setupDynamicRoute
 * @param  {Express} app
 * @param  {Object} schemas         An object containing route schemas
 */
function setupDynamicRoute(app, schemas) {
    Object.keys(schemas).forEach((id) => {
        const schema = schemas[id];
        // TODO: Add validation in the id. Needs to be a string with regex
        Joi.assert(schema, schemaValidation);

        return handleSchema(app, id, schema);
    });
}

/**
 * Function to setup dynamic routes for the app
 * @method route
 * @param  {Express}    app
 */
function dynamicRoute(app) {
    schemasToUse.forEach((id) => {
        if (!schemas[id]) {
            logger.log(`Schema ${id} does not exist... skipping`);

            return;
        }

        logger.log(`Handling schema file: ${id}`);
        setupDynamicRoute(app, schemas[id]);
    });
}

function flatten(schema, schemaId, routeId) {
    const s = schema[schemaId] || schema;

    Joi.assert(s, schemaValidation);

    const flattendRoute = flattenRouteDetails(
        schemaId,
        s,
        routeId,
        s.routes[routeId]
    );

    return flattendRoute;
}

module.exports = {
    flatten
};
