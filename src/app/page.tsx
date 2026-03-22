"use client";
import { useState, useEffect, useCallback } from "react";

const R="#E50914",PK="#FF007A",BK="#141414",DK="#1a1a1a",CD="#242424",BR="#333",MT="#888",WH="#fff",GR="#46d369",WN="#f87171",BL="#1877f2";
const CATS=["AUTO","CELEBRITY","MUSIC","TV & FILM","FASHION","EVENTS","AWARDS","EAST AFRICA","GENERAL"];

interface LogEntry{articleId:string;title:string;url:string;category:string;sourceType?:string;manualPost?:boolean;instagram:{success:boolean;postId?:string;error?:string};facebook:{success:boolean;postId?:string;error?:string};postedAt:string;isBreaking?:boolean}
interface Preview{scraped:{type:string;title:string;description:string;imageUrl:string;sourceName:string};ai:{clickbaitTitle:string;caption:string};category:string;imageBase64:string}
interface Retry{loading:boolean;done?:boolean;error?:string}

function ago(iso:string){const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);if(m<1)return"now";if(m<60)return m+"m";const h=Math.floor(m/60);if(h<24)return h+"h";return Math.floor(h/24)+"d"}
function isInstagram(u:string){return/instagram\.com/.test(u)}

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
  // Instagram manual fields
  const[igTitle,setIgTitle]=useState("");
  const[igCaption,setIgCaption]=useState("");
  const[needsManual,setNeedsManual]=useState(false);

  const fetchLog=useCallback(async()=>{
    try{const r=await fetch("/api/post-log");if(r.ok){const d=await r.json();setLog(d.log||[]);}}catch{}finally{setLogLoading(false);}
  },[]);

  useEffect(()=>{fetchLog();const t=setInterval(fetchLog,60000);return()=>clearInterval(t);},[fetchLog]);

  // Reset manual fields when URL changes
  useEffect(()=>{
    setNeedsManual(false);setIgTitle("");setIgCaption("");setErr(null);setPreview(null);setOk(null);
  },[url]);

  async function doPreview(overrideTitle?:string,overrideCaption?:string){
    if(!url.trim())return;
    setPrevLoading(true);setErr(null);setPreview(null);setOk(null);
    try{
      const body:Record<string,string>={url:url.trim()};
      if(cat!=="AUTO")body.category=cat;
      if(overrideTitle)body.manualTitle=overrideTitle;
      if(overrideCaption)body.manualCaption=overrideCaption;
      const r=await fetch("/api/preview-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(d.error==="INSTAGRAM_MANUAL"){setNeedsManual(true);setPrevLoading(false);return;}
      if(!r.ok||d.error)throw new Error(d.error||"Preview failed");
      setNeedsManual(false);
      setPreview(d);
    }catch(e:any){setErr(e.message);}
    finally{setPrevLoading(false);}
  }

  async function doPost(){
    if(!preview)return;
    setPosting(true);setErr(null);setOk(null);
    try{
      const body:Record<string,string>={url:url.trim()};
      if(cat!=="AUTO")body.category=cat;
      if(isInstagram(url)&&igTitle)body.manualTitle=igTitle;
      if(isInstagram(url)&&igCaption)body.manualCaption=igCaption;
      const r=await fetch("/api/post-from-url-proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok||d.error)throw new Error(d.error||"Post failed");
      const ig=d.instagram?.success,fb=d.facebook?.success;
      setOk((ig&&fb)?"✅ Posted to IG + FB":ig?"✅ IG only":fb?"✅ FB only":"❌ Both failed");
      if(ig||fb){setUrl("");setPreview(null);setNeedsManual(false);setTimeout(fetchLog,2000);}
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
  const igCount=log.filter(p=>p.instagram.success).length;
  const fbCount=log.filter(p=>p.facebook.success).length;
  const catCounts=CATS.reduce((a,c)=>({...a,[c]:log.filter(p=>p.category===c).length}),{} as Record<string,number>);
  const maxCat=Math.max(1,...Object.values(catCounts));

  const css=`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
    html,body{height:100%}
    body{background:${BK};color:${WH};font-family:'Inter',system-ui,sans-serif}
    input,button,textarea{font-family:inherit}
    input::placeholder,textarea::placeholder{color:${MT}}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-track{background:#1a1a1a}
    ::-webkit-scrollbar-thumb{background:#444;border-radius:4px}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .card{background:${CD};border-radius:12px;border:1px solid ${BR}}
    .btn{border:none;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s}
    .btn:disabled{opacity:.4;cursor:not-allowed}
    .btn-red{background:${R};color:${WH}}
    .btn-red:hover:not(:disabled){opacity:.85}
    .btn-ghost{background:none;border:1px solid ${BR};color:${MT};border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}
    .btn-ghost:hover{border-color:#666;color:${WH}}
    .nav-item{display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;color:${MT};transition:all .15s;border:none;background:none;width:100%;text-align:left}
    .nav-item:hover{background:#2a2a2a;color:${WH}}
    .nav-item.active{background:#2a2a2a;color:${WH};border-left:3px solid ${R};padding-left:13px}
    .tag{border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700}
    @media(max-width:767px){
      .sidebar{display:none!important}
      .mobile-nav{display:flex!important}
      .main-wrap{padding-bottom:68px!important}
      .top-bar{display:flex!important}
      .desk-head{display:none!important}
    }
    @media(min-width:768px){
      .sidebar{display:flex!important}
      .mobile-nav{display:none!important}
      .top-bar{display:none!important}
      .desk-head{display:flex!important}
    }
  `;

  const PostTab=()=>(
    <div style={{maxWidth:640,margin:"0 auto",animation:"fadeIn .25s ease"}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,color:MT,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Post from any URL</div>
        <div style={{display:"flex",gap:8}}>
          <input
            style={{flex:1,background:"#1e1e1e",border:`1px solid ${BR}`,borderRadius:8,padding:"12px 14px",color:WH,fontSize:15,outline:"none"}}
            placeholder="Article / YouTube / TikTok / Twitter URL…"
            value={url} onChange={e=>setUrl(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!preview&&!needsManual&&doPreview()}
          />
          {!preview&&!needsManual&&(
            <button className="btn btn-red" onClick={()=>doPreview()} disabled={prevLoading||!url.trim()} style={{whiteSpace:"nowrap",minWidth:96}}>
              {prevLoading?"⏳…":"🔍 Preview"}
            </button>
          )}
        </div>
      </div>

      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,color:MT,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Category</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {CATS.map(c=>(
            <button key={c} onClick={()=>setCat(c)}
              style={{background:cat===c?PK:"#2a2a2a",color:WH,border:`1px solid ${cat===c?PK:BR}`,borderRadius:20,padding:"5px 13px",fontSize:12,cursor:"pointer",fontWeight:cat===c?700:400}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {err&&<div style={{background:"#2d0000",border:`1px solid ${WN}`,borderRadius:8,padding:"11px 14px",color:WN,fontSize:13,marginBottom:12}}>⚠ {err}</div>}
      {ok&&<div style={{background:"#002d10",border:`1px solid ${GR}`,borderRadius:8,padding:"11px 14px",color:GR,fontSize:13,marginBottom:12}}>{ok}</div>}

      {/* Instagram manual input */}
      {needsManual&&(
        <div className="card" style={{padding:"16px",marginBottom:12,animation:"fadeIn .25s ease",borderColor:"#FF007A44"}}>
          <div style={{fontSize:13,color:PK,fontWeight:700,marginBottom:4}}>📸 Instagram URL detected</div>
          <div style={{fontSize:12,color:MT,marginBottom:14}}>Instagram blocks scraping. Enter the post title and caption manually to continue.</div>
          <input
            style={{width:"100%",background:"#1e1e1e",border:`1px solid ${BR}`,borderRadius:8,padding:"10px 12px",color:WH,fontSize:14,outline:"none",marginBottom:10}}
            placeholder="Post title (e.g. Sauti Sol drops new album)"
            value={igTitle} onChange={e=>setIgTitle(e.target.value)}
          />
          <textarea
            style={{width:"100%",background:"#1e1e1e",border:`1px solid ${BR}`,borderRadius:8,padding:"10px 12px",color:WH,fontSize:13,outline:"none",resize:"vertical",minHeight:80,marginBottom:12}}
            placeholder="Paste the post caption or describe what it's about…"
            value={igCaption} onChange={e=>setIgCaption(e.target.value)}
          />
          <button className="btn btn-red" onClick={()=>doPreview(igTitle,igCaption)} disabled={prevLoading||!igTitle.trim()||!igCaption.trim()} style={{width:"100%"}}>
            {prevLoading?"⏳ Generating…":"🔍 Generate Preview"}
          </button>
        </div>
      )}

      {preview&&(
        <div className="card" style={{overflow:"hidden",animation:"fadeIn .25s ease"}}>
          {preview.imageBase64&&(
            <div style={{position:"relative",cursor:"zoom-in"}} onClick={()=>setLightbox(true)}>
              <img src={preview.imageBase64} alt="" style={{width:"100%",aspectRatio:"4/5",objectFit:"cover",display:"block"}}/>
            </div>
          )}
          <div style={{padding:"14px 16px"}}>
            <div style={{fontSize:15,fontWeight:700,lineHeight:1.3,marginBottom:6}}>{preview.ai.clickbaitTitle}</div>
            <div style={{fontSize:12,color:MT,lineHeight:1.5,marginBottom:10}}>{preview.ai.caption.slice(0,180)}…</div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
              <span className="tag" style={{background:PK,color:WH}}>{preview.category}</span>
              <span style={{fontSize:12,color:MT}}>{preview.scraped.sourceName}</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-ghost" onClick={()=>{setPreview(null);setOk(null);setNeedsManual(false);}} style={{flex:1}}>✕ Clear</button>
              <button className="btn btn-red" onClick={doPost} disabled={posting} style={{flex:2}}>
                {posting?"⏳ Posting…":"📤 Post to IG + FB"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const LogTab=()=>(
    <div style={{animation:"fadeIn .25s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:11,color:MT,letterSpacing:1,textTransform:"uppercase"}}>Post Log ({log.length})</div>
        <button className="btn-ghost" onClick={fetchLog}>↻ Refresh</button>
      </div>
      {logLoading&&<div style={{color:MT,fontSize:13,textAlign:"center",padding:40}}>Loading…</div>}
      {!logLoading&&log.length===0&&<div style={{color:MT,fontSize:13,textAlign:"center",padding:40}}>No posts yet</div>}
      <div style={{display:"grid",gap:10}}>
        {log.slice().reverse().map(entry=>{
          const igKey=entry.articleId+"_instagram",fbKey=entry.articleId+"_facebook";
          const igR=retries[igKey],fbR=retries[fbKey];
          return(
            <div key={entry.articleId} className="card" style={{padding:"13px 15px"}}>
              <div style={{fontSize:14,fontWeight:700,lineHeight:1.3,marginBottom:7}}>{entry.title}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:9,alignItems:"center"}}>
                <span className="tag" style={{background:PK,color:WH}}>{entry.category}</span>
                {entry.isBreaking&&<span className="tag" style={{background:R,color:WH}}>BREAKING</span>}
                {entry.manualPost&&<span className="tag" style={{background:"#444",color:WH}}>MANUAL</span>}
                <span style={{fontSize:11,color:MT}}>{ago(entry.postedAt)}</span>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,color:MT}}>IG:</span>
                  {entry.instagram.success?<span style={{fontSize:12,color:GR}}>✓</span>
                    :igR?.done?<span style={{fontSize:12,color:GR}}>✓ retried</span>
                    :<button onClick={()=>doRetry(entry,"instagram")} disabled={igR?.loading}
                      style={{background:igR?.loading?"#555":WN,color:WH,border:"none",borderRadius:6,padding:"3px 10px",fontSize:12,cursor:igR?.loading?"not-allowed":"pointer",fontWeight:700}}>
                      {igR?.loading?"…":"↺ IG"}
                    </button>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,color:MT}}>FB:</span>
                  {entry.facebook.success?<span style={{fontSize:12,color:GR}}>✓</span>
                    :fbR?.done?<span style={{fontSize:12,color:GR}}>✓ retried</span>
                    :<button onClick={()=>doRetry(entry,"facebook")} disabled={fbR?.loading}
                      style={{background:fbR?.loading?"#555":WN,color:WH,border:"none",borderRadius:6,padding:"3px 10px",fontSize:12,cursor:fbR?.loading?"not-allowed":"pointer",fontWeight:700}}>
                      {fbR?.loading?"…":"↺ FB"}
                    </button>}
                </div>
              </div>
              {(igR?.error||fbR?.error)&&<div style={{fontSize:11,color:WN,marginTop:5}}>{igR?.error||fbR?.error}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const StatsTab=()=>(
    <div style={{animation:"fadeIn .25s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {([["Today",todayCount,R],["Total",successCount,GR],["IG",igCount,PK],["FB",fbCount,BL]] as const).map(([l,v,c])=>(
          <div key={l} className="card" style={{padding:"18px 16px"}}>
            <div style={{fontSize:40,fontWeight:800,color:c,lineHeight:1}}>{v}</div>
            <div style={{fontSize:12,color:MT,marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:"14px 16px",marginBottom:14}}>
        <div style={{fontSize:11,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>By Category</div>
        {CATS.filter(c=>catCounts[c]>0).map(c=>(
          <div key={c} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
            <div style={{fontSize:12,color:MT,width:88,flexShrink:0}}>{c}</div>
            <div style={{flex:1,background:"#333",borderRadius:4,height:6}}>
              <div style={{width:`${Math.round(catCounts[c]/maxCat*100)}%`,background:PK,borderRadius:4,height:6,transition:"width .4s"}}/>
            </div>
            <div style={{fontSize:12,color:MT,width:18,textAlign:"right"}}>{catCounts[c]}</div>
          </div>
        ))}
        {CATS.every(c=>catCounts[c]===0)&&<div style={{color:MT,fontSize:13}}>No data yet</div>}
      </div>
      <div className="card" style={{padding:"14px 16px"}}>
        <div style={{fontSize:11,color:MT,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Config</div>
        {[["Schedule","Every 30 min"],["Peak Hours","6am–11pm EAT"],["Daily Cap","6/day"],["Per Run","1 post"],["Dedup","Cloudflare KV"],["Filter","Kenya only"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${BR}`,fontSize:13}}>
            <span style={{color:MT}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const navItems=[
    {id:"post" as const,icon:"📤",label:"Post"},
    {id:"log" as const,icon:"📋",label:"Feed",badge:log.length},
    {id:"stats" as const,icon:"📊",label:"Stats"},
  ];

  return(
    <div style={{minHeight:"100dvh",background:BK,display:"flex",flexDirection:"column"}}>
      <style>{css}</style>

      {/* Mobile top bar */}
      <div className="top-bar" style={{display:"none",background:DK,borderBottom:`1px solid ${BR}`,padding:"13px 16px",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:R,animation:"pulse 1.5s infinite"}}/>
          <span style={{fontSize:20,fontWeight:800,letterSpacing:1}}>PPP<span style={{color:PK}}>TV</span></span>
          <span style={{fontSize:11,color:MT,letterSpacing:1}}>AUTO</span>
        </div>
        <span style={{fontSize:12,color:MT}}>{todayCount}/6 today</span>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Desktop sidebar */}
        <aside className="sidebar" style={{display:"none",width:220,background:DK,borderRight:`1px solid ${BR}`,flexDirection:"column",position:"sticky",top:0,height:"100dvh",flexShrink:0}}>
          <div style={{padding:"22px 18px 18px",borderBottom:`1px solid ${BR}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:R,animation:"pulse 1.5s infinite"}}/>
              <span style={{fontSize:22,fontWeight:800,letterSpacing:1}}>PPP<span style={{color:PK}}>TV</span></span>
            </div>
            <div style={{fontSize:10,color:MT,letterSpacing:2,paddingLeft:17}}>AUTO POSTER</div>
          </div>
          <nav style={{padding:"10px",flex:1}}>
            {navItems.map(n=>(
              <button key={n.id} className={`nav-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
                <span style={{fontSize:17}}>{n.icon}</span>
                <span>{n.label}</span>
                {n.badge&&n.badge>0&&<span style={{marginLeft:"auto",background:R,borderRadius:10,padding:"1px 6px",fontSize:11}}>{n.badge}</span>}
              </button>
            ))}
          </nav>
          <div style={{padding:"14px 18px",borderTop:`1px solid ${BR}`,fontSize:12,color:MT}}>
            <div style={{marginBottom:3}}>{todayCount}/6 today</div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:GR}}/>
              <span>Live</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main-wrap" style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
          <div className="desk-head" style={{display:"none",alignItems:"center",justifyContent:"space-between",marginBottom:24,paddingBottom:18,borderBottom:`1px solid ${BR}`}}>
            <div>
              <h1 style={{fontSize:20,fontWeight:800,margin:0}}>{navItems.find(n=>n.id===tab)?.label}</h1>
              <div style={{fontSize:12,color:MT,marginTop:2}}>PPP TV Kenya Auto Poster</div>
            </div>
            <span style={{fontSize:13,color:MT}}>{todayCount}/6 today</span>
          </div>
          {tab==="post"&&<PostTab/>}
          {tab==="log"&&<LogTab/>}
          {tab==="stats"&&<StatsTab/>}
          <div style={{height:20}}/>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:DK,borderTop:`1px solid ${BR}`,zIndex:50}}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)}
            style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",color:tab===n.id?WH:MT,fontSize:11,fontWeight:tab===n.id?700:400,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:tab===n.id?`2px solid ${R}`:"2px solid transparent"}}>
            <span style={{fontSize:20}}>{n.icon}</span>
            <span>{n.label}{n.badge&&n.badge>0?<span style={{background:R,borderRadius:10,padding:"0 5px",fontSize:10,marginLeft:3}}>{n.badge}</span>:null}</span>
          </button>
        ))}
      </nav>

      {lightbox&&preview?.imageBase64&&(
        <div onClick={()=>setLightbox(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.95)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <img src={preview.imageBase64} alt="" style={{maxWidth:"95vw",maxHeight:"90dvh",borderRadius:8,objectFit:"contain"}}/>
        </div>
      )}
    </div>
  );
}
