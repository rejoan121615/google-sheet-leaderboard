# Leaderboard Google Sheet Setup (TypeScript)

This project reads leaderboard data from Google Sheets CSV links defined in `ts/config.ts`.

## Required Header Row (exact names)

Your Google Sheet must have this exact first row (case and spacing matter):

1. `Timestamp`
2. `Player Name`
3. `Score`
4. `Approve`

The script maps columns by these exact header names in `ts/script.ts`.

## Data Rules for Efficient Pulling

Follow these rules so `ts/script.ts` can parse and sort correctly:

1. Keep the first row as headers only.
2. Do not add blank rows inside the data.
3. Avoid trailing empty lines at the end of the sheet.
4. `Score` must be numeric (example: `120`, `45`, `9`).
5. `Approve` must be `yes` (any case works: `yes`, `YES`, `Yes`) for a row to be included.
6. Rows with `Approve` not equal to `yes` are ignored.
7. Avoid commas in cell values (especially `Player Name`) because the parser uses a simple comma split.

## How Sorting Works

From `ts/script.ts`:

1. `activity-game` data is sorted `high-to-low` by `Score`.
2. `crazy-pool` data is sorted `low-to-high` by `Score`.
3. Only approved rows are kept.
4. Only top 5 rows are shown after sorting.

## Google Sheet Configuration Steps

Use one spreadsheet with two tabs (recommended):

1. Create tab 1 for Activity Game leaderboard.
2. Create tab 2 for Crazy Pool leaderboard.
3. Put the required header row in row 1 of each tab.
4. Add your data rows under the headers.

Then publish as CSV:

1. In Google Sheets, go to `File > Share > Publish to web`.
2. Choose each tab and publish it.
3. Use the published CSV URL format:
   - `https://docs.google.com/spreadsheets/d/e/<PUBLISHED_ID>/pub?gid=<TAB_GID>&single=true&output=csv`
4. Update URLs in `ts/config.ts`:
   - `activityGameSheetURL` -> Activity Game tab CSV URL
   - `crazyPoolSheetURL` -> Crazy Pool tab CSV URL

## Current URL Location in Code

Edit these exports in `ts/config.ts`:

- `activityGameSheetURL`
- `crazyPoolSheetURL`

After updating the TypeScript files, compile as usual so the generated JavaScript uses the latest URLs.
