// ═══ EXPORT DCE WORD ═══

import { Document, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, Packer } from 'docx'
import type { Vol2ExportData } from '../cosmos-angre/shared/proph3t/types'

export async function exportDCE(data: Vol2ExportData): Promise<Blob> {
  const p = (text: string, opts?: { bold?: boolean; size?: number; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]; align?: (typeof AlignmentType)[keyof typeof AlignmentType] }) =>
    new Paragraph({
      children: [new TextRun({ text, bold: opts?.bold, size: opts?.size || 22, font: 'Calibri' })],
      heading: opts?.heading, alignment: opts?.align, spacing: { after: 200 },
    })

  const makeTable = (headers: string[], rows: string[][]) => new Table({
    rows: [
      new TableRow({ children: headers.map(h => new TableCell({ children: [p(h, { bold: true, size: 18 })], width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE } })) }),
      ...rows.map(row => new TableRow({ children: row.map(cell => new TableCell({ children: [p(cell, { size: 18 })], width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE } })) })),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  const doc = new Document({
    sections: [{
      children: [
        p('DOSSIER DE CONSULTATION DES ENTREPRISES', { bold: true, size: 48, align: AlignmentType.CENTER }),
        p(data.projectName, { bold: true, size: 36, align: AlignmentType.CENTER }),
        p('Système de Sécurité — Vidéosurveillance & Contrôle d\'Accès', { size: 24, align: AlignmentType.CENTER }),
        p(`Date : ${data.generatedAt}`, { size: 20, align: AlignmentType.CENTER }),
        p('1. CONTEXTE ET OBJET', { heading: HeadingLevel.HEADING_1 }),
        p(`Le présent DCE concerne la mise en œuvre du système de sécurité du centre commercial ${data.projectName}, conformément à la norme APSAD R82.`),
        p('2. CAHIER DES CHARGES TECHNIQUE', { heading: HeadingLevel.HEADING_1 }),
        p(`Nombre total de caméras : ${data.cameras.length}. Couverture cible : ≥ 95%. Stockage : 30 jours minimum. Compression : H.265.`),
        p('2.1 Liste des équipements vidéosurveillance', { heading: HeadingLevel.HEADING_2 }),
        makeTable(
          ['Réf.', 'Modèle', 'Étage', 'FOV°', 'Portée', 'Priorité', 'Prix FCFA'],
          data.cameras.map(c => [c.label, c.model, c.floorId, String(c.fov), String(c.rangeM), c.priority, c.capexFcfa.toLocaleString()])
        ),
        p('2.2 Contrôle d\'accès', { heading: HeadingLevel.HEADING_2 }),
        p(`Nombre de portes contrôlées : ${data.doors.length}. Norme : EN 60839.`),
        makeTable(
          ['Réf.', 'Label', 'Zone', 'Badge', 'Bio', 'SAS', 'Prix FCFA'],
          data.doors.map(d => [d.ref, d.label, d.zoneType, d.hasBadge ? 'Oui' : 'Non', d.hasBiometric ? 'Oui' : 'Non', d.hasSas ? 'Oui' : 'Non', d.capexFcfa.toLocaleString()])
        ),
        p('3. BUDGET ESTIMATIF', { heading: HeadingLevel.HEADING_1 }),
        p(`Budget total : ${data.capexTotal.toLocaleString()} FCFA (${Math.round(data.capexTotal / 655.957).toLocaleString()} EUR)`, { bold: true }),
        p('4. CRITÈRES DE SÉLECTION', { heading: HeadingLevel.HEADING_1 }),
        ...['Conformité technique (40%)', 'Prix (30%)', 'Références Afrique subsaharienne (15%)', 'Délai (10%)', 'SAV et maintenance (5%)'].map(c => p(`• ${c}`)),
        p('5. CALENDRIER', { heading: HeadingLevel.HEADING_1 }),
        ...['Début travaux : août 2026', 'Fin travaux : octobre 2026', 'Ouverture : 16 octobre 2026'].map(c => p(`• ${c}`)),
      ],
    }],
  })
  return Packer.toBlob(doc)
}
