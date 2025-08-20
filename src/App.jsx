import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* ---------- THEME ---------- */
const COLORS = {
  navy: "#0B1E36",
  orange: "#FF6A00",
  red: "#D81F1F",
  cream: "#FFF6EA",
  ink: "#111827",
  gray: "#6b7280",
  line: "#e5e7eb",
};

/* ---------- SUPABASE ---------- */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- PRIMITIVE UI ---------- */
const Container = ({ children }) => (
  <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 20px" }}>
    {children}
  </div>
);
const Section = ({ id, children, style }) => (
  <section id={id} style={{ padding: "56px 0", ...style }}>
    <Container>{children}</Container>
  </section>
);
const Button = ({ children, onClick, style, type, disabled }) => (
  <button
    type={type || "button"}
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "10px 14px",
      borderRadius: 14,
      border: `1px solid ${COLORS.line}`,
      background: disabled
        ? "#c7cdd7"
        : `linear-gradient(90deg, ${COLORS.red}, ${COLORS.orange})`,
      color: "white",
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 700,
      letterSpacing: 0.2,
      boxShadow: "0 2px 8px rgba(0,0,0,.08)",
      ...style,
    }}
  >
    {children}
  </button>
);
const Input = (props) => (
  <input
    {...props}
    style={{
      height: 44,
      borderRadius: 12,
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
      borderRadius: 12,
      border: `1px solid ${COLORS.line}`,
      padding: 12,
      width: "100%",
      opacity: props.disabled ? 0.6 : 1,
      ...(props.style || {}),
    }}
  />
);
const Card = ({ children, style }) => (
  <div
    style={{
      border: `1px solid ${COLORS.line}`,
      borderRadius: 18,
      overflow: "hidden",
      background: "#fff",
      ...style,
    }}
  >
    {children}
  </div>
);
const CardBody = ({ children, style }) => (
  <div style={{ padding: 16, ...(style || {}) }}>{children}</div>
);

/* ---------- UTILS ---------- */
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
// /storage/v1/object/public/flabi/<path> -> <path>
function storagePathFromPublicUrl(url) {
  const marker = "/storage/v1/object/public/flabi/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

/* ---------- APP ---------- */
export default function App() {
  /* Admin-Auth (Supabase) */
  const [isAdmin, setIsAdmin] = useState(false);
  const [askPass, setAskPass] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setIsAdmin(Boolean(session));
    });
    supabase.auth
      .getSession()
      .then(({ data }) => setIsAdmin(Boolean(data.session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function tryLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPass,
    });
    if (!error) {
      setAskPass(false);
      setAdminPass("");
    } else alert("Login fehlgeschlagen: " + error.message);
  }
  async function logout() {
    await supabase.auth.signOut();
  }

  /* Data-State */
  const [blogs, setBlogs] = useState([]); // posts (images: jsonb array)
  const [newEntry, setNewEntry] = useState({
    title: "",
    text: "",
    images: [],
  });
  const [uploading, setUploading] = useState(false);

  const [lat, setLat] = useState("47.3769");
  const [lng, setLng] = useState("8.5417");
  const [km, setKm] = useState(0);

  const [pledges, setPledges] = useState([]);
  const [fixeds, setFixeds] = useState([]);

  /* Derived totals */
  const totalPerKm = pledges.reduce(
    (s, p) => s + Number(p.amount_per_km || 0),
    0
  );
  const totalFixed = fixeds.reduce((s, p) => s + Number(p.amount || 0), 0);
  const projected = (Number(km) || 0) * totalPerKm + totalFixed;

  /* Load all from DB */
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
    const st = d.data;
    if (st) {
      setLat(String(st.lat ?? ""));
      setLng(String(st.lng ?? ""));
      setKm(Number(st.km || 0));
    }
  }
  useEffect(() => {
    loadAll();
  }, []);

  /* Upload to Supabase Storage (bucket 'flabi') */
  async function uploadImages(files) {
    const urls = [];
    for (const file of files) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `posts/${uid()}.${ext}`;
      const { error } = await supabase
        .storage
        .from("flabi")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        alert("Upload fehlgeschlagen: " + error.message);
        continue;
      }
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
      title: newEntry.title,
      text: newEntry.text,
      images: newEntry.images,
    });
    if (error) return alert(error.message);
    setNewEntry({ title: "", text: "", images: [] });
    loadAll();
  }

  async function updateStatus() {
    if (!isAdmin) return alert("Nur Admin darf Koordinaten/Kilometer ändern.");
    const { error } = await supabase
      .from("status")
      .update({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        km: Number(km),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) return alert(error.message);
    loadAll();
  }

  async function addPledge() {
    const name = (document.getElementById("pledge-name") || {}).value;
    const amount = Number(
      (document.getElementById("pledge-amount") || {}).value
    );
    if (!name || !amount) return;
    const { error } = await supabase
      .from("pledges_per_km")
      .insert({ name, amount_per_km: amount });
    if (error) return alert(error.message);
    (document.getElementById("pledge-name") || {}).value = "";
    (document.getElementById("pledge-amount") || {}).value = "";
    loadAll();
  }

  async function addFixed() {
    const name = (document.getElementById("fixed-name") || {}).value;
    const amount = Number(
      (document.getElementById("fixed-amount") || {}).value
    );
    if (!name || !amount) return;
    const { error } = await supabase
      .from("donations_fixed")
      .insert({ name, amount });
    if (error) return alert(error.message);
    (document.getElementById("fixed-name") || {}).value = "";
    (document.getElementById("fixed-amount") || {}).value = "";
    loadAll();
  }

  /* Edit Post */
  const [editingId, setEditingId] = useState(null);
  const editingPost = useMemo(
    () => blogs.find((b) => b.id === editingId),
    [editingId, blogs]
  );
  const [editEntry, setEditEntry] = useState({
    title: "",
    text: "",
    images: [],
  });
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
    const { error } = await supabase
      .from("posts")
      .update({
        title: editEntry.title,
        text: editEntry.text,
        images: editEntry.images,
      })
      .eq("id", editingId);
    if (error) return alert(error.message);
    setEditingId(null);
    setEditEntry({ title: "", text: "", images: [] });
    loadAll();
  }

  async function addEditImages(files) {
    setUploading(true);
    const urls = await uploadImages(files);
    setEditEntry((s) => ({ ...s, images: [...s.images, ...urls] }));
    setUploading(false);
  }

  async function deletePost(post) {
    if (!isAdmin) {
      alert("Nur Admin darf löschen.");
      return;
    }
    if (!confirm("Diesen Post wirklich löschen?")) return;

    // Bilder im Storage löschen (optional; Fehler ignorieren)
    const paths =
      (post.images || [])
        .map(storagePathFromPublicUrl)
        .filter(Boolean);

    if (paths.length) {
      try {
        await supabase.storage.from("flabi").remove(paths);
      } catch {}
    }

    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return alert(error.message);
    loadAll();
  }

  /* Lightbox */
  const [lightbox, setLightbox] = useState({
    open: false,
    images: [],
    index: 0,
  });
  function openLightbox(images, i) {
    setLightbox({ open: true, images, index: i || 0 });
  }
  function closeLightbox() {
    setLightbox({ open: false, images: [], index: 0 });
  }
  function prev() {
    setLightbox((s) => ({
      ...s,
      index: (s.index - 1 + s.images.length) % s.images.length,
    }));
  }
  function next() {
    setLightbox((s) => ({
      ...s,
      index: (s.index + 1) % s.images.length,
    }));
  }

  /* Assets */
  const CAR_IMG = "/car.jpg";
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    lat
  )},${encodeURIComponent(lng)}&z=6&output=embed`;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", color: COLORS.ink }}>
      {/* NAVBAR */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "saturate(180%) blur(6px)",
          background: "rgba(255,255,255,0.8)",
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        <Container>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 64,
            }}
          >
            <a
              href="#home"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${COLORS.red}, ${COLORS.orange})`,
                }}
              />
              <span style={{ fontWeight: 800, letterSpacing: 0.5 }}>
                Flabi on tour
              </span>
            </a>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <a href="#blog" style={{ color: COLORS.gray, textDecoration: "none" }}>
                Blog
              </a>
              <a href="#map" style={{ color: COLORS.gray, textDecoration: "none" }}>
                Karte
              </a>
              <a
                href="#donate"
                style={{ color: COLORS.gray, textDecoration: "none" }}
              >
                Spenden
              </a>
              {!isAdmin ? (
                <Button style={{ background: "#111827" }} onClick={() => setAskPass(true)}>
                  Admin Login
                </Button>
              ) : (
                <Button style={{ background: "#111827" }} onClick={logout}>
                  Logout
                </Button>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* LOGIN MODAL */}
      {askPass && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
          }}
        >
          <div style={{ background: "white", padding: 20, borderRadius: 12, width: 360 }}>
            <h3 style={{ marginTop: 0 }}>Admin Login</h3>
            <p style={{ color: COLORS.gray, fontSize: 14 }}>
              Mit Supabase-Login (E-Mail & Passwort). Benutzer im Supabase-Dashboard anlegen.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="E-Mail" />
              <Input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} placeholder="Passwort" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button onClick={tryLogin}>Einloggen</Button>
              <Button
                style={{ background: "#fff", color: COLORS.ink }}
                onClick={() => setAskPass(false)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <Section id="home" style={{ paddingTop: 28 }}>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0 }}>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.gray, letterSpacing: 1 }}>
                CARBAGE RUN 2025
              </div>
              <h1 style={{ fontSize: 44, margin: "6px 0 8px", color: COLORS.navy }}>
                Flabi on tour
              </h1>
              <p style={{ color: COLORS.gray, maxWidth: 560 }}>
                Wir sammeln Spenden zugunsten der <b>Paraplegie Schweiz</b>, damit Menschen nach
                einem Autounfall mit paraplegischen Folgen den Weg zurück in den Alltag finden.
                Verfolge unsere Etappen, Live-Position und unterstütze pro Kilometer oder mit einem
                festen Beitrag.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Button
                  onClick={() =>
                    document.getElementById("donate").scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Jetzt spenden
                </Button>
                <Button
                  onClick={() =>
                    document.getElementById("map").scrollIntoView({ behavior: "smooth" })
                  }
                  style={{ background: "#fff", color: COLORS.ink }}
                >
                  Karte ansehen
                </Button>
              </div>
            </div>
            <div style={{ background: COLORS.cream }}>
              <img
                src={CAR_IMG}
                alt="Car"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        </Card>
      </Section>

      {/* BLOG */}
      <Section id="blog">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 style={{ fontSize: 26, margin: 0 }}>Rally Blog</h2>
          <Button onClick={addBlog} disabled={!isAdmin || uploading}>
            ＋ Eintrag speichern
          </Button>
        </div>

        {/* Editor: neuer Eintrag */}
        <Card>
          <CardBody>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Titel</div>
                <Input
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  placeholder="Tag 1: Start in …"
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Bilder</div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={!isAdmin || uploading}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    setUploading(true);
                    const urls = await uploadImages(files);
                    setNewEntry((s) => ({ ...s, images: [...(s.images || []), ...urls] }));
                    setUploading(false);
                  }}
                />
                {uploading && (
                  <div style={{ color: COLORS.gray, fontSize: 12, marginTop: 6 }}>Lade hoch…</div>
                )}
                {(newEntry.images || []).length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {newEntry.images.map((u, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <img
                          src={u}
                          alt="preview"
                          style={{
                            width: 90,
                            height: 70,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: `1px solid ${COLORS.line}`,
                            display: "block",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 6 }}>Text</div>
              <Textarea
                rows={4}
                value={newEntry.text}
                onChange={(e) => setNewEntry({ ...newEntry, text: e.target.value })}
                placeholder="Kurzer Bericht der Etappe…"
                disabled={!isAdmin}
              />
            </div>
          </CardBody>
        </Card>

        {/* Liste der Posts */}
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          {blogs.map((post) => (
            <Card key={post.id}>
              {/* Galerie: großes Bild links, Thumbs rechts */}
              {Array.isArray(post.images) && post.images.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, padding: 12 }}>
                  <div>
                    <img
                      src={post.images[0]}
                      alt="main"
                      style={{
                        width: "100%",
                        height: 420,
                        objectFit: "cover",
                        borderRadius: 12,
                        display: "block",
                      }}
                      onClick={() => openLightbox(post.images, 0)}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {post.images.slice(1).map((u, idx) => (
                      <img
                        key={idx}
                        src={u}
                        alt={`img-${idx + 1}`}
                        style={{
                          width: "100%",
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 10,
                          cursor: "pointer",
                          display: "block",
                        }}
                        onClick={() => openLightbox(post.images, idx + 1)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <CardBody>
                {editingId === post.id ? (
                  <div>
                    <Input
                      value={editEntry.title}
                      onChange={(e) => setEditEntry((s) => ({ ...s, title: e.target.value }))}
                    />
                    <Textarea
                      rows={4}
                      style={{ marginTop: 8 }}
                      value={editEntry.text}
                      onChange={(e) => setEditEntry((s) => ({ ...s, text: e.target.value }))}
                    />

                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>Weitere Bilder hinzufügen</div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          setUploading(true);
                          const urls = await uploadImages(files);
                          setEditEntry((s) => ({ ...s, images: [...s.images, ...urls] }));
                          setUploading(false);
                        }}
                      />
                      {uploading && (
                        <div style={{ color: COLORS.gray, fontSize: 12, marginTop: 6 }}>
                          Lade hoch…
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {(editEntry.images || []).map((u, i) => (
                          <div key={i} style={{ position: "relative" }}>
                            <img
                              src={u}
                              alt="thumb"
                              style={{
                                width: 90,
                                height: 70,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: `1px solid ${COLORS.line}`,
                                display: "block",
                              }}
                            />
                            <button
                              onClick={() =>
                                setEditEntry((s) => ({
                                  ...s,
                                  images: s.images.filter((_, x) => x !== i),
                                }))
                              }
                              style={{
                                position: "absolute",
                                top: -6,
                                right: -6,
                                background: "#000",
                                color: "#fff",
                                border: "none",
                                borderRadius: 10,
                                width: 20,
                                height: 20,
                                cursor: "pointer",
                              }}
                              title="Entfernen"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <Button onClick={saveEdit}>Speichern</Button>
                      <Button
                        style={{ background: "#fff", color: COLORS.ink }}
                        onClick={() => setEditingId(null)}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 style={{ margin: 0 }}>{post.title}</h3>
                    <p style={{ color: COLORS.gray, marginTop: 8 }}>{post.text}</p>
                    {post.created_at && (
                      <p style={{ color: COLORS.gray, fontSize: 12, marginTop: 8 }}>
                        {new Date(post.created_at).toLocaleString()}
                      </p>
                    )}
                    {isAdmin && (
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <Button
                          style={{ background: COLORS.navy }}
                          onClick={() => setEditingId(post.id)}
                        >
                          Bearbeiten
                        </Button>
                        <Button
                          style={{ background: "#fff", color: "#b91c1c" }}
                          onClick={() => deletePost(post)}
                        >
                          Löschen
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          ))}
          {blogs.length === 0 && (
            <p style={{ color: COLORS.gray }}>Noch keine Einträge. Fangt mit einem Update an!</p>
          )}
        </div>
      </Section>

      {/* MAP */}
      <Section id="map">
        <h2 style={{ fontSize: 26, marginBottom: 16 }}>Unsere Route & aktuelle Position</h2>
        <Card>
          <iframe
            title="google-map"
            src={mapSrc}
            width="100%"
            height="420"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
          />
        </Card>
        <Card style={{ marginTop: 12 }}>
          <CardBody>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 10,
                alignItems: "end",
              }}
            >
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Lat</div>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} disabled={!isAdmin} />
              </div>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Lng</div>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} disabled={!isAdmin} />
              </div>
              <div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>Gefahrene km</div>
                <Input
                  type="number"
                  min={0}
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              <Button style={{ background: COLORS.navy }} onClick={updateStatus} disabled={!isAdmin}>
                Update speichern
              </Button>
            </div>
            <p style={{ color: COLORS.gray, marginTop: 10 }}>
              Aktuell: {parseFloat(lat).toFixed(4)}° N, {parseFloat(lng).toFixed(4)}° E
            </p>
          </CardBody>
        </Card>
      </Section>

      {/* DONATE */}
      <Section id="donate">
        <h2 style={{ fontSize: 26, marginBottom: 8 }}>Spenden</h2>
        <p style={{ color: COLORS.gray, marginTop: 0, marginBottom: 16 }}>
          Unterstütze die <b>Paraplegie Schweiz</b> – wähle zwischen Zusage pro Kilometer oder einem
          festen Betrag.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <CardBody>
              <h3 style={{ marginTop: 0 }}>Zusage pro Kilometer</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>Name</div>
                  <Input id="pledge-name" placeholder="Vor- & Nachname" />
                </div>
                <div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>Betrag pro km (CHF)</div>
                  <Input
                    id="pledge-amount"
                    type="number"
                    step="0.1"
                    min={0}
                    placeholder="z. B. 0.50"
                  />
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
                  <Input id="fixed-name" placeholder="Vor- & Nachname" />
                </div>
                <div>
                  <div style={{ fontSize: 12, marginBottom: 6 }}>Betrag (CHF)</div>
                  <Input id="fixed-amount" type="number" step="1" min={0} placeholder="z. B. 50" />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Button onClick={addFixed}>Spende vormerken</Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 12, color: COLORS.gray }}>Summe Zusagen pro km</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.navy }}>
                CHF {totalPerKm.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 8 }}>
                Prognose gesamt (km × pro-km + feste Beträge)
              </div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>CHF {projected.toFixed(2)}</div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 style={{ marginTop: 0 }}>Alle Zusagen</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {pledges.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <span>{p.name}</span>
                    <b>CHF {Number(p.amount_per_km).toFixed(2)} / km</b>
                  </div>
                ))}
                {fixeds.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      border: `1px solid ${COLORS.line}`,
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <span>{p.name}</span>
                    <b>CHF {Number(p.amount).toFixed(2)} einmalig</b>
                  </div>
                ))}
                {pledges.length + fixeds.length === 0 && (
                  <p style={{ color: COLORS.gray }}>Noch keine Zusagen – sei die/der Erste!</p>
                )}
              </div>
              <p style={{ color: COLORS.gray, fontSize: 12, marginTop: 12 }}>
                Abrechnung und Zahlungsdetails (Twint/IBAN) nach der Rally. Optional: Stripe für
                Live-Zahlungen.
              </p>
            </CardBody>
          </Card>
        </div>
      </Section>

      {/* LIGHTBOX */}
      {lightbox.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.8)",
            display: "grid",
            placeItems: "center",
            zIndex: 70,
          }}
        >
          <img
            src={lightbox.images[lightbox.index]}
            alt="img"
            style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 12, display: "block" }}
          />
          <button
            onClick={closeLightbox}
            style={{
              position: "fixed",
              top: 20,
              right: 24,
              background: "#000",
              color: "#fff",
              border: "1px solid #fff",
              borderRadius: 20,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            Schließen
          </button>
          {lightbox.images.length > 1 && (
            <>
              <button
                onClick={prev}
                style={{
                  position: "fixed",
                  left: 24,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  width: 44,
                  height: 44,
                  cursor: "pointer",
                }}
              >
                ‹
              </button>
              <button
                onClick={next}
                style={{
                  position: "fixed",
                  right: 24,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#000",
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  width: 44,
                  height: 44,
                  cursor: "pointer",
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ borderTop: `1px solid ${COLORS.line}`, marginTop: 24 }}>
        <Section style={{ padding: "28px 0", textAlign: "center", color: COLORS.gray }}>
          © {new Date().getFullYear()} Flabi on tour — 🇨🇭 für Paraplegie Schweiz
        </Section>
      </div>
    </div>
  );
}
