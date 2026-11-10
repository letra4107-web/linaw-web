import test from 'node:test';import assert from 'node:assert/strict';import {loadTs} from './helpers/load-ts.mjs';
const {rememberChildCredential,credentialEmailNotice}=loadTs('src/lib/parentCredentials.ts');
const receipt=(name,password='synthetic')=>({username:name+'@example.invalid',childName:name,password});
test('a second enrollment retains the first child login until acknowledged',()=>{let state=rememberChildCredential([],receipt('Una'));state=rememberChildCredential(state,receipt('Ikalawa'));assert.deepEqual(Array.from(state,x=>x.childName),['Ikalawa','Una']);});
test('a password reset replaces only that child receipt',()=>{let state=[receipt('Una'),receipt('Ikalawa')];state=rememberChildCredential(state,receipt('Una','changed-synthetic'));assert.equal(state.length,2);assert.equal(state[0].password,'changed-synthetic');assert.equal(state[1].childName,'Ikalawa');});
test('email status never reports successful delivery for failed or missing receipts',()=>{assert.match(credentialEmailNotice(false),/Hindi naipadala/);assert.match(credentialEmailNotice(),/Hindi nakumpirma/);assert.match(credentialEmailNotice(true),/Tinanggap ng email service/);});
