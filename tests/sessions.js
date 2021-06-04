/*

  Copyright (c) 2020 Cisco and/or its affiliates.

  ----------------------------------------------------------------------------

  The connector session test harness - use command 'mocha session'

  WARNING: Running this script will delete the entire catalog database!

*/

'use strict'; // code assumes ECMAScript 6

// -- dependancies

const DATA = require('./lib/data.js');
const Shared = require('./lib/shared.js');
const Entity = require('./lib/entity.js');
const Connector = require('./lib/connector.js');
const Policy = require('./lib/policy.js');
const Script = require('./lib/script.js');
const chakram = require('chakram');
const expect = chakram.expect;

// --- the test cases

describe('Connector Session Tests', function() {

    this.timeout(0); // we are not interested in non-functional tests here

    // --- before any tests are run

    before(() => {
        return Shared.before_any();
    });

    // --- after all the tests have been run

    after(() => {
        return Shared.after_all(true);
    });

    // --- test context

    let entity = DATA.slug();
    let connector = DATA.slug();
    let script = new Script(entity, connector, DATA.DSP_ID_1);

    it('can create the housing entity', () => {
        return Entity.add(entity);
    });

    it('can create the housing connector', () => {
        return Connector.add(entity, connector);
    });

    it('can create the policy', () => {
        return Policy.add(DATA.DSP_ID_1, DATA.DSP_1);  // DSP_1 is access all areas
    });

    it('- STREAM TESTS -----------------------------------', () => { return true; });

    it('OS > U1 > CT', () => {
        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'close true',
            'present 1',
        ]);
    });

    it('OS > U1 > CF', () => {
        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'close false',
            'present 1',
        ]);
    });

    it('OS > U1 > D1 > CT', () => {
        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'delete 1',
            'absent 1',
            'close true',
            'absent 1',
        ]);
    });

    it('OS > U1 > D1 > CF', () => {
        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'delete 1',
            'absent 1',
            'close false',
            'absent 1',
        ]);
    });

    it('OS > UM > CT', () => {
        return script.run([
            'open stream',
            'upsert 1,2,3,4',
            'present 1,2,3,4',
            'close true',
            'present 1,2,3,4',
        ]);
    });

    it('OS > UM > CF', () => {
        return script.run([
            'open stream',
            'upsert 1,2,3,4',
            'present 1,2,3,4',
            'close false',
            'present 1,2,3,4',
        ]);
    });

    it('OS > UM > DM > CT', () => {
        return script.run([
            'open stream',
            'upsert 1,2,3,4',
            'present 1,2,3,4',
            'delete 1,2',
            'absent 1,2',
            'present 3,4',
            'upsert 5,6',
            'present 3,4,5,6',
            'delete 3,6',
            'present 4,5',
            'absent 3,6',
            'close true',
            'present 4,5',
            'absent 3,6',
        ]);
    });

    it('OS > UM > DM > CF', () => {
        return script.run([
            'open stream',
            'upsert 1,2,3,4',
            'present 1,2,3,4',
            'delete 1,2',
            'absent 1,2',
            'present 3,4',
            'upsert 5,6',
            'present 3,4,5,6',
            'delete 3,6',
            'present 4,5',
            'absent 3,6',
            'close false',
            'present 4,5',
            'absent 3,6',
        ]);
    });

    it('OS > U1 > M1 > U1 > CT', () => {

        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'modify 1',
            'upsert 1',
            'present 1',
            'close true',
            'present 1',
        ]);
    });

    it('OS > U1 > M1 > U1 > D1 > CT', () => {

        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'modify 1',
            'upsert 1',
            'present 1',
            'delete 1',
            'absent 1',
            'close true',
            'absent 1',
        ]);
    });

    it('OS > U1 > M1 > U1 > M1 > U1 > CT', () => {

        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'modify 1',
            'upsert 1',
            'present 1',
            'modify 1',
            'upsert 1',
            'present 1',
            'close true',
            'present 1',
        ]);
    });

    it('- ACCRUE TESTS -----------------------------------', () => { return true; });

    it('OA > U1 > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
        ]);
    });

    it('OA > U1 > CF', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'close false',
            'absent 1',
        ]);
    });

    it('OA > U1 > D1 > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'delete 1',
            'absent 1',
            'close true',
            'absent 1',
        ]);
    });

    it('OA > U1 > D1 > CF', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'delete 1',
            'absent 1',
            'close false',
            'absent 1',
        ]);
    });

    it('OA > U1 > CT > OA > U1 > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open accrue',
            'upsert 2',
            'present 1',
            'absent 2',
            'close true',
            'present 1',
            'present 2',
        ]);
    });

    it('OA > U1 > CT > OA > U1 > CF', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open accrue',
            'upsert 2',
            'present 1',
            'absent 2',
            'close false',
            'present 1',
            'absent 2',
        ]);
    });

    it('OA > U1 > CT > OA > M1 > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open accrue',
            'present 1',
            'modify 1',
            'upsert 1',
            'close true',
            'present 1',
        ]);
    });

    it('OA > U1 > CT > OA > M1 > CF', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open accrue',
            'present 1',
            'modify 1',
            'upsert 1',
            'close false',
            'unmodify 1',
            'present 1',
        ]);
    });

    it('OA > UM > CT > OA > UM > DM > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1,2,3,4',
            'absent 1,2,3,4',
            'close true',
            'present 1,2,3,4',
            'open accrue',
            'present 1,2,3,4',
            'upsert 1,5',
            'present 1,2,3,4',
            'absent 5',
            'delete 2,3',
            'present 2,3',
            'close true',
            'present 1,4,5',
            'absent 2,3',
        ]);
    });

    it('OA > UM > CT > OA > UM > DM > CF', () => {
        return script.run([
            'open accrue',
            'upsert 1,2,3,4',
            'absent 1,2,3,4',
            'close true',
            'present 1,2,3,4',
            'open accrue',
            'present 1,2,3,4',
            'upsert 1,5',
            'present 1,2,3,4',
            'absent 5',
            'delete 2,3',
            'present 2,3',
            'close false',
            'present 1,2,3,4',
            'absent 5',
        ]);
    });

    it('OA > UM > CT > OA > UM > MM > DM > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1,2,3,4,5,6',
            'absent 1,2,3,4,5,6',
            'close true',
            'present 1,2,3,4,5,6',
            'open accrue',
            'present 1,2,3,4,5,6',
            'upsert 1,6,7',
            'delete 2,5',
            'modify 3,4',
            'upsert 3,4',
            'absent 7',
            'close true',
            'present 1,3,4,6,7',
            'absent 2,5',
        ]);
    });

    it('OA > UM > CT > OA > UM > MM > DM > CF', () => {
        return script.run([
            'open accrue',
            'upsert 1,2,3,4,5,6',
            'absent 1,2,3,4,5,6',
            'close true',
            'present 1,2,3,4,5,6',
            'open accrue',
            'present 1,2,3,4,5,6',
            'upsert 1,6,7',
            'delete 2,5',
            'modify 3,4',
            'upsert 3,4',
            'absent 7',
            'close false',
            'unmodify 3,4',
            'present 1,2,3,4,5,6',
            'absent 7',
        ]);
    });

    it('- REPLACE TESTS -----------------------------------', () => { return true; });

    it('OR > U1 > CT', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
        ]);
    });

    it('OR > U1 > CF', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'close false',
            'absent 1',
        ]);
    });

    it('OR > U1 > D1 > CT', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'delete 1',
            'absent 1',
            'close true',
            'absent 1',
        ]);
    });

    it('OR > U1 > D1 > CF', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'delete 1',
            'absent 1',
            'close false',
            'absent 1',
        ]);
    });

    it('OR > U1 > CT > OR > U1 > CT', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open replace',
            'upsert 2',
            'present 1',
            'absent 2',
            'close true',
            'absent 1',
            'present 2',
        ]);
    });

    it('OR > U1 > CT > OR > U1 > CF', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open replace',
            'upsert 2',
            'present 1',
            'absent 2',
            'close false',
            'present 1',
            'absent 2',
        ]);
    });

    it('OR > U1 > CT > OR > M1 > CT', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open replace',
            'modify 1',
            'upsert 1',
            'close true',
            'present 1',
        ]);
    });

    it('OR > U1 > CT > OR > M1 > CF', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open replace',
            'modify 1',
            'upsert 1',
            'close false',
            'unmodify 1',
            'present 1',
        ]);
    });

    it('OR > UM > CT > OR > UM > DM > CT', () => {
        return script.run([
            'open replace',
            'upsert 1,2,3,4',
            'absent 1,2,3,4',
            'close true',
            'present 1,2,3,4',
            'open replace',
            'present 1,2,3,4',
            'upsert 1,5',
            'present 1,2,3,4',
            'absent 5',
            'delete 2,3',
            'present 2,3',
            'close true',
            'present 1,5',
            'absent 2,3,4',
        ]);
    });

    it('OR > UM > CT > OR > UM > DM > CF', () => {
        return script.run([
            'open replace',
            'upsert 1,2,3,4',
            'absent 1,2,3,4',
            'close true',
            'present 1,2,3,4',
            'open replace',
            'present 1,2,3,4',
            'upsert 1,5',
            'present 1,2,3,4',
            'absent 5',
            'delete 2,3',
            'present 2,3',
            'close false',
            'present 1,2,3,4',
            'absent 5',
        ]);
    });

    it('OR > UM > CT > OR > UM > MM > DM > CT', () => {
        return script.run([
            'open replace',
            'upsert 1,2,3,4,5,6',
            'absent 1,2,3,4,5,6',
            'close true',
            'present 1,2,3,4,5,6',
            'open replace',
            'present 1,2,3,4,5,6',
            'upsert 1,6,7',
            'modify 3,4',
            'upsert 3,4',
            'absent 7',
            'close true',
            'present 1,3,4,6,7',
            'absent 2,5',
        ]);
    });

    it('OR > UM > CT > OR > UM > MM > DM > CF', () => {
        return script.run([
            'open replace',
            'upsert 1,2,3,4,5,6',
            'absent 1,2,3,4,5,6',
            'close true',
            'present 1,2,3,4,5,6',
            'open replace',
            'present 1,2,3,4,5,6',
            'upsert 1,6,7',
            'modify 3,4',
            'upsert 3,4',
            'absent 7',
            'close false',
            'unmodify 3,4',
            'present 1,2,3,4,5,6',
            'absent 7',
        ]);
    });

    it('- OVERLAPPING SESSION TESTS -----------------------', () => { return true; });

    it('OS > U1 > OA > U1 > CT', () => {
        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'open accrue',
            'upsert 2',
            'present 1',
            'absent 2',
            'close true',
            'present 1,2',
        ]);
    });

    it('OS > U1 > OR > U1 > CT', () => {
        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'open replace',
            'upsert 2',
            'present 1',
            'absent 2',
            'close true',
            'present 2',
            'absent 1',
        ]);
    });

    it('OA > U1 > OS > U1 > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'open stream',
            'upsert 2',
            'present 2',
            'absent 1',
            'close true',
            'present 2',
            'absent 1',
        ]);
    });

    it('OA > U1 > OR > U1 > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'open replace',
            'upsert 2',
            'absent 1,2',
            'close true',
            'present 2',
            'absent 1',
        ]);
    });

    it('OR > U1 > OS > U1 > CT', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'open stream',
            'upsert 2',
            'present 2',
            'absent 1',
            'close true',
            'present 2',
            'absent 1',
        ]);
    });

    it('OR > U1 > OA > U1 > CT', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'open accrue',
            'upsert 2',
            'absent 1,2',
            'close true',
            'present 2',
            'absent 1',
        ]);
    });

    it('- MIXED SESSION TESTS -----------------------------', () => { return true; });

    it('OS > U1 > CT > OA > CT', () => {
        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'close true',
            'present 1',
            'open accrue',
            'close true',
            'present 1',
        ]);
    });

    it('OS > U1 > CT > OR > CT', () => {
        return script.run([
            'open stream',
            'upsert 1',
            'present 1',
            'close true',
            'present 1',
            'open replace',
            'close true',
            'absent 1',
        ]);
    });

    it('OA > U1 > CT > OS > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open stream',
            'close true',
            'present 1',
        ]);
    });

    it('OA > U1 > CT > OR > CT', () => {
        return script.run([
            'open accrue',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open replace',
            'close true',
            'absent 1',
        ]);
    });

    it('OR > U1 > CT > OS > CT', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open stream',
            'close true',
            'present 1',
        ]);
    });

    it('OR > U1 > CT > OA > CT', () => {
        return script.run([
            'open replace',
            'upsert 1',
            'absent 1',
            'close true',
            'present 1',
            'open accrue',
            'close true',
            'present 1',
        ]);
    });

    it('OS > UM > CT > OA > UM > DM > MM > CT > OR > UM > MM > CT', () => {
        return script.run([
            'open stream',
            'upsert 1,2,3,4',
            'present 1,2,3,4',
            'close true',
            'present 1,2,3,4',
            'open accrue',
            'upsert 4,5,6,7',
            'modify 5,6',
            'upsert 5,6',
            'delete 2',
            'close true',
            'present 1,3,4,5,6,7',
            'absent 2',
            'open replace',
            'upsert 6,7,8,9',
            'modify 7,8',
            'upsert 7,8',
            'delete 4',
            'delete 7',
            'close true',
            'present 6,8,9',
            'absent 1,2,3,4,5,7',
        ]);
    });

    it('Performing random mix tests - expect a delay here...', () => { return true; });

    it('Random mix', () => {
        const COUNT_STEPS = 128;
        const COUNT_RECORDS = 16;

        let steps = [];

        for (let i = 0; i < COUNT_STEPS; i++) {
            let params1 = [];
            let params2 = [];

            for (let j = 0; j < COUNT_RECORDS; j++) {
                params1.push(DATA.anindex());
                params2.push(DATA.anindex());
            }

            steps.push('open ' + (DATA.flip() ? 'stream' : (DATA.flip() ? 'accrue' : 'replace')));
            steps.push('upsert ' + params1.join(',') + ',' + params2.join(','));
            steps.push('modify ' + params1.join(','));
            steps.push('upsert ' + params1.join(','));
            steps.push('delete ' + params2.join(','));
            steps.push('close ' + (DATA.flip() ? 'true' : 'false'));
        }

        //            console.log (steps);
        return script.run(steps);
    });

    it('can delete the housing entity', () => {
        return Entity.delete(entity);
    });
});
