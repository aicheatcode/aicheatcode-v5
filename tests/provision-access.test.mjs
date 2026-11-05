import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationPayload} from '../scripts/provision-access.mjs';
test('Access creation payload covers all protected CMS routes on both hostnames',()=>{
 const p=applicationPayload({owner:'owner@example.com',hosts:['cannybrainy.com','aicheatcode-v5.example.workers.dev']});
 assert.equal(p.type,'self_hosted');
 assert.equal(p.destinations.length,10);
 assert(p.destinations.some(x=>x.uri==='cannybrainy.com/api/cms-media'));
 assert.equal(p.policies[0].include[0].email.email,'owner@example.com');
 assert.equal(p.policies[0].decision,'allow');
});
test('Access creation payload does not allow malformed owner emails or hostnames',()=>{
 assert.throws(()=>applicationPayload({owner:'not-an-email',hosts:['cannybrainy.com']}));
 assert.throws(()=>applicationPayload({owner:'owner@example.com',hosts:['invalid host']}));
});
