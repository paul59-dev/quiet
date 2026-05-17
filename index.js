// 1. Chemins nettoyés (sans le point initial qui peut perdre le navigateur mobile)
    const levelUpSound = new Audio('songs/win.wav');
    const levelDownSound = new Audio('songs/down.wav');
    const levelResetSound = new Audio('songs/reset.wav');

    // Variable globale mobile
    let pendingRankColor = null;

    // FORÇAGE AUDIO MOBILE : On débloque les pistes au premier clic de l'utilisateur
    function unlockAudio() {
        const sounds = [levelUpSound, levelDownSound, levelResetSound];
        sounds.forEach(sound => {
            sound.play()
                .then(() => {
                    sound.pause();
                    sound.currentTime = 0;
                })
                .catch(e => console.log("Audio en attente de déblocage complet"));
        });
        // On retire l'écouteur pour ne pas répéter cette action inutilement
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    }
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio); // Prise en compte du tactile mobile

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
            // 1. On sauvegarde l'ANCIENNE date avant de l'écraser
            const ancienneDate = state.lastRankChangeDate;

            // 2. On met à jour le state avec le nouveau rang et la date actuelle
            state.currentRankIndex = newRankIndex; 
            state.lastRankChangeDate = Date.now();
            save();
            
            // 3. Mise à jour de l'interface graphique
            updateUI();
            renderExos();
            if (typeof renderCalendar === 'function') renderCalendar();
            
            // 4. On ENVOIE l'ancienne date à la pop-up pour le calcul du chrono
            showLevelUpUI(newRankIndex, ancienneDate);

        } else if (newRankIndex < state.currentRankIndex) {
            state.currentRankIndex = newRankIndex; 
            state.lastRankChangeDate = Date.now();
            save();
            
            updateUI();
            renderExos();
            if (typeof renderCalendar === 'function') renderCalendar();
            showRankDownUI(newRankIndex);
        }
    }

    // Sécurisation des injections de textes pour éviter les crashs si l'HTML est incomplet
    function safeSetText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }

    function showLevelUpUI(rankIdx, dateDuRangPrecedent) {
        const startTime = state.startDate ? Number(state.startDate) : Date.now();
        
        // Si dateDuRangPrecedent n'a pas été reçue, on prend startTime par sécurité
        const lastChangeTime = dateDuRangPrecedent ? Number(dateDuRangPrecedent) : startTime;

        safeSetText('stat-abstinence', formatDuration(Date.now() - startTime));
        safeSetText('stat-prev-rank', formatDuration(Date.now() - lastChangeTime));
        
        try { levelUpSound.play().catch(e => console.log("Audio bloqué")); } catch(e) {}
        
        safeSetText('lu-header-title', "AVANCEMENT DU SYSTÈME");
        safeSetText('lu-main-label', "LEVEL UP");
        
        const mainLabel = document.getElementById('lu-main-label');
        if (mainLabel) mainLabel.style.color = "white";

        safeSetText('lu-stat-label-1', "ABSTINENCE");
        safeSetText('lu-stat-label-2', "RANG PRÉCÉDENT");
        safeSetText('lu-stat-label-3', "EXERCICES COMPLÉTÉS");

        const targetIdx = (rankIdx !== undefined) ? rankIdx : state.currentRankIndex;
        const rank = RANKS[targetIdx];
        if (!rank) return;

        pendingRankColor = rank.color;

        safeSetText('lu-rank-icon', rank.icon);
        safeSetText('lu-rank-name', rank.name);
        
        const rankName = document.getElementById('lu-rank-name');
        if (rankName) rankName.style.color = rank.color;

        const card = document.querySelector('.level-up-card');
        if (card) {
            card.style.borderColor = rank.color;
            card.style.boxShadow = `0 0 40px ${hexToRgba(rank.color, 0.4)}`;
        }
        
        const closeBtn = document.getElementById('lu-close-btn');
        if (closeBtn) {
            closeBtn.innerText = "CONTINUER";
            closeBtn.style.background = rank.color;
        }

        let totalExos = 0;
        Object.values(state.sportHistory).forEach(dayData => {
            const list = Array.isArray(dayData) ? dayData : (dayData.list || []);
            totalExos += list.length;
        });
        safeSetText('stat-total-exos', totalExos);

        const modal = document.getElementById('level-up-modal');
        if (modal) {
            const mobileHeight = window.innerHeight; 
            modal.style.height = mobileHeight + 'px';
            modal.style.setProperty('display', 'block', 'important'); 
            // Sécurité d'affichage si ton CSS utilise de l'opacité
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
        }
    }

    function showPenaltyUI() {
        try { levelResetSound.play().catch(e => console.log("Audio bloqué")); } catch(e) {}
        safeSetText('lu-header-title', "ALERTE DU SYSTÈME");
        safeSetText('lu-main-label', "QUÊTE DE PÉNALITÉ");
        
        const mainLbl = document.getElementById('lu-main-label');
        if (mainLbl) mainLbl.style.color = "#ff0033";
        
        safeSetText('lu-rank-icon', "!");
        safeSetText('lu-rank-name', "DÉGRADATION");
        
        const rName = document.getElementById('lu-rank-name');
        if (rName) rName.style.color = "#ff0033";
        
        pendingRankColor = "#ff0033";

        safeSetText('lu-stat-label-1', "PENALITÉ");
        safeSetText('stat-abstinence', "-200 LP");
        
        const statAbs = document.getElementById('stat-abstinence');
        if (statAbs) statAbs.style.color = "#ff0033";
        
        safeSetText('lu-stat-label-2', "MOTIF");
        safeSetText('stat-prev-rank', "PURGE MENSUELLE");
        
        safeSetText('lu-stat-label-3', "STATUT");
        safeSetText('stat-total-exos', "APPLIQUÉ");

        const closeBtn = document.getElementById('lu-close-btn');
        if (closeBtn) {
            closeBtn.innerText = "ACCEPTER";
            closeBtn.style.background = "#ff0033";
        }
        
        const card = document.querySelector('.level-up-card');
        if (card) {
            card.style.borderColor = "#ff0033";
            card.style.boxShadow = `0 0 40px rgba(255, 0, 51, 0.4)`;
        }
        
        const modal = document.getElementById('level-up-modal');
        if (modal) {
            const mobileHeight = window.innerHeight; 
            modal.style.height = mobileHeight + 'px';
            modal.style.setProperty('display', 'block', 'important');
        }
    }

    function showRankDownUI(rankIdx) {
        try { levelDownSound.play().catch(e => console.log("Audio bloqué")); } catch(e) {}
        safeSetText('lu-header-title', "AVERTISSEMENT DU SYSTÈME");
        safeSetText('lu-main-label', "RÉTROGRADATION");
        
        const mainLbl = document.getElementById('lu-main-label');
        if (mainLbl) mainLbl.style.color = "#ff0033";
        
        const rank = RANKS[rankIdx];
        if (!rank) return;

        pendingRankColor = rank.color;

        safeSetText('lu-rank-icon', rank.icon);
        safeSetText('lu-rank-name', rank.name);
        
        const rName = document.getElementById('lu-rank-name');
        if (rName) rName.style.color = "#ff0033";
        
        safeSetText('lu-stat-label-1', "STATUT");
        safeSetText('stat-abstinence', "RANG INFÉRIEUR");
        
        const statAbs = document.getElementById('stat-abstinence');
        if (statAbs) statAbs.style.color = "#ff0033";
        
        safeSetText('lu-stat-label-2', "ANCIEN RANG");
        safeSetText('stat-prev-rank', RANKS[rankIdx + 1] ? RANKS[rankIdx + 1].name : "Inconnu");
        
        safeSetText('lu-stat-label-3', "MESSAGE");
        safeSetText('stat-total-exos', "LA FORCE DIMINUE...");

        const closeBtn = document.getElementById('lu-close-btn');
        if (closeBtn) {
            closeBtn.innerText = "REPRENDRE L'ENTRAINEMENT";
            closeBtn.style.background = "#ff0033";
        }
        
        const card = document.querySelector('.level-up-card');
        if (card) {
            card.style.borderColor = "#ff0033";
            card.style.boxShadow = `0 0 40px rgba(255, 0, 51, 0.4)`;
        }
        
        const modal = document.getElementById('level-up-modal');
        if (modal) {
            const mobileHeight = window.innerHeight; 
            modal.style.height = mobileHeight + 'px';
            modal.style.setProperty('display', 'block', 'important');
        }
    }

    function closeLevelUp() {
        const modal = document.getElementById('level-up-modal');
        if (modal) modal.style.setProperty('display', 'none', 'important');

        try {
            if (pendingRankColor) {
                document.documentElement.style.setProperty('--system-blue', pendingRankColor);
            }
        } catch (error) {
            console.error("Erreur couleur globale :", error);
        }
        
        try {
            const statAbstinence = document.getElementById('stat-abstinence');
            if (statAbstinence) statAbstinence.style.color = "white"; 
        } catch (error) {
             console.error("Erreur reset styles :", error);
        }
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
        
        safeSetText('rank-medal', cur.icon);
        safeSetText('rank-name', cur.name);
        safeSetText('lp-val', state.points);

        const prog = next === cur ? 100 : ((state.points - cur.min) / (next.min - cur.min)) * 100;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = `${prog}%`;
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

        const exoListEl = document.getElementById('exo-list');
        if (exoListEl) {
            exoListEl.innerHTML = listToUse.map((ex, i) => {
                const exoID = `${state.mode}-${i}`;
                const isChecked = dayData.list.includes(exoID);
                const defaultReps = ex.hasReps === false ? "" : 10;
                const savedReps = dayData.details[exoID]?.reps !== undefined ? dayData.details[exoID].reps : defaultReps;

                return `<div class="exo-item ${isChecked ? 'checked' : ''}" onclick="toggleExo('${exoID}', event)">
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
                    <div class="exo-right-inputs" onclick="event.stopPropagation();">
                        ${ex.hasKg ? `
                            <input type="number" class="exo-input-sub" id="kg-${exoID}-1" placeholder="1st kg" value="${dayData.details[exoID]?.kg1 || ''}" oninput="updateExoData('${exoID}')">
                            <input type="number" class="exo-input-sub" id="kg-${exoID}-2" placeholder="2nd kg" value="${dayData.details[exoID]?.kg2 || ''}" oninput="updateExoData('${exoID}')">
                            <input type="number" class="exo-input-sub" id="kg-${exoID}-3" placeholder="3rd kg" value="${dayData.details[exoID]?.kg3 || ''}" oninput="updateExoData('${exoID}')">
                        ` : ''}
                    </div>
                </div>`;
            }).join('');
        }

        safeSetText('exo-count', `${currentModeDone.length}/${listToUse.length}`);
    }

    function formatDuration(ms) {
        if (isNaN(ms) || ms < 0) return "0d 0h";
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        const rHours = hours % 24;
        const rMinutes = minutes % 60;

        if (days > 0) {
            return `${days}j ${rHours}h`;
        } else if (hours > 0) {
            return `${rHours}h ${rMinutes}m`;
        } else {
            return `${rMinutes} min`;
        }
    }

    function toggleExo(exoID, event) {
        if (event && event.target.type === 'checkbox') return;

        const t = getT();
        if (!state.sportHistory[t]) {
            state.sportHistory[t] = { list: [], details: {}, color: getCurrentRankColor() };
        }

        const dayData = state.sportHistory[t];
        if (!dayData.details) dayData.details = {};

        const index = dayData.list.indexOf(exoID);
        const currentMode = exoID.split('-')[0];
        const exoIndex = parseInt(exoID.split('-')[1]);
        const exoConfig = EXOS[currentMode][exoIndex];

        let pointsGagnes = 0;
        let currentReps = "";

        if (exoConfig.hasReps === false) {
            pointsGagnes = 5; 
        } else {
            const repInput = document.getElementById(`rep-${exoID}`);
            currentReps = repInput ? (parseInt(repInput.value) || 0) : 10;
            pointsGagnes = currentReps; // 1 rep = 1 LP
        }

        let pointsCalculations = state.points;

        if (index === -1) {
            // ON COCHE
            dayData.list.push(exoID);
            pointsCalculations += pointsGagnes;

            // On initialise l'objet s'il n'existe pas
            if (!dayData.details[exoID]) dayData.details[exoID] = {};
            
            // On mémorise les points ET les reps exacts au moment du clic
            dayData.details[exoID].points = pointsGagnes;
            if (exoConfig.hasReps !== false) {
                dayData.details[exoID].reps = currentReps;
            }
        } else {
            // ON DÉCOCHE
            dayData.list.splice(index, 1);
            
            // On retire EXACTEMENT ce qui avait été accumulé
            const pointsALesquelsOnRenonce = (dayData.details[exoID] && dayData.details[exoID].points !== undefined) 
                ? dayData.details[exoID].points 
                : pointsGagnes;
                
            pointsCalculations = Math.max(0, pointsCalculations - pointsALesquelsOnRenonce);
            
            // On nettoie proprement
            delete dayData.details[exoID];
        }

        state.points = pointsCalculations;

        // Recalcul de la couleur du jour
        let calculatedRankIdx = 0;
        RANKS.forEach((r, i) => { if (pointsCalculations >= r.min) calculatedRankIdx = i; });
        dayData.color = RANKS[calculatedRankIdx]?.color || "#94a3b8";

        save();

        updateUI();
        renderExos();
        if (typeof renderCalendar === 'function') renderCalendar();

        setTimeout(() => {
            checkLevelUp(state.points);
        }, 30);
    }

    function handleRepChange(exoID) {
        const t = getT();
        // Si l'exercice n'est pas coché, on s'en fiche, on ne fait rien
        if (!state.sportHistory[t] || !state.sportHistory[t].list.includes(exoID)) return;

        const dayData = state.sportHistory[t];
        const repInput = document.getElementById(`rep-${exoID}`);
        const nouvellesReps = repInput ? (parseInt(repInput.value) || 0) : 10;

        // On récupère ce que l'exercice avait donné comme points précédemment
        const anciensPoints = dayData.details[exoID] || 0;

        // Si le nombre n'a pas changé, on stoppe
        if (nouvellesReps === anciensPoints) return;

        // On ajuste le total global des points (on retire les anciens, on ajoute les nouveaux)
        state.points = Math.max(0, state.points - anciensPoints + nouvellesReps);

        // On met à jour la mémoire de cet exercice précis
        dayData.details[exoID] = nouvellesReps;

        // On recalcule la couleur globale du jour
        let calculatedRankIdx = 0;
        RANKS.forEach((r, i) => { if (state.points >= r.min) calculatedRankIdx = i; });
        dayData.color = RANKS[calculatedRankIdx]?.color || "#94a3b8";

        // Sauvegarde et mise à jour de l'écran
        save();
        updateUI();
        if (typeof renderCalendar === 'function') renderCalendar();

        // On vérifie si ça déclenche un Level Up ou Level Down !
        setTimeout(() => {
            checkLevelUp(state.points);
        }, 30);
    }

    function updateExoData(exoID) {
        const t = getT();
        if (!state.sportHistory[t]) {
            state.sportHistory[t] = { list: [], details: {}, color: getCurrentRankColor() };
        }
        
        const dayData = state.sportHistory[t];
        if (!dayData.details) dayData.details = {};
        if (!dayData.details[exoID]) dayData.details[exoID] = {};

        // 1. Récupération des éléments du DOM
        const repInput = document.getElementById(`rep-${exoID}`);
        const kg1Input = document.getElementById(`kg-${exoID}-1`);
        const kg2Input = document.getElementById(`kg-${exoID}-2`);
        const kg3Input = document.getElementById(`kg-${exoID}-3`);

        // 2. Sauvegarde des valeurs dans les détails
        if (repInput) dayData.details[exoID].reps = parseInt(repInput.value) || 0;
        if (kg1Input) dayData.details[exoID].kg1 = kg1Input.value;
        if (kg2Input) dayData.details[exoID].kg2 = kg2Input.value;
        if (kg3Input) dayData.details[exoID].kg3 = kg3Input.value;

        // 3. AJUSTEMENT DYNAMIQUE DES LP (Si l'exercice est coché)
        if (dayData.list.includes(exoID)) {
            const nouvellesReps = repInput ? (parseInt(repInput.value) || 0) : 10;
            const anciensPoints = dayData.details[exoID].points !== undefined ? dayData.details[exoID].points : 10;

            // Si la valeur a changé, on applique la différence au total global
            if (nouvellesReps !== anciensPoints) {
                state.points = Math.max(0, state.points - anciensPoints + nouvellesReps);
                dayData.details[exoID].points = nouvellesReps; // Met à jour la mémoire locale de l'exo
                
                // Recalcul de la couleur du jour
                let calculatedRankIdx = 0;
                RANKS.forEach((r, i) => { if (state.points >= r.min) calculatedRankIdx = i; });
                dayData.color = RANKS[calculatedRankIdx]?.color || "#94a3b8";
            }
        }

        save();
        updateUI(); // Met à jour le compteur LP et la barre de progression immédiatement à l'écran
        if (typeof renderCalendar === 'function') renderCalendar();

        // Vérifie en direct si le changement de chiffre provoque un Level Up ou Level Down
        setTimeout(() => {
            checkLevelUp(state.points);
        }, 30);
    }

    function renderCalendar() {
    const cal = document.getElementById('calendar'); 
    if(!cal) return;
    cal.innerHTML = "";
    const now = new Date();
    const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth();
    
    const monthLabel = document.getElementById('month-label');
    if (monthLabel) monthLabel.innerText = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentViewDate);
    
    const days = new Date(year, month + 1, 0).getDate();

    for(let i=1; i<=days; i++) {
        const isToday = (i === now.getDate() && month === now.getMonth() && year === now.getFullYear());
        const isFixedPenaltyDay = (i === 1 && (month + 1) % 2 === 0);
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const dayData = state.sportHistory[dStr];
        
        let count = 0, rankColor = '#94a3b8'; // Gris par défaut (Rang E)

        if (dayData) {
            const list = Array.isArray(dayData) ? dayData : (dayData.list || []);
            count = list.length;
            rankColor = dayData.color || "#94a3b8";
        }

        // CORRECTIF DYNAMIQUE : Si c'est aujourd'hui, on force la couleur du rang actuel en temps réel
        if (isToday) {
            rankColor = typeof getCurrentRankColor === 'function' ? getCurrentRankColor() : (RANKS[state.currentRankIndex]?.color || "#94a3b8");
        }

        let opacity = 0;
        if (count >= 9) opacity = 1.0; 
        else if (count >= 5) opacity = 0.6; 
        else if (count >= 2) opacity = 0.3; 
        else if (count === 1) opacity = 0.15; 

        let bgStyle = "";
        if (isFixedPenaltyDay) {
            bgStyle = `border: 2px solid var(--system-warning); color: #ff4d4d; font-weight: 900;`;
        } else if (opacity > 0) {
            bgStyle = `background-color: ${hexToRgba(rankColor, opacity)}; color: ${opacity > 0.6 ? '#000' : 'var(--text)'};`;
        }
        
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

    function updateTimer() {
        const diff = Date.now() - state.startDate;
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff / 3600000) % 24).toString().padStart(2, '0');
        const m = Math.floor((diff / 60000) % 60).toString().padStart(2, '0');
        const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        
        safeSetText('timer', `${d}j ${h}h ${m}m ${s}s`);
        
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
        if(confirm("ALERTE SYSTÈME : Confirmer l'échec de mission ? Votre temps de survie sera réinitialisé.")) {
            state.startDate = Date.now();
            state.lastRankChangeDate = Date.now();
            save();
            updateTimer();
            alert("Mission échouée. Compteur réinitialisé. Redoublez d'efforts.");
        }
    }

    function exportData() {
        const dataStr = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
        const backupIo = document.getElementById('backup-io');
        if (backupIo) backupIo.value = dataStr;
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
        const backupIo = document.getElementById('backup-io');
        if(!backupIo) return;
        const code = backupIo.value.trim();
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

    // --- INITIALISATION UNIQUE ---
    if (!state.mode) {
        state.mode = 'haut';
    }

    save();

    setMode(state.mode);
    checkPointDecay();
    updateUI(); 
    renderCalendar();
    updateTimer();

    setInterval(updateTimer, 1000); 
    setInterval(checkPointDecay, 60000);

//     setTimeout(() => {
//     console.log("Exécution du test forcé de la modale");
//     showLevelUpUI(1); 
// }, 2000);