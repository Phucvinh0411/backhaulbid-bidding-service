# ⚡ BackHaulBid Bidding Service

> **Dịch Vụ Đấu Giá Ngược Thời Gian Thực (NestJS + MongoDB + WebSockets + RabbitMQ)**
>
> BackHaulBid Bidding Service là thành phần chịu tải chính liên quan đến hoạt động thời gian thực (real-time) của hệ thống. Dịch vụ đảm nhận khởi tạo phiên đấu giá ngược, nhận bước giá mới từ tài xế qua WebSocket, lưu vết lịch sử đấu giá, kiểm tra thời gian hết hạn và phát hành sự kiện (Events) sang các dịch vụ khác qua RabbitMQ.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

*   **Framework**: ![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
*   **Database**: ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white) (sử dụng Mongoose)
*   **Real-time Protocol**: ![WebSockets](https://img.shields.io/badge/WebSockets-Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white)
*   **Message Broker**: ![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white) (AMQP)
*   **Caching & Rate Limiting**: ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)

---

## 📌 Yêu Cầu Môi Trường (Prerequisites)

*   [Node.js](https://nodejs.org/) v18.x hoặc v20.x trở lên.
*   [MongoDB](https://www.mongodb.com/) v6.0+ (hoặc chạy qua container Docker).
*   [RabbitMQ](https://www.rabbitmq.com/) v3.11+ (hoặc chạy qua container Docker).
*   [Redis](https://redis.io/) (Dùng cho cache phòng và khóa ghi trùng lắp).

---

## 🚀 Kích Hoạt Dự Án (Getting Started)

1.  **Clone repository và di chuyển vào thư mục:**
    ```bash
    git clone https://github.com/backhaulbid/backhaulbid-bidding-service.git
    cd backhaulbid-bidding-service
    ```

2.  **Cài đặt các gói phụ thuộc:**
    ```bash
    npm install
    ```

3.  **Cấu hình biến môi trường (`.env`):**
    Tạo file `.env` tại thư mục gốc:
    ```env
    PORT=3000
    MONGO_URI=mongodb://backhaulbid:backhaulbid_secret@localhost:27017/backhaulbid_bidding?authSource=admin
    REDIS_URL=redis://:backhaulbid_secret@localhost:6379
    RABBITMQ_URL=amqp://backhaulbid:backhaulbid_secret@localhost:5672
    ```

4.  **Khởi chạy chế độ phát triển (Development):**
    ```bash
    npm run start:dev
    ```
    *Dịch vụ sẽ được khởi chạy tại cổng **`3000`**. Sockets Gateway lắng nghe kết nối tại `ws://localhost:3000`*

5.  **Biên dịch dự án (Build Production):**
    ```bash
    npm run build
    npm run start:prod
    ```

---

## 📂 Cơ Cấu Thư Mục (Project Structure)

Dự án được cấu trúc theo kiến trúc Module chuẩn của **NestJS**, nhóm các Controller, Service, Gateway và Model liên quan vào từng module chức năng:

```text
backhaulbid-bidding-service/
├── src/
│   ├── config/              # Cấu hình kết nối bên ngoài (database, rabbitmq, redis)
│   ├── common/              # Lọc ngoại lệ (filters), interceptors, decorators dùng chung
│   ├── bidding/             # Module quản lý logic đấu giá ngược thời gian thực
│   │   ├── bidding.module.ts
│   │   ├── bidding.controller.ts  # REST APIs quản trị phiên đấu giá
│   │   ├── bidding.service.ts     # Logic xác thực bước giá, tính giờ đấu giá
│   │   ├── bidding.gateway.ts     # Xử lý các kết nối Websocket (Socket.io)
│   │   └── schemas/               # Mongoose schemas (BidSession, BidHistory)
│   ├── messaging/           # Module gửi/nhận tin nhắn không đồng bộ (RabbitMQ client)
│   │   ├── messaging.module.ts
│   │   └── rabbitmq.producer.ts   # Gửi sự kiện khi đấu giá xong (BidWonEvent)
│   ├── app.module.ts        # Module gốc kết nối tất cả các sub-modules
│   └── main.ts              # Entrypoint khởi tạo NestFactory & lắng nghe cổng 3000
├── test/                    # Các file unit/integration tests
├── package.json             # Khai báo script và dependencies
├── tsconfig.json            # Cấu hình compile TypeScript
└── README.md
```

---

## 🐳 Triển Khai Với Docker

Build Docker Image:
```bash
docker build -t backhaulbid-bidding-service:latest .
```

Khởi chạy container:
```bash
docker run -d \
  -p 3000:3000 \
  --name bidding-service \
  --network backhaulbid-network \
  -e MONGO_URI=mongodb://backhaulbid:backhaulbid_secret@mongodb:27017/backhaulbid_bidding \
  -e REDIS_URL=redis://:backhaulbid_secret@redis:6379 \
  -e RABBITMQ_URL=amqp://backhaulbid:backhaulbid_secret@rabbitmq:5672 \
  backhaulbid-bidding-service:latest
```
