const assert=require('node:assert/strict');
const {createBackend}=require('./scoring-harness.cjs');
const backend=createBackend();
backend.addSheet('Admins',[{ID:'ADMIN-001',Email:'owner@example.test',Role:'Super Admin',Status:'Active'}]);
backend.addSheet('Resources',[{ID:'RES-001',Title:'Existing note',Description:'Keep this',Status:'Active',CreatedAt:'old',UpdatedAt:'old'}]);
const adminSheetNames=['Categories','Subjects','Levels','Institutions','Entry_Tests','Admissions','Scholarships','Opportunities','Announcements','MCQs','Videos','AI_Tools','Islamic_Content','Blog','Navigation','Homepage','Social_Links','Submissions','Help_Desk','Activity_Log','Settings','MDCAT_Subjects','MDCAT_Units','MDCAT_Chapters','MDCAT_Topics','MDCAT_Question_Bank','MDCAT_Tests','MDCAT_Test_Questions','MDCAT_Daily_Practice','MDCAT_Updates'];
for(const name of adminSheetNames){if(!backend.sheets.has(name)) backend.addSheet(name,[{ID:'SETUP-001',Status:'Inactive'}]);}
const admin=backend.token('owner',{}, {email:'owner@example.test'});
const outsider=backend.token('outsider',{}, {email:'outsider@example.test'});
const ok=result=>{assert.equal(result.success,true,JSON.stringify(result));return result.data;};
const bad=(result,code)=>{assert.equal(result.success,false);assert.equal(result.error.code,code);};

bad(backend.call('adminSession',outsider), 'ADMIN_REQUIRED');
const session=ok(backend.call('adminSession',admin));
assert.equal(session.email,'owner@example.test');assert.equal(session.role,'Super Admin');
assert.ok(session.tables.some(table=>table.key==='RESOURCES'));
assert.ok(!session.tables.some(table=>table.key==='MDCAT_ATTEMPT_ANSWERS'));
backend.props.MDCAT_SCORING_ENABLED='false';
assert.equal(ok(backend.call('adminSession',admin)).email,'owner@example.test');
backend.props.MDCAT_SCORING_ENABLED='true';

let listed=ok(backend.call('adminList',admin,{table:'RESOURCES'}));
assert.equal(listed.total,1);assert.equal(listed.rows[0].Title,'Existing note');
ok(backend.call('adminSave',admin,{table:'RESOURCES',record:{ID:'RES-001',Title:'Updated note',Description:'Keep this',Status:'Active'}}));
assert.equal(backend.rows('Resources')[0].Title,'Updated note');
ok(backend.call('adminArchive',admin,{table:'RESOURCES',key:'RES-001'}));
const archived=backend.rows('Resources')[0];assert.equal(archived.Status,'Inactive');assert.equal(archived.Title,'Updated note');assert.equal(archived.Description,'Keep this');

const created=ok(backend.call('adminSave',admin,{table:'RESOURCES',record:{Title:'New note',Description:'New',Status:'Inactive'}}));
assert.equal(created.created,true);assert.match(created.key,/^RES-/);
const headers=session.tables.find(table=>table.key==='RESOURCES').headers;
const row=Object.fromEntries(headers.map(header=>[header,'']));row.ID='RES-099';row.Title='Bulk note';row.Status='Inactive';
const bulk=ok(backend.call('adminBulk',admin,{table:'RESOURCES',headers,records:[row]}));
assert.deepEqual(bulk,{saved:1,created:1,updated:0});
bad(backend.call('adminBulk',admin,{table:'RESOURCES',headers:['Wrong'],records:[{Wrong:'x'}]}),'BAD_REQUEST');
bad(backend.call('adminSave',admin,{table:'MDCAT_ATTEMPT_ANSWERS',record:{ID:'x'}}),'BAD_REQUEST');
console.log('PASS admin backend: verified Google allowlist, safe table manifest, list/create/update/archive, exact-header bulk paste, and private-sheet exclusion.');
