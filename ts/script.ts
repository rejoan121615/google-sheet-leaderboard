import {
  dashboardConfigs,
  leaderboardDataRefreshSeconds,
  leaderboardRotationSeconds,
  leaderboardVisibleRows,
} from "./config.js";
import type {
  DashboardConfig,
  LeaderboardRow,
  SortOrder,
} from "./types/global.types.js";

class Leaderboard {
  leaderboardTimeout: number = leaderboardRotationSeconds;
  currentTimer: number = 0;
  loadDataTimeout: number = leaderboardDataRefreshSeconds;
  runningAnimation: boolean = false;
  maxVisibleRows: number = leaderboardVisibleRows;
  currentLeaderboardIndex: number = 0;
  dashboardConfigs: DashboardConfig[] = dashboardConfigs;
  dataByDashboardId: Record<string, LeaderboardRow[]> = {};
  dataHeader: Array<keyof LeaderboardRow> = [
    "Timestamp",
    "Player Name",
    "Score",
    "Approve",
  ];
  uiSwitchIntervalId: number | null = null;
  dataRefreshIntervalId: number | null = null;

  async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current);
    return values;
  }

  async appStart() {
    if (!this.dashboardConfigs.length) {
      this.showErrorMessage();
      return;
    }

    this.setBodyState("loading");
    const isDataFetched = await this.fetchData();
    if (!isDataFetched) {
      this.showErrorMessage();
      return;
    }
    this.setBodyState("running");
    this.updateUiWithData();
    this.setActiveLeaderboard(this.dashboardConfigs[this.currentLeaderboardIndex].id);
    this.timeoutAndRefreshAnimation();

    // Rotate visible leaderboard forever.
    this.uiSwitchIntervalId = window.setInterval(async () => {
      if (this.runningAnimation) {
        return;
      }

      if (this.currentTimer >= this.leaderboardTimeout) {
        this.currentTimer = 0;
        await this.switchLeaderboardUi();
      } else {
        await this.timeoutAndRefreshAnimation();
        this.currentTimer += 1;
      }
    }, 1000);

    // Refresh data forever and keep last known data when network errors happen.
    this.dataRefreshIntervalId = window.setInterval(async () => {
      await this.fetchData();
      this.updateUiWithData();
    }, this.loadDataTimeout * 1000);
  }

  setBodyState(type: "loading" | "fail" | "running") {
    const body = document.body;
    if (!body) {
      return;
    }

    if (type === "running") {
      body.classList.remove("loading", "fail");
      return;
    }

    body.classList.remove("loading", "fail");
    body.classList.add(type);
  }

  async fetchData(): Promise<boolean> {
    console.log("Fetching data...");

    let hasAtLeastOneSuccess = false;

    try {
      const resultList = await Promise.all(
        this.dashboardConfigs.map(async (config) => {
          const response = await this.fetchWithTimeout(config.sheetURL, 10000);
          if (!response.ok) {
            throw new Error(`Failed to fetch data for ${config.id}`);
          }
          const sortedRows = await this.dataFilterAndSort(response, config.sort);
          return {
            id: config.id,
            rows: sortedRows,
          };
        }),
      );

      resultList.forEach((result) => {
        hasAtLeastOneSuccess = true;
        this.dataByDashboardId[result.id] = result.rows;
      });

      if (hasAtLeastOneSuccess) {
        this.setBodyState("running");
      }
      return true;
    } catch (error) {
      console.error("Error fetching data:", error);
      return hasAtLeastOneSuccess || Object.keys(this.dataByDashboardId).length > 0;
    }
  }

  showErrorMessage() {
    this.setBodyState("fail");
  }

  async switchLeaderboardUi() {
    if (this.dashboardConfigs.length < 2) {
      return;
    }

    this.runningAnimation = true;

    const nextLeaderboardIndex =
      (this.currentLeaderboardIndex + 1) % this.dashboardConfigs.length;
    const nextLeaderboardId = this.dashboardConfigs[nextLeaderboardIndex].id;

    this.clearActiveLeaderboard();

    // Give CSS a moment to fade out before switching content.
    window.setTimeout(() => {
      this.setActiveLeaderboard(nextLeaderboardId);
      this.currentLeaderboardIndex = nextLeaderboardIndex;
      this.runningAnimation = false;
      this.timeoutAndRefreshAnimation();
    }, 900);
  }

  clearActiveLeaderboard() {
    const leaderboardAsList: NodeListOf<HTMLElement> = document.querySelectorAll(
      ".leaderboard",
    );
    leaderboardAsList.forEach((leaderboard) => {
      leaderboard.classList.remove("is-active");
    });
  }

  setActiveLeaderboard(dashboardId: string) {
    this.updateUiWithData();
    this.clearActiveLeaderboard();

    const leaderboard = document.getElementById(dashboardId);
    if (!leaderboard) {
      return;
    }

    leaderboard.classList.add("is-active");
  }

  updateUiWithData() {
    this.dashboardConfigs.forEach((dashboardConfig) => {
      const leaderboard = document.getElementById(dashboardConfig.id);
      if (!leaderboard) {
        return;
      }

      const rowContainer: HTMLElement | null = leaderboard.querySelector(
        ".content .container",
      );

      if (!rowContainer) {
        return;
      }

      this.rowGenerator(rowContainer, this.dataByDashboardId[dashboardConfig.id] ?? []);
    });
  }

  // this method generate row data and insert into the leaderboard
  rowGenerator(parent: HTMLElement, data: LeaderboardRow[]) {
    // clear / remove previous row data
    parent.innerHTML = "";

    data.forEach((row, index) => {
      const scoreRow = document.createElement("div");
      scoreRow.className = "score-row";

      const nameWrap = document.createElement("div");
      nameWrap.className = "name";

      const serialNode = document.createElement("div");
      serialNode.className = "serial";
      serialNode.textContent = String(index + 1);

      const playerNode = document.createElement("div");
      playerNode.className = "player";
      playerNode.textContent = row["Player Name"];

      const scoreNode = document.createElement("div");
      scoreNode.className = "score";
      scoreNode.textContent = row.Score;

      nameWrap.append(serialNode, playerNode);
      scoreRow.append(nameWrap, scoreNode);
      parent.append(scoreRow);
    });

    if (!data.length) {
      parent.insertAdjacentHTML(
        "beforeend",
        `<div class="score-row"><div class="name"><div class="player">No approved rows yet</div></div><div class="score">--</div></div>`,
      );
    }
  }

  // next refresh animation for time and progress bar in the footer
  timeoutAndRefreshAnimation() {
    const leaderboardList = document.querySelectorAll(".leaderboard");
    if (leaderboardList.length) {
      const leaderboardArray = Array.from(leaderboardList);

      leaderboardArray.forEach((leaderboard) => {
        const footerTimer: HTMLElement | null = leaderboard.querySelector(
          ".footer .timer span",
        );
        const footerProgress: HTMLElement | null = leaderboard.querySelector(
          ".footer .progress-bar .progress",
        );

        if (footerTimer && footerProgress) {
          const remainingSeconds = Math.max(
            1,
            this.leaderboardTimeout - this.currentTimer,
          );
          footerTimer.textContent = String(remainingSeconds);
          footerProgress.style.width =
            String((100 / this.leaderboardTimeout) * this.currentTimer) + "%";
        }
      });
    }
  }

  // filter and serialize data from large to small
  async dataFilterAndSort(
    response: Response,
    type: SortOrder,
  ): Promise<LeaderboardRow[]> {
    const data = await response.text();
    const rows = data
      .split("\n")
      .map((row) => row.trim())
      .filter((row) => row.length > 0)
      .slice(1);

    const filteredRow = rows
      .map((row) => {
        const values = this.parseCsvLine(row).map((item) => item.trim());
        const rowData = Object.fromEntries(
          this.dataHeader.map((header, index) => [header, values[index] ?? ""]),
        );
        return rowData as LeaderboardRow;
      })
      .filter((row) => {
        return (row.Approve ?? "").trim().toLowerCase() === "yes";
      })
      .sort((a, b) => {
        const scoreA = Number(String(a.Score).replace(/\r/g, "").trim());
        const scoreB = Number(String(b.Score).replace(/\r/g, "").trim());
        return type === "high-to-low" ? scoreB - scoreA : scoreA - scoreB;
      });

    return filteredRow.slice(0, this.maxVisibleRows); // return first N rows
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const leaderboard = new Leaderboard();
  await leaderboard.appStart();
});
