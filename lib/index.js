'use strict';
const schemaHandler = require('./schemaHandler');

module.exports = {
    serveSchema(schema, schemaId, routeId, defaultHandlers) {
        const s = schemaHandler.flatten({ schema, schemaId, routeId, defaultHandlers });

        return (req, res) => {
            try {
                s.validateRequest(req.method, req.get('content-type'));
                // Re assign req.params to an express like params
                req.params = s.extractParams(req.path);

                // Run with req, res
                return s.run(req, res);
            } catch (e) {
                return res.status(e.status).json(e);
            }
        };
    }
};
