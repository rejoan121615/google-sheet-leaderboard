import type { DashboardConfig } from "./types/global.types.js";
import { loadDashboardConfigsFromSheet } from "./configLoader.js";

export const leaderboardRotationSeconds = 15;
export const leaderboardDataRefreshSeconds = 15;
export const leaderboardVisibleRows = 5;

// Google Sheet URL for dashboard configurations
export const CONFIG_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vStRnxoWdWZ1vLSZavLXqcQe4Pq6qve_c8yP9vOY7t05nr0DCPxfLIjl6xnWCrHuaTk7Fy0s7lEknyM/pub?gid=0&single=true&output=csv";

// This will be populated by initializeDashboardConfigs()
export let dashboardConfigs: DashboardConfig[] = [];

// Initialize dashboard configurations from Google Sheet
export async function initializeDashboardConfigs(): Promise<void> {
  try {
    dashboardConfigs = await loadDashboardConfigsFromSheet(CONFIG_SHEET_URL);
    console.log(
      `Loaded ${dashboardConfigs.length} dashboard configuration(s) from Google Sheet`
    );
  } catch (error) {
    console.error("Failed to load dashboard configurations:", error);
    // Keep dashboardConfigs as empty array on failure
    dashboardConfigs = [];
  }
}