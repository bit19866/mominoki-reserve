'use client'

import { useEffect } from 'react'

interface Reservation {
  id: string
  customer_name: string | null
  start_time: string
  end_time: string
  status: string
  staff_id: string
  menu: { name: string; price: number; price_ex_tax: number | null; duration_minutes: number } | null
  staff: { name: string } | null
}

interface Staff {
  id: string
  name: string
  sort_order: number
}

interface ShiftInfo {
  isWorking: boolean
  startTime: string
  endTime: string
}

interface Refusal {
  id: string
  refusal_time: string
  reason: string
  notes: string | null
}

interface Props {
  storeName: string
  dateLabel: string
  targetDate: string
  reservations: Reservation[]
  staff: Staff[]
  shiftInfoMap: Record<string, ShiftInfo>
  businessStart: string
  lastCheckin: string
  refusals?: Refusal[]
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
}

// 予約ブロックごとの色（スタッフインデックスで決まる）
const COLORS = [
  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
  { bg: '#dcfce7', border: '#86efac', text: '#14532d' },
  { bg: '#fef9c3', border: '#fde047', text: '#713f12' },
  { bg: '#ede9fe', border: '#c4b5fd', text: '#4c1d95' },
  { bg: '#ffedd5', border: '#fdba74', text: '#7c2d12' },
  { bg: '#cffafe', border: '#67e8f9', text: '#164e63' },
  { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
]

export default function PrintSchedule({
  storeName, dateLabel, reservations, staff,
  shiftInfoMap, businessStart, lastCheckin, refusals = [],
}: Props) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 700)
    return () => clearTimeout(timer)
  }, [])

  const startMin   = timeToMinutes(businessStart)
  const endMin     = timeToMinutes(lastCheckin)
  const totalMins  = endMin - startMin

  // 1時間ごとのラベル
  const hourLabels: string[] = []
  for (let m = startMin; m <= endMin; m += 60) {
    hourLabels.push(minutesToTime(m))
  }

  const confirmed = reservations.filter(r => r.status !== 'cancelled')
  const totalRevenue = confirmed.reduce((s, r) => s + (r.menu?.price || 0), 0)
  const totalRevenueExTax = confirmed.reduce((s, r) => s + (r.menu?.price_ex_tax ?? 0), 0)

  // スタッフインデックスマップ
  const staffIndexMap = Object.fromEntries(staff.map((s, i) => [s.id, i]))

  // グリッド定数（印刷用に小さめ）
  const STAFF_COL  = 64   // px: スタッフ名列幅
  const ROW_HEIGHT = 48   // px: 行の高さ
  const GRID_WIDTH = 900  // px: グリッド全体幅（時間部分）

  const minToX = (min: number) => ((min - startMin) / totalMins) * GRID_WIDTH

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: white; font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', sans-serif; }
        @media screen {
          body { background: #f3f4f6; padding: 20px; }
          .page { background: white; max-width: 1040px; margin: 0 auto; border-radius: 10px; box-shadow: 0 4px 24px rgba(0,0,0,0.12); padding: 24px; }
        }
        @media print {
          body { background: white; padding: 0; }
          .page { padding: 0; box-shadow: none; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* 画面ボタン */}
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

      <div className="page">

        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2.5px solid #111827', paddingBottom: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: 2 }}>予約スケジュール</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>{storeName}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{dateLabel}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>出力：{new Date().toLocaleString('ja-JP')}</div>
          </div>
        </div>

        {/* サマリー */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {[
            { label: '予約件数', value: `${confirmed.length}件`, border: '#3b82f6' },
            { label: '売上合計（税込）', value: `¥${totalRevenue.toLocaleString()}`, border: '#ec4899' },
            { label: '売上合計（税抜）', value: `¥${totalRevenueExTax.toLocaleString()}`, border: '#f97316' },
            { label: '断り件数', value: `${refusals.length}件`, border: '#f97316' },
          ].map(item => (
            <div key={item.label} style={{ border: '1px solid #e5e7eb', borderLeft: `4px solid ${item.border}`, borderRadius: 8, padding: '6px 12px', minWidth: 150 }}>
              <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* スケジュールグリッド */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ width: STAFF_COL + GRID_WIDTH + 'px' }}>

            {/* 時間ヘッダー */}
            <div style={{ display: 'flex', backgroundColor: '#1f2937', color: 'white' }}>
              <div style={{ width: STAFF_COL, flexShrink: 0, padding: '6px 0', textAlign: 'center', fontSize: 10, fontWeight: 'bold', borderRight: '1px solid #374151' }}>
                スタッフ
              </div>
              <div style={{ position: 'relative', flex: 1, height: 28 }}>
                {hourLabels.map(label => {
                  const x = minToX(timeToMinutes(label))
                  return (
                    <div key={label} style={{
                      position: 'absolute',
                      left: x,
                      top: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 4,
                      fontSize: 11,
                      fontWeight: 'bold',
                      borderLeft: '1px solid #374151',
                      minWidth: 1,
                    }}>
                      {label}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* スタッフ行 */}
            {staff.map((s, si) => {
              const shift      = shiftInfoMap[s.id] || { isWorking: true, startTime: businessStart, endTime: lastCheckin }
              const staffResos = confirmed.filter(r => r.staff_id === s.id)
              const color      = COLORS[si % COLORS.length]
              const isOff      = !shift.isWorking

              return (
                <div key={s.id} style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', position: 'relative', height: ROW_HEIGHT }}>

                  {/* スタッフ名列 */}
                  <div style={{
                    width: STAFF_COL, flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRight: '1px solid #e5e7eb',
                    backgroundColor: isOff ? '#f9fafb' : 'white',
                    padding: '2px 4px',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 'bold', color: isOff ? '#9ca3af' : '#1f2937' }}>
                      {s.name}
                    </span>
                    {!isOff && (
                      <span style={{ fontSize: 9, color: '#16a34a', marginTop: 1 }}>
                        {shift.startTime}〜{shift.endTime}
                      </span>
                    )}
                    {isOff && (
                      <span style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>休み</span>
                    )}
                  </div>

                  {/* グリッドエリア */}
                  <div style={{ position: 'relative', flex: 1, backgroundColor: isOff ? '#f9fafb' : '#f0fdf4' }}>

                    {/* グリッド線 */}
                    {hourLabels.map(label => {
                      const x = minToX(timeToMinutes(label))
                      return (
                        <div key={label} style={{
                          position: 'absolute', left: x, top: 0, bottom: 0,
                          borderLeft: '1px solid #d1d5db',
                          pointerEvents: 'none',
                        }} />
                      )
                    })}

                    {/* 出勤時間帯ハイライト */}
                    {!isOff && (
                      <div style={{
                        position: 'absolute',
                        left: minToX(timeToMinutes(shift.startTime)),
                        width: minToX(timeToMinutes(shift.endTime)) - minToX(timeToMinutes(shift.startTime)),
                        top: 0, bottom: 0,
                        backgroundColor: '#dcfce7',
                        borderLeft: '2px solid #86efac',
                        borderRight: '2px solid #86efac',
                      }} />
                    )}

                    {/* 予約ブロック */}
                    {staffResos.map(r => {
                      const rStart = timeToMinutes(String(r.start_time).slice(0, 5))
                      const rEnd   = timeToMinutes(String(r.end_time).slice(0, 5))
                      const left   = minToX(rStart)
                      const width  = minToX(rEnd) - left - 2
                      const c      = COLORS[staffIndexMap[r.staff_id] % COLORS.length]

                      return (
                        <div key={r.id} style={{
                          position: 'absolute',
                          left: left + 1,
                          width: Math.max(width, 30),
                          top: 3, bottom: 3,
                          backgroundColor: c.bg,
                          border: `1.5px solid ${c.border}`,
                          borderRadius: 5,
                          padding: '2px 4px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          zIndex: 10,
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 'bold', color: c.text, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.customer_name || '匿名'}
                          </div>
                          <div style={{ fontSize: 9, color: c.text, opacity: 0.8, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.menu?.name}
                          </div>
                          <div style={{ fontSize: 8, color: c.text, opacity: 0.6, lineHeight: 1.2 }}>
                            {String(r.start_time).slice(0,5)}〜{String(r.end_time).slice(0,5)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 断り記録 */}
        {refusals.length > 0 && (
          <div style={{ marginTop: 14, borderTop: '1.5px solid #fed7aa', paddingTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 'bold', color: '#c2410c', marginBottom: 6 }}>
              断り記録　計{refusals.length}件
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ backgroundColor: '#fff7ed' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #fed7aa', color: '#9a3412', width: 80 }}>時刻</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #fed7aa', color: '#9a3412', width: 160 }}>理由</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #fed7aa', color: '#9a3412' }}>メモ</th>
                </tr>
              </thead>
              <tbody>
                {refusals.map((r, i) => (
                  <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fff7ed' }}>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #fed7aa', fontWeight: 'bold', fontFamily: 'monospace', color: '#c2410c' }}>
                      {r.refusal_time.slice(0, 5)}
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #fed7aa', color: '#374151' }}>{r.reason}</td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #fed7aa', color: '#6b7280' }}>{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 凡例 */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 9, color: '#6b7280', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 10, backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: 2 }} />
            <span>出勤時間帯</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 10, backgroundColor: '#fce7f3', border: '1px solid #f9a8d4', borderRadius: 2 }} />
            <span>予約あり</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {storeName} — {dateLabel}
          </div>
        </div>

      </div>
    </>
  )
}
