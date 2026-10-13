const assert=require('node:assert/strict');
const {createBackend}=require('./scoring-harness.cjs');

const backend=createBackend();
backend.context.setupQASystem_();
backend.addSheet('QNA_Contributors',[{ID:'QAC-1',Email:'teacher@example.test',DisplayName:'Ms Ayesha',Role:'Teacher',Status:'Active'}]);
const alice=backend.token('alice',{}, {email:'alice@example.test'});
const teacher=backend.token('teacher',{}, {email:'teacher@example.test'});
const ok=result=>{assert.equal(result.success,true,JSON.stringify(result));return result.data;};
const bad=(result,code)=>{assert.equal(result.success,false);assert.equal(result.error.code,code);};

bad(backend.call('qaCreateQuestion',alice,{subject:'Physics',title:'Short',body:'Too short'}),'BAD_REQUEST');
const question=ok(backend.call('qaCreateQuestion',alice,{subject:'Physics',title:'Why does projectile velocity change?',body:'Please explain why horizontal velocity stays constant while vertical velocity changes.',tags:'projectile motion',displayName:'Muneeb'}));
assert.match(question.id,/^QAQ-/);assert.equal(question.status,'Active');
bad(backend.call('qaCreateQuestion',alice,{subject:'Physics',title:'Why does projectile velocity change?',body:'Please explain why horizontal velocity stays constant while vertical velocity changes.',tags:'projectile motion',displayName:'Muneeb'}),'DUPLICATE');

let questions=JSON.parse(backend.context.doGet({parameter:{action:'qaQuestions'}}).getContent()).data;
assert.equal(questions.length,1);assert.equal(questions[0].DisplayName,'Muneeb');assert.equal(questions[0].UserID,undefined);

const pending=ok(backend.call('qaCreateAnswer',alice,{questionId:question.id,body:'The horizontal component has no acceleration when air resistance is ignored, while gravity changes the vertical component.',sources:'First-year physics textbook',displayName:'Muneeb'}));
assert.equal(pending.status,'Pending Review');
const verified=ok(backend.call('qaCreateAnswer',teacher,{questionId:question.id,body:'Gravity acts vertically downward. Therefore the horizontal component remains constant, while the vertical component changes by g every second.',sources:'Physics textbook, projectile motion chapter'}));
assert.equal(verified.status,'Active');
bad(backend.call('qaCreateAnswer',alice,{questionId:question.id,body:'Gravity acts vertically downward. Therefore the horizontal component remains constant, while the vertical component changes by g every second.',sources:'Copied'}),'DUPLICATE');

let answers=JSON.parse(backend.context.doGet({parameter:{action:'qaAnswers',questionId:question.id}}).getContent()).data;
assert.equal(answers.length,1);assert.equal(answers[0].AuthorVerified,true);assert.equal(answers[0].AuthorRole,'Teacher');assert.equal(answers[0].UserID,undefined);
let vote=ok(backend.call('qaVote',alice,{answerId:verified.id,value:1}));assert.equal(vote.score,1);assert.equal(vote.value,1);
vote=ok(backend.call('qaVote',alice,{answerId:verified.id,value:1}));assert.equal(vote.score,0);assert.equal(vote.value,0);
bad(backend.call('qaVote',teacher,{answerId:verified.id,value:1}),'BAD_REQUEST');

const report=ok(backend.call('qaReport',alice,{entityType:'Answer',entityId:verified.id,reason:'Incorrect information',details:'Please review the explanation.'}));
const repeated=ok(backend.call('qaReport',alice,{entityType:'Answer',entityId:verified.id,reason:'Other',details:'Duplicate report.'}));
assert.equal(report.id,repeated.id);assert.equal(backend.rows('QNA_Reports').length,1);

console.log('PASS Q&A backend: authenticated questions and answers; verified contributors; moderation; duplicate blocking; private identities; voting; reporting.');
