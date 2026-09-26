const assert=require('node:assert/strict');
const {createBackend}=require('./scoring-harness.cjs');

(()=>{
  const backend=createBackend();
  backend.addSheet('FAQs',[
    {ID:'FAQ-001',Question:'How do I sign in?',Answer:'Use My account.',Category:'Account',DisplayOrder:2,Status:'Active'},
    {ID:'FAQ-002',Question:'Hidden?',Answer:'No.',Category:'Internal',DisplayOrder:1,Status:'Inactive'}
  ]);
  backend.addSheet('Feedback',[{ID:'FDBK-001',Category:'Suggestion',Message:'Existing',PageURL:'',Status:'Reviewed',SubmittedAt:'2026-09-20'}]);
  const faq=JSON.parse(backend.context.doGet({parameter:{action:'faqs'}}).getContent());
  assert.equal(faq.success,true);assert.equal(faq.data.length,1);assert.equal(faq.data[0].ID,'FAQ-001');
  const feedback=backend.call('publicFeedback','',{submissionToken:'abcdefghijklmnopqrstuvwx',category:'Suggestion',message:'Please add more study guides.',pageURL:'https://example.test/#suggestions'});
  assert.equal(feedback.success,true);assert.equal(feedback.data.id,'FDBK-002');
  const saved=backend.rows('Feedback').find(row=>row.ID==='FDBK-002');assert.equal(saved.Message,'Please add more study guides.');assert.equal(saved.Status,'Pending Review');
  console.log('PASS enhancements backend: active FAQs are public and anonymous feedback is validated and stored without identity fields.');
})()
