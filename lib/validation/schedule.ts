export function validTimezone(value:string){try{new Intl.DateTimeFormat('en-US',{timeZone:value}).format();return true}catch{return false}}
export function validClientEventId(value:string){return /^[a-zA-Z0-9_-]{8,100}$/.test(value)}
