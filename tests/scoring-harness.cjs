const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');

function createBackend(){
 let now=Date.parse('2026-09-24T12:00:00Z'),counter=0,locked=false,failSheet='';
 const sheets=new Map(),tokens=new Map();
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'mdcat-demo-fixture.json'),'utf8'));
 class Sheet {
  constructor(name,values=[]){this.name=name;this.values=values;}
  getLastRow(){return this.values.length;}
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
 const props={MDCAT_SCORING_ENABLED:'true',MDCAT_FIREBASE_CONFIG:JSON.stringify({apiKey:'fake-public-key',authDomain:'demo.firebaseapp.com',projectId:'demo-project',appId:'fake-app-id'})};
 class FakeDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const context=vm.createContext({console,Date:FakeDate,SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>sheets.get(name),insertSheet:name=>{const sheet=new Sheet(name);sheets.set(name,sheet);return sheet;}}),flush:()=>{}},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key]||null})},
  LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;}})},
  UrlFetchApp:{fetch:(url,options)=>{if(!url.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='))throw new Error('Unexpected outbound auth request');const token=JSON.parse(options.payload).idToken;const account=tokens.get(token);return {getResponseCode:()=>account?200:400,getContentText:()=>JSON.stringify(account?{users:[account]}:{error:{message:'INVALID_ID_TOKEN'}})};}},
  Utilities:{getUuid:()=>`00000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`,base64DecodeWebSafe:value=>Buffer.from(value,'base64url'),newBlob:value=>({getDataAsString:()=>Buffer.from(value).toString()}),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,value)=>[...crypto.createHash('sha256').update(value).digest()]},
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
 return {context,sheets,props,token,call,rows:name=>context.getSheetData_(name),change:(name,id,record)=>context.mdcatPut_(name,{ID:id,...record}),advance:ms=>{now+=ms;},setLocked:value=>{locked=value;},failNext:name=>{failSheet=name;}};
}
module.exports={createBackend};
