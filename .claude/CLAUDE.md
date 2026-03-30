# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static e-commerce website for CS Químicos, a chemical products company in Acacías, Meta, Colombia. Customers browse products, add to cart, and place orders via WhatsApp. No build step, no dependencies, no backend.

## Running Locally

```bash
python -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`.

## Architecture

### Pages
- `index.html` — Landing/home page
- `nosotros.html` — About page
- `servicios.html` — Services page
- `productos.html` — Products + shopping cart
- `recursos.html` — Resources/tools page

### CSS Structure (`styles/`)
Layered modular CSS, all imported via `styles/main.css`:
1. `01-tokens.css` — Design tokens (CSS variables), reset, animations
2. `02-buttons.css` — Button components
3. `03-nav.css` — Navigation and mobile menu
4. `04-layout.css` — Shared layout (hero sections, grids, footer)
5. `05-09-*.css` — Page-specific styles
6. `10-calculator.css` — Pool calculator styles (used only on `recursos.html`)

### JavaScript
- `shared.js` — Loaded on all pages. Contains:
  - `Cart` object: `get/save/add/remove/updateQty/total/count/clear` — persists to `localStorage` key `csq_cart`
  - `initReveal()` — Intersection Observer scroll-reveal animations
  - `initNav()` — Nav shrink on scroll + mobile hamburger toggle
- `calculator.js` — Self-contained pool chemical calculator, loaded only on `recursos.html`. Mounts into `<div id="pool-calculator">`. Calculates dosages for chlorine, pH, alkalinity, flocculant, chloramines, and chlorine reduction using pool volume and current readings.
- Inline `<script>` in each HTML file handles page-specific logic (product filter, cart panel rendering)

### Design Tokens (key CSS variables)
```
--color-gold: #C9A84C        (primary accent)
--color-gold-light: #E2C97E  (hover)
--color-cream: #F5F0E8       (page background)
--color-black: #111010       (dark sections)
--color-green: #25D366       (WhatsApp)
--font-display: Cormorant Garamond
--font-body: Montserrat
```

### Cart & Checkout Flow
Cart lives entirely in the browser (`localStorage`). On `productos.html`, users filter products (Aseo, Aromas, Piscinas, Materias Primas), add items, adjust quantities in the cart panel, then click "Pedir por WhatsApp" which constructs a `wa.me/+573203188602` URL with the order summary as a pre-filled message.

Cart items are uniquely identified by `id + size` together — the same product in two sizes is two distinct cart entries.

### Product Card Structure (`productos.html`)
Two card types exist in the catalog:

**Standard product card** (Aseo, Aromas, Piscinas, Utensilios):
```html
<div class="product-card" data-cat="aseo" data-id="gel-lavaplatos" data-name="Gel Lavaplatos">
  <select class="product-card__select">
    <option value="1L" data-price="11000">1 Litro — $11.000</option>
  </select>
  <!-- Optional fragrance pills (Aromas products): -->
  <div class="product-card__fragrances">
    <button class="product-card__frag product-card__frag--active" data-frag="Citronela">Citronela</button>
  </div>
  <button class="product-card__add">Agregar</button>
</div>
```
The active fragrance pill's `data-frag` value is appended to the product name in the cart (e.g., "Limpiador Desinfectante – Citronela").

**Materias Primas catalog item** (raw chemicals, ~50 items):
```html
<div class="products__catalog-item" data-id="acido-oxalico" data-name="Ácido Oxálico">
```
No size selector or price — always added with size "Kg" and price 0 (consultation required).

### Responsive Breakpoint
Primary breakpoint at `767px` (mobile vs. tablet/desktop).

### Static Assets
- `FDS/` — Safety Data Sheets (PDFs) for chemical products, served as static files and linked from `recursos.html`
- `images/` — Product and logo images
- `csqicongold.ico` — Favicon

## Key Notes
- Product prices are placeholders — marked with `TODO: Update prices once confirmed with Ammie`
- The site uses Cloudflare email obfuscation (`/cdn-cgi/l/email-protection`); email links point to `/cdn-cgi/l/email-protection` and are decoded client-side by Cloudflare's script
- No framework, no transpilation — vanilla HTML/CSS/JS, ES6+, modern browser APIs only
- Code style: 2-space indent, LF line endings, UTF-8 (enforced by `.editorconfig`)
- Incomplete content on `nosotros.html` (timeline, environmental section) and `servicios.html` (all service card descriptions) and `recursos.html` (blog articles) — all have TODO placeholder text
