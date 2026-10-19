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
import { mockDataManager } from "./mockDataManager";

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
  isAuthenticated: boolean;
  activeEmployee: Employee | null;
  activeEmployeeId: string;
  allEmployees: Employee[];
  allGroups: WorkGroup[];
  userGroups: WorkGroup[];
  visibleGroupIds: string[];
  permissions: CurrentUserPermissions;
  isSuperAdmin: boolean;
  isMockCleared: boolean;
  setIsSuperAdmin: (val: boolean) => void;
  loginGoogle: () => Promise<void>;
  loginEmail: (email: string, pass: string) => Promise<void>;
  registerEmail: (email: string, pass: string, name?: string) => Promise<void>;
  loginAsPersona: (employeeId: string) => void;
  logout: () => Promise<void>;
  switchPersona: (employeeId: string) => void;
  refreshUserData: () => Promise<void>;
  clearMockData: () => Promise<void>;
  restoreMockData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_PERSONA_KEY = "crono_pulse_active_persona";
const SUPER_ADMIN_KEY = "crono_pulse_is_superadmin";
const AUTH_SESSION_KEY = "crono_pulse_authenticated";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_SESSION_KEY) === "true";
  });
  const [isMockCleared, setIsMockCleared] = useState<boolean>(() => {
    return mockDataManager.isMockCleared();
  });
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [allGroups, setAllGroups] = useState<WorkGroup[]>([]);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_PERSONA_KEY) || "emp-4"; // Default to Lucas Mendes
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

  const loginAsPersona = (employeeId: string) => {
    switchPersona(employeeId);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_SESSION_KEY, "true");
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
      setIsMockCleared(mockDataManager.isMockCleared());
    } catch (e) {
      console.error("Error refreshing auth user data:", e);
    }
  };

  const clearMockData = async () => {
    await mockDataManager.clearMockData();
    setIsMockCleared(true);
    await refreshUserData();
  };

  const restoreMockData = async () => {
    await mockDataManager.restoreMockData();
    setIsMockCleared(false);
    await refreshUserData();
  };

  useEffect(() => {
    refreshUserData();

    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAuthenticated(true);
        localStorage.setItem(AUTH_SESSION_KEY, "true");
      }
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
        hierarchyTitle: "Super Administrador",
      };
    }

    if (userGroups.length === 0) {
      return {
        canCreate: true,
        canEdit: true,
        canDelete: false,
        isAdmin: false,
        isSuperAdmin: false,
        hierarchyTitle: "Nível 4",
      };
    }

    // Find highest level among user groups (1 is highest)
    const minLevel = Math.min(...userGroups.map((g) => g.level));

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
      hierarchyTitle: `Nível ${minLevel}`,
    };
  }, [isSuperAdmin, userGroups, activeEmployeeId]);

  const loginGoogle = async () => {
    setLoading(true);
    try {
      const u = await signInWithGoogle();
      if (u) {
        setUser(u);
        setIsAuthenticated(true);
        localStorage.setItem(AUTH_SESSION_KEY, "true");
      }
    } finally {
      setLoading(false);
    }
  };

  const loginEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const u = await signInWithEmail(email, pass);
      if (u) {
        setUser(u);
        setIsAuthenticated(true);
        localStorage.setItem(AUTH_SESSION_KEY, "true");
      }
    } finally {
      setLoading(false);
    }
  };

  const registerEmail = async (email: string, pass: string, name?: string) => {
    setLoading(true);
    try {
      const u = await registerWithEmail(email, pass, name);
      if (u) {
        setUser(u);
        setIsAuthenticated(true);
        localStorage.setItem(AUTH_SESSION_KEY, "true");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(AUTH_SESSION_KEY);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        activeEmployee,
        activeEmployeeId,
        allEmployees,
        allGroups,
        userGroups,
        visibleGroupIds,
        permissions,
        isSuperAdmin,
        isMockCleared,
        setIsSuperAdmin,
        loginGoogle,
        loginEmail,
        registerEmail,
        loginAsPersona,
        logout,
        switchPersona,
        refreshUserData,
        clearMockData,
        restoreMockData,
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
