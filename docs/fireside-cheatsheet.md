# Fireside — antisèche (10 min, conversation technique)

**URL démo (jury peut l'ouvrir) : https://wolf-day-damage.vercel.app/dashboard**

---

## Le pitch en 20 secondes
On reçoit 1 000 dossiers où l'info de dommage est enfermée dans des **notes allemandes brouillonnes**. On a construit **une usine à structurer ce texte** : DeepSeek lit chaque note et remplit un formulaire à vocabulaire fermé (Pydantic), des **règles déterministes** décident réparer/remplacer/déposer, et le même enregistrement alimente **la fiche visuelle de la voiture ET l'analyse des 1 000 cas**. Le LLM ne fait que **lire** ; tout le reste est auditable.

## Les 5 chiffres à ne pas rater
| # | Chiffre | Ce qu'il prouve |
|---|---|---|
| 1 | **99,9 % F1 zones · 100 % type de cas · 100 % assurance · 100 % citations verbatim · 0 perdu** (sur 977 cas jamais vus) | l'extraction est fiable et mesurée, pas affirmée |
| 2 | **Sévérité DeepSeek 72,7 %** (sur 150) vs **plafond 79,5 %** | on capte ~86 % du signal *extractible* |
| 3 | **XGBoost 82,0 % > plafond 79,5 %** ; LightGBM **65,3 %** | preuve d'overfitting (voir ci-dessous) |
| 4 | **216 remplacements → 389 opérations de dépose/repose (R&I)** | du travail facturable invisible dans la note brute |
| 5 | **668 dossiers ouverts, âge médian 150 j** · **41,3 %** = parking/manœuvre · **2 seuls termes** hors vocabulaire | insight opérationnel + honnêteté |

Coût : **1 000 cas en ~11 min, 2,7 M tokens**, cache par cas + backoff sur la clé partagée.

---

## Questions pièges & réponses

**« Pourquoi un LLM si votre regex fait 100 % sur les zones ? »**
Parce que le regex gagne *seulement* parce que le corpus est synthétique (noms de pièces écrits pile comme le vocabulaire). Sur de vraies notes (« Frontschürze », fautes), il s'effondre. Et il fait **0 % sur la sévérité** (jamais écrite) et **76 % sur l'assurance** (tournures à comprendre). Le LLM gagne là où le texte demande de la compréhension, et il produit la **structure imbriquée** (pièce↔dommage↔citation) qui alimente le dessin.

**« Pourquoi pas un modèle de classification pour la sévérité ? »**
On l'a fait — LogReg, XGBoost, LightGBM, et même un **BERT allemand fine-tuné sur le GPU**. Résultat : **XGBoost 82 % dépasse le plafond de 79,5 %**. Or ce plafond est le max qu'un lecteur *parfait* pourrait atteindre, car le générateur découple partiellement la gravité du texte (61 cas sans indice ; la **phrase identique** apparaît étiquetée légère, moyenne ET grave). Battre ce plafond = **mémoriser le vocabulaire du générateur**, pas comprendre. LightGBM à 65 % vs XGBoost à 82 % (17 pts d'écart) confirme : ils collent au bruit. **Le meilleur score est le moins fiable.** On livre la sévérité DeepSeek qui généralise.

**« 68,7 % de sévérité, c'est faible. »**
C'est **86 % du plafond démontré (79,5 %)**. La limite est dans les **données**, pas le modèle — et on le prouve avec la phrase identique à 3 étiquettes. On a choisi l'honnêteté plutôt que de sur-régler sur le test.

**« C'est synthétique, ça marche en vrai ? »**
Le README le dit : même structure que l'export de production. Notre pipeline s'appuie sur le **schéma** (noms de champs, vocabulaire de statuts), pas sur les phrases-gabarits. Donc il tient sur les vraies notes — c'est justement là que le LLM bat le regex.

**« Vous avez utilisé le ground truth ? »**
Jamais pendant l'extraction — DeepSeek ne le voit pas. Il n'existe **que** pour se noter (les 977/150 cas), et il n'existera pas en production. Un produit qui en dépendrait serait mort-né ; c'est pour ça qu'on l'a sorti du dashboard.

**« Où ça casse ? »** (question notée)
1) Corpus synthétique (bibliothèque de phrases → regex artificiellement fort). 2) Plafond sévérité = propriété des données. 3) Les règles R&I sont de la logique métier **relue à la main**, pas mesurée ; le mécanique (freins→roues) est hors périmètre. 4) **2 termes** hors vocabulaire dans tout le corpus (« Bremsscheiben », « Aufnahme ») — flaggés, jamais jetés.

**« Pourquoi pas de la 3D dès le départ / pourquoi pas GPT qui dessine la voiture ? »**
Le challenge, c'est l'extraction fiable à l'échelle, pas le dessin. On a fait le 2D data-driven d'abord (fiable = coche le livrable), puis le 3D en bonus. Un LLM qui dessine une voiture = un prompt, pas une solution — les organisateurs l'écrivent.

**« Comment savez-vous que l'extraction est juste ? »**
Chaque zone coloriée renvoie à une **citation verbatim** de la note (100 % vérifiées présentes). Et on score contre le ground truth. Clique n'importe quel dossier : la phrase justificative est surlignée.

---

## Déroulé de démo (3 min)
1. **/dashboard** — les 5 KPIs, la heatmap voiture, le mix de cas.
2. **/dashboard/cases** — filtrer (sévérité, assurance…), cliquer un dossier.
3. **Fiche** — note allemande **surlignée** = preuve · voiture **3D** coloriée · plan d'opérations avec provenance (règle vs note).
4. **/dashboard/lab** — taper une note → **prédiction live dans le navigateur** + le benchmark 5 modèles avec le plafond. **C'est ici qu'on raconte l'overfitting.**

**Fil rouge à répéter :** *le LLM lit, le code déterministe décide, le dessin et les stats sont deux vues d'un même enregistrement structuré. L'allemand reste en allemand.*
