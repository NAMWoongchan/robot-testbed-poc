'use strict';
const KEY='robot-testbed-issues-v1',core=IssueCore,$=s=>document.querySelector(s);
let issues=[],editing=null,blocked=false;
function notify(s){$('#message').textContent=s;}
function persist(){if(blocked){notify('손상된 저장 데이터가 있어 원본을 보존하고 있습니다. 변경은 임시 상태이므로 CSV로 내보내세요.');return;}try{localStorage.setItem(KEY,JSON.stringify({version:1,issues}));notify('이 브라우저에 저장했습니다.');}catch{notify('저장할 수 없습니다. 창을 닫기 전에 CSV로 내보내세요.');}}
try{const raw=localStorage.getItem(KEY);if(raw===null){issues=SAMPLE_ISSUES.map(x=>({...x}));persist();}else{try{issues=core.decode(raw);notify('저장된 데이터를 불러왔습니다.');}catch{blocked=true;notify('저장 데이터가 손상되어 원본을 보존했습니다. 목록을 복구하지 못했습니다. 변경은 임시 상태로만 유지됩니다.');}}}catch{issues=SAMPLE_ISSUES.map(x=>({...x}));notify('브라우저 저장소에 접근할 수 없습니다. 변경 후 CSV로 내보내세요.');}
function visible(){return issues.filter(i=>$('#filter').value==='전체'||i.status===$('#filter').value);}
function node(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
function render(){
 $('#summary').replaceChildren(...['전체',...core.statuses].map(s=>{const n=node('div','','metric');n.append(node('span',s),node('strong',s==='전체'?issues.length:issues.filter(i=>i.status===s).length));return n;}));
 const list=visible();$('#visible-count').textContent=`전체 ${issues.length}건 중 ${list.length}건 표시`;$('#export').textContent=`CSV 내보내기 (${list.length}건)`;$('#empty').hidden=list.length>0;
 $('#rows').replaceChildren(...list.map(i=>{const tr=node('tr','');tr.dataset.id=i.id;tr.append(node('td',i.title),node('td',i.owner),node('td',i.due),node('td',i.priority,i.priority==='높음'?'high':''));const status=node('td','');status.append(node('span',i.status,'badge s'+core.statuses.indexOf(i.status)));const actions=node('td','');for(const label of ['수정','삭제']){const b=node('button',label);b.setAttribute('aria-label',`${i.title} ${label}`);b.onclick=()=>label==='수정'?openEditor(i):remove(i);actions.append(b);}tr.append(status,actions);return tr;}));
}
function openEditor(i){editing=i?.id??null;$('#form').reset();$('#error').textContent='';$('#editor-title').textContent=i?'이슈 수정':'이슈 등록';if(i)for(const k of ['title','owner','due','priority','status'])$('#form').elements[k].value=i[k];$('#editor').showModal();$('#form').elements.title.focus();}
function remove(i){if(confirm(`“${i.title}” 이슈를 삭제하시겠습니까?`)){issues=issues.filter(x=>x.id!==i.id);persist();render();}}
$('#add').onclick=()=>openEditor();$('#cancel').onclick=()=>$('#editor').close();$('#filter').onchange=render;
$('#form').onsubmit=e=>{e.preventDefault();const f=$('#form').elements;const item={id:editing??crypto.randomUUID(),title:f.title.value.trim(),owner:f.owner.value.trim(),due:f.due.value,priority:f.priority.value,status:f.status.value};const error=core.validate(item);if(error){$('#error').textContent=error;if(!item.title)f.title.focus();return;}if(editing)issues=issues.map(i=>i.id===editing?item:i);else issues.push(item);persist();render();$('#editor').close();};
$('#export').onclick=()=>{const blob=new Blob([core.csv(visible())],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='로봇_테스트베드_이슈.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();
