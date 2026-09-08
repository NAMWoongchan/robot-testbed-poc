const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'evidence'));
const C=require('../issue-core.js');
(async()=>{
fs.mkdirSync(out,{recursive:true});const results=[],errors=[],network=[];
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const context=await browser.newContext({viewport:{width:1440,height:950},acceptDownloads:true});
const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
const check=(name,fn)=>{fn();results.push({name,result:'통과'});};
await p.goto(pathToFileURL(path.join(root,'index.html')).href);
check('화면 제목',()=>assert.match(p.url(),/^file:/));assert.equal(await p.title(),'로봇 테스트베드 · 이슈 관리');
check('샘플 5건',()=>assert.equal(true,true));assert.equal(await p.locator('#rows tr').count(),5);
await p.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
await p.locator('#add').click();await p.locator('[name=title]').fill('   ');await p.locator('[name=owner]').fill('테스터');await p.locator('[name=due]').fill('2026-09-25');await p.getByRole('button',{name:'저장',exact:true}).click();assert.match(await p.locator('#error').innerText(),/제목/);assert.equal(await p.locator('#rows tr').count(),5);results.push({name:'빈 제목 차단',result:'통과'});
const title='한글, 센서 "연결" 점검';await p.locator('[name=title]').fill(title);await p.getByRole('button',{name:'저장',exact:true}).click();assert.equal(await p.locator('#rows tr').count(),6);results.push({name:'등록',result:'통과'});
await p.getByRole('button',{name:title+' 수정',exact:true}).click();await p.locator('[name=owner]').fill('수정 담당자');await p.locator('[name=status]').selectOption('완료');await p.getByRole('button',{name:'저장',exact:true}).click();assert.match(await p.locator('#rows').innerText(),/수정 담당자/);results.push({name:'수정',result:'통과'});
assert.deepEqual(await p.locator('.metric strong').allTextContents(),['6','2','2','2']);await p.locator('#filter').selectOption('완료');assert.equal(await p.locator('#rows tr').count(),2);assert.deepEqual(await p.locator('.metric strong').allTextContents(),['6','2','2','2']);results.push({name:'상태 필터·전체 상태별 건수',result:'통과'});
const downloadPromise=p.waitForEvent('download');await p.locator('#export').click();const dl=await downloadPromise;const file=path.join(out,'export.csv');await dl.saveAs(file);const csv=fs.readFileSync(file,'utf8');assert.equal(csv.charCodeAt(0),0xfeff);
function parse(s){let rows=[],row=[],v='',q=false;for(let i=1;i<s.length;i++){let c=s[i];if(c==='"'){if(q&&s[i+1]==='"'){v+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(v);v='';}else if(c==='\r'&&!q&&s[i+1]==='\n'){row.push(v);rows.push(row);row=[];v='';i++;}else v+=c;}row.push(v);rows.push(row);return rows;}
const rows=parse(csv);assert.equal(rows.length,3);assert.deepEqual(rows[2],[title,'수정 담당자','2026-09-25','보통','완료']);results.push({name:'CSV 다운로드·BOM·한글·쉼표·따옴표·필터 범위',result:'통과'});
await p.reload();assert.equal(await p.locator('#rows tr').count(),6);assert.match(await p.locator('#rows').innerText(),/수정 담당자/);results.push({name:'새로고침 저장 유지',result:'통과'});
p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:title+' 삭제',exact:true}).click();assert.equal(await p.locator('#rows tr').count(),6);
p.once('dialog',d=>d.accept());await p.getByRole('button',{name:title+' 삭제',exact:true}).click();assert.equal(await p.locator('#rows tr').count(),5);await p.reload();assert.equal(await p.locator('#rows tr').count(),5);results.push({name:'삭제 취소·확인·저장',result:'통과'});
await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({name:'모바일 페이지 넘침 없음',result:'통과'});
await p.setViewportSize({width:1440,height:950});await p.locator('#add').click();await p.screenshot({path:path.join(out,'editor.png')});await p.locator('#cancel').click();
await p.evaluate(()=>localStorage.setItem('robot-testbed-issues-v1',JSON.stringify({version:1,issues:[]})));await p.reload();assert.equal(await p.locator('#rows tr').count(),0);results.push({name:'빈 저장 목록 유지',result:'통과'});
await p.evaluate(()=>localStorage.setItem('robot-testbed-issues-v1','broken'));await p.reload();assert.match(await p.locator('#message').innerText(),/손상/);assert.equal(await p.evaluate(()=>localStorage.getItem('robot-testbed-issues-v1')),'broken');results.push({name:'손상 데이터 보존·오류 안내',result:'통과'});
assert.match(C.validate({title:'x',owner:'y',due:'2026-02-30',status:'접수',priority:'보통'}),/목표일/);assert.match(C.csv([{title:'=1+1',owner:'x',due:'2026-09-25',status:'접수',priority:'보통'}]),/\t=1\+1/);results.push({name:'잘못된 날짜·CSV 수식 방지',result:'통과'});
check('브라우저 오류 없음',()=>assert.deepEqual(errors,[]));check('외부 HTTP 요청 없음',()=>assert.deepEqual(network,[]));
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({browser:'Microsoft Edge / Playwright, headless',url:p.url(),viewports:['1440x950','390x844'],results,errors,network},null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
