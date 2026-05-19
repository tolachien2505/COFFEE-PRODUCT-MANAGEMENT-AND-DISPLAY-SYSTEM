const fallbackImage =
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=85';

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setupReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  items.forEach((item) => observer.observe(item));
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function setupModals() {
  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.closest('.modal')));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal.open').forEach(closeModal);
    }
  });
}

function setupQuickView() {
  const modal = document.getElementById('productModal');
  if (!modal) return;

  document.querySelectorAll('.quick-view').forEach((button) => {
    button.addEventListener('click', () => {
      const image = document.getElementById('modalImage');
      const status = document.getElementById('modalStatus');

      image.src = button.dataset.image || fallbackImage;
      image.alt = button.dataset.name || 'Sản phẩm';
      document.getElementById('modalTitle').textContent = button.dataset.name || '';
      document.getElementById('modalDescription').textContent = button.dataset.description || '';
      document.getElementById('modalPrice').textContent = button.dataset.price || '';
      document.getElementById('modalCategory').textContent = button.dataset.category || '';
      status.textContent = button.dataset.status || '';
      status.className = `status-badge ${button.dataset.status === 'Hết hàng' ? 'out_of_stock' : 'in_stock'}`;
      openModal(modal);
    });
  });
}

function setupDeleteConfirm() {
  const modal = document.getElementById('deleteModal');
  const form = document.getElementById('deleteForm');
  const name = document.getElementById('deleteName');
  if (!modal || !form || !name) return;

  document.querySelectorAll('.delete-trigger').forEach((button) => {
    button.addEventListener('click', () => {
      form.action = `/admin/products/${button.dataset.id}/delete`;
      name.textContent = button.dataset.name || 'sản phẩm này';
      openModal(modal);
    });
  });
}

function setupImageFallbacks() {
  document.querySelectorAll('img').forEach((image) => {
    if (image.complete && image.naturalWidth === 0) {
      image.src = fallbackImage;
    }

    image.addEventListener('error', () => {
      if (image.src !== fallbackImage) {
        image.src = fallbackImage;
      }
    });
  });
}

function setupPreview() {
  const input = document.querySelector('[data-preview-input]');
  const image = document.querySelector('[data-preview-image]');
  if (!input || !image) return;

  input.addEventListener('input', () => {
    const nextSrc = input.value.trim();
    image.src = nextSrc || fallbackImage;
  });
}

function setupLoadingButtons() {
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', () => {
      const button = form.querySelector('[data-loading-button]');
      if (!button) return;
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span> Đang lưu...';
    });
  });
}

function setupToast() {
  const toast = document.querySelector('[data-toast]');
  if (!toast) return;

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
  }, 3200);
}

function setupAutoSubmit() {
  const form = document.querySelector('[data-auto-submit]');
  if (!form) return;

  const input = form.querySelector('input[type="search"]');
  if (!input) return;

  let timer;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      form.requestSubmit();
    }, 650);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  refreshIcons();
  setupReveal();
  setupModals();
  setupQuickView();
  setupDeleteConfirm();
  setupImageFallbacks();
  setupPreview();
  setupLoadingButtons();
  setupToast();
  setupAutoSubmit();
});
