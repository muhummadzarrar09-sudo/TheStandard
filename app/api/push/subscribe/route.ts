import { NextRequest } from 'next/server'
export async function POST(req:NextRequest){if(!req.headers.get('authorization'))return new Response('Unauthorized',{status:401});const body=await req.json();if(!body.endpoint||!body.keys?.p256dh||!body.keys?.auth)return new Response('Invalid subscription',{status:400});return Response.json({ok:true})}
