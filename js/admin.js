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
  const timeout=setTimeout(()=>controller.abort(),60000);
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
    const long=label.classList.contains('admin-field-wide');const input=document.createElement(long?'textarea':'input');
    if (long) input.rows=4;input.dataset.field=header;input.value=record[header] == null ? '' : String(record[header]);
    if (header==='ID' && input.value) input.readOnly=true;
    label.append(caption,input);fields.appendChild(label);
  });
  const save=document.createElement('button');save.type='submit';save.className='resource-button';save.textContent='Save record';
  form.append(fields,save);form.onsubmit=event=>{event.preventDefault();adminSaveEditor(save);};panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'start'});
}

async function adminSaveEditor(button) {
  const record={};document.querySelectorAll('#adminEditor [data-field]').forEach(input=>{record[input.dataset.field]=input.value;});
  button.disabled=true;adminSetStatus('Saving record…');
  try {await adminRequest('adminSave',{table:adminCurrentTable.key,record});adminSetStatus('Record saved. Public caches were refreshed.','success');await adminRefreshSession();}
  catch(error){adminSetStatus(error.message,'error');button.disabled=false;}
}

async function adminArchiveRow(row) {
  const keyField=adminCurrentTable.headers.includes('ID')?'ID':(adminCurrentTable.headers.includes('Key')?'Key':adminCurrentTable.headers[0]);
  const key=String(row[keyField] || '');if (!key || !confirm('Set '+key+' to Inactive?')) return;
  adminSetStatus('Archiving '+key+'…');
  try {await adminRequest('adminArchive',{table:adminCurrentTable.key,key});adminSetStatus(key+' is now Inactive.','success');await adminRefreshSession();}
  catch(error){adminSetStatus(error.message,'error');}
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

async function adminRefreshSession() {
  const key=adminCurrentTable && adminCurrentTable.key;
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
  document.getElementById('adminBulkToggle').onclick=()=>{document.getElementById('adminBulkPanel').hidden=false;document.getElementById('adminHeaders').textContent=adminCurrentTable.headers.join('\t');};
  document.getElementById('adminBulkClose').onclick=()=>{document.getElementById('adminBulkPanel').hidden=true;};
  document.getElementById('adminCopyHeaders').onclick=async()=>{await navigator.clipboard.writeText(adminCurrentTable.headers.join('\t'));adminSetStatus('Headers copied.','success');};
  document.getElementById('adminBulkSave').onclick=adminBulkSave;
  document.getElementById('adminSignOut').onclick=async()=>{const identity=await adminLoadIdentity();await identity.sdk.signOut(identity.auth);location.reload();};
});
