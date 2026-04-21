export async function loadDashboardConfigsFromSheet(sheetUrl) {
    try {
        // Add cache-busting parameter to URL (timestamp ensures fresh fetch)
        const cacheBustUrl = `${sheetUrl}${sheetUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
        const response = await fetch(cacheBustUrl, {
            method: "GET",
            cache: "no-store", // Prevent browser from caching
            headers: {
                "Pragma": "no-cache",
                "Cache-Control": "no-cache, no-store, max-age=0",
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch config sheet: ${response.statusText}`);
        }
        console.log('dashboard response', response);
        const csvText = await response.text();
        console.log('dashboard csvText', csvText);
        const configs = parseConfigCsv(csvText);
        console.log('dashboard configs', configs);
        console.log(`Config sheet fetched with cache buster: t=${Date.now()}`);
        return configs;
    }
    catch (error) {
        console.error("Error loading dashboard configs from sheet:", error);
        throw error;
    }
}
function parseConfigCsv(csvText) {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
        return [];
    }
    // Parse header
    const headers = parseCSVLine(lines[0]).map((h) => h.trim());
    console.log("Parsed headers:", headers);
    // Find column indices (match your actual column names)
    const nameIndex = headers.findIndex((h) => h.toLowerCase().includes("leaderboard") ||
        h.toLowerCase().includes("dashboard name") ||
        h.toLowerCase().includes("title") ||
        h.toLowerCase().includes("name") ||
        h.toLowerCase() === "game");
    const urlIndex = headers.findIndex((h) => h.toLowerCase().includes("sheet") ||
        h.toLowerCase().includes("url") ||
        h.toLowerCase().includes("leaderboard csv url") ||
        h.toLowerCase().includes("csv"));
    const sortIndex = headers.findIndex((h) => h.toLowerCase().includes("sort") ||
        h.toLowerCase().includes("order") ||
        h.toLowerCase().includes("view"));
    const visibilityIndex = headers.findIndex((h) => h.toLowerCase().includes("status") ||
        h.toLowerCase().includes("visibility") ||
        h.toLowerCase().includes("show"));
    console.log("Column indices - nameIndex:", nameIndex, "urlIndex:", urlIndex, "sortIndex:", sortIndex, "visibilityIndex:", visibilityIndex);
    if (nameIndex === -1 || urlIndex === -1) {
        console.error("Available columns:", headers);
        throw new Error(`Config sheet missing required columns. Found: ${headers.join(", ")}`);
    }
    // Parse rows
    const configs = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "")
            continue; // Skip empty lines
        const values = parseCSVLine(lines[i]);
        const name = values[nameIndex]?.trim() || "";
        const sheetURL = values[urlIndex]?.trim() || "";
        const sort = (values[sortIndex]?.trim().toLowerCase() || "high-to-low");
        const visibility = values[visibilityIndex]?.trim().toLowerCase() || "show";
        console.log(`Processing row: name="${name}", visibility="${visibility}", sort="${sort}"`);
        // Skip if visibility is "hide" or "hidden"
        if (visibility === "hide" || visibility === "hidden") {
            console.log(`Skipping "${name}" - marked as hidden`);
            continue;
        }
        // Only add if name and URL are present
        if (name && sheetURL) {
            configs.push({
                name,
                sheetURL,
                sort,
            });
            console.log(`Added "${name}" to configs`);
        }
    }
    return configs;
}
function parseCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            }
            else {
                // Toggle quote state
                insideQuotes = !insideQuotes;
            }
        }
        else if (char === "," && !insideQuotes) {
            // End of field
            result.push(current.trim());
            current = "";
        }
        else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
