'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  BarChart,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Text,
  Flex,
  Metric,
  BadgeDelta,
} from '@tremor/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type DataPoint = {
  original: number;
  desestacionalizada: number;
  tendencia_ciclo: number;
  date: string;
};

type TimeRange = '2a' | '5a' | '10a' | 'todo';
type SeriesKey = 'original' | 'desestacionalizada' | 'tendencia_ciclo';

interface DashboardProps {
  data: DataPoint[];
}

// Paleta fuerte y diferenciada — control total vía Recharts
const SERIES_CONFIG: {
  key: SeriesKey;
  label: string;
  stroke: string;   // color del borde (línea)
  fill: string;     // color del área
  activeClass: string;
  inactiveClass: string;
}[] = [
  {
    key: 'original',
    label: 'Original',
    stroke: '#1d4ed8',   // blue-700
    fill: '#3b82f6',     // blue-500
    activeClass: 'bg-blue-100 text-blue-700 border-blue-300',
    inactiveClass: 'bg-white text-slate-400 border-slate-200',
  },
  {
    key: 'desestacionalizada',
    label: 'Desestacionalizada',
    stroke: '#047857',   // emerald-700
    fill: '#10b981',     // emerald-500
    activeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    inactiveClass: 'bg-white text-slate-400 border-slate-200',
  },
  {
    key: 'tendencia_ciclo',
    label: 'Tendencia Ciclo',
    stroke: '#c2410c',   // orange-700
    fill: '#f97316',     // orange-500
    activeClass: 'bg-orange-100 text-orange-700 border-orange-300',
    inactiveClass: 'bg-white text-slate-400 border-slate-200',
  },
];

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '2a', value: '2a' },
  { label: '5a', value: '5a' },
  { label: '10a', value: '10a' },
  { label: 'Todo', value: 'todo' },
];

const MONTHS_MAP: Record<TimeRange, number> = {
  '2a': 24, '5a': 60, '10a': 120, todo: Infinity,
};

const fmtIndex = (n: number) =>
  Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

// ID únicos para los gradientes SVG
const GRADIENT_IDS = ['grad-original', 'grad-desest', 'grad-tendencia'];

export default function Dashboard({ data }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('5a');
  const [activeSeries, setActiveSeries] = useState<Set<SeriesKey>>(
    new Set<SeriesKey>(['original', 'desestacionalizada', 'tendencia_ciclo'])
  );

  const kpiData = useMemo(() => {
    if (!data || data.length < 13) return null;
    const lastPoint = data[data.length - 1];
    const yearAgoPoint = data[data.length - 13];
    const yoy = ((lastPoint.original - yearAgoPoint.original) / yearAgoPoint.original) * 100;
    const maxHistorical = Math.max(...data.map((d) => d.original));
    const distToMax = ((lastPoint.original - maxHistorical) / maxHistorical) * 100;
    return {
      last: lastPoint,
      yearAgo: yearAgoPoint,
      yoy: parseFloat(yoy.toFixed(1)),
      maxHistorical,
      distToMax: parseFloat(distToMax.toFixed(1)),
    };
  }, [data]);

  const filteredData = useMemo(() => {
    const months = MONTHS_MAP[timeRange];
    return months === Infinity ? data : data.slice(-months);
  }, [timeRange, data]);

  // Datos para Recharts (claves directas del JSON)
  const chartData = useMemo(() => filteredData, [filteredData]);

  const yoyData = useMemo(() => {
    const months = MONTHS_MAP[timeRange];
    const contextStart = months === Infinity ? 0 : Math.max(0, data.length - months - 12);
    const contextData = data.slice(contextStart);
    return contextData.slice(12).map((d, i) => ({
      date: d.date,
      'Var. interanual (%)': parseFloat(
        (((d.original - contextData[i].original) / contextData[i].original) * 100).toFixed(2)
      ),
    }));
  }, [timeRange, data]);

  const momData = useMemo(() => {
    const months = MONTHS_MAP[timeRange];
    const contextStart = months === Infinity ? 0 : Math.max(0, data.length - months - 1);
    const contextData = data.slice(contextStart);
    return contextData.slice(1).map((d, i) => ({
      date: d.date,
      'Var. mensual (%)': parseFloat(
        (((d.desestacionalizada - contextData[i].desestacionalizada) /
          contextData[i].desestacionalizada) * 100).toFixed(2)
      ),
    }));
  }, [timeRange, data]);

  const customTooltip = (props: any) => {
    const { payload, active } = props;
    if (!active || !payload || payload.length === 0) return null;
    const value = payload[0].value;
    const categoryName = payload[0].name;
    const dataPoint = payload[0].payload;
    const isPositive = value >= 0;
    const helpText = categoryName.toLowerCase().includes('mensual')
      ? 'Variación respecto al mes anterior (desestacionalizada)'
      : 'Variación respecto al mismo mes del año anterior (original)';
    return (
      <div className="bg-white p-4 shadow-xl rounded-lg border border-slate-100">
        <Text className="text-slate-400 text-xs">{dataPoint.date}</Text>
        <Flex justifyContent="start" alignItems="center" className="space-x-2 mt-1">
          <span className={`text-2xl ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '▲' : '▼'}
          </span>
          <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
            {fmtPct(value)}
          </p>
        </Flex>
        <Text className="text-slate-500 text-xs mt-2 leading-relaxed">{helpText}</Text>
      </div>
    );
  };

  // Tooltip personalizado para el gráfico de niveles (Recharts nativo)
  const levelsTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-white p-3 shadow-xl rounded-lg border border-slate-100 text-sm">
        <p className="text-slate-400 text-xs mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
            <span
              style={{ background: entry.stroke, width: 10, height: 10, borderRadius: 2, display: 'inline-block' }}
            />
            <span className="text-slate-600 text-xs">{entry.name}:</span>
            <span className="font-semibold text-slate-800 text-xs">{fmtIndex(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const toggleSeries = (key: SeriesKey) => {
    const next = new Set(activeSeries);
    if (next.has(key)) { if (next.size > 1) next.delete(key); }
    else { next.add(key); }
    setActiveSeries(next);
  };

  const activeSC = SERIES_CONFIG.filter((s) => activeSeries.has(s.key));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {kpiData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card decoration="top" decorationColor="blue" className="bg-white shadow-sm p-6">
            <Text className="text-slate-400 text-xs uppercase tracking-wider font-medium">
              Último valor (Original)
            </Text>
            <Flex justifyContent="start" alignItems="end" className="space-x-2 mt-2">
              <Metric className="text-3xl font-bold text-slate-800">
                {fmtIndex(kpiData.last.original)}
              </Metric>
              <Text className="text-slate-400 text-xs pb-1">{kpiData.last.date}</Text>
            </Flex>
            <Text className="text-slate-400 text-xs mt-1">Base 2004=100</Text>
          </Card>

          <Card decoration="top" decorationColor="emerald" className="bg-white shadow-sm p-6">
            <Text className="text-slate-400 text-xs uppercase tracking-wider font-medium">
              Variación Interanual
            </Text>
            <Flex justifyContent="start" alignItems="end" className="space-x-3 mt-2">
              <Metric className="text-3xl font-bold text-slate-800">{fmtPct(kpiData.yoy)}</Metric>
              <BadgeDelta
                deltaType={kpiData.yoy >= 0 ? 'moderateIncrease' : 'moderateDecrease'}
                size="xs"
              >
                {kpiData.yoy >= 0 ? 'Expansión' : 'Contracción'}
              </BadgeDelta>
            </Flex>
            <Text className="text-slate-400 text-xs mt-1">vs {kpiData.yearAgo.date}</Text>
          </Card>

          <Card decoration="top" decorationColor="amber" className="bg-white shadow-sm p-6">
            <Text className="text-slate-400 text-xs uppercase tracking-wider font-medium">
              Máximo Histórico
            </Text>
            <Flex justifyContent="start" alignItems="end" className="space-x-3 mt-2">
              <Metric className="text-3xl font-bold text-slate-800">
                {fmtIndex(kpiData.maxHistorical)}
              </Metric>
              <Text className={`text-sm pb-1 ${kpiData.distToMax < -0.5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {kpiData.distToMax < -0.5
                  ? `${kpiData.distToMax.toFixed(1)}% del pico`
                  : 'En máximo histórico'}
              </Text>
            </Flex>
            <Text className="text-slate-400 text-xs mt-1">Serie original</Text>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      <Card className="bg-white shadow-sm p-6">
        <div className="md:flex justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  timeRange === r.value
                    ? 'bg-white shadow text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SERIES_CONFIG.map((s) => (
              <button
                key={s.key}
                onClick={() => toggleSeries(s.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeSeries.has(s.key) ? s.activeClass : s.inactiveClass
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <TabGroup>
          <TabList variant="line">
            <Tab className="px-4 py-2 text-sm">Niveles (Índice)</Tab>
            <Tab className="px-4 py-2 text-sm">Var. Interanual</Tab>
            <Tab className="px-4 py-2 text-sm">Var. Mensual</Tab>
          </TabList>

          <TabPanels>
            {/* Panel 1: Recharts nativo — control total de colores */}
            <TabPanel>
              <div className="mt-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    key={`${Array.from(activeSeries).join(',')}-${timeRange}`}
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <defs>
                      {SERIES_CONFIG.map((s, i) => (
                        <linearGradient key={s.key} id={GRADIENT_IDS[i]} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={s.fill} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={s.fill} stopOpacity={0.02} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={56}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={fmtIndex}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip content={levelsTooltip} />
                    <Legend
                      formatter={(value) => (
                        <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>
                      )}
                    />
                    {SERIES_CONFIG.map((s, i) =>
                      activeSeries.has(s.key) ? (
                        <Area
                          key={s.key}
                          type="monotone"
                          dataKey={s.key}
                          name={s.label}
                          stroke={s.stroke}
                          strokeWidth={3}
                          fill={`url(#${GRADIENT_IDS[i]})`}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 2, stroke: s.stroke, fill: '#fff' }}
                          isAnimationActive={false}
                        />
                      ) : null
                    )}
                  </AreaChart>
                </ResponsiveContainer>
                <Text className="text-slate-400 text-xs mt-2 text-right italic">
                  Índice base 2004=100
                </Text>
              </div>
            </TabPanel>

            {/* Panel 2: Var. interanual */}
            <TabPanel>
              <div className="mt-8">
                <BarChart
                  className="h-80"
                  data={yoyData}
                  index="date"
                  categories={['Var. interanual (%)']}
                  colors={['blue']}
                  valueFormatter={fmtPct}
                  yAxisWidth={56}
                  customTooltip={customTooltip}
                />
                <Text className="text-slate-400 text-xs mt-3 text-right italic">
                  Calculado sobre la serie original sin desestacionalizar
                </Text>
              </div>
            </TabPanel>

            {/* Panel 3: Var. mensual */}
            <TabPanel>
              <div className="mt-8">
                <BarChart
                  className="h-80"
                  data={momData}
                  index="date"
                  categories={['Var. mensual (%)']}
                  colors={['emerald']}
                  valueFormatter={fmtPct}
                  yAxisWidth={56}
                  customTooltip={customTooltip}
                />
                <Text className="text-slate-400 text-xs mt-3 text-right italic">
                  Calculado sobre la serie desestacionalizada
                </Text>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </Card>
    </div>
  );
}


