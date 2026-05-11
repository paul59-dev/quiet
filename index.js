const DEFAULT_EXOS = ["20 Pompes", "30 Squats", "1min Gainage", "40 Jumping Jacks", "15 Burpees", "20 Fentes", "30 Abdos", "10 Tractions", "2min Course", "10mn Étirements"];

const RANKS = [
    { name: "Non Classé", min: 0, icon: "⚪", color: "#94a3b8" },
    { name: "Bronze", min: 50, icon: "🥉", color: "#cd7f32" },
    { name: "Argent", min: 150, icon: "🥈", color: "#c0c0c0" },
    { name: "Or", min: 300, icon: "🥇", color: "#ffd700" },
    { name: "Platine", min: 600, icon: "💎", color: "#e5e4e2" },
    { name: "Légende", min: 1000, icon: "👑", color: "#a855f7" }
];

// Initialisation du State
let state = JSON.parse(localStorage.getItem('eveil_v6_final')) || {
    points: 0, 
    prestige: 0,
    startDate: new Date().getTime(),
    sportHistory: {},
    lastCheckDate: new Date().toLocaleDateString('en-CA'),
    lastSeasonMonth: new Date().getMonth(),
    customExos: [...DEFAULT_EXOS]
};

let currentViewDate = new Date();

function save() { localStorage.setItem('eveil_v6_final', JSON.stringify(state)); }

// Vérifications temporelles (Reset 2 mois et changement de jour)
function temporalChecks() {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const currentMonth = now.getMonth();

    // Reset Saison tous les 2 mois (Jan, Mar, Mai, Juil, Sept, Nov)
    const lastBlock = Math.floor(state.lastSeasonMonth / 2);
    const currentBlock = Math.floor(currentMonth / 2);

    if (currentBlock !== lastBlock) {
        state.points = Math.max(0, state.points - 200);
        state.lastSeasonMonth = currentMonth;
        console.log("Nouvelle saison de 2 mois ! -200 LP");
    }

    // Mise à jour de la date (Pas de malus quotidien ici)
    if (state.lastCheckDate !== todayStr) {
        state.lastCheckDate = todayStr;
    }
    
    save();
}

function updateUI() {
    let cur = RANKS[0], next = RANKS[1];
    for (let r of RANKS) { if (state.points >= r.min) { cur = r; next = RANKS[RANKS.indexOf(r)+1] || r; } }
    
    document.getElementById('rank-medal').innerText = cur.icon;
    document.getElementById('rank-name').innerText = cur.name;
    document.getElementById('rank-name').style.color = cur.color;
    document.getElementById('lp-val').innerText = state.points;
    
    const pArea = document.getElementById('prestige-area');
    const activeClass = state.prestige > 0 ? "prestige-active" : "";
    pArea.innerHTML = `<div class="prestige-badge ${activeClass}">PRESTIGE ${state.prestige}</div>`;
    
    document.getElementById('prestige-btn').style.display = state.points >= 1000 ? "block" : "none";
    
    const range = next.min - cur.min;
    const prog = next === cur ? 100 : ((state.points - cur.min) / range) * 100;
    document.getElementById('progress-bar').style.width = `${prog}%`;
    document.getElementById('next-rank-label').innerText = next === cur ? "RANG MAX ATTEINT" : `Objectif ${next.name} : ${next.min} LP`;
}

function renderExos() {
    const t = new Date().toLocaleDateString('en-CA');
    const done = state.sportHistory[t] || [];
    const container = document.getElementById('exo-list');
    
    container.innerHTML = state.customExos.map((ex, i) => `
        <div class="exo-item ${done.includes(i) ? 'checked' : ''}" id="item-${i}">
            <div class="exo-content">
                <input type="checkbox" ${done.includes(i) ? 'checked' : ''} onclick="toggleExo(${i})">
                <div class="exo-text" id="text-${i}" onclick="if(this.contentEditable !== 'true') toggleExo(${i})" 
                     onblur="finishEdit(${i})" onkeydown="checkEnter(event, ${i})">${ex}</div>
            </div>
            <button class="btn-edit" id="btn-edit-${i}" onclick="enableEdit(${i})">✏️</button>
        </div>
    `).join('');
    document.getElementById('exo-count').innerText = `${done.length}/10`;
}

function toggleExo(i) {
    const t = new Date().toLocaleDateString('en-CA');
    if (!state.sportHistory[t]) state.sportHistory[t] = [];
    
    if (!state.sportHistory[t].includes(i)) {
        state.sportHistory[t].push(i);
        state.points += 1;
    } else {
        state.sportHistory[t] = state.sportHistory[t].filter(x => x !== i);
        state.points = Math.max(0, state.points - 1);
    }
    save(); renderExos(); renderCalendar(); updateUI();
}

function renderCalendar() {
    const cal = document.getElementById('calendar'); cal.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    document.getElementById('month-label').innerText = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentViewDate);
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toLocaleDateString('en-CA');

    for(let i=1; i<=daysInMonth; i++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const count = (state.sportHistory[dStr] || []).length;
        
        // Indicateur Reset : 1er jour des mois pairs (Jan=0, Mar=2, etc.)
        const isResetDay = (i === 1 && month % 2 === 0);
        
        let cls = count >= 10 ? "green" : (count >= 5 ? "orange" : "");
        let resetClass = isResetDay ? "day-reset" : "";
        let resetMarkup = isResetDay ? '<span class="reset-warning">⚠️</span>' : "";

        cal.innerHTML += `
            <div class="day ${cls} ${dStr === todayStr ? 'today' : ''} ${resetClass}">
                ${resetMarkup}
                <span>${i}</span>
            </div>`;
    }
}

// Édition des exercices
function enableEdit(index) {
    const textElem = document.getElementById(`text-${index}`);
    textElem.contentEditable = "true";
    textElem.focus();
    document.getElementById(`btn-edit-${index}`).innerText = "✅";
}

function finishEdit(index) {
    const textElem = document.getElementById(`text-${index}`);
    state.customExos[index] = textElem.innerText.trim() || DEFAULT_EXOS[index];
    save();
    textElem.contentEditable = "false";
    document.getElementById(`btn-edit-${index}`).innerText = "✏️";
}

function checkEnter(e, i) { if (e.key === "Enter") { e.preventDefault(); finishEdit(i); } }

// Chrono et Progression Arbre
function updateTimer() {
    const diff = new Date().getTime() - state.startDate;
    const d = Math.floor(diff/86400000), h = Math.floor((diff/3600000)%24), m = Math.floor((diff/60000)%60), s = Math.floor((diff/1000)%60);
    document.getElementById('timer').innerText = `${d}j ${h}h ${m}m ${s}s`;
    const icon = document.getElementById('tree-icon');
    if(d >= 30) icon.innerText = "🌸"; else if(d >= 15) icon.innerText = "🌳"; else if(d >= 7) icon.innerText = "🌿"; else icon.innerText = "🌱";
}

// Fonctions Globales
function changeMonth(dir) { currentViewDate.setMonth(currentViewDate.getMonth() + dir); renderCalendar(); }
function passPrestige() { if(confirm("Passer Prestige ? Tes LP reviendront à 0.")) { state.prestige++; state.points = 0; save(); location.reload(); } }
function resetAddiction() { if(confirm("Confirmer l'échec ? L'arbre repart à zéro.")) { state.startDate = new Date().getTime(); save(); } }
function exportData() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state)])); a.download = 'eveil_backup.json'; a.click(); }
function importData() { 
    const input = document.createElement('input'); input.type = 'file'; 
    input.onchange = e => { const r = new FileReader(); r.readAsText(e.target.files[0]); r.onload = res => { state = JSON.parse(res.target.result); save(); location.reload(); }}; 
    input.click(); 
}

// Lancement
temporalChecks(); renderExos(); renderCalendar(); updateUI(); 
setInterval(updateTimer, 1000); 
setInterval(temporalChecks, 30000); // Check toutes les 30s pour minuit
window.addEventListener('focus', () => { temporalChecks(); renderExos(); updateUI(); });