'use strict';
process.env.NODE_ENV = 'production';
process.env.NODE_APP_INSTANCE = 'devices';
const routeId = 'list';
const schemaId = 'fdaDevices';
const schema = require('./fdaDevices');
const expressless = require('../lib');

const defaultHandlers = {
    get: function(routeInfo, req, res, next) {
        console.log('!!!!!!!!!!!!!!!!!!!!!!');
        res.json({
            foo: 'This is an override baby'
        });

        next();
    }
}

// console.log(expressless);

exports.devices = expressless.serveSchema({ schema, schemaId, routeId , defaultHandlers });
