// VOL.3 — re-export de la version partagée pour rétrocompat.
// La logique réelle vit dans `shared/components/SpaceEditorSection.tsx`
// afin d'éviter les cycles d'import cross-volume (Vol.1/Vol.2 → Vol.3).
export { default } from '../../shared/components/SpaceEditorSection'
