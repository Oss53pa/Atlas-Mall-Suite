import React, { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileDown, ChevronDown } from 'lucide-react'

interface ExportButtonProps {
  label?: string
  onExportTxt?: () => string
  onExportDocx?: () => Promise<Blob>
  onExportPdf?: () => Promise<Blob>
  filename?: string
  disabled?: boolean
}

export default function ExportButton({
  label = 'Exporter',
  onExportTxt,
  onExportDocx,
  onExportPdf,
  filename = 'rapport',
  disabled = false,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadText(text: string, name: string) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, name)
  }

  async function handleExport(type: 'txt' | 'docx' | 'pdf') {
    setExporting(true)
    setOpen(false)
    try {
      if (type === 'txt' && onExportTxt) {
        downloadText(onExportTxt(), `${filename}.txt`)
      } else if (type === 'docx' && onExportDocx) {
        const blob = await onExportDocx()
        downloadBlob(blob, `${filename}.docx`)
      } else if (type === 'pdf' && onExportPdf) {
        const blob = await onExportPdf()
        downloadBlob(blob, `${filename}.pdf`)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-40"
      >
        <Download className="w-3.5 h-3.5" />
        {exporting ? 'Export...' : label}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
          {onExportTxt && (
            <button
              onClick={() => handleExport('txt')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Texte (.txt)
            </button>
          )}
          {onExportDocx && (
            <button
              onClick={() => handleExport('docx')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Word (.docx)
            </button>
          )}
          {onExportPdf && (
            <button
              onClick={() => handleExport('pdf')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF (.pdf)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
