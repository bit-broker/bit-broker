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
var view = new View(process.env.REGISTER_SERVER_BASE, process.env.CATALOG_SERVER_BASE);
var model = new Model();
var log = logger.Logger;

// --- lists all entity types in the register

rest.router.get('/entity', (req, res) => {

    model.register.entity.list()

    .then(items => {
        res.json(view.entities(items));
    })

    .catch(error => {
        rest.error(res, error);
    });
});

// --- shows details of a named entity type

rest.router.get('/entity/:eid', (req, res) => {

    let eid = req.params.eid.toLowerCase();
    model.register.entity.find(eid)

    .then(item => {
        if (item) {
            res.json(view.entity(item));
        } else {
            res.status(HTTP.NOT_FOUND).send();
        }
    })

    .catch(error => {
        rest.error(res, error);
    });
});

// --- adds a new entity type to the register

rest.router.post('/entity/:eid', (req, res) => {
    log.info('register', 'entity', req.params.eid, 'insert');

    let eid = req.params.eid.toLowerCase();
    let description = req.body.description || '';
    let errors = [];

    errors = errors.concat(model.validate.name(eid));
    errors = errors.concat(model.validate.description(description));

    if (errors.length === 0) {
        model.register.entity.find(eid)

        .then(item => {
            if (item) {
                log.info('register', 'entity', eid, 'insert', 'duplicate');
                res.status(HTTP.CONFLICT).send();
            } else {
                model.register.entity.insert(eid, { description })

                .then(() => {
                    log.info('register', 'entity', eid, 'insert', 'complete');
                    res.set({ 'Location': rest.url(req) }).status(HTTP.CREATED).send();
                })

                .catch(error => {
                    rest.error(res, error);
                });
            }
        })

        .catch(error => {
            rest.error(res, error);
        });
    } else {
        res.status(HTTP.BAD_REQUEST).send(errors.join("\n"));
    }
});

// --- modifies an existing entity type

rest.router.put('/entity/:eid', (req, res) => {
    log.info('register', 'entity', req.params.eid, 'update');

    let eid = req.params.eid.toLowerCase();
    let description = req.body.description || '';
    let errors = [];

    errors = errors.concat(model.validate.description(description));

    if (errors.length === 0) {
        model.register.entity.find(eid)

        .then(item => {
            if (item) {
                model.register.entity.update(eid, { description })

                .then(() => {
                    log.info('register', 'entity', eid, 'update', 'complete');
                    res.status(HTTP.NO_CONTENT).send();
                })

                .catch(error => {
                    rest.error(res, error);
                });
            } else {
                res.status(HTTP.NOT_FOUND).send();
            }
        })

        .catch(error => {
            rest.error(res, error);
        });
    } else {
        res.status(HTTP.BAD_REQUEST).send(errors.join("\n"));
    }
});

// --- deletes an entity type from the register

rest.router.delete('/entity/:eid', (req, res) => {
    log.info('register', 'entity', req.params.eid, 'delete');

    let eid = req.params.eid.toLowerCase();
    model.register.entity.find(eid)

    .then(item => {
        if (item) {
            model.register.entity.delete(eid)

            .then(() => {
                log.info('register', 'entity', eid, 'delete', 'complete');
                res.status(HTTP.NO_CONTENT).send();
            })

            .catch(error => {
                rest.error(res, error);
            });
        } else {
            res.status(HTTP.NOT_FOUND).send();
        }
    })

    .catch(error => {
        rest.error(res, error);
    });
});

// --- lists all the connectors for a named entity type

rest.router.get('/entity/:eid/connector', (req, res) => {
    let eid = req.params.eid.toLowerCase();
    model.register.entity.get(eid).list()

    .then(items => {
        res.json(view.connectors(items));
    })

    .catch(error => {
        rest.error(res, error);
    });
});

// --- shows details of a named connector on a named entity type

rest.router.get('/entity/:eid/connector/:cid', (req, res) => {

    let eid = req.params.eid.toLowerCase();
    let cid = req.params.cid.toLowerCase();
    model.register.entity.get(eid).find(cid)

    .then(item => {
        if (item) {
            res.json(view.connector(item));
        } else {
            res.status(HTTP.NOT_FOUND).send();
        }
    })

    .catch(error => {
        rest.error(res, error);
    });
});

// --- adds a new connector to a named entity type

rest.router.post('/entity/:eid/connector/:cid', (req, res) => {
    log.info('register', 'entity', req.params.eid, 'connector', req.params.cid, 'insert');

    let eid = req.params.eid.toLowerCase();
    let cid = req.params.cid.toLowerCase();
    let description = req.body.description || '';
    let webhook = req.body.webhook || '';
    let cache = req.body.cache || 0;
    let errors = [];

    errors = errors.concat(model.validate.name(cid));
    errors = errors.concat(model.validate.description(description));
    errors = errors.concat(model.validate.webhook(webhook));
    errors = errors.concat(model.validate.cache(cache));

    if (errors.length === 0) {
        model.register.entity.get(eid).find(cid)

        .then(item => {
            if (item) {
                log.info('register', 'entity', eid, 'connector', cid, 'insert', 'duplicate');
                res.status(HTTP.CONFLICT).send();
            } else {
                model.register.entity.get(eid).insert(cid, { description, webhook, cache })

                .then(done => {
                    if (done) {
                        log.info('register', 'entity', eid, 'connector', cid, 'insert', 'complete');
                        res.set({ 'Location': rest.url(req) }).status(HTTP.CREATED).send();
                    } else {
                        res.status(HTTP.NOT_FOUND).send(); // entity was not present
                    }
                })

                .catch(error => {
                    rest.error(res, error);
                });
            }
        })

        .catch(error => {
            rest.error(res, error);
        });
    } else {
        res.status(HTTP.BAD_REQUEST).send(errors.join("\n"));
    }
});

// --- modifies an existing connector on the named entity type

rest.router.put('/entity/:eid/connector/:cid', (req, res) => {
    log.info('register', 'entity', req.params.eid, 'connector', req.params.cid, 'update');

    let eid = req.params.eid.toLowerCase();
    let cid = req.params.cid.toLowerCase();
    let description = req.body.description || '';
    let webhook = req.body.webhook || '';
    let cache = req.body.cache || 0;
    let errors = [];

    errors = errors.concat(model.validate.description(description));
    errors = errors.concat(model.validate.webhook(webhook));
    errors = errors.concat(model.validate.cache(cache));

    if (errors.length === 0) {
        model.register.entity.get(eid).find(cid)

        .then(item => {
            if (item) {
                model.register.entity.get(eid).update(cid, { description, webhook, cache })

                .then(() => {
                    log.info('register', 'entity', eid, 'connector', cid, 'update', 'complete');
                    res.status(HTTP.NO_CONTENT).send();
                })

                .catch(error => {
                    rest.error(res, error);
                });
            } else {
                res.status(HTTP.NOT_FOUND).send();
            }
        })

        .catch(error => {
            rest.error(res, error);
        });
    } else {
        res.status(HTTP.BAD_REQUEST).send(errors.join("\n"));
    }
});

// --- deletes a connector on the named entity type

rest.router.delete('/entity/:eid/connector/:cid', (req, res) => {
    log.info('register', 'entity', req.params.eid, 'connector', req.params.cid, 'delete');

    let eid = req.params.eid.toLowerCase();
    let cid = req.params.cid.toLowerCase();
    model.register.entity.get(eid).find(cid)

    .then(item => {
        if (item) {
            model.register.entity.get(eid).delete(cid)

            .then(() => {
                log.info('register', 'entity', eid, 'connector', cid, 'update', 'complete');
                res.status(HTTP.NO_CONTENT).send();
            })

            .catch(error => {
                rest.error(res, error);
            });
        } else {
            res.status(HTTP.NOT_FOUND).send();
        }
    })

    .catch(error => {
        rest.error(res, error);
    });
});

// --- main entry point

rest.listen();
