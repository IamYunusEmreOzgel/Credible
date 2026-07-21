const historySupabase = window.credibleSupabase;
const historyList = document.querySelector("#history-list");
const historyStatus = document.querySelector("#history-status");
const logoutButton = document.querySelector("#logout-button");

initializeHistory();
logoutButton.addEventListener("click", logout);

async function initializeHistory() {
    if (!historySupabase) {
        historyStatus.textContent = "Geçmiş kayıtlar şu anda yüklenemiyor.";
        return;
    }

    const { data, error } = await historySupabase.auth.getUser();

    if (error || !data.user) {
        window.location.replace("login.html");
        return;
    }

    await loadHistory();
}

async function loadHistory() {
    const { data, error } = await historySupabase
        .from("food_entries")
        .select("id, entry_date, food_name, portion_grams, calories, protein, fat, carbohydrates, created_at")
        .lt("entry_date", getTodayKey())
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        historyStatus.textContent = "Geçmiş kayıtlar alınamadı.";
        return;
    }

    if (!data || data.length === 0) {
        historyStatus.textContent = "Henüz geçmiş güne ait bir kayıt bulunmuyor.";
        return;
    }

    historyStatus.hidden = true;
    renderHistory(groupByDate(data));
}

function groupByDate(entries) {
    return entries.reduce((groups, entry) => {
        if (!groups[entry.entry_date]) groups[entry.entry_date] = [];
        groups[entry.entry_date].push(entry);
        return groups;
    }, {});
}

function renderHistory(groups) {
    historyList.innerHTML = "";

    Object.entries(groups).forEach(([date, entries], index) => {
        const totals = entries.reduce((sum, entry) => ({
            calories: sum.calories + Number(entry.calories || 0),
            protein: sum.protein + Number(entry.protein || 0),
            fat: sum.fat + Number(entry.fat || 0),
            carbohydrates: sum.carbohydrates + Number(entry.carbohydrates || 0)
        }), { calories: 0, protein: 0, fat: 0, carbohydrates: 0 });

        const details = document.createElement("details");
        details.className = "history-day";
        if (index === 0) details.open = true;

        const summary = document.createElement("summary");
        summary.innerHTML = `
            <div class="history-date"><strong>${formatDate(date)}</strong><span>${entries.length} kayıt</span></div>
            <div class="history-metric"><span>Kalori</span><strong>${formatNumber(totals.calories)} kcal</strong></div>
            <div class="history-metric"><span>Protein</span><strong>${formatNumber(totals.protein)} g</strong></div>
            <div class="history-metric"><span>Karbonhidrat</span><strong>${formatNumber(totals.carbohydrates)} g</strong></div>
            <div class="history-metric"><span>Yağ</span><strong>${formatNumber(totals.fat)} g</strong></div>`;

        const entryContainer = document.createElement("div");
        entryContainer.className = "history-entries";

        entries.forEach((entry) => {
            const item = document.createElement("article");
            item.className = "history-entry";
            item.innerHTML = `
                <div><h3></h3><p></p></div>
                <div class="history-entry-values"><strong></strong><small></small></div>`;
            item.querySelector("h3").textContent = entry.food_name;
            item.querySelector("p").textContent = `${formatNumber(entry.portion_grams)} gram`;
            item.querySelector("strong").textContent = `${formatNumber(entry.calories)} kcal`;
            item.querySelector("small").textContent = `${formatNumber(entry.protein)} g protein · ${formatNumber(entry.carbohydrates)} g karbonhidrat · ${formatNumber(entry.fat)} g yağ`;
            entryContainer.append(item);
        });

        details.append(summary, entryContainer);
        historyList.append(details);
    });
}

async function logout() {
    logoutButton.disabled = true;
    await historySupabase.auth.signOut();
    window.location.replace("login.html");
}

function formatDate(date) {
    return new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long"
    }).format(new Date(`${date}T12:00:00`));
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

function getTodayKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}