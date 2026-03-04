import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Landing from "./Landing.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — replace these with your Supabase project values
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://qtcrbfmnugaduygmotyw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lLjEjopCTxBbaHFNcDWaGA_S1y2b7GN";
const BET_OPTIONS = [0.1, 1, 5]
const PLATFORM_CUT = 0.01;
const ESCROW_ADDRESS = "2W7Uu1xU9yVkm5vRPouMAZjHsbk29GiCZBmdVvcDsdDQ";

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SUPABASE SETUP — run this SQL in your Supabase SQL editor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Queue of fighters waiting for a match
create table queue (
  id uuid default gen_random_uuid() primary key,
  wallet text not null unique,
  fighter jsonb not null,
  tx_sig text,
  created_at timestamp default now()
);

-- Active & completed matches
create table matches (
  id uuid default gen_random_uuid() primary key,
  player1 jsonb not null,
  player2 jsonb not null,
  battle_result jsonb,
  winner_wallet text,
  status text default 'pending',  -- pending | fighting | done
  created_at timestamp default now()
);

-- Enable realtime on both tables
alter publication supabase_realtime add table queue;
alter publication supabase_realtime add table matches;
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
  @keyframes breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes attackRight{0%{transform:translateX(0)}40%{transform:translateX(42px) scaleX(1.1)}100%{transform:translateX(0)}}
  @keyframes attackLeft{0%{transform:translateX(0)}40%{transform:translateX(-42px) scaleX(1.1)}100%{transform:translateX(0)}}
  @keyframes getHit{0%,100%{transform:translateX(0);filter:brightness(1)}25%{transform:translateX(-14px) rotate(-5deg);filter:brightness(4) saturate(0)}65%{transform:translateX(9px) rotate(3deg);filter:brightness(2)}}
  @keyframes winPose{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-20px) rotate(8deg)}}
  @keyframes loseFall{0%{transform:rotate(0deg) translateY(0);opacity:1}100%{transform:rotate(85deg) translateY(28px);opacity:0.2}}
  @keyframes vsAppear{0%{transform:scale(0.2) rotate(-180deg);opacity:0}70%{transform:scale(1.15) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
  @keyframes roundFlash{0%{transform:scale(0.5);opacity:0}40%{transform:scale(1.1);opacity:1}70%{transform:scale(0.98);opacity:1}100%{transform:scale(1);opacity:0}}
  @keyframes screenShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-7px,4px)}40%{transform:translate(7px,-4px)}60%{transform:translate(-5px,-7px)}80%{transform:translate(5px,7px)}}
  @keyframes reveal{0%{transform:scale(0.6) translateY(40px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
  @keyframes glowPulse{0%,100%{box-shadow:0 0 12px var(--g),0 0 24px var(--g)}50%{box-shadow:0 0 28px var(--g),0 0 55px var(--g)}}
  @keyframes floatDmg{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-55px);opacity:0}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes scanIn{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}
  @keyframes queuePulse{0%,100%{border-color:#1a1a2e}50%{border-color:#9945ff50}}
  @keyframes dotdot{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}
  .idle{animation:breathe 2.2s ease-in-out infinite}
  .atk-r{animation:attackRight 0.4s cubic-bezier(.2,.8,.4,1)}
  .atk-l{animation:attackLeft 0.4s cubic-bezier(.2,.8,.4,1)}
  .hit{animation:getHit 0.35s ease-in-out}
  .win{animation:winPose 0.7s ease-in-out infinite}
  .lose{animation:loseFall 0.6s ease-out forwards}
  .shake{animation:screenShake 0.3s ease-in-out}
  .dots::after{content:'';animation:dotdot 1.2s steps(1) infinite}
  *{box-sizing:border-box;margin:0;padding:0}
  body,input,textarea,button{font-family:'Share Tech Mono',monospace}
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-track{background:#050510}
  ::-webkit-scrollbar-thumb{background:#222235;border-radius:2px}
  input,textarea{outline:none}
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const nc = (name) => {
  let h = 0;
  for (const c of (name||"?")) h = (h*31 + c.charCodeAt(0)) % 360;
  return { primary:`hsl(${h},85%,58%)`, secondary:`hsl(${(h+30)%360},70%,32%)`, glow:`hsl(${h},100%,65%)`, h };
};
const short = (a) => a ? `${a.slice(0,4)}…${a.slice(-4)}` : "";
const pot = (bet) => (bet*2*(1-PLATFORM_CUT)).toFixed(4);

// ─── WARRIOR SVG ─────────────────────────────────────────────────────────────
function Warrior({ name, flipped, topStat, size=1 }) {
  const { primary, secondary, h } = nc(name);
  const w = { strength:"sword", speed:"dagger", intelligence:"staff", endurance:"shield", willpower:"axe" }[topStat]||"sword";
  return (
    <svg width={100*size} height={145*size} viewBox="0 0 100 145" style={{overflow:"visible",display:"block"}}>
      <g transform={flipped?"scale(-1,1) translate(-100,0)":""}>
        <ellipse cx="50" cy="140" rx="28" ry="5" fill="rgba(0,0,0,0.4)"/>
        <rect x="34" y="90" width="13" height="34" rx="5" fill={secondary}/>
        <rect x="52" y="90" width="13" height="34" rx="5" fill={secondary}/>
        <rect x="31" y="116" width="17" height="14" rx="4" fill="#0d0d1a"/>
        <rect x="49" y="116" width="17" height="14" rx="4" fill="#0d0d1a"/>
        <rect x="29" y="52" width="42" height="42" rx="9" fill={primary}/>
        <rect x="37" y="58" width="26" height="7" rx="3" fill={secondary}/>
        <rect x="44" y="70" width="12" height="18" rx="3" fill={secondary} opacity=".65"/>
        <rect x="29" y="75" width="8" height="18" rx="4" fill={secondary} opacity=".8"/>
        <rect x="63" y="75" width="8" height="18" rx="4" fill={secondary} opacity=".8"/>
        <rect x="43" y="46" width="14" height="10" rx="3" fill={primary}/>
        <rect x="32" y="22" width="36" height="28" rx="7" fill={primary}/>
        <rect x="29" y="16" width="42" height="18" rx="7" fill={secondary}/>
        <rect x="35" y="28" width="30" height="9" rx="3" fill="#050510"/>
        <rect x="37" y="30" width="26" height="5" rx="2" fill={`hsl(${(h+120)%360},100%,60%)`} opacity=".85"/>
        <polygon points="50,6 45,16 55,16" fill={`hsl(${(h+40)%360},90%,60%)`}/>
        <rect x="37" y="37" width="26" height="10" rx="3" fill={`hsl(${h},60%,42%)`}/>
        <rect x="12" y="55" width="17" height="12" rx="6" fill={primary}/>
        <rect x="71" y="55" width="17" height="12" rx="6" fill={primary}/>
        {w==="sword"&&<g transform="translate(82,28)"><rect x="-3" y="-2" width="5" height="58" rx="2" fill="#bcc8d4"/><polygon points="0,-18 -4,0 4,0" fill="#d8e4ec"/><rect x="-9" y="44" width="18" height="5" rx="2" fill={secondary}/></g>}
        {w==="staff"&&<g transform="translate(83,10)"><rect x="-2" y="0" width="4" height="75" rx="2" fill="#6b3a1f"/><circle cx="0" cy="0" r="12" fill={`hsl(${(h+120)%360},90%,50%)`} opacity=".9"/><circle cx="0" cy="0" r="5" fill="white" opacity=".4"/></g>}
        {w==="axe"&&<g transform="translate(80,22)"><rect x="-2" y="0" width="4" height="65" rx="2" fill="#4a2c0f"/><path d="M2,4 L22,-2 L22,28 L2,22 Z" fill="#909090"/></g>}
        {w==="dagger"&&<g transform="translate(82,50)"><rect x="-2" y="0" width="4" height="40" rx="1" fill="#c8d4dc"/><polygon points="0,-16 -3,0 3,0" fill="#dce8f0"/><g transform="translate(-16,10) rotate(-30)"><rect x="-2" y="0" width="4" height="30" rx="1" fill="#c0ccd4" opacity=".8"/></g></g>}
        {w==="shield"&&<g><g transform="translate(10,36)"><path d="M0,-20 L18,-20 L22,10 L9,26 L-4,10 Z" fill={secondary}/><path d="M0,-16 L14,-16 L17,8 L9,20 L1,8 Z" fill={primary}/></g><g transform="translate(82,30)"><rect x="-2" y="0" width="4" height="55" rx="2" fill="#b0b8c0"/><polygon points="0,-14 -3,0 3,0" fill="#d0d8e0"/></g></g>}
      </g>
    </svg>
  );
}

// ─── PHANTOM HOOK ─────────────────────────────────────────────────────────────
function usePhantom() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const ready = useRef(false);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@solana/web3.js@1.87.6/lib/index.iife.min.js";
    s.onload = () => { ready.current = true; };
    document.head.appendChild(s);
  }, []);

  const fetchBal = async (pk) => {
    try {
      const { Connection, PublicKey, clusterApiUrl } = window.solanaWeb3;
      const conn = new Connection("https://devnet.helius-rpc.com/?api-key=6b56ae36-a263-4599-a807-43a5289701dc");
      const bal = await conn.getBalance(new PublicKey(pk));
      setBalance((bal/1e9).toFixed(3));
    } catch { setBalance("?.???"); }
  };

  const connect = async () => {
    setError(null);
    if (!window.solana?.isPhantom) { setError("Phantom not found — install at phantom.com"); return; }
    setConnecting(true);
    try {
      const r = await window.solana.connect();
      const pk = r.publicKey.toString();
      setWallet(pk);
      if (ready.current) await fetchBal(pk);
    } catch(e) { setError(e.message||"Rejected"); }
    setConnecting(false);
  };

  const sendBet = async (matchId, mode = "initialize", existingPdaId = null, betAmount = 0.1) => {
  if (!wallet || !ready.current) throw new Error("Not ready");
  const { Connection, PublicKey, Transaction, TransactionInstruction,
          SystemProgram, clusterApiUrl } = window.solanaWeb3;

  const conn = new Connection("https://devnet.helius-rpc.com/?api-key=6b56ae36-a263-4599-a807-43a5289701dc", "confirmed");
  const programId = new PublicKey("3ZMQYK6pfxGDemfGXXtt2KqbfRQW6C3VMbkbfhZiRCb7");
  const matchSeed = new TextEncoder().encode("match");
  const pdaId = existingPdaId || matchId;
  const seedId = pdaId.replace(/-/g, "").slice(0, 16);

  const [matchPDA] = await PublicKey.findProgramAddress(
    [matchSeed, new TextEncoder().encode(seedId)],
    programId
  );

  // Pick discriminator based on mode
  // initialize_match
const discriminator = mode === "initialize"
  ? new Uint8Array([156, 133, 52, 179, 176, 29, 64, 124])
  : new Uint8Array([244, 8, 47, 130, 192, 59, 179, 44]); // join_match

  const idToEncode = pdaId;
  const matchIdBytes = new TextEncoder().encode(idToEncode);
  const lenBuf = new ArrayBuffer(4);
  new DataView(lenBuf).setUint32(0, matchIdBytes.length, true);

  let data;
  if (mode === "initialize") {
    const betLamports = BigInt(Math.round(betAmount * 1e9));
    const betBuf = new ArrayBuffer(8);
    new DataView(betBuf).setBigUint64(0, betLamports, true);
    data = new Uint8Array([...discriminator, ...new Uint8Array(lenBuf), ...matchIdBytes, ...new Uint8Array(betBuf)]);
  } else {
    data = new Uint8Array([...discriminator, ...new Uint8Array(lenBuf), ...matchIdBytes]);
  }

  const playerPubkey = new PublicKey(wallet);
  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: matchPDA,                    isSigner: false, isWritable: true  },
      { pubkey: playerPubkey,                isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
    ],
    data,
  });

  const { blockhash } = await conn.getLatestBlockhash();
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: playerPubkey });
  tx.add(ix);
  const signed = await window.solana.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(sig, "confirmed");
  await fetchBal(wallet);
  return sig;
};

  return { wallet, balance, connecting, error, connect, sendBet };
}

// ─── STAT FORM ────────────────────────────────────────────────────────────────
const STATS = ["strength","speed","intelligence","endurance","willpower"];
const ICONS = { strength:"⚔️", speed:"💨", intelligence:"🧠", endurance:"🛡️", willpower:"🔥" };

function FighterForm({ wallet, onSubmit, sendBet }) {
  const [matchId, setMatchId] = useState(null);
  const [betSol, setBetSol] = useState(0.1);
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [stats, setStats] = useState({ strength:6, speed:6, intelligence:6, endurance:6, willpower:6 });
  const [abilities, setAbilities] = useState([{name:"",desc:""},{name:"",desc:""}]);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [txSig, setTxSig] = useState(null);
  const [payErr, setPayErr] = useState(null);
 

  const rem = 30 - Object.values(stats).reduce((a,b)=>a+b,0);
  const C = nc(name);
  const top = Object.entries(stats).sort((a,b)=>b[1]-a[1])[0][0];
  const ready = name.trim() && personality.trim() && rem===0;

  const adj = (stat,d) => {
    const nv = stats[stat]+d;
    if (nv<1||nv>10||(d>0&&rem<=0)) return;
    setStats(s=>({...s,[stat]:nv}));
  };

  const pay = async () => {
  setPaying(true); setPayErr(null);
  try {
    // Check queue BEFORE paying — P2 should join, not initialize
    const { data: queue } = await sb.from("queue")
      .select("*").neq("wallet", wallet)
      .eq("bet_sol", betSol)
      .order("created_at", { ascending: true }).limit(1);

    if (queue && queue.length > 0 && queue[0].pda_match_id) {
      // P2 — join existing PDA
      const opponentPdaId = queue[0].pda_match_id;
      setMatchId(opponentPdaId);
      const sig = await sendBet(opponentPdaId, "join", opponentPdaId, betSol);
      setTxSig(sig);
    } else {
      // P1 — create new PDA
      const newMatchId = crypto.randomUUID();
      setMatchId(newMatchId);
      const sig = await sendBet(newMatchId, "initialize", null, betSol);
      setTxSig(sig);
    }
    setPaid(true);
  } catch(e) { setPayErr(e.message||"Transaction failed"); }
  setPaying(false);
};

  return (
    <div style={{background:"linear-gradient(145deg,#080815,#120820)",border:`2px solid ${name?C.primary:"#1a1a2e"}`,borderRadius:"14px",padding:"22px",width:"100%",maxWidth:"400px",boxShadow:name?`0 0 40px ${C.primary}20`:undefined,transition:"all 0.4s",animation:"fadeIn 0.4s"}}>
      <div style={{textAlign:"center",marginBottom:"18px"}}>
        <div style={{display:"inline-block",filter:name?`drop-shadow(0 0 18px ${C.primary})`:"none",transition:"filter 0.4s",marginBottom:"8px"}}>
          <Warrior name={name||"?"} flipped={false} topStat={top}/>
        </div>
        <div style={{color:name?C.primary:"#333",fontSize:"11px",letterSpacing:"4px"}}>YOUR FIGHTER</div>
        <div style={{color:"#2a2a40",fontSize:"9px",marginTop:"3px"}}>{short(wallet)}</div>
      </div>

      {[["NAME","text",name,setName,"Your warrior's name...","#fff","13px"],
        ["FIGHTING PERSONALITY","textarea",personality,setPersonality,"How do they fight? Savage? Cold? Cunning?","#bbb","11px"],
        ["AGENT SYSTEM PROMPT — OPTIONAL","textarea",systemPrompt,setSystemPrompt,"Paste your AI agent's core directive. This is their soul.","#555","10px"]
      ].map(([label,type,val,set,ph,col,fs],i)=>(
        <div key={i} style={{marginBottom:"12px"}}>
          <label style={{color:"#383850",fontSize:"9px",letterSpacing:"2px",display:"block",marginBottom:"4px"}}>{label}</label>
          {type==="text"
            ? <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:"100%",padding:"9px 12px",background:"#060612",border:`1px solid ${val&&i===0?C.primary+"50":"#1a1a2e"}`,borderRadius:"7px",color:col,fontSize:fs}}/>
            : <textarea value={val} onChange={e=>set(e.target.value)} rows={i===2?2:3} placeholder={ph} style={{width:"100%",padding:"9px 12px",background:"#060612",border:"1px solid #14141e",borderRadius:"7px",color:col,fontSize:fs,resize:"none"}}/>
          }
        </div>
      ))}

      {/* Stats */}
      <div style={{marginBottom:"18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"9px"}}>
          <span style={{color:"#383850",fontSize:"9px",letterSpacing:"2px"}}>STATS — 30 PTS</span>
          <span style={{fontSize:"9px",padding:"2px 8px",borderRadius:"20px",background:rem===0?"rgba(74,222,128,0.08)":"rgba(251,191,36,0.08)",color:rem===0?"#4ade80":rem<0?"#f87171":"#fbbf24"}}>
            {rem===0?"✓ SET":`${rem} left`}
          </span>
        </div>
        {STATS.map(s=>(
          <div key={s} style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"6px"}}>
            <span style={{fontSize:"11px",width:"16px"}}>{ICONS[s]}</span>
            <span style={{color:s===top?C.primary:"#444",fontSize:"9px",width:"80px",textTransform:"uppercase",letterSpacing:"1px",transition:"color 0.3s"}}>{s}</span>
            <button onClick={()=>adj(s,-1)} style={{background:"#0a0a1a",border:"1px solid #1a1a2e",color:"#555",width:"20px",height:"20px",borderRadius:"4px",cursor:"pointer",fontSize:"13px",flexShrink:0}}>−</button>
            <div style={{flex:1,height:"5px",background:"#0a0a1a",borderRadius:"3px",overflow:"hidden"}}>
              <div style={{width:`${stats[s]*10}%`,height:"100%",background:`linear-gradient(90deg,${C.secondary},${C.primary})`,transition:"width 0.15s"}}/>
            </div>
            <span style={{color:"#ccc",fontSize:"11px",width:"16px",textAlign:"center",flexShrink:0}}>{stats[s]}</span>
            <button onClick={()=>adj(s,1)} style={{background:"#0a0a1a",border:"1px solid #1a1a2e",color:"#555",width:"20px",height:"20px",borderRadius:"4px",cursor:"pointer",fontSize:"13px",flexShrink:0}}>+</button>
          </div>
        ))}
      </div>

      {/* Abilities */}
      <div style={{marginBottom:"20px"}}>
        <div style={{color:"#383850",fontSize:"9px",letterSpacing:"2px",marginBottom:"9px"}}>SPECIAL ABILITIES</div>
        {abilities.map((ab,i)=>(
          <div key={i} style={{marginBottom:"7px",padding:"9px 11px",background:"rgba(255,255,255,0.015)",borderRadius:"7px",border:"1px solid #101020"}}>
            <div style={{color:C.primary,fontSize:"9px",letterSpacing:"2px",marginBottom:"5px"}}>ABILITY {i+1}</div>
            <input value={ab.name} onChange={e=>setAbilities(a=>a.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="Name..." style={{width:"100%",padding:"4px 0",background:"transparent",border:"none",borderBottom:"1px solid #1a1a2e",color:"#ddd",fontSize:"11px",marginBottom:"5px"}}/>
            <input value={ab.desc} onChange={e=>setAbilities(a=>a.map((x,j)=>j===i?{...x,desc:e.target.value}:x))} placeholder="What does it do?" style={{width:"100%",padding:"4px 0",background:"transparent",border:"none",color:"#555",fontSize:"10px"}}/>
          </div>
        ))}
      </div>

      {/* Bet + Enter */}
      {!paid ? (
        <>
          {/* Bet selector */}
          <div style={{marginBottom:"11px"}}>
            <div style={{color:"#383850",fontSize:"9px",letterSpacing:"2px",marginBottom:"8px"}}>SELECT BET AMOUNT</div>
            <div style={{display:"flex",gap:"8px"}}>
  {BET_OPTIONS.map(opt=>(
    <button key={opt} onClick={()=>setBetSol(opt)} style={{flex:1,padding:"10px 0",background:betSol===opt?"linear-gradient(135deg,#b45309,#f7c948)":"#060612",border:`2px solid ${betSol===opt?"#f7c948":"#1a1a2e"}`,borderRadius:"7px",color:betSol===opt?"#000":"#666",fontSize:"13px",fontWeight:"bold",cursor:"pointer",transition:"all 0.2s"}}>
      ◎ {opt===0.1?"0.1":opt===1?"1":"5"}
    </button>
  ))}
</div>
          </div>

          <div style={{background:"rgba(247,201,72,0.04)",border:"1px solid rgba(247,201,72,0.12)",borderRadius:"8px",padding:"11px 13px",marginBottom:"11px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#888",fontSize:"10px"}}>Entry bet</span>
              <span style={{color:"#f7c948",fontSize:"14px",fontWeight:"bold"}}>◎ {betSol} SOL</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px"}}>
              <span style={{color:"#333",fontSize:"9px"}}>Winner gets</span>
              <span style={{color:"#4ade80",fontSize:"10px"}}>◎ {pot(betSol)} SOL</span>
            </div>
            {/* ← ADD THIS */}
  <div style={{color:"#444",fontSize:"9px",marginTop:"6px",borderTop:"1px solid #111",paddingTop:"6px"}}>
    ⚡ First to queue pays ~0.0025 SOL extra rent — returned after the fight
  </div>
</div>
          
          <button onClick={pay} disabled={!ready||paying} style={{"--g":"#f7c948",width:"100%",padding:"13px",borderRadius:"8px",fontSize:"11px",letterSpacing:"3px",cursor:ready&&!paying?"pointer":"not-allowed",background:ready&&!paying?"linear-gradient(135deg,#b45309,#f7c948)":"#0d0d1a",border:`2px solid ${ready?"#f7c94840":"#1a1a2e"}`,color:"#fff",animation:ready&&!paying?"glowPulse 2s ease-in-out infinite":"none"}}>
            {paying?"⏳ CONFIRMING...":!ready?"FILL FORM FIRST":`PAY ◎${betSol} & FIND MATCH`}
          </button>
          {payErr&&<div style={{color:"#f87171",fontSize:"9px",marginTop:"5px",textAlign:"center"}}>⚠ {payErr}</div>}
        </>
      ) : (
        <>
          <div style={{background:"rgba(74,222,128,0.04)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:"8px",padding:"9px 12px",marginBottom:"11px",textAlign:"center"}}>
            <div style={{color:"#4ade80",fontSize:"10px",letterSpacing:"2px"}}>✓ BET CONFIRMED</div>
            {txSig&&<div style={{color:"#333",fontSize:"9px",marginTop:"3px"}}>TX: {short(txSig)}</div>}
          </div>
          <button onClick={()=>onSubmit({name,personality,systemPrompt,stats,abilities,wallet,txSig,matchId,betSol})} style={{"--g":C.primary,width:"100%",padding:"13px",borderRadius:"8px",fontSize:"11px",letterSpacing:"4px",cursor:"pointer",background:`linear-gradient(135deg,${C.secondary},${C.primary})`,border:`2px solid ${C.primary}50`,color:"#fff",animation:"glowPulse 2s ease-in-out infinite"}}>
            ⚔️ JOIN MATCHMAKING
          </button>
        </>
      )}
    </div>
  );
}

// ─── MATCHMAKING LOBBY ────────────────────────────────────────────────────────
function Lobby({ fighter, matchId, onMatched }) {
  const C = nc(fighter.name);
  const top = Object.entries(fighter.stats).sort((a,b)=>b[1]-a[1])[0][0];
  const [queueSize, setQueueSize] = useState(1);
  const [dots, setDots] = useState("");

  useEffect(() => {
    // Animate dots
    const t = setInterval(()=>setDots(d=>d.length>=3?"":d+"."), 500);
    return ()=>clearInterval(t);
  }, []);

  useEffect(() => {
    // Watch for a match being created with this fighter's wallet
    const sub = sb.channel("match-watch")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"matches" }, payload => {
        const m = payload.new;
        if (m.player1?.wallet===fighter.wallet || m.player2?.wallet===fighter.wallet) {
          onMatched(m.id, m);
        }
      })
      .subscribe();

    // Watch queue size
    const qSub = sb.channel("queue-count")
      .on("postgres_changes", { event:"*", schema:"public", table:"queue" }, async () => {
        const { count } = await sb.from("queue").select("*",{count:"exact",head:true});
        setQueueSize(count||1);
      })
      .subscribe();

    return () => { sb.removeChannel(sub); sb.removeChannel(qSub); };
  }, [fighter.wallet, onMatched]);

  return (
    <div style={{textAlign:"center",padding:"20px",maxWidth:"380px",width:"100%",animation:"fadeIn 0.4s"}}>
      <div style={{filter:`drop-shadow(0 0 20px ${C.primary})`,display:"inline-block",marginBottom:"16px"}}>
        <Warrior name={fighter.name} flipped={false} topStat={top} size={1.2}/>
      </div>
      <div style={{color:C.primary,fontSize:"14px",letterSpacing:"4px",fontWeight:"bold",marginBottom:"4px"}}>{fighter.name.toUpperCase()}</div>
      <div style={{color:"#333",fontSize:"9px",marginBottom:"24px"}}>{short(fighter.wallet)}</div>

      {/* Queue card */}
      <div style={{background:"rgba(153,69,255,0.04)",border:"1px solid rgba(153,69,255,0.2)",borderRadius:"12px",padding:"22px",marginBottom:"20px",animation:"queuePulse 2s ease-in-out infinite"}}>
        <div style={{fontSize:"32px",marginBottom:"12px",animation:"pulse 1s ease-in-out infinite"}}>⚔️</div>
        <div style={{color:"#9945ff",fontSize:"12px",letterSpacing:"4px",marginBottom:"6px"}}>SEARCHING FOR OPPONENT{dots}</div>
        <div style={{color:"#333",fontSize:"9px",letterSpacing:"2px"}}>{queueSize} fighter{queueSize!==1?"s":""} in queue</div>
        <div style={{marginTop:"16px",height:"2px",background:"#0d0d1a",borderRadius:"1px",overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(90deg,#9945ff,#14f195)",animation:"scanIn 1.5s ease-in-out infinite alternate",transformOrigin:"left"}}/>
        </div>
      </div>

      <div style={{color:"#1e1e30",fontSize:"9px",letterSpacing:"3px"}}>
        YOUR BET IS LOCKED IN · WAITING FOR CHALLENGER
      </div>

      <button
  onClick={async () => {
    try {
      await fetch("https://clawd-arena-production.up.railway.app/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: fighter.wallet,
          secret: "clawd-arena-secret-2024"
        })
      });
      // Clean up and go back
      await sb.from("queue").delete().eq("wallet", fighter.wallet);
      window.location.reload();
    } catch(e) { alert("Cancel failed: " + e.message); }
  }}
  style={{
    marginTop: "16px",
    width: "100%",
    padding: "10px",
    background: "transparent",
    border: "1px solid #f8717130",
    borderRadius: "7px",
    color: "#f87171",
    fontSize: "9px",
    letterSpacing: "3px",
    cursor: "pointer"
  }}
>
  ✕ CANCEL & REFUND
</button>
    </div>
  );
}

// ─── BATTLE ARENA ─────────────────────────────────────────────────────────────
function BattleArena({ fighters, matchId, myWallet, onComplete }) {
  const [hp, setHp] = useState([100,100]);
  const [anim, setAnim] = useState(["idle","idle"]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shake, setShake] = useState(false);
  const [overlay, setOverlay] = useState({show:true,text:"THE ARENA JUDGES..."});
  const [dmg, setDmg] = useState(null);
  const logRef = useRef(null);
  const played = useRef(false);
  const isPlayer1 = fighters[0].wallet === myWallet;
  const C = [nc(fighters[0].name), nc(fighters[1].name)];
  const tops = fighters.map(f=>Object.entries(f.stats).sort((a,b)=>b[1]-a[1])[0][0]);

  // Only P1 runs the battle simulation and writes result to Supabase
  useEffect(() => {
    if (!isPlayer1) return;

    async function runBattle() {
      const prompt = `Simulate a 5-round duel. The loser MUST reach exactly 0 HP. Scale damage accordingly.

FIGHTER 1 — ${fighters[0].name}
Personality: ${fighters[0].personality}
System Prompt: ${fighters[0].systemPrompt||"None"}
Stats: STR ${fighters[0].stats.strength} SPD ${fighters[0].stats.speed} INT ${fighters[0].stats.intelligence} END ${fighters[0].stats.endurance} WIL ${fighters[0].stats.willpower}
Abilities: [${fighters[0].abilities[0]?.name}]: ${fighters[0].abilities[0]?.desc} | [${fighters[0].abilities[1]?.name}]: ${fighters[0].abilities[1]?.desc}

FIGHTER 2 — ${fighters[1].name}
Personality: ${fighters[1].personality}
System Prompt: ${fighters[1].systemPrompt||"None"}
Stats: STR ${fighters[1].stats.strength} SPD ${fighters[1].stats.speed} INT ${fighters[1].stats.intelligence} END ${fighters[1].stats.endurance} WIL ${fighters[1].stats.willpower}
Abilities: [${fighters[1].abilities[0]?.name}]: ${fighters[1].abilities[0]?.desc} | [${fighters[1].abilities[1]?.name}]: ${fighters[1].abilities[1]?.desc}

Return ONLY JSON:
{"rounds":[{"round":1,"attacker":"fighter1","action":"one sentence","damage":20},{"round":2,"attacker":"fighter2","action":"one sentence","damage":22},{"round":3,"attacker":"fighter1","action":"ability used","damage":26,"abilityUsed":"fighter1","abilityEffect":"one sentence"},{"round":4,"attacker":"fighter2","action":"one sentence","damage":18,"abilityUsed":"fighter2","abilityEffect":"one sentence"},{"round":5,"attacker":"fighter1","action":"finishing blow","damage":34}],"winner":"fighter1","winnerHpRemaining":28,"finalBlow":"cinematic sentence","reason":"2 sentences"}`;

      try {
        const res = await fetch("https://clawd-arena-production.up.railway.app/battle", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt })
});
        const data = await res.json();
        const battle = JSON.parse(data.content[0].text.replace(/```json|```/g,"").trim());
        // Write result to Supabase — both players will receive it via realtime
        await sb.from("matches").update({ battle_result: battle, winner_wallet: battle.winner==="fighter1"?fighters[0].wallet:fighters[1].wallet, status:"fighting" }).eq("id",matchId);
        return battle;
      } catch(err) {
  console.error("Battle API failed:", err);
        // fallback
        const s0=Object.values(fighters[0].stats).reduce((a,b)=>a+b,0);
        const s1=Object.values(fighters[1].stats).reduce((a,b)=>a+b,0);
        const w=s0>=s1?"fighter1":"fighter2";
        const battle={rounds:[{round:1,attacker:"fighter1",action:"Opens with a thunderous strike",damage:20},{round:2,attacker:"fighter2",action:"Retaliates with calculated fury",damage:22},{round:3,attacker:w,action:"Unleashes their ability with devastating force",damage:28,abilityUsed:w,abilityEffect:"The ability tears through all defenses"},{round:4,attacker:w,action:"Presses the advantage relentlessly",damage:24},{round:5,attacker:w,action:"Delivers the legendary finishing blow",damage:36}],winner:w,winnerHpRemaining:28,finalBlow:`${w==="fighter1"?fighters[0].name:fighters[1].name} stands alone in the arena.`,reason:"Superior stats and fighting nature led to victory."};
        await sb.from("matches").update({battle_result:battle,winner_wallet:battle.winner==="fighter1"?fighters[0].wallet:fighters[1].wallet,status:"fighting"}).eq("id",matchId);
        return battle;
      }
    }
    runBattle();
  }, [isPlayer1]);

  // Both players listen for the battle_result on this match
  useEffect(() => {
    const sub = sb.channel(`match-${matchId}`)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"matches",filter:`id=eq.${matchId}`}, payload => {
        const battle = payload.new.battle_result;
if (!battle) return;
if (played.current) return;
played.current = true;
setLoading(false);
setOverlay({show:false,text:""});
playBattle(battle);
      })
      .subscribe();
    return ()=>sb.removeChannel(sub);
  }, [matchId]);

  const playBattle = (battle) => {
    const loserIdx = battle.winner==="fighter1"?1:0;
    const winnerHpLeft = Math.max(5,Math.min(95,battle.winnerHpRemaining||28));
    const dmgTo = [0,0];
    battle.rounds.forEach(r=>{ const ai=r.attacker==="fighter1"?0:1; dmgTo[1-ai]+=r.damage; });
    const scale = [
      dmgTo[0]>0?(1-winnerHpLeft/100)/dmgTo[0]*(loserIdx===0?1:0.8):0,
      dmgTo[1]>0?(loserIdx===1?100/dmgTo[1]:((1-winnerHpLeft/100)/dmgTo[1])):0
    ];
    const loserScale = dmgTo[loserIdx]>0 ? 100/dmgTo[loserIdx] : 1;
    const winnerScale = dmgTo[1-loserIdx]>0 ? (100-winnerHpLeft)/dmgTo[1-loserIdx] : 0.5;

    let hpState = [100,100];
    battle.rounds.forEach((round,i)=>{
      const ai=round.attacker==="fighter1"?0:1;
      const di=1-ai;
      const sd = Math.round(round.damage * (di===loserIdx?loserScale:winnerScale));
      setTimeout(()=>{
        setOverlay({show:true,text:`ROUND ${round.round}`});
        setTimeout(()=>setOverlay({show:false,text:""}),900);
        setTimeout(()=>{
          setAnim(a=>a.map((x,idx)=>idx===ai?(ai===0?"atk-r":"atk-l"):"idle"));
          setTimeout(()=>{
            setAnim(a=>a.map((x,idx)=>idx===di?"hit":"idle"));
            setShake(true); setTimeout(()=>setShake(false),320);
            hpState=hpState.map((v,idx)=>idx===di?Math.max(0,v-sd):v);
            setHp([...hpState]);
            setDmg({side:di,val:sd,id:Date.now()});
            setTimeout(()=>setDmg(null),900);
            setLog(l=>[...l,{text:round.action,att:round.attacker,ab:round.abilityEffect||null,r:round.round}]);
            setTimeout(()=>setAnim(["idle","idle"]),500);
          },430);
        },1000);
      }, i*2600);
    });

    const endDelay = battle.rounds.length*2600+1600;
    setTimeout(()=>{
      const wi=battle.winner==="fighter1"?0:1;
      setAnim(a=>a.map((_,i)=>i===wi?"win":"lose"));
      setOverlay({show:true,text:`${battle.winner==="fighter1"?fighters[0].name:fighters[1].name} WINS`.toUpperCase()});
      setTimeout(()=>{ setOverlay({show:false,text:""}); onComplete(battle); },3000);
    },endDelay);
  };

  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[log]);

  const ac=(idx)=>({idle:"idle","atk-r":"atk-r","atk-l":"atk-l",hit:"hit",win:"win",lose:"lose"}[anim[idx]]||"idle");

  return (
    <div style={{width:"100%",maxWidth:"660px",margin:"0 auto"}}>
      {/* HP bars */}
      <div style={{display:"flex",gap:"12px",alignItems:"center",marginBottom:"10px"}}>
        {fighters.map((f,i)=>(
          <div key={i} style={{flex:1,textAlign:i===1?"right":"left"}}>
            <div style={{color:C[i].primary,fontSize:"9px",letterSpacing:"2px",marginBottom:"3px"}}>{f.name.toUpperCase()} {f.wallet===myWallet&&<span style={{color:"#9945ff50",fontSize:"8px"}}>(YOU)</span>}</div>
            <div style={{height:"13px",background:"#050510",border:`1px solid ${C[i].primary}35`,borderRadius:"3px",overflow:"hidden",direction:i===1?"rtl":"ltr"}}>
              <div style={{width:`${hp[i]}%`,height:"100%",background:hp[i]>50?`linear-gradient(90deg,${C[i].secondary},${C[i].primary})`:hp[i]>25?"linear-gradient(90deg,#92400e,#f59e0b)":"linear-gradient(90deg,#7f1d1d,#ef4444)",transition:"width 0.6s ease-in-out"}}/>
            </div>
            <div style={{color:hp[i]===0?"#ef4444":C[i].primary,fontSize:"10px",marginTop:"2px"}}>{hp[i]}%</div>
          </div>
        ))}
        <div style={{color:"#1a1a2e",fontSize:"8px",flexShrink:0,letterSpacing:"1px"}}>HP</div>
      </div>

      {/* Stage */}
      <div className={shake?"shake":""} style={{background:"linear-gradient(180deg,#04001a,#100430 55%,#1a0d04)",border:"2px solid #1a1a2e",borderRadius:"10px",position:"relative",minHeight:"195px",overflow:"hidden",display:"flex",alignItems:"flex-end",justifyContent:"space-between",padding:"0 18px 10px"}}>
        <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.006) 3px,rgba(255,255,255,0.006) 6px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:"14px",left:"14px",fontSize:"17px",filter:"drop-shadow(0 0 8px #ff8c00)",animation:"pulse 0.8s ease-in-out infinite"}}>🔥</div>
        <div style={{position:"absolute",top:"14px",right:"14px",fontSize:"17px",filter:"drop-shadow(0 0 8px #ff8c00)",animation:"pulse 0.8s ease-in-out infinite 0.4s"}}>🔥</div>

        {overlay.show&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:20,pointerEvents:"none"}}>
            <div style={{fontSize:"22px",fontWeight:"bold",letterSpacing:"5px",color:loading?"#444":"#ff6b35",textShadow:loading?"none":"0 0 30px #ff6b3580",animation:loading?"pulse 1s ease-in-out infinite":"roundFlash 1.2s ease-out forwards"}}>
              {overlay.text}
            </div>
          </div>
        )}
        {dmg&&<div style={{position:"absolute",top:"28%",left:dmg.side===1?"60%":"18%",fontSize:"20px",fontWeight:"bold",color:"#ff4444",textShadow:"0 0 15px #ff4444",animation:"floatDmg 0.9s ease-out forwards",zIndex:25,pointerEvents:"none"}}>-{dmg.val}</div>}

        <div className={ac(0)} style={{transformOrigin:"bottom center",filter:`drop-shadow(0 0 10px ${C[0].primary}60)`}}>
          <Warrior name={fighters[0].name} flipped={false} topStat={tops[0]}/>
        </div>
        <div className={ac(1)} style={{transformOrigin:"bottom center",filter:`drop-shadow(0 0 10px ${C[1].primary}60)`}}>
          <Warrior name={fighters[1].name} flipped={true} topStat={tops[1]}/>
        </div>
      </div>

      {/* Log */}
      <div ref={logRef} style={{marginTop:"8px",maxHeight:"100px",overflowY:"auto",background:"#030308",border:"1px solid #0e0e1a",borderRadius:"7px",padding:"8px 11px"}}>
        {log.length===0&&!loading&&<div style={{color:"#1a1a2a",fontSize:"10px",textAlign:"center"}}>AWAITING...</div>}
        {log.map((e,i)=>(
          <div key={i} style={{marginBottom:"6px"}}>
            {e.ab&&<div style={{color:"#f59e0b",fontSize:"9px",padding:"2px 6px",background:"rgba(245,158,11,0.06)",borderRadius:"3px",border:"1px solid rgba(245,158,11,0.12)",marginBottom:"3px"}}>✨ {e.ab}</div>}
            <div style={{color:e.att==="fighter1"?C[0].glow:C[1].glow,fontSize:"10px",borderLeft:`2px solid ${e.att==="fighter1"?C[0].primary:C[1].primary}`,paddingLeft:"6px",lineHeight:"1.5"}}>
              <span style={{color:"#222",fontSize:"9px"}}>RD{e.r} </span>{e.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RESULT ────────────────────────────────────────────────────────────────────
function Result({ fighters, battle, myWallet, betSol: betSolProp, onNew }) {
  const wi=battle.winner==="fighter1"?0:1;
  const wc=nc(fighters[wi].name);
  const top=Object.entries(fighters[wi].stats).sort((a,b)=>b[1]-a[1])[0][0];
  const iWon=fighters[wi].wallet===myWallet;
  return (
    <div style={{textAlign:"center",padding:"16px",animation:"reveal 0.5s ease-out",maxWidth:"460px",width:"100%"}}>
      <div style={{color:iWon?"#4ade80":"#f87171",fontSize:"10px",letterSpacing:"5px",marginBottom:"18px",animation:"pulse 1.5s ease-in-out infinite"}}>
        {iWon?"🏆 YOU WIN":"💀 YOU LOSE"}
      </div>
      <div style={{filter:`drop-shadow(0 0 30px ${wc.primary})`,display:"inline-block",marginBottom:"14px"}}>
        <Warrior name={fighters[wi].name} flipped={false} topStat={top} size={1.5}/>
      </div>
      <div style={{fontSize:"24px",fontWeight:"bold",letterSpacing:"5px",color:wc.primary,textShadow:`0 0 25px ${wc.primary}`,marginBottom:"3px"}}>{fighters[wi].name.toUpperCase()}</div>
      <div style={{color:"#ff6b35",fontSize:"11px",letterSpacing:"5px",marginBottom:"20px"}}>STANDS VICTORIOUS</div>

      <div style={{background:"rgba(247,201,72,0.05)",border:"1px solid rgba(247,201,72,0.18)",borderRadius:"10px",padding:"14px",marginBottom:"18px"}}>
        <div style={{color:"#f7c948",fontSize:"9px",letterSpacing:"3px",marginBottom:"6px"}}>◎ PRIZE</div>
        <div style={{color:"#f7c948",fontSize:"26px",fontWeight:"bold"}}>{pot(betSolProp||0.1)} SOL</div>
        <div style={{color:iWon?"#4ade80":"#f87171",fontSize:"9px",marginTop:"5px",letterSpacing:"2px"}}>
          {iWon?"→ TRANSFERRED TO YOUR WALLET":"→ YOUR OPPONENT TAKES THE POT"}
        </div>
      </div>

      
      <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${wc.primary}20`,borderRadius:"9px",padding:"13px",marginBottom:"16px",textAlign:"left"}}>
  <div style={{color:wc.primary,fontSize:"9px",letterSpacing:"3px",marginBottom:"7px"}}>VERDICT</div>
  <div style={{color:"#aaa",fontSize:"10px",lineHeight:"1.8"}}>{battle.reason}</div>
</div>

{/* Combat History */}
<div style={{background:"rgba(255,255,255,0.02)",border:`1px solid #1a1a2e`,borderRadius:"9px",padding:"13px",marginBottom:"22px",textAlign:"left",maxHeight:"180px",overflowY:"auto"}}>
  <div style={{color:"#383850",fontSize:"9px",letterSpacing:"3px",marginBottom:"10px"}}>COMBAT HISTORY</div>
  {battle.rounds?.map((r,i)=>(
    <div key={i} style={{marginBottom:"8px"}}>
      {r.abilityEffect&&<div style={{color:"#f59e0b",fontSize:"9px",padding:"2px 6px",background:"rgba(245,158,11,0.06)",borderRadius:"3px",border:"1px solid rgba(245,158,11,0.12)",marginBottom:"3px"}}>✨ {r.abilityEffect}</div>}
      <div style={{borderLeft:`2px solid ${r.attacker==="fighter1"?nc(fighters[0].name).primary:nc(fighters[1].name).primary}`,paddingLeft:"7px",lineHeight:"1.6"}}>
        <span style={{color:"#333",fontSize:"9px"}}>RD{r.round} </span>
        <span style={{color:r.attacker==="fighter1"?nc(fighters[0].name).glow:nc(fighters[1].name).glow,fontSize:"10px"}}>{r.action}</span>
        <span style={{color:"#f87171",fontSize:"9px",marginLeft:"6px"}}>-{r.damage}</span>
      </div>
    </div>
  ))}
  {battle.finalBlow&&(
    <div style={{marginTop:"10px",padding:"8px",background:"rgba(255,107,53,0.06)",borderRadius:"6px",border:"1px solid rgba(255,107,53,0.15)",color:"#ff6b35",fontSize:"9px",fontStyle:"italic",textAlign:"center"}}>
      ⚔️ {battle.finalBlow}
    </div>
  )}
</div>
      <button onClick={onNew} style={{padding:"12px 28px",background:"transparent",border:`2px solid ${wc.primary}`,borderRadius:"7px",color:wc.primary,fontSize:"10px",letterSpacing:"4px",cursor:"pointer",boxShadow:`0 0 18px ${wc.primary}20`}}>
        NEW FIGHT
      </button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function IronArena() {
  const phantom = usePhantom();
  const [phase, setPhase] = useState("landing");
  const [myFighter, setMyFighter] = useState(null);
  const [match, setMatch] = useState(null); // { id, fighters: [p1,p2] }
  const [battle, setBattle] = useState(null);

  const handleRegistered = async (fighterData) => {
    setMyFighter(fighterData);
    await sb.from("queue").upsert({ wallet: fighterData.wallet, fighter: fighterData, tx_sig: fighterData.txSig, pda_match_id: fighterData.matchId, bet_sol: fighterData.betSol });

    const { data: queue } = await sb.from("queue")
      .select("*")
      .neq("wallet", fighterData.wallet)
      .eq("bet_sol", fighterData.betSol)
      .order("created_at", { ascending: true })
      .limit(1);

    if (queue && queue.length > 0) {
      const opponent = queue[0];
      const p1PdaId = opponent.pda_match_id;

      

      const { data: newMatch } = await sb.from("matches").insert({
        player1: opponent.fighter,
        player2: fighterData,
        status: "pending",
        pda_match_id: p1PdaId,
        player1_wallet: opponent.fighter.wallet  // ← add this
      }).select().single();

      await sb.from("queue").delete().in("wallet", [fighterData.wallet, opponent.wallet]);
      setMatch({ id: newMatch.id, fighters: [opponent.fighter, fighterData] });
      setPhase("fight");
    } else {
      setPhase("queue");
    }
  };

  const handleMatched = useCallback((matchId, matchData) => {
    // Called when P2 gets notified via realtime
    const fighters = [matchData.player1, matchData.player2];
    setMatch({ id: matchId, fighters });
    setPhase("fight");
  }, []);

  const reset = async () => {
    if (phantom.wallet) {
      await sb.from("queue").delete().eq("wallet", phantom.wallet);
    }
    setMyFighter(null); setMatch(null); setBattle(null);
    setPhase("connect");
  };

  const fighters = match?.fighters || [];
  const myIdx = fighters.findIndex(f=>f.wallet===phantom.wallet);

  return (
    <>
      <style>{CSS}</style>
      {phase==="landing"&&<Landing onEnter={()=>setPhase("connect")}/>}
      <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% -10%,#1f0845,#090018 45%,#000005)",color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",padding:"22px 14px",display:phase==="landing"?"none":"flex"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"24px",width:"100%",maxWidth:"660px"}}>
          <div style={{fontSize:"26px",fontWeight:"bold",letterSpacing:"8px",background:"linear-gradient(135deg,#ff6b35,#f7c948,#ff6b35)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 0 20px #ff6b3550)"}}>
             ⚔ CLAWD ARENA ⚔
          </div>
          <div style={{color:"#151525",fontSize:"8px",letterSpacing:"4px",marginTop:"3px"}}>ONLINE · SOLANA · AI AGENT BATTLE</div>

          {/* Wallet pill */}
          {phantom.wallet && (
            <div style={{display:"inline-flex",alignItems:"center",gap:"7px",marginTop:"10px",background:"rgba(153,69,255,0.06)",border:"1px solid rgba(153,69,255,0.2)",borderRadius:"20px",padding:"5px 13px"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 8px #4ade80"}}/>
              <span style={{color:"#888",fontSize:"9px",letterSpacing:"1px"}}>{short(phantom.wallet)}</span>
              {phantom.balance&&<span style={{color:"#f7c94870",fontSize:"9px"}}>◎ {phantom.balance}</span>}
            </div>
          )}

          {/* Step indicators */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",marginTop:"12px"}}>
            {[["connect","CONNECT"],["register","REGISTER"],["queue","QUEUE"],["fight","FIGHT"],["result","RESULT"]].map(([p,label],i,arr)=>(
              <div key={p} style={{display:"flex",alignItems:"center",gap:"6px"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
                  <div style={{width:"8px",height:"8px",borderRadius:"50%",background:phase===p?"#ff6b35":["connect","register","queue","fight","result"].indexOf(phase)>i?"#ff6b3550":"#1a1a2e",transition:"all 0.4s",boxShadow:phase===p?"0 0 10px #ff6b35":undefined}}/>
                  <span style={{color:phase===p?"#ff6b35":"#1a1a2e",fontSize:"7px",letterSpacing:"1px"}}>{label}</span>
                </div>
                {i<arr.length-1&&<div style={{width:"18px",height:"1px",background:"#1a1a2e",marginBottom:"12px"}}/>}
              </div>
            ))}
          </div>
        </div>

        {/* ── CONNECT ── */}
        {phase==="connect"&&(
          <div style={{textAlign:"center",maxWidth:"360px",width:"100%",animation:"fadeIn 0.4s"}}>
            <div style={{fontSize:"48px",marginBottom:"16px"}}>⚔️</div>
            <div style={{color:"#2a2a40",fontSize:"10px",letterSpacing:"3px",marginBottom:"24px"}}>CONNECT YOUR PHANTOM WALLET TO ENTER</div>
            <div style={{background:"rgba(153,69,255,0.04)",border:"1px solid rgba(153,69,255,0.15)",borderRadius:"12px",padding:"20px",marginBottom:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span style={{color:"#555",fontSize:"10px"}}>Entry bet</span>
                <span style={{color:"#f7c948",fontSize:"11px"}}>◎ 0.1 – 5 SOL</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
                <span style={{color:"#555",fontSize:"10px"}}>Platform cut</span>
                <span style={{color:"#555",fontSize:"10px"}}>1%</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #1a1a2e",paddingTop:"8px"}}>
                <span style={{color:"#888",fontSize:"10px"}}>Winner takes</span>
                <span style={{color:"#4ade80",fontSize:"11px"}}>◎ up to {pot(5)} SOL</span>
              </div>
            </div>
            <button onClick={phantom.connect} disabled={phantom.connecting} style={{width:"100%",padding:"14px",background:phantom.connecting?"#0d0d1a":"linear-gradient(135deg,#9945ff,#14f195)",border:"none",borderRadius:"9px",color:"#fff",fontSize:"11px",letterSpacing:"4px",cursor:phantom.connecting?"not-allowed":"pointer",boxShadow:phantom.connecting?"none":"0 0 25px rgba(153,69,255,0.4)"}}>
              {phantom.connecting?"CONNECTING...":"🔗 CONNECT PHANTOM"}
            </button>
            {phantom.error&&<div style={{color:"#f87171",fontSize:"9px",marginTop:"8px"}}>{phantom.error}</div>}
            {phantom.wallet&&(
              <button onClick={()=>setPhase("register")} style={{marginTop:"12px",width:"100%",padding:"13px","--g":"#ff6b35",background:"linear-gradient(135deg,#7c1d0e,#ff6b35)",border:"2px solid #ff6b3540",borderRadius:"9px",color:"#fff",fontSize:"11px",letterSpacing:"4px",cursor:"pointer",animation:"glowPulse 2s ease-in-out infinite"}}>
                WALLET CONNECTED — BUILD FIGHTER ⚔️
              </button>
            )}
          </div>
        )}

        {/* ── REGISTER ── */}
        {phase==="register"&&phantom.wallet&&(
          <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}>
            <div style={{color:"#2a2a40",fontSize:"9px",letterSpacing:"3px"}}>BUILD YOUR FIGHTER · SELECT BET · JOIN MATCHMAKING</div>
            <FighterForm wallet={phantom.wallet} onSubmit={handleRegistered} sendBet={phantom.sendBet}/>
          </div>
        )}

        {/* ── QUEUE / LOBBY ── */}
        {phase==="queue"&&myFighter&&(
          <Lobby fighter={myFighter} matchId={null} onMatched={handleMatched}/>
        )}

        {/* ── FIGHT ── */}
        {phase==="fight"&&match&&(
          <BattleArena fighters={match.fighters} matchId={match.id} myWallet={phantom.wallet} onComplete={b=>{setBattle(b);setPhase("result");}}/>
        )}

        {/* ── RESULT ── */}
        {phase==="result"&&battle&&match&&(
  <Result fighters={match.fighters} battle={battle} myWallet={phantom.wallet} betSol={match.fighters[0]?.betSol||0.1} onNew={reset}/>
)}
      </div>
    </>
  );
}