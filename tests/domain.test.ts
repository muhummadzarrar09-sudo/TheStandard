import {describe,it,expect} from 'vitest'
import {STANDARD_SCHEDULE,completionPercent,isDayComplete,criticalComplete,cutoffForLocalDate} from '../lib/domain'
import {bestStreak,consecutiveDays} from '../lib/domain/streaks'
import {rankMembers} from '../lib/domain/leaderboard'

describe('schedule domain',()=>{
  it('has required and critical blocks',()=>{
    expect(STANDARD_SCHEDULE.filter(x=>x.required).length).toBe(14)
    expect(STANDARD_SCHEDULE.filter(x=>x.critical).length).toBe(4)
  })
  it('calculates completion',()=>{
    const done=new Set(['wake','exercise'])
    expect(completionPercent(STANDARD_SCHEDULE,done)).toBe(14)
    expect(isDayComplete(STANDARD_SCHEDULE,done)).toBe(false)
    expect(criticalComplete(STANDARD_SCHEDULE,done)).toBe(false)
  })
})

describe('cutoffForLocalDate',()=>{
  // Helper: format a Date in a zone and read the wall-clock parts
  function partsInZone(date:Date,timezone:string){
    const ps=new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(date)
    const get=(t:string)=>Number(ps.find(p=>p.type===t)!.value)
    return{y:get('year'),mo:get('month'),d:get('day'),h:get('hour')===24?0:get('hour'),mi:get('minute'),s:get('second')}
  }
  function expectLocal(date:Date,tz:string,expectYear:number,expectMonth:number,expectDay:number,expectHour:number,expectMin:number=0,expectSec:number=0){
    const w=partsInZone(date,tz)
    expect({y:w.y,mo:w.mo,d:w.d,h:w.h,mi:w.mi,s:w.s}).toEqual({y:expectYear,mo:expectMonth,d:expectDay,h:expectHour,mi:expectMin,s:expectSec})
  }

  it('returns 03:00 local in UTC',()=>{
    const got=cutoffForLocalDate('2026-07-18','UTC',3)
    expectLocal(got,'UTC',2026,7,18,3)
  })
  it('returns 03:00 local in America/Los_Angeles (PDT)',()=>{
    const got=cutoffForLocalDate('2026-07-18','America/Los_Angeles',3)
    expectLocal(got,'America/Los_Angeles',2026,7,18,3)
  })
  it('returns 03:00 local in America/New_York (EDT)',()=>{
    const got=cutoffForLocalDate('2026-07-18','America/New_York',3)
    expectLocal(got,'America/New_York',2026,7,18,3)
  })
  it('returns 03:00 local in Asia/Karachi (UTC+5)',()=>{
    const got=cutoffForLocalDate('2026-07-18','Asia/Karachi',3)
    expectLocal(got,'Asia/Karachi',2026,7,18,3)
  })
  it('returns 03:00 local in Asia/Kathmandu (UTC+5:45)',()=>{
    const got=cutoffForLocalDate('2026-07-18','Asia/Kathmandu',3)
    expectLocal(got,'Asia/Kathmandu',2026,7,18,3)
  })
  it('returns 03:00 local in Pacific/Chatham (UTC+12:45)',()=>{
    const got=cutoffForLocalDate('2026-07-18','Pacific/Chatham',3)
    expectLocal(got,'Pacific/Chatham',2026,7,18,3)
  })
  it('returns 03:00 local in Australia/Adelaide (UTC+9:30)',()=>{
    const got=cutoffForLocalDate('2026-07-18','Australia/Adelaide',3)
    expectLocal(got,'Australia/Adelaide',2026,7,18,3)
  })
  it('returns 03:00 local in Pacific/Apia (UTC+13)',()=>{
    const got=cutoffForLocalDate('2026-07-18','Pacific/Apia',3)
    expectLocal(got,'Pacific/Apia',2026,7,18,3)
  })
  it('handles US spring-forward (2026-03-08 LA)',()=>{
    const got=cutoffForLocalDate('2026-03-08','America/Los_Angeles',3)
    expectLocal(got,'America/Los_Angeles',2026,3,8,3)
  })
  it('handles US fall-back (2026-11-01 LA)',()=>{
    const got=cutoffForLocalDate('2026-11-01','America/Los_Angeles',3)
    expectLocal(got,'America/Los_Angeles',2026,11,1,3)
  })
  it('handles year boundary',()=>{
    const got=cutoffForLocalDate('2026-12-31','UTC',3)
    expectLocal(got,'UTC',2026,12,31,3)
  })
  it('handles leap day',()=>{
    const got=cutoffForLocalDate('2028-02-29','UTC',3)
    expectLocal(got,'UTC',2028,2,29,3)
  })
  it('honors a non-default cutoff hour',()=>{
    const got=cutoffForLocalDate('2026-07-18','America/Los_Angeles',5)
    expectLocal(got,'America/Los_Angeles',2026,7,18,5)
  })
  it('returns Invalid Date for bad input',()=>{
    const got=cutoffForLocalDate('not-a-date','UTC',3)
    expect(Number.isNaN(got.getTime())).toBe(true)
  })
})

describe('streak domain',()=>{
  it('calculates current and best streak',()=>{
    expect(consecutiveDays(['2026-07-16','2026-07-17','2026-07-18'],'2026-07-18')).toBe(3)
    expect(bestStreak(['2026-07-10','2026-07-11','2026-07-14'])).toBe(2)
  })
  it('handles empty input',()=>{
    expect(consecutiveDays([],'2026-07-18')).toBe(0)
    expect(bestStreak([])).toBe(0)
  })
  it('today not yet done still counts prior streak (PRD: skip today once)',()=>{
    // 3 consecutive days ending yesterday, today not yet done
    expect(consecutiveDays(['2026-07-15','2026-07-16','2026-07-17'],'2026-07-18')).toBe(3)
  })
  it('today and yesterday both missing breaks streak',()=>{
    // only 2 days ago and 3 days ago
    expect(consecutiveDays(['2026-07-15','2026-07-16'],'2026-07-18')).toBe(0)
  })
  it('isolated today only',()=>{
    expect(consecutiveDays(['2026-07-18'],'2026-07-18')).toBe(1)
  })
  it('isolated older day does not start a current streak',()=>{
    expect(consecutiveDays(['2026-07-04','2026-07-18'],'2026-07-18')).toBe(1)
  })
  it('gap in middle breaks best streak into two',()=>{
    expect(bestStreak(['2026-07-10','2026-07-11','2026-07-12','2026-07-15','2026-07-16'])).toBe(3)
  })
  it('handles duplicate dates',()=>{
    expect(consecutiveDays(['2026-07-17','2026-07-17','2026-07-18'],'2026-07-18')).toBe(2)
    expect(bestStreak(['2026-07-17','2026-07-17','2026-07-18'])).toBe(2)
  })
})

describe('leaderboard domain',()=>{
  it('uses deterministic tie breaks',()=>{
    const r=rankMembers([
      {userId:'b',displayName:'B',currentStreak:3,completionPercent:90,completedDays:3,joinedAt:'2026-07-02'},
      {userId:'a',displayName:'A',currentStreak:3,completionPercent:90,completedDays:3,joinedAt:'2026-07-01'}
    ])
    expect(r[0].userId).toBe('a')
  })
})
