import React, { useEffect, useState } from "react";

const COLORS = {
  navy: "#0B1E36",
  orange: "#FF6A00",
  red: "#D81F1F",
  cream: "#FFF6EA",
  ink: "#111827",
  gray: "#6b7280",
  line: "#e5e7eb",
};

const Container = ({ children }) => (
  <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 20px" }}>{children}</div>
);
const Section = ({ id, children, style }) => (
  <section id={id} style={{ padding: "56px 0", ...style }}><Container>{children}</Container></section>
);
const Button = ({ children, onClick, style, type, disabled }) => (
  <button type={type||"button"} onClick={onClick} disabled={disabled} style={{
    padding: "10px 14px", borderRadius: 14, border: `1px solid ${COLORS.line}`,
    background: disabled ? "#c7cdd7" : `linear-gradient(90deg, ${COLORS.red}, ${COLORS.orange})`, color: "white",
    cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, letterSpacing: .2, boxShadow: "0 2px 8px rgba(0,0,0,.08)",
    ...style
  }}>{children}</button>
);
const Input = (props) => (
  <input {...props} style={{ height: 44, borderRadius: 12, border: `1px solid ${COLORS.line}`, padding: "0 12px", width: "100%", opacity: props.disabled? .6:1, ...(props.style||{}) }} />
);
const Textarea = (props) => (
  <textarea {...props} style={{ borderRadius: 12, border: `1px solid ${COLORS.line}`, padding: 12, width: "100%", opacity: props.disabled? .6:1, ...(props.style||{}) }} />
);
const Card = ({ children, style }) => (
  <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 18, overflow: "hidden", background: "#fff", ...style }}>{children}</div>
);
const CardBody = ({ children, style }) => (
  <div style={{ padding: 16, ...(style||{}) }}>{children}</div>
);

export default function App() {
  // Admin via env var
  const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || "change-me-please";
  const [isAdmin, setIsAdmin] = useState(false);
  const [askPass, setAskPass] = useState(false);
  const [pass, setPass] = useState("");
  useEffect(()=>{ const ok = sessionStorage.getItem("flabi_admin")==="1"; if(ok) setIsAdmin(true); },[]);
  function tryLogin(){ if(pass === ADMIN_PASS){ setIsAdmin(true); sessionStorage.setItem("flabi_admin","1"); setAskPass(false);} }
  function logout(){ setIsAdmin(false); sessionStorage.removeItem("flabi_admin"); }

  // Content
  const [blogs, setBlogs] = useState([]);
  const [newEntry, setNewEntry] = useState({ title: "", text: "", image: "" });

  // Map & km
  const [lat, setLat] = useState("47.3769");
  const [lng, setLng] = useState("8.5417");
  const [km, setKm] = useState(0);

  // Donations
  const [pledges, setPledges] = useState([]);
  const [fixeds, setFixeds] = useState([]);
  const totalPerKm = pledges.reduce((s,p)=> s + (Number(p.amount)||0), 0);
  const totalFixed = fixeds.reduce((s,p)=> s + (Number(p.amount)||0), 0);
  const projected = (Number(km)||0) * totalPerKm + totalFixed;

  const [newPledge, setNewPledge] = useState({ name: "", amount: "" });
  const [newFixed, setNewFixed] = useState({ name: "", amount: "" });

  function addBlog() {
    if (!isAdmin) return;
    if (!newEntry.title || !newEntry.text) return;
    setBlogs([{ ...newEntry, id: Date.now(), date: new Date().toISOString() }, ...blogs]);
    setNewEntry({ title: "", text: "", image: "" });
  }
  function addPledge() {
    if (!newPledge.name || !newPledge.amount) return;
    setPledges([...pledges, { ...newPledge, id: Date.now() }]);
    setNewPledge({ name: "", amount: "" });
  }
  function addFixed() {
    if (!newFixed.name || !newFixed.amount) return;
    setFixeds([...fixeds, { ...newFixed, id: Date.now() }]);
    setNewFixed({ name: "", amount: "" });
  }

  const CAR_IMG = "/car.jpg"; // put your car image into /public/car.jpg
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&z=6&output=embed`;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", color: COLORS.ink }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "saturate(180%) blur(6px)", background: "rgba(255,255,255,0.8)", borderBottom: `1px solid ${COLORS.line}` }}>
        <Container>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            <a href="#home" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{ width: 22, height: 22, borderRadius: 4, background: `linear-gradient(90deg, ${COLORS.red}, ${COLORS.orange})` }} />
              <span style={{ fontWeight: 800, letterSpacing: .5 }}>Flabi on tour</span>
            </a>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <a href="#blog" style={{ color: COLORS.gray, textDecoration: "none" }}>Blog</a>
              <a href="#map" style={{ color: COLORS.gray, textDecoration: "none" }}>Karte</a>
              <a href="#donate" style={{ color: COLORS.gray, textDecoration: "none" }}>Spenden</a>
              {!isAdmin ? (
                <Button style={{ background:"#111827" }} onClick={()=>setAskPass(true)}>Admin Login</Button>
              ) : (
                <Button style={{ background:"#111827" }} onClick={logout}>Logout</Button>
              )}
            </div>
          </div>
        </Container>
      </div>

      {askPass && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"grid", placeItems:"center", zIndex:60 }}>
          <div style={{ background:"white", padding:20, borderRadius:12, width:340 }}>
            <h3 style={{ marginTop:0 }}>Admin Login</h3>
            <p style={{ color:COLORS.gray, fontSize:14 }}>Passwort eingeben, um Blog & Koordinaten zu bearbeiten.</p>
            <Input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Passwort" />
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <Button onClick={tryLogin}>Einloggen</Button>
              <Button style={{ background:"#fff", color:COLORS.ink }} onClick={()=>setAskPass(false)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}

      <Section id="home" style={{ paddingTop: 28 }}>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.gray, letterSpacing: 1 }}>CARBAGE RUN 2025</div>
              <h1 style={{ fontSize: 44, margin: "6px 0 8px", color: COLORS.navy }}>Flabi on tour</h1>
              <p style={{ color: COLORS.gray, maxWidth: 560 }}>
                Wir sammeln Spenden zugunsten der <b>Paraplegie Schweiz</b>, damit Menschen nach einem Autounfall mit paraplegischen Folgen den Weg zurück in den Alltag finden.
                Verfolge unsere Etappen, Live-Position und unterstütze pro Kilometer oder mit einem festen Beitrag.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Button onClick={()=>document.getElementById("donate").scrollIntoView({behavior:'smooth'})}>Jetzt spenden</Button>
                <Button onClick={()=>document.getElementById("map").scrollIntoView({behavior:'smooth'})} style={{ background: "#fff", color: COLORS.ink }}>Karte ansehen</Button>
              </div>
            </div>
            <div style={{ background: COLORS.cream }}>
              <img src={CAR_IMG} alt="Car" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>
        </Card>
      </Section>

      <Section id="blog">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 26, margin: 0 }}>Rally Blog</h2>
          <Button onClick={addBlog} disabled={!isAdmin}>＋ Eintrag hinzufügen</Button>
        </div>

        <Card>
          <CardBody>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Titel</div>
                <Input value={newEntry.title} onChange={(e)=>setNewEntry({ ...newEntry, title: e.target.value })} placeholder="Tag 1: Start in …" disabled={!isAdmin} />
              </div>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Bild-URL (optional)</div>
                <Input value={newEntry.image} onChange={(e)=>setNewEntry({ ...newEntry, image: e.target.value })} placeholder="https://…" disabled={!isAdmin} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 6 }}>Text</div>
              <Textarea rows={4} value={newEntry.text} onChange={(e)=>setNewEntry({ ...newEntry, text: e.target.value })} placeholder="Kurzer Bericht der Etappe…" disabled={!isAdmin} />
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <Button onClick={addBlog} disabled={!isAdmin}>Eintrag speichern</Button>
              <Button style={{ background: "white", color: COLORS.ink }} onClick={()=>setNewEntry({ title: "", text: "", image: "" })} disabled={!isAdmin}>Zurücksetzen</Button>
            </div>
          </CardBody>
        </Card>

        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          {blogs.map((post) => (
            <Card key={post.id}>
              {post.image && <img src={post.image} alt={post.title} style={{ width: "100%", height: 300, objectFit: "cover" }} />}
              <CardBody>
                <h3 style={{ margin: 0 }}>{post.title}</h3>
                <p style={{ color: COLORS.gray, marginTop: 8 }}>{post.text}</p>
                {post.date && <p style={{ color: COLORS.gray, fontSize: 12, marginTop: 8 }}>{new Date(post.date).toLocaleString()}</p>}
              </CardBody>
            </Card>
          ))}
          {blogs.length === 0 && <p style={{ color: COLORS.gray }}>Noch keine Einträge. Fangt mit einem Update an!</p>}
        </div>
      </Section>

      <Section id="map">
        <h2 style={{ fontSize: 26, marginBottom: 16 }}>Unsere Route & aktuelle Position</h2>
        <Card>
          <iframe title="google-map" src={mapSrc} width="100%" height="420" style={{ border: 0 }} loading="lazy" allowFullScreen />
        </Card>
        <Card style={{ marginTop: 12 }}>
          <CardBody>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, alignItems: "end" }}>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Lat</div>
                <Input value={lat} onChange={(e)=>setLat(e.target.value)} disabled={!isAdmin} />
              </div>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Lng</div>
                <Input value={lng} onChange={(e)=>setLng(e.target.value)} disabled={!isAdmin} />
              </div>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Gefahrene km</div>
                <Input type="number" min={0} value={km} onChange={(e)=>setKm(e.target.value)} disabled={!isAdmin} />
              </div>
              <Button style={{ background: COLORS.navy }} disabled={!isAdmin}>Update speichern</Button>
            </div>
            <p style={{ color: COLORS.gray, marginTop: 10 }}>Aktuell: {parseFloat(lat).toFixed(4)}° N, {parseFloat(lng).toFixed(4)}° E</p>
          </CardBody>
        </Card>
      </Section>

      <Section id="donate">
        <h2 style={{ fontSize: 26, marginBottom: 8 }}>Spenden</h2>
        <p style={{ color: COLORS.gray, marginTop: 0, marginBottom: 16 }}>Unterstütze die <b>Paraplegie Schweiz</b> – wähle zwischen Zusage pro Kilometer oder einem festen Betrag.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <CardBody>
              <h3 style={{ marginTop: 0 }}>Zusage pro Kilometer</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>Name</div>
                  <Input placeholder="Vor- & Nachname" value={newPledge.name} onChange={(e)=>setNewPledge({...newPledge, name:e.target.value})} />
                </div>
                <div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>Betrag pro km (CHF)</div>
                  <Input type="number" step="0.1" min={0} placeholder="z. B. 0.50" value={newPledge.amount} onChange={(e)=>setNewPledge({...newPledge, amount:e.target.value})} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Button onClick={addPledge}>Zusage speichern</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 style={{ marginTop: 0 }}>Fester Betrag</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>Name</div>
                  <Input placeholder="Vor- & Nachname" value={newFixed.name} onChange={(e)=>setNewFixed({...newFixed, name:e.target.value})} />
                </div>
                <div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>Betrag (CHF)</div>
                  <Input type="number" step="1" min={0} placeholder="z. B. 50" value={newFixed.amount} onChange={(e)=>setNewFixed({...newFixed, amount:e.target.value})} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Button onClick={addFixed}>Spende vormerken</Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16 }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 12, color: COLORS.gray }}>Summe Zusagen pro km</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.navy }}>CHF {totalPerKm.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 8 }}>Prognose gesamt (km × pro-km + feste Beträge)</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>CHF {projected.toFixed(2)}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 style={{ marginTop:0 }}>Alle Zusagen</h3>
              <div style={{ display:"grid", gap:8 }}>
                {pledges.map(p => (
                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between", border:`1px solid ${COLORS.line}`, borderRadius:12, padding:10 }}>
                    <span>{p.name}</span>
                    <b>CHF {Number(p.amount).toFixed(2)} / km</b>
                  </div>
                ))}
                {fixeds.map(p => (
                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between", border:`1px solid ${COLORS.line}`, borderRadius:12, padding:10 }}>
                    <span>{p.name}</span>
                    <b>CHF {Number(p.amount).toFixed(2)} einmalig</b>
                  </div>
                ))}
                {pledges.length + fixeds.length === 0 && <p style={{ color: COLORS.gray }}>Noch keine Zusagen – sei die/der Erste!</p>}
              </div>
              <p style={{ color: COLORS.gray, fontSize: 12, marginTop: 12 }}>
                Abrechnung und Zahlungsdetails (Twint/IBAN) nach der Rally.
                Optional können wir Stripe o. Ä. integrieren, wenn ihr Live-Zahlungen wollt.
              </p>
            </CardBody>
          </Card>
        </div>
      </Section>

      <div style={{ borderTop: `1px solid ${COLORS.line}`, marginTop: 24 }}>
        <Section style={{ padding: "28px 0", textAlign: "center", color: COLORS.gray }}>
          © {new Date().getFullYear()} Flabi on tour — 🇨🇭 für Paraplegie Schweiz
        </Section>
      </div>
    </div>
  );
}
