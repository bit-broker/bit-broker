'use strict'; // code assumes ECMAScript 6

// --- load paths

const PATH_LIB = process.env.PATH_LIB || '../../services/lib';
const PATH_CFG = process.env.PATH_CFG || '../..';

// --- load configuration

require('dotenv').config({ path: `${ PATH_CFG }/.env` });

// --- dependancies

const Server = require(`${ PATH_LIB }/server.js`);

// --- running contexts

var api = new Server('dummy rate limit service', process.env.RATE_SERVICE);

// --- dummy endpoints

api.router.put('/:slug/config', (req, res) => res.send());
api.router.delete('/:slug/config', (req, res) => res.send());

// --- start the server

api.listen();
