# ออกแบบฐานข้อมูล: ตากหลาดนัด

เอกสารนี้เสนอ schema ฐานข้อมูล MariaDB สำหรับระบบจองแผงตลาดและแสดงแผนผังร้านค้าผ่าน QR Code รองรับผู้ค้า (Shop) และลูกค้า (Customer) ในระยะแรก พร้อมเตรียมบทบาท Admin สำหรับพัฒนาภายหลัง

## แนวทางทั่วไป

- ใช้ MariaDB กับ InnoDB เพื่อรองรับ Foreign Key และ transaction
- ใช้ `utf8mb4` เพื่อรองรับภาษาไทย
- ตารางหลักใช้ `BIGINT UNSIGNED AUTO_INCREMENT` เป็น Primary Key; หมวดหมู่ใช้ `INT UNSIGNED`
- ใช้ `VARCHAR` สำหรับข้อความสั้น, `TEXT` สำหรับรายละเอียด, `DECIMAL` สำหรับราคาและตำแหน่ง
- ใช้ `DATE`/`TIME` สำหรับวันและเวลาจัดงาน และ `DATETIME` สำหรับเวลาสร้างหรือแก้ไข
- เบอร์โทรเป็น `VARCHAR` เพื่อเก็บเลข 0 นำหน้า
- รหัสผ่านเก็บเฉพาะ hash ห้ามเก็บรหัสผ่านดิบ

## ตารางและคอลัมน์

### 1. `users` — บัญชีผู้ใช้

รองรับบัญชี Shop และเตรียม role Admin ไว้ ลูกค้าที่เข้าดูผังสาธารณะไม่จำเป็นต้องสมัครบัญชีในระยะแรก

| คอลัมน์ | ชนิดข้อมูล | รายละเอียด |
|---|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | Primary Key |
| `display_name` | `VARCHAR(120)` | ชื่อผู้ติดต่อหรือชื่อแสดงผล, NOT NULL |
| `phone` | `VARCHAR(20)` | เบอร์โทร, NOT NULL, UNIQUE |
| `email` | `VARCHAR(254)` | อีเมล, NULL ได้; กำหนด UNIQUE หากใช้เข้าสู่ระบบ |
| `password_hash` | `VARCHAR(255)` | hash ของรหัสผ่าน, NOT NULL |
| `role` | `ENUM('shop','admin')` | บทบาท, ค่าเริ่มต้น `shop`; Admin ยังไม่เปิดใช้ระยะแรก |
| `is_active` | `TINYINT(1)` | สถานะบัญชี, ค่าเริ่มต้น 1 |
| `created_at` | `DATETIME` | วันเวลาสร้าง |
| `updated_at` | `DATETIME` | วันเวลาแก้ไขล่าสุด |

### 2. `categories` — หมวดหมู่ร้าน

| คอลัมน์ | ชนิดข้อมูล | รายละเอียด |
|---|---|---|
| `id` | `INT UNSIGNED AUTO_INCREMENT` | Primary Key |
| `name` | `VARCHAR(80)` | ชื่อหมวด เช่น อาหาร เสื้อผ้า งานฝีมือ; NOT NULL, UNIQUE |
| `sort_order` | `SMALLINT UNSIGNED` | ลำดับแสดงผล, ค่าเริ่มต้น 0 |
| `is_active` | `TINYINT(1)` | สถานะใช้งาน, ค่าเริ่มต้น 1 |

### 3. `shops` — โปรไฟล์ร้านค้า

หนึ่งบัญชีผู้ค้าผูกหนึ่งร้านในรุ่นเริ่มต้น หากภายหลังรองรับหลายร้านต่อบัญชี ให้นำ UNIQUE ออกจาก `user_id`

| คอลัมน์ | ชนิดข้อมูล | รายละเอียด |
|---|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | Primary Key |
| `user_id` | `BIGINT UNSIGNED` | Foreign Key ไป `users.id`, NOT NULL, UNIQUE |
| `category_id` | `INT UNSIGNED` | Foreign Key ไป `categories.id`, NULL ได้ |
| `shop_name` | `VARCHAR(150)` | ชื่อร้าน, NOT NULL |
| `description` | `TEXT` | รายละเอียดร้าน, NULL ได้ |
| `public_contact` | `VARCHAR(150)` | ช่องทางติดต่อที่ยินยอมเผยแพร่, NULL ได้ |
| `is_published` | `TINYINT(1)` | เผยแพร่ในผังสาธารณะหรือไม่, ค่าเริ่มต้น 0 |
| `created_at` | `DATETIME` | วันเวลาสร้าง |
| `updated_at` | `DATETIME` | วันเวลาแก้ไขล่าสุด |

### 4. `markets` — ตลาด

| คอลัมน์ | ชนิดข้อมูล | รายละเอียด |
|---|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | Primary Key |
| `name` | `VARCHAR(150)` | ชื่อตลาด, NOT NULL |
| `description` | `TEXT` | รายละเอียด, NULL ได้ |
| `address` | `VARCHAR(500)` | ที่อยู่หรือคำอธิบายสถานที่, NULL ได้ |
| `is_active` | `TINYINT(1)` | สถานะตลาด, ค่าเริ่มต้น 1 |
| `created_at` | `DATETIME` | วันเวลาสร้าง |
| `updated_at` | `DATETIME` | วันเวลาแก้ไขล่าสุด |

### 5. `market_sessions` — รอบหรือวันจัดงาน

แยกจากตลาดหลัก เพราะตลาดหนึ่งแห่งจัดได้หลายวันหรือหลายรอบ ตารางนี้ยังเป็นตัวอ้างอิงรอบของ QR Code

| คอลัมน์ | ชนิดข้อมูล | รายละเอียด |
|---|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | Primary Key |
| `market_id` | `BIGINT UNSIGNED` | Foreign Key ไป `markets.id`, NOT NULL |
| `title` | `VARCHAR(150)` | ชื่อรอบ เช่น ตลาดเย็นวันเสาร์, NOT NULL |
| `event_date` | `DATE` | วันที่จัดงาน, NOT NULL |
| `start_time` | `TIME` | เวลาเริ่ม, NULL ได้ |
| `end_time` | `TIME` | เวลาสิ้นสุด, NULL ได้ |
| `booking_opens_at` | `DATETIME` | เวลาเปิดรับจอง, NULL ได้ |
| `booking_closes_at` | `DATETIME` | เวลาปิดรับจอง, NULL ได้ |
| `status` | `ENUM('draft','open','closed','completed','cancelled')` | สถานะรอบ, ค่าเริ่มต้น `draft` |
| `public_token` | `CHAR(32)` | token สุ่มสำหรับ URL QR Code, NOT NULL, UNIQUE |
| `created_at` | `DATETIME` | วันเวลาสร้าง |
| `updated_at` | `DATETIME` | วันเวลาแก้ไขล่าสุด |

ดัชนีแนะนำ: `(market_id, event_date)` และ `(status, event_date)` ใช้ token สุ่ม ไม่ใช้เลข ID เป็น secret

### 6. `stalls` — แผงร้านค้า

แผงผูกกับตลาดหลัก เพื่อนำกลับมาใช้ซ้ำในหลายรอบได้ ตำแหน่งเป็นเปอร์เซ็นต์ของผัง ทำให้ปรับตามขนาดหน้าจอได้

| คอลัมน์ | ชนิดข้อมูล | รายละเอียด |
|---|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | Primary Key |
| `market_id` | `BIGINT UNSIGNED` | Foreign Key ไป `markets.id`, NOT NULL |
| `stall_code` | `VARCHAR(30)` | รหัสแผง เช่น A01, NOT NULL |
| `label` | `VARCHAR(100)` | ป้ายบนผัง, NULL ได้ |
| `map_x` | `DECIMAL(7,4)` | พิกัดแนวนอน 0–100 เปอร์เซ็นต์, NULL ได้ |
| `map_y` | `DECIMAL(7,4)` | พิกัดแนวตั้ง 0–100 เปอร์เซ็นต์, NULL ได้ |
| `map_width` | `DECIMAL(7,4)` | ความกว้างแผงเทียบผังเป็นเปอร์เซ็นต์ |
| `map_height` | `DECIMAL(7,4)` | ความสูงแผงเทียบผังเป็นเปอร์เซ็นต์ |
| `base_price` | `DECIMAL(10,2)` | ราคาเช่าพื้นฐาน, ค่าเริ่มต้น 0.00 |
| `status` | `ENUM('available','disabled')` | เปิดให้จองหรือปิดใช้งาน |
| `created_at` | `DATETIME` | วันเวลาสร้าง |
| `updated_at` | `DATETIME` | วันเวลาแก้ไขล่าสุด |

กำหนด `UNIQUE(market_id, stall_code)` ป้องกันรหัสแผงซ้ำในตลาดเดียวกัน สถานะ “จองแล้ว” ให้คำนวณจากตารางจอง ไม่เก็บซ้ำในตารางนี้

### 7. `reservations` — คำขอจองแผง

หนึ่งแถวแทนการขอจองหนึ่งแผงในหนึ่งรอบงาน เก็บประวัติรายการที่ยกเลิกหรือถูกปฏิเสธไว้

| คอลัมน์ | ชนิดข้อมูล | รายละเอียด |
|---|---|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | Primary Key |
| `shop_id` | `BIGINT UNSIGNED` | Foreign Key ไป `shops.id`, NOT NULL |
| `session_id` | `BIGINT UNSIGNED` | Foreign Key ไป `market_sessions.id`, NOT NULL |
| `stall_id` | `BIGINT UNSIGNED` | Foreign Key ไป `stalls.id`, NOT NULL |
| `status` | `ENUM('pending','confirmed','rejected','cancelled')` | สถานะ, ค่าเริ่มต้น `pending` |
| `requested_price` | `DECIMAL(10,2)` | ราคาขณะส่งคำขอ เก็บเป็น snapshot |
| `shop_note` | `VARCHAR(500)` | หมายเหตุผู้ค้า, NULL ได้ |
| `admin_note` | `VARCHAR(500)` | หมายเหตุผู้ดูแล เตรียมไว้สำหรับอนาคต, NULL ได้ |
| `created_at` | `DATETIME` | วันเวลาส่งคำขอ |
| `updated_at` | `DATETIME` | วันเวลาเปลี่ยนสถานะล่าสุด |

ดัชนีแนะนำ: `(shop_id, created_at)` สำหรับประวัติผู้ค้า และ `(session_id, status)` สำหรับรายการในรอบงาน

## ความสัมพันธ์และ Foreign Key

- `shops.user_id → users.id`
- `shops.category_id → categories.id`
- `market_sessions.market_id → markets.id`
- `stalls.market_id → markets.id`
- `reservations.shop_id → shops.id`
- `reservations.session_id → market_sessions.id`
- `reservations.stall_id → stalls.id`

แนะนำ `ON DELETE RESTRICT` กับข้อมูลที่มีประวัติการจอง ใช้ `ON DELETE SET NULL` กับหมวดหมู่ได้ตามนโยบาย และควรปิดใช้งานข้อมูลแทนการลบจริง

## การป้องกันจองแผงซ้ำ

ห้ามมี `pending` หรือ `confirmed` มากกว่าหนึ่งรายการสำหรับแผงเดียวกันในรอบเดียวกัน Backend ควรใช้ transaction และล็อกข้อมูลแผงก่อนตรวจสอบและบันทึก เพื่อป้องกันคำขอพร้อมกัน

หาก MariaDB เวอร์ชันที่ใช้งานรองรับ generated column ใน unique index ให้สร้างคอลัมน์คำนวณ `active_stall_id` ซึ่งมีค่า `stall_id` เฉพาะสถานะ `pending`/`confirmed` และเป็น `NULL` เมื่อ `rejected`/`cancelled` แล้วสร้าง unique index `(session_id, active_stall_id)` วิธีนี้เก็บประวัติได้และเปิดให้จองแผงเดิมใหม่หลังยกเลิกได้

ก่อนบันทึกการจองต้องตรวจด้วยว่าแผงและรอบงานเป็นของตลาดเดียวกัน การยกเลิกหรือปฏิเสธให้เปลี่ยนสถานะ ไม่ลบแถว

## QR Code

ระยะแรกไม่ต้องเก็บไฟล์ QR Code ในฐานข้อมูล สร้างภาพจาก URL ที่มี `market_sessions.public_token` ตอนแสดงหรือพิมพ์ หากภายหลังต้องกำหนดชื่อ QR วันหมดอายุ หรือสถานะใช้งาน ค่อยเพิ่มตาราง QR แยกได้

## สิทธิ์และการเปิดเผยข้อมูล

- Shop อ่านและแก้ไขได้เฉพาะบัญชี ร้าน และรายการจองของตน
- Customer เห็นเฉพาะร้านที่เผยแพร่แล้ว และช่องทางติดต่อที่เจ้าของร้านยินยอมให้เปิดเผย
- การกรองสิทธิ์ต้องทำฝั่ง backend ไม่ใช่ซ่อนข้อมูลเฉพาะหน้าเว็บ
- ใช้ transaction เมื่อสร้างหรือยืนยันการจอง
- ไม่ลบบัญชี แผง หรือรอบงานที่มีประวัติ ให้ปิดใช้งานแทน

## สรุปตาราง

ตารางหลักที่จำเป็นมี 7 ตาราง: `users`, `categories`, `shops`, `markets`, `market_sessions`, `stalls` และ `reservations` โดยข้อมูล Admin ในเอกสารนี้เป็นการเตรียมโครงสร้างไว้ ยังไม่จำเป็นต้องพัฒนาหน้าจอ Admin ในระยะแรก
