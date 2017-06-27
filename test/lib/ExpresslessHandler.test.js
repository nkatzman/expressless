'use strict';

const assert = require('chai').assert;
const mockery = require('mockery');
const sinon = require('sinon');

sinon.assert.expose(assert, { prefix: '' });

describe('Expressless Handler', () => {
    let Handler;
    let Joi;
    let testModelSchema;
    let testHeaderValidation;
    let testBodyValidation;
    let testRouteNameHandler;
    let testFunctionName;
    let fullSchema;
    let utilMock;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        Joi = require('joi'); // eslint-disable-line global-require
        testModelSchema = Joi.object();
        testHeaderValidation = Joi.object();
        testBodyValidation = Joi.object();
        testRouteNameHandler = 'routes.handlerName';
        testFunctionName = 'list';
        fullSchema = {
            id: 'id',
            schema: testModelSchema,
            useFactory: 'factoryName',
            path: '/v1/path',
            routes: {
                list: '',
                get: '/some/:id',
                route3: {
                    id: 'anId',
                    method: 'post',
                    path: '/some/:id',
                    headerValidation: testHeaderValidation,
                    validation: testBodyValidation,
                    postValidation: testRouteNameHandler,
                    loadFactory: testRouteNameHandler,
                    useFactoryMethod: testFunctionName,
                    handler: testRouteNameHandler,
                    postHandler: testRouteNameHandler,
                    middlewares: [() => {}]
                }
            }
        };
        utilMock = {
            getExportsFromDirectory: sinon.stub().returns({
                fakeRoutes: {
                    fakeLoadFactory() {},
                    fakePostValidation() {},
                    fakeRouteHandler() {},
                    fakePostRouteHandler() {}
                }
            })
        };

        mockery.registerMock('./util/util', utilMock);

        Handler = require('../../lib/ExpresslessHandler'); // eslint-disable-line global-require
    });

    after(() => {
        mockery.disable();
    });

    afterEach(() => {
        mockery.deregisterAll();
        mockery.resetCache();
    });

    describe('#validateSchema', () => {
        it('validates simple schema', () => {
            const schema = {
                schema: testModelSchema,
                path: '/v1/path'
            };

            assert.doesNotThrow(() => Handler.validateSchema(schema));
        });

        it('validates a full schema', () => {
            assert.doesNotThrow(() => Handler.validateSchema(fullSchema));
        });

        describe('does not validate', () => {
            it('unknown keys', () => {
                fullSchema.foo = 'bar';

                assert.throws(() => Handler.validateSchema(fullSchema));
            });

            it('unknown methods', () => {
                fullSchema.routes.route3.method = 'bar';

                assert.throws(() => Handler.validateSchema(fullSchema));
            });
        });
    });

    describe('#config', () => {
        it('has the method', () => {
            assert.isFunction(Handler.config);
            Handler.config();
        });
    });

    describe('#create', () => {
        it('returns a Handler instance', () => {
            const handler = Handler.create({
                schema: fullSchema,
                routeId: 'route3'
            });

            assert.instanceOf(handler, Handler, 'Does not return instance of class');
        });

        it('returns a Handler instance with a specified schemaId', () => {
            const handler = Handler.create({
                schema: { testSchema: fullSchema },
                schemaId: 'testSchema',
                routeId: 'route3'
            });

            assert.instanceOf(handler, Handler, 'Does not return instance of class');
        });

        it('has an httpMethod accessor', () => {
            const routeId = 'get';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.equal(handler.httpMethod, routeId);
        });

        it('has an httpRoute accessor', () => {
            const routeId = 'get';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.equal(handler.httpRoute, '/v1/path/some/:id');
        });

        it('has a methods accessor', () => {
            const routeId = 'get';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.equal(handler.methods.length, 3);
        });

        it('ignores non existent route handlers', () => {
            const routeId = 'route4';

            fullSchema.routes[routeId] = {
                method: 'get',
                loadFactory: 'fakeRoutes.fakeLoadFactory',
                postValidation: 'fakeRoutes.fakePostValidation',
                handler: 'fakeRoutesDoesNotExist.fakeRouteHandler',
                postHandler: 'fakeRoutes.fakePostRouteHandlerDoesNotExist'
            };

            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.equal(handler.methods.length, 4);
        });

        it('handles specific handlers', () => {
            const routeId = 'route4';

            fullSchema.routes[routeId] = {
                method: 'get',
                loadFactory: 'fakeRoutes.fakeLoadFactory',
                postValidation: 'fakeRoutes.fakePostValidation',
                handler: 'fakeRoutes.fakeRouteHandler',
                postHandler: 'fakeRoutes.fakePostRouteHandler'
            };

            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.equal(handler.methods.length, 5);
        });

        it('throws error when handlerMethod is wrong', () => {
            const routeId = 'route3';

            fullSchema.routes[routeId] = '';

            const schemaConfig = {
                schema: fullSchema,
                routeId
            };

            assert.throws(() => Handler.create(schemaConfig));
        });
    });

    describe('.extractParms', () => {
        it('returns an empty params with no params', () => {
            const routeId = 'list';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.deepEqual(handler.extractParams('/v1/path'), {});
        });

        it('returns params when path has :id', () => {
            const routeId = 'get';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.deepEqual(handler.extractParams('/v1/path/some/id'), {
                id: 'id'
            });
        });

        it('throws a forbidden error if path does not match', () => {
            const routeId = 'get';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.throws(() => handler.extractParams('/v1/path/wont/work'));
            assert.throws(() => handler.extractParams('/v1/path/nope'));
            assert.throws(() => handler.extractParams());
        });
    });

    describe('.validateRequest', () => {
        it('supports the correct method', () => {
            const routeId = 'get';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert(handler.validateRequest('GET'));
        });

        it('supports the correct method for post', () => {
            const routeId = 'route3';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert(handler.validateRequest('POST', 'application/json'));
        });

        it('throws an error when invalid method', () => {
            const routeId = 'get';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.throws(() => handler.validateRequest('POST', 'application/json'));
        });

        it('requires a specific content-type for POST and PUT', () => {
            const routeId = 'route3';
            const handler = Handler.create({
                schema: fullSchema,
                routeId
            });

            assert.throws(() => handler.validateRequest('POST'));
        });
    });

    describe('.run', () => {
        it('runs default handlers', () => {
            const routeId = 'get';
            let handlerCall = 0;
            const reqMock = sinon.stub();
            const resMock = sinon.stub();
            const handler = Handler.create({
                schema: fullSchema,
                routeId,
                defaultHandlers: {
                    loadUser: (routeInfo, req, res, next) => {
                        assert.equal(handlerCall, 0);
                        assert.strictEqual(req, reqMock);
                        assert.strictEqual(res, resMock);
                        handlerCall += 1;
                        next();
                    },
                    loadFactory: (routeInfo, req, res, next) => {
                        assert.equal(handlerCall, 1);
                        assert.strictEqual(req, reqMock);
                        assert.strictEqual(res, resMock);
                        handlerCall += 1;
                        next();
                    },
                    get: (routeInfo, req, res, next) => {
                        assert.equal(handlerCall, 2);
                        assert.strictEqual(req, reqMock);
                        assert.strictEqual(res, resMock);
                        handlerCall += 1;
                        next();
                    }
                }
            });

            return handler.run(reqMock, resMock)
                .then(() => {
                    assert.equal(handlerCall, 3);
                });
        });

        it('catches errors', () => {
            const routeId = 'get';
            const reqMock = sinon.stub();
            const resMock = sinon.stub();
            const handler = Handler.create({
                schema: fullSchema,
                routeId,
                defaultHandlers: {
                    get: () => {
                        throw new Error('foo');
                    }
                }
            });

            return handler.run(reqMock, resMock);
        });
    });
});
