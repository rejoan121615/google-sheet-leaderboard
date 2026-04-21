import { dashboardConfigs, initializeDashboardConfigs, leaderboardDataRefreshSeconds, leaderboardRotationSeconds, leaderboardVisibleRows, } from "./config.js";
class LeaderboardAppError extends Error {
    type;
    constructor(type, message) {
        super(message);
        this.type = type;
        this.name = "LeaderboardAppError";
    }
}
class Leaderboard {
    leaderboardTimeout = leaderboardRotationSeconds;
    currentTimer = 0;
    loadDataTimeout = leaderboardDataRefreshSeconds;
    runningAnimation = false;
    maxVisibleRows = leaderboardVisibleRows;
    currentLeaderboardIndex = 0;
    dashboardConfigs = [];
    dataByDashboardId = {};
    dataHeader = [
        "Timestamp",
        "Player Name",
        "Score",
        "Approve",
    ];
    uiSwitchIntervalId = null;
    dataRefreshIntervalId = null;
    constructor() {
        // Use dynamically loaded dashboard configs
        this.dashboardConfigs = dashboardConfigs;
        window.addEventListener("offline", () => {
            this.showErrorMessage("offline");
        });
        window.addEventListener("online", async () => {
            const hasData = Object.keys(this.dataByDashboardId).length > 0;
            if (hasData) {
                this.setBodyState("running");
            }
            await this.fetchData();
            this.updateUiWithData();
        });
    }
    getErrorContent(type) {
        if (type === "offline") {
            return {
                title: "No Internet Connection",
                description: "Network disconnected. Leaderboard will reconnect automatically when internet returns.",
            };
        }
        if (type === "request-failed") {
            return {
                title: "Leaderboard Data Unavailable",
                description: "Failed to load Google Sheet data. Check the sheet URL, sharing permissions, and published CSV link.",
            };
        }
        if (type === "all-dashboards-hidden") {
            return {
                title: "No Dashboards Available",
                description: "All dashboards are currently hidden. Please update your Google Sheet configuration and set at least one dashboard Visibility to 'Show'.",
            };
        }
        return {
            title: "Internal Application Error",
            description: "Unexpected error in leaderboard app. Please refresh the display or restart the device.",
        };
    }
    getErrorElement() {
        return document.getElementById("error");
    }
    getLoadingElement() {
        return document.getElementById("loading");
    }
    createLoadingElement() {
        const loadingElement = document.createElement("div");
        loadingElement.className = "loading";
        loadingElement.id = "loading";
        loadingElement.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Loading leaderboards...</p>
    `;
        return loadingElement;
    }
    createErrorElement() {
        const errorElement = document.createElement("div");
        errorElement.className = "error";
        errorElement.id = "error";
        return errorElement;
    }
    ensureLoadingElement() {
        const existingLoadingElement = this.getLoadingElement();
        if (existingLoadingElement) {
            return existingLoadingElement;
        }
        const loadingElement = this.createLoadingElement();
        document.body.append(loadingElement);
        return loadingElement;
    }
    ensureErrorElement() {
        const existingErrorElement = this.getErrorElement();
        if (existingErrorElement) {
            return existingErrorElement;
        }
        const errorElement = this.createErrorElement();
        document.body.append(errorElement);
        return errorElement;
    }
    removeLoadingElement() {
        this.getLoadingElement()?.remove();
    }
    removeErrorElement() {
        this.getErrorElement()?.remove();
    }
    getDashboardIdFromName(name) {
        return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/-+/g, "-");
    }
    getLeaderboardContainer() {
        return document.querySelector(".leaderboard-container");
    }
    getBoardOrderText(sort) {
        return sort === "high-to-low"
            ? "Highscores Today!"
            : "Lowest Scores Today!";
    }
    createLeaderboardElement(dashboardConfig) {
        const leaderboardId = this.getDashboardIdFromName(dashboardConfig.name);
        const leaderboard = document.createElement("div");
        leaderboard.className = "leaderboard";
        leaderboard.id = leaderboardId;
        leaderboard.innerHTML = `
      <div class="header">
        <h3 class="board-order">${this.getBoardOrderText(dashboardConfig.sort)}</h3>
        <div class="container">
          <h1 class="title">${dashboardConfig.name}</h1>
          <div class="logo">
            <img src="./images/logo.png" alt="Bar Logo">
          </div>
        </div>
      </div>
      <div class="content">
        <div class="container"></div>
      </div>
      <div class="footer">
        <div class="container">
          <div class="refresh-timer">
            <h3>Next board refresh</h3>
            <h6 class="timer"><span>${this.leaderboardTimeout}</span> sec</h6>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress"></div>
        </div>
      </div>
    `;
        return leaderboard;
    }
    renderLeaderboardSkeletons() {
        const leaderboardContainer = this.getLeaderboardContainer();
        if (!leaderboardContainer) {
            return false;
        }
        leaderboardContainer.innerHTML = "";
        this.dashboardConfigs.forEach((dashboardConfig) => {
            leaderboardContainer.append(this.createLeaderboardElement(dashboardConfig));
        });
        return true;
    }
    setErrorUi(type) {
        const errorElement = this.ensureErrorElement();
        const content = this.getErrorContent(type);
        errorElement.className = `error error--${type}`;
        errorElement.innerHTML = `<h2 class="error-title">${content.title}</h2><p class="error-description">${content.description}</p>`;
    }
    resolveErrorType(error) {
        if (!navigator.onLine) {
            return "offline";
        }
        if (error instanceof LeaderboardAppError) {
            return error.type;
        }
        return "internal";
    }
    async fetchWithTimeout(url, timeoutMs) {
        if (!navigator.onLine) {
            throw new LeaderboardAppError("offline", "Device is offline");
        }
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, {
                cache: "no-store",
                signal: controller.signal,
            });
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                throw new LeaderboardAppError("request-failed", "Request timed out while fetching sheet data");
            }
            throw new LeaderboardAppError(this.resolveErrorType(error), "Request failed while fetching sheet data");
        }
        finally {
            window.clearTimeout(timeoutId);
        }
    }
    parseCsvLine(line) {
        const values = [];
        let current = "";
        let inQuotes = false;
        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];
            const nextChar = line[index + 1];
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    index += 1;
                }
                else {
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
            this.showErrorMessage("all-dashboards-hidden");
            return;
        }
        const hasRenderedLeaderboardSkeletons = this.renderLeaderboardSkeletons();
        if (!hasRenderedLeaderboardSkeletons) {
            this.showErrorMessage("internal");
            return;
        }
        this.setBodyState("loading");
        const isDataFetched = await this.fetchData();
        if (!isDataFetched) {
            return;
        }
        this.setBodyState("running");
        this.updateUiWithData();
        this.setActiveLeaderboard(this.getDashboardIdFromName(this.dashboardConfigs[this.currentLeaderboardIndex].name));
        this.timeoutAndRefreshAnimation();
        // Rotate visible leaderboard forever.
        this.uiSwitchIntervalId = window.setInterval(async () => {
            if (this.runningAnimation) {
                return;
            }
            if (this.currentTimer >= this.leaderboardTimeout) {
                this.currentTimer = 0;
                await this.switchLeaderboardUi();
            }
            else {
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
    setBodyState(type) {
        const body = document.body;
        if (!body) {
            return;
        }
        if (type === "loading") {
            this.ensureLoadingElement();
            this.removeErrorElement();
            body.classList.remove("fail", "running");
            body.classList.add("loading");
            return;
        }
        if (type === "fail") {
            this.removeLoadingElement();
            body.classList.remove("loading", "running");
            body.classList.add("fail");
            return;
        }
        this.removeLoadingElement();
        this.removeErrorElement();
        body.classList.remove("loading", "fail");
        body.classList.add("running");
    }
    async fetchData() {
        console.log("Fetching data...");
        const resultList = await Promise.allSettled(this.dashboardConfigs.map(async (config) => {
            const response = await this.fetchWithTimeout(config.sheetURL, 10000);
            if (!response.ok) {
                throw new LeaderboardAppError("request-failed", `Failed to fetch data for ${config.name}`);
            }
            const sortedRows = await this.dataFilterAndSort(response, config.sort);
            const dashboardId = this.getDashboardIdFromName(config.name);
            return {
                id: dashboardId,
                rows: sortedRows,
            };
        }));
        let hasAtLeastOneSuccess = false;
        const failureTypes = new Set();
        resultList.forEach((result) => {
            if (result.status === "fulfilled") {
                hasAtLeastOneSuccess = true;
                this.dataByDashboardId[result.value.id] = result.value.rows;
                return;
            }
            const resolvedErrorType = this.resolveErrorType(result.reason);
            failureTypes.add(resolvedErrorType);
            console.error("Error fetching data:", result.reason);
        });
        if (hasAtLeastOneSuccess) {
            this.setBodyState("running");
            return true;
        }
        const hasCachedData = Object.keys(this.dataByDashboardId).length > 0;
        if (hasCachedData) {
            this.showErrorMessage(failureTypes.has("offline") ? "offline" : "request-failed");
            return true;
        }
        const errorType = failureTypes.has("offline")
            ? "offline"
            : failureTypes.has("request-failed")
                ? "request-failed"
                : "internal";
        this.showErrorMessage(errorType);
        return false;
    }
    showErrorMessage(type) {
        this.setErrorUi(type);
        this.setBodyState("fail");
    }
    async switchLeaderboardUi() {
        if (this.dashboardConfigs.length < 2) {
            return;
        }
        this.runningAnimation = true;
        const nextLeaderboardIndex = (this.currentLeaderboardIndex + 1) % this.dashboardConfigs.length;
        const nextLeaderboardId = this.getDashboardIdFromName(this.dashboardConfigs[nextLeaderboardIndex].name);
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
        const leaderboardAsList = document.querySelectorAll(".leaderboard");
        leaderboardAsList.forEach((leaderboard) => {
            leaderboard.classList.remove("is-active");
        });
    }
    setActiveLeaderboard(dashboardId) {
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
            const dashboardId = this.getDashboardIdFromName(dashboardConfig.name);
            const leaderboard = document.getElementById(dashboardId);
            if (!leaderboard) {
                return;
            }
            const rowContainer = leaderboard.querySelector(".content .container");
            if (!rowContainer) {
                return;
            }
            this.rowGenerator(rowContainer, this.dataByDashboardId[dashboardId] ?? []);
        });
    }
    // this method generate row data and insert into the leaderboard
    rowGenerator(parent, data) {
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
            parent.insertAdjacentHTML("beforeend", `<div class="score-row"><div class="name"><div class="player">No approved rows yet</div></div><div class="score">--</div></div>`);
        }
    }
    // next refresh animation for time and progress bar in the footer
    timeoutAndRefreshAnimation() {
        const leaderboardList = document.querySelectorAll(".leaderboard");
        if (leaderboardList.length) {
            const leaderboardArray = Array.from(leaderboardList);
            leaderboardArray.forEach((leaderboard) => {
                const footerTimer = leaderboard.querySelector(".footer .timer span");
                const footerProgress = leaderboard.querySelector(".footer .progress-bar .progress");
                if (footerTimer && footerProgress) {
                    const remainingSeconds = Math.max(1, this.leaderboardTimeout - this.currentTimer);
                    footerTimer.textContent = String(remainingSeconds);
                    footerProgress.style.width =
                        String((100 / this.leaderboardTimeout) * this.currentTimer) + "%";
                }
            });
        }
    }
    // filter and serialize data from large to small
    async dataFilterAndSort(response, type) {
        const data = await response.text();
        const rows = data
            .split("\n")
            .map((row) => row.trim())
            .filter((row) => row.length > 0)
            .slice(1);
        const filteredRow = rows
            .map((row) => {
            const values = this.parseCsvLine(row).map((item) => item.trim());
            const rowData = Object.fromEntries(this.dataHeader.map((header, index) => [header, values[index] ?? ""]));
            return rowData;
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
    try {
        await initializeDashboardConfigs();
    }
    catch (error) {
        console.error("Failed to initialize dashboard configurations");
    }
    const leaderboard = new Leaderboard();
    await leaderboard.appStart();
});
