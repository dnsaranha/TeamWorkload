import { mockDB, STORAGE_KEYS, getInitialData } from "./supabaseClient";
import { workGroupService, getSeedGroups } from "./workGroupService";

const MOCK_CLEARED_KEY = "crono_pulse_mock_cleared";

export const mockDataManager = {
  isMockCleared(): boolean {
    return localStorage.getItem(MOCK_CLEARED_KEY) === "true";
  },

  async clearMockData(): Promise<void> {
    try {
      localStorage.setItem(MOCK_CLEARED_KEY, "true");

      // Clear local memory structures
      mockDB.setEmployees([]);
      mockDB.setProjects([]);
      mockDB.setTasks([]);

      // Clear localStorage cache for employees, projects, tasks, time entries
      localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
      localStorage.removeItem(STORAGE_KEYS.PROJECTS);
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem("crono_pulse_time_entries");
      localStorage.removeItem("crono_pulse_active_time_entry");

      // Clear work groups to an empty slate
      localStorage.setItem("crono_pulse_work_groups", JSON.stringify([]));

      // Attempt to delete seed groups if stored
      const seedIds = [
        "group-dir-corp",
        "group-dep-tech",
        "group-dep-ops",
        "group-crd-eng",
        "group-sqd-front",
        "group-sqd-back",
      ];
      for (const id of seedIds) {
        workGroupService.delete(id).catch(() => {});
      }
    } catch (e) {
      console.error("Error clearing mock data:", e);
    }
  },

  async restoreMockData(): Promise<void> {
    try {
      localStorage.removeItem(MOCK_CLEARED_KEY);
      localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
      localStorage.removeItem(STORAGE_KEYS.PROJECTS);
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem("crono_pulse_work_groups");

      // Re-populate mockDB
      const initial = getInitialData();
      mockDB.setEmployees(initial.employees);
      mockDB.setProjects(initial.projects);
      mockDB.setTasks(initial.tasks);

      // Re-populate work groups
      const seed = getSeedGroups();
      localStorage.setItem("crono_pulse_work_groups", JSON.stringify(seed));
      await workGroupService.seedFirestore(seed).catch(() => {});
    } catch (e) {
      console.error("Error restoring mock data:", e);
    }
  },
};
