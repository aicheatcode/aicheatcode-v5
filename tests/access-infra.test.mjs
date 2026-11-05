import test from 'node:test';
import assert from 'node:assert/strict';
import {PROTECTED_PATHS,coversPath,accessDestinations,policyOnlyOwner} from '../scripts/audit-access.mjs';
test('all actual write API routes are protected',()=>{
 assert.deepEqual(PROTECTED_PATHS,['/studio.html','/admin.html','/api/site-cms','/api/cms-media','/api/editor']);
});
test('exact path is not confused with similar API prefixes',()=>{
 assert(coversPath({uri:'cannybrainy.com/api/site-cms'},'/api/site-cms','cannybrainy.com'));
 assert(!coversPath({uri:'cannybrainy.com/api/site'},'/api/site-cms','cannybrainy.com'));
 assert(!coversPath({uri:'cannybrainy.com/api/cms'},'/api/cms-media','cannybrainy.com'));
 assert(!coversPath({uri:'cannybrainy.com/api/editor'},'/api/editor','evil.example.com'));
});
test('wildcard path covers descendants',()=>{
 assert(coversPath({uri:'cannybrainy.com/api/*'},'/api/editor','cannybrainy.com'));
 assert(!coversPath({uri:'cannybrainy.com/admin/*'},'/admin.html','cannybrainy.com'));
});
test('Access destination fields handled',()=>{
 assert.equal(accessDestinations({destinations:[{type:'public',uri:'cannybrainy.com/studio.html'}]}).length,1);
 assert.equal(accessDestinations({self_hosted_domains:['cannybrainy.com/admin.html']}).length,1);
});
test('owner-only policy rejects broad rules or bypass',()=>{
 const email='owner@example.com';
 assert(policyOnlyOwner([{decision:'allow',include:[{email:{email}}]}],email));
 assert(!policyOnlyOwner([{decision:'allow',include:[{email_domain:{domain:'example.com'}}]}],email));
 assert(!policyOnlyOwner([{decision:'bypass',include:[{everyone:{}}]}],email));
 assert(!policyOnlyOwner([{decision:'allow',include:[{email:{email}},{everyone:{}}]}],email));
});