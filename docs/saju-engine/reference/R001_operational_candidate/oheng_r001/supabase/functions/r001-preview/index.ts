// Supabase Edge Function integration SCHEME. NOT DEPLOYED or authenticated against a live Supabase project.
// Allows preview calculation for authenticated/anonymous Supabase Auth JWT sessions only.
// NEVER returns an approved paid reading while R-015 release gate is pending.
import { calculateR001, validateTerms, R001Error } from '../../../oheng_r001.ts';
import terms from '../../../solar_terms_1899_2101.json' with { type: 'json' };
validateTerms(terms);
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN');
const authUrl = Deno.env.get('SUPABASE_URL');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
if (!allowedOrigin || !authUrl || !anonKey) throw new Error('Supabase configuration missing');
const headers = { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers':'authorization, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Vary':'Origin', 'Content-Type':'application/json' };
const response=(body:unknown,status:number)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async (req)=>{
  if (req.headers.get('Origin')!==allowedOrigin) return response({error:'ORIGIN_REJECTED'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return response({error:'METHOD_NOT_ALLOWED'},405);
  const jwt=req.headers.get('Authorization');
  if(!jwt?.startsWith('Bearer '))return response({error:'AUTH_REQUIRED'},401);
  const verify=await fetch(`${authUrl}/auth/v1/user`,{headers:{'apikey':anonKey,'Authorization':jwt}});
  if(!verify.ok)return response({error:'AUTH_INVALID'},401);
  const size=Number(req.headers.get('Content-Length')??0);
  if(size>4096)return response({error:'BODY_TOO_LARGE'},413);
  try{
    const raw=await req.text();
    if(new TextEncoder().encode(raw).length>4096)return response({error:'BODY_TOO_LARGE'},413);
    const payload=JSON.parse(raw);
    // Explicit whitelist: do not trust client-computed pillars, rules, or approval flags.
    const calculated=calculateR001({local:payload.local,zone:payload.zone, ambiguous:payload.ambiguous,dayRollover:payload.dayRollover, timeBasis:'legal_civil'},terms);
    // This function is preview-only; no paid access or approval can be granted here.
    return response({release:'PREVIEW_ONLY',...calculated},200);
  }catch(e){
    if(e instanceof R001Error)return response({error:e.code,message:e.message},422);
    return response({error:'BAD_REQUEST'},400);
  }
});
