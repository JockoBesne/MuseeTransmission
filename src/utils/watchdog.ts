/* Garde-fou de la borne : elle tourne sans surveillance toute la journée
   d'exposition. Une exception non rattrapée vide `#root` et laisse un écran
   blanc jusqu'à la coupure de courant du soir — on recharge donc la page.

   Pourquoi des écouteurs globaux plutôt qu'un ErrorBoundary React : celui-ci
   n'attrape que le rendu, alors que l'application vit surtout dans
   l'asynchrone (boucle rAF du Mémorial et de la frise, minuteurs de
   transition, fetch des JSON). React relançant vers `window` les erreurs de
   rendu qu'aucun boundary n'attrape, ces deux écouteurs couvrent les deux
   familles d'un coup.

   Volontairement hors React : si React est mort, on ne peut pas compter sur
   lui pour afficher le repli — d'où le DOM à la main et, seule entorse à la
   règle « un .css par composant », les styles en ligne (le repli doit tenir
   même si la feuille de styles n'a pas chargé). */

const CLE = 'borne-essais'
/** Rechargements consécutifs avant de renoncer (erreur reproductible). */
const MAX_ESSAIS = 3
/* Page tenue au moins ce temps = incident isolé, le compteur repart de zéro.
   Sans cela, trois pannes sans rapport réparties dans la journée finiraient
   par condamner la borne jusqu'au lendemain matin. */
const STABLE_MS = 2 * 60 * 1000

/** Écran sobre affiché quand le rechargement ne suffit plus. */
function ecranDePanne(detail: string) {
  document.body.innerHTML = `
    <div style="position:fixed;inset:0;display:flex;flex-direction:column;
                align-items:center;justify-content:center;gap:1.5rem;
                background:#0D3151;color:#ffffff;text-align:center;padding:3rem;
                font-family:Raleway,system-ui,sans-serif">
      <div style="font-size:3rem;color:#fecc30" aria-hidden="true">✦</div>
      <h1 style="font-size:2.4rem;font-weight:600;margin:0">
        Borne momentanément indisponible
      </h1>
      <p style="font-size:1.5rem;color:#e0e0e0;margin:0">
        Merci de prévenir un agent d'accueil.
      </p>
      <p id="borne-detail" style="font-size:0.9rem;color:#7e93a6;margin:2rem 0 0;
                                  max-width:60ch;word-break:break-word"></p>
    </div>`
  // textContent : le message d'erreur n'est jamais interprété comme du HTML.
  const el = document.getElementById('borne-detail')
  if (el) el.textContent = detail
}

/** Détail lisible d'une erreur, pour le bas de l'écran de panne. */
function detailErreur(e: ErrorEvent | PromiseRejectionEvent) {
  const cause = 'reason' in e ? e.reason : e.error ?? e.message
  return String(cause instanceof Error ? cause.stack ?? cause.message : cause)
}

export function installWatchdog() {
  /* Compteur remis à zéro une fois la page jugée stable. Il vit dans
     sessionStorage : il survit au rechargement, mais pas à la coupure du soir
     — chaque journée d'exposition repart donc de zéro. */
  const remiseAZero = setTimeout(() => sessionStorage.removeItem(CLE), STABLE_MS)
  let enCours = false

  function surErreur(e: ErrorEvent | PromiseRejectionEvent) {
    // Une erreur en rafale ne doit pas empiler les rechargements.
    if (enCours) return
    enCours = true
    clearTimeout(remiseAZero)
    console.error('[borne] erreur non rattrapée', e)

    // Relu ici, et non à l'installation : la remise à zéro a pu passer depuis.
    const essais = Number(sessionStorage.getItem(CLE) ?? 0)
    if (essais >= MAX_ESSAIS) {
      ecranDePanne(detailErreur(e))
      return
    }
    sessionStorage.setItem(CLE, String(essais + 1))
    location.reload()
  }

  /* Sans `capture: true` : les échecs de chargement de ressources (une pucelle
     manquante, une vidéo absente) ne remontent pas jusqu'à `window` en phase
     bouillonnante. C'est voulu — ils ne doivent pas recharger la borne. */
  window.addEventListener('error', surErreur)
  window.addEventListener('unhandledrejection', surErreur)
}
