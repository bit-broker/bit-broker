/*

  Copyright (c) 2021 Cisco and/or its affiliates.

  Licensed under the Apache License, Version 2.0 (the "License"); you may not
  use this file except in compliance with the License. You may obtain a copy of
  the License at:

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,WITHOUT
  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
  License for the specific language governing permissions and limitations
  under the License.

  ----------------------------------------------------------------------------

  The bit-broker register server, offering services to manipulate the entity
  register.

*/

'use strict'; // code assumes ECMAScript 6

// --- load paths

const PATH_LIB = process.env.PATH_LIB || '../lib';
const PATH_CONFIG = process.env.PATH_CONFIG || '..';

// --- load configuration

require('dotenv').config({ path: `${ PATH_CONFIG }/.env` });

// --- dependancies

const Server = require(`${ PATH_LIB }/server.js`);
const Model = require(`${ PATH_LIB }/model.js`);
const View = require(`${ PATH_LIB }/view.js`);
const HTTP = require('http-status-codes');
const logger = require(`${ PATH_LIB }/logger.js`);

// --- running contexts

var rest = new Server(process.env.REGISTER_SERVER_NAME, process.env.REGISTER_SERVER_BASE);
var view = new View(process.env.REGISTER_SERVER_BASE);
var model = new Model();
var log = logger.Logger;

// --- lists all entity types in the register

rest.router.get('/register', (req, res) => {

    model.register.list()

    .then(items => {
        res.json(view.entities(items));
    })

    .catch((error) => {
        rest.error(res, error);
    });
});

// --- shows details of an entity type

rest.router.get('/register/:eid', (req, res) => {

    let name = req.params.eid;
    model.register.find(name)

    .then(item => {
        if (item) {
            res.json(view.entity(item));
        } else {
            res.status(HTTP.NOT_FOUND).send();
        }
    })

    .catch((error) => {
        rest.error(res, error);
    });
});

// --- adds a new entity type to the register

rest.router.post('/register/:eid', (req, res) => {
    log.info('register', 'entity', 'insert', req.params.eid);

    let name = req.params.eid;
    let description = req.body.description || '';
    let errors = [];

    errors = errors.concat(model.validate.name(name));
    errors = errors.concat(model.validate.description(description));

    if (errors.length === 0) {
        model.register.find(name)

        .then(item => {
            if (item) {
                log.info('register', 'entity', 'insert', 'duplicate', name);
                res.status(HTTP.CONFLICT).send();
            } else {
                model.register.insert(name, description)

                .then(() => {
                    log.info('register', 'entity', 'insert', 'complete', name);
                    res.set({ 'Location': rest.url(req) }).status(HTTP.CREATED).send();
                })

                .catch((error) => {
                    rest.error(res, error);
                });
            }
        })

        .catch((error) => {
            rest.error(res, error);
        });
    } else {
        res.status(HTTP.BAD_REQUEST).send(errors.join("\n"));
    }
});

// --- modifies an existing entity type

rest.router.put('/register/:eid', (req, res) => {
    log.info('register', 'entity', 'update', req.params.eid);

    let name = req.params.eid;
    let description = req.body.description || '';
    let errors = [];

    errors = errors.concat(model.validate.description(description));

    if (errors.length === 0) {
        model.register.find(name)

        .then(item => {
            if (item) {
                model.register.update(name, description)

                .then(() => {
                    log.info('register', 'entity', 'update', 'complete', name);
                    res.status(HTTP.NO_CONTENT).send();
                })

                .catch((error) => {
                    rest.error(res, error);
                });
            } else {
                res.status(HTTP.NOT_FOUND).send();
            }
        })

        .catch((error) => {
            rest.error(res, error);
        });
    } else {
        res.status(HTTP.BAD_REQUEST).send(errors.join("\n"));
    }
});

// --- deletes an entity type from the register

rest.router.delete('/register/:eid', (req, res) => {
    log.info('register', 'entity', 'delete', req.params.eid);

    let name = req.params.eid;
    model.register.find(name)

    .then((item) => {
        if (item) {
            model.register.delete(name)

            .then(() => {
                log.info('register', 'entity', 'delete', 'complete', name);
                res.status(HTTP.NO_CONTENT).send();
            })

            .catch((error) => {
                rest.error(res, error);
            });
        } else {
            res.status(HTTP.NOT_FOUND).send();
        }
    })

    .catch((error) => {
        rest.error(res, error);
    });
});

// --- main entry point

rest.listen();
