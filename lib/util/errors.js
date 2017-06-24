'use strict';
const HttpError = require('node-http-error');
const defaultMessage = {
    403: 'Forbidden',
    401: 'Unauthorized'
};

module.exports = {
    create(code, message) {
        return new HttpError(code, message || defaultMessage[code] || `${code}Error`);
    }
};
