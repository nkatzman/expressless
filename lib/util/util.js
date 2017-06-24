'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Helper method to remove all special characters from the string for use as a fb key
 * @method formatStringForKey
 * @param {String} s         A string to remove special chars from
 */
function formatStringForKey(s) {
    return s.replace(/\.|\$|#|\[|]/g, ',');
}

module.exports = {
    formatStringForKey,
    /**
     * Helper method to read the directory and export the files
     * @method getExportsFromDirectory
     * @param {String} directory         The directory to read from
     */
    getExportsFromDirectory(directory) {
        const filenames = fs.readdirSync(directory);
        const exportsObject = {};

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
    },
    /**
     * Helper method to generate an md5 hash
     * @method generateKey
     * @param {String} str
     */
    generateKey(str) {
        return crypto.createHash('md5').update(str).digest('hex');
    },
    /**
     * Helper method to convert a hash into an array for returning
     * @method formatHashForReturn
     * @param {Object} hash         A hash that needs to be converted to array
     */
    formatHashForReturn(hash = {}) {
        return Object.keys(hash).map(
            i => hash[i]
        ).filter(h => !!h);
    },
    /**
     * Helper method to convert an array into a hash for the store
     * @method formatArrayForStore
     * @param {Array} array         The array to convert
     */
    formatArrayForStore(array = []) {
        const returnHash = {};

        array.forEach((i) => {
            returnHash[formatStringForKey(i)] = i;
        });

        return returnHash;
    },
    /**
     * Helper method to convert an attachments array for the store
     * @method formatAttachmmentsForStore
     * @param {Array} attachments         The attachments to convert
     */
    formatAttachmmentsForStore(attachments = []) {
        const formattedAttachments = {};
        let attachmentCount = 0;

        attachments.forEach((a) => {
            const id = `${Date.now()}-${attachmentCount}`;

            a.id = id;
            formattedAttachments[id] = a;
            attachmentCount += 1;
        });

        return formattedAttachments;
    },
    /**
     * Helper method to find keys that are in obj1 but not in obj2
     * @method findDifferenceInObjects
     * @param  {Object} obj1      Object 1 to compare
     * @param  {Object} obj2      Object 2 to compare
     * @return {Array}            An array of keys that are not in obj2
     */
    findDifferenceInObjects(obj1 = {}, obj2 = {}) {
        const keys1 = Object.keys(obj1);

        return keys1.filter(key => !obj2[key]);
    },
    /**
     * Helper function to get the keys from an array or object
     * @property getKeys
     * @return {Array}              The array of object keys, or array items
     */
    getKeys(obj) {
        let ids;

        if (Array.isArray(obj)) {
            ids = obj;
        } else if (typeof obj === 'object') {
            ids = Object.keys(obj).filter(i => obj[i]);
        }

        return ids.filter(i => !!i);
    }
};
