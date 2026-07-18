export type MemberScore={userId:string;displayName:string;currentStreak:number;completionPercent:number;completedDays:number;joinedAt:string}
export function rankMembers(members:MemberScore[]){return [...members].sort((a,b)=>b.currentStreak-a.currentStreak||b.completionPercent-a.completionPercent||b.completedDays-a.completedDays||a.joinedAt.localeCompare(b.joinedAt)).map((m,i)=>({...m,rank:i+1}))}
export function personalRank(ranked:{userId:string;rank:number}[],userId:string){return ranked.find(x=>x.userId===userId)?.rank??null}
