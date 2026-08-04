# -*- coding: utf-8 -*-
"""Normalise les pucelles de public/pucelles/ pour qu'elles s'affichent toutes
à la même taille apparente dans les fiches de la carte.

Le problème : les images n'ont pas toutes la même marge vide autour de l'insigne.
Une pucelle entourée de 25 % de transparence paraît deux fois plus petite qu'une
autre cadrée au plus juste, alors que les deux occupent la même zone à l'écran.

Le script rogne cette marge (transparence, ou fond uni clair pour les images
sans couche alpha), ajoute une marge propre et uniforme, puis réenregistre en
PNG. Après passage, `object-fit: contain` suffit à ce que chaque insigne
remplisse au mieux sa zone.

Il convertit au passage les fichiers dont l'extension ment sur le contenu
(GIF ou JPEG renommés en .png), que le navigateur peut refuser d'afficher.

    python scripts/normalise-pucelles.py            # aperçu, n'écrit rien
    python scripts/normalise-pucelles.py --appliquer

Prérequis : pip install Pillow
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageChops

DOSSIER = Path(__file__).parents[1] / "public" / "pucelles"
EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}

# Marge conservée autour de l'insigne, en % du plus grand côté du contenu.
MARGE = 0.03
# Plafond du plus grand côté : au-delà, l'image est réduite. La zone d'affichage
# fait 120 px et l'agrandissement ~520 px : inutile d'embarquer du 2000 px sur
# une borne qui précharge toutes les images au démarrage.
COTE_MAX = 1000
# Seuils de détection du vide : opacité, et écart au blanc.
SEUIL_ALPHA = 12
SEUIL_BLANC = 18


def format_reel(f: Path) -> str:
    debut = f.read_bytes()[:16]
    if debut.startswith(b"\x89PNG"):
        return "png"
    if debut.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if debut.startswith(b"GIF8"):
        return "gif"
    if debut[:4] == b"RIFF" and debut[8:12] == b"WEBP":
        return "webp"
    if debut.lstrip()[:5] in (b"<?xml", b"<svg "):
        return "svg"
    return "inconnu"


def bbox_contenu(im: Image.Image):
    """Boîte englobante de l'insigne : par la transparence si elle existe,
    sinon par l'écart au fond clair."""
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        alpha = im.convert("RGBA").getchannel("A")
        if alpha.getextrema()[0] < 250:
            return alpha.point(lambda a: 255 if a > SEUIL_ALPHA else 0).getbbox()
    gris = im.convert("L")
    return ImageChops.invert(gris).point(lambda v: 255 if v > SEUIL_BLANC else 0).getbbox()


def normalise(f: Path, appliquer: bool) -> tuple[str, str]:
    """-> (état, détail). N'écrit sur le disque que si `appliquer`."""
    fmt = format_reel(f)
    if fmt == "svg":
        return "IGNORÉ", "SVG : à convertir en PNG au préalable"
    if fmt == "inconnu":
        return "IGNORÉ", "format non reconnu"

    im = Image.open(f)
    im = im.convert("RGBA") if (im.mode in ("RGBA", "LA", "P") or fmt == "gif") else im.convert("RGB")
    W, H = im.size
    bb = bbox_contenu(im)
    if not bb:
        return "IGNORÉ", "image vide"

    cw, ch = bb[2] - bb[0], bb[3] - bb[1]
    avant = max(cw, ch) / max(W, H)

    marge = round(max(cw, ch) * MARGE)
    boite = (bb[0] - marge, bb[1] - marge, bb[2] + marge, bb[3] + marge)
    fond = (255, 255, 255, 0) if im.mode == "RGBA" else (255, 255, 255)
    # `crop` accepte de déborder de l'image ; on remplit le débord avec le fond.
    rogne = Image.new(im.mode, (boite[2] - boite[0], boite[3] - boite[1]), fond)
    rogne.paste(im.crop(boite), (0, 0))

    if max(rogne.size) > COTE_MAX:
        r = COTE_MAX / max(rogne.size)
        rogne = rogne.resize((max(1, round(rogne.width * r)), max(1, round(rogne.height * r))),
                             Image.LANCZOS)

    gain = f"marge {1 - avant:.0%} retirée" if avant < 0.99 else "déjà cadrée au plus juste"
    detail = f"{W}x{H} -> {rogne.width}x{rogne.height} | {gain}"
    if fmt != "png":
        detail += f" | {fmt.upper()} converti en PNG"

    if appliquer:
        rogne.save(f, "PNG", optimize=True)
    return "OK", detail


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--appliquer", action="store_true",
                    help="écrit les images (sinon simple aperçu)")
    ap.add_argument("--dossier", default=str(DOSSIER))
    args = ap.parse_args()

    dossier = Path(args.dossier)
    fichiers = sorted(f for f in dossier.iterdir()
                      if f.is_file() and f.suffix.lower() in EXTENSIONS)
    if not fichiers:
        print(f"Aucune image dans {dossier}")
        return

    if not args.appliquer:
        print("APERÇU (aucune écriture). Relancer avec --appliquer pour modifier.\n")
    ignores = 0
    for f in fichiers:
        etat, detail = normalise(f, args.appliquer)
        if etat == "IGNORÉ":
            ignores += 1
        print(f"  {etat:<7} {f.name:<24} {detail}")

    print(f"\n{len(fichiers) - ignores} image(s) traitée(s), {ignores} ignorée(s).")
    if args.appliquer:
        print("Les originaux restent récupérables via git (git checkout -- public/pucelles).")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
