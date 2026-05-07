import { useState } from "react";
import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore";
import { db } from "./firebase";

const GROUPS = {
  A:["México","África do Sul","Coreia do Sul","Tchecia"],
  B:["Canadá","Bósnia","Catar","Suíça"],
  C:["Brasil","Marrocos","Haiti","Escócia"],
  D:["Estados Unidos","Paraguai","Austrália","Turquia"],
  E:["Alemanha","Curaçao","Costa do Marfim","Equador"],
  F:["Holanda","Japão","Suécia","Tunísia"],
  G:["Bélgica","Egito","Irã","Nova Zelândia"],
  H:["Espanha","Cabo Verde","Arábia Saudita","Uruguai"],
  I:["França","Senegal","Iraque","Noruega"],
  J:["Argentina","Argélia","Áustria","Jordânia"],
  K:["Portugal","RD Congo","Uzbequistão","Colômbia"],
  L:["Inglaterra","Croácia","Gana","Panamá"],
};

const FLAGS = {
  México:"🇲🇽","África do Sul":"🇿🇦","Coreia do Sul":"🇰🇷","Tchecia":"🇨🇿",
  Canadá:"🇨🇦",Bósnia:"🇧🇦",Catar:"🇶🇦",Suíça:"🇨🇭",
  Brasil:"🇧🇷",Marrocos:"🇲🇦",Haiti:"🇭🇹",Escócia:"🟦",
  "Estados Unidos":"🇺🇸",Paraguai:"🇵🇾",Austrália:"🇦🇺",Turquia:"🇹🇷",
  Alemanha:"🇩🇪",Curaçao:"🇨🇼","Costa do Marfim":"🇨🇮",Equador:"🇪🇨",
  Holanda:"🇳🇱",Japão:"🇯🇵",Suécia:"🇸🇪",Tunísia:"🇹🇳",
  Bélgica:"🇧🇪",Egito:"🇪🇬",Irã:"🇮🇷","Nova Zelândia":"🇳🇿",
  Espanha:"🇪🇸","Cabo Verde":"🇨🇻","Arábia Saudita":"🇸🇦",Uruguai:"🇺🇾",
  França:"🇫🇷",Senegal:"🇸🇳",Iraque:"🇮🇶",Noruega:"🇳🇴",
  Argentina:"🇦🇷",Argélia:"🇩🇿",Áustria:"🇦🇹",Jordânia:"🇯🇴",
  Portugal:"🇵🇹","RD Congo":"🇨🇩",Uzbequistão:"🇺🇿",Colômbia:"🇨🇴",
  Inglaterra:"󠁧󠁢󠁥🇬🇧",Croácia:"🇭🇷",Gana:"🇬🇭",Panamá:"🇵🇦",
};

const KO_ROUNDS = [
  { id:"r32",  label:"Rodada de 32", icon:"⚔️", matches:16 },
  { id:"r16",  label:"Oitavas",      icon:"🔥", matches:8  },
  { id:"qf",   label:"Quartas",      icon:"💥", matches:4  },
  { id:"sf",   label:"Semifinal",    icon:"🌟", matches:2  },
  { id:"tp",   label:"3º Lugar",     icon:"🥉", matches:1  },
  { id:"final",label:"Final",        icon:"🏆", matches:1  },
];

const ADMIN_PWD = "copa2026";
const allGroupTeams = Object.values(GROUPS).flat();

function generateGroupMatches(teams){
  const m=[];
  for(let i=0;i<teams.length;i++)
    for(let j=i+1;j<teams.length;j++)
      m.push({home:teams[i],away:teams[j]});
  return m;
}

function getAllKeys(){
  const keys=[];
  Object.entries(GROUPS).forEach(([g,teams])=>
    generateGroupMatches(teams).forEach((_,i)=>keys.push(`${g}_${i}`))
  );
  KO_ROUNDS.forEach(r=>{ for(let i=0;i<r.matches;i++) keys.push(`${r.id}_${i}`); });
  return keys;
}

function calcScore(bet,result){
  if(!bet||!result) return 0;
  const bh=parseInt(bet.homeGoals),ba=parseInt(bet.awayGoals);
  const rh=parseInt(result.homeGoals),ra=parseInt(result.awayGoals);
  if(isNaN(bh)||isNaN(ba)||isNaN(rh)||isNaN(ra)) return 0;
  if(bh===rh&&ba===ra) return 3;
  const bR=bh>ba?"H":bh<ba?"A":"D", rR=rh>ra?"H":rh<ra?"A":"D";
  return bR===rR?1:0;
}

function MatchCard({home,away,betKey,bets,onBet,results,readOnly}){
  const bet=bets[betKey]||{homeGoals:"",awayGoals:""};
  const res=results&&results[betKey];
  const hasBet=bet.homeGoals!==""&&bet.awayGoals!=="";
  const pts=res&&hasBet?calcScore(bet,res):null;
  return(
    <div className={`mc ${hasBet?"mb":""} ${pts===3?"ex":pts===1?"pa":pts===0&&res?"ms":""}`}>
      <div className="tm hm"><span className="fl">{FLAGS[home]||"⚽"}</span><span className="tn">{home}</span></div>
      <div className="si">
        {readOnly
          ?<div className="rs">{hasBet?`${bet.homeGoals} × ${bet.awayGoals}`:"—"}</div>
          :<><input type="number" min="0" max="20" value={bet.homeGoals}
              onChange={e=>onBet(betKey,{...bet,homeGoals:e.target.value})} placeholder="—"/>
            <span className="vs">×</span>
            <input type="number" min="0" max="20" value={bet.awayGoals}
              onChange={e=>onBet(betKey,{...bet,awayGoals:e.target.value})} placeholder="—"/>
          </>}
      </div>
      <div className="tm aw"><span className="tn">{away}</span><span className="fl">{FLAGS[away]||"⚽"}</span></div>
      {res&&<div className="rr">Real: {res.homeGoals}×{res.awayGoals}</div>}
      {pts!==null&&<div className={`pt ${pts===3?"ptex":pts===1?"ptpa":"ptms"}`}>{pts===3?"⭐+3":pts===1?"✓+1":"✗0"}</div>}
      {!readOnly&&hasBet&&pts===null&&<div className="bb">✓</div>}
    </div>
  );
}

function KOMatchCard({matchKey,home,away,bets,onBet,results,readOnly}){
  const bet=bets[matchKey]||{homeGoals:"",awayGoals:""};
  const res=results&&results[matchKey];
  const hasBet=bet.homeGoals!==""&&bet.awayGoals!=="";
  const pts=res&&hasBet?calcScore(bet,res):null;
  const noTeams=!home&&!away;
  return(
    <div className={`mc ${hasBet&&!noTeams?"mb":""} ${pts===3?"ex":pts===1?"pa":pts===0&&res?"ms":""}`}>
      <div className="tm hm"><span className="fl">{FLAGS[home]||"⚽"}</span>
        <span className="tn">{home||<span className="ph">A definir</span>}</span></div>
      <div className="si">
        {noTeams?<div className="rs nd">—</div>
          :readOnly?<div className="rs">{hasBet?`${bet.homeGoals} × ${bet.awayGoals}`:"—"}</div>
          :<><input type="number" min="0" max="20" value={bet.homeGoals}
              onChange={e=>onBet(matchKey,{...bet,homeGoals:e.target.value})} placeholder="—"/>
            <span className="vs">×</span>
            <input type="number" min="0" max="20" value={bet.awayGoals}
              onChange={e=>onBet(matchKey,{...bet,awayGoals:e.target.value})} placeholder="—"/>
          </>}
      </div>
      <div className="tm aw"><span className="tn">{away||<span className="ph">A definir</span>}</span>
        <span className="fl">{FLAGS[away]||"⚽"}</span></div>
      {res&&<div className="rr">Real: {res.homeGoals}×{res.awayGoals}</div>}
      {pts!==null&&<div className={`pt ${pts===3?"ptex":pts===1?"ptpa":"ptms"}`}>{pts===3?"⭐+3":pts===1?"✓+1":"✗0"}</div>}
      {!readOnly&&!noTeams&&hasBet&&pts===null&&<div className="bb">✓</div>}
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState("login");
  // participante
  const [selectedName,setSelectedName]=useState("");
  const [pin,setPin]=useState("");
  const [pinErr,setPinErr]=useState(false);
  const [playerList,setPlayerList]=useState([]); // [{name,pin}]
  const [loadingList,setLoadingList]=useState(false);
  // admin
  const [adminPwd,setAdminPwd]=useState("");
  const [adminErr,setAdminErr]=useState(false);
  const [adminTab,setAdminTab]=useState("players");
  // novos participantes (admin)
  const [newName,setNewName]=useState("");
  const [newPin,setNewPin]=useState("");
  // dados
  const [tab,setTab]=useState("groups");
  const [grp,setGrp]=useState("A");
  const [bets,setBets]=useState({});
  const [saved,setSaved]=useState(false);
  const [participants,setParticipants]=useState([]);
  const [results,setResults]=useState({});
  const [fixtures,setFixtures]=useState({});
  const [auditUser,setAuditUser]=useState(null);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);

  const allKeys=getAllKeys();
  const filled=allKeys.filter(k=>{const b=bets[k];return b&&b.homeGoals!==""&&b.awayGoals!==""}).length;
  const total=allKeys.length;
  const pct=Math.round((filled/total)*100);

  // ── Firebase helpers ──
  async function fetchPlayerList(){
    setLoadingList(true);
    try{
      const snap=await getDoc(doc(db,"config","players"));
      if(snap.exists()) setPlayerList(snap.data().list||[]);
    }catch(e){}
    setLoadingList(false);
  }

  async function loadParticipants(){
    setLoading(true);
    try{
      const snap=await getDocs(collection(db,"participants"));
      const list=snap.docs.map(d=>d.data());
      list.sort((a,b)=>b.total-a.total);
      setParticipants(list);
    }catch(e){}
    setLoading(false);
  }

  async function loadResults(){
    try{
      const snap=await getDoc(doc(db,"results","main"));
      if(snap.exists()) setResults(snap.data());
    }catch(e){}
  }

  async function loadFixtures(){
    try{
      const snap=await getDoc(doc(db,"fixtures","main"));
      if(snap.exists()) setFixtures(snap.data());
    }catch(e){}
  }

  // ── Login participante ──
  async function openLogin(){
    await fetchPlayerList();
    setScreen("login");
  }

  async function enterBet(){
    if(!selectedName){ setPinErr(true); return; }
    const player=playerList.find(p=>p.name===selectedName);
    if(!player||player.pin!==pin.trim()){
      setPinErr(true); return;
    }
    setPinErr(false);
    // carregar palpites existentes
    try{
      const snap=await getDoc(doc(db,"participants",selectedName));
      if(snap.exists()) setBets(snap.data().bets||{});
    }catch(e){}
    await Promise.all([loadFixtures(),loadResults()]);
    setScreen("bet");
  }

  // ── Login admin ──
  async function adminLogin(){
    if(adminPwd===ADMIN_PWD){
      await Promise.all([loadParticipants(),loadResults(),loadFixtures(),fetchPlayerList()]);
      setScreen("admin");
      setAdminErr(false);
    } else { setAdminErr(true); }
  }

  // ── Salvar palpites ──
  async function saveBets(){
    setSaving(true);
    const score=allKeys.reduce((acc,k)=>acc+calcScore(bets[k],results[k]),0);
    const payload={name:selectedName,bets,total:score,filled,savedAt:Date.now()};
    await setDoc(doc(db,"participants",selectedName),payload);
    setSaving(false);
    setSaved(true);
  }

  // ── Admin: gerenciar participantes ──
  async function addPlayer(){
    if(!newName.trim()||!newPin.trim()) return;
    const updated=[...playerList,{name:newName.trim(),pin:newPin.trim()}];
    await setDoc(doc(db,"config","players"),{list:updated});
    setPlayerList(updated);
    setNewName(""); setNewPin("");
  }

  async function removePlayer(name){
    const updated=playerList.filter(p=>p.name!==name);
    await setDoc(doc(db,"config","players"),{list:updated});
    setPlayerList(updated);
  }

  // ── Admin: resultados ──
  async function saveResults(){
    setSaving(true);
    try{
      await setDoc(doc(db,"results","main"),results);
      const snap=await getDocs(collection(db,"participants"));
      for(const d of snap.docs){
        const p=d.data();
        p.total=allKeys.reduce((acc,k)=>acc+calcScore(p.bets[k],results[k]),0);
        await setDoc(doc(db,"participants",p.name),p);
      }
      await loadParticipants();
    }catch(e){}
    setSaving(false);
  }

  // ── Admin: confrontos ──
  async function saveFixtures(){
    setSaving(true);
    try{
      await setDoc(doc(db,"fixtures","main"),fixtures);
      alert("Confrontos salvos!");
    }catch(e){}
    setSaving(false);
  }

  const TABS=[
    {id:"groups",label:"Grupos",icon:"⚽"},
    {id:"r32",label:"Rd.32",icon:"⚔️"},
    {id:"r16",label:"Oitavas",icon:"🔥"},
    {id:"qf",label:"Quartas",icon:"💥"},
    {id:"sf",label:"Semi",icon:"🌟"},
    {id:"tp",label:"3º Lugar",icon:"🥉"},
    {id:"final",label:"Final",icon:"🏆"},
  ];

  const ADMIN_TABS=[
    {id:"players",label:"Participantes",icon:"👥"},
    {id:"ranking",label:"Ranking",icon:"🏅"},
    {id:"fixtures",label:"Confrontos",icon:"🗓️"},
    {id:"results",label:"Resultados",icon:"✏️"},
  ];

  // ── TELA INICIAL ──
  if(screen==="home"||screen==="login"&&playerList.length===0&&!loadingList) return(
    <div className="land">
      <div className="li">
        <div className="ta">🏆</div>
        <h1>BOLÃO CYBER<br/><span>Copa 2026</span></h1>
        <div className="pills"><span>48 seleções</span><span>12 grupos A–L</span><span>104 jogos</span></div>
        <p>EUA · Canadá · México — 11 jun a 19 jul 2026</p>
        <button className="nb" onClick={openLogin}>Entrar nos palpites →</button>
        <button className="abl" onClick={()=>setScreen("adminlogin")}>🔐 Área do Organizador</button>
      </div>
      <style>{css}</style>
    </div>
  );

  // ── LOGIN PARTICIPANTE ──
  if(screen==="login") return(
    <div className="land">
      <div className="li">
        <div className="ta">🏆</div>
        <h1>BOLÃO CYBER<br/><span>Copa 2026</span></h1>
        <p>Selecione seu nome e digite seu PIN</p>
        {loadingList
          ?<p className="ap">Carregando lista...</p>
          :playerList.length===0
            ?<div className="infobox2">⏳ O organizador ainda não cadastrou os participantes.</div>
            :<div className="lf">
              <div className="psel">
                {playerList.map(p=>(
                  <button key={p.name}
                    className={`popt ${selectedName===p.name?"psel-ac":""}`}
                    onClick={()=>{setSelectedName(p.name);setPin("");setPinErr(false);}}>
                    {p.name}
                  </button>
                ))}
              </div>
              {selectedName&&(
                <div className="pine">
                  <div className="pinl">PIN de <strong>{selectedName}</strong></div>
                  <div className="pinrow">
                    {[0,1,2,3].map(i=>(
                      <input key={i} id={`pin${i}`} type="password" inputMode="numeric"
                        maxLength={1} value={pin[i]||""}
                        className={`pinbox ${pinErr?"pinerr":""}`}
                        onChange={e=>{
                          const v=e.target.value.replace(/\D/,"");
                          const arr=pin.split("");
                          arr[i]=v;
                          const next=arr.join("").slice(0,4);
                          setPin(next);
                          setPinErr(false);
                          if(v&&i<3) document.getElementById(`pin${i+1}`)?.focus();
                        }}
                        onKeyDown={e=>{
                          if(e.key==="Backspace"&&!pin[i]&&i>0)
                            document.getElementById(`pin${i-1}`)?.focus();
                        }}/>
                    ))}
                  </div>
                  {pinErr&&<p className="err">PIN incorreto. Tente novamente.</p>}
                  <button className="nb" style={{marginTop:".8rem"}}
                    onClick={enterBet} disabled={pin.length<4}>
                    Entrar →
                  </button>
                </div>
              )}
            </div>
        }
        <button className="abl" style={{marginTop:"1rem"}} onClick={()=>setScreen("adminlogin")}>🔐 Organizador</button>
      </div>
      <style>{css}</style>
    </div>
  );

  // ── ADMIN LOGIN ──
  if(screen==="adminlogin") return(
    <div className="land">
      <div className="li">
        <div className="ta">🔐</div>
        <h1><span>Organizador</span></h1>
        <p className="ap">Senha: <code>copa2026</code></p>
        <div className="ne">
          <input type="password" value={adminPwd} onChange={e=>setAdminPwd(e.target.value)}
            placeholder="Senha" onKeyDown={e=>e.key==="Enter"&&adminLogin()}/>
          <button onClick={adminLogin}>Entrar →</button>
        </div>
        {adminErr&&<p className="err">❌ Senha incorreta</p>}
        <button className="abl" onClick={()=>{setScreen("home");setAdminErr(false);setAdminPwd("");}}>← Voltar</button>
      </div>
      <style>{css}</style>
    </div>
  );

  // ── ADMIN ──
  if(screen==="admin") return(
    <div className="app">
      <header>
        <div className="hl"><span className="ht">🔐</span>
          <div><h1>Organizador</h1><span className="pn">{playerList.length} participantes</span></div>
        </div>
        <button className="bk" onClick={()=>setScreen("home")}>Sair</button>
      </header>
      <nav className="tabs">{ADMIN_TABS.map(x=>(
        <button key={x.id} className={`tb ${adminTab===x.id?"ac":""}`} onClick={()=>setAdminTab(x.id)}>
          <span className="ti">{x.icon}</span><span className="tl">{x.label}</span>
        </button>
      ))}</nav>
      <main>

        {/* PARTICIPANTES */}
        {adminTab==="players"&&(
          <div>
            <h2 className="st">👥 Gerenciar Participantes</h2>
            <p className="kh">Cadastre cada participante com um PIN de 4 dígitos. Cada um usa o PIN para acessar seus palpites.</p>
            <div className="padd">
              <input className="inp" value={newName} onChange={e=>setNewName(e.target.value)}
                placeholder="Nome do participante" onKeyDown={e=>e.key==="Enter"&&document.getElementById("pinInput")?.focus()}/>
              <input id="pinInput" className="inp pinw" value={newPin}
                onChange={e=>setNewPin(e.target.value.replace(/\D/,"").slice(0,4))}
                placeholder="PIN (4 dígitos)" inputMode="numeric" maxLength={4}
                onKeyDown={e=>e.key==="Enter"&&addPlayer()}/>
              <button className="addb" onClick={addPlayer}
                disabled={!newName.trim()||newPin.length<4}>+ Adicionar</button>
            </div>
            {playerList.length===0
              ?<div className="empty"><div style={{fontSize:"2rem"}}>👤</div><p>Nenhum participante ainda.</p></div>
              :<div className="plist">
                {playerList.map((p,i)=>(
                  <div key={p.name} className="prow">
                    <span className="pidx">#{i+1}</span>
                    <span className="pname">{p.name}</span>
                    <span className="ppin">PIN: {p.pin}</span>
                    <button className="rmb" onClick={()=>removePlayer(p.name)}>✕</button>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* RANKING */}
        {adminTab==="ranking"&&(
          <div>
            <h2 className="st">🏅 Ranking Geral</h2>
            <p className="kh">Clique num participante para auditar</p>
            {loading&&<p className="kh">Carregando...</p>}
            {!loading&&participants.length===0&&<div className="empty"><div style={{fontSize:"2rem"}}>👥</div><p>Nenhum palpite salvo ainda.</p></div>}
            <div className="rl">
              {participants.map((u,i)=>{
                const exact=allKeys.filter(k=>calcScore(u.bets[k],results[k])===3).length;
                const partial=allKeys.filter(k=>calcScore(u.bets[k],results[k])===1).length;
                return(
                  <div key={u.name} className="ri"
                    onClick={()=>{setAuditUser(u);setTab("groups");setScreen("audit");}}>
                    <div className="rk">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</div>
                    <div className="rinfo">
                      <div className="rn">{u.name}</div>
                      <div className="rbadges">
                        <span className="rb ex2">⭐{exact}</span>
                        <span className="rb pa2">✓{partial}</span>
                        <span className="rf">{u.filled}/{total}</span>
                      </div>
                    </div>
                    <div className="rp">{u.total}<span className="rpu">pts</span></div>
                    <div className="ra">🔍</div>
                  </div>
                );
              })}
            </div>
            {participants.length>0&&<button className="rld" onClick={loadParticipants}>🔄 Atualizar</button>}
          </div>
        )}

        {/* CONFRONTOS */}
        {adminTab==="fixtures"&&(
          <div>
            <h2 className="st">🗓️ Definir Confrontos</h2>
            <p className="kh">Defina os times de cada fase. Participantes veem os confrontos e só apostam o placar.</p>
            {KO_ROUNDS.map(round=>(
              <div key={round.id} className="fblock">
                <div className="frt">{round.icon} {round.label}</div>
                {Array.from({length:round.matches}).map((_,i)=>{
                  const fx=(fixtures[round.id]||[])[i]||{home:"",away:""};
                  return(
                    <div key={i} className="frow">
                      <span className="fnum">{i+1}</span>
                      <div className="fsel">
                        <select value={fx.home} onChange={e=>{
                          const arr=[...(fixtures[round.id]||Array(round.matches).fill({home:"",away:""}))];
                          arr[i]={...arr[i],home:e.target.value};
                          setFixtures(p=>({...p,[round.id]:arr}));
                        }}>
                          <option value="">— Casa —</option>
                          {allGroupTeams.map(t=><option key={t} value={t}>{FLAGS[t]||""} {t}</option>)}
                        </select>
                        <span className="fvs">×</span>
                        <select value={fx.away} onChange={e=>{
                          const arr=[...(fixtures[round.id]||Array(round.matches).fill({home:"",away:""}))];
                          arr[i]={...arr[i],away:e.target.value};
                          setFixtures(p=>({...p,[round.id]:arr}));
                        }}>
                          <option value="">— Visitante —</option>
                          {allGroupTeams.map(t=><option key={t} value={t}>{FLAGS[t]||""} {t}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <button className="sb" onClick={saveFixtures} disabled={saving} style={{marginTop:"1rem"}}>
              {saving?"Salvando...":"💾 Salvar Confrontos"}
            </button>
          </div>
        )}

        {/* RESULTADOS */}
        {adminTab==="results"&&(
          <div>
            <h2 className="st">✏️ Inserir Resultados</h2>
            <div className="infobox">Digite os resultados reais e clique em <strong>💾 Salvar</strong></div>
            <div className="frt" style={{marginBottom:".6rem"}}>⚽ Fase de Grupos</div>
            <div className="gs">{Object.keys(GROUPS).map(g=>(
              <button key={g} className={`gb ${grp===g?"ga":""}`} onClick={()=>setGrp(g)}>{g==="C"?"🇧🇷 C":`Grp ${g}`}</button>
            ))}</div>
            <div className="ml" style={{marginBottom:"1.2rem"}}>{generateGroupMatches(GROUPS[grp]).map((m,i)=>{
              const k=`${grp}_${i}`;
              const res=results[k]||{homeGoals:"",awayGoals:""};
              return(
                <div key={i} className="mc">
                  <div className="tm hm"><span className="fl">{FLAGS[m.home]||"⚽"}</span><span className="tn">{m.home}</span></div>
                  <div className="si">
                    <input type="number" min="0" max="20" value={res.homeGoals}
                      onChange={e=>setResults(p=>({...p,[k]:{...res,homeGoals:e.target.value}}))} placeholder="—"/>
                    <span className="vs">×</span>
                    <input type="number" min="0" max="20" value={res.awayGoals}
                      onChange={e=>setResults(p=>({...p,[k]:{...res,awayGoals:e.target.value}}))} placeholder="—"/>
                  </div>
                  <div className="tm aw"><span className="tn">{m.away}</span><span className="fl">{FLAGS[m.away]||"⚽"}</span></div>
                </div>
              );
            })}</div>
            {KO_ROUNDS.map(round=>(
              <div key={round.id} style={{marginBottom:"1rem"}}>
                <div className="frt">{round.icon} {round.label}</div>
                <div className="ml">{Array.from({length:round.matches}).map((_,i)=>{
                  const k=`${round.id}_${i}`;
                  const fx=(fixtures[round.id]||[])[i]||{home:"",away:""};
                  const res=results[k]||{homeGoals:"",awayGoals:""};
                  if(!fx.home&&!fx.away) return(
                    <div key={i} className="mc" style={{opacity:.4}}>
                      <div className="tm hm"><span className="tn">A definir</span></div>
                      <div className="si"><div className="rs nd">—</div></div>
                      <div className="tm aw"><span className="tn">A definir</span></div>
                    </div>
                  );
                  return(
                    <div key={i} className="mc">
                      <div className="tm hm"><span className="fl">{FLAGS[fx.home]||"⚽"}</span><span className="tn">{fx.home}</span></div>
                      <div className="si">
                        <input type="number" min="0" max="20" value={res.homeGoals}
                          onChange={e=>setResults(p=>({...p,[k]:{...res,homeGoals:e.target.value}}))} placeholder="—"/>
                        <span className="vs">×</span>
                        <input type="number" min="0" max="20" value={res.awayGoals}
                          onChange={e=>setResults(p=>({...p,[k]:{...res,awayGoals:e.target.value}}))} placeholder="—"/>
                      </div>
                      <div className="tm aw"><span className="tn">{fx.away}</span><span className="fl">{FLAGS[fx.away]||"⚽"}</span></div>
                    </div>
                  );
                })}</div>
              </div>
            ))}
            <button className="sb" onClick={saveResults} disabled={saving} style={{marginTop:".5rem"}}>
              {saving?"Salvando...":"💾 Salvar Resultados"}
            </button>
          </div>
        )}
      </main>
      <style>{css}</style>
    </div>
  );

  // ── AUDIT ──
  if(screen==="audit"&&auditUser){
    const u=auditUser;
    const totalPts=allKeys.reduce((a,k)=>a+calcScore(u.bets[k],results[k]),0);
    const exact=allKeys.filter(k=>calcScore(u.bets[k],results[k])===3).length;
    const partial=allKeys.filter(k=>calcScore(u.bets[k],results[k])===1).length;
    const miss=allKeys.filter(k=>{const r=results[k];return r&&calcScore(u.bets[k],r)===0;}).length;
    const cko=KO_ROUNDS.find(r=>r.id===tab);
    return(
      <div className="app">
        <header>
          <div className="hl"><span className="ht">🔍</span>
            <div><h1>{u.name}</h1><span className="pn">{u.filled}/{total} · {totalPts} pts</span></div>
          </div>
          <button className="bk" onClick={()=>setScreen("admin")}>← Ranking</button>
        </header>
        <div className="sc3">
          <div className="sc"><span className="scv ex2">{exact}</span><span className="scl">⭐ Exatos</span></div>
          <div className="sc"><span className="scv pa2">{partial}</span><span className="scl">✓ Parciais</span></div>
          <div className="sc"><span className="scv ms2">{miss}</span><span className="scl">✗ Erros</span></div>
          <div className="sc"><span className="scv gd2">{totalPts}</span><span className="scl">Total pts</span></div>
        </div>
        <nav className="tabs">{TABS.map(x=>(
          <button key={x.id} className={`tb ${tab===x.id?"ac":""}`} onClick={()=>setTab(x.id)}>
            <span className="ti">{x.icon}</span><span className="tl">{x.label}</span>
          </button>
        ))}</nav>
        <main>
          {tab==="groups"&&(
            <div>
              <div className="gs">{Object.keys(GROUPS).map(g=>(
                <button key={g} className={`gb ${grp===g?"ga":""}`} onClick={()=>setGrp(g)}>{g==="C"?"🇧🇷 C":`Grp ${g}`}</button>
              ))}</div>
              <h2 className="st">Grupo {grp}</h2>
              <div className="ml">{generateGroupMatches(GROUPS[grp]).map((m,i)=>(
                <MatchCard key={i} home={m.home} away={m.away} betKey={`${grp}_${i}`}
                  bets={u.bets} results={results} readOnly/>
              ))}</div>
            </div>
          )}
          {cko&&(
            <div>
              <h2 className="st">{cko.icon} {cko.label}</h2>
              <div className="ml">{Array.from({length:cko.matches}).map((_,i)=>{
                const k=`${cko.id}_${i}`;
                const fx=(fixtures[cko.id]||[])[i]||{home:"",away:""};
                return <KOMatchCard key={i} matchKey={k} home={fx.home} away={fx.away}
                  bets={u.bets} results={results} readOnly/>;
              })}</div>
            </div>
          )}
        </main>
        <style>{css}</style>
      </div>
    );
  }

  // ── SAVED ──
  if(saved) return(
    <div className="sub">
      <div className="si2">
        <div className="ce">🎉</div>
        <h2>Palpites salvos!</h2>
        <p><strong>{selectedName}</strong> — {filled}/{total} palpites</p>
        <p className="kh2">Pontos calculados conforme o organizador inserir os resultados.</p>
        <button onClick={()=>setSaved(false)}>Editar palpites</button>
      </div>
      <style>{css}</style>
    </div>
  );

  // ── BET ──
  const cko=KO_ROUNDS.find(r=>r.id===tab);
  return(
    <div className="app">
      <header>
        <div className="hl"><span className="ht">🏆</span>
          <div><h1>Bolão Copa 2026</h1><span className="pn">👤 {selectedName}</span></div>
        </div>
        <div className="pw">
          <div className="pl">{filled}/{total}</div>
          <div className="pb"><div className="pf" style={{width:`${pct}%`}}/></div>
          <div className="pp">{pct}%</div>
        </div>
      </header>
      <nav className="tabs">{TABS.map(x=>(
        <button key={x.id} className={`tb ${tab===x.id?"ac":""}`} onClick={()=>setTab(x.id)}>
          <span className="ti">{x.icon}</span><span className="tl">{x.label}</span>
        </button>
      ))}</nav>
      <main>
        {tab==="groups"&&(
          <div>
            <div className="gs">{Object.keys(GROUPS).map(g=>(
              <button key={g} className={`gb ${grp===g?"ga":""}`} onClick={()=>setGrp(g)}>{g==="C"?"🇧🇷 C":`Grp ${g}`}</button>
            ))}</div>
            <h2 className="st">Grupo {grp} <span className="gt">{GROUPS[grp].map(x=><span key={x}>{FLAGS[x]}</span>)}</span></h2>
            <div className="gtl">{GROUPS[grp].map(x=><span key={x} className="tc">{FLAGS[x]} {x}</span>)}</div>
            <div className="ml">{generateGroupMatches(GROUPS[grp]).map((m,i)=>(
              <MatchCard key={i} home={m.home} away={m.away} betKey={`${grp}_${i}`}
                bets={bets} onBet={(k,v)=>setBets(p=>({...p,[k]:v}))} results={results}/>
            ))}</div>
          </div>
        )}
        {cko&&(
          <div>
            <h2 className="st">{cko.icon} {cko.label}</h2>
            {!(fixtures[cko.id]||[]).some(f=>f?.home)
              ?<div className="infobox">⏳ O organizador ainda não definiu os confrontos desta fase.</div>
              :<div className="ml">{Array.from({length:cko.matches}).map((_,i)=>{
                const k=`${cko.id}_${i}`;
                const fx=(fixtures[cko.id]||[])[i]||{home:"",away:""};
                return <KOMatchCard key={i} matchKey={k} home={fx.home} away={fx.away}
                  bets={bets} onBet={(k,v)=>setBets(p=>({...p,[k]:v}))} results={results}/>;
              })}</div>
            }
          </div>
        )}
      </main>
      <footer>
        <div className="fp">{pct<100?`${total-filled} palpites restantes`:"Todos preenchidos! 🎉"}</div>
        <button className="sb" onClick={saveBets} disabled={saving}>
          {saving?"Salvando...":filled===total?"🏆 Enviar todos os palpites!":`Salvar palpites (${filled}/${total})`}
        </button>
      </footer>
      <style>{css}</style>
    </div>
  );
}

const css=`
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--g:#00c853;--gd:#ffd600;--dk:#090e0b;--cd:#101a12;--bd:#1a2e1c;--tx:#e8f5e9;--mt:#4a6a4e}
body{background:var(--dk);color:var(--tx);font-family:'Barlow',sans-serif}
.land{min-height:100vh;background:radial-gradient(ellipse at 25% 25%,#0b2a16,#040a06 55%);display:flex;align-items:center;justify-content:center}
.li{text-align:center;padding:2rem;max-width:500px;margin:0 auto;width:100%}
.ta{font-size:4rem;animation:float 3s ease-in-out infinite;display:block;margin-bottom:.8rem}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(2.5rem,10vw,5rem);line-height:.9;letter-spacing:2px;margin-bottom:.65rem}
h1 span{color:var(--gd)}
.pills{display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center;margin-bottom:.8rem}
.pills span{background:rgba(0,200,83,.1);border:1px solid rgba(0,200,83,.22);color:var(--g);padding:.2rem .55rem;border-radius:99px;font-size:.68rem;font-weight:700}
.land>div>p{color:var(--mt);margin-bottom:1rem;font-size:.88rem}
.nb{width:100%;padding:.85rem;background:linear-gradient(135deg,var(--g),#007e33);color:#000;font-weight:800;font-size:.92rem;font-family:'Barlow',sans-serif;border:none;border-radius:9px;cursor:pointer;letter-spacing:.5px;transition:opacity .2s;margin-bottom:.6rem}
.nb:hover:not(:disabled){opacity:.9}
.nb:disabled{opacity:.4;cursor:not-allowed}
.ne{display:flex;gap:.45rem;margin-bottom:.65rem}
.ne input{flex:1;padding:.8rem 1rem;background:var(--cd);border:1.5px solid var(--bd);border-radius:8px;color:var(--tx);font-size:.95rem;font-family:'Barlow',sans-serif;outline:none;transition:border-color .2s}
.ne input:focus{border-color:var(--g)}
.ne button{padding:.8rem 1.1rem;background:var(--g);color:#000;font-weight:700;font-size:.95rem;border:none;border-radius:8px;cursor:pointer;font-family:'Barlow',sans-serif;transition:opacity .2s}
.ne button:hover:not(:disabled){opacity:.87}
.ne button:disabled{opacity:.4;cursor:not-allowed}
.abl{background:none;border:1px solid var(--bd);color:var(--mt);font-family:'Barlow',sans-serif;font-size:.8rem;padding:.5rem 1.2rem;border-radius:7px;cursor:pointer;transition:all .2s}
.abl:hover{border-color:var(--g);color:var(--tx)}
.ap{color:var(--mt);font-size:.82rem;margin-bottom:.9rem}
.ap code{color:var(--g);background:rgba(0,200,83,.1);padding:1px 6px;border-radius:4px}
.err{color:#ff5252;font-size:.78rem;margin-top:.4rem;text-align:center}
.infobox2{background:rgba(255,214,0,.07);border:1px solid rgba(255,214,0,.2);border-radius:8px;padding:.6rem .85rem;font-size:.78rem;color:var(--gd);margin:.6rem 0}
/* Lista de seleção de participante */
.lf{width:100%;text-align:left}
.psel{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1rem}
.popt{background:var(--cd);border:1.5px solid var(--bd);color:var(--tx);font-family:'Barlow',sans-serif;font-size:.85rem;font-weight:600;padding:.45rem .9rem;border-radius:8px;cursor:pointer;transition:all .18s}
.popt:hover{border-color:var(--g)}
.psel-ac{background:rgba(0,200,83,.12);border-color:var(--g);color:var(--g)}
/* PIN */
.pine{background:var(--cd);border:1px solid var(--bd);border-radius:12px;padding:1rem;text-align:center}
.pinl{font-size:.8rem;color:var(--mt);margin-bottom:.7rem}
.pinl strong{color:var(--tx)}
.pinrow{display:flex;gap:.5rem;justify-content:center;margin-bottom:.2rem}
.pinbox{width:48px;height:56px;background:#0a160c;border:2px solid var(--bd);border-radius:10px;color:var(--tx);text-align:center;font-size:1.6rem;font-family:'Bebas Neue',sans-serif;outline:none;transition:border-color .15s;-moz-appearance:textfield}
.pinbox:focus{border-color:var(--g)}
.pinerr{border-color:#ff5252!important;animation:shake .3s}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
/* App layout */
.app{max-width:740px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}
header{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1.1rem;border-bottom:1px solid var(--bd);gap:1rem;flex-wrap:wrap;background:var(--cd);position:sticky;top:0;z-index:10}
.hl{display:flex;align-items:center;gap:.6rem}
.ht{font-size:1.6rem}
header h1{font-family:'Bebas Neue',sans-serif;font-size:1.35rem;color:var(--gd);letter-spacing:1px;line-height:1}
.pn{font-size:.7rem;color:var(--mt)}
.pw{text-align:right}
.pl{font-size:.68rem;color:var(--mt);margin-bottom:3px}
.pb{height:5px;background:var(--bd);border-radius:99px;overflow:hidden;min-width:90px}
.pf{height:100%;background:linear-gradient(90deg,var(--g),var(--gd));border-radius:99px;transition:width .4s ease}
.pp{font-size:.67rem;color:var(--g);margin-top:2px}
.bk{background:none;border:1px solid var(--bd);color:var(--mt);font-family:'Barlow',sans-serif;font-size:.75rem;padding:.38rem .75rem;border-radius:6px;cursor:pointer;transition:all .2s;white-space:nowrap}
.bk:hover{border-color:var(--g);color:var(--tx)}
.sc3{display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;padding:.65rem 1rem;background:var(--cd);border-bottom:1px solid var(--bd)}
.sc{display:flex;flex-direction:column;align-items:center;gap:2px}
.scv{font-family:'Bebas Neue',sans-serif;font-size:1.55rem;letter-spacing:1px}
.scl{font-size:.58rem;color:var(--mt);text-transform:uppercase;font-weight:700}
.ex2{color:#00c853}.pa2{color:#ffd600}.ms2{color:#666}.gd2{color:var(--gd)}
.tabs{display:flex;overflow-x:auto;background:var(--cd);border-bottom:1px solid var(--bd);scrollbar-width:none;position:sticky;top:65px;z-index:9}
.tabs::-webkit-scrollbar{display:none}
.tb{flex:none;display:flex;flex-direction:column;align-items:center;gap:2px;padding:.6rem .9rem;background:none;border:none;color:var(--mt);cursor:pointer;font-family:'Barlow',sans-serif;font-size:.65rem;font-weight:700;border-bottom:2.5px solid transparent;transition:all .2s;text-transform:uppercase}
.ti{font-size:.95rem}
.tb:hover{color:var(--tx)}
.tb.ac{color:var(--g);border-bottom-color:var(--g)}
main{flex:1;padding:1rem}
.kh{font-size:.78rem;color:var(--mt);margin-bottom:.6rem}
.kh2{font-size:.75rem;color:var(--mt);margin-top:.4rem}
.st{font-family:'Bebas Neue',sans-serif;font-size:1.4rem;letter-spacing:1.5px;color:var(--gd);display:flex;align-items:center;gap:.5rem;margin-bottom:.45rem}
.gt{display:flex;gap:3px;font-size:1rem}
.gtl{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.8rem}
.tc{background:rgba(255,255,255,.04);border:1px solid var(--bd);border-radius:99px;padding:.18rem .55rem;font-size:.72rem;color:var(--mt)}
.gs{display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.8rem}
.gb{padding:.28rem .65rem;border-radius:6px;background:var(--cd);border:1.5px solid var(--bd);color:var(--mt);font-family:'Barlow',sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;transition:all .15s}
.gb:hover{border-color:var(--g);color:var(--tx)}
.ga{background:var(--g);border-color:var(--g);color:#000}
.ml,.kg{display:flex;flex-direction:column;gap:.45rem}
.infobox{background:rgba(0,200,83,.07);border:1px solid rgba(0,200,83,.2);border-radius:8px;padding:.55rem .85rem;font-size:.75rem;color:var(--g);margin-bottom:.8rem}
.empty{text-align:center;padding:2rem 1rem;color:var(--mt);font-size:.85rem;line-height:1.7}
.mc{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:.55rem;background:var(--cd);border:1.5px solid var(--bd);border-radius:10px;padding:.65rem .85rem;position:relative;transition:border-color .2s;margin-bottom:10px}
.mc:hover{border-color:#253c27}
.mb{border-color:#1a3a1e;background:#0b160d}
.ex{border-color:#00c853!important;background:#061a08!important}
.pa{border-color:#ffd600!important;background:#1a1400!important}
.ms{border-color:#333!important}
.tm{display:flex;align-items:center;gap:.3rem}
.hm{justify-content:flex-end}
.fl{font-size:1.15rem;line-height:1}
.tn{font-size:.76rem;font-weight:600}
.ph{color:var(--mt);font-weight:400;font-style:italic;font-size:.72rem}
.si{display:flex;align-items:center;gap:.28rem}
.si input{width:40px;height:36px;background:#0a160c;border:1.5px solid var(--bd);border-radius:7px;color:var(--tx);text-align:center;font-size:1rem;font-weight:700;font-family:'Bebas Neue',sans-serif;outline:none;transition:border-color .15s;-moz-appearance:textfield}
.si input::-webkit-outer-spin-button,.si input::-webkit-inner-spin-button{-webkit-appearance:none}
.si input:focus{border-color:var(--g)}
.vs{font-size:.68rem;color:var(--mt);font-weight:700}
.rs{font-size:1rem;font-weight:700;font-family:'Bebas Neue',sans-serif;color:var(--tx);min-width:52px;text-align:center}
.nd{color:var(--mt)}
.bb{position:absolute;top:-5px;right:-5px;background:var(--g);color:#000;font-size:.52rem;font-weight:800;width:15px;height:15px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.rr{position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);background:var(--bd);color:var(--mt);font-size:.57rem;padding:1px 7px;border-radius:99px;white-space:nowrap;z-index:1}
.pt{position:absolute;top:-8px;right:8px;font-size:.63rem;font-weight:700;padding:1px 6px;border-radius:99px}
.ptex{background:#00c853;color:#000}
.ptpa{background:#ffd600;color:#000}
.ptms{background:#333;color:#888}
/* Admin participantes */
.padd{display:flex;gap:.4rem;margin-bottom:.8rem;flex-wrap:wrap}
.inp{flex:1;min-width:120px;padding:.6rem .8rem;background:var(--cd);border:1.5px solid var(--bd);border-radius:7px;color:var(--tx);font-family:'Barlow',sans-serif;font-size:.85rem;outline:none;transition:border-color .2s}
.inp:focus{border-color:var(--g)}
.pinw{max-width:110px;flex:none}
.addb{padding:.6rem 1rem;background:var(--g);color:#000;font-weight:700;font-size:.82rem;border:none;border-radius:7px;cursor:pointer;font-family:'Barlow',sans-serif;white-space:nowrap;transition:opacity .2s}
.addb:hover:not(:disabled){opacity:.88}
.addb:disabled{opacity:.35;cursor:not-allowed}
.plist{display:flex;flex-direction:column;gap:.4rem}
.prow{display:flex;align-items:center;gap:.6rem;background:var(--cd);border:1px solid var(--bd);border-radius:8px;padding:.55rem .8rem}
.pidx{font-size:.7rem;color:var(--mt);width:22px;flex-shrink:0}
.pname{flex:1;font-weight:700;font-size:.87rem}
.ppin{font-size:.72rem;color:var(--mt)}
.rmb{background:none;border:1px solid #3a1a1a;color:#ff5252;font-size:.75rem;padding:.2rem .5rem;border-radius:5px;cursor:pointer;transition:all .2s;flex-shrink:0}
.rmb:hover{background:#3a1a1a}
/* Ranking */
.rl{display:flex;flex-direction:column;gap:.45rem;margin-bottom:.8rem}
.ri{display:flex;align-items:center;gap:.7rem;background:var(--cd);border:1.5px solid var(--bd);border-radius:10px;padding:.7rem .9rem;cursor:pointer;transition:all .2s}
.ri:hover{border-color:var(--g);transform:translateX(2px)}
.rk{font-family:'Bebas Neue',sans-serif;font-size:1.15rem;color:var(--gd);width:28px;text-align:center;flex-shrink:0}
.rinfo{flex:1;min-width:0}
.rn{font-weight:700;font-size:.88rem;margin-bottom:3px}
.rbadges{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}
.rb{font-size:.67rem;font-weight:700;padding:.1rem .4rem;border-radius:99px}
.rb.ex2{background:rgba(0,200,83,.12);color:#00c853}
.rb.pa2{background:rgba(255,214,0,.1);color:#ffd600}
.rf{font-size:.67rem;color:var(--mt)}
.rp{font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--g);letter-spacing:1px;flex-shrink:0}
.rpu{font-size:.6rem;color:var(--mt);font-family:'Barlow',sans-serif;margin-left:2px}
.ra{color:var(--mt);font-size:.9rem;flex-shrink:0}
.rld{background:none;border:1px solid var(--bd);color:var(--mt);font-family:'Barlow',sans-serif;font-size:.78rem;padding:.45rem 1rem;border-radius:7px;cursor:pointer;transition:all .2s}
.rld:hover{border-color:var(--g);color:var(--tx)}
/* Confrontos */
.fblock{background:var(--cd);border:1px solid var(--bd);border-radius:10px;padding:.8rem;margin-bottom:.8rem}
.frt{font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:1px;color:var(--gd);margin-bottom:.6rem}
.frow{display:flex;align-items:center;gap:.5rem;margin-bottom:.45rem}
.fnum{font-size:.7rem;color:var(--mt);font-weight:700;width:16px;text-align:center;flex-shrink:0}
.fsel{display:flex;align-items:center;gap:.35rem;flex:1;min-width:0}
.fsel select{flex:1;min-width:0;background:#0a160c;border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-family:'Barlow',sans-serif;font-size:.73rem;padding:.3rem .4rem;outline:none;transition:border-color .15s}
.fsel select:focus{border-color:var(--g)}
.fvs{font-size:.68rem;color:var(--mt);font-weight:700;flex-shrink:0}
footer{padding:.8rem 1rem;border-top:1px solid var(--bd);background:var(--cd);position:sticky;bottom:0;z-index:10}
.fp{font-size:.7rem;color:var(--mt);text-align:center;margin-bottom:.45rem}
.sb{width:100%;padding:.85rem;background:linear-gradient(135deg,var(--g),#007e33);color:#000;font-weight:800;font-size:.92rem;font-family:'Barlow',sans-serif;border:none;border-radius:9px;cursor:pointer;letter-spacing:.5px;transition:opacity .2s}
.sb:hover:not(:disabled){opacity:.9}
.sb:disabled{opacity:.5;cursor:not-allowed}
.sub{min-height:100vh;background:var(--dk);display:flex;align-items:center;justify-content:center}
.si2{text-align:center;padding:2rem;max-width:400px}
.ce{font-size:3.2rem;margin-bottom:.7rem;animation:float 2s ease-in-out infinite}
.si2 h2{font-family:'Bebas Neue',sans-serif;font-size:2.6rem;color:var(--gd);letter-spacing:2px}
.si2 p{color:var(--mt);font-size:.88rem;margin:.4rem 0}
.si2 button{margin-top:1.2rem;padding:.7rem 1.6rem;background:var(--cd);border:1.5px solid var(--bd);color:var(--tx);font-family:'Barlow',sans-serif;font-weight:600;border-radius:8px;cursor:pointer;font-size:.88rem;transition:border-color .2s}
.si2 button:hover{border-color:var(--g)}
`;
