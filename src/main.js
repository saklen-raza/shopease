
import './style.css'
import { supabase } from './supabase.js'
import './reviews.js'

// =====================================================
// SHOEASE - SINGLE PAGE SHOPPING WEBSITE
// =====================================================

let products = []
let cart = []
let wishlistIds = new Set()

try {
  const savedCart = JSON.parse(localStorage.getItem('shopease_cart') || '[]')
  cart = Array.isArray(savedCart) ? savedCart : []
} catch (error) {
  console.error('Unable to restore cart:', error)
  cart = []
}

let activeCategory = 'All'
let activeSort = 'default'
let minPrice = ''
let maxPrice = ''
let currentUser = null
let currentPage = 'home'
let authMode = 'login'

const app = document.querySelector('#app')

function saveCart() {
  localStorage.setItem('shopease_cart', JSON.stringify(cart))
}

// =====================================================
// WEBSITE HTML
// =====================================================

app.innerHTML = `
  <header class="header">
    <div class="logo" id="logoButton">ShopEase<span>.</span></div>

    <input
      type="text"
      id="searchInput"
      class="search-input header-search"
      placeholder="Search products..."
      aria-label="Search products"
    >

    <nav class="nav-links">
      <a href="#home" data-page="home" class="nav-link active">Home</a>
      <a href="#products" data-page="products" class="nav-link">Products</a>
      <a href="#about" data-page="about" class="nav-link">About</a>
    </nav>

    <div class="header-actions">
      <button class="cart-button" id="cartButton">
        Cart (<span id="cartCount">0</span>)
      </button>

      <button class="cart-button" id="wishlistButton" style="display:none">
        ♥ Wishlist (<span id="wishlistCount">0</span>)
      </button>

      <button class="cart-button" id="accountButton" style="display:none">
        My Account
      </button>

      <button class="cart-button" id="ordersButton" style="display:none">
        My Orders
      </button>

      <button class="cart-button" id="authButton">
        Login / Sign Up
      </button>
    </div>
  </header>

  <main id="mainContent">

    <!-- HOME -->
    <section class="page-view" id="homePage">
      <section class="luxury-hero">
        <div class="luxury-hero-content">
          <p class="luxury-eyebrow">THE SHOEASE COLLECTION</p>
          <h1>Find Beauty in<br>Everyday Living.</h1>
          <p class="luxury-description">
            Thoughtfully selected essentials, timeless styles and
            everyday favourites — all in one place.
          </p>
          <button class="luxury-button" id="shopNowButton">
            EXPLORE COLLECTION
          </button>
          <div class="hero-note">
            <span></span>
            A better way to shop
          </div>
        </div>

        <div class="luxury-hero-image">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1100&q=85"
            alt="Fashion collection"
          >
        </div>
      </section>

      <section class="luxury-categories">
        <div class="luxury-section-heading">
          <div>
            <p class="luxury-eyebrow">DISCOVER YOUR STYLE</p>
            <h2>Shop by Category</h2>
          </div>
          <p>Explore a collection made for every part of your life.</p>
        </div>

        <div class="luxury-category-grid" id="homeCategoryList">
          <button class="luxury-category-card" data-category="Fashion">
            <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=85" alt="Fashion collection" loading="lazy">
            <span class="category-overlay"></span>
            <span class="category-card-content">
              <small>EXPRESS YOURSELF</small>
              <strong>Fashion</strong>
              <span>EXPLORE →</span>
            </span>
          </button>

          <button class="luxury-category-card" data-category="Electronics">
            <img src="https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&q=85" alt="Electronics collection" loading="lazy">
            <span class="category-overlay"></span>
            <span class="category-card-content">
              <small>SMARTER LIVING</small>
              <strong>Electronics</strong>
              <span>EXPLORE →</span>
            </span>
          </button>

          <button class="luxury-category-card" data-category="Accessories">
            <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=85" alt="Accessories collection" loading="lazy">
            <span class="category-overlay"></span>
            <span class="category-card-content">
              <small>THE FINISHING TOUCH</small>
              <strong>Accessories</strong>
              <span>EXPLORE →</span>
            </span>
          </button>
        </div>
      </section>

      <section class="luxury-featured">
        <div class="luxury-section-heading">
          <div>
            <p class="luxury-eyebrow">HANDPICKED FOR YOU</p>
            <h2>Featured Collection</h2>
          </div>
          <button class="luxury-text-button" data-go-page="products">
            VIEW ALL PRODUCTS →
          </button>
        </div>
        <div class="product-grid" id="homeProductGrid">
          <p>Loading products...</p>
        </div>
      </section>

      <section class="luxury-promo">
        <div>
          <p class="luxury-eyebrow">THE SHOEASE EXPERIENCE</p>
          <h2>Everyday Shopping.<br>Made Extraordinary.</h2>
          <p>
            Discover quality, style and convenience with a collection
            selected to make everyday shopping feel special.
          </p>
          <button class="luxury-light-button" data-go-page="products">
            DISCOVER MORE
          </button>
        </div>
        <div class="luxury-promo-decoration">
          <span>SE</span>
          <small>SHOP EASE</small>
        </div>
      </section>
    </section>

    <!-- PRODUCTS -->
    <section class="page-view section" id="productsPage" hidden>
      <div class="products-heading">
        <p class="luxury-eyebrow">THE COMPLETE COLLECTION</p>
        <h2>Our Products</h2>
        <p>Explore our latest collection.</p>
      </div>

      <div class="category-list" id="categoryList">
        <button class="category-button active" data-category="All">All</button>
        <button class="category-button" data-category="Electronics">Electronics</button>
        <button class="category-button" data-category="Fashion">Fashion</button>
        <button class="category-button" data-category="Accessories">Accessories</button>
      </div>

      <!-- PRODUCT FILTERS -->
      <div class="product-filter-panel">

        <div class="product-filter-field">
          <label for="sortProducts">Sort Products</label>
          <select id="sortProducts">
            <option value="default">Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
          </select>
        </div>

        <div class="product-filter-field">
          <label for="minPriceFilter">Minimum Price (₹)</label>
          <input
            type="number"
            id="minPriceFilter"
            min="0"
            placeholder="Min price"
          >
        </div>

        <div class="product-filter-field">
          <label for="maxPriceFilter">Maximum Price (₹)</label>
          <input
            type="number"
            id="maxPriceFilter"
            min="0"
            placeholder="Max price"
          >
        </div>

        <button type="button" class="clear-filters-button" id="clearProductFilters">
          Clear Filters
        </button>

      </div>

      <p class="filter-result-count" id="filterResultCount"></p>

      <div class="product-grid" id="productGrid">
        <p>Loading products...</p>
      </div>
    </section>

    <!-- PRODUCT DETAILS -->
    <section class="page-view section product-details-page" id="productDetailsPage" hidden>
      <button class="secondary-button" id="backToProducts">
        ← Back to Products
      </button>
      <div id="productDetailsContent"></div>
    </section>

    <!-- ABOUT -->
    <section class="page-view promo about-page" id="aboutPage" hidden>
      <p class="luxury-eyebrow">OUR STORY</p>
      <h2>About ShopEase</h2>
      <p>
        Welcome to ShopEase, your one-stop destination for quality products
        at great prices. We make online shopping simple, convenient and easy.
      </p>
      <p>Shop smart. Shop easy.</p>
      <button class="primary-button" data-go-page="products">
        Explore Products
      </button>
    </section>

    <!-- CART -->
    <section class="page-view section shopping-page" id="cartPage" hidden>
      <div class="page-heading-row">
        <div>
          <p class="luxury-eyebrow">YOUR SELECTION</p>
          <h2>Your Shopping Cart</h2>
          <p>Review the items you want to purchase.</p>
        </div>
        <button class="secondary-button" data-go-page="products">
          Continue Shopping
        </button>
      </div>
      <div class="cart-items" id="cartItems"></div>
      <div class="cart-page-bottom">
        <h3>Total: ₹<span id="cartTotal">0</span></h3>
        <button class="checkout-button" id="checkoutButton">
          Proceed to Checkout
        </button>
      </div>
    </section>

    <!-- WISHLIST -->
    <section class="page-view section wishlist-page" id="wishlistPage" hidden>
      <div class="page-heading-row">
        <div>
          <p class="luxury-eyebrow">YOUR FAVOURITES</p>
          <h2>My Wishlist</h2>
          <p>Products you have saved for later.</p>
        </div>
        <button class="secondary-button" data-go-page="products">
          Continue Shopping
        </button>
      </div>
      <div class="product-grid" id="wishlistGrid">
        <p>Loading your Wishlist...</p>
      </div>
    </section>

    <!-- ACCOUNT -->
    <section class="page-view section account-page" id="accountPage" hidden>
      <div class="page-heading-row">
        <div>
          <p class="luxury-eyebrow">YOUR DETAILS</p>
          <h2>My Account</h2>
          <p>Manage your personal and delivery information.</p>
        </div>
        <button class="secondary-button" data-go-page="home">
          Back to Home
        </button>
      </div>

      <div class="page-form-card">
        <form id="profileForm">
          <div class="account-field">
            <label for="profileName">Full Name</label>
            <input type="text" id="profileName" required>
          </div>
          <div class="account-field">
            <label for="profileEmail">Email Address</label>
            <input type="email" id="profileEmail" readonly>
          </div>
          <div class="account-field">
            <label for="profilePhone">Phone Number</label>
            <input type="tel" id="profilePhone" placeholder="Enter phone number" maxlength="15">
          </div>
          <div class="account-field">
            <label for="profileAddress">Delivery Address</label>
            <textarea id="profileAddress" placeholder="House number, street, area" rows="3"></textarea>
          </div>
          <div class="account-field">
            <label for="profileCity">City</label>
            <input type="text" id="profileCity" placeholder="Enter your city">
          </div>
          <div class="account-field">
            <label for="profileState">State</label>
            <input type="text" id="profileState" placeholder="Enter your state">
          </div>
          <div class="account-field">
            <label for="profilePincode">PIN Code</label>
            <input type="text" id="profilePincode" placeholder="Enter PIN code" maxlength="10">
          </div>
          <p id="profileMessage" class="auth-message"></p>
          <button type="submit" class="auth-submit" id="saveProfileButton">
            Save Changes
          </button>
        </form>
      </div>
    </section>

    <!-- MY ORDERS -->
    <section class="page-view section orders-page" id="ordersPage" hidden>
      <div class="page-heading-row">
        <div>
          <p class="luxury-eyebrow">YOUR PURCHASES</p>
          <h2>My Orders</h2>
          <p>View your previous purchases and order status.</p>
        </div>
        <button class="secondary-button" data-go-page="home">
          Back to Home
        </button>
      </div>
      <div id="ordersList"><p>Loading your orders...</p></div>
      <div id="orderDetails" style="display:none"></div>
    </section>

    <footer>
      <div class="footer-brand">ShopEase<span>.</span></div>
      <p>Thoughtful finds for everyday living.</p>
      <p>© 2026 ShopEase. All rights reserved.</p>
    </footer>
  </main>

  <!-- LOGIN AND SIGNUP POPUP -->
  <div class="auth-overlay" id="authOverlay">
    <div class="auth-panel">
      <button class="auth-close" id="closeAuth">✕</button>
      <p class="luxury-eyebrow">WELCOME TO SHOEASE</p>
      <h2 id="authTitle">Welcome Back!</h2>
      <p id="authDescription">Login to your ShopEase account.</p>

      <form id="authForm">
        <div id="nameField" class="auth-field" style="display:none">
          <label for="authName">Full Name</label>
          <input type="text" id="authName" placeholder="Enter your full name">
        </div>
        <div class="auth-field">
          <label for="authEmail">Email Address</label>
          <input type="email" id="authEmail" placeholder="Enter your email" required>
        </div>
        <div class="auth-field">
          <label for="authPassword">Password</label>
          <input type="password" id="authPassword" placeholder="Enter your password" minlength="6" required>
        </div>
        <p id="authMessage" class="auth-message"></p>
        <button type="submit" class="auth-submit" id="authSubmit">Login</button>
        <button type="button" class="forgot-password-button" id="forgotPasswordButton">
          Forgot Password?
        </button>
      </form>
      <p class="auth-switch" id="authSwitch">
        Don't have an account?
        <button type="button" id="switchAuth">Sign Up</button>
      </p>
    </div>
  </div>

  <!-- RESET PASSWORD POPUP -->
  <div class="auth-overlay" id="resetPasswordOverlay">
    <div class="auth-panel">
      <button class="auth-close" id="closeResetPassword">✕</button>
      <p class="luxury-eyebrow">ACCOUNT RECOVERY</p>
      <h2>Create New Password</h2>
      <p>Enter your new password below.</p>
      <form id="resetPasswordForm">
        <div class="auth-field">
          <label for="newPassword">New Password</label>
          <input type="password" id="newPassword" minlength="6" placeholder="Enter new password" required>
        </div>
        <div class="auth-field">
          <label for="confirmNewPassword">Confirm New Password</label>
          <input type="password" id="confirmNewPassword" minlength="6" placeholder="Confirm new password" required>
        </div>
        <p id="resetPasswordMessage" class="auth-message"></p>
        <button type="submit" class="auth-submit" id="updatePasswordButton">
          Update Password
        </button>
      </form>
    </div>
  </div>

  <!-- CHECKOUT POPUP -->
  <div class="checkout-overlay" id="checkoutOverlay">
    <div class="checkout-panel">
      <button class="auth-close" id="closeCheckout">✕</button>
      <p class="luxury-eyebrow">ALMOST YOURS</p>
      <h2>Checkout</h2>
      <p>Confirm your delivery details and place your order.</p>

      <form id="checkoutForm">
        <h3>Delivery Information</h3>
        <div class="account-field">
          <label for="checkoutName">Full Name</label>
          <input type="text" id="checkoutName" required>
        </div>
        <div class="account-field">
          <label for="checkoutEmail">Email Address</label>
          <input type="email" id="checkoutEmail" readonly>
        </div>
        <div class="account-field">
          <label for="checkoutPhone">Phone Number</label>
          <input type="tel" id="checkoutPhone" maxlength="15" required>
        </div>
        <div class="account-field">
          <label for="checkoutAddress">Delivery Address</label>
          <textarea id="checkoutAddress" rows="3" required></textarea>
        </div>
        <div class="account-field">
          <label for="checkoutCity">City</label>
          <input type="text" id="checkoutCity" required>
        </div>
        <div class="account-field">
          <label for="checkoutState">State</label>
          <input type="text" id="checkoutState" required>
        </div>
        <div class="account-field">
          <label for="checkoutPincode">PIN Code</label>
          <input type="text" id="checkoutPincode" maxlength="10" required>
        </div>

        <div class="payment-section">
          <h3>Payment Method</h3>
          <label class="payment-option">
            <input type="radio" name="paymentMethod" value="cod" checked>
            Cash on Delivery
          </label>
          <p class="payment-note">Pay for your order when it is delivered.</p>
        </div>

        <div class="checkout-summary">
          <h3>Order Summary</h3>
          <p>Items: <span id="checkoutItemCount">0</span></p>
          <p>Subtotal: ₹<span id="checkoutSubtotal">0</span></p>
          <p>Delivery: Free</p>
          <h3>Total: ₹<span id="checkoutTotal">0</span></h3>
        </div>

        <p id="checkoutMessage" class="auth-message"></p>
        <button type="submit" class="auth-submit" id="placeOrderButton">
          Place Order
        </button>
      </form>
    </div>
  </div>
`

// =====================================================
// HEADER SEARCH STYLES
// =====================================================

const headerSearchStyles = document.createElement('style')

headerSearchStyles.textContent = `
  .header-search {
    flex: 1 1 200px;
    width: 100%;
    max-width: 280px;
    min-width: 150px;
    margin: 0;
    padding: 12px 15px;
    border: 1px solid var(--border);
    border-radius: 3px;
    outline: none;
    background: var(--white);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    transition: border-color 0.2s ease;
  }

  .header-search:focus {
    border-color: var(--gold);
  }

  .header-search::placeholder {
    color: #999;
  }

  @media (max-width: 1000px) {
    .header-search {
      max-width: 220px;
      flex: 1 1 160px;
    }
  }

  @media (max-width: 760px) {
    .header-search {
      order: 4;
      flex: 1 1 100%;
      max-width: 500px;
      margin: 5px auto;
    }
  }
`

document.head.appendChild(headerSearchStyles)

// =====================================================
// PRODUCT FILTER STYLES
// =====================================================

const filterStyles = document.createElement('style')

filterStyles.textContent = `
  .product-filter-panel {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    gap: 14px;
    margin: 22px 0 12px;
    padding: 18px;
    background: var(--white);
    border: 1px solid var(--border);
  }

  .product-filter-field {
    display: flex;
    flex: 1 1 150px;
    flex-direction: column;
    gap: 7px;
    min-width: 130px;
  }

  .product-filter-field label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
  }

  .product-filter-field select,
  .product-filter-field input {
    width: 100%;
    min-height: 43px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 3px;
    outline: none;
    background: var(--white);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
  }

  .product-filter-field select:focus,
  .product-filter-field input:focus {
    border-color: var(--gold);
  }

  .clear-filters-button {
    min-height: 43px;
    padding: 10px 18px;
    border: 1px solid var(--text);
    border-radius: 3px;
    background: var(--text);
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .clear-filters-button:hover {
    background: var(--gold);
    border-color: var(--gold);
  }

  .filter-result-count {
    margin: 12px 0 18px;
    color: #777;
    font-size: 13px;
  }

  @media (max-width: 600px) {
    .product-filter-panel {
      padding: 13px;
      gap: 10px;
    }

    .product-filter-field {
      flex: 1 1 100%;
    }

    .clear-filters-button {
      width: 100%;
    }
  }
`

document.head.appendChild(filterStyles)

// =====================================================
// HELPER
// =====================================================

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

function getProductImages(product) {
  const images = Array.isArray(product?.images)
    ? product.images.filter(image =>
        typeof image === 'string' && image.trim() !== ''
      )
    : []

  if (images.length > 0) {
    return images.slice(0, 5)
  }

  return product?.image_url ? [product.image_url] : []
}

// =====================================================
// PRODUCT GALLERY STYLES
// =====================================================

const galleryStyles = document.createElement('style')

galleryStyles.textContent = `
  .product-details-gallery {
    width: 100%;
    min-width: 0;
  }

  .product-gallery-main {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 12px;
    background: #eee8dc;
  }

  .product-gallery-main img {
    display: block;
    width: 100%;
    height: 460px;
    object-fit: contain;
    background: #eee8dc;
    transition: opacity 0.2s ease;
  }

  .product-gallery-thumbnails {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }

  .product-gallery-thumbnail {
    width: 76px;
    height: 76px;
    padding: 3px;
    border: 1px solid #d8d0c2;
    border-radius: 8px;
    background: #fffdf8;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }

  .product-gallery-thumbnail:hover {
    transform: translateY(-2px);
    border-color: #9a8054;
  }

  .product-gallery-thumbnail.active {
    border: 2px solid #9a8054;
  }

  .product-gallery-thumbnail img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    border-radius: 5px;
  }

  @media (max-width: 768px) {
    .product-gallery-main img {
      height: 340px;
    }

    .product-gallery-thumbnail {
      width: 64px;
      height: 64px;
    }
  }
`

document.head.appendChild(galleryStyles)

// =====================================================
// PAGE NAVIGATION
// =====================================================

function showPage(page) {
  const pages = {
    home: 'homePage',
    products: 'productsPage',
    productDetails: 'productDetailsPage',
    about: 'aboutPage',
    cart: 'cartPage',
    wishlist: 'wishlistPage',
    account: 'accountPage',
    orders: 'ordersPage'
  }

  if (!pages[page]) page = 'home'

  if (['account', 'orders', 'wishlist'].includes(page) && !currentUser) {
    alert('Please login first.')
    authMode = 'login'
    updateAuthForm()
    openAuthPanel()
    return
  }

  currentPage = page

  Object.values(pages).forEach(id => {
    document.getElementById(id).hidden = true
  })

  document.getElementById(pages[page]).hidden = false

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page)
  })

  window.scrollTo({ top: 0, behavior: 'smooth' })

  if (page === 'cart') renderCart()
  if (page === 'wishlist') renderWishlist()
  if (page === 'account') loadAccountPage()
  if (page === 'orders') loadOrdersPage()
}

document.querySelectorAll('[data-page]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault()
    showPage(link.dataset.page)
  })
})

document.querySelectorAll('[data-go-page]').forEach(button => {
  button.addEventListener('click', () => showPage(button.dataset.goPage))
})

document.querySelector('#logoButton').addEventListener('click', () => showPage('home'))
document.querySelector('#shopNowButton').addEventListener('click', () => showPage('products'))

document.querySelector('#homeCategoryList').addEventListener('click', event => {
  const button = event.target.closest('[data-category]')
  if (!button) return

  activeCategory = button.dataset.category

  document.querySelectorAll('.category-button').forEach(item => {
    item.classList.toggle('active', item.dataset.category === activeCategory)
  })

  document.querySelector('#searchInput').value = ''
  showPage('products')
  renderProducts()
})

// =====================================================
// LOAD PRODUCTS FROM SUPABASE
// =====================================================

async function loadProducts() {
  const productGrid = document.querySelector('#productGrid')
  const homeProductGrid = document.querySelector('#homeProductGrid')

  productGrid.innerHTML = '<p>Loading products...</p>'
  homeProductGrid.innerHTML = '<p>Loading products...</p>'

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('id')

  if (error) {
    console.error(error)
    productGrid.innerHTML = '<p>Unable to load products. Please refresh.</p>'
    homeProductGrid.innerHTML = '<p>Unable to load products. Please refresh.</p>'
    return
  }

  products = data || []
  renderProducts()
  renderHomeProducts()
  renderWishlist()
}

function productCardHTML(product) {
  const price = Number(product.price)
  const oldPrice = Number(product.old_price)

  const discount = product.old_price && oldPrice > price
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : 0

  const isSaved = wishlistIds.has(Number(product.id))
  const productImages = getProductImages(product)
  const cardImage = productImages[0] || ''

  return `
    <div class="product-card luxury-product-card"
      data-product-id="${Number(product.id)}"
      role="button"
      tabindex="0"
      aria-label="View ${escapeHTML(product.name)} details">

      <div class="luxury-product-image">
        <img
          src="${escapeHTML(cardImage)}"
          alt="${escapeHTML(product.name)}"
          loading="lazy"
        >

        ${discount > 0
          ? `<span class="luxury-discount">${discount}% OFF</span>`
          : ''
        }

        <button
          class="wishlist-heart ${isSaved ? 'saved' : ''}"
          data-wishlist-id="${Number(product.id)}"
          type="button"
          aria-label="${isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}"
          title="${isSaved ? 'Remove from Wishlist' : 'Add to Wishlist'}"
        >${isSaved ? '♥' : '♡'}</button>
      </div>

      <div class="product-info luxury-product-info">
        <p class="product-category">${escapeHTML(product.category)}</p>
        <h3>${escapeHTML(product.name)}</h3>

        <div class="price-row">
          <strong>₹${price.toLocaleString('en-IN')}</strong>
          ${product.old_price
            ? `<del>₹${oldPrice.toLocaleString('en-IN')}</del>`
            : ''
          }
        </div>

        <button class="add-button luxury-add-button" data-id="${Number(product.id)}">
          ADD TO CART
        </button>
      </div>
    </div>
  `
}

// =====================================================
// PRODUCT FILTERING AND SORTING
// =====================================================

function renderProducts() {
  const productGrid = document.querySelector('#productGrid')
  const searchValue = document.querySelector('#searchInput').value.trim().toLowerCase()

  let filteredProducts = products.filter(product => {
    const matchesSearch =
      String(product.name || '').toLowerCase().includes(searchValue) ||
      String(product.category || '').toLowerCase().includes(searchValue)

    const matchesCategory =
      activeCategory === 'All' ||
      String(product.category || '').toLowerCase() === activeCategory.toLowerCase()

    const price = Number(product.price)

    const matchesMinPrice =
      minPrice === '' || price >= Number(minPrice)

    const matchesMaxPrice =
      maxPrice === '' || price <= Number(maxPrice)

    return (
      matchesSearch &&
      matchesCategory &&
      matchesMinPrice &&
      matchesMaxPrice
    )
  })

  // SORT PRODUCTS
  if (activeSort === 'price-asc') {
    filteredProducts.sort((a, b) => Number(a.price) - Number(b.price))
  }

  if (activeSort === 'price-desc') {
    filteredProducts.sort((a, b) => Number(b.price) - Number(a.price))
  }

  if (activeSort === 'name-asc') {
    filteredProducts.sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    )
  }

  if (activeSort === 'name-desc') {
    filteredProducts.sort((a, b) =>
      String(b.name || '').localeCompare(String(a.name || ''))
    )
  }

  // UPDATE RESULT COUNT
  const resultCount = document.querySelector('#filterResultCount')

  if (resultCount) {
    resultCount.textContent =
      `Showing ${filteredProducts.length} of ${products.length} products`
  }

  if (filteredProducts.length === 0) {
    productGrid.innerHTML = `
      <p class="empty-message">
        No products found. Try changing your search or filters.
      </p>
    `
    return
  }

  productGrid.innerHTML = filteredProducts.map(productCardHTML).join('')
}

function renderHomeProducts() {
  const homeProductGrid = document.querySelector('#homeProductGrid')
  const featuredProducts = products.slice(0, 4)

  if (featuredProducts.length === 0) {
    homeProductGrid.innerHTML = '<p>No products available.</p>'
    return
  }

  homeProductGrid.innerHTML = featuredProducts.map(productCardHTML).join('')
}

// =====================================================
// PRODUCT SEARCH
// =====================================================

const searchInput = document.querySelector('#searchInput')

searchInput.addEventListener('input', () => {
  const searchValue = searchInput.value.trim()

  if (searchValue && currentPage !== 'products') {
    showPage('products')
  }

  renderProducts()
})

// =====================================================
// FILTER CONTROL EVENTS
// =====================================================

document.querySelector('#sortProducts').addEventListener('change', event => {
  activeSort = event.target.value
  renderProducts()
})

document.querySelector('#minPriceFilter').addEventListener('input', event => {
  minPrice = event.target.value
  renderProducts()
})

document.querySelector('#maxPriceFilter').addEventListener('input', event => {
  maxPrice = event.target.value
  renderProducts()
})

document.querySelector('#clearProductFilters').addEventListener('click', () => {
  activeCategory = 'All'
  activeSort = 'default'
  minPrice = ''
  maxPrice = ''

  searchInput.value = ''
  document.querySelector('#sortProducts').value = 'default'
  document.querySelector('#minPriceFilter').value = ''
  document.querySelector('#maxPriceFilter').value = ''

  document.querySelectorAll('.category-button').forEach(button => {
    button.classList.toggle('active', button.dataset.category === 'All')
  })

  renderProducts()
})

// =====================================================
// PRODUCT DETAILS PAGE WITH 5-IMAGE GALLERY
// =====================================================

function showProductDetails(productId) {
  const product = products.find(item => Number(item.id) === Number(productId))

  if (!product) {
    alert('Product not found.')
    return
  }

  const price = Number(product.price)
  const oldPrice = Number(product.old_price)

  const discount = product.old_price && oldPrice > price
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : 0

  const isSaved = wishlistIds.has(Number(product.id))
  const detailsContent = document.querySelector('#productDetailsContent')

  const productImages = getProductImages(product)
  const mainImage = productImages[0] || ''

  detailsContent.innerHTML = `
    <div class="product-details-layout">

      <div class="product-details-gallery">

        <div class="product-gallery-main product-details-image">
          <img
            id="productMainImage"
            src="${escapeHTML(mainImage)}"
            alt="${escapeHTML(product.name)}"
          >

          ${discount > 0
            ? `<span class="luxury-discount">${discount}% OFF</span>`
            : ''
          }
        </div>

        ${
          productImages.length > 1
            ? `
              <div class="product-gallery-thumbnails">
                ${productImages.map((image, index) => `
                  <button
                    type="button"
                    class="product-gallery-thumbnail ${index === 0 ? 'active' : ''}"
                    data-gallery-index="${index}"
                    data-gallery-image="${escapeHTML(image)}"
                    aria-label="View product image ${index + 1}"
                    title="View image ${index + 1}"
                  >
                    <img
                      src="${escapeHTML(image)}"
                      alt="${escapeHTML(product.name)} - Image ${index + 1}"
                      loading="lazy"
                    >
                  </button>
                `).join('')}
              </div>
            `
            : ''
        }

      </div>

      <div class="product-details-info">
        <p class="luxury-eyebrow">
          ${escapeHTML(product.category || 'SHOEASE COLLECTION')}
        </p>

        <h1>${escapeHTML(product.name)}</h1>

        <div class="product-details-price">
          <strong>₹${price.toLocaleString('en-IN')}</strong>

          ${product.old_price && oldPrice > price
            ? `<del>₹${oldPrice.toLocaleString('en-IN')}</del>`
            : ''
          }
        </div>

        ${discount > 0
          ? `<p class="product-details-discount">${discount}% OFF</p>`
          : ''
        }

        <div class="product-details-reviews">
          <button
            type="button"
            class="view-reviews-button"
            data-review-product="${Number(product.id)}"
            data-review-name="${escapeHTML(product.name)}"
          >
            ★ Write / View Reviews
          </button>
        </div>

        <div class="product-details-description">
          <h3>Product Description</h3>
          <p>
            ${escapeHTML(
              product.description ||
              'Discover this product from the ShopEase collection.'
            )}
          </p>
        </div>

        <div class="product-details-actions">
          <label for="detailQuantity">Quantity</label>

          <input
            type="number"
            id="detailQuantity"
            min="1"
            max="100"
            value="1"
          >

          <button
            class="add-button luxury-add-button"
            id="detailAddToCart"
            data-id="${Number(product.id)}"
            type="button"
          >
            ADD TO CART
          </button>

          <button
            class="wishlist-heart ${isSaved ? 'saved' : ''}"
            id="detailWishlistButton"
            data-wishlist-id="${Number(product.id)}"
            type="button"
          >
            ${isSaved ? '♥ Remove from Wishlist' : '♡ Add to Wishlist'}
          </button>
        </div>

        <p class="product-details-note">
          Shop with confidence at ShopEase.
        </p>
      </div>

    </div>
  `

  showPage('productDetails')
}

document.querySelector('#backToProducts').addEventListener('click', () => {
  showPage('products')
})

document.querySelector('#productDetailsContent').addEventListener('click', event => {
  const thumbnail = event.target.closest('[data-gallery-image]')

  if (thumbnail) {
    const mainImage = document.querySelector('#productMainImage')

    if (mainImage) {
      mainImage.src = thumbnail.dataset.galleryImage

      document.querySelectorAll('.product-gallery-thumbnail').forEach(button => {
        button.classList.toggle('active', button === thumbnail)
      })
    }

    return
  }

  const addButton = event.target.closest('#detailAddToCart')

  if (addButton) {
    const quantityInput = document.querySelector('#detailQuantity')
    const quantity = Number(quantityInput.value)

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      alert('Please enter a quantity between 1 and 100.')
      return
    }

    addToCart(addButton.dataset.id, quantity)
    return
  }

  const heart = event.target.closest('[data-wishlist-id]')

  if (heart) {
    toggleWishlist(heart.dataset.wishlistId)
  }
})

// =====================================================
// WISHLIST FUNCTIONS
// =====================================================

async function loadWishlist() {
  if (!currentUser) {
    wishlistIds = new Set()
    updateWishlistCount()
    renderProducts()
    renderHomeProducts()
    renderWishlist()
    return
  }

  const userId = currentUser.id

  const { data, error } = await supabase
    .from('wishlist')
    .select('product_id')
    .eq('user_id', userId)

  if (!currentUser || currentUser.id !== userId) return

  if (error) {
    console.error('Unable to load Wishlist:', error)
    alert('Unable to load your Wishlist: ' + error.message)
    return
  }

  wishlistIds = new Set((data || []).map(item => Number(item.product_id)))

  updateWishlistCount()
  renderProducts()
  renderHomeProducts()
  renderWishlist()

  if (currentPage === 'productDetails') {
    const currentProductId = document.querySelector('#detailWishlistButton')?.dataset.wishlistId
    if (currentProductId) showProductDetails(currentProductId)
  }
}

function updateWishlistCount() {
  const count = document.querySelector('#wishlistCount')
  const button = document.querySelector('#wishlistButton')

  count.textContent = wishlistIds.size
  button.style.display = currentUser ? 'inline-block' : 'none'
}

async function toggleWishlist(productId) {
  if (!currentUser) {
    alert('Please login to use your Wishlist.')
    authMode = 'login'
    updateAuthForm()
    openAuthPanel()
    return
  }

  const id = Number(productId)

  if (!Number.isSafeInteger(id) || id <= 0) return

  const alreadySaved = wishlistIds.has(id)
  const userId = currentUser.id

  if (alreadySaved) {
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', id)

    if (error) {
      console.error(error)
      alert('Unable to remove product: ' + error.message)
      return
    }

    wishlistIds.delete(id)
    alert('Product removed from your Wishlist.')
  } else {
    const { error } = await supabase
      .from('wishlist')
      .insert({
        user_id: userId,
        product_id: id
      })

    if (error) {
      console.error(error)
      alert('Unable to add product: ' + error.message)
      return
    }

    wishlistIds.add(id)
    alert('Product added to your Wishlist.')
  }

  updateWishlistCount()
  renderProducts()
  renderHomeProducts()
  renderWishlist()

  if (currentPage === 'productDetails') {
    showProductDetails(id)
  }
}

function renderWishlist() {
  const wishlistGrid = document.querySelector('#wishlistGrid')
  if (!wishlistGrid) return

  if (!currentUser) {
    wishlistGrid.innerHTML = '<p>Please login to view your Wishlist.</p>'
    return
  }

  const savedProducts = products.filter(product =>
    wishlistIds.has(Number(product.id))
  )

  if (savedProducts.length === 0) {
    wishlistGrid.innerHTML = `
      <div class="wishlist-empty">
        <div class="wishlist-empty-heart">♡</div>
        <h3>Your Wishlist is Empty</h3>
        <p>Save products you love and find them here later.</p>
        <button class="primary-button" id="wishlistShopButton">
          Explore Products
        </button>
      </div>
    `

    document.querySelector('#wishlistShopButton')?.addEventListener('click', () => {
      showPage('products')
    })

    return
  }

  wishlistGrid.innerHTML = savedProducts.map(productCardHTML).join('')
}

document.querySelector('#wishlistButton').addEventListener('click', () => {
  if (!currentUser) {
    alert('Please login first.')
    return
  }
  showPage('wishlist')
})

// =====================================================
// PRODUCT CARD CLICK HANDLERS
// =====================================================

function handleProductGridClick(event) {
  const heart = event.target.closest('[data-wishlist-id]')

  if (heart) {
    event.stopPropagation()
    toggleWishlist(heart.dataset.wishlistId)
    return
  }

  const addButton = event.target.closest('.add-button')

  if (addButton) {
    event.stopPropagation()
    addToCart(addButton.dataset.id)
    return
  }

  if (event.target.closest('button, a, input, textarea, select')) return

  const productCard = event.target.closest('[data-product-id]')

  if (productCard) {
    showProductDetails(productCard.dataset.productId)
  }
}

function handleProductGridKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return

  const productCard = event.target.closest('[data-product-id]')
  if (!productCard || event.target.closest('button, a, input')) return

  event.preventDefault()
  showProductDetails(productCard.dataset.productId)
}

document.querySelector('#productGrid').addEventListener('click', handleProductGridClick)
document.querySelector('#homeProductGrid').addEventListener('click', handleProductGridClick)
document.querySelector('#wishlistGrid').addEventListener('click', handleProductGridClick)

document.querySelector('#productGrid').addEventListener('keydown', handleProductGridKeydown)
document.querySelector('#homeProductGrid').addEventListener('keydown', handleProductGridKeydown)
document.querySelector('#wishlistGrid').addEventListener('keydown', handleProductGridKeydown)

document.querySelector('#categoryList').addEventListener('click', event => {
  const button = event.target.closest('.category-button')
  if (!button) return

  activeCategory = button.dataset.category

  document.querySelectorAll('.category-button').forEach(item => {
    item.classList.toggle('active', item === button)
  })

  renderProducts()
})

// =====================================================
// CART FUNCTIONS
// =====================================================

function renderCart() {
  const cartItems = document.querySelector('#cartItems')
  const cartCount = document.querySelector('#cartCount')
  const cartTotal = document.querySelector('#cartTotal')

  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0)
  const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0)

  cartCount.textContent = totalQuantity
  cartTotal.textContent = totalPrice.toLocaleString('en-IN')

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <p class="empty-message">
        Your cart is empty.
        <button class="text-link" id="emptyCartShop">Start shopping</button>
      </p>
    `

    document.querySelector('#emptyCartShop').addEventListener('click', () => {
      showPage('products')
    })
    return
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${escapeHTML(item.image_url || '')}" alt="${escapeHTML(item.name)}">
      <div class="cart-item-info">
        <h4>${escapeHTML(item.name)}</h4>
        <p>₹${Number(item.price).toLocaleString('en-IN')}</p>
        <div class="quantity-controls">
          <button data-action="decrease" data-id="${item.id}">−</button>
          <span>${item.quantity}</span>
          <button data-action="increase" data-id="${item.id}">+</button>
        </div>
        <button class="remove-button" data-action="remove" data-id="${item.id}">
          Remove
        </button>
      </div>
    </div>
  `).join('')
}

function addToCart(productId, quantity = 1) {
  const product = products.find(item => item.id === Number(productId))
  if (!product) return

  const requestedQuantity = Number(quantity)

  if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
    alert('Please enter a valid quantity.')
    return
  }

  const existingItem = cart.find(item => item.id === product.id)

  if (existingItem) {
    if (existingItem.quantity + requestedQuantity > 100) {
      alert('Maximum quantity is 100.')
      return
    }

    existingItem.quantity += requestedQuantity
  } else {
    if (requestedQuantity > 100) {
      alert('Maximum quantity is 100.')
      return
    }

    cart.push({ ...product, quantity: requestedQuantity })
  }

  saveCart()
  renderCart()
  alert(`${requestedQuantity} × ${product.name} added to cart.`)
}

function updateCart(productId, action) {
  const item = cart.find(product => product.id === Number(productId))
  if (!item) return

  if (action === 'increase') {
    if (item.quantity >= 100) {
      alert('Maximum quantity is 100.')
      return
    }
    item.quantity++
  }

  if (action === 'decrease') {
    item.quantity--
    if (item.quantity <= 0) {
      cart = cart.filter(product => product.id !== Number(productId))
    }
  }

  if (action === 'remove') {
    cart = cart.filter(product => product.id !== Number(productId))
  }

  saveCart()
  renderCart()
}

document.querySelector('#cartItems').addEventListener('click', event => {
  const button = event.target.closest('[data-action]')
  if (button) updateCart(button.dataset.id, button.dataset.action)
})

document.querySelector('#cartButton').addEventListener('click', () => showPage('cart'))

// =====================================================
// LOGIN, SIGNUP AND PASSWORD RECOVERY
// =====================================================

const authOverlay = document.querySelector('#authOverlay')
const authForm = document.querySelector('#authForm')
const authTitle = document.querySelector('#authTitle')
const authDescription = document.querySelector('#authDescription')
const authMessage = document.querySelector('#authMessage')
const authSubmit = document.querySelector('#authSubmit')
const authName = document.querySelector('#authName')
const nameField = document.querySelector('#nameField')
const authSwitch = document.querySelector('#authSwitch')

const forgotPasswordButton = document.querySelector('#forgotPasswordButton')
const resetPasswordOverlay = document.querySelector('#resetPasswordOverlay')
const resetPasswordForm = document.querySelector('#resetPasswordForm')
const resetPasswordMessage = document.querySelector('#resetPasswordMessage')
const updatePasswordButton = document.querySelector('#updatePasswordButton')

function openAuthPanel() {
  authOverlay.classList.add('show')
  authMessage.textContent = ''
}

function closeAuthPanel() {
  authOverlay.classList.remove('show')
  authForm.reset()
  authMessage.textContent = ''
}

document.querySelector('#authButton').addEventListener('click', () => {
  if (currentUser) {
    if (confirm('Do you want to logout?')) logoutUser()
  } else {
    authMode = 'login'
    updateAuthForm()
    openAuthPanel()
  }
})

document.querySelector('#closeAuth').addEventListener('click', closeAuthPanel)

authOverlay.addEventListener('click', event => {
  if (event.target === authOverlay) closeAuthPanel()
})

// =====================================================
// UPDATE LOGIN / SIGNUP FORM
// =====================================================

function updateAuthForm() {
  authMessage.textContent = ''
  forgotPasswordButton.hidden = authMode !== 'login'

  if (authMode === 'login') {
    authTitle.textContent = 'Welcome Back!'
    authDescription.textContent = 'Login to your ShopEase account.'
    authSubmit.textContent = 'Login'
    nameField.style.display = 'none'
    authName.required = false

    authSwitch.innerHTML = `
      Don't have an account?
      <button type="button" id="switchAuth">Sign Up</button>
    `
  } else {
    authTitle.textContent = 'Create Your Account'
    authDescription.textContent = 'Join ShopEase and start shopping.'
    authSubmit.textContent = 'Create Account'
    nameField.style.display = 'block'
    authName.required = true

    authSwitch.innerHTML = `
      Already have an account?
      <button type="button" id="switchAuth">Login</button>
    `
  }

  document.querySelector('#switchAuth').addEventListener('click', () => {
    authMode = authMode === 'login' ? 'signup' : 'login'
    updateAuthForm()
  })
}

// =====================================================
// FORGOT PASSWORD
// =====================================================

forgotPasswordButton.addEventListener('click', async () => {
  const email = document.querySelector('#authEmail').value.trim()

  if (!email) {
    authMessage.textContent = 'Please enter your registered email address first.'
    authMessage.style.color = 'red'
    document.querySelector('#authEmail').focus()
    return
  }

  forgotPasswordButton.disabled = true
  authMessage.textContent = 'Sending password reset email...'
  authMessage.style.color = '#555'

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })

    if (error) throw error

    authMessage.textContent = 'Password reset email sent! Please check your inbox.'
    authMessage.style.color = 'green'
  } catch (error) {
    console.error(error)
    authMessage.textContent = error.message
    authMessage.style.color = 'red'
  } finally {
    forgotPasswordButton.disabled = false
  }
})

// =====================================================
// RESET PASSWORD
// =====================================================

resetPasswordForm.addEventListener('submit', async event => {
  event.preventDefault()

  const newPassword = document.querySelector('#newPassword').value
  const confirmPassword = document.querySelector('#confirmNewPassword').value

  if (newPassword.length < 6) {
    resetPasswordMessage.textContent = 'Password must contain at least 6 characters.'
    resetPasswordMessage.style.color = 'red'
    return
  }

  if (newPassword !== confirmPassword) {
    resetPasswordMessage.textContent = 'Passwords do not match.'
    resetPasswordMessage.style.color = 'red'
    return
  }

  updatePasswordButton.disabled = true
  updatePasswordButton.textContent = 'Updating...'
  resetPasswordMessage.textContent = ''

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error

    resetPasswordMessage.textContent = 'Your password has been updated successfully!'
    resetPasswordMessage.style.color = 'green'
    resetPasswordForm.reset()

    setTimeout(() => {
      resetPasswordOverlay.classList.remove('show')
      closeAuthPanel()
      alert('Your password has been changed successfully.')
    }, 1200)
  } catch (error) {
    console.error(error)
    resetPasswordMessage.textContent = error.message
    resetPasswordMessage.style.color = 'red'
  } finally {
    updatePasswordButton.disabled = false
    updatePasswordButton.textContent = 'Update Password'
  }
})

document.querySelector('#closeResetPassword').addEventListener('click', () => {
  resetPasswordOverlay.classList.remove('show')
})

resetPasswordOverlay.addEventListener('click', event => {
  if (event.target === resetPasswordOverlay) {
    resetPasswordOverlay.classList.remove('show')
  }
})

// =====================================================
// LOGIN AND SIGNUP SUBMISSION
// =====================================================

authForm.addEventListener('submit', async event => {
  event.preventDefault()

  const email = document.querySelector('#authEmail').value.trim()
  const password = document.querySelector('#authPassword').value
  const name = authName.value.trim()

  authSubmit.disabled = true
  authSubmit.textContent = 'Please wait...'
  authMessage.textContent = ''

  try {
    if (authMode === 'signup') {
      if (!name) throw new Error('Please enter your full name.')

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      })

      if (error) throw error

      authMessage.style.color = 'green'

      if (data.session) {
        authMessage.textContent = 'Account created successfully!'
      } else {
        authMessage.textContent =
          'Registration successful! Please check your email and confirm your account.'
      }

      authForm.reset()
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      authMessage.textContent = 'Login successful!'
      authMessage.style.color = 'green'
      setTimeout(closeAuthPanel, 700)
    }
  } catch (error) {
    console.error(error)
    authMessage.textContent = error.message
    authMessage.style.color = 'red'
  } finally {
    authSubmit.disabled = false
    authSubmit.textContent = authMode === 'login' ? 'Login' : 'Create Account'
  }
})

// =====================================================
// HEADER BUTTONS
// =====================================================

function updateAccountButton(user) {
  const accountButton = document.querySelector('#accountButton')
  const ordersButton = document.querySelector('#ordersButton')
  const authButton = document.querySelector('#authButton')
  const wishlistButton = document.querySelector('#wishlistButton')

  if (user) {
    accountButton.style.display = 'inline-block'
    ordersButton.style.display = 'inline-block'
    wishlistButton.style.display = 'inline-block'
    authButton.textContent = 'Logout'
    authButton.title = user.email || 'Logout'
  } else {
    accountButton.style.display = 'none'
    ordersButton.style.display = 'none'
    wishlistButton.style.display = 'none'
    authButton.textContent = 'Login / Sign Up'
    authButton.title = 'Login or create an account'

    if (currentPage === 'account' || currentPage === 'orders' || currentPage === 'wishlist') {
      showPage('home')
    }
  }
}

// =====================================================
// CUSTOMER PROFILE
// =====================================================

const profileForm = document.querySelector('#profileForm')
const profileMessage = document.querySelector('#profileMessage')
const saveProfileButton = document.querySelector('#saveProfileButton')

async function getCustomerProfile() {
  if (!currentUser) throw new Error('Please login first.')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('No customer profile found.')

  return data
}

async function loadAccountPage() {
  if (!currentUser) return

  profileMessage.textContent = 'Loading your profile...'
  profileMessage.style.color = '#555'
  saveProfileButton.disabled = true

  try {
    const data = await getCustomerProfile()

    document.querySelector('#profileName').value = data.full_name || ''
    document.querySelector('#profileEmail').value = currentUser.email || ''
    document.querySelector('#profilePhone').value = data.phone || ''
    document.querySelector('#profileAddress').value = data.address || ''
    document.querySelector('#profileCity').value = data.city || ''
    document.querySelector('#profileState').value = data.state || ''
    document.querySelector('#profilePincode').value = data.pincode || ''

    profileMessage.textContent = ''
  } catch (error) {
    console.error(error)
    profileMessage.textContent = error.message
    profileMessage.style.color = 'red'
  } finally {
    saveProfileButton.disabled = false
  }
}

document.querySelector('#accountButton').addEventListener('click', () => showPage('account'))

profileForm.addEventListener('submit', async event => {
  event.preventDefault()

  if (!currentUser) {
    alert('Please login first.')
    return
  }

  const fullName = document.querySelector('#profileName').value.trim()
  const phone = document.querySelector('#profilePhone').value.trim()
  const address = document.querySelector('#profileAddress').value.trim()
  const city = document.querySelector('#profileCity').value.trim()
  const state = document.querySelector('#profileState').value.trim()
  const pincode = document.querySelector('#profilePincode').value.trim()

  if (!fullName) {
    profileMessage.textContent = 'Please enter your full name.'
    profileMessage.style.color = 'red'
    return
  }

  saveProfileButton.disabled = true
  saveProfileButton.textContent = 'Saving...'
  profileMessage.textContent = ''

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone,
        address,
        city,
        state,
        pincode,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id)

    if (error) throw error

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    })

    if (authError) throw authError

    profileMessage.textContent = 'Your profile has been saved successfully!'
    profileMessage.style.color = 'green'
  } catch (error) {
    console.error(error)
    profileMessage.textContent = error.message
    profileMessage.style.color = 'red'
  } finally {
    saveProfileButton.disabled = false
    saveProfileButton.textContent = 'Save Changes'
  }
})

// =====================================================
// CHECKOUT
// =====================================================

const checkoutOverlay = document.querySelector('#checkoutOverlay')
const checkoutForm = document.querySelector('#checkoutForm')
const checkoutMessage = document.querySelector('#checkoutMessage')
const placeOrderButton = document.querySelector('#placeOrderButton')

function updateCheckoutSummary() {
  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0)
  const totalPrice = cart.reduce((total, item) => total + Number(item.price) * item.quantity, 0)

  document.querySelector('#checkoutItemCount').textContent = totalQuantity
  document.querySelector('#checkoutSubtotal').textContent = totalPrice.toLocaleString('en-IN')
  document.querySelector('#checkoutTotal').textContent = totalPrice.toLocaleString('en-IN')
}

async function openCheckout() {
  if (cart.length === 0) {
    alert('Your cart is empty!')
    return
  }

  if (!currentUser) {
    alert('Please login before placing an order.')
    authMode = 'login'
    updateAuthForm()
    openAuthPanel()
    return
  }

  checkoutOverlay.classList.add('show')
  checkoutMessage.textContent = 'Loading your delivery details...'
  checkoutMessage.style.color = '#555'
  placeOrderButton.disabled = true

  try {
    const profile = await getCustomerProfile()

    document.querySelector('#checkoutName').value = profile.full_name || ''
    document.querySelector('#checkoutEmail').value = currentUser.email || ''
    document.querySelector('#checkoutPhone').value = profile.phone || ''
    document.querySelector('#checkoutAddress').value = profile.address || ''
    document.querySelector('#checkoutCity').value = profile.city || ''
    document.querySelector('#checkoutState').value = profile.state || ''
    document.querySelector('#checkoutPincode').value = profile.pincode || ''

    updateCheckoutSummary()
    checkoutMessage.textContent = ''
  } catch (error) {
    console.error(error)
    checkoutMessage.textContent =
      error.message + ' Please update your account details first.'
    checkoutMessage.style.color = 'red'
  } finally {
    placeOrderButton.disabled = false
  }
}

document.querySelector('#checkoutButton').addEventListener('click', openCheckout)

document.querySelector('#closeCheckout').addEventListener('click', () => {
  checkoutOverlay.classList.remove('show')
})

checkoutOverlay.addEventListener('click', event => {
  if (event.target === checkoutOverlay) checkoutOverlay.classList.remove('show')
})

// =====================================================
// PLACE CASH ON DELIVERY ORDER
// =====================================================

checkoutForm.addEventListener('submit', async event => {
  event.preventDefault()

  if (!currentUser) {
    checkoutMessage.textContent = 'Please login before placing an order.'
    checkoutMessage.style.color = 'red'
    return
  }

  if (cart.length === 0) {
    checkoutMessage.textContent = 'Your cart is empty.'
    checkoutMessage.style.color = 'red'
    return
  }

  const customerName = document.querySelector('#checkoutName').value.trim()
  const phone = document.querySelector('#checkoutPhone').value.trim()
  const address = document.querySelector('#checkoutAddress').value.trim()
  const city = document.querySelector('#checkoutCity').value.trim()
  const state = document.querySelector('#checkoutState').value.trim()
  const pincode = document.querySelector('#checkoutPincode').value.trim()

  if (!customerName || !phone || !address || !city || !state || !pincode) {
    checkoutMessage.textContent = 'Please complete all delivery details.'
    checkoutMessage.style.color = 'red'
    return
  }

  if (!confirm('Place this order with Cash on Delivery?')) return

  placeOrderButton.disabled = true
  placeOrderButton.textContent = 'Placing Order...'
  checkoutMessage.textContent = 'Please wait while we place your order...'
  checkoutMessage.style.color = '#555'

  try {
    const orderItems = cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity
    }))

    const { data, error } = await supabase.rpc('place_cod_order', {
      p_customer_name: customerName,
      p_phone: phone,
      p_address: address,
      p_city: city,
      p_state: state,
      p_pincode: pincode,
      p_items: orderItems
    })

    if (error) throw error

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: customerName,
        phone,
        address,
        city,
        state,
        pincode,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id)

    if (profileError) {
      console.error('Order saved, but profile update failed:', profileError)
    }

    cart = []
    saveCart()
    renderCart()

    checkoutForm.reset()
    checkoutOverlay.classList.remove('show')

    alert(`Your order has been placed successfully!\n\nOrder ID: ${data}\nPayment: Cash on Delivery`)

    showPage('orders')
  } catch (error) {
    console.error(error)
    checkoutMessage.textContent =
      error.message || 'Unable to place your order. Please try again.'
    checkoutMessage.style.color = 'red'
  } finally {
    placeOrderButton.disabled = false
    placeOrderButton.textContent = 'Place Order'
  }
})

// =====================================================
// MY ORDERS
// =====================================================

const ordersList = document.querySelector('#ordersList')
const orderDetails = document.querySelector('#orderDetails')

async function loadOrdersPage() {
  if (!currentUser) return

  ordersList.style.display = 'block'
  orderDetails.style.display = 'none'
  ordersList.innerHTML = '<p>Loading your orders...</p>'

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_at,
        total,
        payment_method,
        payment_status,
        order_status
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      ordersList.innerHTML = `
        <p>You have not placed any orders yet.</p>
        <button class="primary-button" data-go-page="products">
          Start Shopping
        </button>
      `

      ordersList.querySelector('[data-go-page="products"]')
        ?.addEventListener('click', () => showPage('products'))
      return
    }

    ordersList.innerHTML = data.map(order => `
      <div class="order-card">
        <h3>Order #${escapeHTML(order.order_number)}</h3>
        <p>Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}</p>
        <p>Total: ₹${Number(order.total).toLocaleString('en-IN')}</p>
        <p>Payment: ${escapeHTML(order.payment_method)}</p>
        <p>Payment Status: ${escapeHTML(order.payment_status)}</p>
        <p>Order Status: ${escapeHTML(order.order_status)}</p>
        <button class="view-order-button" data-order-id="${escapeHTML(order.id)}">
          View Details
        </button>
      </div>
    `).join('')
  } catch (error) {
    console.error(error)
    ordersList.innerHTML = `<p>Unable to load orders: ${escapeHTML(error.message)}</p>`
  }
}

async function viewOrderDetails(orderId) {
  if (!currentUser) return

  ordersList.style.display = 'none'
  orderDetails.style.display = 'block'
  orderDetails.innerHTML = '<p>Loading order details...</p>'

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', currentUser.id)
      .single()

    if (orderError) throw orderError

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    if (itemsError) throw itemsError

    orderDetails.innerHTML = `
      <button class="order-back-button" id="backToOrders">← Back to Orders</button>
      <h3>Order #${escapeHTML(order.order_number)}</h3>
      <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleString('en-IN')}</p>
      <p><strong>Customer:</strong> ${escapeHTML(order.customer_name)}</p>
      <p><strong>Phone:</strong> ${escapeHTML(order.phone)}</p>
      <p><strong>Delivery Address:</strong>
        ${escapeHTML(order.address)}, ${escapeHTML(order.city)},
        ${escapeHTML(order.state)} - ${escapeHTML(order.pincode)}
      </p>
      <h3>Purchased Products</h3>
      ${
        items.length
          ? items.map(item => `
              <div class="order-card">
                <h4>${escapeHTML(item.product_name)}</h4>
                <p>Quantity: ${Number(item.quantity)}</p>
                <p>Unit Price: ₹${Number(item.unit_price).toLocaleString('en-IN')}</p>
                <p>Line Total: ₹${Number(item.line_total).toLocaleString('en-IN')}</p>
              </div>
            `).join('')
          : '<p>No order items found.</p>'
      }
      <div class="checkout-summary">
        <p>Subtotal: ₹${Number(order.subtotal).toLocaleString('en-IN')}</p>
        <p>Delivery: ₹${Number(order.delivery_fee).toLocaleString('en-IN')}</p>
        <h3>Total: ₹${Number(order.total).toLocaleString('en-IN')}</h3>
        <p>Payment: ${escapeHTML(order.payment_method)}</p>
        <p>Payment Status: ${escapeHTML(order.payment_status)}</p>
        <p>Order Status: ${escapeHTML(order.order_status)}</p>
      </div>
    `

    document.querySelector('#backToOrders').addEventListener('click', () => {
      orderDetails.style.display = 'none'
      ordersList.style.display = 'block'
    })
  } catch (error) {
    console.error(error)
    orderDetails.innerHTML = `
      <p>Unable to load order details: ${escapeHTML(error.message)}</p>
      <button class="order-back-button" id="backToOrders">← Back to Orders</button>
    `
    document.querySelector('#backToOrders').addEventListener('click', () => {
      orderDetails.style.display = 'none'
      ordersList.style.display = 'block'
    })
  }
}

document.querySelector('#ordersButton').addEventListener('click', () => showPage('orders'))

ordersList.addEventListener('click', event => {
  const button = event.target.closest('.view-order-button')
  if (button) viewOrderDetails(button.dataset.orderId)
})

// =====================================================
// LOGOUT
// =====================================================

async function logoutUser() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    alert(error.message)
    return
  }

  cart = []
  wishlistIds = new Set()
  localStorage.removeItem('shopease_cart')

  renderCart()
  updateWishlistCount()
  renderProducts()
  renderHomeProducts()
  renderWishlist()

  authOverlay.classList.remove('show')
  resetPasswordOverlay.classList.remove('show')
  checkoutOverlay.classList.remove('show')

  showPage('home')
  updateAccountButton(null)

  alert('You have logged out successfully.')
}

// =====================================================
// CHECK LOGIN SESSION
// =====================================================

async function checkUserSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error(error)
    return
  }

  currentUser = data.session?.user || null
  updateAccountButton(currentUser)

  if (currentUser) {
    await loadWishlist()
  } else {
    wishlistIds = new Set()
    updateWishlistCount()
  }
}

// =====================================================
// AUTHENTICATION STATE LISTENER
// =====================================================

supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null

  if (event === 'SIGNED_OUT') {
    cart = []
    wishlistIds = new Set()
    localStorage.removeItem('shopease_cart')
    renderCart()
    updateWishlistCount()
    renderProducts()
    renderHomeProducts()
    renderWishlist()
    showPage('home')
  }

  if (event === 'PASSWORD_RECOVERY') {
    authOverlay.classList.remove('show')
    resetPasswordMessage.textContent = ''
    resetPasswordMessage.style.color = ''
    resetPasswordForm.reset()
    resetPasswordOverlay.classList.add('show')
  }

  updateAccountButton(currentUser)

  setTimeout(() => {
    if (currentUser) {
      loadWishlist()
    } else {
      wishlistIds = new Set()
      updateWishlistCount()
      renderProducts()
      renderHomeProducts()
      renderWishlist()
    }
  }, 0)
})

// =====================================================
// START WEBSITE
// =====================================================

renderCart()
updateAuthForm()
updateWishlistCount()
checkUserSession()
loadProducts()

// Keep your separate Admin Panel module.
import './admin.js'
