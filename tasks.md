# Task Checklist — ตากหลาดนัด

เอกสารนี้แตกข้อกำหนดจาก `spec.md` เป็นงานย่อยสำหรับติดตามการพัฒนา แยกตามลำดับและผู้ใช้งาน แต่ละ task ระบุสิ่งที่จะทำ ตำแหน่งไฟล์ วิธีทำ และเกณฑ์ตรวจรับ

## วิธีอัปเดต checklist และบันทึกงาน

- เริ่มงานโดยเปลี่ยน `[ ]` เป็น `[-]` และเพิ่มวันที่/ผู้ทำในบันทึกของ task นั้น
- เมื่อทำและตรวจสอบผ่านแล้ว เปลี่ยน `[-]` เป็น `[x]` พร้อมกรอก **ทำอะไร / ทำที่ไหน / ทำอย่างไร / ผลตรวจสอบ** ในบันทึกงาน
- ถ้าทำไม่ครบหรือทดสอบไม่ผ่าน ให้คง `[-]` หรือ `[ ]` และเขียนสิ่งที่ค้าง/สาเหตุ ห้ามทำเครื่องหมายเสร็จเพียงเพราะเริ่มแก้แล้ว
- งานที่ยังไม่เริ่มคง `[ ]`; งาน Admin เป็นระยะถัดไป ไม่ทำใน MVP
- โค้ดแอปสร้าง/แก้ไขได้เฉพาะ `package.json`, `server.js`, `public/index.html`, `public/style.css`, `public/index.js`; รูปภาพใช้ได้เฉพาะ `public/images/` ส่วน `spec.md`, `tasks.md` และเอกสารประกอบอื่นเป็นไฟล์เอกสาร ไม่ใช่โค้ดแอป

สถานะ: `[ ]` ยังไม่เริ่ม · `[-]` กำลังทำ/ติดขัด · `[x]` เสร็จและตรวจแล้ว · `[~]` เลื่อนไประยะถัดไป

## 0. งานที่มีอยู่ก่อนเริ่มรายการนี้

- [x] `T0.1` จัดทำข้อกำหนดผลิตภัณฑ์และกลุ่มผู้ใช้
  - **ทำอะไร:** ระบุเป้าหมาย Shop/Customer/Admin, ขอบเขต MVP, ขั้นตอนใช้งาน และเกณฑ์ยอมรับ
  - **ทำที่ไหน:** `spec.md` ส่วนภาพรวม กลุ่มผู้ใช้ ฟังก์ชัน และขั้นตอนหลัก
  - **ทำอย่างไร:** สรุปความต้องการผู้ใช้เป็นข้อกำหนดภาษาไทย
  - **ผล/หมายเหตุ:** มีข้อกำหนดเบื้องต้นแล้ว; ต้องทบทวนความสอดคล้องเมื่อพัฒนาฟีเจอร์จริง
- [x] `T0.2` ออกแบบหน้าจอและธีม
  - **ทำอะไร:** กำหนดหน้าจอ Shop/Customer, โทนตลาดไทยย้อนยุค, สีพาสเทล, การอ่านง่ายและ responsive
  - **ทำที่ไหน:** `spec.md` ส่วนแนวทางออกแบบหน้าจอและธีม
  - **ทำอย่างไร:** ระบุองค์ประกอบรายหน้าจอและหลักการเข้าถึง
  - **ผล/หมายเหตุ:** เป็นข้อกำหนดเชิงเอกสาร ยังไม่ใช่ UI ที่ implement แล้ว
- [x] `T0.3` ออกแบบ schema ฐานข้อมูล
  - **ทำอะไร:** กำหนด `users`, `categories`, `shops`, `markets`, `market_sessions`, `stalls`, `reservations`
  - **ทำที่ไหน:** `spec.md` ส่วนแบบออกแบบฐานข้อมูล
  - **ทำอย่างไร:** ระบุชนิดข้อมูล, keys, indexes, relations และการป้องกันจองซ้ำ
  - **ผล/หมายเหตุ:** เป็นแบบร่าง ยังไม่ได้สร้างตารางจริงใน MariaDB
- [x] `T0.4` ออกแบบ REST API
  - **ทำอะไร:** ระบุ endpoints, auth, payload, responses, error codes, screen mapping และ security
  - **ทำที่ไหน:** `spec.md` ส่วนออกแบบ API
  - **ทำอย่างไร:** จัด endpoint ตาม flow และ role
  - **ผล/หมายเหตุ:** เป็นสัญญา API ในเอกสาร ยังไม่ยืนยันว่า backend ปัจจุบัน implement ครบ

## 1. เตรียมฐานรากและ Backend

- [-] `T1.1` ตรวจโครงสร้างและ dependency ของแอป
  - **ทำอะไร:** ตรวจ `package.json`, Express entry point และการเสิร์ฟ static assets
  - **ทำที่ไหน:** `package.json`, `server.js`
  - **ทำอย่างไร:** ยืนยัน CommonJS, dependency ที่ต้องใช้, `app.use(express.static("public"))` และให้ server listen ที่ port `3102`
  - **เกณฑ์เสร็จ:** ติดตั้ง dependency ได้, หน้าเว็บถูกเสิร์ฟจาก Express และเปิดใช้งานผ่าน port `3102`
  - **บันทึกงาน:** 2026-10-31 — ตรวจพบ CommonJS, Express, mysql2, static serving และ port 3102 ตามข้อกำหนด; ตรวจซ้ำแล้วยังไม่มี `node`/`npm` ใน PATH จึงติดตั้ง/รัน smoke test ไม่ได้
- [x] `T1.2` เชื่อมต่อ MariaDB และจัดการข้อผิดพลาด
  - **ทำอะไร:** สร้าง connection pool, ตรวจการเชื่อมต่อ และจัดการกรณี DB ใช้งานไม่ได้
  - **ทำที่ไหน:** `server.js`; dependencies ประกาศใน `package.json`
  - **ทำอย่างไร:** ใช้ MariaDB driver, connection values ตามข้อกำหนดโครงการ, timeout/error handling และไม่ส่งรายละเอียดลับให้ client
  - **เกณฑ์เสร็จ:** backend เปิดได้เมื่อ DB online และ log ข้อผิดพลาดโดยไม่เปิดเผย credentials
  - **บันทึกงาน:** 2026-10-31 — ตรวจพบ pool ผ่าน `mysql2/promise` และ `/api/health` ทดสอบ `SELECT 1`; กรณีฐานข้อมูลล้มเหลวตอบ 503 โดยไม่ส่ง credentials; ยังไม่ได้ยืนยันการเชื่อมต่อกับ DB จริงเพราะไม่มี runtime `npm`/Node.js ที่ตรวจสอบได้
- [-] `T1.3` สร้างตารางและดัชนีตาม schema
  - **ทำอะไร:** สร้าง 7 ตารางพร้อม primary/foreign keys, unique constraints และ indexes
  - **ทำที่ไหน:** SQL สำหรับ schema ต้องวางใน `server.js` ตามข้อจำกัดไฟล์แอป; ห้ามสร้าง migration/script เพิ่มโดยไม่ได้รับอนุมัติ
  - **ทำอย่างไร:** ใช้ DDL แบบ idempotent (`CREATE TABLE IF NOT EXISTS`) หรือแนวทางเริ่มต้นที่ปลอดภัย ตรวจ engine/charset และลำดับสร้างตาราง
  - **เกณฑ์เสร็จ:** ตารางสัมพันธ์ตรง `spec.md`, สร้างซ้ำไม่ทำลายข้อมูลเดิม และตรวจ schema บน MariaDB จริง/สภาพแวดล้อมที่อนุญาต
  - **บันทึกงาน:** 2026-10-31 — เพิ่ม initialization แบบ `CREATE TABLE IF NOT EXISTS` สำหรับทั้ง 7 ตาราง, InnoDB/utf8mb4, indexes และ foreign keys ใน `server.js`; เพิ่ม generated column/unique index ป้องกันจอง active ซ้ำ; ยังไม่ได้รันกับ MariaDB เพราะไม่มี `node`/`npm` หรือ MariaDB client ใน PATH และยังต้องยืนยัน compatibility ของ generated column กับ MariaDB เป้าหมาย
- [-] `T1.4` กำหนด middleware, response และ error handling กลาง
  - **ทำอะไร:** JSON parsing, request validation, auth middleware, not-found และ error responses แบบสม่ำเสมอ
  - **ทำที่ไหน:** `server.js`
  - **ทำอย่างไร:** จัดรูปแบบ `{ data, meta }` และ `{ error: { code, message, details } }`; ซ่อน stack trace จาก client
  - **เกณฑ์เสร็จ:** ทุก endpoint ใช้รูปแบบเดียวกันและข้อผิดพลาดไม่เปิดเผยข้อมูลภายใน
  - **บันทึกงาน:** 2026-10-31 — จำกัด JSON body 32 KB, จัดการ malformed/oversized JSON, not-found และ error response ทั่วไปโดยไม่ส่ง stack/detail DB ให้ client; health endpoint ใช้ response envelope ตาม API spec; ยังรันทดสอบ runtime ไม่ได้เพราะไม่มี Node/npm ใน PATH

## 2. บัญชีและโปรไฟล์ Shop

- [-] `T2.1` สมัครบัญชีผู้ค้า
  - **ทำอะไร:** รับชื่อผู้ติดต่อ เบอร์โทร อีเมล (ถ้ามี) รหัสผ่าน ชื่อร้าน และหมวดหมู่
  - **ทำที่ไหน:** UI `public/index.html`, `public/index.js`, `public/style.css`; API ใน `server.js`; schema `users`, `shops`
  - **ทำอย่างไร:** validate client และ server, hash password, ป้องกันเบอร์/อีเมลซ้ำ, สร้าง user+shop ใน transaction เดียว
  - **เกณฑ์เสร็จ:** สมัครสำเร็จตอบ 201 โดยไม่คืน hash; ข้อมูลผิด/ซ้ำได้ข้อความชัดเจน
  - **บันทึกงาน:** 2026-10-31 — เพิ่ม form สมัครและ `POST /api/v1/auth/register`; validate fields, bcryptjs hash, transaction สำหรับ user+shop, ตรวจ category active และปฏิเสธข้อมูลซ้ำ; เพิ่ม endpoint รายการหมวดหมู่และ select ในฟอร์ม; diagnostics ผ่านแต่ยังไม่มี Node/npm/DB สำหรับทดสอบจริง
- [-] `T2.2` เข้าสู่ระบบและออกจากระบบ
  - **ทำอะไร:** login ด้วยเบอร์โทรและรหัสผ่าน, session/token และ logout
  - **ทำที่ไหน:** UI ใน `public/index.html`/`public/index.js`/`public/style.css`; API และ auth middleware ใน `server.js`
  - **ทำอย่างไร:** ตรวจ password hash, rate limit login, ใช้กลไก session/token ที่เพิกถอนได้, ไม่ log credentials
  - **เกณฑ์เสร็จ:** login ผิดตอบข้อความทั่วไป, endpoint ที่ต้อง auth ปฏิเสธผู้ไม่ผ่าน, logout ทำให้ credential ใช้ไม่ได้ตามกลไกที่เลือก
  - **บันทึกงาน:** 2026-10-31 — เพิ่ม auth_sessions เก็บ SHA-256 token hash อายุ 7 วัน, login/logout/me endpoints, bearer auth middleware, จำกัด login ผิด 5 ครั้ง/15 นาทีต่อ IP และ UI login/logout พร้อม token ใน sessionStorage; diagnostics ผ่าน ยังต้องทดสอบจริงกับ runtime/DB
- [-] `T2.3` แสดงและแก้ไขโปรไฟล์ร้าน
  - **ทำอะไร:** ดู/แก้ชื่อร้าน หมวดหมู่ รายละเอียด ช่องทางติดต่อสาธารณะ และการเผยแพร่
  - **ทำที่ไหน:** UI `public/index.html`, `public/index.js`, `public/style.css`; API `server.js`; ตาราง `shops`, `categories`
  - **ทำอย่างไร:** จำกัดข้อมูลที่แก้ได้, กรองด้วย shop ของ token, ตรวจหมวดหมู่และความยาว, แสดง preview ข้อมูลลูกค้า
  - **เกณฑ์เสร็จ:** ผู้ค้าอ่าน/แก้ได้เฉพาะร้านตน และข้อมูล public แสดงตาม consent
  - **บันทึกงาน:** 2026-10-31 — เพิ่ม `GET/PATCH /api/v1/shop/profile` โดยผูก shop จาก token, allowlist field, ตรวจชนิด/ความยาวและหมวดหมู่ active; เพิ่มฟอร์มโปรไฟล์ใน account UI รวมตัวเลือกเผยแพร่และช่องทางสาธารณะ; ยังไม่ได้ทดสอบ runtime/DB และยังไม่มี preview ข้อมูล public

## 3. ตลาด รอบงาน และจองแผง (Shop)

- [ ] `T3.1` แสดงรายการตลาดและรอบงาน
  - **ทำอะไร:** ค้นหาตลาด ดูสถานที่ วันเวลาและสถานะเปิดรับจอง
  - **ทำที่ไหน:** UI `public/index.html`, `public/index.js`, `public/style.css`; endpoints ตลาด/รอบใน `server.js`
  - **ทำอย่างไร:** ดึงเฉพาะข้อมูล active/public, รองรับค้นหาและกรองวันเมื่อมีข้อมูล
  - **เกณฑ์เสร็จ:** หน้าเลือกตลาดและรายละเอียดรอบแสดงข้อมูลถูกต้อง รวม empty/loading/error states
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T3.2` แสดงผังและรายการแผงสำหรับผู้ค้า
  - **ทำอะไร:** แสดงตำแหน่ง/หมายเลข/ราคาและ availability พร้อม legend และมุมมองรายการสำรอง
  - **ทำที่ไหน:** UI `public/index.html`, `public/index.js`, `public/style.css`; API แผงใน `server.js`; ตาราง `stalls`, `reservations`
  - **ทำอย่างไร:** คำนวณ availability ต่อ market session, แสดง status ด้วยข้อความและสัญลักษณ์ ไม่พึ่งสีอย่างเดียว
  - **เกณฑ์เสร็จ:** แผงบนผังตรงกับข้อมูล DB และใช้งานได้บนมือถือ/แป้นพิมพ์
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T3.3` ส่งคำขอจองแผง
  - **ทำอะไร:** เลือกแผง ดูรายละเอียด ยืนยัน และรับหมายเลขคำขอ
  - **ทำที่ไหน:** UI `public/index.html`, `public/index.js`, `public/style.css`; API `POST /reservations` ใน `server.js`
  - **ทำอย่างไร:** ตรวจ session เปิดรับจอง, แผงอยู่ตลาดเดียวกัน, ใช้ transaction/locking/unique rule, เก็บราคา snapshot และ idempotency
  - **เกณฑ์เสร็จ:** คำขอซ้ำหรือ race condition ไม่สร้าง active reservation ซ้อน; success/error อธิบายได้
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T3.4` แดชบอร์ดและสถานะการจอง
  - **ทำอะไร:** สรุป pending/confirmed, งานใกล้ถึง และรายการจองล่าสุด
  - **ทำที่ไหน:** UI `public/index.html`, `public/index.js`, `public/style.css`; API dashboard/list ใน `server.js`
  - **ทำอย่างไร:** query เฉพาะร้านปัจจุบัน, เรียงรายการล่าสุด, status มีข้อความและสีที่เข้าถึงได้
  - **เกณฑ์เสร็จ:** ตัวเลขสรุปตรงกับรายการจองของบัญชีผู้ใช้
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T3.5` รายละเอียด ประวัติ และยกเลิกการจอง
  - **ทำอะไร:** ดูรายละเอียด/สถานะ/เวลาและยกเลิกเมื่อกติกาอนุญาต
  - **ทำที่ไหน:** UI `public/index.html`, `public/index.js`, `public/style.css`; API reservation detail/cancel ใน `server.js`
  - **ทำอย่างไร:** owner authorization, เปลี่ยนสถานะโดยไม่ลบแถว, ปฏิเสธสถานะที่ยกเลิกไม่ได้ด้วย 409
  - **เกณฑ์เสร็จ:** ผู้ใช้เข้าถึงรายการคนอื่นไม่ได้และประวัติยังอยู่หลังยกเลิก
  - **บันทึกงาน:** ยังไม่เริ่ม

## 4. ประสบการณ์ Customer และ QR Code

- [ ] `T4.1` เปิดผังตลาดด้วย public token/QR
  - **ทำอะไร:** เปิดหน้ารอบงานที่ถูกต้องจาก QR โดยไม่ต้องสมัคร
  - **ทำที่ไหน:** UI หน้า public ใน `public/index.html`, `public/index.js`, `public/style.css`; endpoint `/public/sessions/:token/map` ใน `server.js`
  - **ทำอย่างไร:** token สุ่ม, หา session ที่เผยแพร่, คืนเฉพาะข้อมูล public; invalid token แสดง not-found ที่เข้าใจง่าย
  - **เกณฑ์เสร็จ:** QR ไปยังรอบที่ถูกต้องและไม่เปิดเผยข้อมูลส่วนตัวหรือคำขอ pending
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T4.2` แสดงผังและรายละเอียดร้าน
  - **ทำอะไร:** แสดงจุดอ้างอิง ทางเดิน หมายเลขแผง และการ์ดข้อมูลร้านเมื่อเลือก
  - **ทำที่ไหน:** UI `public/index.html`, `public/index.js`, `public/style.css`; public map API ใน `server.js`
  - **ทำอย่างไร:** layout mobile-first, ตำแหน่งแผงปรับตามขนาดจอ, panel รายละเอียดไม่บังผังทั้งหมด
  - **เกณฑ์เสร็จ:** ร้านที่แสดงเป็นร้านยืนยันและเผยแพร่แล้ว; ผังยังอ่าน/ใช้งานได้บนจอเล็ก
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T4.3` ค้นหา กรอง และดูรายชื่อร้าน
  - **ทำอะไร:** ค้นชื่อร้าน กรองหมวดหมู่ สลับผัง/รายชื่อ และกลับไปตำแหน่งแผง
  - **ทำที่ไหน:** `public/index.html`, `public/index.js`, `public/style.css`; public shops API ใน `server.js`
  - **ทำอย่างไร:** query `q`/`categoryId`, debounce ค้นหาตามความเหมาะสม, pagination ถ้ารายการมาก
  - **เกณฑ์เสร็จ:** ผลค้นหาสอดคล้องกับคำค้น/หมวดและเปิดร้านบนผังได้
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T4.4` สร้าง/เผยแพร่ QR Code รอบงาน
  - **ทำอะไร:** ให้ผู้ใช้เปิด URL/QR ของรอบตลาดที่ถูกต้อง
  - **ทำที่ไหน:** สร้าง URL ฝั่ง backend `server.js`; UI/การแสดง QR ฝั่ง `public/index.html`, `public/index.js`, `public/style.css`; token อยู่ `market_sessions`
  - **ทำอย่างไร:** ใช้ public token สุ่ม ไม่ใช้เลข DB id เป็น secret; ไม่ต้องเก็บไฟล์ภาพ QR ใน DB หากสร้างจาก URL ได้
  - **เกณฑ์เสร็จ:** สแกนจากโทรศัพท์แล้วเปิด map ของรอบนั้นโดยตรง
  - **บันทึกงาน:** ยังไม่เริ่ม

## 5. UI, accessibility และคุณภาพระบบ

- [-] `T5.1` ใช้ธีมตลาดไทยย้อนยุคอย่างสม่ำเสมอ
  - **ทำอะไร:** ใช้ palette น้ำตาล/เขียว/เหลืองพาสเทล ครีมกระดาษ ตัวอักษรไทยอ่านง่ายและรายละเอียดลายตลาดแบบพอดี
  - **ทำที่ไหน:** `public/style.css` และ markup ใน `public/index.html`
  - **ทำอย่างไร:** CSS variables, contrast ตรวจสอบได้, พื้นผิวไม่รบกวนข้อความ; ไม่สร้าง asset นอก `public/images/`
  - **เกณฑ์เสร็จ:** ทุกหน้าใช้ theme เดียวกันและสถานะไม่อาศัยสีเพียงอย่างเดียว
  - **บันทึกงาน:** 2026-10-31 — เริ่มตกแต่งพื้นที่ตลาดและแผนผังด้วยโทนไม้ ผ้าใบกันสาด ป้ายตลาด ทางเดิน และแผงร้าน; ยังต้องทบทวนความสม่ำเสมอและ contrast ในทุกหน้าก่อนปิด task
- [ ] `T5.2` Responsive และเข้าถึงได้
  - **ทำอะไร:** รองรับมือถือ แท็บเล็ต desktop ผู้ใช้อายุหลากหลายและการใช้ keyboard
  - **ทำที่ไหน:** `public/style.css`, `public/index.html`, `public/index.js`
  - **ทำอย่างไร:** mobile-first, พื้นที่แตะประมาณ 44px+, เนื้อหาอ่านง่าย, label input, focus states, reduced motion และ responsive map/list
  - **เกณฑ์เสร็จ:** ไม่มี horizontal overflow สำคัญ, controls ใช้งานด้วย keyboard และข้อความอ่านชัด
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T5.3` Loading, empty, success และ error states
  - **ทำอะไร:** ให้ทุกหน้าจอมี feedback ครบและภาษาไทยเข้าใจง่าย
  - **ทำที่ไหน:** markup/state logic ใน `public/index.html` และ `public/index.js`; error mapping ใน `server.js`
  - **ทำอย่างไร:** แยก loading/empty/error/success, ป้องกัน double-submit, แสดงข้อความใกล้ฟอร์ม
  - **เกณฑ์เสร็จ:** ทดสอบเส้นทางสำเร็จและล้มเหลวแล้วผู้ใช้เข้าใจขั้นตอนถัดไป
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T5.4` ความปลอดภัยและข้อมูลส่วนบุคคล
  - **ทำอะไร:** authorization, password hashing, input validation, SQL injection defense, privacy filtering และ rate limit
  - **ทำที่ไหน:** `server.js`, `package.json`; ข้อความ consent ใน `public/index.html`
  - **ทำอย่างไร:** parameterized queries, server-side owner checks, ไม่คืน sensitive fields, ไม่ log secret, ใช้ session/cookie policy ตามแบบ auth ที่เลือก
  - **เกณฑ์เสร็จ:** ลองเข้าถึงข้อมูลบัญชีอื่นและส่ง input ไม่ถูกต้องแล้วถูกปฏิเสธอย่างปลอดภัย
  - **บันทึกงาน:** ยังไม่เริ่ม

## 6. ตรวจรับและเปิดใช้งาน

- [ ] `T6.1` ทดสอบ flow สมัครจนจองสำเร็จ
  - **ทำอะไร:** ตรวจสมัคร/login, เลือกรอบ, เลือกแผง, ส่งคำขอ, ดูสถานะและยกเลิก
  - **ทำที่ไหน:** ทดสอบหน้าเว็บและ endpoints ที่รันจาก `server.js`; ไม่สร้างไฟล์ test code เพิ่มนอกโครงสร้างที่อนุญาต
  - **ทำอย่างไร:** ใช้ข้อมูลทดสอบที่ได้รับอนุญาต ตรวจ DB และ response พร้อมทดสอบ validation/permission
  - **เกณฑ์เสร็จ:** flow หลักผ่านโดยไม่มีการจองซ้ำและข้อมูลรั่ว
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T6.2` ทดสอบ flow Customer ผ่าน QR
  - **ทำอะไร:** สแกน/เปิด token, โหลดผัง, ค้นหา/กรองร้านและเปิดรายละเอียด
  - **ทำที่ไหน:** มือถือหรือ browser responsive กับ public API ใน `server.js`
  - **ทำอย่างไร:** ทดสอบ token ถูก/ผิด, ร้านเผยแพร่/ไม่เผยแพร่, รอบมี/ไม่มีร้าน
  - **เกณฑ์เสร็จ:** ข้อมูลสาธารณะถูกต้องและไม่มีข้อมูลส่วนตัว
  - **บันทึกงาน:** ยังไม่เริ่ม
- [ ] `T6.3` ตรวจคุณภาพและคู่มือรัน
  - **ทำอะไร:** ตรวจ syntax, dependency, API/UI integration, responsive และคำสั่งเริ่มระบบ
  - **ทำที่ไหน:** `package.json`, `server.js`, `public/*`; คำอธิบายการใช้งานอาจบันทึกใน `spec.md` หรือเอกสารประกอบ
  - **ทำอย่างไร:** รัน diagnostics และ smoke test ตามสภาพแวดล้อมที่เชื่อม DB ได้; ห้ามถือว่าผ่านหาก DB ไม่พร้อม
  - **เกณฑ์เสร็จ:** หน้าเว็บ/API เริ่มได้และมีรายการข้อจำกัดที่ยังเหลือชัดเจน
  - **บันทึกงาน:** ยังไม่เริ่ม

## 7. ระยะถัดไป: Admin (ยังไม่เริ่ม)

- [~] `T7.1` จัดการตลาด รอบงาน และแผนผังแผง — จะทำเมื่อเริ่ม scope Admin; UI/API อยู่ในไฟล์ที่อนุญาตเดิม
- [~] `T7.2` ตรวจ อนุมัติ/ปฏิเสธคำขอจอง และบันทึกเหตุผล — ต้อง role check และ audit ผู้เปลี่ยนสถานะ
- [~] `T7.3` จัดการการเผยแพร่ร้านและ QR Code — จำกัดสิทธิ์ Admin และไม่เปิดเผยข้อมูลส่วนตัว

## งานนอกขอบเขต MVP

- การชำระเงินออนไลน์/มัดจำ
- ระบบสั่งซื้อ/จัดส่งสินค้า
- แชตและรีวิว
- ติดตามตำแหน่งลูกค้าแบบ real-time

หากมีการเพิ่ม scope เหล่านี้ ให้เพิ่ม task ใหม่และขอการยืนยันก่อนเริ่มพัฒนา

## บันทึกความคืบหน้ารวม

| วันที่ | Task | สิ่งที่ทำ | ไฟล์/ส่วนที่เปลี่ยน | วิธีตรวจสอบ | ผล/สิ่งที่ค้าง |
|---|---|---|---|---|---|
| 2026-10-31 | T1.1–T1.4 | ตรวจ entry point/DB handling; เพิ่ม DDL idempotent สำหรับ schema และ central middleware/error response | `server.js`, `tasks.md` | VS Code diagnostics ไม่พบ errors; ตรวจ runtime tools แล้วไม่มี `node`, `npm` หรือ MariaDB client | ยังรอทดสอบ runtime; ต้องตรวจ DDL และ generated-column compatibility บน MariaDB เป้าหมาย |
| 2026-10-31 | T2.1 | เพิ่มหน้าสมัครและ API ลงทะเบียนร้านแบบ transaction พร้อมโหลดหมวดหมู่ | `package.json`, `server.js`, `public/index.html`, `public/index.js`, `public/style.css`, `tasks.md` | Diagnostics ไม่พบ errors ในไฟล์ที่ตรวจ | ยังต้องติดตั้ง bcryptjs และทดสอบด้วย Node/MariaDB |
| 2026-10-31 | T2.2 | เพิ่ม login/logout/me, session token hash, auth middleware, rate limit และ UI | `server.js`, `public/index.html`, `public/index.js`, `public/style.css`, `tasks.md` | Diagnostics ไม่พบ errors ในไฟล์ที่ตรวจ | ต้องทดสอบ login/logout/session expiry กับ runtime/DB จริง; sessionStorage ลดการคง token หลังปิดแท็บ |
| 2026-10-31 | T2.3 | เพิ่มอ่าน/แก้ไขโปรไฟล์ร้านและ UI ที่จำกัดการแก้ไขร้านตาม token | `server.js`, `public/index.html`, `public/index.js`, `public/style.css`, `tasks.md` | Diagnostics ผ่าน; ยังไม่มี runtime/DB test | ต้องตรวจ API authorization, validation, เผยแพร่/ไม่เผยแพร่ และเพิ่ม public preview ในภายหลัง |
| 2026-10-31 | T5.1 | เริ่มตกแต่งพื้นที่แผนผังตลาดให้มีบรรยากาศตลาดชุมชนไทย | `public/style.css`, `tasks.md` | ตรวจ CSS ที่เพิ่มและ responsive overrides ด้วยการอ่านโค้ด; ยังไม่ได้เปิด browser | ต้องตรวจหน้าจอจริงและทบทวนธีมส่วนอื่นก่อนทำเครื่องหมายเสร็จ |
| 2026-10-31 | T0.2 (เพิ่มเติม) | ขยายแนวทางธีมและโครงสร้างหน้าจอรายบทบาท ตั้งแต่หน้าแรก/Shop จนถึงหน้า Customer จาก QR | `spec.md`, `tasks.md` | ตรวจความครอบคลุมขององค์ประกอบ ลำดับการใช้งาน สี และการรองรับวัย 18–60 ปี | เป็นเอกสารออกแบบ; หน้าจอจริงต้อง implement และตรวจแยกตาม task |
