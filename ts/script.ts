import type { LeaderboardGameType } from "./types/global.types.js";
import { activityGameSheetURL, crazyPoolSheetURL } from "./config.js";

class Leaderboard {
  activityGameData: string[] = [];
  crazyPoolData: string[] = [];
  currentLeaderboard: LeaderboardGameType = "Activity Game";
  dataHeader: string[] = [
    "Timestamp",
    "Player Name",
    "Game Type",
    "Score",
    "Approve",
  ];

  async appStart() {
    setTimeout(() => {});
  }

  async fetchData() {
    try {
      const activityGameResponse = await fetch(activityGameSheetURL);

      if (!activityGameResponse.ok) {
        throw new Error("Failed to fetch data");
      }
      await this.dataFilterAndSort(activityGameResponse, "high-to-low");
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  // filter and serialize data from large to small
  async dataFilterAndSort(response: Response, type: 'low-to-high' | 'high-to-low') {
    const data = await response.text();
    const rows = data.split("\n").slice(1);

    const filteredRow = rows
      .map((row) => {
        return Object.fromEntries(
          this.dataHeader.map((header, index) => [
            header,
            row.split(",")[index],
          ]),
        );
      })
      .sort((a, b) => {
        const scoreA = Number(String(a.Score).replace(/\r/g, "").trim());
        const scoreB = Number(String(b.Score).replace(/\r/g, "").trim());
        return type === "high-to-low" ? scoreB - scoreA : scoreA - scoreB;
      });

    console.log("filteredRow => ", filteredRow);
  }

  // filter and serilize data from small to large
  smallToLargeShorter() {}

  async filterAndSerializeData() {}

  processData() {
    console.log("Activity Game Data:", this.activityGameData);

    // Implement data processing logic here
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const leaderboard = new Leaderboard();
  await leaderboard.fetchData();
  leaderboard.processData();
});
