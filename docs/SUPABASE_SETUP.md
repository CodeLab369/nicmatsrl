# Guía de Configuración de Supabase para NICMAT S.R.L.

Esta guía te ayudará a configurar Supabase para el sistema de gestión de inventario y cotizaciones.

## 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) e inicia sesión
2. Click en "New Project"
3. Completa los datos:
   - **Name**: `nicmat-srl` (o el nombre que prefieras)
   - **Database Password**: Genera una contraseña segura y guárdala
   - **Region**: Selecciona la más cercana (ej: South America - São Paulo)
4. Click en "Create new project"
5. Espera a que el proyecto se cree (puede tomar unos minutos)

## 2. Obtener las Credenciales

1. En tu proyecto de Supabase, ve a **Settings** (ícono de engranaje)
2. Click en **API** en el menú lateral
3. Copia los siguientes valores:
   - **Project URL**: Este es tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: Este es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Configurar Variables de Entorno

1. En tu proyecto local, crea el archivo `.env.local`:

```bash
cp .env.example .env.local
```

2. Edita `.env.local` con tus credenciales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. Ejecutar las Migraciones

1. En Supabase Dashboard, ve a **SQL Editor**
2. Click en "New query"
3. Copia y pega el contenido de `supabase/migrations/001_create_users_table.sql`
4. Click en "Run" (o Ctrl+Enter)
5. Verifica que no haya errores

## 5. Crear el Usuario Admin Inicial

### Paso 5.1: Crear usuario en Authentication

1. Ve a **Authentication** > **Users**
2. Click en **Add user** > **Create new user**
3. Completa:
   - **Email**: `nestor@nicmat.local`
   - **Password**: `1346795`
   - **Auto Confirm User**: ✓ Activar
4. Click en **Create user**
5. **IMPORTANTE**: Copia el **UUID** del usuario creado (lo verás en la lista)

### Paso 5.2: Crear registro en la tabla users

1. Ve a **SQL Editor**
2. Ejecuta el siguiente SQL (reemplaza `TU_UUID_AQUI` con el UUID copiado):

```sql
INSERT INTO public.users (auth_id, username, full_name, role, is_active)
VALUES (
    'TU_UUID_AQUI'::uuid,
    'Nestor',
    'Nestor (Administrador)',
    'admin',
    true
);
```

3. Verifica que se creó correctamente:

```sql
SELECT * FROM public.users WHERE username = 'Nestor';
```

## 6. Verificar la Configuración

1. Inicia el servidor de desarrollo:

```bash
npm run dev
```

2. Abre [http://localhost:3000](http://localhost:3000)
3. Intenta iniciar sesión con:
   - **Usuario**: `Nestor`
   - **Contraseña**: `1346795`

## 7. Despliegue en Vercel

### Paso 7.1: Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit - NICMAT S.R.L. Sistema de Gestión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/nicmat-srl.git
git push -u origin main
```

### Paso 7.2: Conectar con Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Importa tu repositorio de GitHub
3. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click en "Deploy"

## Solución de Problemas

### Error: "Invalid credentials"
- Verifica que el email en Supabase Auth sea exactamente `nestor@nicmat.local`
- Verifica que la contraseña sea exactamente `1346795`
- Asegúrate de que el usuario esté confirmado en Authentication

### Error: "User not found in database"
- Verifica que el `auth_id` en la tabla users coincida con el UUID del usuario en Authentication
- Ejecuta: `SELECT * FROM public.users;` para ver los usuarios

### Error: "Permission denied"
- Verifica que las políticas RLS estén correctamente configuradas
- Asegúrate de haber ejecutado toda la migración SQL

## Estructura de la Base de Datos

### Tabla: users
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único (PK) |
| auth_id | UUID | Referencia a auth.users |
| username | VARCHAR(50) | Nombre de usuario único |
| full_name | VARCHAR(100) | Nombre completo |
| role | VARCHAR(20) | 'admin' o 'user' |
| is_active | BOOLEAN | Estado del usuario |
| last_login | TIMESTAMPTZ | Último acceso |
| created_at | TIMESTAMPTZ | Fecha de creación |
| updated_at | TIMESTAMPTZ | Última actualización |

---

**NICMAT S.R.L.** - Sistema de Gestión de Inventario y Cotizaciones
