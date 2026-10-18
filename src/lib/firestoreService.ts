import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db, auth, OperationType, handleFirestoreError } from "./firebase";
import type { Employee, Project, Task, TimeEntry } from "./supabaseClient";

const EMPLOYEES_COL = "employees";
const PROJECTS_COL = "projects";
const TASKS_COL = "tasks";
const TIME_ENTRIES_COL = "time_entries";

export const firestoreService = {
  // --- EMPLOYEES ---
  async getEmployees(): Promise<Employee[]> {
    try {
      const colRef = collection(db, EMPLOYEES_COL);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, EMPLOYEES_COL);
      return [];
    }
  },

  async saveEmployee(emp: Employee): Promise<void> {
    try {
      const docRef = doc(db, EMPLOYEES_COL, emp.id);
      await setDoc(docRef, emp, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${EMPLOYEES_COL}/${emp.id}`);
      throw err;
    }
  },

  async deleteEmployee(id: string): Promise<void> {
    try {
      const docRef = doc(db, EMPLOYEES_COL, id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${EMPLOYEES_COL}/${id}`);
      throw err;
    }
  },

  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    try {
      const colRef = collection(db, PROJECTS_COL);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, PROJECTS_COL);
      return [];
    }
  },

  async saveProject(proj: Project): Promise<void> {
    try {
      const docRef = doc(db, PROJECTS_COL, proj.id);
      await setDoc(docRef, proj, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${PROJECTS_COL}/${proj.id}`);
      throw err;
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      const docRef = doc(db, PROJECTS_COL, id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${PROJECTS_COL}/${id}`);
      throw err;
    }
  },

  // --- TASKS ---
  async getTasks(): Promise<Task[]> {
    try {
      const colRef = collection(db, TASKS_COL);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, TASKS_COL);
      return [];
    }
  },

  async saveTask(task: Task): Promise<void> {
    try {
      // Exclude populated objects before saving to Firestore
      const { project, assigned_employee, ...cleanTask } = task;
      const docRef = doc(db, TASKS_COL, task.id);
      await setDoc(docRef, cleanTask, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${TASKS_COL}/${task.id}`);
      throw err;
    }
  },

  async deleteTask(id: string): Promise<void> {
    try {
      const docRef = doc(db, TASKS_COL, id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${TASKS_COL}/${id}`);
      throw err;
    }
  },

  // --- TIME ENTRIES ---
  async getTimeEntries(): Promise<TimeEntry[]> {
    try {
      const colRef = collection(db, TIME_ENTRIES_COL);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        return [];
      }
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      // Sort newest first
      items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      return items;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, TIME_ENTRIES_COL);
      return [];
    }
  },

  async saveTimeEntry(entry: TimeEntry): Promise<void> {
    try {
      const docRef = doc(db, TIME_ENTRIES_COL, entry.id);
      await setDoc(docRef, entry, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${TIME_ENTRIES_COL}/${entry.id}`);
      throw err;
    }
  },

  async deleteTimeEntry(id: string): Promise<void> {
    try {
      const docRef = doc(db, TIME_ENTRIES_COL, id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${TIME_ENTRIES_COL}/${id}`);
      throw err;
    }
  },
};
