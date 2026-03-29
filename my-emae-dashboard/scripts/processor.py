import pandas as pd
import os
import json

def process_emae():
    dir_del_script = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(dir_del_script, '..', 'data', 'raw', 'emae_gral.xls')
    output_path = os.path.join(dir_del_script, '..', 'data', 'processed', 'emae_data.json')

    if not os.path.exists(input_file):
        print("❌ Archivo no encontrado:", input_file)
        return

    try:
        # ── 1. Leer sin saltar filas para inspeccionar la estructura real ──────
        raw = pd.read_excel(input_file, header=None, engine='xlrd')
        print("🔍 Primeras 8 filas del archivo:")
        print(raw.iloc[:8].to_string())

        # ── 2. Detectar la fila de encabezados ────────────────────────────────
        header_row = 5  # valor por defecto del script original
        for i in range(10):
            row_str = raw.iloc[i].astype(str).str.lower()
            if any(kw in v for v in row_str for kw in ('ndice', 'serie', 'original', 'desestac')):
                header_row = i
                print(f"✅ Encabezados detectados en fila {i}")
                break

        # ── 3. Leer con el encabezado correcto ────────────────────────────────
        df_raw = pd.read_excel(
            input_file,
            engine='xlrd',
            skiprows=header_row,
            header=0,
        )
        print("\n🔍 Columnas detectadas:", df_raw.columns.tolist())

        # ── 4. Detectar columnas que son series de NIVEL (media > 50) ─────────
        #    Esto discrimina entre índices (~90-170) y variaciones (~-30 a +30)
        index_level_cols = []
        for col in df_raw.columns:
            series = pd.to_numeric(df_raw[col], errors='coerce').dropna()
            if len(series) > 50 and series.mean() > 50:
                index_level_cols.append(col)
                print(f"   ✔ Columna de nivel encontrada: '{col}'  (media={series.mean():.1f})")

        if len(index_level_cols) < 2:
            print("❌ No se encontraron suficientes columnas de nivel. "
                  "Revisá el formato del Excel del INDEC.")
            return

        # Las 3 primeras columnas de nivel son: original, desestacionalizada, tendencia_ciclo
        # Si sólo hay 2 (por ejemplo el INDEC omitió la desest.), se usa tendencia como proxy
        col_original       = index_level_cols[0]
        col_desestacional  = index_level_cols[1] if len(index_level_cols) >= 2 else index_level_cols[0]
        col_tendencia      = index_level_cols[2] if len(index_level_cols) >= 3 else index_level_cols[1]

        print(f"\n📌 Mapeo final:"
              f"\n   original          → '{col_original}'"
              f"\n   desestacionalizada → '{col_desestacional}'"
              f"\n   tendencia_ciclo    → '{col_tendencia}'")

        # ── 5. Construir DataFrame limpio ─────────────────────────────────────
        df = pd.DataFrame({
            'original':          pd.to_numeric(df_raw[col_original],      errors='coerce'),
            'desestacionalizada': pd.to_numeric(df_raw[col_desestacional], errors='coerce'),
            'tendencia_ciclo':   pd.to_numeric(df_raw[col_tendencia],     errors='coerce'),
        })

        # Eliminar filas sin dato en la serie principal
        df = df.dropna(subset=['original'])
        df = df[df['original'] > 10]          # descarta ceros o valores basura
        df = df.reset_index(drop=True)

        # ── 6. Crear fechas desde enero 2004 ──────────────────────────────────
        df['date'] = pd.date_range(start='2004-01-01', periods=len(df), freq='MS')
        df['date'] = df['date'].dt.strftime('%b %y')

        # ── 7. Redondear a 4 decimales para aliviar el JSON ───────────────────
        for col in ['original', 'desestacionalizada', 'tendencia_ciclo']:
            df[col] = df[col].round(4)

        # ── 8. Verificación rápida ────────────────────────────────────────────
        print(f"\n📊 Registros procesados: {len(df)}")
        print(f"📊 Rango 'original':          {df['original'].min():.1f} – {df['original'].max():.1f}")
        print(f"📊 Rango 'desestacionalizada': {df['desestacionalizada'].min():.1f} – {df['desestacionalizada'].max():.1f}")
        print(f"📊 Rango 'tendencia_ciclo':    {df['tendencia_ciclo'].min():.1f} – {df['tendencia_ciclo'].max():.1f}")
        print(f"\n🔎 Últimos 3 registros:\n{df.tail(3).to_string()}")

        # ── 9. Guardar JSON ───────────────────────────────────────────────────
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_json(output_path, orient='records', indent=2, force_ascii=False)

        print(f"\n✅ ¡ÉXITO! JSON guardado en {output_path}")

    except Exception as e:
        import traceback
        print(f"❌ ERROR: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    process_emae()
    
    
    
