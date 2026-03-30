/* ============================================================
   shared.js — CS Químicos
   ============================================================ */

// ── Scroll reveal ──────────────────────────────────────────
function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── Nav scroll shrink ──────────────────────────────────────
function initNav() {
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('nav--scrolled', window.scrollY > 60);
    });
  }

  const burger = document.getElementById('nav-burger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      mobileMenu.classList.toggle('mobile-menu--open');
    });
  }
}

// ── Cart system ────────────────────────────────────────────
const Cart = {
  _key: 'csq_cart',

  get() {
    try { return JSON.parse(localStorage.getItem(this._key) || '[]'); }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(this._key, JSON.stringify(items));
    this.updateBadge();
  },

  add(product) {
    const items = this.get();
    const existing = items.find(i => i.id === product.id && i.size === product.size);
    if (existing) existing.qty++;
    else items.push({ ...product, qty: 1 });
    this.save(items);
    this.showToast(`${product.name} agregado al carrito`);
  },

  remove(id, size) {
    this.save(this.get().filter(i => !(i.id === id && i.size === size)));
  },

  updateQty(id, size, delta) {
    const items = this.get();
    const item = items.find(i => i.id === id && i.size === size);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) this.remove(id, size);
    else this.save(items);
  },

  total() {
    return this.get().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  count() {
    return this.get().reduce((sum, i) => sum + i.qty, 0);
  },

  clear() {
    localStorage.removeItem(this._key);
    this.updateBadge();
  },

  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = this.count();
    badge.textContent = count;
    badge.classList.toggle('nav__cart-badge--visible', count > 0);
  },

  showToast(msg) {
    let toast = document.getElementById('cart-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cart-toast';
      Object.assign(toast.style, {
        position: 'fixed', bottom: '2rem', left: '50%',
        transform: 'translateX(-50%) translateY(80px)',
        background: 'var(--color-black)', color: 'var(--color-gold-light)',
        padding: '0.8rem 2rem',
        fontFamily: 'var(--font-body)', fontSize: '0.72rem', letterSpacing: '0.1em',
        zIndex: '9999', transition: 'transform 0.3s ease',
        borderLeft: '3px solid var(--color-gold)'
      });
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(80px)';
    }, 2500);
  }
};

// ── WhatsApp order builder ─────────────────────────────────
function buildWhatsAppOrder() {
  const items = Cart.get();
  if (!items.length) {
    Cart.showToast('Agregue productos primero');
    return null;
  }
  let msg = 'Hola CS Químicos, quisiera hacer el siguiente pedido:\n\n';
  items.forEach(i => { msg += `• ${i.name} (${i.size}) x${i.qty}\n`; });
  msg += '\n\nPor favor confirmen disponibilidad y precio. ¡Gracias!';
  return msg;
}

// ── Cart panel ─────────────────────────────────────────────
function initCart() {
  const cartOverlay = document.getElementById('cart-overlay');
  if (!cartOverlay) return;
  const cartPanel   = document.getElementById('cart');
  const cartItemsEl = document.getElementById('cart-items');

  function openCart() {
    cartOverlay.classList.add('cart-overlay--open');
    cartPanel.classList.add('cart--open');
    renderCart();
  }
  function closeCart() {
    cartOverlay.classList.remove('cart-overlay--open');
    cartPanel.classList.remove('cart--open');
  }

  document.querySelectorAll('[data-cart-open]').forEach(el => el.addEventListener('click', openCart));
  document.getElementById('cart-close').addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  function renderCart() {
    const items = Cart.get();
    if (!items.length) {
      cartItemsEl.innerHTML = '<p class="cart__empty">Su carrito está vacío.</p>';
      return;
    }
    cartItemsEl.innerHTML = items.map(item => `
      <div class="cart__item">
        <div class="cart__item-info">
          <span class="cart__item-name">${item.name}</span>
          <span class="cart__item-size">${item.size}</span>
          <div class="cart__item-qty">
            <button class="cart__qty-btn" data-id="${item.id}" data-size="${item.size}" data-delta="-1">−</button>
            <span class="cart__qty-num">${item.qty}</span>
            <button class="cart__qty-btn" data-id="${item.id}" data-size="${item.size}" data-delta="1">+</button>
          </div>
        </div>
        <div class="cart__item-right">
          <button class="cart__item-remove" data-id="${item.id}" data-size="${item.size}">✕ quitar</button>
        </div>
      </div>
    `).join('');
    cartItemsEl.querySelectorAll('.cart__qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Cart.updateQty(btn.dataset.id, btn.dataset.size, parseInt(btn.dataset.delta));
        renderCart();
      });
    });
    cartItemsEl.querySelectorAll('.cart__item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        Cart.remove(btn.dataset.id, btn.dataset.size);
        renderCart();
      });
    });
  }

  document.getElementById('cart-send').addEventListener('click', () => {
    const msg = buildWhatsAppOrder();
    if (msg) window.open('https://wa.me/573203188602?text=' + encodeURIComponent(msg), '_blank');
  });

  document.getElementById('cart-clear').addEventListener('click', () => {
    Cart.clear();
    renderCart();
  });
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initReveal();
  initNav();
  initCart();
  Cart.updateBadge();
});
