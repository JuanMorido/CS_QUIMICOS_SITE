# MIGRATION_NOTES.md — CS Químicos → Next.js

> **Fase 0 — Auditoría.** Documento generado antes de tocar código.
> Última actualización: 2026-05-22.

---

## 1. Inventario de páginas (HTML reales en el repo)

El repo tiene **más páginas que las "6" indicadas en el prompt**. Inventario completo:

### Raíz — páginas principales (6)
| # | Archivo | URL pública actual | Propósito |
|---|---------|--------------------|-----------|
| 1 | `index.html` | `https://csquimicos.com/` | Landing. Hero split + sección "¿Por qué CS Químicos?" + CTAs a WhatsApp y catálogo. |
| 2 | `nosotros.html` | `/nosotros.html` | Sobre la empresa. Hero, compromiso ambiental, timeline 2022–hoy. |
| 3 | `productos.html` | `/productos.html` | Catálogo + carrito. 6 categorías, 64 productos con `data-name`. Tamaño ~237 KB. |
| 4 | `recursos.html` | `/recursos.html` | Calculadora de piscina + 5 fichas técnicas (PDF) + grid de 5 artículos del blog. |
| 5 | `contacto.html` | `/contacto.html` | Sedes (3 mapas), formulario de contacto (EmailJS), info cards. |
| 6 | `privacy-policy.html` | `/privacy-policy.html` | Política de privacidad (Ley 1581/2012 CO). `noindex`. |

### Página de error
| # | Archivo | URL | Propósito |
|---|---------|-----|-----------|
| 7 | `404.html` | `/404.html` | Página de error 404. `noindex`. |

### Artículos del blog (`articulos/`)
| # | Archivo | URL |
|---|---------|-----|
| 8  | `acido-muriatico-limpieza-industrial.html` | `/articulos/acido-muriatico-limpieza-industrial.html` |
| 9  | `amonio-cuaternario-desinfeccion-industria-alimentaria.html` | `/articulos/amonio-cuaternario-desinfeccion-industria-alimentaria.html` |
| 10 | `equilibrio-piscina.html` | `/articulos/equilibrio-piscina.html` |
| 11 | `jabon-liquido-vs-barra.html` | `/articulos/jabon-liquido-vs-barra.html` |
| 12 | `oxigeno-activo-ropa.html` | `/articulos/oxigeno-activo-ropa.html` |

**Total: 12 rutas públicas.** Todas terminan en `.html`. Las URLs deben preservarse exactamente (incluida la extensión) o documentarse 301 si cambian.

---

## 2. Fragmentos repetidos en cada HTML

Auditoría visual: cada página repite ~250+ líneas idénticas. Candidatos directos a componentes en Next.js:

| Fragmento | Líneas aprox. | Aparece en | Componente Next sugerido |
|-----------|---------------|-----------|--------------------------|
| `<nav class="nav">` (logo + links + cart button + burger) | ~46 | Las 12 | `components/Header.tsx` |
| `<div class="mobile-menu">` | ~7 | Las 12 | dentro de `Header.tsx` |
| `<aside class="cart">` (drawer) | ~30 | Las 12 | `components/CartDrawer.tsx` |
| `<footer class="footer">` (3 columnas + social + copy) | ~120 (incluye SVGs inline de WA/FB/IG) | Las 12 | `components/Footer.tsx` |
| `<head>` (GA4 + meta + OG/Twitter + favicon + manifest + main.css) | ~50 | Las 12 (privacy y 404 sin GA4 en algunos casos — ver §5) | `app/layout.tsx` + `generateMetadata` por página |
| Cloudflare email-decode script | 4 líneas | Las 12 | reinyectar en `layout.tsx` |
| SVGs WhatsApp / Facebook / Instagram | repetidos 3–4 veces por página | Las 12 | extraer a `components/icons/` |

> **Decisión de migración:** consolidar todo en `app/layout.tsx` + componentes — el ahorro de duplicación es masivo.

---

## 3. CSS — inventario y tokens

### Archivos en `styles/`
| Archivo | Tamaño | Importado por `main.css` | Notas |
|---------|--------|--------------------------|-------|
| `main.css` | 1.5 KB | (entry) | Solo `@import`. Carga ordenada. |
| `01-tokens.css` | 8 KB | ✅ | Variables CSS, reset, animaciones, `.reveal`, `.hex-bg`. |
| `02-buttons.css` | 3.8 KB | ✅ | `.btn` y variantes. |
| `03-nav.css` | 6.7 KB | ✅ | Nav fija + mobile menu. |
| `04-layout.css` | 9.4 KB | ✅ | Section-header, page-hero, footer, cta-strip. |
| `05-home.css` | 11.9 KB | ✅ | Solo en `index.html`. |
| `06-nosotros.css` | 10.8 KB | ✅ | Solo en `nosotros.html`. |
| `08-productos.css` | 29.3 KB | ✅ | Catálogo + carrito. |
| `09-recursos.css` | 10.2 KB | ✅ | Recursos. |
| `10-calculator.css` | 12.5 KB | ✅ | Calculadora. |
| `11-contacto.css` | 6.4 KB | ✅ | Contacto. |
| `normalize.css` | 6.1 KB | ❌ **NO importado** | Huérfano. Confirmar si se puede borrar o si debe entrar. |

**No existe `07-*.css`** — hay un hueco en la numeración (probablemente fue eliminado).

### Metodología BEM
Confirmado. Ejemplos: `nav__link--active`, `product-card__select`, `cart__item-qty`, `footer__nav-list`, `sede-card__badge`. Estricto. **No tocar selectores al migrar** — importar el CSS tal cual y dejar las clases intactas.

### Variables de marca (de `01-tokens.css`)
```css
/* Colores */
--color-gold:        #c9a84c;  /* acento principal */
--color-gold-light:  #e2c97e;  /* hover                */
--color-gold-pale:   #f0e0b0;  /* gold sobre oscuro    */
--color-cream:       #f5f0e8;  /* fondo de página      */
--color-cream-dark:  #ede6d6;  /* fondo alterno        */
--color-black:       #111010;  /* texto primario       */
--color-surface:     #c6b79b;  /* secciones (charcoal-warm) */
--color-charcoal:    #2a2a2a;  /* texto secundario claro */
--color-gray:        #3d3935;  /* texto muted          */
--color-green:       #25d366;  /* WhatsApp             */
--color-whale:       #4e5d6c;  /* fondo product card   */

/* Tipografía */
--font-display:      "Cabin", sans-serif;
--font-body:         "Montserrat", sans-serif;

/* Layout */
--nav-height:        4.5rem;
--section-pad:       6rem 7rem;
--transition:        0.25s ease;
```

⚠ **DISCREPANCIAS vs lo que dice tu prompt / `CLAUDE.md`:**

1. **No existe ningún `teal #2A6F7F`.** Grep en todo el repo: 0 ocurrencias. La paleta real no tiene teal — el acento es solo el oro `#C9A84C`. Los grises se llaman `whale`, `charcoal`, `gray`, `surface`. → **Confírmame si quieres que añada un teal nuevo o si el prompt estaba desactualizado.**
2. **`--font-display` es `Cabin`, no Cormorant Garamond.** El `@import` de Google Fonts en `01-tokens.css` sí trae Cormorant (lo usa la página `privacy-policy.html` localmente), pero el token global apunta a Cabin. `CLAUDE.md` está obsoleto en este punto.

---

## 4. EMAIL — Realidad vs. lo que dice el prompt

⚠ **El mecanismo NO es "fetch a un endpoint externo".** Es **EmailJS** (SDK del navegador). Detalles:

### Carga del SDK
```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
```

### Configuración (en línea, dentro de `contacto.html`)
```js
emailjs.init("ZLCx6rGdTnty2jE_k");          // public key
const SERVICE_ID         = "service_auawiwj";
const GENERAL_TEMPLATE_ID = "template_fbscnvc";
const PROMO_TEMPLATE_ID  = "template_fbscnvc";  // mismo template; PROMO_TRIGGER=""
```

### Campos del formulario que viajan a EmailJS
```ts
{
  nombre:   string,  // required
  email:    string,  // required (validación: solo no-vacío)
  telefono: string,  // required
  empresa:  string,
  ciudad:   string,
  asunto:   string,  // default: "Contacto desde csquimicos.com"
  mensaje:  string,  // required
}
```
Hay además un checkbox `privacy` requerido (acepta política).

### Fallback
Si `emailjs.send()` rechaza (cuota, red, etc.), abre `mailto:gerencia@csquimicos.com?cc=csquimicos@gmail.com` con cuerpo prearmado.

### Seguridad — auditoría

- **Public Key, Service ID y Template ID expuestos en el cliente: NO es fuga.** Para EmailJS browser SDK *son públicos por diseño*. La seguridad depende de cómo esté configurado el servicio del lado de EmailJS:
  - **Allowlist de dominios (Origin header):** se configura en el dashboard de EmailJS. **No verificable desde el frontend.** → **Recomiendo confirmar en el dashboard de EmailJS que `csquimicos.com` (y solo ese) está en la allowlist.** Si no lo está, cualquiera puede mandar correos en tu nombre desde otro origen.
  - **Rate limits / cuota mensual:** el plan EmailJS impone esto. El comentario del código (`// quota exceeded (402)`) sugiere que ya han hit la cuota. **Recomiendo revisar el plan actual.**
  - **CAPTCHA:** **no hay.** Si quieres protección anti-bots adicional, EmailJS soporta reCAPTCHA en sus templates. → Plan: agregar honeypot mínimo en el cliente (no sustituye reCAPTCHA del lado EmailJS, pero filtra bots torpes).
- **No hay claves privadas ni secretos expuestos.** No detecté `service.privateKey` ni nada parecido. ✅

### Plan para Fase 2
- `lib/email.ts` con cliente tipado que envuelve `emailjs.send()`. `Promise<Result<void, EmailError>>`.
- `NEXT_PUBLIC_EMAILJS_*` para Public Key / Service ID / Template ID — necesarias en el bundle del cliente porque el SDK es client-side. **Esto es seguro siempre que la allowlist de dominios esté configurada en EmailJS.**
- Validación con `zod` antes de llamar al SDK.
- UI: reemplazar el `alert`-style por toast (ya hay infraestructura en `shared.js`).
- Honeypot oculto vía CSS (campo `<input name="website">` invisible). Si llega con valor → abortamos.

---

## 5. GA4 — Measurement ID

✅ **ID verificado carácter por carácter:** `G-11JXNBH06S` (S final, NO `065`).

Aparece textualmente en estas páginas:
- `index.html` línea 4 y 9
- `nosotros.html` línea 4 y 9
- `contacto.html` línea 4 y 9
- `recursos.html` línea 4 y 9
- `404.html` línea 4 y 9

⚠ **No aparece en `privacy-policy.html`.** Es razonable (es noindex), pero conviene decidir conscientemente si queremos GA4 ahí. **No lo aparecen tampoco los artículos** — confirmar con la lectura completa antes de migrar (Fase 2). Yo migraría GA4 a `app/layout.tsx` y se aplicaría a *todas* las rutas; si quieres excluir privacy/404, lo manejamos con un flag.

Snippet exacto a reproducir (idéntico en todos):
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-11JXNBH06S"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-11JXNBH06S');
</script>
```

→ En Next.js: `next/script` con `strategy="afterInteractive"` en `app/layout.tsx`. ID en `NEXT_PUBLIC_GA_ID`.

> El commit reciente `7dba7c5 Corrección GA4` confirma que el typo histórico (`065` vs `06S`) ya fue corregido en el HTML. Hay que tener cuidado de **no reintroducirlo** al migrar.

---

## 6. Productos — fuente de datos

**Hardcodeados en `productos.html`** (237 KB, ~5000 líneas). No hay JSON, ni API, ni base de datos.

### Inventario detectado
- **64 productos con `data-name`** (no las ~95 referencias que mencionas — confirmar si la cifra del prompt incluye algo más: tamaños individuales, fragancias, o material adicional).
- **6 categorías** vía `data-cat`:
  - `aseo-liquidos` (la doc del CLAUDE.md decía solo `aseo` — ya está más granular)
  - `aseo-solidos` (también nuevo)
  - `aromas`
  - `piscinas`
  - `utensilios` (nuevo, no estaba en CLAUDE.md)
  - `materias`
- **Tarjetas estándar** (con `<select>` de tamaño y `data-price`): la mayoría. Ejemplos de precios encontrados: 500ml→$7000–8000, 1L→$10000–11000, 2L→$14000–18000, 4L→$25000–30000, 20L→$95000–110000. **Algunos productos tienen `data-price="0"`** (= TODO de precio confirmado).
- **Tarjetas catálogo (`products__catalog-item`)**: materias primas, sin precio, sin `<select>` (se añade al carrito como `size="Kg"` y `price=0`).

### Decisión para Fase 2
No migrar a DB ni JSON ahora. **Mantener los productos hardcodeados en TSX** (`app/productos/_data/productos.ts`) como un array tipado:

```ts
type Producto = {
  id: string;
  name: string;
  category: 'aseo-liquidos' | 'aseo-solidos' | 'aromas' | 'piscinas' | 'utensilios' | 'materias';
  sizes: { value: string; price: number }[];   // [] si es 'materias'
  fragrances?: string[];                        // solo para 'aromas'
};
```

Esto deja un solo lugar para editar precios cuando Ammie los confirme y mantiene tipado fuerte. **No introduce backend.** Migración a DB queda lista para el día del upgrade a Node.

### Riesgo
Voy a tener que extraer manualmente esos 64 productos desde el HTML a TS. Es trabajo mecánico pero hay margen de error. **Plan:** escribir un script de extracción (parseo del HTML) que produzca el array; lo ejecuto localmente; reviso el output; commit. **No inventaré nombres ni precios.**

---

## 7. Deploy actual

### GitHub Actions → Hostinger FTP

Archivo: `.github/workflows/deploy.yml`
```yaml
name: Deploy to Hostinger
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./
          server-dir: /home/u158713193/public_html/
          exclude:
            - **/.git*
            - **/.git*/**
            - .vscode/**
            - README.md
            - FDS/**            ← ⚠ ver nota
            - Project config/**
```

### ⚠ Hallazgos
1. **`FDS/**` está excluido del FTP-deploy**, pero `recursos.html` enlaza a `FDS/Ácido Oxálico.pdf` y los otros 4 PDFs. Si los PDFs están sirviéndose en producción, alguien los subió manualmente al host una vez. **Esto es un foot-gun.** Para Fase 4 hay que decidir:
   - (a) Quitar la exclusión de `FDS/**` y dejar que se suban siempre. ✔ Preferida.
   - (b) Mantenerlos solo en el server, fuera de Git. ✘ Riesgo: si se pierden, no hay backup en repo.
2. **Server dir es `/home/u158713193/public_html/`.** El bundle estático nuevo (`/out`) deberá publicarse a esa misma ruta.
3. **El secret en GitHub Actions ya está configurado** (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD).
4. **Commits recientes** muestran tres intentos relacionados con FTP/webhook: `2840b1e fix: FTP server-dir path`, `57d39e8 fix: FTP server-dir path 2`, `12185b6 Prueba webhook hostinger`. Iteración reciente — hay que revalidar Fase 4 antes de tocar.

### Plan provisional para Fase 4
Dos opciones que te presento en Fase 4 (no implemento ahora):
- **Opción A:** modificar el workflow para que **antes del FTP corra `npm ci && npm run build`** (genera `/out`) y luego cambie `local-dir: ./out`.
- **Opción B:** dejar el workflow tal cual pero compilar localmente y commit-ear `/out/`. (Sucia, no recomendada.)

Recomiendo A. Lo discutimos al llegar a Fase 4.

---

## 8. Otros activos estáticos y notas finales

- **`FDS/`** — 5 PDFs de Hojas de Datos de Seguridad. Linked from `recursos.html`. → A `public/FDS/` en Next.js, **referencias actualizadas para que sigan respondiendo en `/FDS/...`**.
- **`images/`** — subcarpetas `Historia/`, `Pagina/`, `Productos/`, `sedes/`, `Stock/` + logo raíz. → A `public/images/` tal cual. **Ya estamos con `images.unoptimized=true`** así que no usamos `next/image` aún.
- **`csqicongold.ico`** — favicon. → `public/` o `app/favicon.ico` (App Router lo recoge automáticamente).
- **`site.webmanifest`** — manifiesto PWA (start_url=`/`, theme_color=`#C9A84C`). → `public/` con metadata link en `layout.tsx`.
- **`robots.txt`** — allow-all. → `public/robots.txt` o `app/robots.ts` (recomiendo el archivo estático: una línea).
- **`sitemap.xml`** — 11 URLs. → Generarlo dinámicamente con `app/sitemap.ts` para no perder el sync con las rutas reales.

---

## 9. PLAYBOOK DE UPGRADE — entregable de Fase 4 (placeholder)

> Se completa al final de la migración. Aquí queda la **lista de cosas a tocar el día que se haga upgrade a Hostinger Business + Node**. Documento vivo.

1. `next.config.js`: **quitar `output: 'export'`** (línea marcada con comentario `// UPGRADE: remove for SSR`).
2. `next.config.js`: **quitar `images: { unoptimized: true }`** y empezar a usar `next/image`.
3. Reemplazar el deploy FTP por uno Node-app (Hostinger Business soporta `npm start` en runtime Node). El nuevo workflow corre `npm ci && npm run build` y reinicia el proceso Node.
4. Llenar `app/api/contact/route.ts` (que hoy es solo README) con el handler que mueve el envío de email del cliente al servidor. Esto permite ocultar el SDK de EmailJS o cambiar a Resend/SES sin tocar UI.
5. Migrar productos de `app/productos/_data/productos.ts` a tabla SQL (cuando se decida la DB).
6. Reescribir `lib/auth/` y `lib/payments/` (carpetas placeholder hoy).
7. Validar GA4 sigue funcionando con SSR (debería).

(El playbook se irá engordando a medida que avanzamos.)

---

## 10. Preguntas abiertas para ti (necesito tu decisión antes de Fase 1)

1. **Teal #2A6F7F**: no existe en el repo. ¿El prompt estaba desactualizado y la paleta es solo oro + cream + black? ¿O quieres que añada un teal nuevo como acento secundario?
2. **Font display**: `--font-display` es **Cabin**, no Cormorant. ¿Lo dejamos así o quieres cambiar a Cormorant ya en esta migración?
3. **64 productos vs "~95 referencias"** que mencionas: ¿la cifra de 95 incluye tamaños individuales (un producto con 5 tamaños = 5 refs), o hay productos que no aparecen con `data-name`? Si me confirmas, ajusto el inventario.
4. **Exclusión de `FDS/**` en el FTP-deploy**: ¿la quitamos en la migración? (Recomiendo sí — al menos así los PDFs estarían versionados con el código y el deploy es reproducible).
5. **GA4 en `privacy-policy.html` y artículos**: no está hoy. ¿Lo activamos para *todas* las rutas en la migración (vía `layout.tsx`), o lo dejamos fuera de privacy/404 deliberadamente?
6. **`styles/normalize.css`** está huérfano (no lo importa `main.css`). ¿Lo borramos o lo agregamos al `main.css` antes de migrar?
7. **EmailJS allowlist**: necesitas verificar en el dashboard de EmailJS que `csquimicos.com` está en la lista de orígenes permitidos. ¿Confirmas que ya está, o lo agrego como TODO al playbook?
8. **Carpetas previstas en `lib/`**: el prompt menciona `lib/auth/` y `lib/payments/`. ¿Algo más que debas anticipar (e.g. `lib/inventory/`, `lib/billing/`)?

---

**Fin de Fase 0.** Espero tu confirmación (idealmente sobre las 8 preguntas) antes de empezar Fase 1 (scaffold Next.js).
