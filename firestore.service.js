import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "./firebase.js";

function fromSnapshot(docSnap) {
  return {
    id: docSnap.id,
    ...docSnap.data()
  };
}

function withAudit(data, isNew = false) {
  return {
    ...data,
    updatedAt: serverTimestamp(),
    ...(isNew ? { createdAt: serverTimestamp() } : {})
  };
}

export function watchSongs(callback, onError) {
  const songsQuery = query(collection(db, "songs"), orderBy("order", "asc"));
  return onSnapshot(
    songsQuery,
    (snapshot) => callback(snapshot.docs.map(fromSnapshot).filter((song) => song.active !== false)),
    onError
  );
}

export function watchBands(callback, onError) {
  const bandsQuery = query(collection(db, "bands"), orderBy("order", "asc"));
  return onSnapshot(
    bandsQuery,
    (snapshot) => callback(snapshot.docs.map(fromSnapshot).filter((band) => band.active !== false)),
    onError
  );
}

export function watchMusicians(callback, onError) {
  const musiciansQuery = query(collection(db, "musicians"), orderBy("name", "asc"));
  return onSnapshot(
    musiciansQuery,
    (snapshot) => callback(snapshot.docs.map(fromSnapshot).filter((musician) => musician.active !== false)),
    onError
  );
}

export function watchSongRequirements(songId, callback, onError) {
  const requirementsQuery = query(collection(db, "songs", songId, "requirements"), orderBy("order", "asc"));
  return onSnapshot(
    requirementsQuery,
    (snapshot) => callback(snapshot.docs.map(fromSnapshot)),
    onError
  );
}

export function watchSongAssignments(songId, callback, onError) {
  const assignmentsQuery = query(collection(db, "songs", songId, "assignments"), orderBy("musicianName", "asc"));
  return onSnapshot(
    assignmentsQuery,
    (snapshot) => callback(snapshot.docs.map(fromSnapshot)),
    onError
  );
}

export async function loadSongsOnce() {
  const snapshot = await getDocs(query(collection(db, "songs"), orderBy("order", "asc")));
  return snapshot.docs.map(fromSnapshot).filter((song) => song.active !== false);
}

export function createBand(data) {
  return addDoc(collection(db, "bands"), withAudit({ ...data, active: true }, true));
}

export function updateBand(bandId, data) {
  return updateDoc(doc(db, "bands", bandId), withAudit(data));
}

export function deleteBand(bandId) {
  return updateDoc(doc(db, "bands", bandId), withAudit({ active: false }));
}

export function createSong(data) {
  return addDoc(collection(db, "songs"), withAudit({ ...data, active: true }, true));
}

export function updateSong(songId, data) {
  return updateDoc(doc(db, "songs", songId), withAudit(data));
}

export function deleteSong(songId) {
  return updateDoc(doc(db, "songs", songId), withAudit({ active: false }));
}

export function createMusician(data) {
  return addDoc(collection(db, "musicians"), withAudit({ ...data, active: true }, true));
}

export function updateMusician(musicianId, data) {
  return updateDoc(doc(db, "musicians", musicianId), withAudit(data));
}

export function deleteMusician(musicianId) {
  return updateDoc(doc(db, "musicians", musicianId), withAudit({ active: false }));
}

export function createRequirement(songId, data) {
  return addDoc(collection(db, "songs", songId, "requirements"), withAudit(data, true));
}

export function updateRequirement(songId, requirementId, data) {
  return updateDoc(doc(db, "songs", songId, "requirements", requirementId), withAudit(data));
}

export function deleteRequirement(songId, requirementId) {
  return deleteDoc(doc(db, "songs", songId, "requirements", requirementId));
}

export function createAssignment(songId, data) {
  return addDoc(collection(db, "songs", songId, "assignments"), withAudit(data, true));
}

export function updateAssignment(songId, assignmentId, data) {
  return updateDoc(doc(db, "songs", songId, "assignments", assignmentId), withAudit(data));
}

export function deleteAssignment(songId, assignmentId) {
  return deleteDoc(doc(db, "songs", songId, "assignments", assignmentId));
}
