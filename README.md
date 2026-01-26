# NICMAT S.R.L. - Sistema de Gestión de Inventario y Cotizaciones

Sistema web moderno para la gestión de inventario y cotizaciones de baterías.

## 🚀 Tecnologías

- **Next.js 14** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Supabase** - Backend como servicio (Auth, Database, Realtime)
- **Tailwind CSS** - Estilos utilitarios
- **Shadcn/ui** - Componentes UI accesibles

## 📁 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── (auth)/            # Rutas de autenticación
│   ├── (dashboard)/       # Rutas protegidas del dashboard
│   └── api/               # API Routes
├── components/            # Componentes React
│   ├── ui/               # Componentes UI base
│   ├── forms/            # Formularios
│   └── layout/           # Componentes de layout
├── lib/                   # Utilidades y configuraciones
│   ├── supabase/         # Cliente y utilidades de Supabase
│   ├── utils/            # Funciones utilitarias
│   └── validations/      # Esquemas de validación Zod
├── hooks/                 # Custom React Hooks
├── types/                 # Definiciones de TypeScript
└── constants/             # Constantes de la aplicación
```

## 🔧 Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### 2. Instalación

```bash
npm install
```

### 3. Desarrollo

```bash
npm run dev
```

### 4. Construcción

```bash
npm run build
```

## 🗄️ Base de Datos

Ejecuta las migraciones en Supabase SQL Editor (ver `/supabase/migrations/`).

## 👤 Usuario Inicial

- **Usuario:** Nestor
- **Contraseña:** 1346795
- **Rol:** Admin

## 📝 Licencia

Privado - NICMAT S.R.L. © 2026
