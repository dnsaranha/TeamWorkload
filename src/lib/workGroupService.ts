import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "./firebase";
import { Employee, employeeService } from "./supabaseClient";

export type HierarchyLevel = 1 | 2 | 3 | 4;

export interface HierarchyLevelConfig {
  level: HierarchyLevel;
  title: string;
  shortTitle: string;
  badgeLabel: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export const HIERARCHY_LEVELS: Record<HierarchyLevel, HierarchyLevelConfig> = {
  1: {
    level: 1,
    title: "Nível 1",
    shortTitle: "Nível 1",
    badgeLabel: "Nível 1",
    description: "",
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-100 dark:bg-purple-950/60",
    borderClass: "border-purple-300 dark:border-purple-800",
  },
  2: {
    level: 2,
    title: "Nível 2",
    shortTitle: "Nível 2",
    badgeLabel: "Nível 2",
    description: "",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-950/60",
    borderClass: "border-blue-300 dark:border-blue-800",
  },
  3: {
    level: 3,
    title: "Nível 3",
    shortTitle: "Nível 3",
    badgeLabel: "Nível 3",
    description: "",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-100 dark:bg-emerald-950/60",
    borderClass: "border-emerald-300 dark:border-emerald-800",
  },
  4: {
    level: 4,
    title: "Nível 4",
    shortTitle: "Nível 4",
    badgeLabel: "Nível 4",
    description: "",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-100 dark:bg-amber-950/60",
    borderClass: "border-amber-300 dark:border-amber-800",
  },
};

export interface GroupMemberPermission {
  employeeId: string;
  employeeName: string;
  email?: string;
  roleInGroup: string; // Ex: "Diretor", "Gerente", "Líder Técnico", "Membro"
  isAdmin: boolean; // Pode gerenciar grupo e membros
  canCreate: boolean; // Pode criar tarefas, projetos e horas
  canEdit: boolean; // Pode editar registros
  canDelete: boolean; // Pode excluir registros
  canView: boolean; // Pode visualizar
  joinedAt: string;
}

export interface WorkGroup {
  id: string;
  name: string;
  code: string;
  description: string;
  level: HierarchyLevel;
  levelName: string;
  parentId: string | null; // ID of superior group. Multiple groups can share the same parentId!
  parentName?: string;
  color: string;
  icon?: string;
  members: GroupMemberPermission[];
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = "crono_pulse_work_groups";
const WORK_GROUPS_COL = "work_groups";

// Initial seed data showcasing the full 4-level hierarchy and multiple child groups sharing the same parent
export const getSeedGroups = (): WorkGroup[] => {
  const now = new Date().toISOString();

  return [
    {
      id: "group-dir-corp",
      name: "Diretoria Executiva & Estratégica",
      code: "DIR-EXEC",
      description: "Governança corporativa global e direcionamento de metas da organização",
      level: 1,
      levelName: "Nível 1",
      parentId: null,
      parentName: "Raiz Organizacional",
      color: "#8b5cf6", // Purple
      icon: "Building2",
      members: [
        {
          employeeId: "emp-4",
          employeeName: "Lucas Mendes",
          email: "lucas.mendes@empresa.com",
          roleInGroup: "Diretor de Operações & Tecnologia",
          isAdmin: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          joinedAt: now,
        },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      id: "group-dep-tech",
      name: "Departamento de Tecnologia & Inovação",
      code: "DEP-TI",
      description: "Engenharia de software, produtos digitais, arquitetura e infraestrutura em nuvem",
      level: 2,
      levelName: "Nível 2",
      parentId: "group-dir-corp",
      parentName: "Diretoria Executiva & Estratégica",
      color: "#2563eb", // Blue
      icon: "Cpu",
      members: [
        {
          employeeId: "emp-4",
          employeeName: "Lucas Mendes",
          email: "lucas.mendes@empresa.com",
          roleInGroup: "Head de Tecnologia",
          isAdmin: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          joinedAt: now,
        },
        {
          employeeId: "emp-2",
          employeeName: "Carlos Eduardo",
          email: "carlos.eduardo@empresa.com",
          roleInGroup: "Especialista de Arquitetura",
          isAdmin: true,
          canCreate: true,
          canEdit: true,
          canDelete: false,
          canView: true,
          joinedAt: now,
        },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      id: "group-dep-ops",
      name: "Departamento de Operações & Projetos",
      code: "DEP-OPS",
      description: "Gestão operacional, eficiência de processos e alocação de capacidade (compartilha a Diretoria)",
      level: 2,
      levelName: "Nível 2",
      parentId: "group-dir-corp",
      parentName: "Diretoria Executiva & Estratégica",
      color: "#0284c7", // Sky blue
      icon: "Workflow",
      members: [
        {
          employeeId: "emp-3",
          employeeName: "Beatriz Lima",
          email: "beatriz.lima@empresa.com",
          roleInGroup: "Gerente de Operações",
          isAdmin: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          joinedAt: now,
        },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      id: "group-crd-eng",
      name: "Coordenação de Engenharia de Software",
      code: "CRD-ENG",
      description: "Coordenação dos squads de desenvolvimento web, mobile e APIs do DEP-TI",
      level: 3,
      levelName: "Nível 3",
      parentId: "group-dep-tech",
      parentName: "Departamento de Tecnologia & Inovação",
      color: "#059669", // Emerald
      icon: "Code2",
      members: [
        {
          employeeId: "emp-2",
          employeeName: "Carlos Eduardo",
          email: "carlos.eduardo@empresa.com",
          roleInGroup: "Coordenador de Engenharia",
          isAdmin: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          joinedAt: now,
        },
      ],
      created_at: now,
      updated_at: now,
    },
    // Squad 1 sharing CRD-ENG
    {
      id: "group-sqd-front",
      name: "Squad Frontend & Design System",
      code: "SQD-FRONT",
      description: "Desenvolvimento da interface React, experiência do usuário e usabilidade",
      level: 4,
      levelName: "Nível 4",
      parentId: "group-crd-eng",
      parentName: "Coordenação de Engenharia de Software",
      color: "#d97706", // Amber
      icon: "Layout",
      members: [
        {
          employeeId: "emp-1",
          employeeName: "Ana Silva",
          email: "ana.silva@empresa.com",
          roleInGroup: "Tech Lead Frontend",
          isAdmin: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          joinedAt: now,
        },
        {
          employeeId: "emp-3",
          employeeName: "Beatriz Lima",
          email: "beatriz.lima@empresa.com",
          roleInGroup: "Product Designer UI/UX",
          isAdmin: false,
          canCreate: true,
          canEdit: true,
          canDelete: false,
          canView: true,
          joinedAt: now,
        },
      ],
      created_at: now,
      updated_at: now,
    },
    // Squad 2 sharing CRD-ENG (same parent group!)
    {
      id: "group-sqd-back",
      name: "Squad Backend & Plataforma Cloud",
      code: "SQD-BACK",
      description: "APIs REST, microsserviços, banco Firestore e integrações em tempo real",
      level: 4,
      levelName: "Nível 4",
      parentId: "group-crd-eng",
      parentName: "Coordenação de Engenharia de Software",
      color: "#ea580c", // Orange
      icon: "Database",
      members: [
        {
          employeeId: "emp-2",
          employeeName: "Carlos Eduardo",
          email: "carlos.eduardo@empresa.com",
          roleInGroup: "Tech Lead Backend",
          isAdmin: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          joinedAt: now,
        },
      ],
      created_at: now,
      updated_at: now,
    },
  ];
};

export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      } else {
        clean[key] = null;
      }
    }
    return clean;
  }
  return obj;
}

export const SEED_GROUP_IDS = [
  "group-dir-corp",
  "group-dep-tech",
  "group-dep-ops",
  "group-crd-eng",
  "group-sqd-front",
  "group-sqd-back",
];

export const workGroupService = {
  // Get all groups (with Firestore priority and local cache fallback)
  async getAll(): Promise<WorkGroup[]> {
    const isMockCleared = localStorage.getItem("crono_pulse_mock_cleared") === "true";

    try {
      const colRef = collection(db, WORK_GROUPS_COL);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        let groups = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as WorkGroup[];

        // If mock data was cleared by user, filter out the default demo groups
        if (isMockCleared) {
          groups = groups.filter((g) => !SEED_GROUP_IDS.includes(g.id));
        }

        // Merge with local storage if local has freshly created groups not yet indexed
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          try {
            const localParsed: WorkGroup[] = JSON.parse(local);
            for (const lg of localParsed) {
              if (!groups.some((g) => g.id === lg.id)) {
                if (!isMockCleared || !SEED_GROUP_IDS.includes(lg.id)) {
                  groups.push(lg);
                  // Push to Firestore in background to heal sync
                  const docRef = doc(db, WORK_GROUPS_COL, lg.id);
                  setDoc(docRef, sanitizeForFirestore(lg), { merge: true }).catch(() => {});
                }
              }
            }
          } catch (e) {
            console.error("Error parsing local work groups:", e);
          }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
        return groups;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, WORK_GROUPS_COL);
    }

    // If user cleared mock data, return only local non-mock groups
    if (isMockCleared) {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        try {
          const parsed: WorkGroup[] = JSON.parse(local);
          return parsed.filter((g) => !SEED_GROUP_IDS.includes(g.id));
        } catch (e) {
          console.error("Error parsing local work groups:", e);
        }
      }
      return [];
    }

    // Fallback to local storage or seed data
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error("Error parsing local work groups:", e);
      }
    }

    // Seed defaults
    const seed = getSeedGroups();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    // Asynchronously seed to Firestore
    this.seedFirestore(seed).catch((e) => console.warn("Seed firestore notice:", e));
    return seed;
  },

  async seedFirestore(seed: WorkGroup[]): Promise<void> {
    try {
      for (const g of seed) {
        const docRef = doc(db, WORK_GROUPS_COL, g.id);
        await setDoc(docRef, sanitizeForFirestore(g), { merge: true });
      }
    } catch (e) {
      console.warn("Could not seed groups to Firestore:", e);
    }
  },

  async getById(id: string): Promise<WorkGroup | null> {
    const groups = await this.getAll();
    return groups.find((g) => g.id === id) || null;
  },

  async save(group: WorkGroup): Promise<WorkGroup> {
    const groups = await this.getAll();
    const now = new Date().toISOString();
    const existingIndex = groups.findIndex((g) => g.id === group.id);

    // Update parentName if parentId is set
    if (group.parentId) {
      const parent = groups.find((g) => g.id === group.parentId);
      if (parent) {
        group.parentName = parent.name;
      }
    } else {
      group.parentName = "Raiz Organizacional";
      group.parentId = null;
    }

    group.levelName = `Nível ${group.level}`;
    group.updated_at = now;
    group.created_at = group.created_at || now;
    group.color = group.color || "#2563eb";
    group.members = (group.members || []).map((m) => ({
      ...m,
      email: m.email || null,
      roleInGroup: m.roleInGroup || "Membro",
      isAdmin: Boolean(m.isAdmin),
      canCreate: Boolean(m.canCreate),
      canEdit: Boolean(m.canEdit),
      canDelete: Boolean(m.canDelete),
      canView: m.canView !== false,
      joinedAt: m.joinedAt || now,
    }));

    if (existingIndex >= 0) {
      groups[existingIndex] = group;
    } else {
      groups.push(group);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));

    // Save sanitized copy to Firestore
    try {
      const docRef = doc(db, WORK_GROUPS_COL, group.id);
      const cleanGroup = sanitizeForFirestore(group);
      await setDoc(docRef, cleanGroup, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${WORK_GROUPS_COL}/${group.id}`);
    }

    return group;
  },

  async delete(id: string): Promise<void> {
    const groups = await this.getAll();
    const updated = groups.filter((g) => g.id !== id);

    // If any group had this as parent, reset its parent to null
    for (const g of updated) {
      if (g.parentId === id) {
        g.parentId = null;
        g.parentName = "Raiz Organizacional";
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      const docRef = doc(db, WORK_GROUPS_COL, id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${WORK_GROUPS_COL}/${id}`);
    }
  },

  async clearAll(): Promise<void> {
    try {
      const groups = await this.getAll();
      for (const g of groups) {
        const docRef = doc(db, WORK_GROUPS_COL, g.id);
        await deleteDoc(docRef).catch(() => {});
      }
    } catch (e) {
      console.warn("Error deleting work groups from Firestore:", e);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  },

  // Member management
  async addOrUpdateMember(
    groupId: string,
    permission: GroupMemberPermission
  ): Promise<WorkGroup> {
    const group = await this.getById(groupId);
    if (!group) throw new Error("Grupo não encontrado");

    const idx = group.members.findIndex((m) => m.employeeId === permission.employeeId);
    if (idx >= 0) {
      group.members[idx] = permission;
    } else {
      group.members.push(permission);
    }

    return await this.save(group);
  },

  async removeMember(groupId: string, employeeId: string): Promise<WorkGroup> {
    const group = await this.getById(groupId);
    if (!group) throw new Error("Grupo não encontrado");

    group.members = group.members.filter((m) => m.employeeId !== employeeId);
    return await this.save(group);
  },

  // --- HIERARCHY & VISIBILITY UTILITIES ---

  // Recursively get all descendant group IDs (children, grandchildren, etc.)
  getAllDescendantGroupIds(groupId: string, allGroups: WorkGroup[]): string[] {
    const result: string[] = [];
    const directChildren = allGroups.filter((g) => g.parentId === groupId);
    for (const child of directChildren) {
      result.push(child.id);
      result.push(...this.getAllDescendantGroupIds(child.id, allGroups));
    }
    return Array.from(new Set(result));
  },

  // Recursively get all ancestor group IDs (parent, grandparent, etc.)
  getAllAncestorGroupIds(groupId: string, allGroups: WorkGroup[]): string[] {
    const result: string[] = [];
    let current = allGroups.find((g) => g.id === groupId);
    while (current && current.parentId) {
      result.push(current.parentId);
      current = allGroups.find((g) => g.id === current?.parentId);
    }
    return result;
  },

  /**
   * Core rule: "para quem estiver em um nível maior tenha visão de todos no mesmo nível ou grupos inferiores"
   * Returns all group IDs that this employee is allowed to view.
   * If isSuperAdmin is true, returns all groups.
   */
  getVisibleGroupIdsForEmployee(
    employeeId: string,
    allGroups: WorkGroup[],
    isSuperAdmin: boolean = false
  ): string[] {
    if (isSuperAdmin) {
      return allGroups.map((g) => g.id);
    }

    // Find all groups where user is a direct member
    const directGroups = allGroups.filter((g) =>
      g.members.some((m) => m.employeeId === employeeId && m.canView)
    );

    if (directGroups.length === 0) {
      // If user isn't assigned to any specific group, check if they are in the top level or allow default
      return allGroups.map((g) => g.id);
    }

    const visibleSet = new Set<string>();

    for (const group of directGroups) {
      // Include the group itself
      visibleSet.add(group.id);

      // In accordance with hierarchy rule:
      // Higher level members have full visibility of all descendant/inferior groups!
      const descendants = this.getAllDescendantGroupIds(group.id, allGroups);
      descendants.forEach((id) => visibleSet.add(id));

      // Also include peer groups if user's group is level 1 (Diretoria has company-wide visibility)
      if (group.level === 1) {
        allGroups.forEach((g) => visibleSet.add(g.id));
      }
    }

    return Array.from(visibleSet);
  },

  /**
   * Get effective permissions for a user in a target group.
   * If user is an Admin in a superior group, those admin/edit rights cascade down!
   */
  getEffectiveUserPermissions(
    employeeId: string,
    targetGroupId: string,
    allGroups: WorkGroup[],
    isSuperAdmin: boolean = false
  ): {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    isAdmin: boolean;
    reason: string;
  } {
    if (isSuperAdmin) {
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        isAdmin: true,
        reason: "Super Administrador Global",
      };
    }

    const targetGroup = allGroups.find((g) => g.id === targetGroupId);
    if (!targetGroup) {
      return {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        isAdmin: false,
        reason: "Grupo não encontrado",
      };
    }

    // Check direct membership in target group
    const directMembership = targetGroup.members.find((m) => m.employeeId === employeeId);
    if (directMembership) {
      return {
        canView: directMembership.canView,
        canCreate: directMembership.canCreate,
        canEdit: directMembership.canEdit,
        canDelete: directMembership.canDelete,
        isAdmin: directMembership.isAdmin,
        reason: `Membro direto do grupo (${directMembership.roleInGroup || "Membro"})`,
      };
    }

    // Check if user is a member of any ancestor group (higher in the hierarchy)
    const ancestorIds = this.getAllAncestorGroupIds(targetGroupId, allGroups);
    for (const ancId of ancestorIds) {
      const ancGroup = allGroups.find((g) => g.id === ancId);
      if (ancGroup) {
        const ancMembership = ancGroup.members.find((m) => m.employeeId === employeeId);
        if (ancMembership) {
          // If user is admin or leader in ancestor group, rights cascade down!
          return {
            canView: true,
            canCreate: ancMembership.canCreate || ancMembership.isAdmin,
            canEdit: ancMembership.canEdit || ancMembership.isAdmin,
            canDelete: ancMembership.canDelete || ancMembership.isAdmin,
            isAdmin: ancMembership.isAdmin,
            reason: `Herdado do grupo superior: ${ancGroup.name} (${HIERARCHY_LEVELS[ancGroup.level]?.shortTitle})`,
          };
        }
      }
    }

    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      isAdmin: false,
      reason: "Sem vínculo ou permissão neste grupo",
    };
  },
};
