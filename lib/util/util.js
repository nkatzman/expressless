'use strict';
const fs = require('fs');
const path = require('path');

module.exports = {
    getExportsFromDirectory(directory) {
        const exportsObject = {};
        let filenames = [];

        try {
            filenames = fs.readdirSync(directory);
        } catch (e) {
            /* empty */
        }

        filenames.forEach((filename) => {
            const name = path.basename(filename, '.js');

            if (name === 'index') {
                return;
            }

            /* eslint-disable global-require */
            exportsObject[name] = require(path.resolve(directory, filename));
            /* eslint-enable global-require */
        });

        return exportsObject;
    }
};
