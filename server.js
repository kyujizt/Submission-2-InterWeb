const express = require("express");
const cors = require("cors");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const port = process.env.PORT || 3021;

// VAPID Keys (ganti dengan milikmu)
const vapidPublicKey = "BMHaYSNC6KnWxHDEFJW3t991y3bMlPKzYGyNRrAmuTB-f-vl7i3tbGQmQGY2x3O5l1_hZ5tfLQflqZ-lYl3Azeo";
const vapidPrivateKey = "v3qJbImav0RePwHU4npGtTbh_VW289ZwAzyHrxR0Xq0";

webpush.setVapidDetails("mailto:azizok1@gmail.com", vapidPublicKey, vapidPrivateKey);

// Logging setiap request masuk
app.use((req, res, next) => {
  console.log(`🔄 ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory storage untuk semua subscription
let subscriptions = [];

// Endpoint untuk mengambil VAPID public key
app.get("/notifications/vapid-key", (req, res) => {
  res.json({ key: vapidPublicKey });
});

// Subscribe: terima dan simpan subscription
app.post("/notifications/subscribe", (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "❌ Subscription tidak valid!" });
  }

  const exists = subscriptions.find((sub) => sub.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    console.log("✅ Subscription baru ditambahkan:", subscription.endpoint);
  } else {
    console.log("ℹ️ Subscription sudah terdaftar:", subscription.endpoint);
  }

  // Kirim notifikasi contoh
  const samplePayload = JSON.stringify({
    title: "Halo dari Server!",
    options: {
      body: "Push notification berhasil diterima 💥",
      icon: "/favicon.png",
      badge: "/favicon.png",
    },
  });

  webpush
    .sendNotification(subscription, samplePayload)
    .then(() => {
      console.log("📩 Notifikasi contoh terkirim ke", subscription.endpoint);
      res.status(201).json({ message: "Subscribed & sample notification sent." });
    })
    .catch((err) => {
      console.error("❌ Gagal mengirim sample notification:", err);
      res.sendStatus(500);
    });
});

// Unsubscribe: hapus subscription dari array
app.post("/notifications/unsubscribe", (req, res) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: "❌ Endpoint tidak ditemukan dalam request!" });
  }

  const idx = subscriptions.findIndex((sub) => sub.endpoint === endpoint);
  if (idx !== -1) {
    subscriptions.splice(idx, 1);
    console.log("🚫 Subscription dihapus:", endpoint);
    return res.json({ success: true, message: "Unsubscribed successfully." });
  }

  res.status(404).json({ error: "❌ Subscription tidak ditemukan." });
});

// Broadcast dynamic notification (dipanggil setelah story upload)
// Broadcast dynamic notification
app.post("/notifications", (req, res) => {
  try {
    const { title, body, location } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "❌ Data push notification tidak lengkap! Pastikan title dan body ada." });
    }

    console.log("📩 Notifikasi akan dikirim dengan deskripsi:", body);

    const payload = JSON.stringify({
      title,
      options: {
        body,
        icon: "/favicon.png",
        badge: "/favicon.png",
        data: location || {},
      },
    });

    const failedSubscriptions = [];

    const sendPromises = subscriptions.map((sub, i) =>
      webpush.sendNotification(sub, payload).catch((err) => {
        console.error(`❌ Gagal kirim ke subscriber #${i + 1}:`, err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          failedSubscriptions.push(sub.endpoint);
          console.log(`🗑️ Subscription #${i + 1} (${sub.endpoint}) dihapus karena sudah tidak valid.`);
        }
      })
    );

    Promise.all(sendPromises).then(() => {
      subscriptions = [...subscriptions.filter((sub) => !failedSubscriptions.includes(sub.endpoint))];

      console.log("📤 Broadcast notification sent to all valid subscribers.");
      res.status(201).json({ message: "Broadcast notification sent.", failedSubscriptions });
    });
  } catch (error) {
    console.error("❌ Error saat memproses push notification:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Menyajikan file statis dari folder 'public'
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".json")) {
        res.set("Content-Type", "application/json");
      }
    },
  })
);

app.listen(port, () => {
  console.log(`🚀 Server berjalan di http://localhost:${port}`);
});
