const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const dbFile = path.join(__dirname, 'data', 'pisite.db');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      about TEXT,
      services_json TEXT,
      contact_email TEXT,
      theme_color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (!err) {
        db.get("SELECT COUNT(*) as count FROM sites", (err, row) => {
          if (!err && row.count === 0) {
            const stmt = db.prepare(`INSERT INTO sites (title, subtitle, about, services_json, contact_email, theme_color) VALUES (?, ?, ?, ?, ?, ?)`);
            stmt.run(
              "Doanh Nghiệp Việt",
              "Giải pháp công nghệ và dịch vụ chuyên nghiệp hàng đầu",
              "Chúng tôi cung cấp các dịch vụ chất lượng cao giúp tối ưu hóa quy trình kinh doanh và phát triển thương hiệu bền vững.",
              JSON.stringify([
                { name: "Tư vấn chiến lược", desc: "Định hướng phát triển và tối ưu chi phí." },
                { name: "Phát triển phần mềm", desc: "Giải pháp số hóa doanh nghiệp toàn diện." },
                { name: "Hỗ trợ 24/7", desc: "Đồng hành cùng sự phát triển của bạn mọi lúc." }
              ]),
              "contact@doanhnghiep.vn",
              "#2563eb"
            );
            stmt.finalize();
          }
        });
      }
    });
  }
});

app.get('/health', (req, res) => {
  db.get("SELECT 1", (err) => {
    if (err) {
      res.status(500).json({ status: 'error', database: err.message });
    } else {
      res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
    }
  });
});

app.get('/api/sites', (req, res) => {
  db.all("SELECT * FROM sites ORDER BY updated_at DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/sites/:id', (req, res) => {
  db.get("SELECT * FROM sites WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Site not found' });
    } else {
      res.json(row);
    }
  });
});

app.post('/api/sites', (req, res) => {
  const { title, subtitle, about, services_json, contact_email, theme_color } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const query = `INSERT INTO sites (title, subtitle, about, services_json, contact_email, theme_color) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(query, [title, subtitle || '', about || '', services_json || '[]', contact_email || '', theme_color || '#2563eb'], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ id: this.lastID, message: 'Site created successfully' });
    }
  });
});

app.put('/api/sites/:id', (req, res) => {
  const { title, subtitle, about, services_json, contact_email, theme_color } = req.body;
  const query = `UPDATE sites SET title = ?, subtitle = ?, about = ?, services_json = ?, contact_email = ?, theme_color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  db.run(query, [title, subtitle, about, services_json, contact_email, theme_color, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Site not found' });
    } else {
      res.json({ message: 'Site updated successfully' });
    }
  });
});

app.delete('/api/sites/:id', (req, res) => {
  db.run("DELETE FROM sites WHERE id = ?", [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Site not found' });
    } else {
      res.json({ message: 'Site deleted successfully' });
    }
  });
});

app.get('/api/sites/:id/export', (req, res) => {
  db.get("SELECT * FROM sites WHERE id = ?", [req.params.id], (err, site) => {
    if (err || !site) {
      return res.status(404).send('Site not found');
    }
    let services = [];
    try {
      services = JSON.parse(site.services_json || '[]');
    } catch (e) {}
    
    const servicesHtml = services.map(s => `
      <div class="service-card" style="border-top: 4px solid ${site.theme_color};">
        <h3>${s.name}</h3>
        <p>${s.desc}</p>
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.6; }
    header { background: ${site.theme_color}; color: white; padding: 4rem 2rem; text-align: center; }
    header h1 { margin: 0 0 1rem 0; font-size: 2.5rem; }
    header p { margin: 0; font-size: 1.25rem; opacity: 0.9; }
    .container { max-width: 1000px; margin: 0 auto; padding: 4rem 2rem; }
    .about { margin-bottom: 4rem; text-align: center; }
    .about h2 { color: ${site.theme_color}; }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
    .service-card { background: #f8fafc; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    footer { background: #0f172a; color: white; text-align: center; padding: 3rem 2rem; margin-top: 4rem; }
    .btn { display: inline-block; background: ${site.theme_color}; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 1rem; }
  </style>
</head>
<body>
  <header>
    <h1>${site.title}</h1>
    <p>${site.subtitle}</p>
  </header>
  <main class="container">
    <section class="about">
      <h2>Về Chúng Tôi</h2>
      <p>${site.about}</p>
    </section>
    <section>
      <h2 style="text-align: center; margin-bottom: 2.5rem; color: ${site.theme_color};">Dịch Vụ & Sản Phẩm</h2>
      <div class="services-grid">
        ${servicesHtml}
      </div>
    </section>
  </main>
  <footer>
    <h2>Liên Hệ Với Chúng Tôi</h2>
    <p>Email: <a href="mailto:${site.contact_email}" style="color: #60a5fa;">${site.contact_email}</a></p>
    <p style="margin-top: 2rem; font-size: 0.875rem; opacity: 0.7;">&copy; ${new Date().getFullYear()} ${site.title}. All rights reserved.</p>
  </footer>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="site-${site.id}.html"`);
    res.send(html);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PiSite Builder running on port ${PORT}`);
});
