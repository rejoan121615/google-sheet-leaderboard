export type SortOrder = "low-to-high" | "high-to-low";

export type LeaderboardRow = {
	Timestamp: string;
	"Player Name": string;
	Score: string;
	Approve: string;
};

export type DashboardConfig = {
	id: string;
	sheetURL: string;
	sort: SortOrder;
};