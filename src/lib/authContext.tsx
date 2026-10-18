import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  auth,
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
  logoutUser,
  subscribeToAuth,
} from "./firebase";
import { Employee, employeeService } from "./supabaseClient";
import {
  workGroupService,
  WorkGroup,
  HIERARCHY_LEVELS,
} from "./workGroupService";

export interface CurrentUserPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hierarchyTitle: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeEmployee: Employee | null;
  activeEmployeeId: string;
  allEmployees: Employee[];
  allGroups: WorkGroup[];
  userGroups: WorkGroup[];
  visibleGroupIds: string[];
  permissions: CurrentUserPermissions;
  isSuperAdmin: boolean;
  setIsSuperAdmin: (val: boolean) => void;
  loginGoogle: () => Promise<void>;
  loginEmail: (email: string, pass: string) => Promise<void>;
  registerEmail: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchPersona: (employeeId: string) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_PERSONA_KEY = "crono_pulse_active_persona";
const SUPER_ADMIN_KEY = "crono_pulse_is_superadmin";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [allGroups, setAllGroups] = useState<WorkGroup[]>([]);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_PERSONA_KEY) || "emp-4"; // Lucas Mendes (Diretor) by default
  });
  const [isSuperAdmin, setIsSuperAdminState] = useState<boolean>(() => {
    const val = localStorage.getItem(SUPER_ADMIN_KEY);
    return val !== null ? val === "true" : true;
  });

  const setIsSuperAdmin = (val: boolean) => {
    setIsSuperAdminState(val);
    localStorage.setItem(SUPER_ADMIN_KEY, String(val));
  };

  const switchPersona = (employeeId: string) => {
    setActiveEmployeeId(employeeId);
    localStorage.setItem(ACTIVE_PERSONA_KEY, employeeId);
  };

  // Load data
  const refreshUserData = async () => {
    try {
      const [emps, groups] = await Promise.all([
        employeeService.getAll(),
        workGroupService.getAll(),
      ]);
      setAllEmployees(emps);
      setAllGroups(groups);
    } catch (e) {
      console.error("Error refreshing auth user data:", e);
    }
  };

  useEffect(() => {
    refreshUserData();

    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activeEmployee =
    allEmployees.find((e) => e.id === activeEmployeeId) || allEmployees[0] || null;

  // Groups this user belongs to
  const userGroups = allGroups.filter((g) =>
    g.members.some((m) => m.employeeId === activeEmployeeId)
  );

  // Group IDs visible to this user by hierarchy rules
  const visibleGroupIds = workGroupService.getVisibleGroupIdsForEmployee(
    activeEmployeeId,
    allGroups,
    isSuperAdmin
  );

  // Aggregate user permissions across visible groups
  const permissions: CurrentUserPermissions = React.useMemo(() => {
    if (isSuperAdmin) {
      return {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        isAdmin: true,
        isSuperAdmin: true,
        hierarchyTitle: "Super Administrador Global",
      };
    }

    if (userGroups.length === 0) {
      return {
        canCreate: true,
        canEdit: true,
        canDelete: false,
        isAdmin: false,
        isSuperAdmin: false,
        hierarchyTitle: "Colaborador Geral",
      };
    }

    // Find highest level among user groups (1 is highest)
    const minLevel = Math.min(...userGroups.map((g) => g.level));
    const highestLevelConfig = HIERARCHY_LEVELS[minLevel as 1 | 2 | 3 | 4];

    const canCreate = userGroups.some((g) =>
      g.members.some((m) => m.employeeId === activeEmployeeId && (m.canCreate || m.isAdmin))
    );
    const canEdit = userGroups.some((g) =>
      g.members.some((m) => m.employeeId === activeEmployeeId && (m.canEdit || m.isAdmin))
    );
    const canDelete = userGroups.some((g) =>
      g.members.some((m) => m.employeeId === activeEmployeeId && (m.canDelete || m.isAdmin))
    );
    const isAdmin = userGroups.some((g) =>
      g.members.some((m) => m.employeeId === activeEmployeeId && m.isAdmin)
    );

    return {
      canCreate,
      canEdit,
      canDelete,
      isAdmin,
      isSuperAdmin: false,
      hierarchyTitle: highestLevelConfig?.title || "Membro de Grupo",
    };
  }, [isSuperAdmin, userGroups, activeEmployeeId]);

  const loginGoogle = async () => {
    setLoading(true);
    try {
      const u = await signInWithGoogle();
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  const loginEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const u = await signInWithEmail(email, pass);
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  const registerEmail = async (email: string, pass: string, name?: string) => {
    setLoading(true);
    try {
      const u = await registerWithEmail(email, pass, name);
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeEmployee,
        activeEmployeeId,
        allEmployees,
        allGroups,
        userGroups,
        visibleGroupIds,
        permissions,
        isSuperAdmin,
        setIsSuperAdmin,
        loginGoogle,
        loginEmail,
        registerEmail,
        logout,
        switchPersona,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
