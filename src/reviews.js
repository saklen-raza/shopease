
import { supabase } from './supabase.js'

// =====================================================
// SHOEASE - PRODUCT REVIEWS & RATINGS
// =====================================================

let selectedRating = 5
let activeProductId = null
let activeProductName = ''
let currentReviewUser = null

const reviewCache = new Map()

function escapeReviewHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

function renderStars(rating) {
  const rounded = Math.round(Number(rating) || 0)

  return `
    <span class="review-stars">
      ${[1, 2, 3, 4, 5].map(number =>
        `<span class="${number <= rounded ? 'star-filled' : 'star-empty'}">★</span>`
      ).join('')}
    </span>
  `
}

// =====================================================
// REVIEW MODAL
// =====================================================

const reviewOverlay = document.createElement('div')
reviewOverlay.className = 'reviews-overlay'

reviewOverlay.innerHTML = `
  <div class="reviews-modal">
    <button class="reviews-close" id="closeReviews">×</button>

    <p class="luxury-eyebrow">CUSTOMER EXPERIENCE</p>
    <h2 id="reviewProductName">Product Reviews</h2>

    <div class="reviews-summary" id="reviewsSummary"></div>

    <div class="reviews-list-section">
      <h3>Customer Reviews</h3>
      <div id="reviewsList">Loading reviews...</div>
    </div>

    <div class="review-form-section" id="reviewFormSection">
      <h3>Write Your Review</h3>
      <p class="review-form-description">
        Share your experience with this product.
      </p>

      <form id="productReviewForm">
        <label>Your Rating</label>

        <div class="rating-selector" id="ratingSelector">
          ${[1, 2, 3, 4, 5].map(number => `
            <button
              type="button"
              class="rating-star selected"
              data-rating="${number}"
              aria-label="${number} stars"
            >★</button>
          `).join('')}
        </div>

        <label for="reviewText">Your Review</label>
        <textarea
          id="reviewText"
          rows="4"
          maxlength="1000"
          placeholder="Write about your experience..."
          required
        ></textarea>

        <p class="review-message" id="reviewMessage"></p>

        <div class="review-form-actions">
          <button type="submit" class="review-submit" id="submitReviewButton">
            Submit Review
          </button>

          <button
            type="button"
            class="review-delete"
            id="deleteReviewButton"
            style="display:none"
          >
            Delete My Review
          </button>
        </div>
      </form>
    </div>

    <div class="review-login-message" id="reviewLoginMessage" style="display:none">
      <p>Please login to submit your review.</p>
    </div>
  </div>
`

document.body.appendChild(reviewOverlay)

// =====================================================
// ADD REVIEW BUTTONS TO PRODUCT CARDS
// =====================================================

function addReviewButtons() {
  const productCards = document.querySelectorAll(
    '#productGrid .product-card, #homeProductGrid .product-card, #wishlistGrid .product-card'
  )

  productCards.forEach(card => {
    const addToCartButton = card.querySelector('.add-button')
    const productInfo = card.querySelector('.product-info')

    if (!addToCartButton || !productInfo) return

    const productId = Number(addToCartButton.dataset.id)
    if (!productId) return

    // Keep existing review controls instead of adding duplicates.
    let controls = productInfo.querySelector('.product-review-controls')

    if (!controls) {
      controls = document.createElement('div')
      controls.className = 'product-review-controls'

      controls.innerHTML = `
        <div class="product-rating-summary" data-rating-summary="${productId}">
          <span class="rating-loading">Loading rating...</span>
        </div>

        <button
          type="button"
          class="view-reviews-button"
          data-review-product="${productId}"
        >
          Write / View Reviews
        </button>
      `

      productInfo.appendChild(controls)
    }

    // Update product information if a card was reused.
    const reviewButton = controls.querySelector('[data-review-product]')

    if (reviewButton) {
      reviewButton.dataset.reviewProduct = productId
      reviewButton.dataset.reviewName =
        card.querySelector('h3')?.textContent?.trim() || 'Product'
    }

    const ratingElement = controls.querySelector('.product-rating-summary')

    if (ratingElement) {
      ratingElement.dataset.ratingSummary = productId
    }

    if (ratingElement && !ratingElement.dataset.loaded) {
      ratingElement.dataset.loaded = 'true'
      loadProductRating(productId)
    }
  })
}

// =====================================================
// LOAD REVIEWS
// =====================================================

async function getProductReviews(productId) {
  if (reviewCache.has(productId)) {
    return reviewCache.get(productId)
  }

  const promise = supabase
    .from('product_reviews')
    .select('id, user_id, rating, review, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (error) throw error
      return data || []
    })

  reviewCache.set(productId, promise)

  try {
    return await promise
  } catch (error) {
    reviewCache.delete(productId)
    throw error
  }
}

async function loadProductRating(productId) {
  const ratingElements = document.querySelectorAll(
    `[data-rating-summary="${productId}"]`
  )

  if (!ratingElements.length) return

  try {
    const reviews = await getProductReviews(productId)

    // Find current elements again because pages may have changed.
    const currentElements = document.querySelectorAll(
      `[data-rating-summary="${productId}"]`
    )

    if (!reviews.length) {
      currentElements.forEach(element => {
        element.innerHTML = `
          <span class="no-rating">☆☆☆☆☆</span>
          <span>No reviews yet</span>
        `
      })
      return
    }

    const average =
      reviews.reduce((total, item) => total + Number(item.rating), 0) /
      reviews.length

    currentElements.forEach(element => {
      element.innerHTML = `
        ${renderStars(average)}
        <span class="rating-number">${average.toFixed(1)}</span>
        <span class="rating-count">(${reviews.length})</span>
      `
    })
  } catch (error) {
    console.error('Unable to load product rating:', error)
  }
}

function refreshProductRatings(productId) {
  reviewCache.delete(Number(productId))

  document.querySelectorAll(
    `[data-rating-summary="${Number(productId)}"]`
  ).forEach(element => {
    element.dataset.loaded = 'true'
    element.innerHTML = '<span>Loading rating...</span>'
  })

  loadProductRating(Number(productId))
}

// =====================================================
// OPEN REVIEW MODAL
// =====================================================

async function openReviews(productId, productName) {
  activeProductId = Number(productId)
  activeProductName = productName
  selectedRating = 5

  reviewOverlay.classList.add('show')

  document.querySelector('#reviewProductName').textContent = activeProductName
  document.querySelector('#reviewsSummary').innerHTML = 'Loading ratings...'
  document.querySelector('#reviewsList').innerHTML = 'Loading reviews...'
  document.querySelector('#reviewText').value = ''
  document.querySelector('#reviewMessage').textContent = ''
  document.querySelector('#submitReviewButton').textContent = 'Submit Review'
  document.querySelector('#deleteReviewButton').style.display = 'none'

  updateRatingSelector()

  const { data, error } = await supabase.auth.getUser()

  currentReviewUser = error ? null : data.user || null

  document.querySelector('#reviewFormSection').style.display =
    currentReviewUser ? 'block' : 'none'

  document.querySelector('#reviewLoginMessage').style.display =
    currentReviewUser ? 'none' : 'block'

  await loadReviewsIntoModal()
}

// =====================================================
// DISPLAY CUSTOMER REVIEWS
// =====================================================

async function loadReviewsIntoModal() {
  if (!activeProductId) return

  try {
    const reviews = await getProductReviews(activeProductId)

    const average = reviews.length
      ? reviews.reduce((total, item) => total + Number(item.rating), 0) / reviews.length
      : 0

    document.querySelector('#reviewsSummary').innerHTML = `
      <div class="reviews-average">
        <strong>${average.toFixed(1)}</strong>
        ${renderStars(average)}
        <span>${reviews.length} review${reviews.length === 1 ? '' : 's'}</span>
      </div>
    `

    const reviewsList = document.querySelector('#reviewsList')

    if (!reviews.length) {
      reviewsList.innerHTML = `
        <div class="no-reviews">
          <span>☆</span>
          <h4>No reviews yet</h4>
          <p>Be the first customer to review this product.</p>
        </div>
      `
    } else {
      reviewsList.innerHTML = reviews.map(item => {
        const isOwnReview =
          currentReviewUser && item.user_id === currentReviewUser.id

        return `
          <div class="customer-review">
            <div class="customer-review-top">
              <strong>${isOwnReview ? 'Your Review' : 'ShopEase Customer'}</strong>
              <span>${new Date(item.created_at).toLocaleDateString('en-IN')}</span>
            </div>

            ${renderStars(item.rating)}

            <p>${escapeReviewHTML(item.review)}</p>

            ${isOwnReview ? '<span class="your-review-label">Your review</span>' : ''}
          </div>
        `
      }).join('')
    }

    const ownReview = currentReviewUser
      ? reviews.find(item => item.user_id === currentReviewUser.id)
      : null

    if (ownReview) {
      selectedRating = Number(ownReview.rating)
      document.querySelector('#reviewText').value = ownReview.review
      document.querySelector('#submitReviewButton').textContent = 'Update My Review'
      document.querySelector('#deleteReviewButton').style.display = 'inline-block'
    } else {
      selectedRating = 5
      document.querySelector('#reviewText').value = ''
      document.querySelector('#submitReviewButton').textContent = 'Submit Review'
      document.querySelector('#deleteReviewButton').style.display = 'none'
    }

    updateRatingSelector()
  } catch (error) {
    console.error(error)

    document.querySelector('#reviewsList').innerHTML =
      `<p>Unable to load reviews: ${escapeReviewHTML(error.message)}</p>`
  }
}

// =====================================================
// RATING SELECTOR
// =====================================================

function updateRatingSelector() {
  document.querySelectorAll('.rating-star').forEach(button => {
    const rating = Number(button.dataset.rating)
    button.classList.toggle('selected', rating <= selectedRating)
  })
}

document.querySelector('#ratingSelector').addEventListener('click', event => {
  const button = event.target.closest('[data-rating]')
  if (!button) return

  selectedRating = Number(button.dataset.rating)
  updateRatingSelector()
})

// =====================================================
// SUBMIT OR UPDATE REVIEW
// =====================================================

document.querySelector('#productReviewForm').addEventListener('submit', async event => {
  event.preventDefault()

  if (!activeProductId || !currentReviewUser) return

  const message = document.querySelector('#reviewMessage')
  const submitButton = document.querySelector('#submitReviewButton')
  const reviewText = document.querySelector('#reviewText').value.trim()

  if (!reviewText) {
    message.textContent = 'Please write your review.'
    return
  }

  submitButton.disabled = true
  submitButton.textContent = 'Saving...'
  message.textContent = ''

  try {
    const { error } = await supabase
      .from('product_reviews')
      .upsert({
        user_id: currentReviewUser.id,
        product_id: activeProductId,
        rating: selectedRating,
        review: reviewText,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,product_id'
      })

    if (error) throw error

    reviewCache.delete(activeProductId)

    message.style.color = 'green'
    message.textContent = 'Your review has been saved successfully!'

    await loadReviewsIntoModal()
    refreshProductRatings(activeProductId)
  } catch (error) {
    console.error(error)
    message.style.color = 'red'
    message.textContent = error.message
  } finally {
    submitButton.disabled = false
    submitButton.textContent = 'Submit Review'
  }
})

// =====================================================
// DELETE REVIEW
// =====================================================

document.querySelector('#deleteReviewButton').addEventListener('click', async () => {
  if (!currentReviewUser || !activeProductId) return

  if (!confirm('Are you sure you want to delete your review?')) return

  const button = document.querySelector('#deleteReviewButton')
  const message = document.querySelector('#reviewMessage')

  button.disabled = true
  button.textContent = 'Deleting...'

  try {
    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('user_id', currentReviewUser.id)
      .eq('product_id', activeProductId)

    if (error) throw error

    reviewCache.delete(activeProductId)

    message.style.color = 'green'
    message.textContent = 'Your review has been deleted.'

    await loadReviewsIntoModal()
    refreshProductRatings(activeProductId)
  } catch (error) {
    console.error(error)
    message.style.color = 'red'
    message.textContent = error.message
  } finally {
    button.disabled = false
    button.textContent = 'Delete My Review'
  }
})

// =====================================================
// EVENT LISTENERS
// =====================================================

document.addEventListener('click', event => {
  const button = event.target.closest('[data-review-product]')
  if (!button) return

  event.preventDefault()
  event.stopPropagation()

  openReviews(
    button.dataset.reviewProduct,
    button.dataset.reviewName || 'Product'
  )
})

document.querySelector('#closeReviews').addEventListener('click', () => {
  reviewOverlay.classList.remove('show')
})

reviewOverlay.addEventListener('click', event => {
  if (event.target === reviewOverlay) {
    reviewOverlay.classList.remove('show')
  }
})

// =====================================================
// OBSERVE PRODUCT CARDS AND PAGE CHANGES
// =====================================================

let productGridObserver = null

function startReviewIntegration() {
  const gridSelectors = [
    '#productGrid',
    '#homeProductGrid',
    '#wishlistGrid'
  ]

  gridSelectors.forEach(selector => {
    const grid = document.querySelector(selector)
    if (!grid) return

    if (!productGridObserver) {
      productGridObserver = new MutationObserver(() => {
        addReviewButtons()
      })
    }

    productGridObserver.observe(grid, {
      childList: true,
      subtree: true
    })
  })

  addReviewButtons()
}

// Run after the page has loaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startReviewIntegration, { once: true })
} else {
  requestAnimationFrame(startReviewIntegration)
}

// Recheck after navigation and other page updates.
document.addEventListener('click', () => {
  setTimeout(addReviewButtons, 100)
  setTimeout(addReviewButtons, 400)
})

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) addReviewButtons()
})
