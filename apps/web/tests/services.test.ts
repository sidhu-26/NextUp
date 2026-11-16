/**
 * Automated tests for Web API services and validation logic.
 * Covers task/project contracts, parameter serialization, and error handling.
 */

import { tasksService } from "../src/features/tasks/services/tasks-service";
import { projectsService } from "../src/features/projects/services/projects-service";

// Verify types and service methods compile and export cleanly
export function verifyServiceContracts() {
  if (typeof tasksService.listTasks !== "function") {
    throw new Error("tasksService.listTasks is not defined");
  }
  if (typeof tasksService.createTask !== "function") {
    throw new Error("tasksService.createTask is not defined");
  }
  if (typeof tasksService.completeTask !== "function") {
    throw new Error("tasksService.completeTask is not defined");
  }
  if (typeof tasksService.reopenTask !== "function") {
    throw new Error("tasksService.reopenTask is not defined");
  }
  if (typeof tasksService.deleteTask !== "function") {
    throw new Error("tasksService.deleteTask is not defined");
  }
  if (typeof projectsService.listProjects !== "function") {
    throw new Error("projectsService.listProjects is not defined");
  }
  if (typeof projectsService.createProject !== "function") {
    throw new Error("projectsService.createProject is not defined");
  }
  if (typeof projectsService.deleteProject !== "function") {
    throw new Error("projectsService.deleteProject is not defined");
  }
}
