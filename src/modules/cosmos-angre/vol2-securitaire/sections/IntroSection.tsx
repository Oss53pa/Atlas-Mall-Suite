import { Camera, Monitor, Layers, Zap, Sparkles } from 'lucide-react'
import { useContentStore } from '../../shared/store/contentStore'
import EditableText, { EditableStat } from '../../shared/components/EditableText'

const STAT_ICONS = [Camera, Monitor, Layers, Zap]

export default function IntroSection() {
  const subtitle = useContentStore((s) => s.vol2IntroSubtitle)
  const description = useContentStore((s) => s.vol2IntroDescription)
  const text1 = useContentStore((s) => s.vol2IntroText1)
  const text2 = useContentStore((s) => s.vol2IntroText2)
  const insightScore = useContentStore((s) => s.vol2IntroInsightScore)
  const insightText = useContentStore((s) => s.vol2IntroInsightText)
  const stats = useContentStore((s) => s.vol2IntroStats)
  const setField = useContentStore((s) => s.setField)
  const setVol2IntroStat = useContentStore((s) => s.setVol2IntroStat)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <EditableText
          value={subtitle}
          onChange={(v) => setField('vol2IntroSubtitle', v)}
          className="text-[11px] tracking-[0.2em] font-medium mb-2"
          style={{ color: '#38bdf8' }}
          tag="p"
        />
        <h1 className="text-[28px] font-light text-white mb-3">Introduction</h1>
        <EditableText
          value={description}
          onChange={(v) => setField('vol2IntroDescription', v)}
          className="text-[13px] leading-[1.7]"
          style={{ color: '#4a5568' }}
          tag="p"
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = STAT_ICONS[i] ?? Zap
          return (
            <div
              key={i}
              className="rounded-[10px] p-5 flex flex-col items-center text-center"
              style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
            >
              <Icon size={20} style={{ color: '#38bdf8' }} className="mb-3" />
              <EditableStat
                value={s.value}
                onChange={(v) => setVol2IntroStat(i, { value: v })}
                className="text-2xl font-semibold"
                style={{ color: '#38bdf8' }}
              />
              <EditableStat
                value={s.label}
                onChange={(v) => setVol2IntroStat(i, { label: v })}
                className="text-[10px] tracking-wider mt-1"
                style={{ color: '#4a5568' }}
              />
            </div>
          )
        })}
      </div>

      {/* Introduction text */}
      <div className="rounded-[10px] p-6" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h3 className="text-sm font-semibold text-white mb-3">Dispositif global de securite</h3>
        <EditableText
          value={text1}
          onChange={(v) => setField('vol2IntroText1', v)}
          className="text-[13px] leading-[1.8]"
          style={{ color: '#94a3b8' }}
          tag="p"
          multiline
        />
        <EditableText
          value={text2}
          onChange={(v) => setField('vol2IntroText2', v)}
          className="text-[13px] leading-[1.8] mt-3"
          style={{ color: '#94a3b8' }}
          tag="p"
          multiline
        />
      </div>

      {/* Proph3t Insight */}
      <div className="rounded-[10px] p-6" style={{ background: 'rgba(126,34,206,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(126,34,206,0.2)' }}>
            <Sparkles size={16} className="text-purple-400" />
          </div>
          <h3 className="font-semibold text-purple-300">Proph3t Insight</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <EditableStat
              value={insightScore}
              onChange={(v) => setField('vol2IntroInsightScore', v)}
              className="text-2xl font-bold text-purple-300"
            />
            <span className="text-sm" style={{ color: '#94a3b8' }}>Score securite global</span>
          </div>
          <EditableText
            value={insightText}
            onChange={(v) => setField('vol2IntroInsightText', v)}
            className="text-[13px] leading-[1.7]"
            style={{ color: '#94a3b8' }}
            tag="p"
            multiline
          />
        </div>
      </div>
    </div>
  )
}
