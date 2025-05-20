import { openDB } from "idb";

const dbPromise = openDB("storyAppDB", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("stories")) {
      db.createObjectStore("stories", { keyPath: "id" });
    }
  },
});

// 🔥 Simpan story ke IndexedDB dengan transaksi aman
export async function saveStory(story) {
  try {
    const db = await dbPromise;
    const tx = db.transaction("stories", "readwrite");
    await tx.store.put(story);
    await tx.done;
    console.log("✅ Story tersimpan di IndexedDB:", story);
  } catch (error) {
    console.error("❌ Error saat menyimpan story ke IndexedDB:", error);
  }
}

// 🔥 Ambil semua story dari IndexedDB dengan fallback data kosong
export async function getStories() {
  try {
    const db = await dbPromise;
    const tx = db.transaction("stories", "readonly");
    const stories = await tx.store.getAll();
    return stories.length ? stories : []; // 🔥 Pastikan tetap mengembalikan array kosong jika tidak ada data
  } catch (error) {
    console.error("❌ Error saat mengambil data dari IndexedDB:", error);
    return [];
  }
}

// 🔥 Hapus story berdasarkan ID dengan transaksi aman
export async function deleteStory(id) {
  try {
    const db = await dbPromise;
    const tx = db.transaction("stories", "readwrite");
    await tx.store.delete(id);
    await tx.done;
    console.log(`🚫 Story dengan ID ${id} dihapus dari IndexedDB.`);
  } catch (error) {
    console.error(`❌ Error saat menghapus story dengan ID ${id}:`, error);
  }
}
