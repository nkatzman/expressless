'use strict';
/* eslint-disable no-underscore-dangle */
const winston = require('winston');
let _logger = null;

class Logger {
    constructor() {
        this._logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({
                    timestamp() {
                        return Date.now();
                    }
                })
            ]
        });
    }

    log() {
        this.getWinston().info.apply(this, arguments);
    }

    info() {
        this.getWinston().info.apply(this, arguments);
    }

    error() {
        this.getWinston().error.apply(this, arguments);
    }

    debug() {
        this.getWinston().debug.apply(this, arguments);
    }

    getWinston() {
        return this._logger;
    }

    static getLogger() {
        if (!_logger) {
            _logger = new Logger();
        }

        return _logger;
    }
}

module.exports = Logger;
