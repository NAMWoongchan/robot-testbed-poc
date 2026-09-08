(function(root){
 'use strict';
 const statuses=['접수','진행 중','완료'], priorities=['높음','보통','낮음'];
 function validate(x){
  if(!x || typeof x.title!=='string'||!x.title.trim()||x.title.length>200)return '이슈 제목을 1~200자로 입력해 주세요.';
  if(typeof x.owner!=='string'||!x.owner.trim()||x.owner.length>80)return '담당자를 1~80자로 입력해 주세요.';
  if(typeof x.due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.due)||!Number.isFinite(Date.parse(x.due))||new Date(x.due).toISOString().slice(0,10)!==x.due)return '올바른 목표일을 입력해 주세요.';
  if(!statuses.includes(x.status)||!priorities.includes(x.priority))return '상태와 우선순위를 확인해 주세요.';
  return '';
 }
 function decode(raw){const x=JSON.parse(raw);if(!x||x.version!==1||!Array.isArray(x.issues)||x.issues.some(i=>validate(i)||typeof i.id!=='string'||!i.id)||new Set(x.issues.map(i=>i.id)).size!==x.issues.length)throw Error('손상된 저장 데이터');return x.issues;}
 function csv(items){const cell=v=>'"'+(/^[\s]*[=+@-]/.test(String(v))?'\t'+v:String(v)).replace(/"/g,'""')+'"';return '\uFEFF'+[['이슈 제목','담당자','목표일','우선순위','상태'],...items.map(i=>[i.title,i.owner,i.due,i.priority,i.status])].map(row=>row.map(cell).join(',')).join('\r\n');}
 const api={statuses,priorities,validate,decode,csv};root.IssueCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
