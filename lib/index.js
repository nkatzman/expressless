'use strict';
const schemaHandler = require('./dynamicRoute');
const errors = require('./util/errors');
const forbidden = errors.create(403);

/**
 * Helper method to validate that a request is valid.
 * This method compares the:
 *    - ContentType, requires application/json application/x-www-form-urlencoded
 *    - Request method, requires it to be the same as the routeMethod
 * @method validateRequest
 * @param {Object} req              A request object
 * @param {String} routeMethod      The HTTP method that this function should handle
 * @returns {Boolean}               Whether this is a valid request being made
 */
function validateRequest(req, routeMethod) {
    const method = req.method;
    const contentType = req.get('content-type');

    if ((method === 'POST' || method === 'PUT')
        && (contentType !== 'application/json' && contentType !== 'application/x-www-form-urlencoded')) {
        console.log('Needs to be application/json')

        throw forbidden;
    }

    if (req.method !== 'OPTIONS' && req.method !== routeMethod) {
        console.log(`Invalid method ${req.method}.. wanted ${routeMethod}`)

        throw forbidden;
    }

    return true;
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

/**
 * Helper method to extract parameters from the path to treat it like express params
 * This method looks for "ids", which are in the form ":id", and returns an object of path params
 * @method extractParams
 * @param {String} path            The path from the request
 * @param {String} routePath       The path from the schema
 * @returns {Object}               An object of path parameters taken out of the path
 */
function extractParams(path, routePath) {
    const params = {};

    // This must mean that the path does not have any ids in it
    if (routePath === path) {
        return params;
    }

    const comps = routePath.split('/');
    const sentComps = path.split('/');

    if (comps.length !== sentComps.length) {
        throw forbidden;
    }

    comps.forEach((c, i) => {
        if (isId(c)) {
            params[c] = sentComps[i];

            return;
        } else if (c !== sentComps[i]) {
            throw forbidden
        }
    });

    return params;
}

module.exports = {
    serveSchema(schema, schemaId, routeId) {
        const { httpMethod, httpRoute, methods } = schemaHandler.flatten(schema, schemaId, routeId);

        return (req, res) => {
            try {
                validateRequest(req, httpMethod.toUpperCase())
                req.params = extractParams(req.path, httpRoute);

                return methods.reduce((p, fxn, i) => {
                    return p.then(() => {
                        const start = Date.now();

                        return new Promise((resolve) => fxn(req, res, () => resolve()));
                    })
                }, Promise.resolve());
            } catch(e) {
                return res.status(e.status).json(e);
            }
        }
    }
};