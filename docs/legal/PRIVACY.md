# Politique de confidentialité — Atlas Mall Suite

**Version 1.0 — <DATE>** | Dernière mise à jour : 2026-04-22

> ⚠️ Template à valider par DPO/avocat avant publication.

---

## 1. Responsable de traitement

**<RAISON SOCIALE>**
- Siège : <ADRESSE>
- RCCM : <NUMÉRO>
- DPO / Délégué : **<EMAIL DPO>**

## 2. Données collectées

### 2.1 Données de compte
| Donnée | Finalité | Base légale | Durée |
|---|---|---|---|
| Email | Authentification, communication service | Exécution du contrat | Durée du contrat + 3 ans |
| Nom / Prénom | Personnalisation, contact commercial | Intérêt légitime | Idem |
| Organisation | Facturation, segmentation | Exécution du contrat | Durée légale comptable (10 ans) |
| Mot de passe (haché) | Sécurité | Exécution du contrat | Jusqu'à suppression compte |

### 2.2 Données d'usage
| Donnée | Finalité | Base légale | Durée |
|---|---|---|---|
| Logs de connexion (IP, user-agent) | Sécurité, détection d'anomalies | Intérêt légitime | 12 mois |
| Événements techniques (clics, navigation) | Amélioration produit | Intérêt légitime + consentement analytique | 13 mois |
| Erreurs applicatives (Sentry) | Diagnostic technique | Intérêt légitime | 90 jours |

### 2.3 Données métier
| Donnée | Finalité | Base légale | Durée |
|---|---|---|---|
| Plans importés (DXF/DWG/PDF) | Exécution du Service | Exécution du contrat | Durée du contrat |
| Annotations, versions, snapshots | Exécution du Service | Exécution du contrat | Durée du contrat |
| Rapports partagés + tokens | Traçabilité validation | Exécution du contrat | 3 ans |
| Événements de rapport (share_events) | Tracking destinataire | Intérêt légitime | 90 jours, anonymisé ensuite |

### 2.4 Données IA PROPH3T
| Donnée transmise | Destinataire | Base légale |
|---|---|---|
| Stats agrégées du plan (sans PII) | Ollama local OU Anthropic | Exécution du contrat |
| Commentaires rédigés par l'utilisateur | Idem | Consentement |

**Important** : aucune donnée personnelle identifiante n'est transmise aux
fournisseurs IA tiers. Le traitement Ollama local est privilégié quand disponible.

## 3. Destinataires

Les données sont traitées par :
- Les salariés habilités de **<ÉDITEUR>**
- Les sous-traitants techniques :
  - **Supabase** (hébergement base + Edge Functions) — <RÉGION>
  - **Anthropic** (API Claude) — US, avec DPA signé
  - **Sentry** (monitoring erreurs) — <RÉGION>, avec DPA signé
  - **<CDN / Email provider>** selon déploiement

Un registre complet des sous-traitants est disponible sur demande auprès du DPO.

## 4. Transferts hors UE / CEMAC

| Destination | Données | Garanties |
|---|---|---|
| États-Unis (Anthropic) | Stats anonymisées, prompts IA | Clauses contractuelles types UE + DPA |
| <Région Supabase> | Données du compte + métier | DPA Supabase |

Les transferts sont minimisés par l'usage privilégié d'**Ollama en local** (aucun transfert).

## 5. Droits des personnes

Conformément à la loi camerounaise n° 2010/012, au RGPD UE 2016/679 et aux
textes applicables, vous disposez des droits suivants :

- **Droit d'accès** : obtenir copie de vos données
- **Droit de rectification** : corriger des données inexactes
- **Droit à l'effacement** ("droit à l'oubli") : suppression sous 30 jours
- **Droit à la limitation** du traitement
- **Droit à la portabilité** : export JSON/CSV sur demande
- **Droit d'opposition** au traitement basé sur l'intérêt légitime
- **Droit de retirer votre consentement** à tout moment

**Pour exercer vos droits** : contacter le DPO à **<EMAIL DPO>**.
Réponse sous **30 jours maximum**.

## 6. Sécurité

### 6.1 Mesures techniques
- TLS 1.3 sur tous les flux
- Chiffrement au repos (base de données, backups)
- Authentification à 2 facteurs (MFA) disponible
- Isolation multi-tenant par RLS PostgreSQL
- Rate limiting des API publiques
- Rotation périodique des clés

### 6.2 Mesures organisationnelles
- Accès aux données de production limité au minimum
- Logs de sécurité conservés 12 mois
- Procédure de réponse aux incidents
- Formation annuelle des équipes à la cybersécurité
- Tests d'intrusion externes annuels

### 6.3 Notification de violation
En cas de violation de données personnelles, l'Éditeur notifiera :
- L'autorité compétente (<ANADI Cameroun / CNIL / CI>) sous **72 heures**
- Les personnes concernées si le risque est élevé

## 7. Cookies et traceurs

Voir la **Politique Cookies** dédiée. En résumé :
- **Essentiels** (pas de consentement requis) : authentification, préférences de session
- **Analytics** (consentement requis) : mesure d'audience anonymisée
- **Aucun cookie tiers publicitaire**

## 8. Mineurs

La Plateforme est exclusivement réservée à un **usage professionnel par des adultes
(majorité légale)**. Aucune donnée de mineur n'est sciemment collectée.

## 9. Sauvegardes et conservation

| Type | Fréquence | Rétention | Lieu |
|---|---|---|---|
| Base de production | Continu (PITR 7j) | 30 jours | <RÉGION Supabase> |
| Exports clients | Sur demande | 90 jours | Stockage chiffré |
| Logs de sécurité | Continu | 12 mois | SIEM |

## 10. Modifications

Cette politique peut être modifiée. Toute modification substantielle est notifiée
**30 jours avant** par email et/ou notification in-app.

## 11. Réclamations

Vous pouvez saisir :
- Le DPO : <EMAIL DPO>
- L'ANADI (Cameroun) : <LIEN>
- La CNIL Côte d'Ivoire (ARTCI) : <LIEN>
- La CNIL (si RGPD UE applicable) : www.cnil.fr

---

## Annexe — Politique de rétention détaillée

| Catégorie | Durée active | Archivage | Suppression finale |
|---|---|---|---|
| Compte utilisateur | Durée contrat | +3 ans | 3 ans après fin contrat |
| Plans et versions | Durée contrat | 30 j post-fin | 60 j post-fin (sauf export) |
| Rapports partagés | 3 ans | - | 3 ans |
| Share events | 90 j identifié | Anonymisés > 90j | 5 ans anonymes |
| Logs de connexion | 12 mois | - | 12 mois |
| Logs Sentry | 90 jours | - | 90 jours |
| Données comptables | 10 ans | - | 10 ans (obligation légale) |
| Backups | 30 jours rotation | - | 30 jours |

*Politique rédigée 2026-04-22 — à valider juridiquement avant publication.*
