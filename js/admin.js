const ADMIN_FIREBASE_CONFIG=Object.freeze({
  apiKey:'AIzaSyA5tQEc0yf544hQ0buVmaNG32rStH0UYHQ',
  authDomain:'icp-youth-circle-1ce3d.firebaseapp.com',
  projectId:'icp-youth-circle-1ce3d',
  appId:'1:116078667555:web:7707153d9667bf8fd88e96'
});
const ADMIN_API_URL='https://script.google.com/macros/s/AKfycbwfIALyzy8rVPAyIyTj-RkFdjX5f92uaVpESOGHrBIsnsFQLH14uoYeAdggXKNEhQUo/exec';
let adminIdentity=null;
let adminIdentityLoading=null;
let adminSession=null;
let adminCurrentTable=null;
let adminCurrentRows=[];
const ADMIN_PUBLISHING_TABLES=new Set(['RESOURCES','SCHOLARSHIPS','ANNOUNCEMENTS','COUNTDOWNS','NOTIFICATIONS']);
const ADMIN_PREVIEW_TABLES=new Set(['RESOURCES','ANNOUNCEMENTS','COUNTDOWNS','NOTIFICATIONS']);

function adminDateTimeValue(value) {
  if(!value) return '';
  const text=String(value).trim();
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) return text.slice(0,19);
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime()) ? text.slice(0,19) : new Date(parsed.getTime()-parsed.getTimezoneOffset()*60000).toISOString().slice(0,19);
}

function adminEditorRecord() {
  const record={};
  document.querySelectorAll('#adminEditor [data-field]').forEach(input=>{record[input.dataset.field]=input.value;});
  return record;
}

async function adminLoadIdentity() {
  if (adminIdentity) return adminIdentity;
  if (adminIdentityLoading) return adminIdentityLoading;
  adminIdentityLoading=(async()=>{
    const [appSDK,authSDK]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js')
    ]);
    const app=appSDK.initializeApp(ADMIN_FIREBASE_CONFIG,'icp-admin');
    const auth=authSDK.getAuth(app);
    await authSDK.setPersistence(auth,authSDK.inMemoryPersistence);
    adminIdentity={auth,sdk:authSDK};
    return adminIdentity;
  })();
  try { return await adminIdentityLoading; }
  finally { adminIdentityLoading=null; }
}

async function adminRequest(action,body={}) {
  const identity=await adminLoadIdentity();
  if (!identity.auth.currentUser) throw new Error('Please sign in with an administrator account.');
  const user=identity.auth.currentUser;
  const idToken=await user.getIdToken();
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),action==='adminUploadPdf'?120000:60000);
  try {
    const response=await fetch(ADMIN_API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({...body,action,idToken}),signal:controller.signal,redirect:'follow'});
    if (!response.ok) throw new Error('The server could not complete this request.');
    const result=await response.json();
    if (identity.auth.currentUser!==user) throw new Error('The signed-in account changed.');
    if (!result.success) {
      const error=new Error(result.error && result.error.message || 'The request failed.');
      error.code=result.error && result.error.code;throw error;
    }
    return result.data;
  } catch(error) {
    if (error.name==='AbortError') throw new Error('The server response was delayed. Please retry.');
    throw error;
  } finally { clearTimeout(timeout); }
}

function adminSetStatus(message,type='') {
  const target=document.getElementById(adminSession?'adminStatus':'adminLoginStatus');
  target.textContent=message || '';
  target.className=type ? 'admin-'+type : '';
}

async function adminSignIn() {
  const button=document.getElementById('adminSignIn');button.disabled=true;
  adminSetStatus('Opening Google sign-in…');
  try {
    const identity=await adminLoadIdentity();
    await identity.sdk.signInWithPopup(identity.auth,new identity.sdk.GoogleAuthProvider());
    adminSetStatus('Verifying administrator access…');
    adminRenderSession(await adminRequest('adminSession'));
  } catch(error) { adminSetStatus(error.message || 'Sign-in failed.','error');button.disabled=false; }
}

function adminRenderSession(session) {
  adminSession=session;
  document.getElementById('adminLogin').hidden=true;
  document.getElementById('adminDashboard').hidden=false;
  document.getElementById('adminUser').textContent=session.email+' · '+session.role;
  const select=document.getElementById('adminTable');select.replaceChildren();
  session.tables.forEach(table=>{
    const option=document.createElement('option');option.value=table.key;option.textContent=table.label+' ('+table.rowCount+')';select.appendChild(option);
  });
  select.onchange=()=>adminLoadTable();
  adminLoadTable();
}

function adminSelectedManifest() {
  return adminSession.tables.find(table=>table.key===document.getElementById('adminTable').value);
}

async function adminLoadTable() {
  const table=adminSelectedManifest();
  if (!table) return;
  adminCurrentTable=table;adminSetStatus('Loading '+table.label+'…');
  document.getElementById('adminEditorPanel').hidden=true;
  document.getElementById('adminBulkPanel').hidden=true;
  try {
    const result=await adminRequest('adminList',{table:table.key,query:document.getElementById('adminQuery').value,limit:100});
    adminCurrentRows=result.rows || [];
    document.getElementById('adminCount').textContent=result.total+' record'+(result.total===1?'':'s')+(result.total>100?' · showing first 100':'');
    adminRenderRows(result.headers,adminCurrentRows);
    document.getElementById('adminHeaders').textContent=result.headers.join('\t');
    adminSetStatus('');
  } catch(error) { adminSetStatus(error.message,'error'); }
}

function adminRenderRows(headers,rows) {
  const wrap=document.getElementById('adminTableWrap');wrap.replaceChildren();
  if (!rows.length) { const empty=document.createElement('p');empty.textContent='No records found. Use New record or paste rows.';empty.style.padding='16px';wrap.appendChild(empty);return; }
  const table=document.createElement('table');table.className='admin-table';
  const head=document.createElement('thead');const headRow=document.createElement('tr');
  const actionHead=document.createElement('th');actionHead.textContent='Actions';headRow.appendChild(actionHead);
  headers.forEach(header=>{const th=document.createElement('th');th.textContent=header;headRow.appendChild(th);});head.appendChild(headRow);table.appendChild(head);
  const body=document.createElement('tbody');
  rows.forEach((row,index)=>{
    const tr=document.createElement('tr');const actions=document.createElement('td');actions.className='admin-table-actions';
    const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.onclick=()=>adminOpenEditor(row);
    actions.appendChild(edit);
    if(ADMIN_PREVIEW_TABLES.has(adminCurrentTable.key)){const preview=document.createElement('button');preview.type='button';preview.textContent='Preview';preview.onclick=()=>adminShowPreview(row);actions.appendChild(preview);}
    if (headers.includes('Status')) {const archive=document.createElement('button');archive.type='button';archive.textContent='Archive';archive.onclick=()=>adminArchiveRow(row);actions.appendChild(archive);}
    tr.appendChild(actions);
    headers.forEach(header=>{const td=document.createElement('td');td.textContent=row[header] == null ? '' : String(row[header]);td.title=td.textContent;tr.appendChild(td);});body.appendChild(tr);
  });
  table.appendChild(body);wrap.appendChild(table);
}

function adminOpenEditor(record={}) {
  const panel=document.getElementById('adminEditorPanel');const form=document.getElementById('adminEditor');form.replaceChildren();
  document.getElementById('adminEditorTitle').textContent=Object.keys(record).length?'Edit record':'New record';
  const fields=document.createElement('div');fields.className='admin-fields';
  adminCurrentTable.headers.forEach(header=>{
    const label=document.createElement('label');label.className='admin-field';
    if (/description|content|summary|question|eligibility|benefits|notes|text|details|answer|address/i.test(header)) label.classList.add('admin-field-wide');
    const caption=document.createElement('span');caption.textContent=header;
    const publishingStatus=header==='Status' && ADMIN_PUBLISHING_TABLES.has(adminCurrentTable.key);
    const long=label.classList.contains('admin-field-wide');const input=document.createElement(publishingStatus?'select':long?'textarea':'input');
    if(publishingStatus){
      ['Draft','Scheduled','Active','Archived'].forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;input.appendChild(option);});
      const saved=String(record[header] || 'Draft');input.value=saved==='Inactive'?'Archived':saved;
    }else{
      if (long) input.rows=4;
      if(['TargetDateTime','PublishAt','ExpiresAt'].includes(header)){
        input.type='datetime-local';input.step='1';
        input.value=adminDateTimeValue(record[header]);
      }else input.value=record[header] == null ? '' : String(record[header]);
    }
    input.dataset.field=header;
    if (header==='ID' && input.value) input.readOnly=true;
    label.append(caption,input);fields.appendChild(label);
    if(['TargetDateTime','PublishAt','ExpiresAt'].includes(header)){const hint=document.createElement('small');hint.textContent='Pakistan Standard Time (PKT).';label.appendChild(hint);}
  });
  const save=document.createElement('button');save.type='submit';save.className='resource-button';save.textContent='Save record';
  const actions=document.createElement('div');actions.className='admin-editor-actions';actions.appendChild(save);
  if(ADMIN_PREVIEW_TABLES.has(adminCurrentTable.key)){const preview=document.createElement('button');preview.type='button';preview.textContent='Preview draft';preview.onclick=()=>adminShowPreview(adminEditorRecord());actions.appendChild(preview);}
  form.append(fields,actions);form.onsubmit=event=>{event.preventDefault();adminSaveEditor(save);};panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'start'});
}

async function adminSaveEditor(button) {
  const record=adminEditorRecord();
  button.disabled=true;adminSetStatus('Saving record…');
  try {await adminRequest('adminSave',{table:adminCurrentTable.key,record});adminSetStatus('Record saved. Public caches were refreshed.','success');await adminRefreshSession();}
  catch(error){adminSetStatus(error.message,'error');button.disabled=false;}
}

async function adminArchiveRow(row) {
  const keyField=adminCurrentTable.headers.includes('ID')?'ID':(adminCurrentTable.headers.includes('Key')?'Key':adminCurrentTable.headers[0]);
  const key=String(row[keyField] || '');if (!key || !confirm('Archive '+key+'? It will no longer appear publicly.')) return;
  adminSetStatus('Archiving '+key+'…');
  try {await adminRequest('adminArchive',{table:adminCurrentTable.key,key});adminSetStatus(key+' is now archived.','success');await adminRefreshSession();}
  catch(error){adminSetStatus(error.message,'error');}
}

function adminPreviewState(record) {
  const status=String(record.Status || 'Draft');
  const now=Date.now();
  const publishAt=new Date(record.PublishAt || record.PublishDate || '').getTime();
  const expiresAt=new Date(record.ExpiresAt || record.ExpiryDate || '').getTime();
  if(status==='Archived' || status==='Inactive') return {label:'Archived',className:'is-archived'};
  if(status==='Draft') return {label:'Draft preview',className:'is-draft'};
  if(Number.isFinite(expiresAt) && expiresAt<=now) return {label:'Expired',className:'is-archived'};
  if((status==='Scheduled' && (!Number.isFinite(publishAt) || publishAt>now)) || (status==='Active' && Number.isFinite(publishAt) && publishAt>now)) return {label:'Scheduled',className:'is-scheduled'};
  return {label:'Public now',className:'is-active'};
}

function adminPreviewLine(label,value) {
  if(value == null || String(value).trim()==='') return null;
  const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+': ';
  p.append(strong,document.createTextNode(String(value)));return p;
}

function adminShowPreview(record) {
  const panel=document.getElementById('adminPreviewPanel');const body=document.getElementById('adminPreviewBody');body.replaceChildren();
  const state=adminPreviewState(record);const badge=document.createElement('span');badge.className='admin-preview-state '+state.className;badge.textContent=state.label;
  const eyebrow=document.createElement('p');eyebrow.className='admin-preview-eyebrow';eyebrow.textContent=adminCurrentTable.label;
  const title=document.createElement('h4');title.textContent=record.Title || record.Name || 'Untitled preview';
  const description=document.createElement('p');description.className='admin-preview-description';description.textContent=record.Description || record.Summary || record.Message || record.Content || 'No description has been added.';
  const card=document.createElement('article');card.className='admin-preview-card';card.append(badge,eyebrow,title,description);
  [
    adminPreviewLine('Category',record.Category),adminPreviewLine('Target date',record.TargetDateTime),
    adminPreviewLine('Publishes',record.PublishAt || record.PublishDate),adminPreviewLine('Expires',record.ExpiresAt || record.ExpiryDate),
    adminPreviewLine('After countdown',record.AfterMessage)
  ].filter(Boolean).forEach(line=>card.appendChild(line));
  const url=record.OfficialURL || record.FileURL || record.LinkURL;
  if(url){const button=document.createElement('span');button.className='resource-button admin-preview-button';button.textContent=record.ButtonText || (adminCurrentTable.key==='RESOURCES'?'Open resource':'View details');card.appendChild(button);}
  body.appendChild(card);panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'start'});
}

function adminParseTSV(text) {
  const rows=[];let row=[],cell='',quoted=false;
  for(let index=0;index<text.length;index++){
    const char=text[index];
    if(char==='"') {if(quoted && text[index+1]==='"'){cell+='"';index++;}else quoted=!quoted;continue;}
    if(!quoted && char==='\t'){row.push(cell);cell='';continue;}
    if(!quoted && (char==='\n'||char==='\r')){if(char==='\r'&&text[index+1]==='\n')index++;row.push(cell);if(row.some(value=>value!==''))rows.push(row);row=[];cell='';continue;}
    cell+=char;
  }
  row.push(cell);if(row.some(value=>value!==''))rows.push(row);return rows;
}

async function adminBulkSave() {
  const button=document.getElementById('adminBulkSave');
  try {
    const rows=adminParseTSV(document.getElementById('adminBulkText').value.trim());
    if(rows.length<2) throw new Error('Paste one header row and at least one data row.');
    const headers=rows[0].map(value=>value.trim());
    if(headers.length!==adminCurrentTable.headers.length || headers.some((value,index)=>value!==adminCurrentTable.headers[index])) throw new Error('The pasted header row does not exactly match the displayed headers.');
    const records=rows.slice(1).map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index] || ''])));
    button.disabled=true;adminSetStatus('Saving '+records.length+' row'+(records.length===1?'':'s')+'…');
    const result=await adminRequest('adminBulk',{table:adminCurrentTable.key,headers,records});
    document.getElementById('adminBulkText').value='';adminSetStatus(result.saved+' rows saved: '+result.created+' created, '+result.updated+' updated.','success');await adminRefreshSession();
  } catch(error) {adminSetStatus(error.message,'error');}
  finally {button.disabled=false;}
}

function adminReadFileBase64(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror=()=>reject(new Error('The selected PDF could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function adminUploadPdf(event) {
  event.preventDefault();
  const form=document.getElementById('adminPdfForm');
  if(!form.reportValidity()) return;
  const file=document.getElementById('adminPdfFile').files[0];
  if(!file) return;
  if(!/\.pdf$/i.test(file.name) || (file.type && file.type!=='application/pdf')) {adminSetStatus('Choose a PDF file.','error');return;}
  if(file.size<5 || file.size>8*1024*1024) {adminSetStatus('The PDF must be no larger than 8 MB.','error');return;}
  const button=document.getElementById('adminPdfUpload');button.disabled=true;
  adminSetStatus('Uploading and publishing the PDF… Keep this page open.');
  try {
    const dataBase64=await adminReadFileBase64(file);
    const result=await adminRequest('adminUploadPdf',{
      fileName:file.name,mimeType:file.type || 'application/pdf',dataBase64,
      title:document.getElementById('adminPdfResourceTitle').value,
      category:document.getElementById('adminPdfCategory').value,
      subject:document.getElementById('adminPdfSubject').value,
      level:document.getElementById('adminPdfLevel').value,
      institution:document.getElementById('adminPdfInstitution').value,
      year:document.getElementById('adminPdfYear').value,
      description:document.getElementById('adminPdfDescription').value,
      rightsConfirmed:document.getElementById('adminPdfRights').checked
    });
    form.reset();await adminRefreshSession('RESOURCES');
    adminSetStatus('PDF published successfully as '+result.resourceId+'.','success');
  } catch(error) {adminSetStatus(error.message || 'Unable to upload the PDF.','error');}
  finally {button.disabled=false;}
}

async function adminRefreshSession(preferredKey) {
  const key=preferredKey || (adminCurrentTable && adminCurrentTable.key);
  const session=await adminRequest('adminSession');adminSession=session;
  const select=document.getElementById('adminTable');select.replaceChildren();
  session.tables.forEach(table=>{const option=document.createElement('option');option.value=table.key;option.textContent=table.label+' ('+table.rowCount+')';select.appendChild(option);});
  if(key) select.value=key;await adminLoadTable();
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('adminSignIn').onclick=adminSignIn;
  document.getElementById('adminSearch').onclick=adminLoadTable;
  document.getElementById('adminQuery').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();adminLoadTable();}};
  document.getElementById('adminNew').onclick=()=>adminOpenEditor({});
  document.getElementById('adminEditorClose').onclick=()=>{document.getElementById('adminEditorPanel').hidden=true;};
  document.getElementById('adminPreviewClose').onclick=()=>{document.getElementById('adminPreviewPanel').hidden=true;};
  document.getElementById('adminBulkToggle').onclick=()=>{document.getElementById('adminBulkPanel').hidden=false;document.getElementById('adminHeaders').textContent=adminCurrentTable.headers.join('\t');};
  document.getElementById('adminBulkClose').onclick=()=>{document.getElementById('adminBulkPanel').hidden=true;};
  document.getElementById('adminCopyHeaders').onclick=async()=>{await navigator.clipboard.writeText(adminCurrentTable.headers.join('\t'));adminSetStatus('Headers copied.','success');};
  document.getElementById('adminBulkSave').onclick=adminBulkSave;
  document.getElementById('adminPdfToggle').onclick=()=>{document.getElementById('adminPdfPanel').hidden=false;document.getElementById('adminPdfPanel').scrollIntoView({behavior:'smooth',block:'start'});};
  document.getElementById('adminPdfClose').onclick=()=>{document.getElementById('adminPdfPanel').hidden=true;};
  document.getElementById('adminPdfForm').onsubmit=adminUploadPdf;
  document.getElementById('adminSignOut').onclick=async()=>{const identity=await adminLoadIdentity();await identity.sdk.signOut(identity.auth);location.reload();};
});
