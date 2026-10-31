# API Specification: ตากหลาดนัด

REST API นี้ใช้ JSON และ prefix `/api/v1` รองรับหน้าจอ Shop และ Customer ตาม `spec.md`; endpoints สำหรับ Admin ระบุไว้เป็นแนวทางอนาคต ยังไม่อยู่ในระยะ implement

## มาตรฐานร่วม

- Frontend เรียก API แบบ same-origin เช่น `/api/v1/markets` ไม่ต้องเปิด CORS
- Request ที่มี body ใช้ `Content-Type: application/json`
- Shop ต้องส่ง `Authorization: Bearer <access-token>`; Customer ใช้ public endpoints โดยไม่ล็อกอิน
- Backend หา `user_id`/`shop_id` จาก session/token เสมอ ห้ามเชื่อค่าที่ client ส่งมา
- วันที่ใช้ `YYYY-MM-DD`, เวลา ISO 8601; ราคาเป็น decimal JSON number
- ห้ามส่ง `password_hash`, private phone/email หรือข้อมูลภายในให้ public response
- List endpoints รองรับ `page` (เริ่ม 1), `limit` (เริ่ม 20, สูงสุด 100); response มี `meta: { page, limit, total }`
- สร้างรายการควรรองรับ `Idempotency-Key` เพื่อป้องกันการสร้างซ้ำเมื่อ client retry
- การจองและเปลี่ยนสถานะต้องใช้ transaction และตรวจการจอง active ซ้ำในฐานข้อมูล

รูปแบบ success: `{ "data": {}, "meta": {} }`

รูปแบบ error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "กรุณาตรวจสอบข้อมูลที่กรอก",
    "details": [{ "field": "phone", "message": "รูปแบบเบอร์โทรไม่ถูกต้อง" }]
  }
}
```

## API ตามหน้าจอ

### สมัครและเข้าสู่ระบบ Shop

| Method/Path | Auth | หน้าที่ |
|---|---|---|
| `POST /api/v1/auth/register` | สาธารณะ | สร้างบัญชี Shop และโปรไฟล์ร้านใน transaction เดียว |
| `POST /api/v1/auth/login` | สาธารณะ | เข้าสู่ระบบด้วยเบอร์โทรและรหัสผ่าน |
| `POST /api/v1/auth/logout` | Shop | ยกเลิก session/token ปัจจุบัน |
| `GET /api/v1/auth/me` | Shop | ข้อมูลบัญชีและร้านของผู้ใช้ปัจจุบัน |

Register body:

```json
{
  "displayName": "มะลิ ใจดี",
  "phone": "0812345678",
  "email": "mali@example.com",
  "password": "user-provided-password",
  "shopName": "ขนมบ้านมะลิ",
  "categoryId": 2
}
```

ตรวจ required fields, รูปแบบ/ความยาว, เบอร์โทรและอีเมลซ้ำ, หมวดหมู่ active และความแข็งแรงรหัสผ่าน ตอบ `201` โดยไม่คืนรหัสผ่าน/hash

Login body: `{ "phone": "0812345678", "password": "..." }`; ตอบ token/session และข้อมูลผู้ใช้ขั้นต่ำ หากข้อมูลไม่ถูกต้องตอบ `401 INVALID_CREDENTIALS` โดยไม่เปิดเผยว่าบัญชีมีอยู่หรือไม่

### หน้าแรกและเลือกรอบงาน

| Method/Path | Auth | Query/ผลลัพธ์ |
|---|---|---|
| `GET /api/v1/markets` | สาธารณะ | `q`, `page`, `limit`; ตลาด active และสรุปรอบที่เปิด/กำลังจะจัด |
| `GET /api/v1/markets/:marketId` | สาธารณะ | รายละเอียดตลาดและสถานที่ |
| `GET /api/v1/markets/:marketId/sessions` | สาธารณะ | `status`, `from`, `to`, `page`, `limit`; รอบตลาดตามวันและสถานะ |
| `GET /api/v1/sessions/:sessionId` | สาธารณะ | รายละเอียดตลาด รอบ วันเวลา และสถานะรับจอง |
| `GET /api/v1/categories` | สาธารณะ | หมวดหมู่ active เรียงตาม `sort_order` |

Public endpoints คืนเฉพาะข้อมูลที่เผยแพร่ ไม่ส่งข้อมูลบัญชีผู้ค้า

### เลือกแผงและจอง (Shop)

| Method/Path | Auth | หน้าที่ |
|---|---|---|
| `GET /api/v1/sessions/:sessionId/stalls` | Shop | ผัง/รายการแผง สถานะ availability และราคา; query `status`, `page`, `limit` |
| `POST /api/v1/reservations` | Shop | ส่งคำขอจองแผงหนึ่งแผง |
| `GET /api/v1/reservations` | Shop | รายการจองของร้านตน; query `status`, `sessionId`, `page`, `limit` |
| `GET /api/v1/reservations/:reservationId` | เจ้าของ | รายละเอียดการจองของเจ้าของเท่านั้น |
| `POST /api/v1/reservations/:reservationId/cancel` | เจ้าของ | ยกเลิกตามเงื่อนไขที่อนุญาต |

รายการแผงควรมี `id`, `code`, `x`, `y`, `width`, `height`, `price`, `availability` โดย availability เป็นค่าที่คำนวณจากการจองในรอบ ไม่ใช่ค่า cached ที่เชื่อ client

ตัวอย่างสร้างคำขอ:

```json
{
  "sessionId": 12,
  "stallId": 31,
  "shopNote": "จำหน่ายขนมไทย"
}
```

Backend ใช้ shop จาก token, ตรวจว่ารอบเปิดรับจอง, แผง active และเป็นตลาดเดียวกับรอบ, ไม่มีคำขอ `pending`/`confirmed` ซ้ำ แล้วบันทึก `requested_price` snapshot ใน transaction ตอบ `201` พร้อมรหัสคำขอ สถานะ ราคา และเวลาสร้าง

Cancel เปลี่ยนสถานะเป็น `cancelled` ไม่ลบประวัติ โดยค่าเริ่มต้นอนุญาตเฉพาะ `pending`; การยกเลิก `confirmed` ขึ้นกับกติกาตลาด หากเปลี่ยนสถานะไม่ได้ตอบ `409 RESERVATION_NOT_CANCELLABLE`

### แดชบอร์ดและโปรไฟล์ Shop

| Method/Path | Auth | หน้าที่ |
|---|---|---|
| `GET /api/v1/shop/dashboard` | Shop | จำนวน pending/confirmed, งานใกล้ถึง และรายการล่าสุด |
| `GET /api/v1/shop/profile` | Shop | โปรไฟล์ร้านปัจจุบันและสถานะเผยแพร่ |
| `PATCH /api/v1/shop/profile` | Shop | แก้ชื่อร้าน หมวดหมู่ รายละเอียด ช่องทางสาธารณะ และสถานะเผยแพร่ |

PATCH รับเฉพาะ field ที่อนุญาต เช่น `{ "shopName": "ขนมบ้านมะลิ", "categoryId": 2, "description": "ขนมไทยทำสด", "publicContact": "ช่องทางที่ยินยอมเผยแพร่", "isPublished": true }`; ตรวจความยาวและหมวดหมู่บน server

### แผนผังและค้นหาร้าน Customer (QR)

| Method/Path | Auth | หน้าที่ |
|---|---|---|
| `GET /api/v1/public/sessions/:publicToken/map` | สาธารณะ | รายละเอียดตลาด/รอบ ผังแผง และร้านที่ยืนยันและเผยแพร่แล้ว |
| `GET /api/v1/public/sessions/:publicToken/shops` | สาธารณะ | ค้นหา/กรองร้าน; query `q`, `categoryId`, `page`, `limit` |
| `GET /api/v1/public/sessions/:publicToken/shops/:shopId` | สาธารณะ | รายละเอียดที่เผยแพร่และตำแหน่งแผง |
| `GET /api/v1/public/sessions/:publicToken/stalls/:stallCode` | สาธารณะ | รายละเอียดแผงและร้านที่เปิดเผยได้ |

Map response ส่งเฉพาะชื่อร้าน หมวดหมู่ คำอธิบาย และพิกัด/รหัสแผง รวมชื่อและวันเวลาตลาด ห้ามส่ง `user_id`, เบอร์ส่วนตัว, email, หมายเหตุภายใน หรือข้อมูลการจองที่ pending

ตัวอย่าง map response:

```json
{
  "data": {
    "market": { "name": "ตลาดชุมชน", "address": "..." },
    "session": { "title": "ตลาดเย็น", "eventDate": "2026-11-07", "startTime": "16:00", "endTime": "21:00" },
    "stalls": [
      { "code": "A01", "x": 12.5, "y": 20, "width": 8, "height": 6,
        "shop": { "name": "ขนมบ้านมะลิ", "category": "อาหาร", "description": "ขนมไทยทำสด" } }
    ]
  }
}
```

หาก token ไม่ถูกต้องหรือรอบไม่ public ให้ตอบ `404 PUBLIC_MAP_NOT_FOUND` และไม่เผยว่ามีรอบซ่อนอยู่หรือไม่ หากแผงว่างให้คืน availability แบบสาธารณะโดยไม่เปิดเผยผู้จอง pending

### Admin ในอนาคต (ยังไม่ implement)

เมื่อเริ่มระยะ Admin อาจเพิ่ม `POST/PATCH /api/v1/admin/markets`, `/sessions`, `/stalls`, `GET /api/v1/admin/reservations` และ `PATCH /api/v1/admin/reservations/:id/status` ทุก endpoint ต้องตรวจ role `admin` และบันทึกผู้เปลี่ยนสถานะ/เวลาเพื่อ audit

## HTTP Status และรหัสข้อผิดพลาด

| HTTP | Code ตัวอย่าง | ใช้เมื่อ |
|---|---|---|
| `200` | — | อ่าน/แก้ไขสำเร็จ |
| `201` | — | สร้างข้อมูลสำเร็จ |
| `204` | — | สำเร็จ ไม่มี response body |
| `400` | `VALIDATION_ERROR` | body หรือ query ไม่ถูกต้อง |
| `401` | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` | ไม่มี/ใช้ token ไม่ได้ หรือ login ล้มเหลว |
| `403` | `FORBIDDEN` | ไม่มีสิทธิ์ |
| `404` | `NOT_FOUND`, `PUBLIC_MAP_NOT_FOUND` | ไม่พบหรือไม่เปิดเผยข้อมูล |
| `409` | `SLOT_ALREADY_BOOKED`, `BOOKING_CLOSED`, `RESERVATION_NOT_CANCELLABLE` | conflict หรือทำรายการตามสถานะไม่ได้ |
| `429` | `RATE_LIMITED` | เรียกถี่เกินไป |
| `500` | `INTERNAL_ERROR` | ข้อผิดพลาด server; ห้ามส่ง stack trace ให้ client |

## การจับคู่ endpoint กับหน้าจอ

| หน้าจอ | API |
|---|---|
| หน้าแรก/รายการตลาด | `GET /markets`, `GET /markets/:id/sessions` |
| สมัคร/เข้าสู่ระบบ | `POST /auth/register`, `POST /auth/login` |
| แดชบอร์ด Shop | `GET /shop/dashboard`, `GET /reservations` |
| เลือกตลาด/รอบ | `GET /markets`, `GET /markets/:id`, `GET /sessions/:id` |
| เลือกแผง/จอง | `GET /sessions/:id/stalls`, `POST /reservations` |
| ประวัติ/รายละเอียดจอง | `GET /reservations`, `GET /reservations/:id`, `POST /reservations/:id/cancel` |
| โปรไฟล์ร้าน | `GET/PATCH /shop/profile`, `GET /categories` |
| ผังจาก QR | `GET /public/sessions/:token/map` |
| ค้นหา/ดูร้าน | `GET /public/sessions/:token/shops`, `GET /public/sessions/:token/shops/:shopId` |

## ข้อกำหนดความปลอดภัยเพิ่มเติม

- ใช้ parameterized query ป้องกัน SQL injection และตรวจชนิด/ความยาว/range ของ input ทุก endpoint
- จำกัดความถี่ login และ public search; ไม่ log password หรือ access token
- ตรวจ authorization ใน backend ทุก request และใช้ query ที่จำกัดเจ้าของข้อมูล
- เมื่อใช้ same-origin ไม่จำเป็นต้องเปิด CORS; ตั้ง cookie เป็น `HttpOnly`, `Secure`, `SameSite` หากเลือก cookie session
- เลือกแนวทาง token ให้ชัด: session มีการเพิกถอน หรือ JWT อายุสั้นพร้อมกลไก refresh/revoke; logout ต้องทำให้ credential ใช้ต่อไม่ได้ตามแบบที่เลือก
