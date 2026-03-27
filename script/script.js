import { activityGameSheetURL, crazyPoolSheetURL } from "./config.js";
class Leaderboard {
    leaderboardTimeout = 15;
    currentTimer = 0;
    loadDataTimeout = 15;
    runningAnimation = false;
    activityGameData = [];
    crazyPoolData = [];
    currentLeaderboard = "activity-game";
    dataHeader = [
        "Timestamp",
        "Player Name",
        "Score",
        "Approve",
    ];
    async appStart() {
        const isDataFetched = await this.fetchData();
        if (!isDataFetched) {
            this.showErrorMessage();
            return;
        }
        await this.switchLeaderboardUi();
        // change leaderboard ui
        setInterval(async () => {
            if (this.currentTimer >= this.leaderboardTimeout) {
                this.currentTimer = 0;
                await this.switchLeaderboardUi();
            }
            else {
                this.currentTimer += 1;
                await this.timeoutAndRefreshAnimation();
            }
        }, 1000);
        // pull data from google sheet
        setTimeout(async () => {
            await this.fetchData();
        }, this.loadDataTimeout * 1000);
    }
    async fetchData() {
        console.log("Fetching data...");
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
            console.log("Data fetched successfully:", {
                activityGameData,
                crazyPoolData,
            });
            this.activityGameData = activityGameData;
            this.crazyPoolData = crazyPoolData;
            return true;
        }
        catch (error) {
            console.error("Error fetching data:", error);
            return false;
        }
    }
    showErrorMessage() {
        const body = document.querySelector("body");
        if (body) {
            body.setAttribute("class", "fail");
        }
    }
    async switchLeaderboardUi() {
        this.runningAnimation = true;
        const getBody = document.querySelector("body");
        if (getBody) {
            // hide current leaderboard or loading spinner
            getBody.setAttribute("class", "");
            // wait for current animation complete and  update html with the latest data
            const leaveAnimation = setTimeout(() => {
                this.updateUiWithData();
            }, 1000);
            const timer = setTimeout(() => {
                console.log("trigger animation with set timeout", this.currentLeaderboard);
                getBody.classList.add(this.currentLeaderboard);
                this.currentLeaderboard =
                    this.currentLeaderboard === "activity-game"
                        ? "crazy-pool"
                        : "activity-game";
                clearTimeout(timer);
                clearTimeout(leaveAnimation);
                this.runningAnimation = false;
            }, 1500);
        }
    }
    // this method updates the UI with the latest data based on the current leaderboard type
    async updateUiWithData() {
        console.log("Updating UI with data for:", this.currentLeaderboard);
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
    // this method generate row data and insert into the leaderboard
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
    // next refresh animation for time and progress bar in the footer
    async timeoutAndRefreshAnimation() {
        const leaderboardList = document.querySelectorAll(".leaderboard");
        if (leaderboardList.length) {
            const leaderboardArray = Array.from(leaderboardList);
            leaderboardArray.forEach((leaderboard) => {
                const leaderboardFooter = leaderboard.querySelector(".footer");
                const footerTimer = leaderboard.querySelector(".footer .timer span");
                const footerProgress = leaderboard.querySelector(".footer .progress-bar .progress");
                if (leaderboardFooter && footerTimer && footerProgress) {
                    footerTimer.textContent = String(this.leaderboardTimeout - this.currentTimer);
                    footerProgress.style.width =
                        String((100 / this.leaderboardTimeout) * this.currentTimer) + "%";
                }
            });
        }
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
            .filter((row) => {
            console.log("Filtering row:", row);
            return row.Approve.trim().toLowerCase() === "yes";
        })
            .sort((a, b) => {
            const scoreA = Number(String(a.Score).replace(/\r/g, "").trim());
            const scoreB = Number(String(b.Score).replace(/\r/g, "").trim());
            return type === "high-to-low" ? scoreB - scoreA : scoreA - scoreB;
        });
        return filteredRow.slice(0, 5); // return first 5 rows
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    const leaderboard = new Leaderboard();
    await leaderboard.appStart();
});
