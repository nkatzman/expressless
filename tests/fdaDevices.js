'use strict';
const Joi = require('joi');
const trimString = Joi.string().trim();

const device = {
    id: trimString
        .description('The id of the device'),
    isPublished: Joi.boolean()
        .description('Whether the device is ready and published'),
    pdf_url: trimString
        .description('The url of the pdf for the device submission'),
    pdf_text: trimString
        .description('The text extracted from the pdf'),
    specialties: Joi.array()
        .description('An array of specialty classifications for a device'),
    device_name: trimString
        .description('The device name'),
    company_name: trimString
        .description('The company name'),
    applicant: trimString
        .description('The name/address of the application for the device'),
    applicant_contact: trimString
        .description('The name of the contact'),
    correspondent: trimString
        .description('The name/address of the application for the device'),
    correspondent_contact: trimString
        .description('The name of the contact'),
    decision_date: trimString
        .description('The approval date of the device'),
    // These are the HTML attributes for displaying
    // These are top level attributes for the information we want to display
    shortDescription: trimString
        .description('A short description what the device is'),
    relevantCasesHTML: trimString
        .description('The HTML for the relevant cases'),
    advantagesHTML: trimString
        .description('The HTML for the advantages'),
    deviceDescriptionHTML: trimString
        .description('The HTML for the device description'),
    intendedUseHTML: trimString
        .description('The HTML for the intended use'),
    deviceInfoHTML: trimString
        .description('The HTML for the device info page'),
    companyInfoHTML: trimString
        .description('The HTML for the company info page'),
    publications: Joi.array()
        .description('An array of publications for the device'),
    videos: Joi.array()
        .description('An array of videos for the device'),
    images: Joi.array()
        .description('An array of images'),
    attachments: Joi.array()
        .description('An array of attachments'),
    type: trimString
        .valid('510k')
        .description('The type of approval')
};

module.exports = {
    fdaDevices: {
        schema: device,
        path: '/v1/devices',
        useFactory: 'fdaDevices',
        routes: {
            list: '',
            create: {
                method: 'post',
                validation: Joi.object({
                    id: device.id,
                    isPublished: device.isPublished.default(false),
                    pdf_url: device.pdf_url,
                    pdf_text: device.pdf_text,
                    specialties: device.specialties,
                    device_name: device.device_name,
                    company_name: device.company_name,
                    applicant: device.applicant,
                    applicant_contact: device.applicant_contact,
                    correspondent: device.correspondent,
                    correspondent_contact: device.correspondent_contact,
                    decision_date: device.decision_date,
                    shortDescription: device.shortDescription,
                    relevantCasesHTML: device.relevantCasesHTML,
                    advantagesHTML: device.advantagesHTML,
                    deviceDescriptionHTML: device.deviceDescriptionHTML,
                    intendedUseHTML: device.intendedUseHTML,
                    deviceInfoHTML: device.deviceInfoHTML,
                    companyInfoHTML: device.companyInfoHTML,
                    videos: device.videos,
                    images: device.images,
                    attachments: device.attachments,
                    publications: device.publications,
                    type: device.type
                }).requiredKeys(
                    'id', 'device_name', 'type'
                ).optionalKeys(
                    'pdf_url', 'pdf_text', 'specialties', 'decision_date',
                    'applicant', 'applicant_contact', 'isPublished',
                    'correspondent', 'correspondent_contact',
                    'deviceInfoHTML', 'companyInfoHTML', 'videos',
                    'company_name', 'publications', 'shortDescription',
                    'relevantCasesHTML', 'advantagesHTML', 'deviceDescriptionHTML',
                    'intendedUseHTML', 'images', 'attachments'
                )
            },
            update: {
                method: 'put',
                path: '/:id',
                validation: Joi.object({
                    isPublished: device.isPublished,
                    pdf_url: device.pdf_url,
                    pdf_text: device.pdf_text,
                    specialties: device.specialties,
                    device_name: device.device_name,
                    company_name: device.company_name,
                    applicant: device.applicant,
                    applicant_contact: device.applicant_contact,
                    correspondent: device.correspondent,
                    correspondent_contact: device.correspondent_contact,
                    decision_date: device.decision_date,
                    shortDescription: device.shortDescription,
                    relevantCasesHTML: device.relevantCasesHTML,
                    advantagesHTML: device.advantagesHTML,
                    deviceDescriptionHTML: device.deviceDescriptionHTML,
                    intendedUseHTML: device.intendedUseHTML,
                    deviceInfoHTML: device.deviceInfoHTML,
                    companyInfoHTML: device.companyInfoHTML,
                    videos: device.videos,
                    images: device.images,
                    attachments: device.attachments,
                    publications: device.publications
                }).optionalKeys(
                    'device_name', 'company_name', 'pdf_url', 'pdf_text', 'specialties',
                    'decision_date', 'applicant', 'applicant_contact',
                    'correspondent', 'correspondent_contact', 'isPublished',
                    'deviceInfoHTML', 'companyInfoHTML', 'videos', 'publications',
                    'shortDescription', 'relevantCasesHTML', 'advantagesHTML',
                    'deviceDescriptionHTML', 'intendedUseHTML', 'images', 'attachments'
                )
            },
            interested: {
                method: 'put',
                path: '/:id/interested',
                validation: Joi.object({
                    email: trimString
                }).requiredKeys('email'),
                useFactoryMethod: 'setAsInterested'
            },
            get: '/:id',
            updateIssue: {
                method: 'put',
                path: '/newsletters/:id',
                validation: Joi.object({
                    ids: Joi.array(),
                    publishDate: trimString
                }).requiredKeys('ids')
                    .optionalKeys('publishDate'),
                useFactoryMethod: 'updateIssue'
            },
            getIssue: {
                method: 'list',
                path: '/newsletters/:id',
                useFactoryMethod: 'getIssue'
            }
        }
    }
};
