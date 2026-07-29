# Test: Verificar que assigned_category está funcionando

## Paso 1: Verificar la columna en Supabase
Ejecuta en SQL Editor de Supabase:
```sql
-- Ver si la columna existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'movements' AND column_name = 'assigned_category';

-- Ver la estructura de la tabla
\d movements;
```

**Resultado esperado**: Debe mostrar que existe la columna `assigned_category` de tipo `text`.

---

## Paso 2: Verificar un UPDATE manual
```sql
-- Actualizar un movimiento (reemplaza el UUID)
UPDATE movements 
SET assigned_category = 'Restaurantes' 
WHERE id = 'TU_MOVEMENT_ID_AQUI'
RETURNING id, concept, assigned_category;
```

**Resultado esperado**: Debe retornar la fila con `assigned_category = 'Restaurantes'`.

---

## Paso 3: Verificar un SELECT
```sql
-- Seleccionar movimientos con assigned_category
SELECT id, concept, assigned_category
FROM movements 
WHERE assigned_category IS NOT NULL
LIMIT 10;
```

**Resultado esperado**: Si asignaste categorías en la app, debe mostrarlas aquí.

---

## Paso 4: Verificar RLS policies
```sql
-- Ver todas las políticas
SELECT policyname, QUAL, WITH_CHECK 
FROM pg_policies 
WHERE tablename = 'movements';
```

**Resultado esperado**: Debe haber una política llamada `movements_full_access`.

---

## Si todo está correcto pero aún no funciona:
- Abre DevTools (F12) en la app → Network → Filtra por "movements"
- Intenta asignar una categoría
- Verifica qué error devuelve Supabase
