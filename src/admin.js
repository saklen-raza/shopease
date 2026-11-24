
import { supabase } from './supabase.js'

// =====================================================
// SHOEASE ADMIN PANEL
// Supports up to 5 images per product.
// =====================================================

const ADMIN_EMAIL = 'saklenr6@gmail.com'
const STORAGE_BUCKET = 'product-images'
const MAX_PRODUCT_IMAGES = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

let adminUser = null
let products = []
let orders = []
let activeTab = 'dashboard'
let editingProductId = null

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

const escapeHTML = (value = '') =>
  String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char])

const money = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN')

function getProductImages(product) {
  const images = Array.isArray(product?.images)
    ? product.images.filter(url => typeof url === 'string' && url.trim())
    : []

  // Support products created before the multiple-image feature.
  if (!images.length && product?.image_url) {
    return [product.image_url]
  }

  return images
}

function showMessage(message, type = 'success') {
  const box = document.querySelector('#adminMessage')

  if (!box) {
    alert(message)
    return
  }

  box.textContent = message
  box.className = `admin-message ${type}`
  box.style.display = 'block'

  setTimeout(() => {
    if (box) box.style.display = 'none'
  }, 4000)
}

// -----------------------------------------------------
// VERIFY ADMIN ROLE
// -----------------------------------------------------

async function getRole(user) {
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Unable to check admin role:', error)
    return null
  }

  return data?.role || null
}

// -----------------------------------------------------
// ADMIN BUTTON
// -----------------------------------------------------

function createAdminButton() {
  const existingButton = document.querySelector('#openAdminPanel')

  if (existingButton) existingButton.remove()

  if (!adminUser) return

  const button = document.createElement('button')

  button.id = 'openAdminPanel'
  button.className = 'admin-entry-button'
  button.textContent = 'Admin Panel'

  button.addEventListener('click', openAdminPanel)

  document.body.appendChild(button)
}

function removeAdminButton() {
  document.querySelector('#openAdminPanel')?.remove()
}

// -----------------------------------------------------
// LOGIN OVERLAY
// -----------------------------------------------------

function createAdminOverlay() {
  if (document.querySelector('#adminOverlay')) return

  const overlay = document.createElement('div')

  overlay.id = 'adminOverlay'
  overlay.className = 'admin-overlay'

  overlay.innerHTML = `
    <div class="admin-login-card">

      <button class="admin-close" id="closeAdminLogin">×</button>

      <div class="admin-login-brand">SHOEEASE</div>

      <p class="admin-eyebrow">ADMINISTRATION</p>

      <h2>Admin Login</h2>

      <p class="admin-muted">
        Sign in with your administrator account.
      </p>

      <form id="adminLoginForm">

        <label>Email address</label>

        <input
          type="email"
          id="adminEmail"
          value="${ADMIN_EMAIL}"
          required
        >

        <label>Password</label>

        <input
          type="password"
          id="adminPassword"
          placeholder="Enter admin password"
          required
        >

        <button type="submit" class="admin-primary-button">
          Sign In
        </button>

      </form>

      <p id="adminLoginError" class="admin-error"></p>

    </div>
  `

  document.body.appendChild(overlay)

  document.querySelector('#closeAdminLogin')
    .addEventListener('click', closeAdminPanel)

  document.querySelector('#adminLoginForm')
    .addEventListener('submit', adminLogin)
}

function openAdminPanel() {
  createAdminOverlay()

  document.querySelector('#adminOverlay')
    .classList.add('visible')

  if (adminUser) {
    renderDashboard()
  }
}

function closeAdminPanel() {
  document.querySelector('#adminOverlay')
    ?.classList.remove('visible')
}

// -----------------------------------------------------
// ADMIN LOGIN
// -----------------------------------------------------

async function adminLogin(event) {
  event.preventDefault()

  const email = document.querySelector('#adminEmail')
    .value.trim()

  const password = document.querySelector('#adminPassword')
    .value

  const errorBox = document.querySelector('#adminLoginError')

  errorBox.textContent = ''

  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    errorBox.textContent =
      'This email is not the registered admin account.'
    return
  }

  const submitButton = event.currentTarget.querySelector(
    'button[type="submit"]'
  )

  submitButton.disabled = true
  submitButton.textContent = 'Signing in...'

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    const role = await getRole(data.user)

    if (role !== 'admin') {
      await supabase.auth.signOut()

      throw new Error(
        'Access denied. This account does not have admin permission.'
      )
    }

    adminUser = data.user

    createAdminButton()

    await renderDashboard()

  } catch (error) {
    errorBox.textContent = error.message
    submitButton.disabled = false
    submitButton.textContent = 'Sign In'
  }
}

// -----------------------------------------------------
// DASHBOARD STRUCTURE
// -----------------------------------------------------

function adminShell() {
  const overlay = document.querySelector('#adminOverlay')

  overlay.innerHTML = `
    <div class="admin-dashboard">

      <aside class="admin-sidebar">

        <div class="admin-sidebar-brand">
          <span>SHOEEASE</span>
          <small>ADMINISTRATION</small>
        </div>

        <nav class="admin-menu">

          <button data-tab="dashboard">
            Overview
          </button>

          <button data-tab="products">
            Products
          </button>

          <button data-tab="orders">
            Orders
          </button>

        </nav>

        <div class="admin-sidebar-bottom">

          <small>${escapeHTML(adminUser.email)}</small>

          <button id="adminLogout" class="admin-logout-button">
            Logout
          </button>

          <button id="closeAdminDashboard" class="admin-back-button">
            Back to Store
          </button>

        </div>

      </aside>

      <main class="admin-main">

        <header class="admin-topbar">

          <div>
            <p class="admin-eyebrow">SHOEEASE MANAGEMENT</p>
            <h1 id="adminPageTitle">Overview</h1>
          </div>

          <span class="admin-account-label">
            Administrator
          </span>

        </header>

        <div id="adminMessage" class="admin-message"></div>

        <section id="adminContent">
          <p>Loading dashboard...</p>
        </section>

      </main>

    </div>
  `

  overlay.classList.add('visible')

  overlay.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      activeTab = button.dataset.tab
      renderCurrentTab()
    })
  })

  document.querySelector('#adminLogout')
    .addEventListener('click', adminLogout)

  document.querySelector('#closeAdminDashboard')
    .addEventListener('click', closeAdminPanel)
}

// -----------------------------------------------------
// LOAD DASHBOARD
// -----------------------------------------------------

async function renderDashboard() {
  adminShell()

  await loadProducts()
  await loadOrders()

  await renderCurrentTab()
}

async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    showMessage('Could not load products: ' + error.message, 'error')
    products = []
    return
  }

  products = data || []
}

async function loadOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    showMessage('Could not load orders: ' + error.message, 'error')
    orders = []
    return
  }

  orders = data || []
}

// -----------------------------------------------------
// TAB NAVIGATION
// -----------------------------------------------------

async function renderCurrentTab() {
  const content = document.querySelector('#adminContent')

  if (!content) return

  document.querySelectorAll('.admin-menu button')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.tab === activeTab
      )
    })

  const titles = {
    dashboard: 'Overview',
    products: 'Product Management',
    orders: 'Customer Orders'
  }

  document.querySelector('#adminPageTitle').textContent =
    titles[activeTab] || 'Overview'

  if (activeTab === 'dashboard') {
    renderOverview(content)
  }

  if (activeTab === 'products') {
    renderProducts(content)
  }

  if (activeTab === 'orders') {
    renderOrders(content)
  }
}

// -----------------------------------------------------
// OVERVIEW
// -----------------------------------------------------

function renderOverview(content) {
  const totalProducts = products.length

  const activeProducts = products.filter(
    p => p.is_active !== false
  ).length

  const totalOrders = orders.length

  const pendingOrders = orders.filter(order =>
    !['delivered', 'cancelled'].includes(
      String(order.order_status || '').toLowerCase()
    )
  ).length

  const revenue = orders.reduce((sum, order) => {
    if (
      String(order.order_status || '').toLowerCase() === 'cancelled'
    ) {
      return sum
    }

    return sum + Number(order.total || 0)
  }, 0)

  content.innerHTML = `

    <div class="admin-welcome">

      <div>
        <p class="admin-eyebrow">WELCOME BACK</p>
        <h2>Store Overview</h2>
        <p>Manage your products and customer orders from here.</p>
      </div>

      <span class="admin-welcome-icon">✦</span>

    </div>

    <div class="admin-stats-grid">

      <div class="admin-stat-card">
        <span>Total Products</span>
        <strong>${totalProducts}</strong>
        <small>${activeProducts} active products</small>
      </div>

      <div class="admin-stat-card">
        <span>Total Orders</span>
        <strong>${totalOrders}</strong>
        <small>All customer orders</small>
      </div>

      <div class="admin-stat-card">
        <span>Orders to Process</span>
        <strong>${pendingOrders}</strong>
        <small>Not delivered or cancelled</small>
      </div>

      <div class="admin-stat-card">
        <span>Order Value</span>
        <strong>${money(revenue)}</strong>
        <small>Excludes cancelled orders</small>
      </div>

    </div>

    <div class="admin-section-card">

      <div class="admin-section-heading">

        <div>
          <p class="admin-eyebrow">RECENT ACTIVITY</p>
          <h3>Latest Orders</h3>
        </div>

        <button class="admin-text-button" id="viewAllOrders">
          View all orders →
        </button>

      </div>

      ${orders.length ? `

        <div class="admin-table-wrap">

          <table class="admin-table">

            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              ${orders.slice(0, 5).map(order => `

                <tr>
                  <td>${escapeHTML(order.order_number || order.id)}</td>

                  <td>
                    ${escapeHTML(order.customer_name || 'Customer')}
                  </td>

                  <td>${money(order.total)}</td>

                  <td>${statusBadge(order.order_status)}</td>
                </tr>

              `).join('')}

            </tbody>

          </table>

        </div>

      ` : '<p class="admin-empty">No orders received yet.</p>'}

    </div>
  `

  document.querySelector('#viewAllOrders')
    .addEventListener('click', () => {
      activeTab = 'orders'
      renderCurrentTab()
    })
}

// -----------------------------------------------------
// PRODUCT MANAGEMENT
// -----------------------------------------------------

function renderProducts(content) {
  content.innerHTML = `

    <div class="admin-section-card">

      <div class="admin-section-heading">

        <div>
          <p class="admin-eyebrow">STORE INVENTORY</p>
          <h3>Manage Products</h3>
          <p class="admin-muted">
            Add, edit, activate or remove products.
          </p>
        </div>

        <button class="admin-primary-button" id="addProductButton">
          + Add Product
        </button>

      </div>

      <div id="productFormContainer"></div>

      <div class="admin-table-wrap">

        <table class="admin-table">

          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Visibility</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            ${products.length ? products.map(product => {

              const images = getProductImages(product)

              return `

                <tr>

                  <td>
                    <div class="admin-product-cell">

                      ${images[0]
                        ? `<img src="${escapeHTML(images[0])}" alt="">`
                        : '<div class="admin-no-image">—</div>'}

                      <strong>${escapeHTML(product.name)}</strong>

                    </div>
                  </td>

                  <td>${escapeHTML(product.category || '—')}</td>

                  <td>${money(product.price)}</td>

                  <td>${product.stock === undefined
                    ? 'Not configured'
                    : Number(product.stock)}</td>

                  <td>
                    ${product.is_active === false
                      ? '<span class="admin-status inactive">Hidden</span>'
                      : '<span class="admin-status delivered">Active</span>'}
                  </td>

                  <td>

                    <div class="admin-action-group">

                      <button
                        class="admin-small-button"
                        data-edit="${escapeHTML(product.id)}">
                        Edit
                      </button>

                      <button
                        class="admin-small-button danger"
                        data-delete="${escapeHTML(product.id)}">
                        Delete
                      </button>

                    </div>

                  </td>

                </tr>

              `
            }).join('') : `

              <tr>
                <td colspan="6" class="admin-empty">
                  No products found.
                </td>
              </tr>

            `}

          </tbody>

        </table>

      </div>

    </div>
  `

  document.querySelector('#addProductButton')
    .addEventListener('click', () => showProductForm())

  content.querySelectorAll('[data-edit]').forEach(button => {
    button.addEventListener('click', () => {
      const product = products.find(
        p => String(p.id) === button.dataset.edit
      )

      if (product) showProductForm(product)
    })
  })

  content.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', () => {
      deleteProduct(button.dataset.delete)
    })
  })
}

// -----------------------------------------------------
// ADD / EDIT PRODUCT FORM
// -----------------------------------------------------

function showProductForm(product = null) {
  editingProductId = product?.id || null

  const container = document.querySelector('#productFormContainer')

  const existingImages = getProductImages(product)

  container.innerHTML = `

    <form id="adminProductForm" class="admin-product-form">

      <h3>${product ? 'Edit Product' : 'Add New Product'}</h3>

      <div class="admin-form-grid">

        <div>
          <label>Product Name *</label>

          <input
            id="productName"
            required
            value="${escapeHTML(product?.name || '')}">
        </div>

        <div>
          <label>Category *</label>

          <input
            id="productCategory"
            required
            value="${escapeHTML(product?.category || '')}">
        </div>

        <div>
          <label>Price (₹) *</label>

          <input
            id="productPrice"
            type="number"
            min="0"
            step="0.01"
            required
            value="${product?.price ?? ''}">
        </div>

        <div>
          <label>Old Price (₹)</label>

          <input
            id="productOldPrice"
            type="number"
            min="0"
            step="0.01"
            value="${product?.old_price ?? ''}">
        </div>

        <div>
          <label>Stock Quantity</label>

          <input
            id="productStock"
            type="number"
            min="0"
            value="${product?.stock ?? 0}">
        </div>

        <div>
          <label>Product Images (Maximum 5)</label>

          <input
            id="productImages"
            type="file"
            accept="image/*"
            multiple>

          <small class="admin-muted">
            Select multiple images. Each image must be under 5 MB.
          </small>

        </div>

        <div class="admin-form-full">

          <label>Description</label>

          <textarea
            id="productDescription"
            rows="4">${escapeHTML(product?.description || '')}</textarea>

        </div>

        <div class="admin-form-full admin-checkbox-row">

          <input
            id="productActive"
            type="checkbox"
            ${product?.is_active === false ? '' : 'checked'}>

          <label for="productActive">
            Show this product in the store
          </label>

        </div>

      </div>

      ${existingImages.length ? `

        <div class="admin-existing-images">

          <p><strong>Current Product Images</strong></p>

          <p class="admin-muted">
            Uncheck any picture you want to remove.
          </p>

          <div style="
            display:flex;
            flex-wrap:wrap;
            gap:14px;
            margin:12px 0 20px;
          ">

            ${existingImages.map((url, index) => `

              <label style="
                display:flex;
                flex-direction:column;
                gap:7px;
                width:110px;
                cursor:pointer;
              ">

                <img
                  src="${escapeHTML(url)}"
                  alt="Product image ${index + 1}"
                  style="
                    width:100%;
                    height:105px;
                    object-fit:cover;
                    border-radius:8px;
                    border:1px solid #ddd;
                  ">

                <span style="font-size:12px;">
                  <input
                    type="checkbox"
                    data-keep-image="${index}"
                    checked>
                  Keep image ${index + 1}
                </span>

              </label>

            `).join('')}

          </div>

        </div>

      ` : ''}

      <p id="productImageCount" class="admin-muted">
        ${existingImages.length} of ${MAX_PRODUCT_IMAGES} images currently saved.
      </p>

      <div class="admin-form-actions">

        <button type="submit" class="admin-primary-button">
          ${product ? 'Save Changes' : 'Add Product'}
        </button>

        <button
          type="button"
          class="admin-cancel-button"
          id="cancelProductForm">
          Cancel
        </button>

      </div>

    </form>
  `

  const fileInput = document.querySelector('#productImages')
  const countLabel = document.querySelector('#productImageCount')

  function updateImageCount() {
    const keptCount = container.querySelectorAll(
      '[data-keep-image]:checked'
    ).length

    const selectedCount = fileInput.files.length

    countLabel.textContent =
      `${keptCount} existing + ${selectedCount} new image(s) selected. Maximum ${MAX_PRODUCT_IMAGES}.`

    countLabel.style.color =
      keptCount + selectedCount > MAX_PRODUCT_IMAGES
        ? 'red'
        : ''
  }

  fileInput.addEventListener('change', updateImageCount)

  container.querySelectorAll('[data-keep-image]')
    .forEach(checkbox => {
      checkbox.addEventListener('change', updateImageCount)
    })

  document.querySelector('#cancelProductForm')
    .addEventListener('click', () => {
      container.innerHTML = ''
      editingProductId = null
    })

  document.querySelector('#adminProductForm')
    .addEventListener('submit', saveProduct)

  container.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

// -----------------------------------------------------
// UPLOAD PRODUCT IMAGE
// -----------------------------------------------------

async function uploadProductImage(file) {
  if (!file) return null

  if (!file.type.startsWith('image/')) {
    throw new Error('Please select valid image files.')
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      `${file.name} is larger than 5 MB. Please choose a smaller image.`
    )
  }

  const extension = file.name.split('.').pop().toLowerCase()

  const filePath =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath)

  return data.publicUrl
}

// -----------------------------------------------------
// SAVE PRODUCT
// -----------------------------------------------------

async function saveProduct(event) {
  event.preventDefault()

  const form = event.currentTarget

  const submitButton = form.querySelector('[type="submit"]')

  submitButton.disabled = true
  submitButton.textContent = 'Saving...'

  try {
    const existingProduct = products.find(
      p => String(p.id) === String(editingProductId)
    )

    const existingImages = getProductImages(existingProduct)

    // Keep only images whose checkboxes are selected.
    const keptImages = existingImages.filter((url, index) => {
      const checkbox = document.querySelector(
        `[data-keep-image="${index}"]`
      )

      return checkbox ? checkbox.checked : true
    })

    const selectedFiles = Array.from(
      document.querySelector('#productImages').files
    )

    // Validate image count before uploading anything.
    if (keptImages.length + selectedFiles.length > MAX_PRODUCT_IMAGES) {
      throw new Error(
        `You can have a maximum of ${MAX_PRODUCT_IMAGES} images per product. You currently have ${keptImages.length} existing images selected and ${selectedFiles.length} new images.`
      )
    }

    // Validate all selected files.
    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        throw new Error(`${file.name} is not a valid image.`)
      }

      if (file.size > MAX_IMAGE_SIZE) {
        throw new Error(`${file.name} exceeds the 5 MB image limit.`)
      }
    }

    const name = document.querySelector('#productName')
      .value.trim()

    const category = document.querySelector('#productCategory')
      .value.trim()

    const price = Number(
      document.querySelector('#productPrice').value
    )

    if (
      !name ||
      !category ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error('Please enter valid product details.')
    }

    // Upload new images and append them to the kept images.
    const uploadedImages = []

    for (const file of selectedFiles) {
      const url = await uploadProductImage(file)
      uploadedImages.push(url)
    }

    const finalImages = [
      ...keptImages,
      ...uploadedImages
    ]

    // First image is used as the main product image.
    const mainImage = finalImages[0] || null

    const productData = {
      name,

      category,

      price,

      old_price: document.querySelector('#productOldPrice').value
        ? Number(document.querySelector('#productOldPrice').value)
        : null,

      description: document.querySelector('#productDescription')
        .value.trim(),

      image_url: mainImage,

      images: finalImages,

      is_active: document.querySelector('#productActive').checked,

      stock: Number(
        document.querySelector('#productStock').value || 0
      )
    }

    let result

    if (editingProductId) {
      result = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProductId)
    } else {
      result = await supabase
        .from('products')
        .insert(productData)
    }

    if (result.error) throw result.error

    const wasEditing = Boolean(editingProductId)

    editingProductId = null

    showMessage(
      wasEditing
        ? 'Product updated successfully.'
        : 'Product added successfully.'
    )

    await loadProducts()
    await renderCurrentTab()

  } catch (error) {
    console.error('Product save error:', error)

    showMessage(
      error.message || 'Unable to save product.',
      'error'
    )

    submitButton.disabled = false
    submitButton.textContent = 'Try Again'
  }
}

// -----------------------------------------------------
// DELETE PRODUCT
// -----------------------------------------------------

async function deleteProduct(id) {
  const confirmed = confirm(
    'Are you sure you want to delete this product?'
  )

  if (!confirmed) return

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    showMessage(error.message, 'error')
    return
  }

  showMessage('Product deleted successfully.')

  await loadProducts()
  await renderCurrentTab()
}

// -----------------------------------------------------
// ORDER STATUS BADGE
// -----------------------------------------------------

function statusBadge(status) {
  const value = String(status || 'pending').toLowerCase()

  const allowed = [
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  ]

  const safe = allowed.includes(value) ? value : 'pending'

  return `
    <span class="admin-status ${safe}">
      ${escapeHTML(value)}
    </span>
  `
}

// -----------------------------------------------------
// ALL CUSTOMER ORDERS
// -----------------------------------------------------

function renderOrders(content) {
  content.innerHTML = `

    <div class="admin-section-card">

      <div class="admin-section-heading">

        <div>
          <p class="admin-eyebrow">CUSTOMER MANAGEMENT</p>
          <h3>All Orders</h3>

          <p class="admin-muted">
            Review orders and update their status.
          </p>
        </div>

        <button class="admin-secondary-button" id="refreshOrders">
          ↻ Refresh
        </button>

      </div>

      <div class="admin-table-wrap">

        <table class="admin-table">

          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Update</th>
            </tr>
          </thead>

          <tbody>

            ${orders.length ? orders.map(order => `

              <tr>

                <td>
                  ${escapeHTML(order.order_number || order.id)}
                </td>

                <td>

                  <strong>
                    ${escapeHTML(order.customer_name || 'Customer')}
                  </strong>

                  <small class="admin-table-subtext">
                    ${escapeHTML(order.city || '')}
                  </small>

                </td>

                <td>${escapeHTML(order.phone || '—')}</td>

                <td>
                  ${order.created_at
                    ? new Date(order.created_at).toLocaleDateString('en-IN')
                    : '—'}
                </td>

                <td>${money(order.total)}</td>

                <td>
                  ${escapeHTML(order.payment_method || '—')}
                </td>

                <td>
                  ${statusBadge(order.order_status)}
                </td>

                <td>

                  <select
                    class="admin-order-status"
                    data-order-id="${escapeHTML(order.id)}">

                    ${[
                      'pending',
                      'processing',
                      'shipped',
                      'delivered',
                      'cancelled'
                    ].map(status => `

                      <option
                        value="${status}"
                        ${String(order.order_status || 'pending').toLowerCase() === status
                          ? 'selected'
                          : ''}>

                        ${status.charAt(0).toUpperCase() + status.slice(1)}

                      </option>

                    `).join('')}

                  </select>

                </td>

              </tr>

            `).join('') : `

              <tr>
                <td colspan="8" class="admin-empty">
                  No customer orders found.
                </td>
              </tr>

            `}

          </tbody>

        </table>

      </div>

    </div>
  `

  document.querySelector('#refreshOrders')
    .addEventListener('click', async () => {
      await loadOrders()
      await renderCurrentTab()
    })

  content.querySelectorAll('[data-order-id]').forEach(select => {
    select.addEventListener('change', () => {
      updateOrderStatus(
        select.dataset.orderId,
        select.value
      )
    })
  })
}

// -----------------------------------------------------
// UPDATE ORDER STATUS
// -----------------------------------------------------

async function updateOrderStatus(orderId, newStatus) {
  const { error } = await supabase
    .from('orders')
    .update({
      order_status: newStatus
    })
    .eq('id', orderId)

  if (error) {
    showMessage(
      'Could not update order: ' + error.message,
      'error'
    )

    await loadOrders()
    await renderCurrentTab()
    return
  }

  showMessage('Order status updated.')

  await loadOrders()
  await renderCurrentTab()
}

// -----------------------------------------------------
// ADMIN LOGOUT
// -----------------------------------------------------

async function adminLogout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    showMessage(error.message, 'error')
    return
  }

  adminUser = null

  removeAdminButton()
  closeAdminPanel()

  window.location.reload()
}

// -----------------------------------------------------
// CHECK EXISTING SESSION
// -----------------------------------------------------

async function checkExistingAdminSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.error(error)
    return
  }

  const user = data.session?.user

  if (!user) {
    adminUser = null
    removeAdminButton()
    return
  }

  const role = await getRole(user)

  if (
    role === 'admin' &&
    user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  ) {
    adminUser = user
    createAdminButton()
  } else {
    adminUser = null
    removeAdminButton()
  }
}

// -----------------------------------------------------
// INITIALIZE
// -----------------------------------------------------

function initializeAdminPanel() {
  createAdminOverlay()

  checkExistingAdminSession()

  const params = new URLSearchParams(window.location.search)

  if (params.get('admin') === '1') {
    openAdminPanel()
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session?.user) {
      adminUser = null
      removeAdminButton()
      return
    }

    setTimeout(async () => {
      const user = session.user
      const role = await getRole(user)

      if (
        role === 'admin' &&
        user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ) {
        adminUser = user
        createAdminButton()
      } else {
        adminUser = null
        removeAdminButton()
      }
    }, 0)
  })
}

// Start admin panel.
if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initializeAdminPanel
  )
} else {
  initializeAdminPanel()
}
