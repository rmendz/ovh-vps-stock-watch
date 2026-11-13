# Surveillance du stock VPS OVHcloud

Toutes les 15 minutes, GitHub Actions interroge l'API publique de commande d'OVHcloud (sans compte) :

```
https://eu.api.ovh.com/v1/vps/order/rule/datacenter?ovhSubsidiary=FR&planCode=vps-2027-model4
```

Quand une offre surveillée est commandable sous Linux dans un datacenter surveillé, **le run échoue** : GitHub envoie alors un e-mail (« Run failed »). Le résumé du run donne le tableau des stocks et le lien du configurateur.

| Réglage | Valeur par défaut |
|---|---|
| Offres | `vps-2027-model4` (VPS-4), `vps-2027-model3` (VPS-3) |
| Datacenters | `GRA` (Gravelines), `SBG` (Strasbourg), `EU-WEST-RBX` (Roubaix) |
| Système | `linux` (le champ `linuxStatus` ; `status` peut être « available » pour Windows seulement) |

Codes de sortie : `0` rien de disponible, `1` VPS disponible (alerte), `2` API illisible après 3 essais.

## Tester l'alerte

Actions → « Stock VPS OVHcloud » → *Run workflow*, avec `os` = `windows`, offres `vps-2027-model3`, datacenters `EU-WEST-RBX` (en stock pour Windows le 2026-11-13) : le run doit échouer et l'e-mail arriver.

En local : `STOCK_OS=windows PLANS=vps-2027-model3 DATACENTERS=EU-WEST-RBX node check-stock.mjs`

## Après la commande

Désactiver le workflow (Actions → … → *Disable workflow*), sinon les e-mails continuent tant que le stock reste ouvert.

## Notifications

L'e-mail part vers le compte qui a poussé en dernier la ligne `cron` du workflow. Vérifier dans GitHub → Settings → Notifications → **Actions** que « Email » et « Only notify for failed workflows » sont cochés.
