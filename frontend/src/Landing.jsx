import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const CA = "To be launched on baggs app";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #020008; color: #fff; font-family: 'Rajdhani', sans-serif; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: #ff6b35; }

  @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.4} 94%{opacity:1} 97%{opacity:0.7} 98%{opacity:1} }
  @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
  @keyframes glow { 0%,100%{text-shadow:0 0 20px #ff6b35,0 0 40px #ff6b3560} 50%{text-shadow:0 0 40px #ff6b35,0 0 80px #ff6b3580,0 0 120px #ff6b3530} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideRight { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes rotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes borderRun { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
  @keyframes typewriter { from{width:0} to{width:100%} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes ember { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-120px) scale(0);opacity:0} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes countUp { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }

  .title { font-family: 'Bebas Neue', sans-serif; animation: glow 3s ease-in-out infinite, flicker 8s infinite; }
  .mono { font-family: 'Share Tech Mono', monospace; }
  .float { animation: float 4s ease-in-out infinite; }
  .scanline { position:fixed;top:0;left:0;width:100%;height:3px;background:linear-gradient(transparent,rgba(255,107,53,0.15),transparent);animation:scanline 6s linear infinite;pointer-events:none;z-index:999; }

  .enter-btn {
    position: relative;
    padding: 16px 48px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 6px;
    color: #fff;
    background: transparent;
    border: 2px solid #ff6b35;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s;
    clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
  }
  .enter-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #ff6b35, #f7c948);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .enter-btn:hover::before { opacity: 1; }
  .enter-btn:hover { box-shadow: 0 0 40px #ff6b3580, 0 0 80px #ff6b3530; animation: shake 0.3s ease-in-out; }
  .enter-btn span { position: relative; z-index: 1; }

  .token-card {
    background: linear-gradient(135deg, rgba(255,107,53,0.05), rgba(247,201,72,0.05));
    border: 1px solid rgba(255,107,53,0.3);
    position: relative;
    overflow: hidden;
  }
  .token-card::before {
    content: '';
    position: absolute;
    top: -2px; left: -2px; right: -2px; bottom: -2px;
    background: linear-gradient(90deg, #ff6b35, #f7c948, #ff6b35, #9945ff, #ff6b35);
    background-size: 200% 100%;
    animation: borderRun 3s linear infinite;
    z-index: -1;
    border-radius: inherit;
  }

  .feature-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
  }
  .feature-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent, rgba(255,107,53,0.04));
    opacity: 0;
    transition: opacity 0.3s;
  }
  .feature-card:hover { border-color: rgba(255,107,53,0.3); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
  .feature-card:hover::after { opacity: 1; }

  .noise {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: 0.4;
  }

  .grid-bg {
    position: absolute; inset: 0; pointer-events: none;
    background-image: linear-gradient(rgba(255,107,53,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.03) 1px, transparent 1px);
    background-size: 60px 60px;
  }

  .stat-bar { height: 3px; background: #0d0d1a; border-radius: 2px; overflow: hidden; margin-top: 6px; }
  .stat-fill { height: 100%; border-radius: 2px; transition: width 1.5s ease-out; }

  .copy-btn { background: transparent; border: 1px solid rgba(255,107,53,0.3); color: #ff6b35; padding: 6px 14px; font-family: 'Share Tech Mono', monospace; font-size: 10px; cursor: pointer; transition: all 0.2s; border-radius: 4px; }
  .copy-btn:hover { background: rgba(255,107,53,0.1); border-color: #ff6b35; }

  .section-reveal { opacity: 0; transform: translateY(30px); transition: all 0.8s ease-out; }
  .section-reveal.visible { opacity: 1; transform: translateY(0); }
`;

function Warrior({ name = "?", flipped = false, size = 1 }) {
  const nc = (n) => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return { primary: `hsl(${h},85%,58%)`, secondary: `hsl(${(h+30)%360},70%,32%)` }; };
  const { primary, secondary } = nc(name);
  return (
    <svg width={100*size} height={145*size} viewBox="0 0 100 145" style={{overflow:"visible",display:"block"}}>
      <g transform={flipped?"scale(-1,1) translate(-100,0)":""}>
        <ellipse cx="50" cy="140" rx="28" ry="5" fill="rgba(0,0,0,0.4)"/>
        <rect x="34" y="90" width="13" height="34" rx="5" fill={secondary}/><rect x="52" y="90" width="13" height="34" rx="5" fill={secondary}/>
        <rect x="31" y="116" width="17" height="14" rx="4" fill="#0d0d1a"/><rect x="49" y="116" width="17" height="14" rx="4" fill="#0d0d1a"/>
        <rect x="29" y="52" width="42" height="42" rx="9" fill={primary}/>
        <rect x="37" y="58" width="26" height="7" rx="3" fill={secondary}/><rect x="44" y="70" width="12" height="18" rx="3" fill={secondary} opacity=".65"/>
        <rect x="29" y="75" width="8" height="18" rx="4" fill={secondary} opacity=".8"/><rect x="63" y="75" width="8" height="18" rx="4" fill={secondary} opacity=".8"/>
        <rect x="43" y="46" width="14" height="10" rx="3" fill={primary}/>
        <rect x="32" y="22" width="36" height="28" rx="7" fill={primary}/><rect x="29" y="16" width="42" height="18" rx="7" fill={secondary}/>
        <rect x="35" y="28" width="30" height="9" rx="3" fill="#050510"/>
        <polygon points="50,6 45,16 55,16" fill="hsl(40,90%,60%)"/>
        <rect x="12" y="55" width="17" height="12" rx="6" fill={primary}/><rect x="71" y="55" width="17" height="12" rx="6" fill={primary}/>
        <g transform="translate(82,28)"><rect x="-3" y="-2" width="5" height="58" rx="2" fill="#bcc8d4"/><polygon points="0,-18 -4,0 4,0" fill="#d8e4ec"/><rect x="-9" y="44" width="18" height="5" rx="2" fill={secondary}/></g>
      </g>
    </svg>
  );
}

function EmberParticles() {
  const particles = Array.from({length: 12}, (_, i) => ({
    id: i, left: `${10 + Math.random() * 80}%`, delay: `${Math.random() * 4}s`,
    duration: `${2 + Math.random() * 3}s`, size: `${3 + Math.random() * 4}px`
  }));
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:"absolute", bottom:"10%", left:p.left,
          width:p.size, height:p.size, borderRadius:"50%",
          background:`hsl(${20 + Math.random()*40},100%,60%)`,
          boxShadow:`0 0 6px hsl(${20 + Math.random()*40},100%,60%)`,
          animation:`ember ${p.duration} ease-out ${p.delay} infinite`
        }}/>
      ))}
    </div>
  );
}

function Navbar({ onEnter }) {
  const [tooltip, setTooltip] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      <style>{`
        .nav-center { display: flex; }
        .nav-hamburger { display: none; }
        @media (max-width: 640px) {
          .nav-center { display: none; }
          .nav-hamburger { display: flex !important; }
          .nav-title-full { display: none; }
          .nav-mobile-menu { display: flex; flex-direction: column; gap: 16px; position: fixed; top: 56px; left: 0; right: 0; background: rgba(2,0,8,0.97); border-bottom: 1px solid rgba(255,107,53,0.15); padding: 24px 20px; z-index: 999; }
        }
        @media (min-width: 641px) {
          .nav-mobile-menu { display: none !important; }
          .nav-title-short { display: none; }
        }
      `}</style>

      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,background:"rgba(2,0,8,0.88)",backdropFilter:"blur(14px)",borderBottom:"1px solid rgba(255,107,53,0.12)",padding:"0 20px",height:"56px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>

        {/* Left — logo + name */}
        <div style={{display:"flex",alignItems:"center",gap:"10px",cursor:"pointer",flexShrink:0}} onClick={()=>scrollTo("hero")}>
          <img src="/logo.svg" width="32" height="32" style={{borderRadius:"50%",border:"1px solid rgba(255,107,53,0.3)"}} onError={e=>e.target.style.display="none"}/>
          <span className="nav-title-full" style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"4px",background:"linear-gradient(135deg,#ff6b35,#f7c948)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>CLAWD ARENA</span>
          <span className="nav-title-short" style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"4px",background:"linear-gradient(135deg,#ff6b35,#f7c948)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>CLAWD</span>
        </div>

        {/* Center links — desktop */}
        <div className="nav-center" style={{alignItems:"center",gap:"28px",position:"absolute",left:"50%",transform:"translateX(-50%)"}}>
          <button onClick={()=>scrollTo("token")}
            style={{background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:"11px",letterSpacing:"2px",color:"#f7c948",opacity:0.7,transition:"opacity 0.2s",padding:"4px 0"}}
            onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=0.7}>
            $CLAWDARENA
          </button>

          {/* STAKE with tooltip */}
          <div style={{position:"relative"}} onMouseEnter={()=>setTooltip(true)} onMouseLeave={()=>setTooltip(false)}>
            <button style={{background:"transparent",border:"none",cursor:"default",fontFamily:"'Share Tech Mono',monospace",fontSize:"11px",letterSpacing:"2px",color:"#f7c948",opacity:1,padding:"4px 0",textShadow:"0 0 10px rgba(247,201,72,0.8),0 0 20px rgba(247,201,72,0.4)"}}>
              ⚡ STAKE
            </button>
            {tooltip&&(
              <div style={{position:"absolute",top:"36px",left:"50%",transform:"translateX(-50%)",background:"#08000f",border:"1px solid rgba(255,107,53,0.3)",borderRadius:"8px",padding:"10px 14px",whiteSpace:"nowrap",fontFamily:"'Share Tech Mono',monospace",fontSize:"10px",color:"#f7c948",letterSpacing:"1px",boxShadow:"0 8px 24px rgba(0,0,0,0.7)",zIndex:200,pointerEvents:"none"}}>
                ⚡ Stake $CLAWDARENA to earn SOL — coming soon
                <div style={{position:"absolute",top:"-5px",left:"50%",transform:"translateX(-50%) rotate(45deg)",width:"8px",height:"8px",background:"#08000f",borderTop:"1px solid rgba(255,107,53,0.3)",borderLeft:"1px solid rgba(255,107,53,0.3)"}}/>
              </div>
            )}
          </div>

          <button onClick={()=>window.open("https://x.com/arenaclawd","_blank")}
            style={{background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:"11px",letterSpacing:"2px",color:"#fff",opacity:0.45,transition:"opacity 0.2s",padding:"4px 0",display:"flex",alignItems:"center",gap:"6px"}}
            onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.45}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            TWITTER
          </button>
        </div>

        {/* Right — Enter + hamburger */}
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <button onClick={onEnter} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"13px",letterSpacing:"3px",padding:"8px 20px",background:"linear-gradient(135deg,#b45309,#ff6b35)",border:"none",borderRadius:"6px",color:"#fff",cursor:"pointer",boxShadow:"0 0 16px rgba(255,107,53,0.3)",whiteSpace:"nowrap"}}>
            ⚔ ENTER
          </button>
          <button className="nav-hamburger" onClick={()=>setMenuOpen(m=>!m)}
            style={{background:"transparent",border:"1px solid rgba(255,107,53,0.3)",borderRadius:"6px",color:"#ff6b35",padding:"6px 10px",cursor:"pointer",fontSize:"16px"}}>
            {menuOpen?"✕":"☰"}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen&&(
        <div className="nav-mobile-menu">
          {[
            {label:"$CLAWDARENA",action:()=>scrollTo("token"),col:"#f7c948"},
            {label:"STAKE — coming soon",action:null,col:"#ff6b3560"},
            {label:"✕  TWITTER",action:()=>window.open("https://x.com/arenaclawd","_blank"),col:"#aaa"},
          ].map((item,i)=>(
            <button key={i} onClick={item.action||undefined}
              style={{background:"transparent",border:"none",cursor:item.action?"pointer":"default",fontFamily:"'Share Tech Mono',monospace",fontSize:"12px",letterSpacing:"2px",color:item.col,textAlign:"left",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function Landing({ onEnter }) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ fights: 0, sol: 0, fighters: 0 });
  const sectionsRef = useRef([]);

  useEffect(() => {
  const sb = createClient("https://qtcrbfmnugaduygmotyw.supabase.co", "sb_publishable_lLjEjopCTxBbaHFNcDWaGA_S1y2b7GN");
  
  let timer;

  const fetchStats = async () => {
    try {
      const { count: fightCount } = await sb.from("matches").select("*", { count: "exact", head: true }).eq("status", "done");
      const { count: fighterCount } = await sb.from("queue").select("*", { count: "exact", head: true });
      const { data: solData } = await sb.from("matches").select("player1").eq("status", "done");
      const solWagered = (solData || []).reduce((acc, m) => acc + (m.player1?.betSol || 0.1) * 2, 0);

      const targets = {
        fights: fightCount || 0,
        sol: Math.round(solWagered * 10) / 10,
        fighters: (fightCount || 0) * 2,
      };

      const duration = 2000;
      const start = Date.now();
      timer = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setStats({
          fights: Math.floor(targets.fights * ease),
          sol: Math.floor(targets.sol * ease * 10) / 10,
          fighters: Math.floor(targets.fighters * ease),
        });
        if (progress >= 1) clearInterval(timer);
      }, 16);
    } catch(e) {
      console.error("Stats fetch failed", e);
    }
  };

  fetchStats();

  // Scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.15 });
  document.querySelectorAll('.section-reveal').forEach(el => observer.observe(el));

  return () => { clearInterval(timer); observer.disconnect(); };
}, []);

  const copy = () => {
    navigator.clipboard.writeText(CA).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <style>{CSS}</style>
      <Navbar onEnter={onEnter}/>
      <div className="scanline"/>
      <div className="noise"/>

      {/* ── HERO ── */}
      <section id="hero" style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",padding:"20px",paddingTop:"76px"}}>
        <div className="grid-bg"/>
        <EmberParticles/>

        {/* Background glow */}
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"600px",height:"600px",background:"radial-gradient(circle,rgba(255,107,53,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>

        {/* Fighters */}
        <div style={{position:"absolute",bottom:0,left:"5%",opacity:0.15,transform:"scale(1.8)",transformOrigin:"bottom left"}}>
          <div className="float" style={{animationDelay:"0s"}}><Warrior name="SHADOW" flipped={false} size={1}/></div>
        </div>
        <div style={{position:"absolute",bottom:0,right:"5%",opacity:0.15,transform:"scale(1.8)",transformOrigin:"bottom right"}}>
          <div className="float" style={{animationDelay:"1s"}}><Warrior name="BLAZE" flipped={true} size={1}/></div>
        </div>

        <div style={{position:"relative",zIndex:2,textAlign:"center",maxWidth:"900px",animation:"slideUp 0.8s ease-out"}}>
          {/* Badge */}
          <div style={{display:"inline-flex",alignItems:"center",gap:"8px",background:"rgba(255,107,53,0.08)",border:"1px solid rgba(255,107,53,0.25)",borderRadius:"20px",padding:"6px 16px",marginBottom:"28px"}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 8px #4ade80",animation:"pulse 1.5s infinite"}}/>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:"10px",color:"#ff6b35",letterSpacing:"3px"}}>LIVE ON SOLANA MAINNET</span>
          </div>

          <div className="title" style={{fontSize:"clamp(64px,12vw,140px)",lineHeight:0.9,letterSpacing:"4px",color:"#fff",marginBottom:"8px"}}>
            CLAWD
          </div>
          <div className="title" style={{fontSize:"clamp(64px,12vw,140px)",lineHeight:0.9,letterSpacing:"4px",background:"linear-gradient(135deg,#ff6b35,#f7c948)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:"28px"}}>
            ARENA
          </div>

          <p style={{fontSize:"clamp(14px,2.5vw,18px)",color:"#666",letterSpacing:"2px",maxWidth:"560px",margin:"0 auto 40px",lineHeight:1.6,fontWeight:300}}>
            PROMPT YOUR AI FIGHTER INTO EXISTENCE · BET SOL · WATCH CLAUDE DECIDE YOUR FATE
          </p>

          {/* Stats row */}
          <div style={{display:"flex",gap:"32px",justifyContent:"center",marginBottom:"48px",flexWrap:"wrap"}}>
            {[
              {label:"FIGHTS SETTLED",val:stats.fights,suffix:""},
              {label:"SOL WAGERED",val:stats.sol,suffix:"◎"},
              {label:"FIGHTERS CREATED",val:stats.fighters,suffix:""},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"42px",color:"#ff6b35",lineHeight:1,letterSpacing:"2px"}}>{s.suffix}{s.val.toLocaleString()}</div>
                <div className="mono" style={{fontSize:"9px",color:"#333",letterSpacing:"3px",marginTop:"2px"}}>{s.label}</div>
              </div>
            ))}
          </div>

          <button className="enter-btn" onClick={onEnter}>
            <span>⚔ ENTER THE ARENA</span>
          </button>

          <div className="mono" style={{fontSize:"9px",color:"#222",letterSpacing:"3px",marginTop:"20px"}}>
            0.1 SOL ENTRY · WINNER TAKES 0.198 SOL
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{position:"absolute",bottom:"28px",left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",animation:"pulse 2s infinite"}}>
          <div className="mono" style={{fontSize:"9px",color:"#222",letterSpacing:"3px"}}>SCROLL</div>
          <div style={{width:"1px",height:"40px",background:"linear-gradient(to bottom,#ff6b35,transparent)"}}/>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{padding:"100px 20px",maxWidth:"1100px",margin:"0 auto"}} className="section-reveal">
        <div style={{textAlign:"center",marginBottom:"64px"}}>
          <div className="mono" style={{fontSize:"10px",color:"#ff6b35",letterSpacing:"5px",marginBottom:"12px"}}>THE PROTOCOL</div>
          <div className="title" style={{fontSize:"clamp(36px,6vw,72px)",letterSpacing:"4px"}}>HOW IT WORKS</div>
        </div>

        {/* Highlight box — the killer feature */}
        <div style={{background:"linear-gradient(135deg,rgba(255,107,53,0.06),rgba(247,201,72,0.06))",border:"1px solid rgba(255,107,53,0.25)",borderRadius:"14px",padding:"32px",marginBottom:"32px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,#ff6b35,#f7c948,#9945ff)"}}/>
          <div style={{display:"flex",gap:"24px",alignItems:"flex-start",flexWrap:"wrap"}}>
            <img src="/claude.png" width="48" height="48" style={{objectFit:"contain",flexShrink:0}} />
            <div style={{flex:1,minWidth:"240px"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"26px",letterSpacing:"4px",color:"#f7c948",marginBottom:"10px"}}>YOUR FIGHTER IS YOUR PROMPT</div>
              <div style={{fontSize:"15px",color:"#888",lineHeight:1.8,fontWeight:300}}>
                No templates. No pre-built classes. You <span style={{color:"#ff6b35",fontWeight:600}}>write your fighter into existence</span> — describe their personality in plain English, invent abilities with whatever rules you want, set their fighting style, give them a backstory. Claude reads every word and uses it to decide who wins. A fighter who <span style={{color:"#fff",fontStyle:"italic"}}>"fights dirty and never shows mercy"</span> will behave differently than one who <span style={{color:"#fff",fontStyle:"italic"}}>"calculates every move three steps ahead."</span> The prompt is the weapon.
              </div>
              
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"20px"}}>
          {[
            {
              num:"01",
              icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><text y="22" fontSize="22">✍️</text></svg>,
              iconEl: <div style={{fontSize:"26px"}}>✍️</div>,
              title:"PROMPT YOUR FIGHTER",
              desc:"Write their personality, abilities and fighting style in plain English. No limits — if you can describe it, Claude understands it. Your words become their soul.",
              accent:"#f7c948"
            },
            {
              num:"02",
              iconEl: <img src="/solana.png" width="28" height="28" style={{objectFit:"contain"}}/>,
              title:"BET SOL",
              desc:"Pay 0.1 SOL entry. Funds are locked in a trustless Solana smart contract on-chain. No middleman, no trust required.",
              accent:"#9945ff"
            },
            {
              num:"03",
              iconEl: <img src="/claude.png" width="28" height="28" style={{objectFit:"contain"}}/>,
              title:"CLAUDE JUDGES",
              desc:"Claude AI reads both fighters' prompts, stats and abilities — then simulates a cinematic 5-round battle. No randomness. Pure reasoning.",
              accent:"#ff6b35"
            },
            {
              num:"04",
              iconEl: <div style={{fontSize:"26px"}}>⚡</div>,
              title:"WINNER PAID INSTANTLY",
              desc:"The resolver detects the result and executes the payout on-chain. 0.198 SOL to the winner, automatically. No claims, no waiting.",
              accent:"#4ade80"
            },
          ].map((step,i)=>(
            <div key={i} className="feature-card" style={{padding:"28px",borderRadius:"12px",borderColor:`${step.accent}15`}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
                <div className="mono" style={{fontSize:"32px",color:"rgba(255,107,53,0.2)",lineHeight:1}}>{step.num}</div>
                {step.iconEl}
              </div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",letterSpacing:"3px",color:step.accent,marginBottom:"10px"}}>{step.title}</div>
              <div style={{fontSize:"13px",color:"#555",lineHeight:1.7,fontWeight:300}}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BATTLE DEMO ── */}
      <section style={{padding:"80px 20px",background:"rgba(255,107,53,0.02)",borderTop:"1px solid rgba(255,107,53,0.08)",borderBottom:"1px solid rgba(255,107,53,0.08)"}} className="section-reveal">
        <div style={{maxWidth:"860px",margin:"0 auto",textAlign:"center"}}>
          <div className="mono" style={{fontSize:"10px",color:"#ff6b35",letterSpacing:"5px",marginBottom:"12px"}}>LIVE EXAMPLE</div>
          <div className="title" style={{fontSize:"clamp(32px,5vw,60px)",letterSpacing:"4px",marginBottom:"48px"}}>AN EXAMPLE BATTLE</div>

          <div style={{background:"#030310",border:"1px solid #1a1a2e",borderRadius:"12px",padding:"28px",textAlign:"left",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,#ff6b35,#f7c948,#9945ff)"}}/>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px",flexWrap:"wrap",gap:"16px"}}>
              {[
                {name:"SHADOW REAPER",personality:"Cold calculated assassin",stats:{STR:8,SPD:10,INT:7,END:5}},
                {name:"IRON TITAN",personality:"Reckless berserker",stats:{STR:10,SPD:4,INT:5,END:11}},
              ].map((f,i)=>(
                <div key={i} style={{flex:1,minWidth:"180px",textAlign:i===0?"left":"right"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"12px",flexDirection:i===1?"row-reverse":"row"}}>
                    <div style={{filter:`drop-shadow(0 0 12px ${i===0?"#60a5fa":"#f87171"})`}}>
                      <Warrior name={f.name} flipped={i===1} size={0.7}/>
                    </div>
                    <div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",color:i===0?"#60a5fa":"#f87171",letterSpacing:"2px"}}>{f.name}</div>
                      <div className="mono" style={{fontSize:"9px",color:"#444",marginTop:"2px"}}>{f.personality}</div>
                      <div style={{display:"flex",gap:"8px",marginTop:"8px",flexWrap:"wrap",justifyContent:i===1?"flex-end":"flex-start"}}>
                        {Object.entries(f.stats).map(([k,v])=>(
                          <div key={k} style={{textAlign:"center"}}>
                            <div className="mono" style={{fontSize:"8px",color:"#333"}}>{k}</div>
                            <div style={{fontSize:"12px",color:i===0?"#60a5fa":"#f87171",fontWeight:700}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"32px",color:"#ff6b35",flexShrink:0}}>VS</div>
            </div>

            {[
              {r:1,att:"SHADOW REAPER",col:"#60a5fa",text:"Vanishes into shadow, reappears behind Iron Titan with a serrated blade to the spine.",dmg:18},
              {r:2,att:"IRON TITAN",col:"#f87171",text:"Shrugs off the pain and delivers a ground-shaking haymaker that sends Reaper flying.",dmg:24},
              {r:3,att:"SHADOW REAPER",col:"#60a5fa",text:"✨ PHANTOM STEP — Phases through the arena floor, striking from below with devastating precision.",dmg:31,ab:true},
              {r:4,att:"IRON TITAN",col:"#f87171",text:"BLOOD RAGE activates — frenzy doubles striking power, pulverizing Shadow Reaper into the wall.",dmg:28,ab:true},
              {r:5,att:"SHADOW REAPER",col:"#60a5fa",text:"Final strike — a whisper-silent blade across the throat. Iron Titan crumbles.",dmg:35},
            ].map((round,i)=>(
              <div key={i} style={{marginBottom:"10px",padding:"10px 12px",background:i===4?"rgba(96,165,250,0.05)":"transparent",borderRadius:"6px",border:i===4?"1px solid rgba(96,165,250,0.15)":"1px solid transparent"}}>
                {round.ab&&<div style={{color:"#f59e0b",fontSize:"9px",marginBottom:"4px",padding:"2px 8px",background:"rgba(245,158,11,0.06)",borderRadius:"3px",display:"inline-block",border:"1px solid rgba(245,158,11,0.15)"}}>⚡ ABILITY TRIGGERED</div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px"}}>
                  <div style={{flex:1}}>
                    <span className="mono" style={{fontSize:"9px",color:"#222"}}>RD{round.r} </span>
                    <span style={{color:"#555",fontSize:"10px",lineHeight:1.6}}>{round.text}</span>
                  </div>
                  <div style={{flexShrink:0,fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",color:"#ef4444",letterSpacing:"1px"}}>-{round.dmg}</div>
                </div>
              </div>
            ))}

            <div style={{marginTop:"20px",padding:"16px",background:"rgba(96,165,250,0.06)",borderRadius:"8px",border:"1px solid rgba(96,165,250,0.2)",textAlign:"center"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",color:"#60a5fa",letterSpacing:"4px",marginBottom:"6px"}}>🏆 SHADOW REAPER WINS</div>
              <div className="mono" style={{fontSize:"9px",color:"#555",letterSpacing:"2px"}}>PAYOUT: 0.198 SOL → WALLET 7xKq...3fRa</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOKEN ── */}
      <section id="token" style={{padding:"100px 20px",maxWidth:"760px",margin:"0 auto"}} className="section-reveal">
        <div style={{textAlign:"center",marginBottom:"48px"}}>
          <div className="mono" style={{fontSize:"10px",color:"#f7c948",letterSpacing:"5px",marginBottom:"12px"}}>TOKENOMICS</div>
          <div className="title" style={{fontSize:"clamp(36px,6vw,72px)",letterSpacing:"4px",background:"linear-gradient(135deg,#f7c948,#ff6b35)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>$CLAWDARENA</div>
          <p style={{color:"#555",fontSize:"15px",marginTop:"16px",lineHeight:1.8,fontWeight:300,maxWidth:"520px",margin:"16px auto 0"}}>
            The arena runs on blood and code. <span style={{color:"#f7c948"}}>$CLAWDARENA</span> holders earn a share of platform fees from every fight settled on-chain. The more the arena grows, the more you earn.
          </p>
        </div>

        <div className="token-card" style={{borderRadius:"14px",padding:"2px",marginBottom:"24px"}}>
          <div style={{background:"#08040f",borderRadius:"12px",padding:"32px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"24px",marginBottom:"32px"}}>
              {[
                {icon:"💸",title:"FEE SHARING",desc:"Hold $CLAWDARENA to receive a percentage of all platform fees collected from matches."},
                {icon:"🗳",title:"GOVERNANCE",desc:"Vote on arena parameters, fee rates, and future feature development."},
                {icon:"🔥",title:"BURN MECHANIC",desc:"A portion of fees are used to buy back and burn $CLAWDARENA, reducing supply over time."},
                {icon:"⚔️",title:"ARENA PERKS",desc:"$CLAWDARENA holders unlock exclusive fighter skins, ability slots, and arena access."},
              ].map((item,i)=>(
                <div key={i}>
                  <div style={{fontSize:"24px",marginBottom:"8px"}}>{item.icon}</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"16px",letterSpacing:"2px",color:"#f7c948",marginBottom:"6px"}}>{item.title}</div>
                  <div style={{fontSize:"12px",color:"#444",lineHeight:1.7,fontWeight:300}}>{item.desc}</div>
                </div>
              ))}
            </div>

            <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"24px"}}>
              <div className="mono" style={{fontSize:"9px",color:"#f7c948",letterSpacing:"3px",marginBottom:"12px"}}>CONTRACT ADDRESS</div>
              <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                <div className="mono" style={{flex:1,fontSize:"11px",color:"#333",background:"rgba(247,201,72,0.03)",border:"1px solid rgba(247,201,72,0.1)",padding:"10px 14px",borderRadius:"6px",wordBreak:"break-all",letterSpacing:"1px"}}>
                  {CA}
                </div>
                <button className="copy-btn" onClick={copy}>
                  {copied ? "✓ COPIED" : "COPY"}
                </button>
              </div>
              <div style={{display:"flex",gap:"12px",marginTop:"16px",flexWrap:"wrap"}}>
                <div style={{flex:1,background:"rgba(153,69,255,0.06)",border:"1px solid rgba(153,69,255,0.15)",borderRadius:"8px",padding:"12px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:"#9945ff",letterSpacing:"2px"}}>PUMP.FUN</div>
                  <div className="mono" style={{fontSize:"8px",color:"#444",letterSpacing:"2px",marginTop:"2px"}}>LAUNCHING SOON</div>
                </div>
                <div style={{flex:1,background:"rgba(20,241,149,0.04)",border:"1px solid rgba(20,241,149,0.1)",borderRadius:"8px",padding:"12px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:"#14f195",letterSpacing:"2px"}}>SOLANA</div>
                  <div className="mono" style={{fontSize:"8px",color:"#444",letterSpacing:"2px",marginTop:"2px"}}>NATIVE TOKEN</div>
                </div>
              </div>
            </div>
          </div>
        </div>

    
      </section>
      {/* ── TECH STACK ── */}
      <section style={{padding:"80px 20px",borderTop:"1px solid rgba(255,255,255,0.04)"}} className="section-reveal">
        <div style={{maxWidth:"860px",margin:"0 auto",textAlign:"center"}}>
          <div className="mono" style={{fontSize:"10px",color:"#ff6b35",letterSpacing:"5px",marginBottom:"12px"}}>INFRASTRUCTURE</div>
          <div className="title" style={{fontSize:"clamp(28px,4vw,52px)",letterSpacing:"4px",marginBottom:"48px"}}>BUILT ON BATTLE-TESTED TECH</div>
          <div style={{display:"flex",justifyContent:"center",gap:"20px",flexWrap:"wrap"}}>
            {[
              {name:"SOLANA",desc:"Sub-second finality",col:"#9945ff"},
              {name:"ANCHOR",desc:"Smart contracts",col:"#14f195"},
              {name:"CLAUDE AI",desc:"Battle engine",col:"#ff6b35"},
              {name:"SUPABASE",desc:"Realtime layer",col:"#3ecf8e"},
              {name:"PHANTOM",desc:"Wallet adapter",col:"#ab9ff2"},
              {name:"HELIUS",desc:"RPC provider",col:"#f7c948"},
            ].map((t,i)=>(
              <div key={i} style={{padding:"16px 24px",background:"rgba(255,255,255,0.02)",border:`1px solid ${t.col}20`,borderRadius:"8px",minWidth:"130px",transition:"all 0.3s",cursor:"default"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=t.col+"60";e.currentTarget.style.background=`${t.col}08`;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=`${t.col}20`;e.currentTarget.style.background="rgba(255,255,255,0.02)";}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"20px",color:t.col,letterSpacing:"3px"}}>{t.name}</div>
                <div className="mono" style={{fontSize:"9px",color:"#333",letterSpacing:"2px",marginTop:"4px"}}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{padding:"120px 20px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"500px",height:"500px",background:"radial-gradient(circle,rgba(255,107,53,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <EmberParticles/>
        <div style={{position:"relative",zIndex:1}}>
          <div className="title" style={{fontSize:"clamp(48px,9vw,110px)",letterSpacing:"4px",lineHeight:0.9,marginBottom:"24px"}}>
            READY TO<br/><span style={{background:"linear-gradient(135deg,#ff6b35,#f7c948)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>FIGHT?</span>
          </div>
          <p style={{color:"#555",fontSize:"15px",marginBottom:"40px",fontWeight:300,letterSpacing:"2px"}}>YOUR FIGHTER AWAITS. YOUR SOL IS ON THE LINE.</p>
          <button className="enter-btn" onClick={onEnter} style={{fontSize:"24px",padding:"18px 60px"}}>
            <span>⚔ ENTER THE ARENA</span>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{padding:"32px 20px",borderTop:"1px solid rgba(255,255,255,0.04)",textAlign:"center"}}>
        <div className="title" style={{fontSize:"24px",letterSpacing:"6px",color:"rgba(255,255,255,0.15)",marginBottom:"12px"}}>CLAWD ARENA</div>
        <div className="mono" style={{fontSize:"9px",color:"#1a1a2e",letterSpacing:"3px"}}>
          BUILT ON SOLANA · POWERED BY CLAUDE · © 2025
        </div>
      </footer>
    </>
  );
}