import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoCaptcha,verifyDemoCaptcha} from '../src/domain/loginCaptcha.js';
test('演示验证码可校验、过期，且每次尝试只使用一次',()=>{
 const challenge=createDemoCaptcha(1000);
 assert.match(challenge.image,/^data:image\/svg\+xml;base64,/);
 assert.equal(verifyDemoCaptcha(challenge,challenge.answer,1001),true);
 assert.throws(()=>verifyDemoCaptcha(challenge,challenge.answer,1002),/刷新/);
 const wrong=createDemoCaptcha(1000);
 assert.throws(()=>verifyDemoCaptcha(wrong,'bad',1001),/验证码/);
 assert.throws(()=>verifyDemoCaptcha(wrong,wrong.answer,1002),/刷新/);
 const expired=createDemoCaptcha(1000);
 assert.throws(()=>verifyDemoCaptcha(expired,expired.answer,121001),/过期/);
 assert.notEqual(createDemoCaptcha().id,createDemoCaptcha().id);
});
