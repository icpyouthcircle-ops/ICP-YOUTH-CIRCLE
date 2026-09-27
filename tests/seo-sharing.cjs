const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(html,/<link rel="canonical" href="https:\/\/icpyouthcircle-ops\.github\.io\/ICP-YOUTH-CIRCLE\/">/);
assert.match(html,/<meta property="og:title" content="ICP YOUTH CIRCLE \| Learn, Connect, Grow">/);
assert.match(html,/<meta property="og:image" content="https:\/\/icpyouthcircle-ops\.github\.io\/ICP-YOUTH-CIRCLE\/assets\/social\/portal-share-1200x630\.png">/);
assert.match(html,/<meta name="twitter:card" content="summary_large_image">/);
assert.match(html,/<script type="application\/ld\+json">/);
const image=fs.readFileSync(path.join(root,'assets','social','portal-share-1200x630.png'));
assert.equal(image.readUInt32BE(16),1200);assert.equal(image.readUInt32BE(20),630);
const app=fs.readFileSync(path.join(root,'js','app.js'),'utf8');
assert.match(app,/function updatePortalMetadata/);assert.match(app,/updatePortalMetadata\(itemLabel,description\.textContent\)/);
console.log('PASS SEO sharing: canonical URL, Open Graph, Twitter card, structured data, dynamic route metadata, and 1200x630 image.');
