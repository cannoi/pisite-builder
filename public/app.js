let sites = [];
let currentSiteId = null;
let previewMode = 'desktop';

document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  
  const inputs = ['siteTitle', 'siteSubtitle', 'siteAbout', 'siteEmail', 'siteColor'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        updatePreviewLive();
      });
    }
  });
  
  document.getElementById('siteColor').addEventListener('input', (e) => {
    document.getElementById('colorCode').textContent = e.target.value;
  });
});

async function loadSites() {
  try {
    const res = await fetch('/api/sites');
    sites = await res.json();
    renderSitesList();
    if (sites.length > 0 && !currentSiteId) {
      selectSite(sites[0].id);
    } else if (sites.length === 0) {
      createNewSite();
    }
  } catch (err) {
    console.error('Failed to load sites:', err);
  }
}

function renderSitesList() {
  const container = document.getElementById('sitesList');
  container.innerHTML = sites.map(s => `
    <div class="site-item ${s.id === currentSiteId ? 'active' : ''}" onclick="selectSite(${s.id})">
      <div class="site-item-title">${escapeHtml(s.title)}</div>
      <div class="site-item-date">Cập nhật: ${new Date(s.updated_at).toLocaleDateString('vi-VN')}</div>
    </div>
  `).join('');
}

async function selectSite(id) {
  currentSiteId = id;
  renderSitesList();
  try {
    const res = await fetch(`/api/sites/${id}`);
    const site = await res.json();
    
    document.getElementById('editorHeaderTitle').textContent = `Đang chỉnh sửa: ${site.title}`;
    document.getElementById('siteTitle').value = site.title || '';
    document.getElementById('siteSubtitle').value = site.subtitle || '';
    document.getElementById('siteAbout').value = site.about || '';
    document.getElementById('siteEmail').value = site.contact_email || '';
    document.getElementById('siteColor').value = site.theme_color || '#2563eb';
    document.getElementById('colorCode').textContent = site.theme_color || '#2563eb';
    
    let services = [];
    try {
      services = JSON.parse(site.services_json || '[]');
    } catch(e) {}
    renderServices(services);
    
    document.getElementById('editorPane').style.display = 'block';
    document.getElementById('btnSave').style.display = 'inline-block';
    document.getElementById('btnExport').style.display = 'inline-block';
    
    updatePreviewLive();
  } catch(err) {
    console.error('Failed to fetch site details:', err);
  }
}

async function createNewSite() {
  const newSiteData = {
    title: "Trang Dịch Vụ Mới",
    subtitle: "Giải pháp chuyên nghiệp cho khách hàng",
    about: "Chúng tôi mang lại giá trị thực thông qua các dịch vụ hàng đầu.",
    services_json: JSON.stringify([
      { name: "Dịch vụ 1", desc: "Mô tả chi tiết dịch vụ 1." },
      { name: "Dịch vụ 2", desc: "Mô tả chi tiết dịch vụ 2." }
    ]),
    contact_email: "lienhe@domain.vn",
    theme_color: "#2563eb"
  };
  
  try {
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSiteData)
    });
    const data = await res.json();
    if (data.id) {
      await loadSites();
      selectSite(data.id);
    }
  } catch (err) {
    console.error('Failed to create site:', err);
  }
}

function renderServices(services) {
  const container = document.getElementById('servicesContainer');
  container.innerHTML = services.map((s, idx) => `
    <div class="service-row-item" data-index="${idx}">
      <button class="service-row-delete" onclick="removeServiceRow(${idx})">✕ Xóa</button>
      <input type="text" class="service-name" value="${escapeHtml(s.name)}" placeholder="Tên dịch vụ" oninput="updatePreviewLive()">
      <input type="text" class="service-desc" value="${escapeHtml(s.desc)}" placeholder="Mô tả dịch vụ" oninput="updatePreviewLive()">
    </div>
  `).join('');
}

function addServiceRow() {
  const container = document.getElementById('servicesContainer');
  const items = container.querySelectorAll('.service-row-item');
  const services = getServicesFromDOM();
  services.push({ name: "Dịch vụ mới", desc: "Mô tả dịch vụ mới." });
  renderServices(services);
  updatePreviewLive();
}

function removeServiceRow(idx) {
  const services = getServicesFromDOM();
  services.splice(idx, 1);
  renderServices(services);
  updatePreviewLive();
}

function getServicesFromDOM() {
  const items = document.querySelectorAll('.service-row-item');
  const services = [];
  items.forEach(item => {
    const name = item.querySelector('.service-name').value;
    const desc = item.querySelector('.service-desc').value;
    services.push({ name, desc });
  });
  return services;
}

function getFormData() {
  return {
    title: document.getElementById('siteTitle').value,
    subtitle: document.getElementById('siteSubtitle').value,
    about: document.getElementById('siteAbout').value,
    services_json: JSON.stringify(getServicesFromDOM()),
    contact_email: document.getElementById('siteEmail').value,
    theme_color: document.getElementById('siteColor').value
  };
}

async function saveCurrentSite() {
  if (!currentSiteId) return;
  const data = getFormData();
  try {
    const res = await fetch(`/api/sites/${currentSiteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      document.getElementById('editorHeaderTitle').textContent = `Đang chỉnh sửa: ${data.title}`;
      loadSites();
      alert('Đã lưu thay đổi thành công!');
    } else {
      alert('Lỗi khi lưu.');
    }
  } catch (err) {
    console.error('Save error:', err);
  }
}

function exportCurrentSite() {
  if (!currentSiteId) return;
  window.location.href = `/api/sites/${currentSiteId}/export`;
}

function setPreviewMode(mode) {
  previewMode = mode;
  const wrapper = document.getElementById('previewWrapper');
  wrapper.className = `preview-wrapper ${mode}`;
  document.getElementById('btnDesktop').style.background = mode === 'desktop' ? '#e2e8f0' : 'white';
  document.getElementById('btnMobile').style.background = mode === 'mobile' ? '#e2e8f0' : 'white';
}

function updatePreviewLive() {
  const data = getFormData();
  const services = getServicesFromDOM();
  
  const servicesHtml = services.map(s => `
    <div class="service-card" style="border-top: 4px solid ${data.theme_color};">
      <h3>${escapeHtml(s.name)}</h3>
      <p>${escapeHtml(s.desc)}</p>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.6; }
    header { background: ${data.theme_color}; color: white; padding: 4rem 2rem; text-align: center; }
    header h1 { margin: 0 0 1rem 0; font-size: 2.5rem; }
    header p { margin: 0; font-size: 1.25rem; opacity: 0.9; }
    .container { max-width: 1000px; margin: 0 auto; padding: 4rem 2rem; }
    .about { margin-bottom: 4rem; text-align: center; }
    .about h2 { color: ${data.theme_color}; }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
    .service-card { background: #f8fafc; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    footer { background: #0f172a; color: white; text-align: center; padding: 3rem 2rem; margin-top: 4rem; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(data.title)}</h1>
    <p>${escapeHtml(data.subtitle)}</p>
  </header>
  <main class="container">
    <section class="about">
      <h2>Về Chúng Tôi</h2>
      <p>${escapeHtml(data.about)}</p>
    </section>
    <section>
      <h2 style="text-align: center; margin-bottom: 2.5rem; color: ${data.theme_color};">Dịch Vụ & Sản Phẩm</h2>
      <div class="services-grid">
        ${servicesHtml}
      </div>
    </section>
  </main>
  <footer>
    <h2>Liên Hệ Với Chúng Tôi</h2>
    <p>Email: <a href="mailto:${escapeHtml(data.contact_email)}" style="color: #60a5fa;">${escapeHtml(data.contact_email)}</a></p>
    <p style="margin-top: 2rem; font-size: 0.875rem; opacity: 0.7;">&copy; ${new Date().getFullYear()} ${escapeHtml(data.title)}. All rights reserved.</p>
  </footer>
</body>
</html>`;

  const iframe = document.getElementById('previewFrame');
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"\/]/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
      '/': '&#x2F;'
    }[s];
  });
}
