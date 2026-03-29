'use client';

// CORRECCIÓN: Ruta relativa directa para evitar errores de Webpack
import Dashboard from '../components/Dashboard';
import emaeData from '../../data/processed/emae_data.json';
import { Title, Text } from '@tremor/react';

export default function EmaePage() {
  return (
    <main className="p-4 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="border-b border-slate-200 pb-5">
          <Title className="text-slate-800 text-2xl font-bold">
            Estimador Mensual de Actividad Económica
          </Title>
          <Text className="text-slate-500 mt-1">
            Series históricas · Base 2004=100 · Fuente: INDEC Argentina
          </Text>
        </div>

        {/* Pasamos los datos al componente con un casting simple */}
        <Dashboard data={emaeData as any} />

        <div className="flex flex-wrap justify-between items-center pt-1 pb-4 gap-2">
          <Text className="text-xs text-slate-400 uppercase tracking-wider">
            Fuente: INDEC — Instituto Nacional de Estadística y Censos
          </Text>
          <Text className="text-xs text-blue-500 font-medium">
            🤖 Datos actualizados vía GitHub Actions
          </Text>
        </div>
      </div>
    </main>
  );
}


