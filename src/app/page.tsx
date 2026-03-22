"use client";
import { useState, useEffect, useCallback } from "react";

const R="#E50914",PK="#FF007A",BK="#141414",DK="#1f1f1f",CD="#2a2a2a",BR="#333",MT="#808080",WH="#fff",GR="#46d369",WN="#f87171";
const CATS=["AUTO","CELEBRITY","MUSIC","TV & FILM","FASHION","EVENTS","AWARDS","EAST AFRICA","GENERAL"];

interface LogEntry{articleId:string;title:string;url:string;category:string;sourceType?:string;manualPost?:boolean;instagram:{success:boolean;postId?:string;error?:string};facebook:{success:boolean;postId?:string;error?:string};postedAt:string;isBreaking?:boolean}
interface Preview{scraped:{type:string;title:string;description:string;imageUrl:string;sourceName:string};ai:{clickbaitTitle:string;caption:string};category:string;imageBase64:string}
interface Retry{loading:boolean;done?:boolean;error?:string}

function ago(iso:string){const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);if(m<1)return"now";if(m<60)return m+"m";const h=Math.floor(m/60);if(h<24)return h+"h";return Math.floor(h/24)+"d"}

export default function Home(){
  const[tab,setTab]=useState<"post"|"log"|"stats">("post");
  const[log,setLog]=useState<LogEntry[]>([]);
  const[logLoading,setLogLoading]=useState(true);
  const[url,setUrl]=useState("");
  const[cat,setCat]=useState("AUTO");
  const[preview,setPreview]=useState<Preview|null>(null);
  const[prevLoading,setPrevLoading]=useState(false);
  const[posting,setPosting]=useState(false);
  const[err,setErr]=useState<string|null>(null);
  const[ok,setOk]=useState<string|null>(null);
  const[lightbox,setLightbox]=useState(false);
  const[retries,setRetries]=useState<Record<string,Retry>>({});

  const fetchLog=useCallback(async()=>{
    try{const r=await fetch("/api/post-log");if(r.ok){const d=await r.json();setLog(d.log||[]);}}catch{}finally{setLogLoading(false);}
  },[]);

  useEffect(()=>{fetchLog();const t=setInterval(fetchLog,60000);return()=>clearInterval(t);},[fetchLog]);

  async function doPreview(){
    if(!url.trim())return;
    setPrevLoading(true);setErr(null);setPreview(null);setOk(null);
    try{
      const r=await fetch("/api/preview-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.trim(),category:cat==="AUTO"?undefined:cat})});
      const d=await r.json();
      if(!r.ok||d.error)throw new Error(d.error||"Preview failed");
      setPreview(d);
    }catch(e:any){setErr(e.message);}
    finally{setPrevLoading(false);}
  }

  async function doPost(){
    if(!preview)return;
    setPosting(true);setErr(null);setOk(null);
    try{
      const r=await fetch("/api/post-from-url-proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url.trim(),category:cat==="AUTO"?undefined:cat})});
      const d=await r.json();
      if(!r.ok||d.error)throw new Error(d.error||"Post failed");
      const ig=d.instagram?.success,fb=d.facebook?.success;
      setOk((ig&&fb)?"✅ Posted to IG + FB":ig?"✅ IG only":fb?"✅ FB only":"❌ Both failed");
      if(ig||fb){setUrl("");setPreview(null);setTimeout(fetchLog,2000);}
    }catch(e:any){setErr(e.message);}
    finally{setPosting(false);}
  }

  async function doRetry(entry:LogEntry,platform:"instagram"|"facebook"){
    const key=entry.articleId+"_"+platform;
    setRetries(s=>({...s,[key]:{loading:true}}));
    try{
      const r=await fetch("/api/retry-post",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({articleId:entry.articleId,title:entry.title,caption:entry.title,articleUrl:entry.url,category:entry.category,platform})});
      const d=await r.json();
      const success=platform==="instagram"?d.instagram?.success:d.facebook?.success;
      setRetries(s=>({...s,[key]:{loading:false,done:success,error:success?undefined:(d.error||"Failed")}}));
      if(success)setTimeout(fetchLog,1500);
    }catch(e:any){setRetries(s=>({...s,[key]:{loading:false,error:e.message}}));}
  }

  const todayCount=log.filter(p=>new Date(p.postedAt).toDateString()===new Date().toDateString()).length;
  const successCount=log.filter(p=>p.instagram.success||p.facebook.success).length;
  const catCounts=CATS.reduce((a,c)=>({...a,[c]:log.filter(p=>p.category===c).length}),{} as Record<string,number>);
  const maxCat=Math.max(1,...Object.values(catCounts));

  const css=`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
    body{background:${BK};color:${WH};font-family:'Inter',system-ui,sans-serif}
    input,button{font-family:inherit}
    input::placeholder{color:${MT}}
    ::-webkit-scrollbar{width:0}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    @keyframes spin{to{transform:rotate(360deg)}}
  `;

  return(
    <div style={{minHeight:"100dvh",maxWidth:480,margin:"0 auto",background:BK,display:"flex",flexDirection:"column"}}>
      <style>{css}</style>

      {/* ── Header ── */}
      <div style={{background:DK,borderBottom:`1px solid ${BR}`,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:R,animation:"pulse 1.5s infinite"}}/>
          <span style={{fontSize:20,fontWeight:800,letterSpacing:1}}>PPP<span style={{color:PK}}>TV</span></span>
          <span style={{fontSize:11,color:MT,letterSpacing:1}}>LIVE</span>
        </div>
        <span style={{fontSize:12,color:MT}}>{todayCount}/6 today</span>
      </div>

      {/* ── Content ── */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:72}}>

        {/* POST TAB */}
        {tab==="post"&&(
          <div style={{padding:16}}>
            <div style={{fontSize:11,color:MT,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Post from any URL</div>

            <input
              style={{width:"100%",background:CD,border:`1px solid ${BR}`,borderRadius:8,padding:"12px 14px",color:WH,fontSize:15,outline:"none",marginBottom:10}}
              placeholder="Paste article / YouTube / TikTok / Twitter URL…"
              value={url} onChange={e=>setUrl(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!preview&&doPreview()}
            />

            <div style={{fontSize:11,color:MT,letterSpacing:1,marginBottom:6,textTransform:"uppercase"}}>Category</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCat(c)}
                  style={{background:cat===c?PK:"#333",color:WH,border:"none",borderRadius:20,padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:cat===c?700:400}}>
                  {c}
                </button>
              ))}
            </div>

            {!preview&&(
              <button onClick={doPreview} disabled={prevLoading||!url.trim()}
                style={{width:"100%",background:prevLoading||!url.trim()?"#333":R,color:WH,border:"none",borderRadius:8,padding:"13px 0",fontSize:15,fontWeight:700,cursor:prevLoading||!url.trim()?"not-allowed":"pointer",opacity:prevLoading||!url.trim()?0.6:1}}>
                {prevLoading?"⏳ Fetching…":"🔍 Preview"}
              </button>
            )}

            {err&&<div style={{background:"#3a0000",border:`1px solid ${WN}`,borderRadius:8,padding:"10px 14px",color:WN,fontSize:13,marginTop:10}}>⚠ {err}</div>}
            {ok&&<div style={{background:"#003a10",border:`1px solid ${GR}`,borderRadius:8,padding:"10px 14px",color:GR,fontSize:13,marginTop:10}}>{ok}</div>}

            {preview&&(
              <div style={{marginTop:14}}>
                <div style={{fontSize:11,color:MT,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Preview</div>
                <div style={{background:CD,borderRadius:10,overflow:"hidden",marginBottom:10}}>
                  {preview.imageBase64&&(
                    <div style={{position:"relative",cursor:"zoom-in"}} onClick={()=>setLightbox(true)}>
                      <img src={preview.imageBase64} alt="" style={{width:"100%",aspectRatio:"4/5",objectFit:"cover",display:"block"}}/>
                    </div>
                  )}
                  <div style={{padding:"12px 14px"}}>
                    <div style={{fontSize:15,fontWeight:700,lineHeight:1.3,marginBottom:6}}>{preview.ai.clickbaitTitle}</div>
                    <div style={{fontSize:12,color:MT,lineHeight:1.4,marginBottom:8}}>{preview.ai.caption.slice(0,160)}…</div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{background:PK,color:WH,borderRadius:4,padding:"2px 7px",fontSize:11,fontWeight:700}}>{preview.category}</span>
                      <span style={{fontSize:11,color:MT}}>{preview.scraped.sourceName}</span>
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setPreview(null);setOk(null);}} style={{flex:1,background:"#444",color:WH,border:"none",borderRadius:8,padding:"12px 0",fontSize:14,fontWeight:700,cursor:"pointer"}}>✕ Clear</button>
                  <button onClick={doPost} disabled={posting} style={{flex:2,background:posting?"#333":R,color:WH,border:"none",borderRadius:8,padding:"12px 0",fontSize:14,fontWeight:700,cursor:posting?"not-allowed":"pointer",opacity:posting?0.6:1}}>
                    {posting?"⏳ Posting…":"📤 Post to IG + FB"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOG TAB */}
        {tab==="log"&&(
          <div style={{padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,color:MT,letterSpacing:1,textTransform:"uppercase"}}>Post Log</div>
              <button onClick={fetchLog} style={{background:"none",border:`1px solid ${BR}`,color:MT,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>↻ Refresh</button>
            </div>
            {logLoading&&<div style={{color:MT,fontSize:13,textAlign:"center",padding:24}}>Loading…</div>}
            {!logLoading&&log.length===0&&<div style={{color:MT,fontSize:13,textAlign:"center",padding:24}}>No posts yet</div>}
            {log.slice().reverse().map(entry=>{
              const igKey=entry.articleId+"_instagram",fbKey=entry.articleId+"_facebook";
              const igR=retries[igKey],fbR=retries[fbKey];
              return(
                <div key={entry.articleId} style={{background:CD,borderRadius:10,marginBottom:10,padding:"12px 14px"}}>
                  <div style={{fontSize:13,fontWeight:700,lineHeight:1.3,marginBottom:6}}>{entry.title}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
                    <span style={{background:PK,color:WH,borderRadius:4,padding:"2px 7px",fontSize:11,fontWeight:700}}>{entry.category}</span>
                    {entry.isBreaking&&<span style={{background:R,color:WH,borderRadius:4,padding:"2px 7px",fontSize:11,fontWeight:700}}>BREAKING</span>}
                    {entry.manualPost&&<span style={{background:"#555",color:WH,borderRadius:4,padding:"2px 7px",fontSize:11}}>MANUAL</span>}
                    <span style={{fontSize:11,color:MT}}>{ago(entry.postedAt)}</span>
                  </div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:11,color:MT}}>IG:</span>
                      {entry.instagram.success
                        ?<span style={{fontSize:11,color:GR}}>✓</span>
                        :igR?.done?<span style={{fontSize:11,color:GR}}>✓ retried</span>
                        :<button onClick={()=>doRetry(entry,"instagram")} disabled={igR?.loading}
                          style={{background:igR?.loading?"#555":WN,color:WH,border:"none",borderRadius:6,padding:"3px 9px",fontSize:11,cursor:igR?.loading?"not-allowed":"pointer",fontWeight:700}}>
                          {igR?.loading?"…":"↺ IG"}
                        </button>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:11,color:MT}}>FB:</span>
                      {entry.facebook.success
                        ?<span style={{fontSize:11,color:GR}}>✓</span>
                        :fbR?.done?<span style={{fontSize:11,color:GR}}>✓ retried</span>
                        :<button onClick={()=>doRetry(entry,"facebook")} disabled={fbR?.loading}
                          style={{background:fbR?.loading?"#555":WN,color:WH,border:"none",borderRadius:6,padding:"3px 9px",fontSize:11,cursor:fbR?.loading?"not-allowed":"pointer",fontWeight:700}}>
                          {fbR?.loading?"…":"↺ FB"}
                        </button>}
                    </div>
                  </div>
                  {(igR?.error||fbR?.error)&&<div style={{fontSize:11,color:WN,marginTop:4}}>{igR?.error||fbR?.error}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* STATS TAB */}
        {tab==="stats"&&(
          <div style={{padding:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[["Today",todayCount,R],["Total",successCount,GR],["IG",log.filter(p=>p.instagram.success).length,PK],["FB",log.filter(p=>p.facebook.success).length,"#1877f2"]].map(([label,val,color])=>(
                <div key={label as string} style={{background:CD,borderRadius:10,padding:16}}>
                  <div style={{fontSize:38,fontWeight:800,color:color as string,lineHeight:1}}>{val as number}</div>
                  <div style={{fontSize:12,color:MT,marginTop:4}}>{label as string}</div>
                </div>
              ))}
            </div>
            <div style={{height:1,background:BR,marginBottom:16}}/>
            <div style={{fontSize:11,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>By Category</div>
            {CATS.filter(c=>catCounts[c]>0).map(c=>(
              <div key={c} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{fontSize:11,color:MT,width:80,flexShrink:0}}>{c.slice(0,10)}</div>
                <div style={{flex:1,background:"#333",borderRadius:4,height:8}}>
                  <div style={{width:`${Math.round(catCounts[c]/maxCat*100)}%`,background:PK,borderRadius:4,height:8,transition:"width .4s"}}/>
                </div>
                <div style={{fontSize:11,color:MT,width:20,textAlign:"right"}}>{catCounts[c]}</div>
              </div>
            ))}
            <div style={{height:1,background:BR,margin:"16px 0"}}/>
            <div style={{fontSize:11,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Config</div>
            {[["Schedule","Every 30 min"],["Peak Hours","6am–11pm EAT"],["Daily Cap","6 posts/day"],["Per Run","1 post"],["Dedup","Cloudflare KV"],["Filter","Kenya only"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${BR}`,fontSize:13}}>
                <span style={{color:MT}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:DK,borderTop:`1px solid ${BR}`,display:"flex",zIndex:50}}>
        {([["post","📤","Post"],["log","📋","Feed"],["stats","📊","Stats"]] as const).map(([t,icon,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{flex:1,padding:"11px 0 9px",background:"none",border:"none",color:tab===t?WH:MT,fontSize:11,fontWeight:tab===t?700:400,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:tab===t?`2px solid ${R}`:"2px solid transparent"}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span>{label}{t==="log"&&log.length>0&&<span style={{background:R,borderRadius:10,padding:"0 5px",fontSize:10,marginLeft:3}}>{log.length}</span>}</span>
          </button>
        ))}
      </nav>

      {lightbox&&preview?.imageBase64&&(
        <div onClick={()=>setLightbox(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <img src={preview.imageBase64} alt="" style={{maxWidth:"95vw",maxHeight:"90dvh",borderRadius:8,objectFit:"contain"}}/>
        </div>
      )}
    </div>
  );
}
