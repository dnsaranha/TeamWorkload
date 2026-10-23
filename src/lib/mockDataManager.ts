import { mockDB, STORAGE_KEYS, getInitialData } from "./supabaseClient";
import { workGroupService, getSeedGroups } from "./workGroupService";
import { firestoreService } from "./firestoreService";

const MOCK_CLEARED_KEY = "crono_pulse_mock_cleared";
const TEAMWORKLOAD_MOCK_CLEARED_KEY = "teamworkload_mock_cleared";

export const mockDataManager = {
  isMockCleared(): boolean {
    return (
      localStorage.getItem(MOCK_CLEARED_KEY) === "true" ||
      localStorage.getItem(TEAMWORKLOAD_MOCK_CLEARED_KEY) === "true"
    );
  },

  async clearMockData(): Promise<void> {
    try {
      localStorage.setItem(MOCK_CLEARED_KEY, "true");
      localStorage.setItem(TEAMWORKLOAD_MOCK_CLEARED_KEY, "true");

      // Clear in-memory mockDB
      mockDB.setEmployees([]);
      mockDB.setProjects([]);
      mockDB.setTasks([]);

      // Clear local storage keys
      localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
      localStorage.removeItem(STORAGE_KEYS.PROJECTS);
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem("crono_pulse_time_entries");
      localStorage.removeItem("crono_pulse_active_time_entry");
      localStorage.removeItem("crono_pulse_timeoffs");
      localStorage.removeItem("teamworkload_timeoffs");
      localStorage.removeItem("crono_pulse_task_order");

      // Clear work groups
      localStorage.setItem("crono_pulse_work_groups", JSON.stringify([]));

      // Delete seed / mock records from Firestore so they don't sync back
      const seedGroupIds = [
        "group-dir-corp",
        "group-dep-tech",
        "group-dep-ops",
        "group-crd-eng",
        "group-sqd-front",
        "group-sqd-back",
      ];
      for (const id of seedGroupIds) {
        workGroupService.delete(id).catch(() => {});
      }

      const mockEmployeeIds = ["emp-1", "emp-2", "emp-3", "emp-4"];
      for (const id of mockEmployeeIds) {
        firestoreService.deleteEmployee(id).catch(() => {});
      }

      const mockProjectIds = [
        "proj-1",
        "proj-2",
        "proj-3",
        "proj-ctrl",
        "proj-int",
        "proj-lbw",
        "proj-ped",
      ];
      for (const id of mockProjectIds) {
        firestoreService.deleteProject(id).catch(() => {});
      }

      const mockTaskIds = [
        "task-1",
        "task-2",
        "task-3",
        "task-4",
        "task-5",
        "task-6",
        "task-7",
        "task-8",
        "task-9",
        "task-10",
        "task-cad",
        "task-aval",
        "task-gest",
        "task-sup",
        "task-lbw",
        "task-lims",
      ];
      for (const id of mockTaskIds) {
        firestoreService.deleteTask(id).catch(() => {});
      }
    } catch (e) {
      console.error("Error clearing mock data:", e);
    }
  },

  async restoreMockData(): Promise<void> {
    try {
      localStorage.removeItem(MOCK_CLEARED_KEY);
      localStorage.removeItem(TEAMWORKLOAD_MOCK_CLEARED_KEY);
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
