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

        let state = JSON.parse(localStorage.getItem('bank_system_v3')) || {
            transactions: [],
            recurring: [],
            vaultBase: 0.00,
            lastProcessedMonth: new Date().getMonth()
        };

        let editingRecurringId = null; 
        let editingTransactionId = null; // Suivi de l'ID du flux quotidien en cours de modification
        let isEditingVaultInline = false;

        const RANKS = [
            { name: "MONARQUE DE L'OMBRE (S)", min: 5000, icon: "S", color: "#ff0055" },
            { name: "MAÎTRE DE GUILDE (A)", min: 3000, icon: "A", color: "#f59e0b" },
            { name: "EXORCISTE SUPÉRIEUR (B)", min: 1500, icon: "B", color: "#a855f7" },
            { name: "CHASSEUR DE SANG (C)", min: 500, icon: "C", color: "#3b82f6" },
            { name: "ÉCLAIREUR (D)", min: 200, icon: "D", color: "#22c55e" },
            { name: "VAGABOND (E)", min: 100, icon: "E", color: "#94a3b8" },
            { name: "NÉCROSE DU COMPTE (F)", min: -999999, icon: "F", color: "#7f1d1d" }
        ];

        const CAT_LABELS = {
            mana: { txt: 'Mana', cls: 'cat-mana' },
            food: { txt: 'Potion', cls: 'cat-food' },
            vie: { txt: 'Vie Q.', cls: 'cat-vie' },
            stuff: { txt: 'Stuff', cls: 'cat-stuff' },
            epargne: { txt: 'Épargne', cls: 'cat-epargne' },
            imprevu: { txt: 'Imprévu', cls: 'cat-imprevu' }
        };

        function getCatBadge(catKey) {
            const cat = CAT_LABELS[catKey];
            if (!cat) return `<span class="cat-tag cat-none">Flux</span>`;
            return `<span class="cat-tag ${cat.cls}">${cat.txt}</span>`;
        }

        function save() {
            localStorage.setItem('bank_system_v3', JSON.stringify(state));
            updateUI();
        }

        function enableVaultInlineEdit() {
            if (isEditingVaultInline) return;
            isEditingVaultInline = true;

            const currentTotal = state.vaultBase + calculateVaultFluxes();
            const wrapper = document.getElementById('vault-wrapper');
            
            wrapper.innerHTML = `
                <input type="number" step="0.01" class="vault-input-inline" id="vault-edit-input" value="${currentTotal.toFixed(2)}">
            `;

            const input = document.getElementById('vault-edit-input');
            input.focus();
            input.select();

            input.addEventListener('blur', saveVaultInlineEdit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveVaultInlineEdit();
            });
        }

        function saveVaultInlineEdit() {
            const input = document.getElementById('vault-edit-input');
            if (!input) return;

            const newTotal = parseFloat(input.value);
            if (!isNaN(newTotal)) {
                state.vaultBase = newTotal - calculateVaultFluxes();
            }
            
            isEditingVaultInline = false;
            save();
        }

        function calculateVaultFluxes() {
            let accumulated = 0;
            state.recurring.forEach(r => {
                if(r.category === 'epargne') accumulated += Math.abs(r.amount);
            });
            state.transactions.forEach(t => {
                if (t.amount < 0 && t.category === 'epargne') accumulated += Math.abs(t.amount);
            });
            return accumulated;
        }

        function checkMonthTransition() {
            const now = new Date();
            const currentMonth = now.getMonth();

            if (state.vaultBase === undefined) state.vaultBase = 0;

            if (state.lastProcessedMonth !== undefined && state.lastProcessedMonth !== currentMonth) {
                let income = 0;
                let expenses = 0;
                let totalRecurring = 0;

                state.recurring.forEach(r => {
                    totalRecurring += Math.abs(r.amount);
                    if(r.category === 'epargne') state.vaultBase += Math.abs(r.amount);
                });
                
                state.transactions.forEach(t => {
                    if (t.amount > 0) income += t.amount;
                    else {
                        expenses += Math.abs(t.amount);
                        if(t.category === 'epargne') state.vaultBase += Math.abs(t.amount);
                    }
                });

                const leftover = income - expenses - totalRecurring;
                state.transactions = []; 

                if (leftover > 0) {
                    state.transactions.push({
                        id: Date.now(),
                        desc: "💰 Report Trésorerie M-1",
                        amount: leftover,
                        date: now.toISOString(),
                        category: "mana",
                        isRecurring: false
                    });
                }

                state.lastProcessedMonth = currentMonth;
                localStorage.setItem('bank_system_v3', JSON.stringify(state));
            }
        }

        // Fonction pivot pour gérer l'ajout ou la modification d'un flux quotidien
        function processFlux(type) {
            const desc = document.getElementById('desc').value;
            const amt = parseFloat(document.getElementById('amount').value);
            const cat = document.getElementById('category').value;
            if (!desc || isNaN(amt)) return;

            if (editingTransactionId !== null) {
                // Mode Modification
                const item = state.transactions.find(t => t.id === editingTransactionId);
                if (item) {
                    item.desc = desc;
                    item.amount = type === 'expense' ? -amt : amt;
                    item.category = cat;
                }
                // Reset du mode modification
                editingTransactionId = null;
                document.getElementById('flux-title').innerText = "Nouvelle Mission de Flux";
                document.getElementById('btn-flux-cancel').style.display = "none";
            } else {
                // Mode Création standard
                state.transactions.push({
                    id: Date.now(),
                    desc: desc,
                    amount: type === 'expense' ? -amt : amt,
                    date: new Date().toISOString(),
                    category: cat,
                    isRecurring: false
                });
            }

            document.getElementById('desc').value = '';
            document.getElementById('amount').value = '';
            save();
        }

        // Active le mode d'édition pour un flux de l'historique
        function editTransaction(id) {
            const item = state.transactions.find(t => t.id === id);
            if (!item) return;

            document.getElementById('desc').value = item.desc;
            document.getElementById('amount').value = Math.abs(item.amount);
            document.getElementById('category').value = item.category;

            editingTransactionId = id;
            
            // Changement de l'interface graphique pour le mode édition (calqué sur le style dynamique)
            const title = document.getElementById('flux-title');
            title.innerText = "💾 Modifier la Mission de Flux";
            title.style.color = "var(--rank-color)";
            
            document.getElementById('btn-flux-cancel').style.display = "block";
            
            // Scroll léger vers le formulaire pour l'ergonomie mobile
            document.getElementById('flux-title').scrollIntoView({ behavior: 'smooth' });
        }

        // Sortir du mode d'édition du flux quotidien sans sauvegarder
        function cancelFluxEdit() {
            editingTransactionId = null;
            document.getElementById('desc').value = '';
            document.getElementById('amount').value = '';
            document.getElementById('flux-title').innerText = "Nouvelle Mission de Flux";
            document.getElementById('flux-title').style.color = "var(--rank-color)";
            document.getElementById('btn-flux-cancel').style.display = "none";
        }

        function editRecurring(id) {
            const item = state.recurring.find(r => r.id === id);
            if (!item) return;

            document.getElementById('recur-desc').value = item.desc;
            document.getElementById('recur-amount').value = Math.abs(item.amount);
            document.getElementById('recur-category').value = item.category;

            editingRecurringId = id;
            const btn = document.getElementById('btn-recur-action');
            btn.innerText = "💾 Enregistrer Modification";
            btn.style.borderColor = "var(--system-gold)";
            btn.style.color = "var(--system-gold)";
        }

        function addRecurring() {
            const desc = document.getElementById('recur-desc').value;
            const amt = parseFloat(document.getElementById('recur-amount').value);
            const cat = document.getElementById('recur-category').value;
            if (!desc || isNaN(amt)) return;

            if (editingRecurringId !== null) {
                const item = state.recurring.find(r => r.id === editingRecurringId);
                if (item) {
                    item.desc = desc;
                    item.amount = -amt;
                    item.category = cat;
                }
                editingRecurringId = null;
                const btn = document.getElementById('btn-recur-action');
                btn.innerText = "+ AJOUTER FIXE";
                btn.style.borderColor = "var(--system-blue)";
                btn.style.color = "var(--system-blue)";
            } else {
                state.recurring.push({
                    id: 'rec-' + Date.now(),
                    desc: desc,
                    amount: -amt,
                    category: cat
                });
            }

            document.getElementById('recur-desc').value = '';
            document.getElementById('recur-amount').value = '';
            save();
        }

        function deleteTransaction(id) {
            if (editingTransactionId === id) cancelFluxEdit();
            state.transactions = state.transactions.filter(t => t.id !== id);
            save();
        }

        function deleteRecurring(id) {
            if (editingRecurringId === id) {
                editingRecurringId = null;
                const btn = document.getElementById('btn-recur-action');
                btn.innerText = "+ AJOUTER FIXE";
                btn.style.borderColor = "var(--system-blue)";
                btn.style.color = "var(--system-blue)";
            }
            state.recurring = state.recurring.filter(r => r.id !== id);
            save();
        }

        function resetSystem() {
            if(confirm("Effacer tout l'historique, l'épargne et les charges fixes ?")) {
                state.transactions = [];
                state.recurring = [];
                state.vaultBase = 0;
                state.lastProcessedMonth = new Date().getMonth();
                cancelFluxEdit();
                save();
            }
        }

        function updateUI() {
            const list = document.getElementById('transaction-list');
            const recurList = document.getElementById('recurring-list');
            list.innerHTML = '';
            recurList.innerHTML = '';

            let income = 0;
            let expenses = 0;
            let totalRecurring = 0;
            let dynamicVaultFlux = 0;

            state.recurring.forEach(r => {
                totalRecurring += Math.abs(r.amount);
                if(r.category === 'epargne') dynamicVaultFlux += Math.abs(r.amount);

                recurList.innerHTML += `
                    <div class="transaction-item">
                        <div class="t-name">
                            ${r.desc} 
                            <span class="recur-tag">FIXE</span>
                            ${getCatBadge(r.category)}
                        </div>
                        <div class="t-amt ${r.category === 'epargne' ? 'purple-text' : 'negative'}">
                            ${r.amount.toFixed(2)}€
                            <span style="margin-left:15px; cursor:pointer; color:var(--system-blue);" onclick="editRecurring('${r.id}')">✏️</span>
                            <span style="margin-left:10px; cursor:pointer;" onclick="deleteRecurring('${r.id}')">×</span>
                        </div>
                    </div>
                `;
            });

            const displayTransactions = [...state.transactions].reverse();

            displayTransactions.forEach(t => {
                if (t.amount > 0) {
                    income += t.amount;
                } else {
                    expenses += Math.abs(t.amount);
                    if (t.category === 'epargne') dynamicVaultFlux += Math.abs(t.amount);
                }

                let textClass = t.amount > 0 ? 'positive' : 'negative';
                if (t.category === 'epargne') textClass = 'purple-text';

                list.innerHTML += `
                    <div class="transaction-item">
                        <div>
                            <div class="t-name">
                                ${t.desc}
                                ${getCatBadge(t.category)}
                            </div>
                            <div style="font-size:0.6rem; color:var(--text-dim)">${new Date(t.date).toLocaleDateString()}</div>
                        </div>
                        <div class="t-amt ${textClass}">
                            ${t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)}€
                            <span style="margin-left:15px; cursor:pointer; color:var(--system-blue);" onclick="editTransaction(${t.id})">✏️</span>
                            <span style="margin-left:10px; cursor:pointer;" onclick="deleteTransaction(${t.id})">×</span>
                        </div>
                    </div>
                `;
            });

            const totalMana = income - expenses - totalRecurring;
            const totalVault = state.vaultBase + dynamicVaultFlux;

            if (!isEditingVaultInline) {
                document.getElementById('vault-wrapper').innerHTML = `
                    <div class="vault-display" onclick="enableVaultInlineEdit()">${totalVault.toFixed(2)}€</div>
                    <span class="edit-vault-icon" onclick="enableVaultInlineEdit()">✏️</span>
                `;
            }

            document.getElementById('total-balance').innerText = totalMana.toFixed(2);
            
            document.getElementById('stat-inc').innerText = income.toFixed(2) + '€';
            document.getElementById('stat-exp').innerText = (expenses + totalRecurring - dynamicVaultFlux).toFixed(2) + '€';

            const now = new Date();
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysLeft = (lastDay - now.getDate()) + 1;
            
            const daily = totalMana > 0 ? (totalMana / daysLeft) : 0;
            document.getElementById('daily-allowance').innerText = `MANA JOURNALIER : ${daily.toFixed(2)}€`;

            let fortuneTotale = totalMana + totalVault;

            document.getElementById('global-score').innerText = fortuneTotale.toFixed(2) + '€';

            let ratio = fortuneTotale;
            if (fortuneTotale < 0) ratio = -1;

            let currentRank = RANKS[5];
            for (let r of RANKS) {
                if (ratio >= r.min) {
                    currentRank = r;
                    break;
                }
            }

            // INJECTION DES STYLES DYNAMIQUES ICI
            document.documentElement.style.setProperty('--rank-color', currentRank.color);
            document.getElementById('rank-medal').innerText = currentRank.icon;
            document.getElementById('rank-name').innerText = currentRank.name;
            document.getElementById('progress-bar').style.width = Math.min(Math.max(ratio, 0), 100) + '%';
            
            // Met à jour dynamiquement tous les conteneurs avec la classe .system-title
            const systemTitles = document.querySelectorAll('.system-title');
            systemTitles.forEach(title => {
                title.style.color = 'var(--rank-color)';
            });
        }

        checkMonthTransition();
        updateUI();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                }
            });
        }