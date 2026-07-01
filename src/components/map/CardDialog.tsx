import './CardDialog.css'

interface CardDialogProps {
  nom: string
  regiment: string
  devise: string
  histoire: string
  specificite: string
  garnison: string
  onClose: () => void
}

export function CardDialog({ regiment, devise, histoire, specificite, garnison, onClose }: CardDialogProps) {
  return (
    <div className="card-overlay" onClick={onClose}>
      <div className="card" onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        <div className="card-header">
          <div className="card-header-text">
            <h3>{regiment}</h3>
            <span className="card-subtitle">{devise}</span>
          </div>
          <button className="card-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="card-body">
          <div className="card-media-col">
            <div className="card-photo">
              <span>Photo</span>
            </div>
            <p className="card-geo">📍 {garnison}</p>
          </div>

          <div className="card-section card-histoire">
            <h4>Histoire</h4>
            <p>{histoire}</p>
          </div>

          <div className="card-section card-specificite">
            <h4>Spécificité</h4>
            <p>{specificite}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
