'use strict'; // code assumes ECMAScript 6

// --- load paths

const PATH_LIB = process.env.PATH_LIB || '../../services/lib';
const PATH_CFG = process.env.PATH_CFG || '../..';

// --- load configuration

require('dotenv').config({ path: `${ PATH_CFG }/.env` });

// --- dependancies

const Server = require(`${ PATH_LIB }/server.js`);
const crypto = require('crypto')

// --- running contexts

var api = new Server('dummy auth service', process.env.AUTH_SERVICE);

// --- dummy endpoints

api.router.post('/token', (req, res) => {
    let jti = crypto.randomUUID();
    let token = `${ crypto.randomUUID() }.${ crypto.randomUUID() }.${ crypto.randomUUID() }`;
    res.json({ jti, token });
});

api.router.delete('/token', (req, res) => {
    res.send();
});

// --- start the server

api.listen();
