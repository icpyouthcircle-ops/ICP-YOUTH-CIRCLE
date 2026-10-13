const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');

function createBackend(){
 let now=Date.parse('2026-09-24T12:00:00Z'),counter=0,locked=false,failSheet='';
 const sheets=new Map(),tokens=new Map(),cache=new Map(),driveFolders=new Map(),driveFiles=[],fetchCalls=[];
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'mdcat-demo-fixture.json'),'utf8'));
 class Sheet {
  constructor(name,values=[]){this.name=name;this.values=values;}
  getLastRow(){return this.values.length;}
  setFrozenRows(){}
  getDataRange(){return {getValues:()=>this.values.length?this.values.map(row=>row.slice()):[['']]};}
  getRange(start,column,height,width){return {setValues:rows=>{
   if(failSheet===this.name){failSheet='';throw new Error('Simulated interrupted write');}
   if(rows.length!==height || rows.some(row=>row.length!==width))throw new Error('Range dimensions');
   rows.forEach((row,index)=>{if(!this.values[start+index-1])this.values[start+index-1]=[];row.forEach((cell,col)=>{this.values[start+index-1][column+col-1]=typeof cell==='string'&&cell.startsWith("'")?cell.slice(1):cell;});});
  }};}
  appendRow(row){this.values.push(row);}
 }
 for(const [name,rows]of Object.entries(fixture)){
  if(!rows.length)continue;
  if(name==='MDCAT_Question_Bank')rows.forEach(row=>{row.CorrectOption=row.ID==='MDQ-DEMO-006'?'D':'B';row.Explanation='Private demo explanation.';});
  const headers=[...new Set(rows.flatMap(Object.keys))];
  sheets.set(name,new Sheet(name,[headers,...rows.map(row=>headers.map(key=>row[key]??''))]));
 }
 const props={MDCAT_SCORING_ENABLED:'true',MDCAT_FIREBASE_CONFIG:JSON.stringify({apiKey:'fake-public-key',authDomain:'demo.firebaseapp.com',projectId:'demo-project',appId:'fake-app-id'}),OPENAI_API_KEY:'sk-test-0000000000000000000000000000',ICP_AI_MODEL:'gpt-5.4-mini',ICP_AI_ENABLED:'true',GEMINI_API_KEY:'AIza-test-0000000000000000000000000000',ICP_GEMINI_MODEL:'gemini-3.5-flash',ICP_GEMINI_ENABLED:'true'};
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const context=vm.createContext({console,Date:FakeDate,SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>sheets.get(name),insertSheet:name=>{const sheet=new Sheet(name);sheets.set(name,sheet);return sheet;}}),flush:()=>{}},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key]||null,setProperty:(key,value)=>{props[key]=String(value);}})},
  CacheService:{getScriptCache:()=>({get:key=>cache.get(key)||null,put:(key,value)=>cache.set(key,value),removeAll:keys=>keys.forEach(key=>cache.delete(key))})},
  LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;}})},
  UrlFetchApp:{fetch:(url,options)=>{
   fetchCalls.push({url,options});
   if(url.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=')){const token=JSON.parse(options.payload).idToken;const account=tokens.get(token);return {getResponseCode:()=>account?200:400,getContentText:()=>JSON.stringify(account?{users:[account]}:{error:{message:'INVALID_ID_TOKEN'}})};}
   if(url==='https://api.openai.com/v1/moderations')return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({results:[{flagged:false}]})};
   if(url==='https://api.openai.com/v1/responses'){
    const body=JSON.parse(options.payload);const sourceIds=[...body.input.matchAll(/\[(S\d+)\]/g)].map(match=>match[1]);
    const answer={answer:sourceIds.length?'Verified guidance from ICP ['+sourceIds[0]+'].':'No matching verified information is available.',grounded:Boolean(sourceIds.length),confidence:sourceIds.length?'high':'low',cited_source_ids:sourceIds.slice(0,1),follow_up_questions:['Would you like a short quiz?'],quiz:[],study_plan:[]};
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify(answer)}]}]})};
   }
   if(url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')){
    const body=JSON.parse(options.payload);const input=body.contents[0].parts[0].text;const sourceIds=[...input.matchAll(/\[(S\d+)\]/g)].map(match=>match[1]);
    const answer={answer:sourceIds.length?'Gemini guidance from ICP ['+sourceIds[0]+'].':'No matching verified information is available.',grounded:Boolean(sourceIds.length),confidence:sourceIds.length?'high':'low',cited_source_ids:sourceIds.slice(0,1),follow_up_questions:['Would you like a short quiz?'],quiz:[],study_plan:[]};
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(answer)}]},finishReason:'STOP'}]})};
   }
   throw new Error('Unexpected outbound request: '+url);
  }},
  DriveApp:{Access:{ANYONE_WITH_LINK:'anyone'},Permission:{VIEW:'view'},createFolder:name=>{const id='folder-'+(++counter);const folder={id,name,getId:()=>id,createFile:blob=>{const fileId='file-'+(++counter);const file={id:fileId,blob,trashed:false,sharing:null,description:'',getId:()=>fileId,getUrl:()=>`https://drive.google.com/file/d/${fileId}/view`,getResourceKey:()=>`key-${fileId}`,setDescription:value=>{file.description=value;return file;},setSharing:(access,permission)=>{file.sharing={access,permission};return file;},setTrashed:value=>{file.trashed=value;return file;}};driveFiles.push(file);return file;}};driveFolders.set(id,folder);return folder;},getFolderById:id=>{const folder=driveFolders.get(id);if(!folder)throw new Error('Folder not found');return folder;}},
  MimeType:{PDF:'application/pdf'},
  Utilities:{getUuid:()=>`00000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`,base64Decode:value=>[...Buffer.from(value,'base64')],base64DecodeWebSafe:value=>Buffer.from(value,'base64url'),newBlob:(value,mimeType,name)=>({bytes:Buffer.from(value),mimeType,name,getDataAsString:()=>Buffer.from(value).toString()}),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,value)=>[...crypto.createHash('sha256').update(value).digest()]},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;},getContent(){return this.text;}})},Logger:{log:()=>{}},
  HtmlService:{createTemplateFromFile:()=>({evaluate:()=>({setTitle:()=>({})})})}
 });
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../backend/Code.gs'),'utf8'),context);
 context.setupMDCATScoring_();
 function token(uid,claims={},account={}){
  const seconds=Math.floor(now/1000);
  const payload={sub:uid,aud:'demo-project',iss:'https://securetoken.google.com/demo-project',exp:seconds+3600,iat:seconds,auth_time:seconds,firebase:{sign_in_provider:'google.com'},...claims};
  const value=Buffer.from('{"alg":"RS256"}').toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.verified-by-mock-provider';
  tokens.set(value,{localId:uid,emailVerified:true,disabled:false,validSince:String(seconds-10),...account});return value;
 }
 function call(action,idToken,body={}){return JSON.parse(context.doPost({postData:{contents:JSON.stringify({...body,action,idToken})}}).getContent());}
 function addSheet(name,rows){const headers=[...new Set(rows.flatMap(Object.keys))];const sheet=new Sheet(name,[headers,...rows.map(row=>headers.map(key=>row[key]??''))]);sheets.set(name,sheet);return sheet;}
 return {context,sheets,props,driveFiles,fetchCalls,token,call,rows:name=>context.getSheetData_(name),addSheet,change:(name,id,record)=>context.mdcatPut_(name,{ID:id,...record}),advance:ms=>{now+=ms;},setLocked:value=>{locked=value;},failNext:name=>{failSheet=name;}};
}
module.exports={createBackend};
