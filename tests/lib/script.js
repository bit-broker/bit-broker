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

  Shared class for running session scripts

*/

'use strict'; // code assumes ECMAScript 6

// --- dependancies

const DATA = require('./data.js');
const Shared = require('./shared.js');
const Session = require('./session.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- script class module.exports

module.exports = class Script {

    // --- class constructor

    constructor(entity, connector, policy) {
        this.entity = entity;
        this.connector = connector;
        this.policy = { headers: { 'x-bb-policy': policy }};
        this.session = {};
    }

    // --- open a session

    _op_open(mode) {
        return Session.open(this.entity, this.connector, mode, (info => this.session = info));
    }

    // --- submit records into a session

    _op_submit(action, records) {
        return Session.action(this.session.cid, this.session.sid, action, records);
    }

    // --- close a session

    _op_close(commit) {
        return Session.close(this.session.cid, this.session.sid, commit == 'true')
    }

    // --- check records are present or absent

    _op_check(given, present) {
        return chakram.get(`${ process.env.CONSUMER_BASE }/entity/${ this.entity }`, this.policy)
        .then(response => {
            expect(response.body).to.be.an('array');

            for (let i = 0; i < given.length; i++) {
                let found = response.body.find(e => e.name === given[i].name);
                present ? expect(found).to.be.an('object') : expect(found).to.be.undefined;
            }

            return chakram.wait();
        });
    }

    // --- check records are present

    _op_present(given) {
        return this._op_check(given, true);
    }

    // --- check records are absent

    _op_absent(given) {
        return this._op_check(given, false);
    }

    // --- modify records

    _op_modify(indexes, add) {
        for (let i = 0; i < indexes.length; i++) {
            let index = indexes[i];
            let current = DATA.record(index).name;
            DATA.record(index).name = add ? current + '_' : current.slice(0, -1);
        }
    }

    // --- trace output, useful for debugging scripts

    _op_trace(text) {
        console.log(text);
        return Promise.resolve(true);
    }

    // --- wipe the whole entity collection

    _op_wipe(given) {
        return Shared.wipe();
    }

    // --- run the given script

    run(steps, wipe = true) {
        let step = Promise.resolve();
        if (wipe) steps.push('wipe');

        for (let i = 0; i < steps.length; i++) {
            step = step.then(() => {

                let params = steps[i].replace(/,/g, ' ').split(' ').filter(n => n);
                let operation = params.shift();

                switch (operation) {
                    case 'open':
                        return this._op_open(params.shift());

                    case 'upsert':
                        return this._op_submit('upsert', DATA.records(params));

                    case 'delete':
                        return this._op_submit('delete', DATA.records(params)); // DATA.keys(DATA.records(params)));

                    case 'close':
                        return this._op_close(params.shift());

                    case 'present':
                        return this._op_present(DATA.records(params));

                    case 'absent':
                        return this._op_absent(DATA.records(params));

                    case 'modify':
                        return this._op_modify(params, true);

                    case 'unmodify':
                        return this._op_modify(params, false);

                    case 'trace':
                        return this._op_trace(params.join(' ')); // useful for debugging scripts

                    case 'wipe':
                        return this._op_wipe();

                    default:
                        expect(true).to.be.eq(false); // this is alwats a test fail
                }
            });
        }

        return step; // returns the last step
    }
}
