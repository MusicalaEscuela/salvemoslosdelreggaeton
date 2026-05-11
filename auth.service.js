import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { auth, db, onAuthStateChanged, provider, signInWithPopup, signOut } from "./firebase.js";

const INITIAL_EDITORS = new Set([
  "alekcaballeromusic@gmail.com",
  "catalina.medina.leal@gmail.com"
]);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isInitialEditor(email) {
  return INITIAL_EDITORS.has(normalizeEmail(email));
}

export async function getUserRole(user) {
  const email = normalizeEmail(user?.email);

  if (!email) return "visitante";
  if (isInitialEditor(email)) return "editor";

  const roleSnap = await getDoc(doc(db, "roles", email));
  if (roleSnap.exists() && roleSnap.data()?.canEdit === true) return "editor";

  return "estudiante";
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export function logoutUser() {
  return signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, role: "visitante", canEdit: false });
      return;
    }

    try {
      const role = await getUserRole(user);
      callback({ user, role, canEdit: role === "editor" });
    } catch (error) {
      console.error("No se pudo calcular el rol del usuario.", error);
      callback({ user, role: "estudiante", canEdit: false, error });
    }
  });
}
