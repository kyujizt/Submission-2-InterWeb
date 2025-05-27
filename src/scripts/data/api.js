import CONFIG from "../config";
import { simulatePushNotification, isSubscribedToPushNotification } from "../utils/push-helper.js";

const ENDPOINTS = {
  STORIES: `${CONFIG.BASE_URL}/stories`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  REGISTER: `${CONFIG.BASE_URL}/register`,
  BROADCAST: `${CONFIG.BASE_URL}/push-notif/broadcast`
};

function getAuthToken() {
  const token = localStorage.getItem("authToken");
  if (!token) throw new Error("Token otentikasi tidak ditemukan. Silakan login terlebih dahulu.");
  return token;
}

function validateResponse(response) {
  if (!response.ok) {
    throw new Error(`Error: ${response.status} ${response.statusText}`);
  }
}

let controller = null;

export async function getData() {
  try {
    if (controller) controller.abort();
    controller = new AbortController();

    const token = getAuthToken();
    const response = await fetch(ENDPOINTS.STORIES, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    validateResponse(response);
    const result = await response.json();

    if (!Array.isArray(result.listStory)) {
      throw new Error("Data cerita tidak valid.");
    }

    return result.listStory.map((story) => ({
      id: story.id,
      title: story.name || "Tanpa Nama",
      description: story.description || "Tanpa Deskripsi",
      imageUrl: story.photoUrl?.startsWith("http") ? story.photoUrl : "/src/public/images/placeholder.jpg",
      createdAt: story.createdAt || null,
      location: {
        lat: typeof story.lat === "number" ? story.lat : null,
        lng: typeof story.lon === "number" ? story.lon : null,
      },
    }));
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Fetch cerita dibatalkan.");
      return [];
    }
    console.error("❌ Gagal mengambil data cerita:", error.message);
    return [];
  } finally {
    controller = null;
  }
}

export async function getDataById(id) {
  try {
    if (!id) throw new Error("ID tidak valid.");

    const token = getAuthToken();
    const response = await fetch(`${ENDPOINTS.STORIES}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    validateResponse(response);
    const result = await response.json();

    if (!result.story) {
      throw new Error("Detail cerita tidak ditemukan.");
    }

    return {
      id: result.story.id,
      title: result.story.name || "Tanpa Nama",
      description: result.story.description || "Tanpa Deskripsi",
      imageUrl: result.story.photoUrl?.startsWith("http") ? result.story.photoUrl : "/src/public/images/placeholder.jpg",
      createdAt: result.story.createdAt || null,
      location: {
        lat: typeof result.story.lat === "number" ? result.story.lat : null,
        lng: typeof result.story.lon === "number" ? result.story.lon : null,
      },
    };
  } catch (error) {
    console.error("❌ Error in getDataById:", error.message);
    throw error;
  }
}

export async function loginUser(email, password) {
  try {
    const response = await fetch(ENDPOINTS.LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    validateResponse(response);
    const result = await response.json();

    if (!result.loginResult?.token) {
      throw new Error("Login berhasil, tapi token tidak ditemukan.");
    }

    return result.loginResult.token;
  } catch (error) {
    console.error("❌ Login error:", error.message);
    throw error;
  }
}

export async function registerUser({ name, email, password }) {
  try {
    const response = await fetch(ENDPOINTS.REGISTER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    validateResponse(response);
    return await response.json();
  } catch (error) {
    console.error("❌ Register error:", error.message);
    throw error;
  }
}

export async function addStory({ description, imageFile, location }) {
  try {
    const token = getAuthToken();
    const formData = new FormData();

    formData.append("description", description);
    formData.append("photo", imageFile);
    if (location?.lat && location?.lng) {
      formData.append("lat", location.lat);
      formData.append("lon", location.lng);
    }

    const response = await fetch(ENDPOINTS.STORIES, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    validateResponse(response);
    
    // Check if user is subscribed before showing notification
    try {
      const isSubscribed = await isSubscribedToPushNotification();
      if (isSubscribed) {
        await simulatePushNotification(
          "Story Baru Telah Dibuat!",
          `Story baru telah dibuat dengan deskripsi: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`
        );
        console.log("✅ Notifikasi ditampilkan karena pengguna berlangganan");
      } else {
        console.log("ℹ️ Notifikasi tidak ditampilkan karena pengguna tidak berlangganan");
      }
    } catch (notifError) {
      console.warn("⚠️ Gagal menampilkan notifikasi:", notifError);
    }
    
    return await response.json();
  } catch (error) {
    console.error("❌ Gagal menambahkan cerita:", error.message);
    throw error;
  }
}

export async function sendPushNotification({ title, body, location, storyId, description }) {
  try {
    // Check if user is subscribed before sending notification
    const isSubscribed = await isSubscribedToPushNotification();
    if (!isSubscribed) {
      console.log("ℹ️ Push notification tidak dikirim karena pengguna tidak berlangganan");
      return { success: false, message: "User not subscribed" };
    }

    const storyUrl = `/story/${storyId}`;

    const payload = {
      title: title || "Story Baru Telah Dibuat!",
      body: body || `Story baru telah dibuat dengan deskripsi: ${description}`,
      options: {
        body: body || `Story baru telah dibuat dengan deskripsi: ${description}`,
        icon: "/favicon.png",
        badge: "/favicon.png",
        data: {
          url: storyUrl,
          location: location || {},
          storyId,
          description
        }
      }
    };

    console.log('📤 Mengirim push notification dengan payload:', payload);

    // Try to send to server first
    if (navigator.onLine) {
      try {
        const response = await fetch(ENDPOINTS.BROADCAST, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log("✅ Push notification berhasil dikirim ke server");
          return await response.json();
        } else {
          throw new Error(`Server error ${response.status}`);
        }
      } catch (serverError) {
        console.warn("⚠️ Gagal mengirim push notification ke server:", serverError.message);
        console.log("🔄 Mencoba simulasi notifikasi lokal...");
      }
    }

    // Fallback to local simulation if server fails or offline
    await simulatePushNotification(
      payload.title,
      payload.options.body,
      payload.options.data.url
    );
    
    console.log("✅ Push notification berhasil disimulasikan secara lokal");
    return { success: true, message: "Notification shown locally" };
  } catch (error) {
    console.error("❌ Gagal mengirim push notification:", error.message);
    throw error;
  }
}
