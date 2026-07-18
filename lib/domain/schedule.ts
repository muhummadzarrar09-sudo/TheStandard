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
export function cutoffForLocalDate(localDate:string,timezone:string,cutoffHour=3){const [y,m,d]=localDate.split('-').map(Number);const utcGuess=new Date(Date.UTC(y,m-1,d+1,cutoffHour));const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,timeZoneName:'longOffset'}).formatToParts(utcGuess);const offset=parts.find(p=>p.type==='timeZoneName')?.value?.replace('GMT','')||'+00:00';const sign=offset.startsWith('-')?-1:1;const [oh,om]=offset.replace('+','').replace('-','').split(':').map(Number);return new Date(utcGuess.getTime()-sign*(oh*60+om)*60000)}
