'use strict';
const assert = require('chai').assert;
const mockery = require('mockery');
const sinon = require('sinon');

sinon.assert.expose(assert, { prefix: '' });

describe('Expressless index', () => {
    let Expressless;
    // let fullSchema;
    let testConfig;
    let testSchemaConfig;
    let handlerInstanceMock;
    let HandlerMock;
    let reqMock;
    let resMock;
    let resStatusMock;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        // fullSchema = {
        //     foo: 'bar'
        // };
        testConfig = { a: 'b' };
        testSchemaConfig = { b: 'c' };
        handlerInstanceMock = {
            validateRequest: sinon.stub().returns(),
            extractParams: sinon.stub().returns({}),
            run: sinon.stub().returns({})
        };
        HandlerMock = {
            config: sinon.stub().returns(),
            create: sinon.stub().returns(handlerInstanceMock)
        };
        reqMock = {
            method: 'get',
            get: name => name,
            path: '/v1/path'
        };
        resStatusMock = {
            json: sinon.stub().returns()
        };
        resMock = {
            status: sinon.stub().returns(resStatusMock)
        };

        mockery.registerMock('./ExpresslessHandler', HandlerMock);

        Expressless = require('../../lib/index'); // eslint-disable-line global-require
    });

    after(() => {
        mockery.disable();
    });

    afterEach(() => {
        mockery.deregisterAll();
        mockery.resetCache();
    });

    describe('#config', () => {
        it('calls the #config of Handler', () => {
            Expressless.config(testConfig);

            assert.calledOnce(HandlerMock.config);
            assert.calledWith(HandlerMock.config, testConfig);
        });

        it('can override ExpresslessHandler with config passed in', () => {
            testConfig.expresslessHandler = {
                config: sinon.stub().returns()
            };

            Expressless.config(testConfig);

            assert.notCalled(HandlerMock.config);
            assert.calledOnce(testConfig.expresslessHandler.config);
            assert.calledWith(testConfig.expresslessHandler.config, testConfig);
        });
    });

    describe('#serveSchema', () => {
        it('calls #config of Handler', () => {
            Expressless.serveSchema(testSchemaConfig, testConfig);

            assert.calledOnce(HandlerMock.config);
        });

        it('calls #create of Handler', () => {
            Expressless.serveSchema(testSchemaConfig, testConfig);

            assert.calledOnce(HandlerMock.create);
        });

        it('returns a function', () => {
            const func = Expressless.serveSchema(testSchemaConfig, testConfig);

            assert.isFunction(func);
        });

        it('calls instance functions with correct params', () => {
            const func = Expressless.serveSchema(testSchemaConfig, testConfig);

            func(reqMock, resMock);

            assert.calledOnce(handlerInstanceMock.validateRequest);
            assert.calledWith(handlerInstanceMock.validateRequest, 'get', 'content-type');
            assert.calledOnce(handlerInstanceMock.extractParams);
            assert.calledWith(handlerInstanceMock.extractParams, '/v1/path');
            assert.calledOnce(handlerInstanceMock.run);
            assert.calledWith(handlerInstanceMock.run, reqMock, resMock);
        });

        it('catches any error thrown', () => {
            const func = Expressless.serveSchema(testSchemaConfig, testConfig);
            const e = {
                status: 401,
                message: 'error'
            };

            handlerInstanceMock.validateRequest.throws(e);

            func(reqMock, resMock);

            assert.calledOnce(resMock.status);
            assert.calledWith(resMock.status, e.status);
            assert.calledOnce(resStatusMock.json);
            assert.calledWith(resStatusMock.json, e);
        });
    });
});
