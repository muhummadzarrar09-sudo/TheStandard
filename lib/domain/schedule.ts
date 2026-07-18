export type ScheduleBlock={key:string;start:string;end?:string;label:string;required:boolean;critical?:boolean}
export const STANDARD_SCHEDULE:ScheduleBlock[]=[
 {key:'wake',start:'05:00',end:'05:30',label:'Wake, hydrate, light movement',required:true},
 {key:'exercise',start:'05:30',end:'06:30',label:'Exercise',required:true},
 {key:'meal',start:'06:30',end:'07:00',label:'Meal',required:true},
 {key:'deep-1',start:'07:00',end:'09:00',label:'Deep work block 1',required:true,critical:true},
 {key:'break-1',start:'09:00',end:'09:15',label:'Break',required:true},
 {key:'deep-2',start:'09:15',end:'11:15',label:'Deep work block 2',required:true,critical:true},
 {key:'review',start:'11:15',end:'12:00',label:'Review latest interview/report',required:true},
 {key:'lunch',start:'12:00',end:'13:00',label:'Lunch / rest',required:true},
 {key:'team-deep-work',start:'13:00',end:'15:00',label:'Deep work block 3 · team/startup progress',required:true,critical:true},
 {key:'break-2',start:'15:00',end:'15:30',label:'Break',required:true},
 {key:'engagement',start:'15:30',end:'17:00',label:'Community / team engagement',required:true},
 {key:'movement',start:'17:00',end:'18:00',label:'Wind-down movement',required:true},
 {key:'dinner',start:'18:00',end:'19:00',label:'Dinner',required:true},
 {key:'reflection',start:'19:00',end:'20:00',label:'Reflection + plan tomorrow · check-in',required:true,critical:true},
 {key:'personal',start:'20:00',end:'21:00',label:'Personal time',required:false},
 {key:'sleep',start:'21:00',label:'Wind down for sleep',required:false}
]
export function completionPercent(blocks:ScheduleBlock[],completed:Set<string>){const required=blocks.filter(b=>b.required);return required.length?Math.round(required.filter(b=>completed.has(b.key)).length/required.length*100):0}
export function isDayComplete(blocks:ScheduleBlock[],completed:Set<string>){return blocks.filter(b=>b.required).every(b=>completed.has(b.key))}
export function criticalComplete(blocks:ScheduleBlock[],completed:Set<string>){return blocks.filter(b=>b.critical).every(b=>completed.has(b.key))}
export function localDateInTimezone(date:Date,timezone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)}

function partsInZone(date:Date,timezone:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(date);
  const get=(t:string)=>Number(parts.find(p=>p.type===t)!.value);
  return{y:get('year'),mo:get('month'),d:get('day'),h:get('hour')===24?0:get('hour'),mi:get('minute'),s:get('second')}
}

// Returns the UTC instant whose wall-clock in `timezone` is `localDate` at `cutoffHour:00:00`.
// Robust across DST transitions, half-hour offsets, and the International Date Line.
export function cutoffForLocalDate(localDate:string,timezone:string,cutoffHour=3){
  const[y,mo,d]=localDate.split('-').map(Number);
  if(!Number.isFinite(y)||!Number.isFinite(mo)||!Number.isFinite(d))return new Date(NaN);
  // Closed-form first: it works on the common case (no DST transition between
  // localDate 00:00 and cutoffHour:00 in the target zone).
  const T0=Date.UTC(y,mo-1,d,cutoffHour,0,0);
  const w0=partsInZone(new Date(T0),timezone);
  const W=Date.UTC(w0.y,w0.mo-1,w0.d,w0.h,w0.mi,w0.s);
  const closedForm=new Date(2*T0-W);
  // Verify the closed form actually lands on localDate at cutoffHour:00:00.
  const w=partsInZone(closedForm,timezone);
  if(w.y===y&&w.mo===mo&&w.d===d&&w.h===cutoffHour&&w.mi===0&&w.s===0)return closedForm;
  // DST fallback: scan forward in 1-hour steps from (localDate, cutoffHour-12, 0) UTC
  // for up to 24 hours. The first instant whose wall-clock matches is the answer.
  const Tstart=Date.UTC(y,mo-1,d,cutoffHour-12,0,0);
  for(let h=0;h<=24;h++){
    const T=Tstart+h*3600000;
    const w2=partsInZone(new Date(T),timezone);
    if(w2.y===y&&w2.mo===mo&&w2.d===d&&w2.h===cutoffHour&&w2.mi===0&&w2.s===0)return new Date(T)
  }
  return closedForm
}
