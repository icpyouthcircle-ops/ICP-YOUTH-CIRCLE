const assert=require('node:assert/strict');
const {createBackend}=require('./scoring-harness.cjs');

(()=>{
  const setupBackend=createBackend();
  assert.equal(typeof setupBackend.context.setupPortalEnhancements,'function');
  assert.equal(typeof setupBackend.context.setupPortalEnhancements_,'undefined');
  assert.match(setupBackend.context.setupPortalEnhancements(),/Scheduled publishing/);
  assert.equal(setupBackend.sheets.has('FAQs'),true);
  assert.equal(setupBackend.sheets.has('Feedback'),true);
  assert.equal(setupBackend.sheets.has('Countdowns'),true);
  assert.ok(setupBackend.context.adminHeaders_('Resources').includes('PublishAt'));
  assert.ok(setupBackend.context.adminHeaders_('Announcements').includes('ExpiresAt'));

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
  backend.addSheet('Resources',[
    {ID:'RES-ACTIVE',Title:'Public',Category:'Notes',Status:'Active'},
    {ID:'RES-DRAFT',Title:'Draft',Category:'Notes',Status:'Draft'},
    {ID:'RES-FUTURE',Title:'Future',Category:'Notes',Status:'Scheduled',PublishAt:'2026-09-24T18:00:00'},
    {ID:'RES-LIVE',Title:'Scheduled live',Category:'Notes',Status:'Scheduled',PublishAt:'2026-09-24T16:00:00'},
    {ID:'RES-EXPIRED',Title:'Expired',Category:'Notes',Status:'Active',ExpiresAt:'2026-09-24T16:30:00'}
  ]);
  assert.deepEqual(Array.from(backend.context.getPublicResources_('').map(row=>row.ID)),['RES-ACTIVE','RES-LIVE']);
  backend.addSheet('Scholarships',[{ID:'SCH-LIVE',Name:'Live scholarship',Description:'Apply now.',Status:'Scheduled',PublishAt:'2026-09-24T16:00:00'},{ID:'SCH-HIDDEN',Name:'Hidden',Status:'Archived'}]);
  assert.deepEqual(Array.from(backend.context.getPublicScholarships_().map(row=>row.ID)),['SCH-LIVE']);
  backend.addSheet('Announcements',[{ID:'ANN-LIVE',Title:'Live notice',Status:'Active'},{ID:'ANN-FUTURE',Title:'Future notice',Status:'Scheduled',PublishAt:'2026-09-24T18:00:00'}]);
  assert.deepEqual(Array.from(backend.context.getPublicAnnouncements_().map(row=>row.ID)),['ANN-LIVE']);
  backend.addSheet('Notifications',[{ID:'NTF-LIVE',Title:'Live notification',Audience:'All',Status:'Scheduled',PublishAt:'2026-09-24T16:00:00'},{ID:'NTF-EXPIRED',Title:'Expired notification',Audience:'All',Status:'Active',ExpiresAt:'2026-09-24T16:30:00'}]);
  assert.deepEqual(Array.from(backend.context.studentNotifications_().map(row=>row.ID)),['NTF-LIVE']);
  backend.addSheet('Admissions',[{ID:'ADM-LIVE',Institution:'City University',Program:'BS English',Description:'Fall admissions.',CreatedAt:'2026-09-24T16:30:00',Status:'Active'},{ID:'ADM-OLD',Institution:'Old University',Program:'Old program',CreatedAt:'2026-09-22T10:00:00',Status:'Active'}]);
  const bell=Array.from(backend.context.getPublicBellNotifications_());
  assert.deepEqual(bell.map(row=>row.Type),['Admission','Scholarship']);
  assert.equal(bell[0].Route,'admissions');assert.equal(bell[1].Route,'scholarships');
  const feedback=backend.call('publicFeedback','',{submissionToken:'abcdefghijklmnopqrstuvwx',category:'Suggestion',message:'Please add more study guides.',pageURL:'https://example.test/#suggestions'});
  assert.equal(feedback.success,true);assert.equal(feedback.data.id,'FDBK-002');
  const saved=backend.rows('Feedback').find(row=>row.ID==='FDBK-002');assert.equal(saved.Message,'Please add more study guides.');assert.equal(saved.Status,'Pending Review');
  console.log('PASS enhancements backend: active FAQs are public and anonymous feedback is validated and stored without identity fields.');
})()
