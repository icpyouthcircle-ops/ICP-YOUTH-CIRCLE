const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const backend=fs.readFileSync(path.join(root,'backend/Code.gs'),'utf8');
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const mdcat=fs.readFileSync(path.join(root,'js/mdcat.js'),'utf8');
const initialScripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match=>match[1].split('?')[0]);

assert.deepEqual(initialScripts,['js/app.js','js/portal-extras.js'],'Only core portal scripts may load on the homepage.');
const initialBytes=initialScripts.reduce((total,file)=>total+fs.statSync(path.join(root,file)).size,0);
assert.ok(initialBytes<=180*1024,'Initial JavaScript budget exceeded: '+initialBytes+' bytes');
for(const file of ['js/mdcat.js','js/mdcat-study.js','js/mdcat-account.js']) {
  assert.match(app,new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'Lazy loader is missing '+file);
}
const shell=(worker.match(/const SHELL_ASSETS = \[([\s\S]*?)\];/) || [,''])[1];
assert.doesNotMatch(shell,/mdcat(?:-study|-account)?\.js/,'MDCAT files must not be downloaded during service-worker installation.');
assert.match(worker,/if \(isPortalNavigation\)[\s\S]*?fetch\(request\)/,'Navigation should check the network for fresh HTML.');
assert.match(backend,/cachedPublicJsonResponse_\('portalBundle',getPublicPortalBundle_,300\)/);
assert.match(backend,/cachedPublicJsonResponse_\('resources-' \+ category[^\n]+,300\)/);
assert.match(app,/const cached = readPublicModuleCache\(key, true\)/,'Every public section should render stale cached data immediately.');
assert.match(app,/setTimeout\(start,0\)/,'The public bundle should start warming immediately after first render.');
assert.match(app,/prefetchPortalMDCATAssets/,'MDCAT scripts should be prefetched after the homepage becomes usable.');
assert.match(mdcat,/mdcatReadPublicCache\(key,true\)/,'MDCAT navigation should use stale cached directories while refreshing.');

console.log('PASS startup budget: '+initialBytes+' initial JS bytes; MDCAT/account lazy; fresh HTML navigation; public bundle cached.');
