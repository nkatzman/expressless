'use strict';
const Joi = require('joi');
const trimString = Joi.string().trim();

const device = {
    id: trimString
        .description('The id of the device'),
    isPublished: Joi.boolean()
        .description('Whether the device is ready and published')
};

module.exports = {
    fdaDevices: {
        schema: device,
        path: '/v1/foo',
        routes: {
            list: '',
            create: {
                method: 'post',
                validation: Joi.object({
                    id: device.id,
                    isPublished: device.isPublished.default(false)
                })
            },
            update: {
                method: 'put',
                path: '/:id',
                validation: Joi.object({
                    isPublished: device.isPublished
                })
            },
            get: '/:id'
        }
    }
};
