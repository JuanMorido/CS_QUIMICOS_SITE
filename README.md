# CS Químicos — Sitio Web

Static e-commerce website for **CS Químicos**, a chemical products company based in Acacías, Meta, Colombia. Customers browse products, add items to a cart, and place orders via WhatsApp.

## Stack

- Vanilla HTML, CSS, JavaScript (ES6+)
- No build step, no framework, no dependencies
- Cart state persisted in `localStorage`

## Running Locally

```bash
python -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`.

## Project Structure

```
├── index.html          # Home/landing page
├── nosotros.html       # About the company
├── productos.html      # Product catalog + shopping cart
├── recursos.html       # Resources: pool calculator + safety data sheets
├── contacto.html       # Contact form (EmailJS)
├── privacy-policy.html # Privacy policy
│
├── styles/
│   ├── main.css        # Imports all stylesheets in order
│   ├── 01-tokens.css   # Design tokens (CSS variables), reset, animations
│   ├── 02-buttons.css  # Button components
│   ├── 03-nav.css      # Navigation and mobile menu
│   ├── 04-layout.css   # Shared layout (hero, grids, footer)
│   ├── 05-home.css     # Home page styles
│   ├── 06-nosotros.css # About page styles
│   ├── 08-productos.css# Products + cart styles
│   ├── 09-recursos.css # Resources page styles
│   ├── 10-calculator.css # Pool calculator styles
│   └── 11-contacto.css # Contact page styles
│
├── js/
│   ├── shared.js       # Cart logic, scroll-reveal, nav — loaded on all pages
│   └── calculator.js   # Pool chemical dosage calculator (recursos.html only)
│
├── articulos/          # Blog articles (HTML)
├── images/             # Product and logo images
└── FDS/                # Safety Data Sheets (PDFs)
```

## Key Features

### Shopping Cart
- Lives entirely in the browser (`localStorage` key: `csq_cart`)
- Products are uniquely identified by `id + size` — same product in two sizes = two entries
- Checkout sends a pre-filled WhatsApp message to `+57 320 318 8602` via `wa.me`

### Product Categories
- **Aseo** — Cleaning products with size selector and price
- **Aromas** — Fragranced cleaners; fragrance pill selection appended to cart item name
- **Piscinas** — Pool chemicals with size selector
- **Materias Primas** — ~50 raw chemicals; added at price $0 (consultation required)

### Pool Calculator (`recursos.html`)
Calculates chemical dosages (chlorine, pH, alkalinity, flocculant, chloramines, chlorine reduction) based on pool volume and current readings.

## Design Tokens

| Variable | Value | Usage |
|---|---|---|
| `--color-gold` | `#C9A84C` | Primary accent |
| `--color-gold-light` | `#E2C97E` | Hover state |
| `--color-cream` | `#F5F0E8` | Page background |
| `--color-black` | `#111010` | Dark sections |
| `--color-green` | `#25D366` | WhatsApp CTA |
| `--font-display` | Cormorant Garamond | Headings |
| `--font-body` | Montserrat | Body text |

## Code Conventions

- 2-space indentation, LF line endings, UTF-8 (enforced by `.editorconfig`)
- Responsive breakpoint: `767px` (mobile vs. tablet/desktop)
- Page-specific logic lives in inline `<script>` tags within each HTML file
