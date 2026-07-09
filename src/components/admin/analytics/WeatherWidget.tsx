// Server component — 30分キャッシュで富士市の天気を取得
const WMO: Record<number, { label: string; icon: string; bg: string }> = {
  0:  { label: '快晴',       icon: '☀️',  bg: 'from-amber-50 to-orange-100'  },
  1:  { label: '晴れ',       icon: '🌤️', bg: 'from-sky-50  to-blue-100'    },
  2:  { label: '一部曇り',   icon: '⛅',  bg: 'from-sky-50  to-blue-100'    },
  3:  { label: '曇り',       icon: '☁️',  bg: 'from-gray-100 to-slate-200'  },
  45: { label: '霧',         icon: '🌫️', bg: 'from-gray-100 to-slate-200'  },
  48: { label: '霧',         icon: '🌫️', bg: 'from-gray-100 to-slate-200'  },
  51: { label: '小雨',       icon: '🌦️', bg: 'from-sky-100 to-blue-200'    },
  53: { label: '雨',         icon: '🌧️', bg: 'from-sky-100 to-blue-200'    },
  55: { label: '強雨',       icon: '🌧️', bg: 'from-sky-100 to-blue-200'    },
  61: { label: '小雨',       icon: '🌦️', bg: 'from-sky-100 to-blue-200'    },
  63: { label: '雨',         icon: '🌧️', bg: 'from-sky-100 to-blue-200'    },
  65: { label: '大雨',       icon: '⛈️',  bg: 'from-slate-200 to-gray-300' },
  71: { label: '雪',         icon: '❄️',  bg: 'from-blue-50  to-indigo-100' },
  73: { label: '雪',         icon: '❄️',  bg: 'from-blue-50  to-indigo-100' },
  80: { label: 'にわか雨',   icon: '🌦️', bg: 'from-sky-100 to-blue-200'    },
  81: { label: 'にわか雨',   icon: '🌦️', bg: 'from-sky-100 to-blue-200'    },
  95: { label: '雷雨',       icon: '⛈️',  bg: 'from-slate-200 to-gray-300' },
}

function getWmo(code: number) {
  // 近い値を検索
  return WMO[code] ?? WMO[Math.floor(code / 10) * 10] ?? { label: '天気情報なし', icon: '—', bg: 'from-gray-50 to-gray-100' }
}

interface WeatherData {
  current_weather: { temperature: number; windspeed: number; weathercode: number }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weathercode: number[]
    precipitation_sum: number[]
  }
}

const DAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

export default async function WeatherWidget() {
  let weather: WeatherData | null = null
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=35.1636&longitude=138.6771' +
      '&current_weather=true' +
      '&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum' +
      '&timezone=Asia%2FTokyo&forecast_days=7',
      { next: { revalidate: 1800 } },
    )
    if (res.ok) weather = await res.json()
  } catch {
    // ネットワークエラー時はウィジェット非表示
  }

  if (!weather?.current_weather) return null

  const cur   = weather.current_weather
  const daily = weather.daily
  const wmo   = getWmo(cur.weathercode)

  return (
    <div className={`rounded-xl p-4 border border-sky-200/70 bg-gradient-to-br ${wmo.bg} mb-5`}>
      <div className="flex items-center gap-6 flex-wrap">

        {/* 現在の天気 */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-4xl leading-none">{wmo.icon}</span>
          <div>
            <p className="text-xs text-sky-600 font-medium">富士市 現在</p>
            <p className="text-3xl font-bold text-sky-900 tabular-nums">{cur.temperature.toFixed(1)}°C</p>
            <p className="text-xs text-sky-600 mt-0.5">{wmo.label}　風速 {cur.windspeed} km/h</p>
          </div>
        </div>

        {/* 今日の最高/最低 */}
        <div className="text-sm text-sky-700">
          <p className="font-semibold text-sky-900">
            最高 {daily.temperature_2m_max[0]}° / 最低 {daily.temperature_2m_min[0]}°
          </p>
          {(daily.precipitation_sum[0] ?? 0) > 0 && (
            <p className="text-xs mt-0.5">降水量 {daily.precipitation_sum[0].toFixed(1)} mm</p>
          )}
        </div>

        {/* 5日間予報 */}
        <div className="flex items-center gap-3 ml-auto">
          {daily.time.slice(1, 6).map((date, i) => {
            const d   = new Date(date)
            const w   = getWmo(daily.weathercode[i + 1])
            const dow = DAYS_JA[d.getDay()]
            return (
              <div key={date} className="text-center min-w-[2.5rem]">
                <p className="text-[10px] text-sky-500 font-medium">{d.getDate()}({dow})</p>
                <p className="text-lg leading-tight my-0.5">{w.icon}</p>
                <p className="text-[10px] text-sky-700 font-bold">{Math.round(daily.temperature_2m_max[i + 1])}°</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
