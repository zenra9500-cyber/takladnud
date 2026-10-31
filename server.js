const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = express();
const port = 3102;

const pool = mysql.createPool({
  host: "10.200.210.117",
  port: 3306,
  user: "std02",
  password: "std02",
  database: "db_std02",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  timezone: "Z"
});

async function initializeSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      display_name VARCHAR(120) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(254) NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('shop', 'admin') NOT NULL DEFAULT 'shop',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_phone (phone),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL,
      sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      UNIQUE KEY uq_categories_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS auth_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
      KEY idx_auth_sessions_user_id (user_id),
      KEY idx_auth_sessions_expires_at (expires_at),
      CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS shops (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      category_id INT UNSIGNED NULL,
      shop_name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      public_contact VARCHAR(150) NULL,
      is_published TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_shops_user_id (user_id),
      KEY idx_shops_category_id (category_id),
      CONSTRAINT fk_shops_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
      CONSTRAINT fk_shops_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS markets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      address VARCHAR(500) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS market_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      market_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(150) NOT NULL,
      event_date DATE NOT NULL,
      start_time TIME NULL,
      end_time TIME NULL,
      booking_opens_at DATETIME NULL,
      booking_closes_at DATETIME NULL,
      status ENUM('draft', 'open', 'closed', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
      public_token CHAR(32) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_market_sessions_public_token (public_token),
      KEY idx_market_sessions_market_date (market_id, event_date),
      KEY idx_market_sessions_status_date (status, event_date),
      CONSTRAINT fk_market_sessions_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS stalls (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      market_id BIGINT UNSIGNED NOT NULL,
      stall_code VARCHAR(30) NOT NULL,
      label VARCHAR(100) NULL,
      map_x DECIMAL(7,4) NULL,
      map_y DECIMAL(7,4) NULL,
      map_width DECIMAL(7,4) NULL,
      map_height DECIMAL(7,4) NULL,
      base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status ENUM('available', 'disabled') NOT NULL DEFAULT 'available',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_stalls_market_code (market_id, stall_code),
      CONSTRAINT fk_stalls_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS reservations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      shop_id BIGINT UNSIGNED NOT NULL,
      session_id BIGINT UNSIGNED NOT NULL,
      stall_id BIGINT UNSIGNED NOT NULL,
      status ENUM('pending', 'confirmed', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
      requested_price DECIMAL(10,2) NOT NULL,
      shop_note VARCHAR(500) NULL,
      admin_note VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      active_stall_id BIGINT UNSIGNED GENERATED ALWAYS AS (
        CASE WHEN status IN ('pending', 'confirmed') THEN stall_id ELSE NULL END
      ) STORED,
      PRIMARY KEY (id),
      KEY idx_reservations_shop_created (shop_id, created_at),
      KEY idx_reservations_session_status (session_id, status),
      UNIQUE KEY uq_reservations_active_stall (session_id, active_stall_id),
      CONSTRAINT fk_reservations_shop FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE RESTRICT,
      CONSTRAINT fk_reservations_session FOREIGN KEY (session_id) REFERENCES market_sessions (id) ON DELETE RESTRICT,
      CONSTRAINT fk_reservations_stall FOREIGN KEY (stall_id) REFERENCES stalls (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}

app.use(express.json({ limit: "32kb" }));
app.use(express.static("public"));

const loginAttempts = new Map();
const loginWindowMs = 15 * 60 * 1000;
const maxLoginAttempts = 5;

function isLoginRateLimited(key) {
  const now = Date.now();
  const attempts = (loginAttempts.get(key) || []).filter((time) => now - time < loginWindowMs);
  if (attempts.length) loginAttempts.set(key, attempts);
  else loginAttempts.delete(key);
  return attempts.length >= maxLoginAttempts;
}

function recordLoginAttempt(key) {
  const attempts = loginAttempts.get(key) || [];
  attempts.push(Date.now());
  loginAttempts.set(key, attempts);

  if (loginAttempts.size > 10000) {
    const now = Date.now();
    for (const [attemptKey, times] of loginAttempts) {
      if (!times.some((time) => now - time < loginWindowMs)) loginAttempts.delete(attemptKey);
    }
  }
}

async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]{40,60})$/);
  if (!match) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน", details: [] }
    });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(match[1]).digest("hex");
    const [rows] = await pool.execute(
      `SELECT u.id AS user_id, u.display_name, u.phone, u.email, u.role,
              s.id AS shop_id, s.shop_name, s.category_id
       FROM auth_sessions a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN shops s ON s.user_id = u.id
       WHERE a.token_hash = ? AND a.expires_at > UTC_TIMESTAMP() AND u.is_active = 1
       LIMIT 1`,
      [tokenHash]
    );
    if (!rows.length || rows[0].role !== "shop" || !rows[0].shop_id) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่", details: [] }
      });
    }
    req.auth = rows[0];
    req.tokenHash = tokenHash;
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateRegistration(body) {
  const errors = [];
  const fields = [
    ["displayName", "ชื่อผู้ติดต่อ", 120],
    ["phone", "เบอร์โทรศัพท์", 20],
    ["shopName", "ชื่อร้าน", 150]
  ];

  for (const [field, label, maxLength] of fields) {
    if (typeof body[field] !== "string" || !body[field].trim()) {
      errors.push({ field, message: `กรุณากรอก${label}` });
    } else if (body[field].trim().length > maxLength) {
      errors.push({ field, message: `${label}ยาวเกิน ${maxLength} ตัวอักษร` });
    }
  }

  if (typeof body.phone === "string" && !/^[0-9+() -]{8,20}$/.test(body.phone.trim())) {
    errors.push({ field: "phone", message: "รูปแบบเบอร์โทรไม่ถูกต้อง" });
  }
  if (typeof body.password !== "string" || body.password.length < 8 ||
      Buffer.byteLength(body.password, "utf8") > 72) {
    errors.push({ field: "password", message: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษรและไม่เกิน 72 ไบต์" });
  }
  if (body.email != null && body.email !== "" &&
      (typeof body.email !== "string" || body.email.length > 254 ||
       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) {
    errors.push({ field: "email", message: "รูปแบบอีเมลไม่ถูกต้อง" });
  }
  if (body.categoryId != null && body.categoryId !== "" &&
      (!Number.isInteger(Number(body.categoryId)) || Number(body.categoryId) < 1)) {
    errors.push({ field: "categoryId", message: "หมวดหมู่ไม่ถูกต้อง" });
  }

  return errors;
}

app.post("/api/v1/auth/login", async (req, res, next) => {
  const body = req.body || {};
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!phone || phone.length > 20 || !password || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณากรอกเบอร์โทรศัพท์และรหัสผ่านให้ถูกต้อง",
        details: []
      }
    });
  }

  const ipKey = req.ip;
  if (isLoginRateLimited(ipKey)) {
    return res.status(429).json({
      error: { code: "TOO_MANY_ATTEMPTS", message: "พยายามเข้าสู่ระบบหลายครั้ง กรุณารอ 15 นาที", details: [] }
    });
  }

  try {
    const [users] = await pool.execute(
      `SELECT u.id, u.display_name, u.phone, u.email, u.password_hash, u.role,
              s.id AS shop_id, s.shop_name, s.category_id
       FROM users u JOIN shops s ON s.user_id = u.id
       WHERE u.phone = ? AND u.is_active = 1
       LIMIT 1`,
      [phone]
    );
    const user = users[0];
    const validPassword = user
      ? await bcrypt.compare(password, user.password_hash)
      : (await bcrypt.hash(password, 12), false);

    if (!user || user.role !== "shop" || !user.shop_id || !validPassword) {
      recordLoginAttempt(ipKey);
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง", details: [] }
      });
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [user.id, tokenHash, expiresAt]
    );
    loginAttempts.delete(ipKey);

    return res.json({
      data: {
        token,
        expiresAt: expiresAt.toISOString(),
        user: { id: user.id, displayName: user.display_name, phone: user.phone, email: user.email },
        shop: { id: user.shop_id, shopName: user.shop_name, categoryId: user.category_id }
      },
      meta: {}
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/v1/auth/logout", requireAuth, async (req, res, next) => {
  try {
    await pool.execute("DELETE FROM auth_sessions WHERE token_hash = ?", [req.tokenHash]);
    return res.json({ data: { message: "ออกจากระบบแล้ว" }, meta: {} });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/v1/auth/me", requireAuth, (req, res) => {
  const { user_id, display_name, phone, email, shop_id, shop_name, category_id } = req.auth;
  return res.json({
    data: {
      user: { id: user_id, displayName: display_name, phone, email },
      shop: { id: shop_id, shopName: shop_name, categoryId: category_id }
    },
    meta: {}
  });
});

app.post("/api/v1/auth/register", async (req, res, next) => {
  const errors = validateRegistration(req.body || {});
  if (errors.length) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "กรุณาตรวจสอบข้อมูลที่กรอก", details: errors }
    });
  }

  const connection = await pool.getConnection().catch(next);
  if (!connection) return;

  try {
    const { displayName, phone, email, password, shopName, categoryId } = req.body;
    const normalizedEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone.trim();
    const selectedCategory = categoryId == null || categoryId === "" ? null : Number(categoryId);

    await connection.beginTransaction();
    const [users] = await connection.execute(
      "SELECT id FROM users WHERE phone = ? OR (? IS NOT NULL AND email = ?) LIMIT 1 FOR UPDATE",
      [normalizedPhone, normalizedEmail, normalizedEmail]
    );
    if (users.length) {
      await connection.rollback();
      return res.status(409).json({
        error: { code: "ACCOUNT_EXISTS", message: "เบอร์โทรศัพท์หรืออีเมลนี้ถูกใช้งานแล้ว", details: [] }
      });
    }

    if (selectedCategory !== null) {
      const [categories] = await connection.execute(
        "SELECT id FROM categories WHERE id = ? AND is_active = 1 LIMIT 1",
        [selectedCategory]
      );
      if (!categories.length) {
        await connection.rollback();
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "กรุณาตรวจสอบข้อมูลที่กรอก",
            details: [{ field: "categoryId", message: "ไม่พบหมวดหมู่ที่เปิดใช้งาน" }]
          }
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [userResult] = await connection.execute(
      "INSERT INTO users (display_name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, 'shop')",
      [displayName.trim(), normalizedPhone, normalizedEmail, passwordHash]
    );
    const [shopResult] = await connection.execute(
      "INSERT INTO shops (user_id, category_id, shop_name) VALUES (?, ?, ?)",
      [userResult.insertId, selectedCategory, shopName.trim()]
    );

    await connection.commit();
    return res.status(201).json({
      data: {
        user: { id: userResult.insertId, displayName: displayName.trim(), phone: normalizedPhone, email: normalizedEmail },
        shop: { id: shopResult.insertId, shopName: shopName.trim(), categoryId: selectedCategory }
      },
      meta: {}
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: { code: "ACCOUNT_EXISTS", message: "เบอร์โทรศัพท์หรืออีเมลนี้ถูกใช้งานแล้ว", details: [] }
      });
    }
    return next(error);
  } finally {
    connection.release();
  }
});

app.get("/api/v1/shop/profile", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.id, s.shop_name, s.category_id, c.name AS category_name,
              s.description, s.public_contact, s.is_published
       FROM shops s LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.id = ? LIMIT 1`,
      [req.auth.shop_id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลร้านค้า", details: [] } });
    }
    const shop = rows[0];
    return res.json({
      data: {
        id: shop.id,
        shopName: shop.shop_name,
        categoryId: shop.category_id,
        categoryName: shop.category_name,
        description: shop.description,
        publicContact: shop.public_contact,
        isPublished: Boolean(shop.is_published)
      },
      meta: {}
    });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/v1/shop/profile", requireAuth, async (req, res, next) => {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const allowedFields = {
    shopName: { column: "shop_name", validate: (value) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= 150, convert: (value) => value.trim() },
    categoryId: { column: "category_id", validate: (value) => value === null || (Number.isInteger(Number(value)) && Number(value) > 0), convert: (value) => value === null ? null : Number(value) },
    description: { column: "description", validate: (value) => value === null || (typeof value === "string" && value.length <= 2000), convert: (value) => typeof value === "string" && value.trim() ? value.trim() : null },
    publicContact: { column: "public_contact", validate: (value) => value === null || (typeof value === "string" && value.length <= 150), convert: (value) => typeof value === "string" && value.trim() ? value.trim() : null },
    isPublished: { column: "is_published", validate: (value) => typeof value === "boolean", convert: (value) => value ? 1 : 0 }
  };
  const keys = Object.keys(body);
  const details = [];
  if (!keys.length || keys.some((key) => !Object.hasOwn(allowedFields, key))) {
    details.push({ field: "profile", message: "มีข้อมูลที่ไม่รองรับ หรือไม่มีข้อมูลสำหรับบันทึก" });
  }
  for (const key of keys) {
    if (Object.hasOwn(allowedFields, key) && !allowedFields[key].validate(body[key])) {
      details.push({ field: key, message: "รูปแบบหรือความยาวข้อมูลไม่ถูกต้อง" });
    }
  }
  if (details.length) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "กรุณาตรวจสอบข้อมูลที่กรอก", details } });
  }

  try {
    if (Object.hasOwn(body, "categoryId") && body.categoryId !== null) {
      const [categories] = await pool.execute(
        "SELECT id FROM categories WHERE id = ? AND is_active = 1 LIMIT 1",
        [Number(body.categoryId)]
      );
      if (!categories.length) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "กรุณาตรวจสอบข้อมูลที่กรอก", details: [{ field: "categoryId", message: "ไม่พบหมวดหมู่ที่เปิดใช้งาน" }] }
        });
      }
    }
    const assignments = keys.map((key) => `${allowedFields[key].column} = ?`);
    const values = keys.map((key) => allowedFields[key].convert(body[key]));
    values.push(req.auth.shop_id);
    const [result] = await pool.execute(
      `UPDATE shops SET ${assignments.join(", ")} WHERE id = ?`,
      values
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลร้านค้า", details: [] } });
    }
    return res.json({ data: { message: "บันทึกโปรไฟล์ร้านแล้ว" }, meta: {} });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/v1/categories", async (req, res, next) => {
  try {
    const [categories] = await pool.query(
      "SELECT id, name FROM categories WHERE is_active = 1 ORDER BY sort_order, name"
    );
    return res.json({ data: categories, meta: {} });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/v1/shop/dashboard", requireAuth, async (req, res, next) => {
  try {
    const [counts] = await pool.execute("SELECT SUM(status='pending') AS pending, SUM(status='confirmed') AS confirmed FROM reservations WHERE shop_id=?", [req.auth.shop_id]);
    const [recent] = await pool.execute("SELECT r.id,r.status,r.requested_price AS price,r.created_at AS createdAt,st.stall_code AS stallCode,m.name AS marketName,ms.title AS sessionTitle,ms.event_date AS eventDate FROM reservations r JOIN market_sessions ms ON ms.id=r.session_id JOIN markets m ON m.id=ms.market_id JOIN stalls st ON st.id=r.stall_id WHERE r.shop_id=? ORDER BY r.created_at DESC LIMIT 10", [req.auth.shop_id]);
    return res.json({ data: { counts: counts[0], recent }, meta: {} });
  } catch (error) { return next(error); }
});

app.get("/api/v1/markets", async (req, res, next) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0,100) : "";
  try {
    const [rows] = await pool.execute("SELECT m.id,m.name,m.description,m.address,COUNT(CASE WHEN ms.status='open' AND ms.event_date>=UTC_DATE() THEN 1 END) AS openSessions,MIN(CASE WHEN ms.status='open' AND ms.event_date>=UTC_DATE() THEN ms.event_date END) AS nextEventDate FROM markets m LEFT JOIN market_sessions ms ON ms.market_id=m.id WHERE m.is_active=1 AND (?='' OR m.name LIKE ? OR m.address LIKE ?) GROUP BY m.id ORDER BY nextEventDate IS NULL,nextEventDate,m.name", [q,`%${q}%`,`%${q}%`]);
    return res.json({ data: rows, meta: {} });
  } catch (error) { return next(error); }
});

app.get("/api/v1/markets/:marketId/sessions", async (req,res,next) => {
  if (!/^\\d+$/.test(req.params.marketId)) return res.status(400).json({error:{code:"VALIDATION_ERROR",message:"รหัสตลาดไม่ถูกต้อง",details:[]}});
  try { const [rows]=await pool.execute("SELECT id,market_id AS marketId,title,event_date AS eventDate,start_time AS startTime,end_time AS endTime,status,public_token AS publicToken FROM market_sessions WHERE market_id=? AND status IN ('open','closed') ORDER BY event_date,start_time",[req.params.marketId]); return res.json({data:rows,meta:{}}); } catch(error){return next(error);}
});

app.get("/api/v1/reservations/:reservationId", requireAuth, async (req,res,next)=>{
  if(!/^\\d+$/.test(req.params.reservationId))return res.status(400).json({error:{code:"VALIDATION_ERROR",message:"รหัสการจองไม่ถูกต้อง",details:[]}});
  try{const [rows]=await pool.execute("SELECT r.id,r.status,r.requested_price AS requestedPrice,r.shop_note AS shopNote,r.created_at AS createdAt,r.updated_at AS updatedAt,ms.id AS sessionId,ms.title AS sessionTitle,ms.event_date AS eventDate,m.name AS marketName,st.stall_code AS stallCode FROM reservations r JOIN market_sessions ms ON ms.id=r.session_id JOIN markets m ON m.id=ms.market_id JOIN stalls st ON st.id=r.stall_id WHERE r.id=? AND r.shop_id=? LIMIT 1",[req.params.reservationId,req.auth.shop_id]);if(!rows.length)return res.status(404).json({error:{code:"NOT_FOUND",message:"ไม่พบรายการจอง",details:[]}});return res.json({data:rows[0],meta:{}});}catch(error){return next(error);}
});

app.get("/api/v1/sessions/:sessionId/stalls", requireAuth, async (req,res,next) => {
  if (!/^\\d+$/.test(req.params.sessionId)) return res.status(400).json({error:{code:"VALIDATION_ERROR",message:"รหัสรอบไม่ถูกต้อง",details:[]}});
  try { const [rows]=await pool.execute("SELECT st.id,st.stall_code AS code,st.label,st.map_x AS x,st.map_y AS y,st.map_width AS width,st.map_height AS height,st.base_price AS price,st.status AS stallStatus,CASE WHEN st.status='disabled' THEN 'disabled' WHEN EXISTS(SELECT 1 FROM reservations r WHERE r.session_id=ms.id AND r.stall_id=st.id AND r.status IN ('pending','confirmed')) THEN 'booked' ELSE 'available' END AS availability FROM market_sessions ms JOIN stalls st ON st.market_id=ms.market_id WHERE ms.id=? ORDER BY st.stall_code",[req.params.sessionId]); return res.json({data:rows,meta:{}}); } catch(error){return next(error);}
});

app.post("/api/v1/reservations", requireAuth, async (req,res,next) => {
  const sessionId=Number(req.body?.sessionId), stallId=Number(req.body?.stallId), note=req.body?.shopNote;
  if(!Number.isSafeInteger(sessionId)||sessionId<1||!Number.isSafeInteger(stallId)||stallId<1||(note!=null&&(typeof note!=="string"||note.length>500))) return res.status(400).json({error:{code:"VALIDATION_ERROR",message:"ข้อมูลการจองไม่ถูกต้อง",details:[]}});
  const connection=await pool.getConnection().catch(next); if(!connection)return;
  try {
    await connection.beginTransaction();
    const [slots]=await connection.execute("SELECT ms.status,ms.booking_opens_at,ms.booking_closes_at,st.base_price,st.status AS stall_status FROM market_sessions ms JOIN stalls st ON st.market_id=ms.market_id WHERE ms.id=? AND st.id=? FOR UPDATE",[sessionId,stallId]);
    if(!slots.length){await connection.rollback();return res.status(404).json({error:{code:"NOT_FOUND",message:"ไม่พบรอบหรือแผงที่เลือก",details:[]}});}
    const slot=slots[0];
    if(slot.status!=="open"||slot.stall_status!=="available"||(slot.booking_opens_at&&new Date(slot.booking_opens_at)>new Date())||(slot.booking_closes_at&&new Date(slot.booking_closes_at)<new Date())){await connection.rollback();return res.status(409).json({error:{code:"BOOKING_CLOSED",message:"รอบนี้ไม่เปิดรับจองหรือแผงปิดใช้งาน",details:[]}});}
    const [active]=await connection.execute("SELECT id FROM reservations WHERE session_id=? AND stall_id=? AND status IN ('pending','confirmed') LIMIT 1 FOR UPDATE",[sessionId,stallId]);
    if(active.length){await connection.rollback();return res.status(409).json({error:{code:"SLOT_ALREADY_BOOKED",message:"แผงนี้มีคำขอจองแล้ว",details:[]}});}
    const [owned]=await connection.execute("SELECT id FROM reservations WHERE shop_id=? AND session_id=? AND status IN ('pending','confirmed') LIMIT 1 FOR UPDATE",[req.auth.shop_id,sessionId]);
    if(owned.length){await connection.rollback();return res.status(409).json({error:{code:"ACTIVE_RESERVATION_EXISTS",message:"ร้านของคุณมีรายการจองที่ยังดำเนินการในรอบนี้แล้ว",details:[]}});}
    // Serialize same-shop submissions even when they target different stalls.
    await connection.execute("SELECT id FROM shops WHERE id=? FOR UPDATE",[req.auth.shop_id]);
    const [ownedAfterLock] = await connection.execute("SELECT id FROM reservations WHERE shop_id=? AND session_id=? AND status IN ('pending','confirmed') LIMIT 1",[req.auth.shop_id,sessionId]);
    if(ownedAfterLock.length){await connection.rollback();return res.status(409).json({error:{code:"ACTIVE_RESERVATION_EXISTS",message:"ร้านของคุณมีรายการจองที่ยังดำเนินการในรอบนี้แล้ว",details:[]}});}
    const [created]=await connection.execute("INSERT INTO reservations (shop_id,session_id,stall_id,requested_price,shop_note) VALUES (?,?,?,?,?)",[req.auth.shop_id,sessionId,stallId,slot.base_price,typeof note==="string"?note.trim()||null:null]);
    await connection.commit(); return res.status(201).json({data:{id:created.insertId,sessionId,stallId,status:"pending",requestedPrice:slot.base_price},meta:{}});
  } catch(error){await connection.rollback();if(error.code==="ER_DUP_ENTRY")return res.status(409).json({error:{code:"SLOT_ALREADY_BOOKED",message:"แผงนี้มีคำขอจองแล้ว",details:[]}});return next(error);} finally{connection.release();}
});

app.get("/api/v1/reservations", requireAuth, async(req,res,next)=>{
  try{const [rows]=await pool.execute("SELECT r.id,r.status,r.requested_price AS requestedPrice,r.shop_note AS shopNote,r.created_at AS createdAt,ms.id AS sessionId,ms.title AS sessionTitle,ms.event_date AS eventDate,m.name AS marketName,st.stall_code AS stallCode FROM reservations r JOIN market_sessions ms ON ms.id=r.session_id JOIN markets m ON m.id=ms.market_id JOIN stalls st ON st.id=r.stall_id WHERE r.shop_id=? ORDER BY r.created_at DESC LIMIT 100",[req.auth.shop_id]);return res.json({data:rows,meta:{limit:100}});}catch(error){return next(error);}
});
app.post("/api/v1/reservations/:reservationId/cancel",requireAuth,async(req,res,next)=>{
  if(!/^\\d+$/.test(req.params.reservationId))return res.status(400).json({error:{code:"VALIDATION_ERROR",message:"รหัสการจองไม่ถูกต้อง",details:[]}});
  try{const [result]=await pool.execute("UPDATE reservations SET status='cancelled' WHERE id=? AND shop_id=? AND status='pending'",[req.params.reservationId,req.auth.shop_id]);if(!result.affectedRows)return res.status(409).json({error:{code:"RESERVATION_NOT_CANCELLABLE",message:"ไม่พบคำขอของคุณหรือรายการนี้ไม่สามารถยกเลิกได้",details:[]}});return res.json({data:{id:Number(req.params.reservationId),status:"cancelled"},meta:{}});}catch(error){return next(error);}
});

function validPublicToken(token){return typeof token==="string"&&/^[a-f0-9]{32}$/i.test(token);}
app.get("/api/v1/public/sessions/:publicToken/map",async(req,res,next)=>{
  if(!validPublicToken(req.params.publicToken))return res.status(404).json({error:{code:"PUBLIC_MAP_NOT_FOUND",message:"ไม่พบแผนผังตลาดนี้",details:[]}});
  try{
    const [sessions]=await pool.execute("SELECT ms.id,ms.market_id,ms.title,ms.event_date,ms.start_time,ms.end_time,m.name AS market_name,m.address FROM market_sessions ms JOIN markets m ON m.id=ms.market_id WHERE ms.public_token=? AND ms.status IN ('open','closed','completed') AND m.is_active=1 LIMIT 1",[req.params.publicToken]);
    if(!sessions.length)return res.status(404).json({error:{code:"PUBLIC_MAP_NOT_FOUND",message:"ไม่พบแผนผังตลาดนี้",details:[]}});
    const s=sessions[0];const [stalls]=await pool.execute("SELECT st.stall_code AS code,st.label,st.map_x AS x,st.map_y AS y,st.map_width AS width,st.map_height AS height,sh.id AS shopId,sh.shop_name AS shopName,sh.description,sh.public_contact AS publicContact,c.name AS category FROM stalls st JOIN reservations r ON r.stall_id=st.id AND r.session_id=? AND r.status='confirmed' JOIN shops sh ON sh.id=r.shop_id AND sh.is_published=1 LEFT JOIN categories c ON c.id=sh.category_id WHERE st.market_id=? AND st.status='available' ORDER BY st.stall_code",[s.id,s.market_id]);
    return res.json({data:{market:{name:s.market_name,address:s.address},session:{id:s.id,title:s.title,eventDate:s.event_date,startTime:s.start_time,endTime:s.end_time},stalls:stalls.map(st=>({code:st.code,label:st.label,x:st.x,y:st.y,width:st.width,height:st.height,shop:{id:st.shopId,name:st.shopName,category:st.category,description:st.description,publicContact:st.publicContact}}))},meta:{}});
  }catch(error){return next(error);}
});
app.get("/api/v1/public/sessions/:publicToken/shops",async(req,res,next)=>{
  if(!validPublicToken(req.params.publicToken))return res.status(404).json({error:{code:"PUBLIC_MAP_NOT_FOUND",message:"ไม่พบแผนผังตลาดนี้",details:[]}});
  const q=typeof req.query.q==="string"?req.query.q.trim().slice(0,100):"";const categoryId=req.query.categoryId&&/^\\d+$/.test(String(req.query.categoryId))?Number(req.query.categoryId):null;
  try{
    const [rows]=await pool.execute("SELECT sh.id,sh.shop_name AS shopName,sh.description,sh.public_contact AS publicContact,c.id AS categoryId,c.name AS category,st.stall_code AS stallCode,st.map_x AS x,st.map_y AS y FROM market_sessions ms JOIN markets m ON m.id=ms.market_id AND m.is_active=1 JOIN reservations r ON r.session_id=ms.id AND r.status='confirmed' JOIN shops sh ON sh.id=r.shop_id AND sh.is_published=1 JOIN stalls st ON st.id=r.stall_id AND st.status='available' LEFT JOIN categories c ON c.id=sh.category_id WHERE ms.public_token=? AND ms.status IN ('open','closed','completed') AND (?='' OR sh.shop_name LIKE ? OR sh.description LIKE ?) AND (? IS NULL OR c.id=?) ORDER BY st.stall_code LIMIT 100",[req.params.publicToken,q,`%${q}%`,`%${q}%`,categoryId,categoryId]);
    const [categories]=await pool.execute("SELECT DISTINCT c.id,c.name FROM market_sessions ms JOIN reservations r ON r.session_id=ms.id AND r.status='confirmed' JOIN shops sh ON sh.id=r.shop_id AND sh.is_published=1 JOIN categories c ON c.id=sh.category_id WHERE ms.public_token=? AND ms.status IN ('open','closed','completed') ORDER BY c.name",[req.params.publicToken]);return res.json({data:{shops:rows,categories},meta:{}});
  }catch(error){return next(error);}
});
app.get("/api/v1/public/sessions/:publicToken/shops/:shopId",async(req,res,next)=>{
  if(!validPublicToken(req.params.publicToken)||!/^\\d+$/.test(req.params.shopId))return res.status(404).json({error:{code:"NOT_FOUND",message:"ไม่พบข้อมูลร้าน",details:[]}});
  try{const [rows]=await pool.execute("SELECT sh.id,sh.shop_name AS shopName,sh.description,sh.public_contact AS publicContact,c.name AS category,st.stall_code AS stallCode,st.map_x AS x,st.map_y AS y,ms.title AS sessionTitle,ms.event_date AS eventDate,m.name AS marketName FROM market_sessions ms JOIN markets m ON m.id=ms.market_id AND m.is_active=1 JOIN reservations r ON r.session_id=ms.id AND r.status='confirmed' JOIN shops sh ON sh.id=r.shop_id AND sh.is_published=1 JOIN stalls st ON st.id=r.stall_id LEFT JOIN categories c ON c.id=sh.category_id WHERE ms.public_token=? AND ms.status IN ('open','closed','completed') AND sh.id=? AND r.stall_id=st.id LIMIT 1",[req.params.publicToken,req.params.shopId]);if(!rows.length)return res.status(404).json({error:{code:"NOT_FOUND",message:"ไม่พบข้อมูลร้าน",details:[]}});return res.json({data:rows[0],meta:{}});}catch(error){return next(error);}
});
app.get("/api/v1/public/sessions/:publicToken/stalls/:stallCode",async(req,res,next)=>{
  if(!validPublicToken(req.params.publicToken))return res.status(404).json({error:{code:"PUBLIC_MAP_NOT_FOUND",message:"ไม่พบแผนผังตลาดนี้",details:[]}});
  try{const [rows]=await pool.execute("SELECT st.stall_code AS code,st.label,st.map_x AS x,st.map_y AS y,sh.id AS shopId,sh.shop_name AS shopName,sh.description,sh.public_contact AS publicContact,c.name AS category FROM market_sessions ms JOIN reservations r ON r.session_id=ms.id AND r.status='confirmed' JOIN stalls st ON st.id=r.stall_id JOIN shops sh ON sh.id=r.shop_id AND sh.is_published=1 LEFT JOIN categories c ON c.id=sh.category_id WHERE ms.public_token=? AND ms.status IN ('open','closed','completed') AND st.stall_code=? AND st.market_id=ms.market_id LIMIT 1",[req.params.publicToken,req.params.stallCode]);if(!rows.length)return res.status(404).json({error:{code:"NOT_FOUND",message:"ไม่พบร้านที่แผงนี้",details:[]}});return res.json({data:rows[0],meta:{}});}catch(error){return next(error);}
});

app.get("/api/v1/markets", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? `%${req.query.q.trim()}%` : "%";
    const [rows] = await pool.execute(
      `SELECT m.id, m.name, m.address, ms.id AS session_id, ms.title, ms.event_date,
              ms.start_time, ms.end_time, ms.status
       FROM markets m LEFT JOIN market_sessions ms ON ms.market_id = m.id
         AND ms.status IN ('open','closed') AND ms.event_date >= UTC_DATE()
       WHERE m.is_active = 1 AND (m.name LIKE ? OR COALESCE(m.address, '') LIKE ?)
       ORDER BY ms.event_date, m.name LIMIT 100`, [q, q]);
    res.json({ data: rows, meta: {} });
  } catch (error) { next(error); }
});

app.get("/api/v1/sessions/:sessionId/stalls", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.id, s.stall_code, s.label, s.map_x, s.map_y, s.map_width, s.map_height,
              s.base_price, s.status,
              CASE WHEN r.id IS NULL THEN 'available' ELSE r.status END AS availability
       FROM market_sessions ms JOIN stalls s ON s.market_id = ms.market_id
       LEFT JOIN reservations r ON r.session_id = ms.id AND r.stall_id = s.id
         AND r.status IN ('pending','confirmed')
       WHERE ms.id = ? ORDER BY s.stall_code`, [req.params.sessionId]);
    res.json({ data: rows, meta: {} });
  } catch (error) { next(error); }
});

app.post("/api/v1/reservations", requireAuth, async (req, res, next) => {
  const sessionId = Number(req.body?.sessionId), stallId = Number(req.body?.stallId);
  const note = req.body?.shopNote == null ? null : String(req.body.shopNote).trim();
  if (!Number.isSafeInteger(sessionId) || sessionId < 1 || !Number.isSafeInteger(stallId) || stallId < 1 || (note && note.length > 500)) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ข้อมูลการจองไม่ถูกต้อง", details: [] } });
  }
  const connection = await pool.getConnection().catch(next);
  if (!connection) return;
  try {
    await connection.beginTransaction();
    const [sessions] = await connection.execute("SELECT id, market_id, status, event_date, booking_opens_at, booking_closes_at FROM market_sessions WHERE id = ? FOR UPDATE", [sessionId]);
    const session = sessions[0];
    if (!session || session.status !== "open" || (session.booking_opens_at && new Date(session.booking_opens_at) > new Date()) || (session.booking_closes_at && new Date(session.booking_closes_at) < new Date())) {
      await connection.rollback();
      return res.status(409).json({ error: { code: "BOOKING_CLOSED", message: "รอบนี้ยังไม่เปิดหรือปิดรับจองแล้ว", details: [] } });
    }
    const [stalls] = await connection.execute("SELECT id, base_price FROM stalls WHERE id = ? AND market_id = ? AND status = 'available' FOR UPDATE", [stallId, session.market_id]);
    if (!stalls.length) { await connection.rollback(); return res.status(404).json({ error: { code: "STALL_NOT_FOUND", message: "ไม่พบแผงที่เปิดจอง", details: [] } }); }
    const [existing] = await connection.execute("SELECT id FROM reservations WHERE session_id = ? AND stall_id = ? AND status IN ('pending','confirmed') LIMIT 1", [sessionId, stallId]);
    if (existing.length) { await connection.rollback(); return res.status(409).json({ error: { code: "SLOT_ALREADY_BOOKED", message: "แผงนี้มีผู้จองแล้ว", details: [] } }); }
    const [result] = await connection.execute("INSERT INTO reservations (shop_id, session_id, stall_id, requested_price, shop_note) VALUES (?, ?, ?, ?, ?)", [req.auth.shop_id, sessionId, stallId, stalls[0].base_price, note]);
    await connection.commit();
    res.status(201).json({ data: { id: result.insertId, status: "pending", sessionId, stallId, requestedPrice: stalls[0].base_price }, meta: {} });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: { code: "SLOT_ALREADY_BOOKED", message: "แผงนี้มีผู้จองแล้ว", details: [] } });
    next(error);
  } finally { connection.release(); }
});

app.get("/api/v1/reservations", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.status, r.requested_price, r.shop_note, r.created_at,
              ms.title AS session_title, ms.event_date, m.name AS market_name,
              s.stall_code
       FROM reservations r JOIN market_sessions ms ON ms.id = r.session_id
       JOIN markets m ON m.id = ms.market_id JOIN stalls s ON s.id = r.stall_id
       WHERE r.shop_id = ? ORDER BY r.created_at DESC LIMIT 100`, [req.auth.shop_id]);
    res.json({ data: rows, meta: {} });
  } catch (error) { next(error); }
});

app.post("/api/v1/reservations/:reservationId/cancel", requireAuth, async (req, res, next) => {
  try {
    const [result] = await pool.execute("UPDATE reservations SET status = 'cancelled' WHERE id = ? AND shop_id = ? AND status = 'pending'", [req.params.reservationId, req.auth.shop_id]);
    if (!result.affectedRows) return res.status(409).json({ error: { code: "RESERVATION_NOT_CANCELLABLE", message: "ยกเลิกไม่ได้หรือไม่พบรายการนี้", details: [] } });
    res.json({ data: { message: "ยกเลิกคำขอแล้ว" }, meta: {} });
  } catch (error) { next(error); }
});

app.get("/api/v1/shop/dashboard", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute("SELECT status, COUNT(*) AS count FROM reservations WHERE shop_id = ? GROUP BY status", [req.auth.shop_id]);
    const [latest] = await pool.execute("SELECT r.id, r.status, ms.title, ms.event_date, s.stall_code FROM reservations r JOIN market_sessions ms ON ms.id = r.session_id JOIN stalls s ON s.id = r.stall_id WHERE r.shop_id = ? ORDER BY r.created_at DESC LIMIT 5", [req.auth.shop_id]);
    res.json({ data: { counts: Object.fromEntries(rows.map((r) => [r.status, Number(r.count)])), latest }, meta: {} });
  } catch (error) { next(error); }
});

app.get("/api/v1/public/sessions/:token/map", async (req, res, next) => {
  try {
    const [sessions] = await pool.execute("SELECT ms.id, ms.title, ms.event_date, ms.start_time, ms.end_time, m.name AS market_name, m.address FROM market_sessions ms JOIN markets m ON m.id = ms.market_id WHERE ms.public_token = ? AND ms.status IN ('open','closed') AND m.is_active = 1 LIMIT 1", [req.params.token]);
    if (!sessions.length) return res.status(404).json({ error: { code: "PUBLIC_MAP_NOT_FOUND", message: "ไม่พบแผนผังนี้", details: [] } });
    const [stalls] = await pool.execute("SELECT s.stall_code, s.label, s.map_x, s.map_y, s.map_width, s.map_height, sh.id AS shop_id, sh.shop_name, sh.description, sh.public_contact, c.name AS category_name FROM stalls s JOIN reservations r ON r.stall_id = s.id AND r.session_id = ? AND r.status = 'confirmed' JOIN shops sh ON sh.id = r.shop_id AND sh.is_published = 1 LEFT JOIN categories c ON c.id = sh.category_id WHERE s.status = 'available' ORDER BY s.stall_code", [sessions[0].id]);
    res.json({ data: { session: sessions[0], stalls }, meta: {} });
  } catch (error) { next(error); }
});

app.get("/api/v1/public/sessions/:token/shops", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? `%${req.query.q.trim()}%` : "%";
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const [rows] = await pool.execute("SELECT sh.id, sh.shop_name, sh.description, sh.public_contact, c.name AS category_name, s.stall_code, s.map_x, s.map_y FROM market_sessions ms JOIN reservations r ON r.session_id = ms.id AND r.status = 'confirmed' JOIN shops sh ON sh.id = r.shop_id AND sh.is_published = 1 JOIN stalls s ON s.id = r.stall_id LEFT JOIN categories c ON c.id = sh.category_id WHERE ms.public_token = ? AND ms.status IN ('open','closed') AND sh.shop_name LIKE ? AND (? IS NULL OR sh.category_id = ?) ORDER BY sh.shop_name LIMIT 100", [req.params.token, q, categoryId, categoryId]);
    res.json({ data: rows, meta: {} });
  } catch (error) { next(error); }
});

app.get("/api/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");
    res.json({ data: { status: "ok", database: "connected" }, meta: {} });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลหรือเส้นทางที่ร้องขอ", details: [] }
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "รูปแบบ JSON ไม่ถูกต้อง", details: [] }
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE", message: "ข้อมูลที่ส่งมีขนาดใหญ่เกินกำหนด", details: [] }
    });
  }

  console.error("Request failed:", error.message);
  const status = error.status === 503 ? 503 : 500;
  const code = status === 503 ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR";
  const message = status === 503
    ? "บริการฐานข้อมูลไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง"
    : "เกิดข้อผิดพลาดภายในระบบ";

  return res.status(status).json({ error: { code, message, details: [] } });
});

async function startServer() {
  try {
    await initializeSchema();
    app.listen(3102, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exitCode = 1;
  }
}

startServer();
