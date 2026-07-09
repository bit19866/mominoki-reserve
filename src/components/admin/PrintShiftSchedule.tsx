'use client'

import { useEffect } from 'react'

interface Staff {
  id: string
  name: string
  sort_order: number
}
interface Override {
  staff_id: string
  override_date: string
  is_working: boolean
  start_time: string | null
  end_time: string | null
}
interface WeeklySchedule {
  staff_id: string
  day_of_week: number
  is_working: boolean
  start_time: string | null
  end_time: string | null
}
interface Props {
  storeName: string
  monthStr: string
  year: number
  month: number
  lastDay: number
  staff: Staff[]
  overrides: Override[]
  weeklySchedules: WeeklySchedule[]
  defaultStart: string
  defaultEnd: string
}

const DOW = ['日', '月', '火', '水', '木', '金', '土']

// 時間軸: 10〜24:00（14時間）
const AXIS_START = 10 * 60   // 600分
const AXIS_TOTAL = 14 * 60   // 840分
// ラベル: 10〜23 + 0(=24:00)
const HOUR_LABELS = [10,11,12,13,14,15,16,17,18,19,20,21,22,23,0]

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  const min = h * 60 + (m || 0)
  return h < 6 ? min + 1440 : min // 深夜0〜5時は翌日扱い
}

function getShift(
  staffId: string, dateStr: string, dow: number,
  overrides: Override[], weekly: WeeklySchedule[],
  defStart: string, defEnd: string,
) {
  const ov = overrides.find(o => o.staff_id === staffId && o.override_date === dateStr)
  if (ov) return {
    on: ov.is_working,
    start: ov.start_time?.slice(0,5) || defStart,
    end:   ov.end_time?.slice(0,5)   || defEnd,
  }
  const w = weekly.find(w => w.staff_id === staffId && w.day_of_week === dow)
  if (w) return {
    on: w.is_working,
    start: w.start_time?.slice(0,5) || defStart,
    end:   w.end_time?.slice(0,5)   || defEnd,
  }
  return { on: true, start: defStart, end: defEnd }
}

function barLeft(t: string) {
  return `${Math.max(0, (toMin(t) - AXIS_START) / AXIS_TOTAL * 100).toFixed(2)}%`
}
function barWidth(start: string, end: string) {
  const w = (toMin(end) - toMin(start)) / AXIS_TOTAL * 100
  return `${Math.max(0, w).toFixed(2)}%`
}

/* ── 1日分ブロック ─────────────────────────────────────── */
function DayBlock({ dateStr, staff, overrides, weeklySchedules, defStart, defEnd }: {
  dateStr: string
  staff: Staff[]
  overrides: Override[]
  weeklySchedules: WeeklySchedule[]
  defStart: string
  defEnd: string
}) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const dow = d.getDay()
  const isSun = dow === 0
  const isSat = dow === 6
  const dateColor = isSun ? '#dc2626' : isSat ? '#2563eb' : '#374151'
  const dateBg    = isSun ? '#fef2f2' : isSat ? '#eff6ff' : '#f5f5f5'

  return (
    <div style={{ border: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* 時間ヘッダー */}
      <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db', backgroundColor: '#f9fafb', flexShrink: 0 }}>
        {/* 日付列ぶん空白 */}
        <div style={{ width: 26, flexShrink: 0, borderRight: '1px solid #e5e7eb' }} />
        {/* 名前列ぶん空白 */}
        <div style={{ width: 40, flexShrink: 0, borderRight: '1px solid #e5e7eb' }} />
        {/* 時間ラベル */}
        <div style={{ flex: 1, position: 'relative', height: 16 }}>
          {HOUR_LABELS.map((h, i) => (
            <span key={i} style={{
              position: 'absolute',
              left: `${(i / 14) * 100}%`,
              fontSize: 7,
              color: '#6b7280',
              transform: 'translateX(-50%)',
              top: 3,
              lineHeight: 1,
            }}>
              {h}
            </span>
          ))}
          {/* 最終ラベル(24:00=0) already included above */}
        </div>
      </div>

      {/* スタッフ行 */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* 日付列（全スタッフ行をスパン） */}
        <div style={{
          width: 26, flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backgroundColor: dateBg,
          borderRight: '1px solid #d1d5db',
          padding: '4px 0',
          gap: 2,
        }}>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: dateColor, lineHeight: 1 }}>
            {day}日
          </div>
          <div style={{ fontSize: 7, color: dateColor, lineHeight: 1 }}>
            {DOW[dow]}曜日
          </div>
        </div>

        {/* 名前＋バー列 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {staff.map((s, si) => {
            const shift = getShift(s.id, dateStr, dow, overrides, weeklySchedules, defStart, defEnd)
            return (
              <div key={s.id} style={{
                height: 18,
                flexShrink: 0,
                display: 'flex',
                borderBottom: si < staff.length - 1 ? '1px solid #f3f4f6' : 'none',
                backgroundColor: si % 2 === 0 ? 'white' : '#fafafa',
              }}>
                {/* 名前 */}
                <div style={{
                  width: 40, flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                  padding: '0 3px',
                  fontSize: 9, fontWeight: 'bold', color: '#374151',
                  borderRight: '1px solid #e5e7eb',
                  overflow: 'hidden',
                }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </span>
                </div>

                {/* バーエリア */}
                <div style={{ flex: 1, position: 'relative' }}>
                  {/* グリッド線 */}
                  {HOUR_LABELS.map((_, i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      left: `${(i / 14) * 100}%`,
                      top: 0, bottom: 0,
                      borderLeft: i === 0 ? 'none' : '1px solid #f0f0f0',
                    }} />
                  ))}

                  {/* 勤務バー */}
                  {shift.on && (
                    <div style={{
                      position: 'absolute',
                      left: barLeft(shift.start),
                      width: barWidth(shift.start, shift.end),
                      top: '20%', bottom: '20%',
                      backgroundColor: '#fca5a5',
                      borderRadius: 2,
                    }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── メインコンポーネント ───────────────────────────────── */
export default function PrintShiftSchedule({
  storeName, monthStr, year, month, lastDay,
  staff, overrides, weeklySchedules, defaultStart, defaultEnd,
}: Props) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [])

  const allDates = Array.from({ length: lastDay }, (_, i) =>
    `${monthStr}-${String(i + 1).padStart(2, '0')}`
  )

  // 4日ごとにページに分割
  const pages: string[][] = []
  for (let i = 0; i < allDates.length; i += 4) {
    pages.push(allDates.slice(i, i + 4))
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 6mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; font-family: Helvetica Neue, Arial, Hiragino Kaku Gothic ProN, sans-serif; }
        .sheet { page-break-after: always; width: 100%; height: 100vh; display: flex; flex-direction: column; }
        .sheet:last-child { page-break-after: avoid; }
        @media screen {
          body { background: #e5e7eb; padding: 16px; }
          .sheet {
            background: white;
            max-width: 794px; margin: 0 auto 24px;
            border-radius: 6px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
            padding: 12px;
            height: auto; min-height: 1060px;
          }
        }
        @media print {
          body { background: white; padding: 0; }
          .sheet { padding: 0; box-shadow: none; height: 100vh; }
          .no-print { display: none !important; }
        }
      ` }} />

      {/* 操作ボタン */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 100 }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '10px 20px', background: '#111827', color: 'white', border: 'none', borderRadius: 10, fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}
        >
          🖨️ 印刷 / PDF保存
        </button>
        <button
          onClick={() => window.close()}
          style={{ padding: '10px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}
        >
          閉じる
        </button>
      </div>

      {pages.map((pageDates, pi) => (
        <div key={pi} className="sheet">

          {/* ページヘッダー */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            borderBottom: '2px solid #111827', paddingBottom: 6, marginBottom: 8, flexShrink: 0,
          }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', color: '#111827' }}>
              {year}年{month}月　シフト一覧表
            </div>
            <div style={{ fontSize: 10, color: '#374151', fontWeight: 'bold' }}>{storeName}</div>
            <div style={{ fontSize: 9, color: '#9ca3af' }}>
              {pi + 1} / {pages.length}ページ　出力：{new Date().toLocaleDateString('ja-JP')}
            </div>
          </div>

          {/* 2×2グリッド */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: 6,
          }}>
            {[0, 1, 2, 3].map(i => {
              const dateStr = pageDates[i]
              if (!dateStr) return <div key={i} />
              return (
                <DayBlock
                  key={dateStr}
                  dateStr={dateStr}
                  staff={staff}
                  overrides={overrides}
                  weeklySchedules={weeklySchedules}
                  defStart={defaultStart}
                  defEnd={defaultEnd}
                />
              )
            })}
          </div>

        </div>
      ))}
    </>
  )
}
