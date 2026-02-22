# 🦅 YachayAgro - El Imperio Digital de la Agronomía

**YachayAgro** es un proyecto de práctica diseñado para la gestión y control de información agrícola, inspirado en la organización y sabiduría del **Tahuantinsuyo**. Este sistema combina la potencia de un backend sólido en Django con la elegancia y velocidad de un frontend moderno en Vue 3.

---

## 🏛️ El Concepto: Yachay (Saber) + Agro

Así como los Incas dominaron los Andes mediante andenes y sistemas de riego avanzados, **YachayAgro** busca dominar los datos mediante una arquitectura limpia y escalable.

- **Chasquis (Backend):** Nuestro backend en Django se encarga de transportar y procesar la información de manera segura y eficiente.
- **Quipus (Frontend):** Nuestra interfaz en Vue 3 + Nuxt UI organiza el conocimiento para que sea accesible y visualmente impactante.

---

## 🛠️ Stack Tecnológico

### Backend (Meteorite Backend)

- **Framework:** [Django 5.x](https://www.djangoproject.com/)
- **API:** Django REST Framework
- **Base de Datos:** PostgreSQL
- **Seguridad:** Middleware personalizado para autenticación y gestión de roles.
- **Utilidades:** Reportes en Excel personalizados y validadores masivos.

### Frontend (YachayAgro Frontend)

- **Framework:** [Vue 3](https://vuejs.org/) + [Nuxt UI](https://ui.nuxt.com/)
- **Grid:** [Handsontable](https://handsontable.com/) para una gestión de datos tipo Excel.
- **Estado:** Reactividad nativa de Vue 3 (Composables).
- **Diseño:** Moderno, con soporte para Modo Oscuro/Claro y animaciones fluidas.

### Herramientas de Despliegue

- **Docker:** Orquestación de contenedores para un entorno de desarrollo reproducible.
- **Docker Compose:** Gestión multi-contenedor (DB + Backend).

---

## 🚀 Instalación y Mantenimiento (vía Docker)

El proyecto está diseñado para ser gestionado a través de **Docker Compose**, lo que garantiza que todos "beban de la misma chicha" (entorno unificado).

### 🐳 1. Levantar el Imperio

Desde la raíz del proyecto, construye y arranca todos los servicios:

```bash
docker compose up --build
```

### 🔨 2. Comandos de Administración (Chasqui Commands)

Una vez que los contenedores estén corriendo, usa estos comandos para gestionar el backend:

- **Efectuar Migraciones:**
  ```bash
  docker compose exec web python manage.py migrate
  ```
- **Crear Superusuario:**
  ```bash
  docker compose exec web python manage.py createsuperuser
  ```
- **Entrar al Shell de Django:**
  ```bash
  docker compose exec web python manage.py shell
  ```

---

## 🐍 Instalación Manual (Opcional - Desarrollo Local)

Si prefieres no usar Docker para el desarrollo de código:

### Backend

1. Navega a `meteorite_backend/` y crea tu entorno virtual: `python -m venv venv`.
2. Activa e instala: `pip install -r requirements.txt`.
3. Configura tu `.env` y corre: `python manage.py runserver`.

### Frontend

1. Navega a `YachayAgro-frontend/` e instala dependencias: `pnpm install`.
2. Corre el servidor de desarrollo: `npm run dev`.

---

## 🏛️ Control de Calidad y Validación (QA)

Antes de realizar un commit o push, es obligatorio validar que el código cumple con los estándares del Imperio. Ejecuta estos comandos paso a paso:

### Backend (Chasqui Checks)

1. **Pruebas Unitarias**:
   ```bash
   python manage.py test
   ```
2. **Linting (Estilo de Código)**:
   ```bash
   flake8 . --exclude=venv,*/migrations/*
   ```
3. **Seguridad (Escaneo Bandit)**:
   ```bash
   bandit -r . -x ./venv,./tests --severity-level medium
   ```

### Frontend (Quipu Checks)

1. **Auditoría de Seguridad**:
   ```bash
   pnpm audit
   ```
2. **Validación Integral (CI Style)**:
   ```bash
   pnpm ci:validate
   ```
   _(Este comando ejecuta automáticamente: lint, format:check, typecheck, build y vitest)_

---

## 🛠️ Convenciones de Commit (Git)

Para mantener la integridad de nuestro pipeline y un historial de cambios limpio, seguimos el estándar de **Conventional Commits**. Cada commit debe describir claramente su propósito.

### Estructura del Mensaje

`type(scope): description`

### Tipos Permitidos:

- **feat**: Una nueva característica para el usuario.
- **fix**: Corrección de un error (bug).
- **docs**: Cambios solo en la documentación.
- **style**: Cambios que no afectan el significado del código (espacios, formato, etc.).
- **refactor**: Cambio en el código que no corrige un error ni añade una característica.
- **perf**: Cambio en el código que mejora el rendimiento.
- **test**: Añadir pruebas faltantes o corregir pruebas existentes.
- **build**: Cambios que afectan el sistema de construcción o dependencias externas.
- **ci**: Cambios en nuestros archivos y scripts de configuración de CI/CD.
- **chore**: Otros cambios que no modifican los archivos `src` o `test`.
- **revert**: Revertir un commit anterior.

### Ejemplos:

- `feat(auth): implementar validación de código por correo`
- `fix(table): corregir scroll lateral en vista de cultivos`
- `docs(readme): agregar estándares de commit`

---

## 📜 Licencia e Historia

Este es un proyecto de **práctica personal** creado por **ADolmos194**. Su objetivo es dominar las tecnologías modernas aplicadas a casos de uso reales en el sector agrícola, manteniendo vivo el espíritu de eficiencia de nuestra cultura ancestral.

> _"Ama Sua, Ama Llulla, Ama Quella"_ (No seas ladrón, no seas mentiroso, no seas perezoso).
