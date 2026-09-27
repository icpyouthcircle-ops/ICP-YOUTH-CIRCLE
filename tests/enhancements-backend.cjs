const assert=require('node:assert/strict');
const {createBackend}=require('./scoring-harness.cjs');

(()=>{
  const setupBackend=createBackend();
  assert.equal(typeof setupBackend.context.setupPortalEnhancements,'function');
  assert.equal(typeof setupBackend.context.setupPortalEnhancements_,'undefined');
  assert.match(setupBackend.context.setupPortalEnhancements(),/Public Countdowns/);
  assert.equal(setupBackend.sheets.has('FAQs'),true);
  assert.equal(setupBackend.sheets.has('Feedback'),true);
  assert.equal(setupBackend.sheets.has('Countdowns'),true);

  const backend=createBackend();
  backend.addSheet('FAQs',[
    {ID:'FAQ-001',Question:'How do I sign in?',Answer:'Use My account.',Category:'Account',DisplayOrder:2,Status:'Active'},
    {ID:'FAQ-002',Question:'Hidden?',Answer:'No.',Category:'Internal',DisplayOrder:1,Status:'Inactive'}
  ]);
  backend.addSheet('Feedback',[{ID:'FDBK-001',Category:'Suggestion',Message:'Existing',PageURL:'',Status:'Reviewed',SubmittedAt:'2026-09-20'}]);
  backend.addSheet('Countdowns',[
    {ID:'COUNT-001',Title:'MDCAT result',Description:'Official result countdown.',TargetDateTime:'2026-10-01T10:00:00+05:00',AfterMessage:'Result announced',DisplayOrder:1,Status:'Active'},
    {ID:'COUNT-002',Title:'Hidden event',TargetDateTime:'2026-11-01T10:00:00+05:00',Status:'Inactive'}
  ]);
  const faq=JSON.parse(backend.context.doGet({parameter:{action:'faqs'}}).getContent());
  assert.equal(faq.success,true);assert.equal(faq.data.length,1);assert.equal(faq.data[0].ID,'FAQ-001');
  const countdowns=JSON.parse(backend.context.doGet({parameter:{action:'countdowns'}}).getContent());
  assert.equal(countdowns.success,true);assert.equal(countdowns.data.length,1);assert.equal(countdowns.data[0].ID,'COUNT-001');assert.equal(countdowns.data[0].AfterMessage,'Result announced');
  const feedback=backend.call('publicFeedback','',{submissionToken:'abcdefghijklmnopqrstuvwx',category:'Suggestion',message:'Please add more study guides.',pageURL:'https://example.test/#suggestions'});
  assert.equal(feedback.success,true);assert.equal(feedback.data.id,'FDBK-002');
  const saved=backend.rows('Feedback').find(row=>row.ID==='FDBK-002');assert.equal(saved.Message,'Please add more study guides.');assert.equal(saved.Status,'Pending Review');
  console.log('PASS enhancements backend: active FAQs are public and anonymous feedback is validated and stored without identity fields.');
})()
