# Cómo Reparar las Políticas RLS en Supabase

El problema es que las políticas antiguas restrictivas aún están activas en la base de datos de Supabase. Necesitas ejecutar el script SQL para limpiarlas.

## Pasos:

1. **Abre Supabase Dashboard**: https://supabase.com/
2. **Selecciona tu proyecto**
3. **Ve a SQL Editor** (Icono de base de datos en el lado izquierdo)
4. **Haz clic en "New Query"**
5. **Copia y pega el contenido completo del archivo `RLS_POLICIES_FIX.sql`** (que está en la raíz del proyecto)
6. **Haz clic en "Run"** (o Ctrl+Enter)
7. **Verifica que no hay errores** - deberías ver al final una tabla con 3 políticas: `movements_open_access`, `category_rules_open_access`, `custom_categories_open_access`

## Qué hace el script:

- ✅ Elimina TODAS las políticas antiguas restrictivas
- ✅ Crea 3 nuevas políticas de acceso abierto
- ✅ Permite a cualquier usuario leer, escribir, actualizar y eliminar CUALQUIER dato

## Después de ejecutar el script:

1. Recarga tu aplicación
2. Las categorías nuevas se guardarán en Supabase automáticamente
3. Podrás verlas en desarrollo y producción (usando la misma DB)
4. No habrá más errores 401 o de RLS

## Si sigue sin funcionar:

- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están correctas en `.env`
- Comprueba en Supabase que las 3 políticas aparecen en: SQL Editor → Table Editor → (cada tabla) → Policies
