# -*- coding: utf-8 -*-
"""Logique partagée de l'extraction Mémorial (ODS maître -> Excel propres).

La validation/conversion Excel propre -> JSON vit désormais côté Node
(server/memorial-import.mjs), partagée entre le serveur de la borne et
« npm run import-memorial ».
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime

# Format imposé des Excel propres : 4 colonnes, ligne 1.
COLONNES_PROPRES = ["Nom", "Prénom", "Date de décès", "Grade"]

FICHIERS_CATEGORIE = {
    "1GM": "memorial-1gm",
    "2GM": "memorial-2gm",
    "Indochine": "memorial-indochine",
    "Algérie": "memorial-algerie",
    "Opex": "memorial-opex",
}


def texte(v) -> str:
    """Valeur de cellule -> texte épuré (None/NaN -> '')."""
    if v is None:
        return ""
    if isinstance(v, float) and v != v:  # NaN
        return ""
    if isinstance(v, (datetime, date)):
        return v.strftime("%d/%m/%Y")
    s = str(v).replace("\xa0", " ").strip()
    return re.sub(r"\s+", " ", s)


def parse_date_deces(valeur, annee_fallback="") -> str:
    """-> date « JJ/MM/AAAA » ou « AAAA » ou ''."""
    if isinstance(valeur, (datetime, date)):
        return valeur.strftime("%d/%m/%Y")
    t = texte(valeur)
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})(?: .*)?", t)
    if m:
        return f"{m.group(3)}/{m.group(2)}/{m.group(1)}"
    if re.fullmatch(r"\d{2}/\d{2}/\d{4}", t):
        return t
    m = re.search(r"\b(1[89]\d{2}|20\d{2})\b", t)
    if m:
        return m.group(1)
    # Repli sur l'année seule (colonne « an DC » / « année »).
    m = re.search(r"\b(1[89]\d{2}|20\d{2})\b", texte(annee_fallback))
    return m.group(1) if m else ""


def _cle_alpha(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def trie_personnes(personnes: list[dict]) -> list[dict]:
    """Tri d'affichage du Mémorial : alphabétique nom puis prénom."""
    return sorted(personnes, key=lambda p: (_cle_alpha(p["nom"]), _cle_alpha(p["prenom"])))
