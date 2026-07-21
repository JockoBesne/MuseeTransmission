import { useEffect, useRef, useState } from 'react'
import { Ord } from '../../utils/ordinals'
import './Admin.css'

interface MemorialAdminProps {
  onRetour: () => void
  onBorne: () => void
}

type Categorie = '1gm' | '2gm' | 'indochine' | 'algerie' | 'opex'

const CATEGORIES: { id: Categorie; titre: string }[] = [
  { id: '1gm', titre: '1ère Guerre mondiale' },
  { id: '2gm', titre: '2ème Guerre mondiale' },
  { id: 'indochine', titre: 'Indochine' },
  { id: 'algerie', titre: 'Algérie' },
  { id: 'opex', titre: 'Opex' },
]

interface Personne {
  nom: string
  prenom: string
  role: string
  annee: string
  date: string
  conflit: string
}

/** Réponse de POST /api/memorial/validate (et PUT commit). */
interface Analyse {
  ok: boolean
  erreurs: string[]
  avertissements: string[]
  nombre: number
  apercu?: Personne[]
}

type Phase =
  | { etat: 'depot' }
  | { etat: 'analyse' }
  | { etat: 'apercu'; analyse: Analyse }
  | { etat: 'remplacement'; analyse: Analyse }
  | { etat: 'succes'; nombre: number; avertissements: string[] }

const MSG_SERVEUR =
  "Impossible de joindre le serveur de la borne. Vérifier qu'il est démarré (npm run borne)."

/** Écran « Modifier le mémorial » : dépôt d'un fichier Excel + remplacement d'une catégorie. */
export default function MemorialAdmin({ onRetour, onBorne }: MemorialAdminProps) {
  const [fichier, setFichier] = useState<File | null>(null)
  const [categorie, setCategorie] = useState<Categorie | null>(null)
  const [phase, setPhase] = useState<Phase>({ etat: 'depot' })
  const [erreurFichier, setErreurFichier] = useState('')
  const [survol, setSurvol] = useState(false)
  const [compteurs, setCompteurs] = useState<Partial<Record<Categorie, number>>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  // Effectifs actuels par catégorie (affichés sur les cartes de choix),
  // rafraîchis après chaque remplacement réussi.
  const succes = phase.etat === 'succes'
  useEffect(() => {
    let actif = true
    for (const { id } of CATEGORIES) {
      fetch(`${import.meta.env.BASE_URL}data/memorial/${id}.json`, { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : []))
        .then((liste: unknown[]) => {
          if (actif) setCompteurs(c => ({ ...c, [id]: liste.length }))
        })
        .catch(() => {})
    }
    return () => {
      actif = false
    }
  }, [succes])

  function prendFichier(f: File | undefined) {
    setErreurFichier('')
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      setErreurFichier(`« ${f.name} » n'est pas un fichier Excel .xlsx — format non accepté.`)
      return
    }
    setFichier(f)
    setPhase({ etat: 'depot' })
    if (categorie) void analyse(f, categorie)
  }

  async function analyse(f: File, cat: Categorie) {
    setCategorie(cat)
    setPhase({ etat: 'analyse' })
    try {
      const rep = await fetch(`/api/memorial/validate?categorie=${cat}`, { method: 'POST', body: f })
      const resultat = (await rep.json()) as Analyse
      setPhase({ etat: 'apercu', analyse: resultat })
    } catch {
      setErreurFichier(MSG_SERVEUR)
      setPhase({ etat: 'depot' })
    }
  }

  async function remplace() {
    if (!fichier || !categorie || phase.etat !== 'apercu') return
    const analyseCourante = phase.analyse
    setPhase({ etat: 'remplacement', analyse: analyseCourante })
    try {
      const rep = await fetch(`/api/memorial/${categorie}`, { method: 'PUT', body: fichier })
      const resultat = (await rep.json()) as Analyse
      if (!resultat.ok) {
        setPhase({ etat: 'apercu', analyse: resultat })
        return
      }
      setPhase({ etat: 'succes', nombre: resultat.nombre, avertissements: resultat.avertissements })
    } catch {
      setErreurFichier(MSG_SERVEUR)
      setPhase({ etat: 'apercu', analyse: analyseCourante })
    }
  }

  function recommence() {
    setFichier(null)
    setCategorie(null)
    setErreurFichier('')
    setPhase({ etat: 'depot' })
  }

  const titreCategorie = CATEGORIES.find(c => c.id === categorie)?.titre ?? ''

  /* ── Écran de succès ── */
  if (phase.etat === 'succes') {
    return (
      <div className="admin">
        <header className="admin-header">
          <span className="admin-kicker">Administration — Mémorial</span>
          <h1 className="admin-title">Données remplacées</h1>
        </header>
        <div className="admin-succes">
          <p className="admin-succes-message">
            ✔ <strong>{phase.nombre}</strong> noms enregistrés pour la catégorie{' '}
            <strong><Ord>{titreCategorie}</Ord></strong>. Le Mémorial de la borne est à jour.
          </p>
          {phase.avertissements.length > 0 && (
            <div className="admin-bloc admin-bloc--avertissements">
              <h3>{phase.avertissements.length} ligne(s) à vérifier (importées ou ignorées)</h3>
              <ul>
                {phase.avertissements.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="admin-actions">
            <button type="button" className="admin-btn admin-btn--primaire" onClick={onBorne}>
              Terminer — affichage borne
            </button>
            <button type="button" className="admin-btn" onClick={recommence}>
              Modifier une autre catégorie
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <span className="admin-kicker">Administration — Mémorial</span>
        <h1 className="admin-title">Modifier le mémorial</h1>
        <button type="button" className="admin-retour" onClick={onRetour}>
          ‹ Retour
        </button>
      </header>

      <div className="admin-memorial">
        {/* ── Étape 1 : dépôt du fichier ── */}
        <section className="admin-etape">
          <h2 className="admin-etape-titre">1. Déposer le fichier Excel</h2>
          <div
            className={`admin-dropzone${survol ? ' admin-dropzone--survol' : ''}${fichier ? ' admin-dropzone--ok' : ''}`}
            onDragOver={e => {
              e.preventDefault()
              setSurvol(true)
            }}
            onDragLeave={() => setSurvol(false)}
            onDrop={e => {
              e.preventDefault()
              setSurvol(false)
              prendFichier(e.dataTransfer.files[0])
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
            }}
          >
            {fichier ? (
              <>
                <span className="admin-dropzone-icone">📄</span>
                <span className="admin-dropzone-nom">{fichier.name}</span>
                <span className="admin-dropzone-aide">Toucher pour choisir un autre fichier</span>
              </>
            ) : (
              <>
                <span className="admin-dropzone-icone">⬇</span>
                <span className="admin-dropzone-nom">Glisser le fichier ici</span>
                <span className="admin-dropzone-aide">
                  depuis la clé USB (ou toucher pour parcourir) — .xlsx uniquement,
                  le nom du fichier n'a pas d'importance.
                  Le fichier doit contenir la <strong>liste complète</strong> :
                  il remplace tous les noms de la catégorie choisie.
                </span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              hidden
              onChange={e => {
                prendFichier(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
          {erreurFichier && <p className="admin-erreur">{erreurFichier}</p>}
        </section>

        {/* ── Étape 2 : choix de la catégorie à remplacer ── */}
        <section className="admin-etape">
          <h2 className="admin-etape-titre">2. Toucher la liste à remplacer</h2>
          <div className="admin-categories">
            {CATEGORIES.map(({ id, titre }) => (
              <button
                key={id}
                type="button"
                className={`admin-categorie${categorie === id ? ' admin-categorie--active' : ''}`}
                disabled={!fichier}
                onClick={() => fichier && analyse(fichier, id)}
              >
                <span className="admin-categorie-titre"><Ord>{titre}</Ord></span>
                <span className="admin-categorie-detail">
                  {compteurs[id] !== undefined ? `${compteurs[id]} noms actuellement` : '…'}
                  {' · '}memorial-{id}.xlsx
                </span>
              </button>
            ))}
          </div>
          {!fichier && <p className="admin-aide">Déposer d'abord un fichier à l'étape 1.</p>}
        </section>

        {/* ── Étape 3 : vérifications puis remplacement ── */}
        <section className="admin-etape admin-etape--verif">
          <h2 className="admin-etape-titre">3. Vérifier puis remplacer</h2>

          {phase.etat === 'analyse' && <p className="admin-aide">Analyse du fichier…</p>}
          {phase.etat === 'depot' && (
            <p className="admin-aide">
              Les vérifications s'affichent ici après les étapes 1 et 2. Le fichier déposé sera
              automatiquement renommé « memorial-<em>catégorie</em>.xlsx ».
            </p>
          )}

          {(phase.etat === 'apercu' || phase.etat === 'remplacement') && (
            <div className="admin-verif">
              {!phase.analyse.ok ? (
                <div className="admin-bloc admin-bloc--erreurs">
                  <h3>Fichier refusé — format non conforme</h3>
                  <ul>
                    {phase.analyse.erreurs.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                  <p>
                    Colonnes attendues en ligne 1 : <strong>Nom | Prénom | Date de décès | Grade</strong>
                  </p>
                </div>
              ) : (
                <>
                  <p className="admin-verif-resume">
                    ✔ Format conforme — <strong>{phase.analyse.nombre}</strong> noms lus depuis{' '}
                    <strong>{fichier?.name}</strong>, prêt à remplacer{' '}
                    <strong><Ord>{titreCategorie}</Ord></strong> (le fichier sera enregistré sous
                    « memorial-{categorie}.xlsx »).
                  </p>

                  {phase.analyse.avertissements.length > 0 && (
                    <div className="admin-bloc admin-bloc--avertissements">
                      <h3>{phase.analyse.avertissements.length} ligne(s) à vérifier</h3>
                      <ul>
                        {phase.analyse.avertissements.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <table className="admin-apercu">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Prénom</th>
                        <th>Date de décès</th>
                        <th>Grade</th>
                        {(phase.analyse.apercu ?? []).some(p => p.conflit) && <th>Conflit</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(phase.analyse.apercu ?? []).map((p, i) => (
                        <tr key={i}>
                          <td>{p.nom}</td>
                          <td>{p.prenom}</td>
                          <td>{p.date}</td>
                          <td><Ord>{p.role}</Ord></td>
                          {(phase.analyse.apercu ?? []).some(x => x.conflit) && <td>{p.conflit}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="admin-aide">
                    Aperçu des premières lignes (triées) — {phase.analyse.nombre} au total.
                  </p>

                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--primaire"
                      onClick={remplace}
                      disabled={phase.etat === 'remplacement'}
                    >
                      {phase.etat === 'remplacement'
                        ? 'Remplacement en cours…'
                        : `Remplacer les ${phase.analyse.nombre} noms`}
                    </button>
                    <button type="button" className="admin-btn" onClick={recommence}>
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
