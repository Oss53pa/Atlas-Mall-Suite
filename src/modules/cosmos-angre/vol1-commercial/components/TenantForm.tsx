// ═══ TenantForm — Formulaire ajout/edition d'un preneur ═══

import { Modal, TextField, NumberField, SelectField, DateField, FormActions, useFormState } from '../../shared/components/FormModal'
import { SECTOR_LABELS } from '../../shared/constants/sectorConfig'
import { useVol1Store } from '../store/vol1Store'
import type { Tenant, Sector, TenantStatus } from '../store/vol1Types'

interface TenantFormProps {
  open: boolean
  onClose: () => void
  editTenant?: Tenant | null
}

const SECTOR_OPTIONS = Object.entries(SECTOR_LABELS).map(([value, label]) => ({ value, label }))
const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'actif', label: 'Actif' },
  { value: 'en_negociation', label: 'En negociation' },
  { value: 'en_contentieux', label: 'En contentieux' },
  { value: 'sortant', label: 'Sortant' },
]

const EMPTY_TENANT: Omit<Tenant, 'id'> = {
  companyName: '',
  brandName: '',
  sector: 'commerce' as Sector,
  contact: { name: '', email: '', phone: '' },
  leaseStart: '2026-01-01',
  leaseEnd: '2029-01-01',
  baseRentFcfa: 35000,
  serviceCharges: 5000,
  depositFcfa: 3000000,
  status: 'en_negociation',
}

export function TenantForm({ open, onClose, editTenant }: TenantFormProps) {
  const addTenant = useVol1Store(s => s.addTenant)
  const updateTenant = useVol1Store(s => s.updateTenant)

  const initial = editTenant ?? { id: '', ...EMPTY_TENANT }
  const { form, setField } = useFormState(initial)
  const isEdit = !!editTenant

  const handleSubmit = () => {
    if (!form.brandName.trim() || !form.companyName.trim()) return

    if (isEdit) {
      updateTenant(form.id, form)
    } else {
      addTenant({
        ...form,
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le preneur' : 'Ajouter un preneur'} width="max-w-xl">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Societe" value={form.companyName} onChange={v => setField('companyName', v)} required placeholder="Ex: Zara CI SARL" />
          <TextField label="Enseigne" value={form.brandName} onChange={v => setField('brandName', v)} required placeholder="Ex: Zara" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Secteur" value={form.sector} onChange={v => setField('sector', v as Sector)} options={SECTOR_OPTIONS} required />
          <SelectField label="Statut" value={form.status} onChange={v => setField('status', v as TenantStatus)} options={STATUS_OPTIONS} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DateField label="Debut bail" value={form.leaseStart} onChange={v => setField('leaseStart', v)} required />
          <DateField label="Fin bail" value={form.leaseEnd} onChange={v => setField('leaseEnd', v)} required />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Loyer" value={form.baseRentFcfa} onChange={v => setField('baseRentFcfa', v)} unit="FCFA/m2/an" min={0} />
          <NumberField label="Charges" value={form.serviceCharges} onChange={v => setField('serviceCharges', v)} unit="FCFA/m2/an" min={0} />
          <NumberField label="Depot" value={form.depositFcfa} onChange={v => setField('depositFcfa', v)} unit="FCFA" min={0} />
        </div>

        <p className="text-[10px] uppercase tracking-wider text-slate-500 pt-2">Contact</p>
        <div className="grid grid-cols-3 gap-3">
          <TextField label="Nom" value={form.contact.name} onChange={v => setField('contact', { ...form.contact, name: v })} placeholder="Nom complet" />
          <TextField label="Email" value={form.contact.email} onChange={v => setField('contact', { ...form.contact, email: v })} type="email" />
          <TextField label="Telephone" value={form.contact.phone} onChange={v => setField('contact', { ...form.contact, phone: v })} type="tel" />
        </div>

        <FormActions onSubmit={handleSubmit} onCancel={onClose} isEdit={isEdit} disabled={!form.brandName.trim()} />
      </div>
    </Modal>
  )
}
