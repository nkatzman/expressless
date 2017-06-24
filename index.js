process.env.NODE_ENV='production'
process.env.NODE_APP_INSTANCE='devices'
const routeId = 'list';
const schemaId = 'fdaDevices';
const schema = require('./lib/schemas/fdaDevices');
const expressless = require('./lib');

exports.devices = expressless.serveSchema(schema, schemaId, routeId);