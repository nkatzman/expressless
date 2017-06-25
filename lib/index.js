'use strict';
let ExpresslessHandler = require('./ExpresslessHandler');

class Expressless {
    static config(config) {
        if (!config) {
            return;
        }

        if (config.expressLessHandler) {
            ExpresslessHandler = expressLessHandler;
        }

        ExpresslessHandler.config(config);

        return;
    }

    static serveSchema(schemaConfig, config) {
        this.config(config);
        const s = ExpresslessHandler.create(schemaConfig);

        return (req, res) => {
            try {
                // Validate function against expected HTTP method
                s.validateRequest(req.method, req.get('content-type'));
                // Call function to extract parameters from the HTTP path
                req.params = s.extractParams(req.path);

                // Run the handler methods with req, res
                return s.run(req, res);
            } catch (e) {
                return res.status(e.status).json(e);
            }
        };
    }
}

// Also export the ExpressLessHandler base class for extending
Expressless.ExpresslessHandler = ExpresslessHandler;

module.exports = Expressless;
