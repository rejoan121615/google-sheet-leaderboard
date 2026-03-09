import { activityGameSheetURL, crazyPoolSheetURL } from "./config.js";
class Leaderboard {
    activityGameData = [];
    crazyPoolData = [];
    currentLeaderboard = "activity-game";
    dataHeader = [
        "Timestamp",
        "Player Name",
        "Game Type",
        "Score",
        "Approve",
    ];
    async appStart() {
        // render for the first time
        this.leaderboardController();
        // fetch after every 10 seconds to update the leaderboard data
        setInterval(async () => {
            this.leaderboardController();
        }, 10000);
    }
    async leaderboardController() {
        await this.fetchData();
        await this.switchLeaderboardUi();
        await this.updateUiWithData();
        console.log("Data fetching started...");
        console.log("Current Leaderboard:", this.currentLeaderboard);
        console.log("Activity Game Data:", this.activityGameData);
        console.log("Crazy Pool Data:", this.crazyPoolData);
    }
    async fetchData() {
        try {
            const [activityGameResponse, crazyPoolResponse] = await Promise.all([
                fetch(activityGameSheetURL),
                fetch(crazyPoolSheetURL),
            ]);
            if (!activityGameResponse.ok || !crazyPoolResponse.ok) {
                throw new Error("Failed to fetch data");
            }
            const activityGameData = await this.dataFilterAndSort(activityGameResponse, "high-to-low");
            const crazyPoolData = await this.dataFilterAndSort(crazyPoolResponse, "low-to-high");
            this.activityGameData = activityGameData;
            this.crazyPoolData = crazyPoolData;
        }
        catch (error) {
            console.error("Error fetching data:", error);
        }
    }
    async switchLeaderboardUi() {
        const getBody = document.querySelector("body");
        if (getBody) {
            getBody.setAttribute("class", "");
            const timer = setTimeout(() => {
                getBody.classList.add(this.currentLeaderboard);
                this.currentLeaderboard =
                    this.currentLeaderboard === "activity-game"
                        ? "crazy-pool"
                        : "activity-game";
                clearTimeout(timer);
            }, 1500);
        }
    }
    async updateUiWithData() {
        const leaderboardAsList = document.querySelectorAll(".leaderboard");
        if (leaderboardAsList.length) {
            const leaderboardArray = Array.from(leaderboardAsList);
            leaderboardArray.forEach((leaderboard) => {
                const rowContainer = leaderboard.querySelector(".content .container");
                if (rowContainer) {
                    this.rowGenerator(rowContainer, this.currentLeaderboard === "activity-game"
                        ? this.activityGameData
                        : this.crazyPoolData);
                }
            });
        }
    }
    async rowGenerator(parent, data) {
        // clear / remove previous row data
        parent.innerHTML = "";
        data.forEach((row, index) => {
            const serial = index + 1;
            const name = row["Player Name"];
            const score = row["Score"];
            parent.insertAdjacentHTML("beforeend", `
    <div class="score-row">
        <div class="name">
            <div class="serial">${serial}</div>
            <div class="player">${name}</div>
        </div>
        <div class="score">${score}</div>
    </div>
    `);
        });
    }
    // filter and serialize data from large to small
    async dataFilterAndSort(response, type) {
        const data = await response.text();
        const rows = data.split("\n").slice(1);
        const filteredRow = rows
            .map((row) => {
            return Object.fromEntries(this.dataHeader.map((header, index) => [
                header,
                row.split(",").map((item) => item.trimEnd())[index],
            ]));
        })
            .sort((a, b) => {
            const scoreA = Number(String(a.Score).replace(/\r/g, "").trim());
            const scoreB = Number(String(b.Score).replace(/\r/g, "").trim());
            return type === "high-to-low" ? scoreB - scoreA : scoreA - scoreB;
        })
            .filter((row) => row.Approve.toLowerCase() === "yes");
        return filteredRow.slice(0, 5); // return first 5 rows
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    const leaderboard = new Leaderboard();
    await leaderboard.appStart();
});
