const assert=require('node:assert/strict');
const {createBackend}=require('./scoring-harness.cjs');

const backend=createBackend();
backend.context.setupAIAssistant();
backend.addSheet('Resources',[
  {ID:'RES-1',Title:'Biology Cell Notes',Description:'Verified notes about cell structure and function.',Category:'Notes',Subject:'Biology',Status:'Active',Route:'notes'}
]);
const alice=backend.token('alice',{}, {email:'alice@example.test'});
const bob=backend.token('bob',{}, {email:'bob@example.test'});
const ok=result=>{assert.equal(result.success,true,JSON.stringify(result));return result.data;};
const bad=(result,code)=>{assert.equal(result.success,false,JSON.stringify(result));assert.equal(result.error.code,code);};

const config=JSON.parse(backend.context.doGet({parameter:{action:'aiAssistantConfig'}}).getContent()).data;
assert.equal(config.enabled,true);assert.equal(config.requiresSignIn,true);assert.equal(config.dailyLimit,30);assert.deepEqual([...config.availableProviders],['OpenAI','Gemini']);
bad(backend.call('aiChat','invalid-token',{message:'Explain cell structure',mode:'Explain',language:'English',verifiedOnly:true,requestId:'request-00000000000000000001'}),'AUTH_REQUIRED');

const chat=ok(backend.call('aiChat',alice,{message:'Explain cell structure using the portal notes',mode:'Explain',language:'English',verifiedOnly:true,requestId:'request-00000000000000000001'}));
assert.match(chat.conversationId,/^AIC-/);assert.equal(chat.message.role,'assistant');assert.equal(chat.message.payload.grounded,true);assert.equal(chat.message.payload.sources.length,1);assert.equal(chat.message.payload.sources[0].id,'S1');assert.equal(chat.message.payload.sources[0].title,'Biology Cell Notes');
assert.equal(backend.rows('AI_Messages').length,2);
const gemini=ok(backend.call('aiChat',alice,{conversationId:chat.conversationId,message:'Explain cell structure with Gemini',provider:'Gemini',mode:'Explain',language:'English',verifiedOnly:true,requestId:'request-00000000000000000002'}));
assert.equal(gemini.message.payload.provider,'Gemini');assert.equal(gemini.message.payload.grounded,true);
const geminiCall=backend.fetchCalls.find(call=>call.url.includes('generativelanguage.googleapis.com'));
assert.ok(geminiCall);assert.equal(geminiCall.options.headers['x-goog-api-key'],backend.props.GEMINI_API_KEY);assert.equal(JSON.parse(geminiCall.options.payload).generationConfig.responseMimeType,'application/json');
assert.match(geminiCall.url,/gemini-3\.8-flash/,'Deprecated Gemini 3.5 configuration should migrate to the current model.');
const duplicate=ok(backend.call('aiChat',alice,{message:'Explain cell structure using the portal notes',mode:'Explain',language:'English',verifiedOnly:true,requestId:'request-00000000000000000001'}));
assert.equal(duplicate.message.id,chat.message.id);assert.equal(backend.rows('AI_Messages').length,4,'Idempotent retries must not duplicate messages.');
const sourceLookup=backend.context.aiSources_;backend.context.aiSources_=()=>{throw new Error('General questions must skip ICP source lookup.');};
const general=ok(backend.call('aiChat',alice,{conversationId:chat.conversationId,message:'Why is the sky blue?',provider:'OpenAI',mode:'Explain',language:'English',verifiedOnly:false,requestId:'request-00000000000000000003'}));backend.context.aiSources_=sourceLookup;
assert.equal(general.message.payload.provider,'OpenAI');assert.equal(general.message.payload.grounded,false);assert.equal(general.message.payload.sources.length,0);assert.equal(backend.rows('AI_Messages').length,6);

const normalFetch=backend.context.UrlFetchApp.fetch;
backend.context.UrlFetchApp.fetch=(url,options)=>url.includes('generativelanguage.googleapis.com')?{getResponseCode:()=>503,getContentText:()=>'{"error":{"message":"temporary"}}'}:normalFetch(url,options);
const fallback=ok(backend.call('aiChat',alice,{conversationId:chat.conversationId,message:'Explain gravity even if Gemini is unavailable',provider:'Gemini',mode:'Explain',language:'English',verifiedOnly:false,requestId:'request-00000000000000000004'}));
backend.context.UrlFetchApp.fetch=normalFetch;
assert.equal(fallback.message.payload.provider,'OpenAI');assert.equal(fallback.message.payload.fallbackFrom,'Gemini');assert.equal(backend.rows('AI_Messages').length,8);

const history=ok(backend.call('aiListConversations',alice));assert.equal(history.length,1);assert.equal(history[0].id,chat.conversationId);
bad(backend.call('aiLoadConversation',bob,{conversationId:chat.conversationId}),'NOT_FOUND');
const loaded=ok(backend.call('aiLoadConversation',alice,{conversationId:chat.conversationId}));assert.equal(loaded.messages.length,8);

ok(backend.call('aiSaveMessage',alice,{messageId:chat.message.id,saved:true}));assert.equal(backend.rows('AI_Messages').find(row=>row.ID===chat.message.id).Saved,'Yes');
ok(backend.call('aiFeedback',alice,{messageId:chat.message.id,rating:'Helpful'}));assert.equal(backend.rows('AI_Feedback').length,1);
bad(backend.call('aiFeedback',bob,{messageId:chat.message.id,rating:'Helpful'}),'NOT_FOUND');
ok(backend.call('aiArchiveConversation',alice,{conversationId:chat.conversationId}));assert.equal(ok(backend.call('aiListConversations',alice)).length,0);

const openAI=backend.fetchCalls.filter(call=>call.url.includes('api.openai.com'));
assert.ok(openAI.length>=2);assert.ok(openAI.every(call=>call.options.headers.Authorization.startsWith('Bearer sk-test-')));
assert.equal(JSON.stringify(chat).includes('sk-test-'),false,'Secrets must never appear in client responses.');
assert.equal(JSON.stringify(gemini).includes('AIza-test-'),false,'Gemini secrets must never appear in client responses.');

console.log('PASS ICP AI backend: OpenAI and Gemini providers, resilient provider fallback, broad general answers without ICP lookup, optional grounding, auth, structured responses, idempotency, privacy, saved answers, feedback, archive, and server-only credentials.');
