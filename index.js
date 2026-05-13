 const DEFAULT_EXOS = ["20 Pompes", "30 Squats", "1min Gainage", "40 Jumping Jacks", "15 Burpees", "20 Fentes", "30 Abdos", "10 Ponts fessiers", "2min Course", "10 Tuck Jumps"];
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
        startDate: Date.now(), // Défini UNE SEULE FOIS à la création
        lastPointReset: Date.now(),
        sportHistory: {}, 
        customExos: [...DEFAULT_EXOS]
    };
    save();

    let currentViewDate = new Date();

    function save() { localStorage.setItem('hunter_final_v3', JSON.stringify(state)); }

    function checkPointDecay() {
        const now = new Date();
        const month = now.getMonth() + 1; // Janvier = 1
        const day = now.getDate();
        
        // Vérifie si on est le 1er d'un mois pair
        const isPenaltyDay = (day === 1 && month % 2 === 0);
        const penaltyKey = `penalty_${now.getFullYear()}_${month}`;
        
        const resetLbl = document.getElementById('next-reset-label');
        
        // Calcul du temps restant jusqu'au prochain 1er des mois pairs
        let nextPenalty = new Date(now.getFullYear(), month, 1);
        if ((nextPenalty.getMonth() + 1) % 2 !== 0) {
            nextPenalty.setMonth(nextPenalty.getMonth() + 1);
        }
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
    }

    function renderExos() {
        const t = getT();
        const dayData = state.sportHistory[t] || { list: [] };
        const done = Array.isArray(dayData) ? dayData : (dayData.list || []);
        document.getElementById('exo-list').innerHTML = state.customExos.map((ex, i) => `
            <div class="exo-item ${done.includes(i) ? 'checked' : ''}" onclick="toggleExo(${i})">
                <input type="checkbox" ${done.includes(i) ? 'checked' : ''} onchange="this.parentElement.click()">
                <div class="exo-text">${ex}</div>
            </div>`).join('');
        document.getElementById('exo-count').innerText = `${done.length}/10`;
    }

    function toggleExo(i) {
        const t = getT();
        if (!state.sportHistory[t]) state.sportHistory[t] = { list: [], color: getCurrentRankColor() };
        if (Array.isArray(state.sportHistory[t])) state.sportHistory[t] = { list: state.sportHistory[t], color: getCurrentRankColor() };
        let dayData = state.sportHistory[t];
        if (!dayData.list.includes(i)) {
            dayData.list.push(i); state.points += 2;
            dayData.color = getCurrentRankColor();
        } else {
            dayData.list = dayData.list.filter(x => x !== i);
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
                count = Array.isArray(dayData) ? dayData.length : (dayData.list ? dayData.list.length : 0);
                rankColor = dayData.color || getCurrentRankColor();
            }

            let opacity = 0;
            if (count >= 10) opacity = 1; else if (count >= 5) opacity = 0.5; else if (count >= 1) opacity = 0.2;
            
            let bgStyle = "";
            if (isFixedPenaltyDay) {
                // Uniquement la bordure, pas de fond (background: transparent)
                bgStyle = `border: 2px solid var(--system-warning); color: #ff4d4d; font-weight: 900; background: transparent;`;
            } else if (opacity > 0) {
                bgStyle = `background-color: ${hexToRgba(rankColor, opacity)}; color: ${opacity > 0.6 ? '#000' : 'var(--text)'};`;
            }
            
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

        // AJOUT : MISE À JOUR DE LA POUSSE
        const treeIcon = document.getElementById('tree-icon');
        
        if (d >= 100) {
            treeIcon.innerText = "👑"; // 100 jours : Légende
        } else if (d >= 30) {
            treeIcon.innerText = "🌳"; // 30 jours : Arbre
        } else if (d >= 7) {
            treeIcon.innerText = "🌿"; // 7 jours : Plante
        } else if (d >= 1) {
            treeIcon.innerText = "🍃"; // 1 jour : Pousse
        } else {
            treeIcon.innerText = "🌱"; // Moins d'un jour : Graine
        }
    }

    function resetAddiction() { if(confirm("CONFIRMER ÉCHEC ?")) { state.startDate = Date.now(); save(); updateTimer(); } }
    function changeMonth(dir) { currentViewDate.setMonth(currentViewDate.getMonth() + dir); renderCalendar(); }

    checkPointDecay();
    updateUI(); renderExos(); renderCalendar();
    setInterval(updateTimer, 1000); updateTimer();
    setInterval(checkPointDecay, 60000);