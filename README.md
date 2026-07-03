# Boatman — Postman-like API Client

เว็บแอปทดสอบ API สไตล์ Postman สร้างด้วย **Next.js 15 + TypeScript + Prisma + PostgreSQL**
คำขอ HTTP จริงถูกยิงผ่าน **server-side proxy** (เลี่ยง CORS เหมือน Postman)

## ฟีเจอร์

**พื้นฐาน**
- ยิง HTTP ได้ทุก method (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) ผ่านหลังบ้าน
- **Query Params** ซิงก์สองทางกับช่อง URL อัตโนมัติ
- **Headers** เปิด/ปิดรายบรรทัดได้
- **Authorization**: No Auth / Bearer Token / Basic Auth / API Key (header หรือ query)
- **Body**: none / JSON / Text / XML / form-data / x-www-form-urlencoded + ปุ่ม Beautify
- **Collections** บันทึกคำขอเป็นกลุ่ม, **Environments** + ตัวแปร `{{variable}}`, **History**
- หลายแท็บ + แบ่งจอ request/response ปรับขนาดได้

**ระดับ Hardcore**
- **Response viewer เต็มรูปแบบ**: JSON tree collapsible, Pretty/Raw/Preview (render HTML ใน iframe), ค้นหาในผลลัพธ์, tab Cookies / Headers / Test Results / Console
- **Pre-request & Test scripts** พร้อม `pm.*` API (JavaScript sandbox):
  - `pm.environment/globals/variables.get/set`, `pm.request.headers.add`
  - `pm.test()`, `pm.expect().to.have.status/property/eql/include/...` (chai-lite)
  - `pm.response.json()/.code/.responseTime`, `console.log` → tab Console
- **Cookie Jar ฝั่งเซิร์ฟเวอร์**: จับ `Set-Cookie` อัตโนมัติ (รวมทุก redirect hop) แล้วส่ง `Cookie` กลับให้เอง จัดการผ่านหน้า Cookies
- **Code generator**: cURL, JS Fetch, Axios, Python requests, Node, Go, PHP
- **Import**: Postman Collection v2.1 (.json) + วาง cURL command
- **Export**: Collection → Postman v2.1 (.json)
- **Global variables** (นอกเหนือจาก environment)

## เริ่มใช้งาน

```bash
npm install
npm run db:push      # sync schema เข้า PostgreSQL (ทำครั้งแรกครั้งเดียว)
npm run dev          # เปิด http://localhost:3000
```

ตัวแปร `DATABASE_URL` อยู่ในไฟล์ `.env`

## โครงสร้าง

| ส่วน | ที่อยู่ |
|------|--------|
| Server proxy + cookie jar + manual redirect | `src/app/api/proxy/route.ts`, `src/lib/cookieJar.ts` |
| REST API (collections/requests/environments/history/cookies/globals) | `src/app/api/**/route.ts` |
| Prisma schema | `prisma/schema.prisma` |
| State (Zustand) | `src/store/useStore.ts` |
| pm.* script sandbox | `src/lib/scripts.ts` |
| Code generators | `src/lib/codegen.ts` |
| Postman/cURL import-export | `src/lib/postman.ts` |
| หน้าจอหลัก / components | `src/app/page.tsx`, `src/components/*` |

## Build

```bash
npm run build && npm start
```
