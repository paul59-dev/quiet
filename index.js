const levelUpSound = new Audio('./songs/win.wav');
    const levelDownSound = new Audio('./songs/down.wav');
    const levelResetSound = new Audio('./songs/reset.wav');

// CORRECTION COMMUNE POUR MOBILE : Déclaration obligatoire de la variable globale
    let pendingRankColor = null;

    function toggleAbout() {
            const panel = document.getElementById('about-panel');
            const overlay = document.getElementById('overlay');
            
            if (panel && overlay) {
                panel.classList.toggle('active');
                overlay.classList.toggle('active');
            } else {
                console.error("Le menu ou l'overlay n'a pas été trouvé dans le HTML.");
            }
        }

        function toggleMenu() {
            toggleAbout();
        }

    const EXOS = {
        haut: [
            { name: "Tirage poitrine", hasKg: true },
            { name: "Rowing", hasKg: true },
            { name: "Développé couché", hasKg: true },
            { name: "Tirage Bucheron", hasKg: true },
            { name: "Corde", hasKg: true },
            { name: "Développé Militaire", hasKg: true },
            { name: "Curl Pupitre", hasKg: true },
            { name: "Elévation Latérales", hasKg: true },
            { name: "Pec Fly", hasKg: true }
        ],
        bas: [
            { name: "Presse à Cuisse", hasKg: true },
            { name: "Leg Extension", hasKg: true },
            { name: "Leg Curl", hasKg: true }
        ],
        maison: [
            { name: "Squats Sautés" },
            { name: "Montain Climber (min)" },
            { name: "Burpees" },
            { name: "Étirements (min)" },
            { name: "Ménage", hasReps: false }
        ],
        bonus: [
            { name: "Marche à pied (min)" },
            { name: "Course (min)" },
            { name: "Marche Inclinée (min)" },
            { name: "Vélo (min)" },
            { name: "Saut à la corde" },
            { name: "12h de Jeune", hasReps: false }
        ]
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
        mode: 'haut',
        currentRankIndex: 0,
        lastRankChangeDate: Date.now()
    };

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

    function checkLevelUp(newPoints) {
        let newRankIndex = 0;
        RANKS.forEach((r, i) => { if (newPoints >= r.min) newRankIndex = i; });

        if (newRankIndex > state.currentRankIndex) {
            showLevelUpUI(newRankIndex);
            state.currentRankIndex = newRankIndex;
            state.lastRankChangeDate = Date.now();
            save();
        } else if (newRankIndex < state.currentRankIndex) {
            showRankDownUI(newRankIndex);
            state.currentRankIndex = newRankIndex;
            state.lastRankChangeDate = Date.now();
            save();
        }
    }

    function showLevelUpUI(rankIdx) {
        try { levelUpSound.play().catch(e => console.log("Audio bloqué par le mobile")); } catch(e) {}
        document.getElementById('lu-header-title').innerText = "AVANCEMENT DU SYSTÈME";
        document.getElementById('lu-main-label').innerText = "LEVEL UP";
        document.getElementById('lu-main-label').style.color = "white";
        document.getElementById('lu-stat-label-1').innerText = "ABSTINENCE";
        document.getElementById('lu-stat-label-2').innerText = "RANG PRÉCÉDENT";
        document.getElementById('lu-stat-label-3').innerText = "EXERCICES COMPLÉTÉS";

        const targetIdx = (rankIdx !== undefined) ? rankIdx : state.currentRankIndex;
        const rank = RANKS[targetIdx];
        if (!rank) return;

        // Sauvegarde de la couleur pour la fermeture
        pendingRankColor = rank.color;

        document.getElementById('lu-rank-icon').innerText = rank.icon;
        document.getElementById('lu-rank-name').innerText = rank.name;
        
        // Application locale sur la carte uniquement
        document.getElementById('lu-rank-name').style.color = rank.color;
        document.querySelector('.level-up-card').style.borderColor = rank.color;
        document.querySelector('.level-up-card').style.boxShadow = `0 0 50px ${hexToRgba(rank.color, 0.2)}`;
        
        const closeBtn = document.getElementById('lu-close-btn');
        if (closeBtn) {
            closeBtn.innerText = "CONTINUER";
            closeBtn.style.background = rank.color;
        }

        function formatDuration(ms) {
            const d = Math.floor(ms / 86400000);
            const h = Math.floor((ms / 3600000) % 24).toString().padStart(2, '0');
            const m = Math.floor((ms / 60000) % 60).toString().padStart(2, '0');
            const s = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
            return `${d}j ${h}h ${m}m ${s}s`;
        }

        document.getElementById('stat-abstinence').innerText = formatDuration(Date.now() - state.startDate);
        document.getElementById('stat-prev-rank').innerText = formatDuration(Date.now() - (state.lastRankChangeDate || state.startDate));

        let totalExos = 0;
        Object.values(state.sportHistory).forEach(dayData => {
            const list = Array.isArray(dayData) ? dayData : (dayData.list || []);
            totalExos += list.length;
        });
        document.getElementById('stat-total-exos').innerText = totalExos;

        document.getElementById('level-up-modal').style.display = 'flex';
    }

    function showPenaltyUI() {
        try { levelResetSound.play().catch(e => console.log("Audio bloqué par le mobile")); } catch(e) {}
        document.getElementById('lu-header-title').innerText = "ALERTE DU SYSTÈME";
        document.getElementById('lu-main-label').innerText = "QUÊTE DE PÉNALITÉ";
        document.getElementById('lu-main-label').style.color = "#ff0033";
        document.getElementById('lu-rank-icon').innerText = "!";
        document.getElementById('lu-rank-name').innerText = "DÉGRADATION";
        document.getElementById('lu-rank-name').style.color = "#ff0033";
        
        // Sauvegarde de la couleur rouge d'alerte pour l'application
        pendingRankColor = "#ff0033";

        document.getElementById('lu-stat-label-1').innerText = "PENALITÉ";
        document.getElementById('stat-abstinence').innerText = "-200 LP";
        document.getElementById('stat-abstinence').style.color = "#ff0033";
        
        document.getElementById('lu-stat-label-2').innerText = "MOTIF";
        document.getElementById('stat-prev-rank').innerText = "PURGE MENSUELLE";
        
        document.getElementById('lu-stat-label-3').innerText = "STATUT";
        document.getElementById('stat-total-exos').innerText = "APPLIQUÉ";

        const closeBtn = document.getElementById('lu-close-btn');
        if (closeBtn) {
            closeBtn.innerText = "ACCEPTER";
            closeBtn.style.background = "#ff0033";
        }
        
        document.querySelector('.level-up-card').style.borderColor = "#ff0033";
        document.querySelector('.level-up-card').style.boxShadow = `0 0 50px rgba(255, 0, 51, 0.2)`;
        
        document.getElementById('level-up-modal').style.display = 'flex';
    }

    function showRankDownUI(rankIdx) {
        try { levelDownSound.play().catch(e => console.log("Audio bloqué par le mobile")); } catch(e) {}
        document.getElementById('lu-header-title').innerText = "AVERTISSEMENT DU SYSTÈME";
        document.getElementById('lu-main-label').innerText = "RÉTROGRADATION";
        document.getElementById('lu-main-label').style.color = "#ff0033";
        
        const rank = RANKS[rankIdx];
        if (!rank) return;

        // Sauvegarde de la couleur du nouveau rang inférieur
        pendingRankColor = rank.color;

        document.getElementById('lu-rank-icon').innerText = rank.icon;
        document.getElementById('lu-rank-name').innerText = rank.name;
        document.getElementById('lu-rank-name').style.color = "#ff0033";
        
        document.getElementById('lu-stat-label-1').innerText = "STATUT";
        document.getElementById('stat-abstinence').innerText = "RANG INFÉRIEUR";
        document.getElementById('stat-abstinence').style.color = "#ff0033";
        
        document.getElementById('lu-stat-label-2').innerText = "ANCIEN RANG";
        document.getElementById('stat-prev-rank').innerText = RANKS[rankIdx + 1] ? RANKS[rankIdx + 1].name : "Inconnu";
        
        document.getElementById('lu-stat-label-3').innerText = "MESSAGE";
        document.getElementById('stat-total-exos').innerText = "LA FORCE DIMINUE...";

        const closeBtn = document.getElementById('lu-close-btn');
        if (closeBtn) {
            closeBtn.innerText = "REPRENDRE L'ENTRAINEMENT";
            closeBtn.style.background = "#ff0033";
        }
        
        document.querySelector('.level-up-card').style.borderColor = "#ff0033";
        document.querySelector('.level-up-card').style.boxShadow = `0 0 50px rgba(255, 0, 51, 0.2)`;
        
        document.getElementById('level-up-modal').style.display = 'flex';
    }

    function closeLevelUp() {
        // 1. On ferme la modale en priorité absolue
        const modal = document.getElementById('level-up-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        // 2. On applique la couleur globale sauvegardée de manière sécurisée
        try {
            if (pendingRankColor) {
                document.documentElement.style.setProperty('--system-blue', pendingRankColor);
            }
        } catch (error) {
            console.error("Erreur lors de l'application de la couleur globale :", error);
        }
        
        // 3. On remet à zéro les styles temporaires des textes internes
        try {
            const statAbstinence = document.getElementById('stat-abstinence');
            if (statAbstinence) {
                statAbstinence.style.color = "white"; 
            }
        } catch (error) {
            console.error("Erreur lors du reset des styles :", error);
        }

        // 4. On vide la variable temporaire
        pendingRankColor = null;
    }

    function checkPointDecay() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const isPenaltyDay = (day === 1 && month % 2 === 0);
        const penaltyKey = `penalty_${now.getFullYear()}_${month}`;
        const resetLbl = document.getElementById('next-reset-label');
        
        let nextPenalty = new Date(now.getFullYear(), now.getMonth(), 1);
        if ((nextPenalty.getMonth() + 1) % 2 !== 0) nextPenalty.setMonth(nextPenalty.getMonth() + 1);
        else if (day >= 1) nextPenalty.setMonth(nextPenalty.getMonth() + 2);

        const diff = nextPenalty - now;
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if(resetLbl) resetLbl.innerText = `Prochaine purge système dans : ${daysLeft} jours`;

        if (isPenaltyDay && localStorage.getItem(penaltyKey) !== "done") {
            state.points = Math.max(0, state.points - 500);
            localStorage.setItem(penaltyKey, "done"); 
            save();
            showPenaltyUI();
            updateUI();
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
        let dayData = state.sportHistory[t];
        
        if (!dayData) dayData = { list: [], details: {}, color: getCurrentRankColor() };
        if (Array.isArray(dayData)) dayData = { list: dayData, details: {}, color: getCurrentRankColor() };
        if (!dayData.details) dayData.details = {};

        let rankIndex = 0;
        RANKS.forEach((r, i) => { if (state.points >= r.min) rankIndex = i; });
        
        const listToUse = EXOS[state.mode] || EXOS.haut;
        const currentModeDone = dayData.list.filter(id => id.startsWith(state.mode + '-'));

        document.getElementById('exo-list').innerHTML = listToUse.map((ex, i) => {
            const exoID = `${state.mode}-${i}`;
            const isChecked = dayData.list.includes(exoID);
            
            // Plus de calcul "fixed", c'est 10 par défaut si rien n'est écrit, ou vide si hasReps est faux
            const defaultReps = ex.hasReps === false ? "" : 10;
            const savedReps = dayData.details[exoID]?.reps !== undefined ? dayData.details[exoID].reps : defaultReps;

            return `<div class="exo-item ${isChecked ? 'checked' : ''}" onclick="toggleExo('${exoID}', event)">
                <!-- Zone Gauche : Checkbox + Reps libres + Nom -->
                <div class="exo-left">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="this.parentElement.parentElement.click()">
                    
                    ${ex.hasReps !== false ? `
                        <div onclick="event.stopPropagation();">
                            <input type="number" 
                                class="exo-input-sub" 
                                id="rep-${exoID}" 
                                placeholder="Reps" 
                                value="${savedReps}" 
                                oninput="updateExoData('${exoID}')" 
                                title="Répétitions libres">
                        </div>
                    ` : ''}
                    
                    <div class="exo-text" style="${rankIndex >= 4 ? 'color: var(--rank-color); font-weight: bold;' : ''}">
                        ${ex.name}
                    </div>
                </div>

                <!-- Zone Droite : Les 3 cases KG groupées -->
                <div class="exo-right-inputs" onclick="event.stopPropagation();">
                    ${ex.hasKg ? `
                        <input type="number" class="exo-input-sub" id="kg-${exoID}-1" placeholder="1st kg" value="${dayData.details[exoID]?.kg1 || ''}" oninput="updateExoData('${exoID}')">
                        <input type="number" class="exo-input-sub" id="kg-${exoID}-2" placeholder="2nd kg" value="${dayData.details[exoID]?.kg2 || ''}" oninput="updateExoData('${exoID}')">
                        <input type="number" class="exo-input-sub" id="kg-${exoID}-3" placeholder="3rd kg" value="${dayData.details[exoID]?.kg3 || ''}" oninput="updateExoData('${exoID}')">
                    ` : ''}
                </div>
            </div>`;
        }).join('');

        document.getElementById('exo-count').innerText = `${currentModeDone.length}/${listToUse.length}`;
    }

    function toggleExo(exoID, event) {
        if (event && event.target.type === 'checkbox') return;

        const t = getT();
        if (!state.sportHistory[t]) {
            state.sportHistory[t] = { list: [], details: {}, color: getCurrentRankColor() };
        }

        const dayData = state.sportHistory[t];
        const index = dayData.list.indexOf(exoID);

        const currentMode = exoID.split('-')[0];
        const exoIndex = parseInt(exoID.split('-')[1]);
        const exoConfig = EXOS[currentMode][exoIndex];

        let pointsGagnes = 0;

        // Calcul simplifié : sans exercices imposés (fixed)
        if (exoConfig.hasReps === false) {
            pointsGagnes = 5; // Le ménage et le jeûne donnent 5 LP directement
        } else {
            const repInput = document.getElementById(`rep-${exoID}`);
            // Prend la valeur tapée, ou 10 par défaut si l'input est vide
            pointsGagnes = repInput ? (parseInt(repInput.value) || 0) : 10;
        }

        if (index === -1) {
            dayData.list.push(exoID);
            state.points += pointsGagnes;
        } else {
            dayData.list.splice(index, 1);
            state.points = Math.max(0, state.points - pointsGagnes);
        }

        save();
        checkLevelUp(state.points);
        renderExos();
        updateUI();
    }

    function updateExoData(exoID) {
        const t = getT();
        if (!state.sportHistory[t]) {
            state.sportHistory[t] = { list: [], details: {}, color: getCurrentRankColor() };
        }
        if (!state.sportHistory[t].details[exoID]) {
            state.sportHistory[t].details[exoID] = {};
        }

        // Récupération des répétitions (si l'input existe)
        const repInput = document.getElementById(`rep-${exoID}`);
        if (repInput) state.sportHistory[t].details[exoID].reps = parseInt(repInput.value) || 0;

        // Récupération des 3 colonnes de poids distinctes
        const kg1 = document.getElementById(`kg-${exoID}-1`);
        const kg2 = document.getElementById(`kg-${exoID}-2`);
        const kg3 = document.getElementById(`kg-${exoID}-3`);

        if (kg1) state.sportHistory[t].details[exoID].kg1 = kg1.value;
        if (kg2) state.sportHistory[t].details[exoID].kg2 = kg2.value;
        if (kg3) state.sportHistory[t].details[exoID].kg3 = kg3.value;

        save();
    }

    function renderCalendar() {
        const cal = document.getElementById('calendar'); 
        if(!cal) return;
        cal.innerHTML = "";
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
                rankColor = dayData.color || "#94a3b8";
            }

            let opacity = 0;
            if (count >= 9) opacity = 1.0; 
            else if (count >= 5) opacity = 0.6; 
            else if (count >= 2) opacity = 0.3; 
            else if (count === 1) opacity = 0.15; 

            let bgStyle = "";
            if (isFixedPenaltyDay) bgStyle = `border: 2px solid var(--system-warning); color: #ff4d4d; font-weight: 900;`;
            else if (opacity > 0) bgStyle = `background-color: ${hexToRgba(rankColor, opacity)}; color: ${opacity > 0.6 ? '#000' : 'var(--text)'};`;
            
            cal.innerHTML += `<div class="day ${isToday ? 'today' : ''}" style="${bgStyle}">${i}</div>`;
        }
    }

    function hexToRgba(hex, alpha) {
        if (!hex || hex === 'transparent') return 'rgba(255,255,255,0.03)';
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function changeMonth(dir) {
        currentViewDate.setMonth(currentViewDate.getMonth() + dir);
        renderCalendar();
    }

    function resetAddiction() {
        if(confirm("ALERTE SYSTÈME : Confirmer l'échec de mission ? Votre temps de survie sera réinitialisé.")) {
            state.startDate = Date.now();
            state.lastRankChangeDate = Date.now();
            save();
            alert("Mission échouée. Compteur réinitialisé. Redoublez d'efforts.");
        }
    }

    /* --- NOUVELLES FONCTIONS DE SAUVEGARDE ET EXPORT --- */

    function exportData() {
        const dataStr = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
        document.getElementById('backup-io').value = dataStr;
        alert("Code système généré avec succès dans la zone de texte ! Copiez-le.");
    }

    function downloadBackup() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `s_system_backup_${getT()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    function importData() {
        const code = document.getElementById('backup-io').value.trim();
        if(!code) return alert("Veuillez coller un code valide d'abord.");
        try {
            const parsed = JSON.parse(decodeURIComponent(escape(atob(code))));
            if(parsed && typeof parsed === 'object' && 'points' in parsed) {
                state = parsed;
                save();
                alert("Données du système synchronisées avec succès !");
                location.reload();
            } else {
                alert("Format de code invalide.");
            }
        } catch(e) {
            alert("Erreur lors du décodage du code système.");
        }
    }

    function importFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const parsed = JSON.parse(e.target.result);
                if(parsed && typeof parsed === 'object' && 'points' in parsed) {
                    state = parsed;
                    save();
                    alert("Fichier d'archives restauré avec succès !");
                    location.reload();
                } else {
                    alert("Le fichier JSON ne contient pas de données S-SYSTEM valides.");
                }
            } catch(err) {
                alert("Erreur de lecture du fichier JSON.");
            }
        };
        reader.readAsText(file);
    }

    function updateTimer() {
        const diff = Date.now() - state.startDate;
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24).toString().padStart(2, '0');
        const m = Math.floor((diff / 60000) % 60).toString().padStart(2, '0');
        const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        
        document.getElementById('timer').innerText = `${d}j ${h}h ${m}m ${s}s`;
        
        const treeIcon = document.getElementById('tree-icon');
        if (treeIcon) {
            if (d >= 100) treeIcon.innerText = "👑"; 
            else if (d >= 30) treeIcon.innerText = "🌳"; 
            else if (d >= 7) treeIcon.innerText = "🌿"; 
            else if (d >= 1) treeIcon.innerText = "🍃"; 
            else treeIcon.innerText = "🌱";
        }
    }

    function resetAddiction() { 
        if (confirm("CONFIRMER ÉCHEC ?")) { 
            state.startDate = Date.now(); 
            save(); 
            updateTimer(); 
        } 
    }

    function updateTimer() {
        const diff = Date.now() - state.startDate;
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24).toString().padStart(2, '0');
        const m = Math.floor((diff / 60000) % 60).toString().padStart(2, '0');
        const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        
        document.getElementById('timer').innerText = `${d}j ${h}h ${m}m ${s}s`;
        
        const treeIcon = document.getElementById('tree-icon');
        if (treeIcon) {
            if (d >= 100) treeIcon.innerText = "👑"; 
            else if (d >= 30) treeIcon.innerText = "🌳"; 
            else if (d >= 7) treeIcon.innerText = "🌿"; 
            else if (d >= 1) treeIcon.innerText = "🍃"; 
            else treeIcon.innerText = "🌱";
        }
    }

    function resetAddiction() { 
        if (confirm("CONFIRMER ÉCHEC ?")) { 
            state.startDate = Date.now(); 
            save(); 
            updateTimer(); 
        } 
    }

    function changeMonth(dir) { 
        currentViewDate.setMonth(currentViewDate.getMonth() + dir); 
        renderCalendar(); 
    }

    // --- INITIALISATION DU SYSTÈME ---
    // On s'assure que le mode par défaut est défini avant de lancer les rendus
    if (!state.mode) {
        state.mode = 'haut';
    }

    // Sauvegarde initiale pour fixer l'état propre
    save();

    // Lancement des fonctions d'affichage
    setMode(state.mode);
    checkPointDecay();
    updateUI(); 
    renderCalendar();

    // Gestion des timers (Horloge + Vérification de la Purge)
    updateTimer();
    setInterval(updateTimer, 1000); 
    setInterval(checkPointDecay, 60000);

    // Débloquer tous les sons dès le premier clic sur l'application
    document.addEventListener('click', () => {
        levelUpSound.load();
        levelDownSound.load();
        levelResetSound.load();
    }, { once: true });