/* Deux visiteurs, une seule dalle : Chromium n'émet plus aucun `click` tant
   que deux doigts sont posés sur l'écran. Son détecteur de gestes annule le
   tap en cours dès le second contact (il guette un pincement ou un défilement
   à deux doigts), et le `click` naît justement de ce tap. Résultat observé sur
   la borne : celui qui garde le doigt appuyé sur un panneau bloque tous les
   boutons de l'autre panneau, alors que les défilements automatiques, eux,
   continuent — ils ne dépendent d'aucun geste.

   Les événements pointer, eux, sont bien délivrés pour chaque doigt. On
   refabrique donc le tap à partir d'eux. Le click natif garde la priorité : on
   ne synthétise que lorsqu'il n'est pas venu (cas multi-doigts), ce qui laisse
   le cas d'un visiteur seul strictement inchangé.

   Corollaire : ne pas remplacer les `onClick` de l'application par des
   `onPointerUp` — ce module les couvre tous d'un coup, y compris ceux à
   venir. */

/** Au-delà, ce n'est plus un tap : appui long ou glissement. */
const TAP_MAX_MS = 700
const TAP_MAX_PX = 12
/* Délai laissé au click natif avant de le suppléer. index.html déclare un
   `<meta name="viewport">` : Chromium n'applique donc pas le retard de 300 ms
   du double-tap, le click natif — quand il vient — vient immédiatement. Ce
   délai n'est subi que dans le cas multi-doigts, où sans lui il n'y aurait
   aucune réaction du tout. */
const ATTENTE_CLICK_MS = 120

interface Depart {
  x: number
  y: number
  t: number
}

export function installMultiTouchTap() {
  /* Un doigt = un pointerId ; jamais `touches[0]`, qui mélangerait les deux
     visiteurs (même règle que `finDuGeste` dans Memorial.tsx). */
  const departs = new Map<number, Depart>()
  const enAttente = new Map<Element, ReturnType<typeof setTimeout>>()

  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return
    departs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp })
  }, { capture: true, passive: true })

  /* Doigt annulé par le système (geste confisqué, palm rejection) : sans cette
     ligne son départ resterait dans la table jusqu'au soir. */
  addEventListener('pointercancel', e => {
    departs.delete(e.pointerId)
  }, { capture: true, passive: true })

  // Le click natif est arrivé : il n'y a rien à suppléer sur cette cible.
  addEventListener('click', e => {
    if (!e.isTrusted || !(e.target instanceof Element)) return
    const timer = enAttente.get(e.target)
    if (timer === undefined) return
    clearTimeout(timer)
    enAttente.delete(e.target)
  }, { capture: true, passive: true })

  addEventListener('pointerup', e => {
    const depart = departs.get(e.pointerId)
    departs.delete(e.pointerId)
    if (!depart || !(e.target instanceof Element)) return
    if (e.timeStamp - depart.t > TAP_MAX_MS) return
    if (Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > TAP_MAX_PX) return

    /* La cible du pointerup est celle du pointerdown (capture implicite du
       tactile) : le doigt n'a donc pas pu « glisser » vers un autre bouton. */
    const cible = e.target
    const { clientX, clientY } = e

    // Deux taps sur la même cible en moins de 120 ms : un seul click.
    const precedent = enAttente.get(cible)
    if (precedent !== undefined) clearTimeout(precedent)

    enAttente.set(cible, setTimeout(() => {
      enAttente.delete(cible)
      // La pop-up a pu se fermer entre-temps : ne pas cliquer dans le vide.
      if (!cible.isConnected) return
      cible.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        detail: 1,
        clientX,
        clientY,
      }))
    }, ATTENTE_CLICK_MS))
  }, { capture: true, passive: true })
}
