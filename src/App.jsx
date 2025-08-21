import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* ---------- THEME ---------- */
const COLORS = {
  ink: "#111827",
  gray: "#6b7280",
  line: "#e5e7eb",
  brand: "#0B1E36",
  accent: "#FF6A00",
  alert: "#b91c1c",
};

/* ---------- SUPABASE ---------- */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ---------- PRIMITIVE UI (eckig, modern) ---------- */
const Container = ({ children }) => (
  <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 20px" }}>{children}</div>
);
const Section = ({ id, children, style }) => (
  <section id={id} style={{ padding: "56px 0", ...style }}>
    <Container>{children}</Container>
  </section>
);
// vorher: const Button = ({ children, onClick, style, type, disabled }) => (
const Button = ({ children, onClick, style, type, disabled, className }) => (
  <button
    className={className}
    type={type || "button"}
    onClick={onClick}
    disabled={disabled}
    ...
  >
    {children}
  </button>
);


/* Input/Textarea bewusst ohne Radius */
const Input = (props) => (
  <input
    {...props}
    style={{
      height: 44,
      borderRadius: 0,
      border: `1px solid ${COLORS.line}`,
      padding: "0 12px",
      width: "100%",
      opacity: props.disabled ? 0.6 : 1,
      ...(props.style || {}),
    }}
  />
);
const Textarea = (props) => (
  <textarea
    {...props}
    style={{
      borderRadius: 0,
      border: `1px solid ${COLORS.line}`,
      padding: 12,
      width: "100%",
      opacity: props.disabled ? 0.6 : 1,
      ...(props.style || {}),
    }}
  />
);

/* ---------- UTILS ---------- */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const storagePathFromPublicUrl = (url) => {
  const marker = "/storage/v1/object/public/flabi/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
};

/* ---------- APP ---------- */
export default function App() {
  /* Inject global CSS (Fonts + Responsive + moderne Optik) */
  const global = `
    :root { --ink:${COLORS.ink}; --gray:${COLORS.gray}; --line:${COLORS.line}; --brand:${COLORS.brand}; }
    * { box-sizing: border-box; }
    html,body,#root { margin:0; min-height:100%; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: var(--ink); }
    h1,h2,h3 { margin:0; font-weight:800; letter-spacing:-.01em; }
    p { margin:0; }
    img { display:block; max-width:100%; }
    /* Header Brand – puristisch/dynamisch */
    .brand { font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
    .brand .muted { color: var(--gray); font-weight:700; }
    /* Navbar Ghost-Button (Admin) */
    .btn-ghost { background:transparent !important; color:var(--gray) !important; border:1px solid var(--line); height:32px !important; }
    .btn-ghost:hover { color:var(--ink) !important; }
    /* Hero Layout */
    .hero { display:grid; grid-template-columns: 1.2fr 1fr; gap:0; }
    .hero-media { display:grid; place-items:center; background:#f3f4f6; min-height:420px; }
    .hero-media img { max-height:100%; object-fit:contain; }
    /* Post-Karte (ohne Rundungen) */
    .post-card { border:1px solid var(--line); }
    .gallery { display:grid; grid-template-columns: 2fr 1fr; gap:12px; }
    .thumbs { display:grid; gap:8px; }
    .thumbs img { height:120px; object-fit:cover; cursor:pointer; }
    .mainimg { height:420px; object-fit:cover; }
    /* Keine weißen Ränder um Bilder */
    .gallery, .thumbs, .mainimg { background:#0000; }
    /* Map */
    .mapframe { width:100%; height:420px; border:0; }
    /* Mobile */
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; }
      .hero-media { min-height: 280px; }
      .gallery { grid-template-columns: 1fr; }
      .thumbs { display:flex; gap:8px; overflow-x:auto; padding-bottom:6px; }
      .thumbs img { width:46vw; height:28vw; min-width:180px; }
      .mainimg { height:58vw; }
      .mapframe { height:300px; }
      .admin-right { display:none; }
    }
  `;

  /* Admin-Auth */
  const [isAdmin, setIsAdmin] = useState(false);
  const [askPass, setAskPass] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) =>
      setIsAdmin(Boolean(session))
    );
    supabase.auth.getSession().then(({ data }) => setIsAdmin(Boolean(data.session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function tryLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPass,
    });
    if (error) alert("Login fehlgeschlagen: " + error.message);
    else { setAskPass(false); setAdminPass(""); }
  }
  async function logout() { await supabase.auth.signOut(); }

  /* Data */
  const [blogs, setBlogs] = useState([]);
  const [newEntry, setNewEntry] = useState({ title: "", text: "", images: [] });
  const [uploading, setUploading] = useState(false);

  const [lat, setLat] = useState("47.3769");
  const [lng, setLng] = useState("8.5417");
  const [km, setKm] = useState(0);
  const [pledges, setPledges] = useState([]);
  const [fixeds, setFixeds] = useState([]);

  const totalPerKm = pledges.reduce((s, p) => s + Number(p.amount_per_km || 0), 0);
  const totalFixed = fixeds.reduce((s, p) => s + Number(p.amount || 0), 0);
  const projected = (Number(km) || 0) * totalPerKm + totalFixed;

  async function loadAll() {
    const [a, b, c, d] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }),
      supabase.from("pledges_per_km").select("*").order("created_at", { ascending: false }),
      supabase.from("donations_fixed").select("*").order("created_at", { ascending: false }),
      supabase.from("status").select("*").eq("id", 1).maybeSingle(),
    ]);
    setBlogs(a.data || []);
    setPledges(b.data || []);
    setFixeds(c.data || []);
    const st = d.data; if (st) { setLat(String(st.lat ?? "")); setLng(String(st.lng ?? "")); setKm(Number(st.km || 0)); }
  }
  useEffect(() => { loadAll(); }, []);

  /* Upload */
  async function uploadImages(files) {
    const urls = [];
    for (const file of files) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `posts/${uid()}.${ext}`;
      const { error } = await supabase.storage.from("flabi").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) { alert("Upload fehlgeschlagen: " + error.message); continue; }
      const { data } = supabase.storage.from("flabi").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  /* Actions */
  async function addBlog() {
    if (!isAdmin) return alert("Nur Admin darf Blogeinträge erstellen.");
    if (!newEntry.title || !newEntry.text) return;
    const { error } = await supabase.from("posts").insert({
      title: newEntry.title, text: newEntry.text, images: newEntry.images,
    });
    if (error) return alert(error.message);
    setNewEntry({ title: "", text: "", images: [] });
    loadAll();
  }

  async function updateStatus() {
    if (!isAdmin) return;
    const { error } = await supabase.from("status").update({
      lat: parseFloat(lat), lng: parseFloat(lng), km: Number(km), updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return alert(error.message);
    loadAll();
  }

  async function addPledge() {
    const name = (document.getElementById("pledge-name") || {}).value;
    const amount = Number((document.getElementById("pledge-amount") || {}).value);
    if (!name || !amount) return;
    const { error } = await supabase.from("pledges_per_km").insert({ name, amount_per_km: amount });
    if (error) return alert(error.message);
    (document.getElementById("pledge-name") || {}).value = "";
    (document.getElementById("pledge-amount") || {}).value = "";
    loadAll();
  }
  async function addFixed() {
    const name = (document.getElementById("fixed-name") || {}).value;
    const amount = Number((document.getElementById("fixed-amount") || {}).value);
    if (!name || !amount) return;
    const { error } = await supabase.from("donations_fixed").insert({ name, amount });
    if (error) return alert(error.message);
    (document.getElementById("fixed-name") || {}).value = "";
    (document.getElementById("fixed-amount") || {}).value = "";
    loadAll();
  }

  /* Edit/Delete */
  const [editingId, setEditingId] = useState(null);
  const editingPost = useMemo(() => blogs.find((b) => b.id === editingId), [editingId, blogs]);
  const [editEntry, setEditEntry] = useState({ title: "", text: "", images: [] });
  useEffect(() => {
    if (editingPost)
      setEditEntry({
        title: editingPost.title || "",
        text: editingPost.text || "",
        images: Array.isArray(editingPost.images) ? editingPost.images : [],
      });
  }, [editingPost]);

  async function saveEdit() {
    if (!isAdmin || !editingId) return;
    const { error } = await supabase.from("posts")
      .update({ title: editEntry.title, text: editEntry.text, images: editEntry.images })
      .eq("id", editingId);
    if (error) return alert(error.message);
    setEditingId(null); setEditEntry({ title: "", text: "", images: [] }); loadAll();
  }

  async function addEditImages(files) {
    setUploading(true);
    const urls = await uploadImages(files);
    setEditEntry((s) => ({ ...s, images: [...s.images, ...urls] }));
    setUploading(false);
  }

  async function deletePost(post) {
    if (!isAdmin) return;
    if (!confirm("Diesen Post wirklich löschen?")) return;
    const paths = (post.images || []).map(storagePathFromPublicUrl).filter(Boolean);
    if (paths.length) { try { await supabase.storage.from("flabi").remove(paths); } catch {} }
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return alert(error.message);
    loadAll();
  }

  /* Assets */
  const CAR_IMG = "/car.jpg";
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&z=6&output=embed`;

  return (
    <div style={{ background: "#f6f7fb", minHeight: "100vh" }}>
      {/* global styles + font */}
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <style>{global}</style>

      {/* NAVBAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.9)", borderBottom: `1px solid ${COLORS.line}`, backdropFilter: "saturate(180%) blur(6px)" }}>
        <Container>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            <a href="#home" style={{ textDecoration: "none", color: COLORS.ink }}>
              <span className="brand">FLABI <span className="muted">ON&nbsp;TOUR</span></span>
            </a>
            <div className="admin-right" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <a href="#blog" style={{ color: COLORS.gray, textDecoration: "none" }}>Blog</a>
              <a href="#map" style={{ color: COLORS.gray, textDecoration: "none" }}>Karte</a>
              <a href="#donate" style={{ color: COLORS.gray, textDecoration: "none" }}>Spenden</a>
              {!isAdmin ? (
                <Button style={{ borderColor: COLORS.line }} className="btn-ghost" onClick={() => setAskPass(true)}>Admin</Button>
              ) : (
                <Button className="btn-ghost" onClick={logout}>Logout</Button>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* LOGIN MODAL */}
      {askPass && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 60 }}>
          <div style={{ background: "white", padding: 20, width: 360 }}>
            <h3 style={{ marginTop: 0 }}>Admin Login</h3>
            <p style={{ color: COLORS.gray, fontSize: 14 }}>Mit Supabase-Login (E-Mail & Passwort).</p>
            <div style={{ display: "grid", gap: 8 }}>
              <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="E-Mail" />
              <Input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} placeholder="Passwort" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button onClick={tryLogin}>Einloggen</Button>
              <Button style={{ background: "#fff", color: COLORS.ink }} onClick={() => setAskPass(false)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <Section id="home" style={{ paddingTop: 28 }}>
        <div className="hero" style={{ border: `1px solid ${COLORS.line}`, background: "#fff" }}>
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 12, color: COLORS.gray, letterSpacing: 1 }}>CARBAGE RUN 2025</div>
            <h1 style={{ fontSize: 44, margin: "8px 0 10px", color: COLORS.brand }}>Flabi on tour</h1>
            <p style={{ color: COLORS.gray, maxWidth: 560 }}>
              Wir sammeln Spenden zugunsten der <b>Paraplegie Schweiz</b>, damit Menschen nach einem Autounfall mit
              paraplegischen Folgen den Weg zurück in den Alltag finden. Verfolge unsere Etappen, Live-Position und
              unterstütze pro Kilometer oder mit einem festen Beitrag.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Button onClick={() => document.getElementById("donate").scrollIntoView({ behavior: "smooth" })}>Jetzt spenden</Button>
              <Button onClick={() => document.getElementById("map").scrollIntoView({ behavior: "smooth" })} style={{ background: "#fff", color: COLORS.ink }}>
                Karte ansehen
              </Button>
            </div>
          </div>
          <div className="hero-media">
            <img src={CAR_IMG} alt="Car" />
          </div>
        </div>
      </Section>

      {/* BLOG – Editor nur für Admin sichtbar */}
      <Section id="blog">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 26, margin: 0 }}>Rally Blog</h2>
          {isAdmin && (
            <Button onClick={addBlog} disabled={!isAdmin || uploading}>＋ Eintrag speichern</Button>
          )}
        </div>

        {isAdmin && (
          <div style={{ border: `1px solid ${COLORS.line}`, background: "#fff", padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Titel</div>
                <Input value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} placeholder="Tag 1: Start in …" />
              </div>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Bilder</div>
                <input
                  type="file" accept="image/*" multiple disabled={uploading}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    setUploading(true);
                    const urls = await uploadImages(files);
                    setNewEntry((s) => ({ ...s, images: [...(s.images || []), ...urls] }));
                    setUploading(false);
                  }}
                />
                {uploading && <div style={{ color: COLORS.gray, fontSize: 12, marginTop: 6 }}>Lade hoch…</div>}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 6 }}>Text</div>
              <Textarea rows={4} value={newEntry.text} onChange={(e) => setNewEntry({ ...newEntry, text: e.target.value })} placeholder="Kurzer Bericht der Etappe…" />
            </div>
          </div>
        )}

        {/* Posts */}
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          {blogs.map((post) => (
            <div key={post.id} className="post-card" style={{ background: "#fff" }}>
              {/* Galerie ohne weiße Ränder */}
              {Array.isArray(post.images) && post.images.length > 0 && (
                <div className="gallery" style={{ padding: 12 }}>
                  <img
                    src={post.images[0]}
                    alt="main"
                    className="mainimg"
                    onClick={() => openLightbox(post.images, 0)}
                  />
                  <div className="thumbs">
                    {post.images.slice(1).map((u, idx) => (
                      <img key={idx} src={u} alt={`img-${idx + 1}`} onClick={() => openLightbox(post.images, idx + 1)} />
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding: 16, borderTop: `1px solid ${COLORS.line}` }}>
                {editingId === post.id ? (
                  <div>
                    <Input value={editEntry.title} onChange={(e) => setEditEntry((s) => ({ ...s, title: e.target.value }))} />
                    <Textarea rows={4} style={{ marginTop: 8 }} value={editEntry.text} onChange={(e) => setEditEntry((s) => ({ ...s, text: e.target.value }))} />
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>Weitere Bilder hinzufügen</div>
                      <input type="file" accept="image/*" multiple disabled={uploading} onChange={async (e) => { const files = Array.from(e.target.files || []); if (!files.length) return; setUploading(true); const urls = await uploadImages(files); setEditEntry((s) => ({ ...s, images: [...s.images, ...urls] })); setUploading(false); }} />
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {(editEntry.images || []).map((u, i) => (
                          <div key={i} style={{ position: "relative" }}>
                            <img src={u} alt="thumb" style={{ width: 90, height: 70, objectFit: "cover", border: `1px solid ${COLORS.line}` }} />
                            <button onClick={() => setEditEntry((s) => ({ ...s, images: s.images.filter((_, x) => x !== i) }))} style={{ position: "absolute", top: -6, right: -6, background: "#000", color: "#fff", border: "none", width: 20, height: 20, cursor: "pointer" }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <Button onClick={saveEdit}>Speichern</Button>
                      <Button style={{ background: "#fff", color: COLORS.ink }} onClick={() => setEditingId(null)}>Abbrechen</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 style={{ margin: 0 }}>{post.title}</h3>
                    <p style={{ color: COLORS.gray, marginTop: 8 }}>{post.text}</p>
                    {post.created_at && <p style={{ color: COLORS.gray, fontSize: 12, marginTop: 8 }}>{new Date(post.created_at).toLocaleString()}</p>}
                    {isAdmin && (
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <Button className="btn-ghost" onClick={() => setEditingId(post.id)} style={{ color: COLORS.ink, background: "#fff" }}>Bearbeiten</Button>
                        <Button className="btn-ghost" onClick={() => deletePost(post)} style={{ color: COLORS.alert, background: "#fff" }}>Löschen</Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {blogs.length === 0 && <p style={{ color: COLORS.gray }}>Noch keine Einträge. Fangt mit einem Update an!</p>}
        </div>
      </Section>

      {/* MAP */}
      <Section id="map">
        <h2 style={{ fontSize: 26, marginBottom: 16 }}>Unsere Route & aktuelle Position</h2>
        <div style={{ border: `1px solid ${COLORS.line}`, background: "#fff" }}>
          <iframe title="google-map" src={mapSrc} className="mapframe" loading="lazy" allowFullScreen />
        </div>
        {isAdmin && (
          <div style={{ border: `1px solid ${COLORS.line}`, background: "#fff", marginTop: 12, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <div><div style={{ fontSize: 12, marginBottom: 6 }}>Lat</div><Input value={lat} onChange={(e) => setLat(e.target.value)} /></div>
              <div><div style={{ fontSize: 12, marginBottom: 6 }}>Lng</div><Input value={lng} onChange={(e) => setLng(e.target.value)} /></div>
              <div><div style={{ fontSize: 12, marginBottom: 6 }}>Gefahrene km</div><Input type="number" min={0} value={km} onChange={(e) => setKm(e.target.value)} /></div>
              <Button onClick={updateStatus}>Update speichern</Button>
            </div>
            <p style={{ color: COLORS.gray, marginTop: 10 }}>Aktuell: {parseFloat(lat).toFixed(4)}° N, {parseFloat(lng).toFixed(4)}° E</p>
          </div>
        )}
      </Section>

      {/* DONATE */}
      <Section id="donate">
        <h2 style={{ fontSize: 26, marginBottom: 8 }}>Spenden</h2>
        <p style={{ color: COLORS.gray, marginTop: 0, marginBottom: 16 }}>
          Auf unserer Rally sammeln wir Spenden zugunsten der Paraplegie Schweiz, damit Menschen nach einem Autounfall mit paraplegischen Folgen den Weg zurück in den Alltag finden. Unterstütze die Paraplegie Schweiz – wähle zwischen Zusage pro Kilometer (Wir hoffen die ganzen 2500km zu schaffen) oder einem festen Betrag.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: `1px solid ${COLORS.line}`, background: "#fff", padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Zusage pro Kilometer</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><div style={{ fontSize: 12, marginBottom: 6 }}>Name</div><Input id="pledge-name" placeholder="Vor- & Nachname" /></div>
              <div><div style={{ fontSize: 12, marginBottom: 6 }}>Betrag pro km (CHF)</div><Input id="pledge-amount" type="number" step="0.1" min={0} placeholder="z. B. 0.50" /></div>
            </div>
            <div style={{ marginTop: 12 }}><Button onClick={addPledge}>Zusage speichern</Button></div>
          </div>

          <div style={{ border: `1px solid ${COLORS.line}`, background: "#fff", padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Fester Betrag</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><div style={{ fontSize: 12, marginBottom: 6 }}>Name</div><Input id="fixed-name" placeholder="Vor- & Nachname" /></div>
              <div><div style={{ fontSize: 12, marginBottom: 6 }}>Betrag (CHF)</div><Input id="fixed-amount" type="number" step="1" min={0} placeholder="z. B. 50" /></div>
            </div>
            <div style={{ marginTop: 12 }}><Button onClick={addFixed}>Spende vormerken</Button></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ border: `1px solid ${COLORS.line}`, background: "#fff", padding: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Summe Zusagen pro km</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.brand }}>CHF {totalPerKm.toFixed(2)}</div>
            <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 8 }}>Prognose gesamt (km × pro-km + feste Beträge)</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>CHF {projected.toFixed(2)}</div>
          </div>
          <div style={{ border: `1px solid ${COLORS.line}`, background: "#fff", padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Alle Zusagen</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {pledges.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", border: `1px solid ${COLORS.line}`, padding: 10 }}>
                  <span>{p.name}</span><b>CHF {Number(p.amount_per_km).toFixed(2)} / km</b>
                </div>
              ))}
              {fixeds.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", border: `1px solid ${COLORS.line}`, padding: 10 }}>
                  <span>{p.name}</span><b>CHF {Number(p.amount).toFixed(2)} einmalig</b>
                </div>
              ))}
              {pledges.length + fixeds.length === 0 && <p style={{ color: COLORS.gray }}>Noch keine Zusagen – sei die/der Erste!</p>}
            </div>
          </div>
        </div>
      </Section>

      {/* LIGHTBOX */}
      {lightbox.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <img src={lightbox.images[lightbox.index]} alt="img" style={{ maxWidth: "90vw", maxHeight: "85vh" }} />
          <button onClick={closeLightbox} style={{ position: "fixed", top: 16, right: 20, background: "#000", color: "#fff", border: "1px solid #fff", padding: "6px 10px", cursor: "pointer" }}>
            Schließen
          </button>
          {lightbox.images.length > 1 && (
            <>
              <button onClick={() => setLightbox(s => ({ ...s, index: (s.index - 1 + s.images.length) % s.images.length }))} style={{ position: "fixed", left: 20, top: "50%", transform: "translateY(-50%)", background: "#000", color: "#fff", border: "none", width: 44, height: 44, cursor: "pointer" }}>‹</button>
              <button onClick={() => setLightbox(s => ({ ...s, index: (s.index + 1) % s.images.length }))} style={{ position: "fixed", right: 20, top: "50%", transform: "translateY(-50%)", background: "#000", color: "#fff", border: "none", width: 44, height: 44, cursor: "pointer" }}>›</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
