"use client";
import { useState, useEffect, useCallback } from "react";

const CATS = ["AUTO","CELEBRITY","MUSIC","TV & FILM","FASHION","EVENTS","AWARDS","EAST AFRICA","GENERAL"];

interface LogEntry { articleId:string; title:string; url:string; category:string; sourceType?:string; manualPost?:boolean; instagram:{success:boolean;postId?:string;error?:string}; facebook:{success:boolean;postId?:string;error?:string}; postedAt:string; isBreaking?:boolean }
interface ScrapedInfo { type:string; title:string; description:string; imageUrl:string; sourceName:string; isVideo?:boolean; videoEmbedUrl?:string|null; videoUrl?:string|null }
interface Preview { scraped:ScrapedInfo; ai:{clickbaitTitle:string;caption:string}; category:string; imageBase64:string }
interface Retry { loading:boolean; done?:boolean; error?:string }

function ago(iso:string){const m=Math.floor((Date.now()-new Date(iso).getTime())/60000);if(m<1)return"just now";if(m<60)return m+"m ago";const h=Math.floor(m/60);if(h<24)return h+"h ago";return Math.floor(h/24)+"d ago"}
function isIG(u:string){return/instagram\.com/.test(u)}

export default function Home() {
  const [tab, setTab] = useState<"post"|"log"|"stats">("post");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [cat, setCat] = useState("AUTO");
  const [preview, setPreview] = useState<Preview|null>(null);
  const [prevLoading, setPrevLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [ok, setOk] = useState<string|null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [retries, setRetries] = useState<Record<string,Retry>>({});
  const [igTitle, setIgTitle] = useState("");
  const [igCaption, setIgCaption] = useState("");
  const [needsManual, setNeedsManual] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [copied, setCopied] = useState<string|null>(null);

  function copyText(text:string, label:string) {
    navigator.clipboard.writeText(text).then(()=>{setCopied(label);setTimeout(()=>setCopied(null),2000);}).catch(()=>{});
  }

  const fetchLog = useCallback(async () => {
    try { const r = await fetch("/api/post-log"); if(r.ok){const d=await r.json();setLog(d.log||[]);} } catch{} finally{setLogLoading(false);}
  }, []);

  useEffect(()=>{fetchLog();const t=setInterval(fetchLog,60000);return()=>clearInterval(t);},[fetchLog]);
  useEffect(()=>{setNeedsManual(false);setIgTitle("");setIgCaption("");setErr(null);setPreview(null);setOk(null);setShowPlayer(false);},[url]);

  async function doPreview(overrideTitle?:string, overrideCaption?:string) {
    if(!url.trim()) return;
    setPrevLoading(true);setErr(null);setPreview(null);setOk(null);setShowPlayer(false);
    try {
      const body:Record<string,string> = {url:url.trim()};
      if(cat!=="AUTO") body.category=cat;
      if(overrideTitle) body.manualTitle=overrideTitle;
      if(overrideCaption) body.manualCaption=overrideCaption;
      const r = await fetch("/api/preview-url",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d = await r.json();
      if(d.error==="INSTAGRAM_MANUAL"){setNeedsManual(true);setPrevLoading(false);return;}
      if(!r.ok||d.error) throw new Error(d.error||"Preview failed");
      setNeedsManual(false);setPreview(d);
    } catch(e:any){setErr(e.message);}
    finally{setPrevLoading(false);}
  }

  async function doPost() {
    if(!preview) return;
    setPosting(true);setErr(null);setOk(null);
    try {
      const body:Record<string,string> = {url:url.trim()};
      if(cat!=="AUTO") body.category=cat;
      if(isIG(url)&&igTitle) body.manualTitle=igTitle;
      if(isIG(url)&&igCaption) body.manualCaption=igCaption;
      const r = await fetch("/api/post-from-url-proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d = await r.json();
      if(!r.ok||d.error) throw new Error(d.error||"Post failed");
      const ig=d.instagram?.success, fb=d.facebook?.success;
      setOk((ig&&fb)?"Posted to IG + FB":ig?"Posted to IG only":fb?"Posted to FB only":"Both failed — "+((d.instagram?.error||d.facebook?.error)||"unknown"));
      if(ig||fb){setUrl("");setPreview(null);setNeedsManual(false);setTimeout(fetchLog,2000);}
    } catch(e:any){setErr(e.message);}
    finally{setPosting(false);}
  }

  async function doRetry(entry:LogEntry, platform:"instagram"|"facebook") {
    const key = entry.articleId+"_"+platform;
    setRetries(s=>({...s,[key]:{loading:true}}));
    try {
      const r = await fetch("/api/retry-post",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({articleId:entry.articleId,title:entry.title,caption:entry.title,articleUrl:entry.url,category:entry.category,platform})});
      const d = await r.json();
      const success = platform==="instagram"?d.instagram?.success:d.facebook?.success;
      setRetries(s=>({...s,[key]:{loading:false,done:success,error:success?undefined:(d.error||"Failed")}}));
      if(success) setTimeout(fetchLog,1500);
    } catch(e:any){setRetries(s=>({...s,[key]:{loading:false,error:e.message}}));}
  }

  const todayCount = log.filter(p=>new Date(p.postedAt).toDateString()===new Date().toDateString()).length;
  const successCount = log.filter(p=>p.instagram.success||p.facebook.success).length;
  const igCount = log.filter(p=>p.instagram.success).length;
  const fbCount = log.filter(p=>p.facebook.success).length;
  const catCounts = CATS.reduce((a,c)=>({...a,[c]:log.filter(p=>p.category===c).length}),{} as Record<string,number>);
  const maxCat = Math.max(1,...Object.values(catCounts));
  const isVideo = preview?.scraped?.isVideo;
  const embedUrl = preview?.scraped?.videoEmbedUrl;
  const videoTypeLabel = preview?.scraped?.type==="youtube"?"YouTube":preview?.scraped?.type==="tiktok"?"TikTok":preview?.scraped?.type==="instagram"?"Instagram Reel":"Video";

  return (
    <div style={{minHeight:"100dvh",background:"#000",color:"#fff",fontFamily:"'Inter',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        html,body{height:100%;background:#000}
        input,button,textarea{font-family:inherit}
        input::placeholder,textarea::placeholder{color:#555}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#000}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fade{animation:fadeUp .2s ease}
        .inp{width:100%;background:#0a0a0a;border:1px solid #222;border-radius:6px;padding:13px 14px;color:#fff;font-size:15px;outline:none;transition:border-color .15s}
        .inp:focus{border-color:#FF007A}
        .btn-primary{background:#FF007A;color:#fff;border:none;border-radius:6px;padding:13px 22px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.3px;transition:opacity .15s;white-space:nowrap}
        .btn-primary:hover:not(:disabled){opacity:.85}
        .btn-primary:disabled{opacity:.35;cursor:not-allowed}
        .btn-ghost{background:none;border:1px solid #222;color:#888;border-radius:6px;padding:9px 14px;font-size:13px;cursor:pointer;transition:all .15s}
        .btn-ghost:hover{border-color:#444;color:#fff}
        .btn-danger{background:#E50914;color:#fff;border:none;border-radius:6px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer}
        .cat-pill{border-radius:4px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid transparent;letter-spacing:.5px;transition:all .15s}
        .card{background:#0a0a0a;border:1px solid #1a1a1a;border-radius:8px}
        .nav-tab{flex:1;padding:12px 0 10px;background:none;border:none;color:#555;font-size:11px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;letter-spacing:.5px;border-top:2px solid transparent;transition:all .15s}
        .nav-tab.active{color:#fff;border-top-color:#FF007A}
        .sidebar-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;color:#555;transition:all .15s;border:none;background:none;width:100%;text-align:left;letter-spacing:.2px}
        .sidebar-item:hover{background:#0f0f0f;color:#fff}
        .sidebar-item.active{background:#0f0f0f;color:#fff;border-left:2px solid #FF007A;padding-left:12px}
        .tag{border-radius:3px;padding:2px 7px;font-size:10px;font-weight:700;letter-spacing:.5px}
        .divider{border:none;border-top:1px solid #111;margin:0}
        @media(max-width:767px){.sidebar{display:none!important}.mobile-nav{display:flex!important}.main-wrap{padding-bottom:72px!important}.topbar{display:flex!important}.desk-header{display:none!important}}
        @media(min-width:768px){.sidebar{display:flex!important}.mobile-nav{display:none!important}.topbar{display:none!important}.desk-header{display:flex!important}}
      `}</style>

      {/* Mobile top bar */}
      <header className="topbar" style={{display:"none",background:"#000",borderBottom:"1px solid #111",padding:"14px 16px",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:"#E50914",display:"inline-block",animation:"pulse 1.5s infinite"}}/>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,lineHeight:1}}>PPP<span style={{color:"#FF007A"}}>TV</span></span>
          <span style={{fontSize:10,color:"#444",letterSpacing:2,fontWeight:700}}>STUDIO</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:"#555"}}>{todayCount}/6</span>
          <span style={{width:6,height:6,borderRadius:"50%",background:todayCount>=6?"#E50914":"#22c55e",display:"inline-block"}}/>
        </div>
      </header>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Desktop sidebar */}
        <aside className="sidebar" style={{display:"none",width:200,background:"#000",borderRight:"1px solid #111",flexDirection:"column",position:"sticky",top:0,height:"100dvh",flexShrink:0}}>
          <div style={{padding:"24px 16px 20px",borderBottom:"1px solid #111"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:"#E50914",display:"inline-block",animation:"pulse 1.5s infinite"}}/>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,lineHeight:1}}>PPP<span style={{color:"#FF007A"}}>TV</span></span>
            </div>
            <div style={{fontSize:9,color:"#333",letterSpacing:3,paddingLeft:16,fontWeight:700}}>STUDIO</div>
          </div>
          <nav style={{padding:"12px 8px",flex:1}}>
            {[{id:"post",icon:"↑",label:"Post"},{id:"log",icon:"≡",label:"Feed",badge:log.length},{id:"stats",icon:"◈",label:"Stats"}].map((n:any)=>(
              <button key={n.id} className={`sidebar-item${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
                <span style={{fontSize:16,width:20,textAlign:"center"}}>{n.icon}</span>
                <span>{n.label}</span>
                {n.badge>0&&<span style={{marginLeft:"auto",background:"#E50914",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700}}>{n.badge}</span>}
              </button>
            ))}
          </nav>
          <div style={{padding:"14px 16px",borderTop:"1px solid #111"}}>
            <div style={{fontSize:11,color:"#333",marginBottom:6}}>{todayCount}/6 posts today</div>
            <div style={{background:"#111",borderRadius:3,height:3}}>
              <div style={{width:`${Math.min(100,todayCount/6*100)}%`,background:"#FF007A",borderRadius:3,height:3,transition:"width .4s"}}/>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="main-wrap" style={{flex:1,overflowY:"auto",padding:"28px 20px"}}>
          {/* Desktop header */}
          <div className="desk-header" style={{display:"none",alignItems:"center",justifyContent:"space-between",marginBottom:28,paddingBottom:20,borderBottom:"1px solid #111"}}>
            <div>
              <h1 style={{fontSize:18,fontWeight:800,letterSpacing:.3,margin:0}}>{tab==="post"?"Post":tab==="log"?"Feed":"Stats"}</h1>
              <div style={{fontSize:11,color:"#444",marginTop:3,letterSpacing:.5}}>PPP TV Kenya · Auto Poster</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:"#555"}}>{todayCount}/6 today</span>
              <span style={{width:7,height:7,borderRadius:"50%",background:todayCount>=6?"#E50914":"#22c55e",display:"inline-block"}}/>
            </div>
          </div>

          {/* POST TAB */}
          {tab==="post"&&(
            <div style={{maxWidth:600,margin:"0 auto"}} className="fade">
              {/* URL input */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:10,color:"#444",letterSpacing:2,fontWeight:700,marginBottom:10,textTransform:"uppercase"}}>Paste URL</div>
                <div style={{display:"flex",gap:8}}>
                  <input className="inp" placeholder="Article / YouTube / TikTok / Instagram URL…" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!preview&&!needsManual&&doPreview()}/>
                  {!preview&&!needsManual&&(
                    <button className="btn-primary" onClick={()=>doPreview()} disabled={prevLoading||!url.trim()}>
                      {prevLoading?<span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>:"Preview"}
                    </button>
                  )}
                </div>
              </div>

              {/* Category */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:10,color:"#444",letterSpacing:2,fontWeight:700,marginBottom:10,textTransform:"uppercase"}}>Category</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {CATS.map(c=>(
                    <button key={c} className="cat-pill" onClick={()=>setCat(c)}
                      style={{background:cat===c?"#FF007A":"transparent",color:cat===c?"#fff":"#555",borderColor:cat===c?"#FF007A":"#222"}}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              {err&&<div style={{background:"#1a0000",border:"1px solid #3a0000",borderRadius:6,padding:"11px 14px",color:"#f87171",fontSize:13,marginBottom:16,lineHeight:1.5}}>{err}</div>}
              {ok&&<div style={{background:"#001a08",border:"1px solid #003a15",borderRadius:6,padding:"11px 14px",color:"#4ade80",fontSize:13,marginBottom:16}}>{ok}</div>}

              {/* Instagram manual input */}
              {needsManual&&(
                <div className="card fade" style={{padding:18,marginBottom:16,borderColor:"#FF007A33"}}>
                  <div style={{fontSize:12,color:"#FF007A",fontWeight:700,marginBottom:4,letterSpacing:.3}}>Instagram detected</div>
                  <div style={{fontSize:12,color:"#444",marginBottom:16,lineHeight:1.6}}>Instagram blocks scraping. Enter the post details manually.</div>
                  <input className="inp" style={{marginBottom:10}} placeholder="Post title (e.g. Sauti Sol drops new album)" value={igTitle} onChange={e=>setIgTitle(e.target.value)}/>
                  <textarea className="inp" style={{resize:"vertical",minHeight:80,marginBottom:14}} placeholder="Caption or description…" value={igCaption} onChange={e=>setIgCaption(e.target.value)}/>
                  <button className="btn-primary" style={{width:"100%"}} onClick={()=>doPreview(igTitle,igCaption)} disabled={prevLoading||!igTitle.trim()||!igCaption.trim()}>
                    {prevLoading?"Generating…":"Generate Preview"}
                  </button>
                </div>
              )}

              {/* Preview card */}
              {preview&&(
                <div className="card fade" style={{overflow:"hidden"}}>
                  {/* Video */}
                  {isVideo&&embedUrl&&(
                    <div style={{background:"#000",position:"relative"}}>
                      {showPlayer
                        ?<iframe src={embedUrl} style={{width:"100%",aspectRatio:preview.scraped.type==="tiktok"?"9/16":"16/9",border:"none",display:"block"}} allowFullScreen allow="autoplay; encrypted-media"/>
                        :<div style={{position:"relative",cursor:"pointer"}} onClick={()=>setShowPlayer(true)}>
                          {preview.imageBase64&&<img src={preview.imageBase64} alt="" style={{width:"100%",aspectRatio:"16/9",objectFit:"cover",display:"block",opacity:.5}}/>}
                          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}>
                            <div style={{width:56,height:56,borderRadius:"50%",background:"#E50914",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>▶</div>
                            <span style={{fontSize:11,color:"#fff",background:"rgba(0,0,0,.7)",padding:"4px 12px",borderRadius:20,letterSpacing:.5}}>Play {videoTypeLabel}</span>
                          </div>
                        </div>
                      }
                    </div>
                  )}
                  {/* Thumbnail */}
                  {(!isVideo||!embedUrl)&&preview.imageBase64&&(
                    <div style={{cursor:"zoom-in"}} onClick={()=>setLightbox(true)}>
                      <img src={preview.imageBase64} alt="" style={{width:"100%",aspectRatio:"4/5",objectFit:"cover",display:"block"}}/>
                    </div>
                  )}
                  <div style={{padding:"16px 18px"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,lineHeight:1.2,marginBottom:8}}>{preview.ai.clickbaitTitle}</div>
                    <div style={{fontSize:12,color:"#666",lineHeight:1.7,marginBottom:14,whiteSpace:"pre-line"}}>{preview.ai.caption}</div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
                      <span className="tag" style={{background:"#FF007A",color:"#fff"}}>{preview.category}</span>
                      <span style={{fontSize:11,color:"#444"}}>{preview.scraped.sourceName}</span>
                      {isVideo&&<span className="tag" style={{background:"#E50914",color:"#fff"}}>VIDEO</span>}
                    </div>
                    {isVideo&&(
                      <div style={{fontSize:11,marginBottom:14,padding:"9px 12px",background:"#0a0a0a",borderRadius:5,color:preview.scraped.videoUrl?"#4ade80":"#f87171",border:"1px solid #1a1a1a"}}>
                        {preview.scraped.videoUrl?"✓ Video ready — will post as Reel":"⚠ No video URL — will post thumbnail as image"}
                      </div>
                    )}
                    {/* Copy buttons */}
                    <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                      {[["link","Link",url.trim()],["caption","Caption",preview.ai.caption],["title","Title",preview.ai.clickbaitTitle]].map(([k,l,v]:any)=>(
                        <button key={k} className="btn-ghost" style={{fontSize:11,padding:"6px 11px"}} onClick={()=>copyText(v,k)}>
                          {copied===k?"✓ Copied":l}
                        </button>
                      ))}
                      {preview.scraped.videoUrl&&(
                        <button className="btn-ghost" style={{fontSize:11,padding:"6px 11px"}} onClick={()=>copyText(preview.scraped.videoUrl!,"video")}>
                          {copied==="video"?"✓ Copied":"Video URL"}
                        </button>
                      )}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn-ghost" style={{flex:1}} onClick={()=>{setPreview(null);setOk(null);setNeedsManual(false);setShowPlayer(false);}}>Clear</button>
                      <button className="btn-primary" style={{flex:2}} onClick={doPost} disabled={posting}>
                        {posting?<span style={{display:"inline-flex",alignItems:"center",gap:8}}><span style={{width:13,height:13,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>Posting…</span>
                          :isVideo&&preview.scraped.videoUrl?"Post Video to IG + FB":"Post to IG + FB"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FEED TAB */}
          {tab==="log"&&(
            <div className="fade">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div style={{fontSize:10,color:"#444",letterSpacing:2,fontWeight:700,textTransform:"uppercase"}}>Post Log · {log.length}</div>
                <button className="btn-ghost" style={{fontSize:11,padding:"6px 12px"}} onClick={fetchLog}>Refresh</button>
              </div>
              {logLoading&&<div style={{color:"#333",fontSize:13,textAlign:"center",padding:60}}>Loading…</div>}
              {!logLoading&&log.length===0&&<div style={{color:"#333",fontSize:13,textAlign:"center",padding:60}}>No posts yet</div>}
              <div style={{display:"grid",gap:8}}>
                {log.slice().reverse().map(entry=>{
                  const igKey=entry.articleId+"_instagram", fbKey=entry.articleId+"_facebook";
                  const igR=retries[igKey], fbR=retries[fbKey];
                  return(
                    <div key={entry.articleId} className="card" style={{padding:"14px 16px"}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,fontWeight:700,lineHeight:1.4,marginBottom:8,letterSpacing:.5}}>{entry.title}</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
                        <span className="tag" style={{background:"#FF007A",color:"#fff"}}>{entry.category}</span>
                        {entry.isBreaking&&<span className="tag" style={{background:"#E50914",color:"#fff"}}>BREAKING</span>}
                        {entry.manualPost&&<span className="tag" style={{background:"#222",color:"#888"}}>MANUAL</span>}
                        <span style={{fontSize:11,color:"#444"}}>{ago(entry.postedAt)}</span>
                        {entry.url&&<button onClick={()=>copyText(entry.url,"log_"+entry.articleId)} style={{background:"none",border:"1px solid #1a1a1a",borderRadius:3,padding:"1px 7px",fontSize:10,color:"#444",cursor:"pointer"}}>{copied===("log_"+entry.articleId)?"✓":"Copy"}</button>}
                      </div>
                      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                        {(["instagram","facebook"] as const).map(platform=>{
                          const key=entry.articleId+"_"+platform;
                          const r=retries[key];
                          const success=platform==="instagram"?entry.instagram.success:entry.facebook.success;
                          const label=platform==="instagram"?"IG":"FB";
                          return(
                            <div key={platform} style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:11,color:"#333"}}>{label}</span>
                              {success||r?.done
                                ?<span style={{fontSize:11,color:"#4ade80"}}>✓</span>
                                :<button onClick={()=>doRetry(entry,platform)} disabled={r?.loading} className="btn-danger" style={{padding:"2px 10px",fontSize:11,opacity:r?.loading?.4:1}}>
                                  {r?.loading?"…":"Retry"}
                                </button>
                              }
                            </div>
                          );
                        })}
                      </div>
                      {(retries[igKey]?.error||retries[fbKey]?.error)&&<div style={{fontSize:11,color:"#f87171",marginTop:6}}>{retries[igKey]?.error||retries[fbKey]?.error}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STATS TAB */}
          {tab==="stats"&&(
            <div className="fade">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
                {([["Today",todayCount,"#FF007A"],["Total",successCount,"#fff"],["IG",igCount,"#E1306C"],["FB",fbCount,"#1877f2"]] as const).map(([l,v,c])=>(
                  <div key={l} className="card" style={{padding:"20px 18px"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:c,lineHeight:1,letterSpacing:1}}>{v}</div>
                    <div style={{fontSize:10,color:"#444",marginTop:5,letterSpacing:2,fontWeight:700,textTransform:"uppercase"}}>{l}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{padding:"16px 18px",marginBottom:12}}>
                <div style={{fontSize:10,color:"#444",letterSpacing:2,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>By Category</div>
                {CATS.filter(c=>catCounts[c]>0).map(c=>(
                  <div key={c} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{fontSize:11,color:"#555",width:90,flexShrink:0,letterSpacing:.3}}>{c}</div>
                    <div style={{flex:1,background:"#111",borderRadius:2,height:4}}>
                      <div style={{width:`${Math.round(catCounts[c]/maxCat*100)}%`,background:"#FF007A",borderRadius:2,height:4,transition:"width .4s"}}/>
                    </div>
                    <div style={{fontSize:11,color:"#444",width:16,textAlign:"right"}}>{catCounts[c]}</div>
                  </div>
                ))}
                {CATS.every(c=>catCounts[c]===0)&&<div style={{color:"#333",fontSize:12}}>No data yet</div>}
              </div>
              <div className="card" style={{padding:"16px 18px"}}>
                <div style={{fontSize:10,color:"#444",letterSpacing:2,fontWeight:700,textTransform:"uppercase",marginBottom:14}}>Config</div>
                {[["Schedule","Every 30 min"],["Peak Hours","6am–11pm EAT"],["Daily Cap","6/day"],["Per Run","1 post"],["Dedup","Cloudflare KV"],["Filter","Kenya only"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #0f0f0f",fontSize:12}}>
                    <span style={{color:"#444"}}>{k}</span>
                    <span style={{fontWeight:600,color:"#888"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{height:24}}/>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:"#000",borderTop:"1px solid #111",zIndex:50}}>
        {[{id:"post",icon:"↑",label:"POST"},{id:"log",icon:"≡",label:"FEED",badge:log.length},{id:"stats",icon:"◈",label:"STATS"}].map((n:any)=>(
          <button key={n.id} className={`nav-tab${tab===n.id?" active":""}`} onClick={()=>setTab(n.id)}>
            <span style={{fontSize:18}}>{n.icon}</span>
            <span style={{fontSize:9,letterSpacing:1}}>{n.label}{n.badge>0?<span style={{background:"#E50914",borderRadius:8,padding:"0 4px",fontSize:9,marginLeft:3}}>{n.badge}</span>:null}</span>
          </button>
        ))}
      </nav>

      {/* Lightbox */}
      {lightbox&&preview?.imageBase64&&(
        <div onClick={()=>setLightbox(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.97)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <img src={preview.imageBase64} alt="" style={{maxWidth:"95vw",maxHeight:"90dvh",borderRadius:6,objectFit:"contain"}}/>
        </div>
      )}
    </div>
  );
}
