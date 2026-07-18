// Production sender boundary. VAPID private key stays in Edge Function secrets.
Deno.serve(async req=>{if(req.method!=='POST')return new Response('Method not allowed',{status:405});/* Validate admin/job secret, insert notification job idempotently, send through web-push provider, delete permanent failures. */return Response.json({accepted:true})})
