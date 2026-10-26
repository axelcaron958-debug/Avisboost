'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [commerce, setCommerce] = useState(null)
  const [clients, setClients] = useState([])
  const [err, setErr] = useState('')
  const [f, setF] = useState({ email: '', pass: '', nom: '', lien: '', prenom: '', tel: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  async function load() {
    if (!session) return
    const { data: c } = await supabase.from('commerces').select('*').eq('id', session.user.id).maybeSingle()
    setCommerce(c)
    if (c) {
      const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
      setClients(data || [])
    }
  }
  useEffect(() => { load() }, [session])

  async function auth(mode) {
    setErr('')
    const fn = mode === 'in' ? supabase.auth.signInWithPassword : supabase.auth.signUp
    const { error } = await fn.call(supabase.auth, { email: f.email, password: f.pass })
    if (error) setErr(error.message)
    else if (mode === 'up') setErr('Compte créé. Si besoin, confirmez votre e-mail puis connectez-vous.')
  }
  async function saveCommerce() {
    setErr('')
    const { error } = await supabase.from('commerces').insert({ id: session.user.id, nom: f.nom, lien_avis: f.lien })
    if (error) setErr(error.message); else load()
  }
  async function addClient() {
    setErr('')
    if (!f.prenom || !f.tel) return setErr('Renseignez le prénom et le téléphone.')
    const { error } = await supabase.from('clients').insert({ commerce_id: session.user.id, prenom: f.prenom, telephone: f.tel })
    if (error) setErr(error.message); else { setF({ ...f, prenom: '', tel: '' }); load() }
  }
  async function avisRecu(id) {
    await supabase.from('clients').update({ avis_recu: true }).eq('id', id); load()
  }

  if (!ready) return <main><p>Chargement…</p></main>

  if (!session) return (
    <main><h1>AvisBoost</h1>
      <div className="card"><h2>Connexion</h2>
        <input placeholder="E-mail" type="email" value={f.email} onChange={set('email')} />
        <input placeholder="Mot de passe (6 caractères min.)" type="password" value={f.pass} onChange={set('pass')} />
        {err && <p className="err">{err}</p>}
        <button onClick={() => auth('in')}>Se connecter</button>
        <p style={{ textAlign: 'center' }}><button className="l" onClick={() => auth('up')}>Créer un compte</button></p>
      </div></main>)

  if (!commerce) return (
    <main><h1>Votre commerce</h1>
      <div className="card">
        <input placeholder="Nom du commerce" value={f.nom} onChange={set('nom')} />
        <input placeholder="Lien d’avis Google" value={f.lien} onChange={set('lien')} />
        {err && <p className="err">{err}</p>}
        <button onClick={saveCommerce}>Enregistrer</button>
      </div></main>)

  const avis = clients.filter((c) => c.avis_recu).length
  const taux = clients.length ? Math.round((avis / clients.length) * 100) : 0
  return (
    <main><h1>{commerce.nom}</h1>
      <div className="card stats">
        <div><b>{clients.length}</b><span>Clients</span></div>
        <div><b>{avis}</b><span>Avis obtenus</span></div>
        <div><b>{taux} %</b><span>Taux d’avis</span></div>
      </div>
      <div className="card"><h2>Ajouter un client</h2>
        <input placeholder="Prénom" value={f.prenom} onChange={set('prenom')} />
        <input placeholder="Téléphone" inputMode="tel" value={f.tel} onChange={set('tel')} />
        {err && <p className="err">{err}</p>}
        <button onClick={addClient}>Ajouter</button>
      </div>
      <div className="card"><h2>Mes clients</h2>
        {clients.length === 0 && <small>Aucun client pour l’instant.</small>}
        {clients.map((c) => (
          <div className="row" key={c.id}>
            <div><b>{c.prenom}</b><small>{c.telephone}</small></div>
            {c.avis_recu ? <span className="ok">Avis reçu</span> : <button className="o" onClick={() => avisRecu(c.id)}>Avis reçu</button>}
          </div>))}
      </div>
      <p style={{ textAlign: 'center' }}><button className="l" onClick={() => supabase.auth.signOut()}>Se déconnecter</button></p>
    </main>)
}
