const EXOS = {
        haut: ["8 Tirage poitrine", "8 Rowing", "8 Développé couché", "8 Tirage Bucheron", "8 Corde", "8 Développé Militaire", "8 Curl Pupitre", "8 Elévation Latérales", "8 Pec Fly"],
        bas: ["8 Presse à Cuisse", "8 Leg Extension", "8 Leg Curl"],
        maison: ["8 Squats Sautés", "1min Montain Climber", "8 Burpees", "1min Étirements"],
        bonus: ["5min Marche à pied", "5min Course", "5min Marche Inclinée", "10min Vélo", "5min Saut à la corde"]
    };

    const RANKS = [
        { name: "RANG E", min: 0, icon: "E", color: "#94a3b8" },
        { name: "RANG D", min: 100, icon: "D", color: "#22c55e" },
        { name: "RANG C", min: 300, icon: "C", color: "#3b82f6" },
        { name: "RANG B", min: 600, icon: "B", color: "#a855f7" },
        { name: "RANG A", min: 1200, icon: "A", color: "#f59e0b" },
        { name: "RANG S", min: 2500, icon: "S", color: "#ff0055" }
    ]; 

    let state = JSON.parse(localStorage.getItem('hunter_final_v3')) || {
        points: 0, 
        startDate: Date.now(),
        lastPointReset: Date.now(),
        sportHistory: {}, 
        mode: 'haut' 
    };
    save();

    let currentViewDate = new Date();

    function save() { localStorage.setItem('hunter_final_v3', JSON.stringify(state)); }

    function setMode(m) {
        state.mode = m;
        const curColor = getCurrentRankColor();
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
            btn.style.color = "#64748b";
        });

        const activeBtn = document.getElementById('mode-' + m);
        if(activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.backgroundColor = curColor;
            activeBtn.style.color = "#000";
        }
        save();
        renderExos();
        updateUI();
    }

    function checkPointDecay() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const isPenaltyDay = (day === 1 && month % 2 === 0);
        const penaltyKey = `penalty_${now.getFullYear()}_${month}`;
        const resetLbl = document.getElementById('next-reset-label');
        let nextPenalty = new Date(now.getFullYear(), month, 1);
        if ((nextPenalty.getMonth() + 1) % 2 !== 0) nextPenalty.setMonth(nextPenalty.getMonth() + 1);
        const diff = nextPenalty - now;
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        resetLbl.innerText = `Prochaine purge système dans : ${daysLeft} jours`;
        if (isPenaltyDay && localStorage.getItem(penaltyKey) !== "done") {
            state.points = Math.max(0, state.points - 200);
            localStorage.setItem(penaltyKey, "done"); 
            save();
            alert("⚠️ ALERTE SYSTÈME : Purge de -200 LP effectuée.");
            location.reload();
        }
    }

    function getT(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function getCurrentRankColor() {
        let cur = RANKS[0];
        for (let r of RANKS) { if (state.points >= r.min) cur = r; }
        return cur.color;
    }

    function updateUI() {
        let cur = RANKS[0], next = RANKS[1];
        for (let r of RANKS) { if (state.points >= r.min) { cur = r; next = RANKS[RANKS.indexOf(r)+1] || r; } }
        document.documentElement.style.setProperty('--rank-color', cur.color);
        document.getElementById('rank-medal').innerText = cur.icon;
        document.getElementById('rank-name').innerText = cur.name;
        document.getElementById('lp-val').innerText = state.points;
        const prog = next === cur ? 100 : ((state.points - cur.min) / (next.min - cur.min)) * 100;
        document.getElementById('progress-bar').style.width = `${prog}%`;
        document.querySelectorAll('.mode-btn').forEach(btn => {
            if(btn.classList.contains('active')) btn.style.backgroundColor = cur.color;
            else btn.style.backgroundColor = 'transparent';
        });
    }

    function renderExos() {
        const t = getT();
        const dayData = state.sportHistory[t];
        let done = [];
        if (dayData) {
            done = Array.isArray(dayData) ? dayData : (dayData.list || []);
        }

        let rankIndex = 0;
        RANKS.forEach((r, i) => { if (state.points >= r.min) rankIndex = i; });
        const multipliers = [1, 1, 1.5, 2, 3, 5];
        const mult = multipliers[rankIndex];
        
        // On récupère la liste actuelle
        const listToUse = EXOS[state.mode] || EXOS.haut;
        
        // L'objectif devient dynamiquement la longueur de la liste (ex: 9 si tu as enlevé un exo)
        const totalPossible = listToUse.length;

        const currentModeDone = done.filter(id => id.startsWith(state.mode + '-'));

        document.getElementById('exo-list').innerHTML = listToUse.map((ex, i) => {
            const exoID = `${state.mode}-${i}`;
            const isChecked = done.includes(exoID);
            const match = ex.match(/^(\d+)(\D+)/);
            let displayExo = ex;
            if (match) {
                const newQty = Math.floor(parseInt(match[1]) * mult);
                displayExo = `<strong>${newQty}</strong>${match[2]}`;
            }
            return `<div class="exo-item ${isChecked ? 'checked' : ''}" onclick="toggleExo('${exoID}')">
                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="this.parentElement.click()">
                <div class="exo-text" style="${rankIndex >= 4 ? 'color:var(--rank-color); font-weight:bold;' : ''}">${displayExo}</div>
            </div>`;
        }).join('');
        
        // Affichage dynamique : X / [Nombre d'exos réels dans le code]
        document.getElementById('exo-count').innerText = `${currentModeDone.length}/${totalPossible}`;
    }

    function toggleExo(exoID) {
        const t = getT();
        if (!state.sportHistory[t]) {
            state.sportHistory[t] = { list: [], color: getCurrentRankColor() };
        }
        if (Array.isArray(state.sportHistory[t])) {
            state.sportHistory[t] = { list: state.sportHistory[t], color: getCurrentRankColor() };
        }
        let dayData = state.sportHistory[t];

        if (!dayData.list.includes(exoID)) {
            dayData.list.push(exoID); 
            state.points += 2;
            dayData.color = getCurrentRankColor();
        } else {
            dayData.list = dayData.list.filter(x => x !== exoID);
            state.points = Math.max(0, state.points - 2);
        }
        save(); renderExos(); renderCalendar(); updateUI();
    }

    function renderCalendar() {
        const cal = document.getElementById('calendar'); cal.innerHTML = "";
        const now = new Date();
        const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
        document.getElementById('month-label').innerText = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentViewDate);
        const days = new Date(year, month + 1, 0).getDate();
        for(let i=1; i<=days; i++) {
            const isToday = (i === now.getDate() && month === now.getMonth() && year === now.getFullYear());
            const isFixedPenaltyDay = (i === 1 && (month + 1) % 2 === 0);
            const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const dayData = state.sportHistory[dStr];
            let count = 0, rankColor = 'transparent';
            if (dayData) {
                const list = Array.isArray(dayData) ? dayData : (dayData.list || []);
                count = list.length;
                rankColor = dayData.color || getCurrentRankColor();
            }

            let opacity = 0;
            if (count >= 9) opacity = 1.0; 
            else if (count >= 5) opacity = 0.6; 
            else if (count >= 2) opacity = 0.3; 
            else if (count === 1) opacity = 0.15; 

            let bgStyle = "";
            if (isFixedPenaltyDay) bgStyle = `border: 2px solid var(--system-warning); color: #ff4d4d; font-weight: 900; background: transparent;`;
            else if (opacity > 0) bgStyle = `background-color: ${hexToRgba(rankColor, opacity)}; color: ${opacity > 0.6 ? '#000' : 'var(--text)'}; font-weight: ${opacity > 0.6 ? '900' : 'normal'};`;
            
            const penaltyTag = isFixedPenaltyDay ? `<span style="position:absolute; bottom:2px; font-size:0.4rem; color:var(--system-warning); font-weight:bold;">-200LP</span>` : "";
            cal.innerHTML += `<div class="day ${isToday ? 'today' : ''}" style="${bgStyle}">${i}${penaltyTag}</div>`;
        }
    }

    function hexToRgba(hex, alpha) {
        if (!hex || hex === 'transparent') return 'rgba(255,255,255,0.03)';
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function exportData() {
        const dataStr = btoa(JSON.stringify(state));
        const io = document.getElementById('backup-io');
        io.value = dataStr; io.select(); document.execCommand('copy');
        alert("CODE COPIÉ !");
    }

    function importData() {
        const io = document.getElementById('backup-io').value.trim();
        try {
            const decoded = JSON.parse(io.startsWith('{') ? io : atob(io));
            if(confirm("Importer ?")) { state = decoded; save(); location.reload(); }
        } catch(e) { alert("Code invalide"); }
    }

    function downloadBackup() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
        const a = document.createElement('a'); a.href = dataStr; a.download = "hunter_save.json"; a.click();
    }

    function importFile(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (confirm("Charger ?")) { state = imported; save(); location.reload(); }
            } catch (err) { alert("Erreur"); }
        };
        reader.readAsText(file);
    }

    function updateTimer() {
        const diff = Date.now() - state.startDate;
        const d = Math.floor(diff/86400000);
        const h = Math.floor((diff/3600000)%24);
        const m = Math.floor((diff/60000)%60);
        const s = Math.floor((diff/1000)%60);
        document.getElementById('timer').innerText = `${d}j ${h}h ${m}m ${s}s`;
        const treeIcon = document.getElementById('tree-icon');
        if (d >= 100) treeIcon.innerText = "👑"; else if (d >= 30) treeIcon.innerText = "🌳"; else if (d >= 7) treeIcon.innerText = "🌿"; else if (d >= 1) treeIcon.innerText = "🍃"; else treeIcon.innerText = "🌱";
    }

    function resetAddiction() { if(confirm("CONFIRMER ÉCHEC ?")) { state.startDate = Date.now(); save(); updateTimer(); } }
    function changeMonth(dir) { currentViewDate.setMonth(currentViewDate.getMonth() + dir); renderCalendar(); }

    setMode(state.mode || 'haut');
    checkPointDecay();
    updateUI(); renderCalendar();
    setInterval(updateTimer, 1000); updateTimer();
    setInterval(checkPointDecay, 60000);