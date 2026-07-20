import './Admin.css'

interface AdminHubProps {
  onBorne: () => void
  onMemorial: () => void
}

/** Hub d'administration (accès personnel via l'appui long du coin haut-droit). */
export default function AdminHub({ onBorne, onMemorial }: AdminHubProps) {
  return (
    <div className="admin">
      <header className="admin-header">
        <span className="admin-kicker">Musée des Transmissions — accès personnel</span>
        <h1 className="admin-title">Administration de la borne</h1>
      </header>

      <div className="admin-hub-choices">
        <button type="button" className="admin-hub-btn" onClick={onBorne}>
          <span className="admin-hub-btn-icon">▶</span>
          <span className="admin-hub-btn-title">Affichage borne</span>
          <span className="admin-hub-btn-desc">
            Retour à la configuration par défaut : carte intéractive, mémorial et frise chronologique.
          </span>
        </button>

        <button type="button" className="admin-hub-btn" onClick={onMemorial}>
          <span className="admin-hub-btn-icon">✎</span>
          <span className="admin-hub-btn-title">Modifier le mémorial</span>
          <span className="admin-hub-btn-desc">
            Remplacer la liste des noms d'une catégorie en déposant un fichier Excel (clé USB).
          </span>
        </button>
      </div>

      <p className="admin-footnote">
        Sans action pendant 5 minutes, la borne revient automatiquement à l'affichage public.
      </p>
    </div>
  )
}
