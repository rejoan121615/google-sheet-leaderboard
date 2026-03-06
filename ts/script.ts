import type { LeaderboardGameType } from "./types/global.types.js";
import { activityGameSheetURL, crazyPoolSheetURL } from "./config.js";

class Leaderboard {
  activityGameData: Record<string, string>[] = [];
  crazyPoolData: Record<string, string>[] = [];
  currentLeaderboard: LeaderboardGameType = "Activity Game";
  dataHeader: string[] = [
    "Timestamp",
    "Player Name",
    "Game Type",
    "Score",
    "Approve",
  ];

  async appStart() {
    setInterval(() => {
      this.fetchData();
      console.log("Data fetching started...");
      console.log("Current Leaderboard:", this.currentLeaderboard);
      console.log("Activity Game Data:", this.activityGameData);
      console.log("Crazy Pool Data:", this.crazyPoolData);
    }, 10000);
  }

  async fetchData() {
    Promise.all([fetch(activityGameSheetURL), fetch(crazyPoolSheetURL)])
      .then(async ([activityGameResponse, crazyPoolResponse]) => {
        if (!activityGameResponse.ok || !crazyPoolResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const activityGameData = await this.dataFilterAndSort(
          activityGameResponse,
          "high-to-low",
        );
        const crazyPoolData = await this.dataFilterAndSort(
          crazyPoolResponse,
          "high-to-low",
        );

        this.activityGameData = activityGameData;
        this.crazyPoolData = crazyPoolData;
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }

  // filter and serialize data from large to small
  async dataFilterAndSort(
    response: Response,
    type: "low-to-high" | "high-to-low",
  ): Promise<Record<string, string>[]> {
    const data = await response.text();
    const rows = data.split("\n").slice(1);

    const filteredRow = rows
      .map((row) => {
        return Object.fromEntries(
          this.dataHeader.map((header, index) => [
            header,
            row.split(",").map((item) => item.trimEnd())[index],
          ]),
        );
      })
      .sort((a, b) => {
        const scoreA = Number(String(a.Score).replace(/\r/g, "").trim());
        const scoreB = Number(String(b.Score).replace(/\r/g, "").trim());
        return type === "high-to-low" ? scoreB - scoreA : scoreA - scoreB;
      });

    return filteredRow;
  }

}

document.addEventListener("DOMContentLoaded", async () => {
  const leaderboard = new Leaderboard();
  await leaderboard.appStart();
 
});
