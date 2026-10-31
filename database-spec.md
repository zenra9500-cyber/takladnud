# ออกแบบฐานข้อมูล: ตากหลาดนัด

เอกสารนี้กำหนดโครงสร้างฐานข้อมูล MariaDB สำหรับระบบจองแผงตลาดและเผยแพร่แผนผังร้านผ่าน QR Code รองรับฟีเจอร์ Shop และ Customer ในระยะแรก และเตรียมข้อมูลบางส่วนสำหรับ Admin ในอนาคต

## 1. แนวทางการออกแบบ

- ใช้ MariaDB และ storage engine `InnoDB` เพื่อรองรับ Foreign Key และ transaction
- ใช้ charset/collation `utf8mb4` เพื่อรองรับภาษาไทยและ Unicode
- ใช้ `BIGINT UNSIGNED AUTO_INCREMENT` เป็น primary key ของตารางหลัก
- เก็บเงินด้วย `DECIMAL(10,2)` ห้ามใช้ `FLOAT` หรือ `DOUBLE` เพราะค่าคลาดเคลื่อนได้
- เก็บเบอร์โทรเป็น `VARCHAR` ไม่ใช้ชนิดตัวเลข เพราะอาจมีเลข 0 นำหน้า
- เก็บเวลาระบบเป็น `DATETIME` และกำหนดเขตเวลาของแอปให้ชัดเจน แนะนำบันทึก UTC แล้วแปลงตอนแสดงผล
- รหัสผ่านเก็บเป็น hash ที่สร้างด้วยไลบรารีที่เหมาะสมเท่านั้น ไม่เก็บรหัสผ่านดิบ
- ใช้ Foreign Key ป้องกันข้อมูลกำพร้า และไม่ลบข้อมูลที่มีประวัติการจอง ให้ปิดใช้งานหรือเปลี่ยนสถานะแทน

## 2. ตาราง `users` — บัญชีผู้ใช้

เก็บบัญชีผู้ค้าและเตรียมบทบาท Admin ไว้ ผู้เข้าชมผังสาธารณะไม่จำเป็นต้องมีบัญชีในระยะแรก

| คอลัมน์ | ชนิดข้อมูล | NULL | คำอธิบาย |
|---|---|---:|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | ไม่ | Primary Key |
| `display_name` | `VARCHAR(120)` | ไม่ | ชื่อผู้ติดต่อหรือชื่อที่แสดง |
| `phone` | `VARCHAR(20)` | ไม่ | เบอร์โทร ใช้เข้าสู่ระบบได้ |
| `email` | `VARCHAR(254)` | ได้ | อีเมล ถ้าใช้เข้าสู่ระบบควรกำหนดไม่ซ้ำ |
| `password_hash` | `VARCHAR(255)` | ไม่ | hash ของรหัสผ่าน |
| `role` | `ENUM('shop','admin')` | ไม่ | บทบาทบัญชี ค่าเริ่มต้น `shop`; Admin ยังไม่อยู่ในระยะแรก |
| `is_active` | `TINYINT(1)` | ไม่ | สถานะบัญชี ค่าเริ่มต้น 1 |
| `created_at` | `DATETIME` | ไม่ | วันเวลาสร้างรายการ |
| `updated_at` | `DATETIME` | ไม่ | วันเวลาแก้ไขล่าสุด |

**ข้อกำหนด:** Primary Key ที่ `id`, Unique ที่ `phone`; อาจกำหนด Unique ที่ `email` ได้ โดย MariaDB ยอมให้หลายแถวมี email เป็น `NULL`

## 3. ตาราง `categories` — หมวดหมู่ร้าน

รายการหมวดหมู่กลาง เช่น อาหาร เครื่องดื่ม เสื้อผ้า และงานฝีมือ เพื่อให้ค้นหา/กรองได้สม่ำเสมอ

| คอลัมน์ | ชนิดข้อมูล | NULL | คำอธิบาย |
|---|---|---:|---|
| `id` | `INT UNSIGNED AUTO_INCREMENT` | ไม่ | Primary Key |
| `name` | `VARCHAR(80)` | ไม่ | ชื่อหมวดหมู่ ไม่ซ้ำ |
| `sort_order` | `SMALLINT UNSIGNED` | ไม่ | ลำดับแสดงผล ค่าเริ่มต้น 0 |
| `is_active` | `TINYINT(1)` | ไม่ | ใช้งานหมวดหมู่นี้หรือไม่ ค่าเริ่มต้น 1 |

**ดัชนี:** Unique ที่ `name`

## 4. ตาราง `shops` — โปรไฟล์ร้านค้า

หนึ่งบัญชีผู้ค้าผูกกับหนึ่งร้านในรุ่นเริ่มต้น หากอนาคตหนึ่งบัญชีดูแลหลายร้าน ให้นำ Unique constraint ของ `user_id` ออก

| คอลัมน์ | ชนิดข้อมูล | NULL | คำอธิบาย |
|---|---|---:|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | ไม่ | Primary Key |
| `user_id` | `BIGINT UNSIGNED` | ไม่ | Foreign Key ไป `users.id`, Unique ในกรณีหนึ่งบัญชีต่อหนึ่งร้าน |
| `category_id` | `INT UNSIGNED` | ได้ | Foreign Key ไป `categories.id` |
| `shop_name` | `VARCHAR(150)` | ไม่ | ชื่อร้าน |
| `description` | `TEXT` | ได้ | รายละเอียดร้าน |
| `public_contact` | `VARCHAR(150)` | ได้ | ช่องทางติดต่อที่ร้านยินยอมเปิดเผย |
| `is_published` | `TINYINT(1)` | ไม่ | อนุญาตให้แสดงในผังสาธารณะหรือไม่ ค่าเริ่มต้น 0 |
| `created_at` | `DATETIME` | ไม่ | วันเวลาสร้าง |
| `updated_at` | `DATETIME` | ไม่ | วันเวลาแก้ไขล่าสุด |

**Foreign Key:** `user_id → users.id`, `category_id → categories.id` หากลบหมวดหมู่ ควรใช้ `ON DELETE SET NULL`; บัญชีที่มีข้อมูลร้านไม่ควรถูกลบจริง

## 5. ตาราง `markets` — ตลาด

เก็บข้อมูลหลักของสถานที่ตลาด ซึ่งอาจมีหลายรอบจัดงาน

| คอลัมน์ | ชนิดข้อมูล | NULL | คำอธิบาย |
|---|---|---:|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | ไม่ | Primary Key |
| `name` | `VARCHAR(150)` | ไม่ | ชื่อตลาด |
| `description` | `TEXT` | ได้ | รายละเอียดตลาด |
| `address` | `VARCHAR(500)` | ได้ | ที่อยู่หรือคำอธิบายสถานที่ |
| `is_active` | `TINYINT(1)` | ไม่ | สถานะตลาด ค่าเริ่มต้น 1 |
| `created_at` | `DATETIME` | ไม่ | วันเวลาสร้าง |
| `updated_at` | `DATETIME` | ไม่ | วันเวลาแก้ไขล่าสุด |

## 6. ตาราง `market_sessions` — รอบหรือวันจัดงาน

ตลาดเดียวมีได้หลายรอบ ตารางนี้เป็นตัวอ้างอิงการจองและปลายทางของ QR Code

| คอลัมน์ | ชนิดข้อมูล | NULL | คำอธิบาย |
|---|---|---:|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | ไม่ | Primary Key |
| `market_id` | `BIGINT UNSIGNED` | ไม่ | Foreign Key ไป `markets.id` |
| `title` | `VARCHAR(150)` | ไม่ | ชื่อรอบ เช่น ตลาดเย็นวันเสาร์ |
| `event_date` | `DATE` | ไม่ | วันที่จัดงาน |
| `start_time` | `TIME` | ได้ | เวลาเริ่ม |
| `end_time` | `TIME` | ได้ | เวลาสิ้นสุด |
| `booking_opens_at` | `DATETIME` | ได้ | เวลาเปิดรับจอง |
| `booking_closes_at` | `DATETIME` | ได้ | เวลาปิดรับจอง |
| `status` | `ENUM('draft','open','closed','completed','cancelled')` | ไม่ | สถานะรอบ ค่าเริ่มต้น `draft` |
| `public_token` | `CHAR(32)` | ไม่ | token สุ่มสำหรับลิงก์ QR Code, Unique |
| `created_at` | `DATETIME` | ไม่ | วันเวลาสร้าง |
| `updated_at` | `DATETIME` | ไม่ | วันเวลาแก้ไขล่าสุด |

**ดัชนี:** `(market_id, event_date)` สำหรับค้นหารอบในตลาด และ `(status, event_date)` สำหรับหารอบที่เปิดอยู่ ใช้ token แบบสุ่ม ไม่ใช้เลข `id` เป็นรหัสลับ

## 7. ตาราง `stalls` — แผงร้านค้า

แผงเป็นส่วนหนึ่งของผังตลาด จึงผูกกับ `markets` และนำกลับมาใช้ในหลายรอบได้ ตำแหน่งเก็บเป็นเปอร์เซ็นต์ของขนาดผังเพื่อปรับตามหน้าจอ

| คอลัมน์ | ชนิดข้อมูล | NULL | คำอธิบาย |
|---|---|---:|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | ไม่ | Primary Key |
| `market_id` | `BIGINT UNSIGNED` | ไม่ | Foreign Key ไป `markets.id` |
| `stall_code` | `VARCHAR(30)` | ไม่ | รหัสแผง เช่น A01 |
| `label` | `VARCHAR(100)` | ได้ | ป้ายที่แสดงบนแผนผัง |
| `map_x` | `DECIMAL(7,4)` | ได้ | จุดเริ่มแนวนอนเป็นเปอร์เซ็นต์ 0–100 |
| `map_y` | `DECIMAL(7,4)` | ได้ | จุดเริ่มแนวตั้งเป็นเปอร์เซ็นต์ 0–100 |
| `map_width` | `DECIMAL(7,4)` | ได้ | ความกว้างเทียบกับผังเป็นเปอร์เซ็นต์ |
| `map_height` | `DECIMAL(7,4)` | ได้ | ความสูงเทียบกับผังเป็นเปอร์เซ็นต์ |
| `base_price` | `DECIMAL(10,2)` | ไม่ | ราคาเช่าพื้นฐาน ค่าเริ่มต้น 0.00 |
| `status` | `ENUM('available','disabled')` | ไม่ | เปิดให้จองหรือปิดใช้งาน |
| `created_at` | `DATETIME` | ไม่ | วันเวลาสร้าง |
| `updated_at` | `DATETIME` | ไม่ | วันเวลาแก้ไขล่าสุด |

**ดัชนีและกติกา:** Unique ที่ `(market_id, stall_code)`; ตรวจค่าพิกัดให้อยู่ระหว่าง 0 ถึง 100 ใน backend หรือด้วย CHECK constraint หากเวอร์ชัน MariaDB รองรับ สถานะ “จองแล้ว” คำนวณจาก `reservations` ไม่เก็บซ้ำในตารางนี้

## 8. ตาราง `reservations` — คำขอจองแผง

หนึ่งแถวแทนการจองหนึ่งแผงในหนึ่งรอบ รายการที่ยกเลิกหรือถูกปฏิเสธยังคงเก็บไว้เป็นประวัติ

| คอลัมน์ | ชนิดข้อมูล | NULL | คำอธิบาย |
|---|---|---:|---|
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | ไม่ | Primary Key |
| `shop_id` | `BIGINT UNSIGNED` | ไม่ | Foreign Key ไป `shops.id` |
| `session_id` | `BIGINT UNSIGNED` | ไม่ | Foreign Key ไป `market_sessions.id` |
| `stall_id` | `BIGINT UNSIGNED` | ไม่ | Foreign Key ไป `stalls.id` |
| `status` | `ENUM('pending','confirmed','rejected','cancelled')` | ไม่ | สถานะ ค่าเริ่มต้น `pending` |
| `requested_price` | `DECIMAL(10,2)` | ไม่ | ราคาขณะส่งคำขอ เก็บเป็น snapshot |
| `shop_note` | `VARCHAR(500)` | ได้ | หมายเหตุจากร้าน |
| `admin_note` | `VARCHAR(500)` | ได้ | หมายเหตุ Admin สำหรับอนาคต |
| `created_at` | `DATETIME` | ไม่ | วันเวลาส่งคำขอ |
| `updated_at` | `DATETIME` | ไม่ | วันเวลาเปลี่ยนสถานะล่าสุด |

**ดัชนีที่แนะนำ:** `(shop_id, created_at)` สำหรับประวัติของผู้ค้า และ `(session_id, status)` สำหรับดูรายการตามรอบงาน

### ป้องกันการจองซ้ำ

ห้ามมีคำขอ `pending` หรือ `confirmed` มากกว่าหนึ่งรายการสำหรับแผงเดียวกันในรอบเดียวกัน Backend ควรใช้ transaction และล็อกข้อมูลแผงก่อนตรวจสอบและบันทึก เพื่อป้องกันคำขอที่เข้ามาพร้อมกัน

หาก MariaDB เวอร์ชันที่ใช้รองรับ generated column ใน unique index สามารถสร้างคอลัมน์คำนวณ `active_stall_id` ให้มีค่า `stall_id` เฉพาะเมื่อสถานะเป็น `pending` หรือ `confirmed` แล้วสร้าง Unique Index ที่ `(session_id, active_stall_id)` ได้ สถานะ `cancelled` และ `rejected` จะได้ `NULL` ทำให้เก็บประวัติและเปิดให้จองแผงเดิมใหม่ได้

เพิ่มเติม: ก่อนสร้างรายการ ต้องตรวจว่า `stalls.market_id` ตรงกับ `market_sessions.market_id` การยกเลิกควรเปลี่ยนสถานะ ไม่ลบแถว

## 9. QR Code

ระยะแรกไม่ต้องเก็บไฟล์ภาพ QR ในฐานข้อมูล ให้สร้าง QR จาก URL ที่มี `market_sessions.public_token` เมื่อแสดงหรือพิมพ์ หากต้องการเก็บชื่อ QR วันหมดอายุ หรือสถานะเปิดปิดในอนาคต ค่อยเพิ่มตาราง `market_qr_codes` ที่อ้างอิง `market_sessions.id`

## 10. Foreign Key โดยสรุป

- `shops.user_id → users.id`
- `shops.category_id → categories.id`
- `market_sessions.market_id → markets.id`
- `stalls.market_id → markets.id`
- `reservations.shop_id → shops.id`
- `reservations.session_id → market_sessions.id`
- `reservations.stall_id → stalls.id`

แนะนำ `ON DELETE RESTRICT` กับข้อมูลที่มีประวัติการจอง และใช้การปิดใช้งานแทนการลบจริง สำหรับหมวดหมู่ที่ถูกลบอาจใช้ `ON DELETE SET NULL`

## 11. กฎสิทธิ์และการเปิดเผยข้อมูล

- ผู้ค้าอ่านหรือแก้ไขได้เฉพาะบัญชี โปรไฟล์ และคำขอจองที่เป็นของตน
- ลูกค้าอ่านได้เฉพาะร้านที่ `is_published = 1` และข้อมูลติดต่อที่เจ้าของร้านยินยอมเผยแพร่
- ใช้ query ฝั่ง backend กรองข้อมูล ไม่พึ่งการซ่อนข้อมูลในหน้าเว็บอย่างเดียว
- ใช้ transaction เมื่อสร้างหรือยืนยันการจอง เพื่อให้การตรวจสอบกับการบันทึกเป็นงานเดียวกัน
- ไม่ลบบัญชี แผง หรือรอบงานที่มีประวัติการจอง ให้ปิดใช้งานหรือเปลี่ยนสถานะแทน

## 12. สรุปตารางระยะแรก

ตารางที่จำเป็นต่อฟีเจอร์หลักคือ `users`, `categories`, `shops`, `markets`, `market_sessions`, `stalls` และ `reservations` ส่วน `admin_note` และบทบาท `admin` เตรียมไว้รองรับระยะถัดไป โดยไม่จำเป็นต้องทำหน้าจอผู้ดูแลในตอนนี้
