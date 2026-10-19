import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "./firebase";
import { employeeService, Employee } from "./supabaseClient";
import { workGroupService } from "./workGroupService";

export interface CollaboratorInvitation {
  id: string;
  name: string;
  email: string;
  role: string;
  weekly_hours: number;
  groupId: string | null;
  groupName?: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
  status: "pending" | "accepted" | "declined";
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string | null;
}

const INVITATIONS_COL = "invitations";
const STORAGE_KEY = "teamworkload_invitations";

export const invitationService = {
  async getAll(): Promise<CollaboratorInvitation[]> {
    try {
      const colRef = collection(db, INVITATIONS_COL);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as CollaboratorInvitation[];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        return items;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, INVITATIONS_COL);
    }

    // Local fallback
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Could not read local invitations:", e);
    }
    return [];
  },

  async create(
    data: Omit<CollaboratorInvitation, "id" | "status" | "invitedAt">
  ): Promise<CollaboratorInvitation> {
    const list = await this.getAll();
    const now = new Date().toISOString();
    const id = `inv-${Date.now()}`;

    const newInv: CollaboratorInvitation = {
      ...data,
      id,
      email: data.email.trim().toLowerCase(),
      status: "pending",
      invitedAt: now,
    };

    const updated = [newInv, ...list.filter((i) => i.id !== id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      const docRef = doc(db, INVITATIONS_COL, id);
      await setDoc(docRef, newInv);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${INVITATIONS_COL}/${id}`);
    }

    return newInv;
  },

  async getPendingByEmail(email: string): Promise<CollaboratorInvitation[]> {
    if (!email) return [];
    const normalized = email.trim().toLowerCase();
    const all = await this.getAll();
    return all.filter(
      (inv) => inv.email.toLowerCase() === normalized && inv.status === "pending"
    );
  },

  async acceptInvitation(
    id: string,
    userId?: string
  ): Promise<CollaboratorInvitation> {
    const list = await this.getAll();
    const target = list.find((i) => i.id === id);
    if (!target) throw new Error("Convite não encontrado.");

    const now = new Date().toISOString();
    target.status = "accepted";
    target.acceptedAt = now;

    // 1. Ensure employee record exists
    const employees = await employeeService.getAll();
    let emp = employees.find(
      (e) =>
        (e as any).email?.toLowerCase() === target.email.toLowerCase() ||
        e.name.toLowerCase() === target.name.toLowerCase()
    );

    if (!emp) {
      emp = await employeeService.create({
        name: target.name,
        role: target.role,
        email: target.email,
        weekly_hours: target.weekly_hours || 40,
        skills: ["Trabalho em Equipe"],
        dias_de_trabalho: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
        ],
      });
    } else if (!(emp as any).email) {
      emp = await employeeService.update(emp.id, {
        email: target.email,
      });
    }

    // 2. If group was chosen, add member to group
    if (target.groupId && emp) {
      try {
        await workGroupService.addOrUpdateMember(target.groupId, {
          employeeId: emp.id,
          employeeName: emp.name,
          email: target.email,
          roleInGroup: target.role,
          canCreate: target.canCreate,
          canEdit: target.canEdit,
          canDelete: target.canDelete,
          isAdmin: target.isAdmin,
          canView: true,
          joinedAt: now,
        });
      } catch (e) {
        console.warn("Could not auto-add to group upon invitation accept:", e);
      }
    }

    // Update storage and firestore
    const updated = list.map((i) => (i.id === id ? target : i));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      const docRef = doc(db, INVITATIONS_COL, id);
      await setDoc(docRef, target, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${INVITATIONS_COL}/${id}`);
    }

    return target;
  },

  async declineInvitation(id: string): Promise<void> {
    const list = await this.getAll();
    const target = list.find((i) => i.id === id);
    if (!target) return;

    target.status = "declined";
    const updated = list.map((i) => (i.id === id ? target : i));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      const docRef = doc(db, INVITATIONS_COL, id);
      await setDoc(docRef, target, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${INVITATIONS_COL}/${id}`);
    }
  },

  async deleteInvitation(id: string): Promise<void> {
    const list = await this.getAll();
    const updated = list.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      const docRef = doc(db, INVITATIONS_COL, id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${INVITATIONS_COL}/${id}`);
    }
  },
};
