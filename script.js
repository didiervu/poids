document.addEventListener('DOMContentLoaded', () => {
    // App state
    let appData = {
        startDate: null,
        startWeight: null,
        goalWeight: null,
        palierStep: 5, // Default value
        palierLevel: 0,
        theme: 'light',
        entries: []
    };
    let progressChart;

    // DOM Elements
    const chartCanvas = document.getElementById('progress-chart');
    const currentDateInput = document.getElementById('current-date');
    const startDateInput = document.getElementById('start-date');
    const startWeightInput = document.getElementById('start-weight');
    const goalWeightInput = document.getElementById('goal-weight');
    const palierStepInput = document.getElementById('palier-step');
    const saveSetupBtn = document.getElementById('save-setup');
    const editSetupBtn = document.getElementById('edit-setup');
    const dictateBtn = document.getElementById('dictate-btn-large');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');
    const manualWeightInput = document.getElementById('manual-weight');
    const saveWeightBtn = document.getElementById('save-weight-btn');
    const themeCheckbox = document.getElementById('theme-checkbox');
    const tabNav = document.querySelector('.tab-nav');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('.tab-button');
    const weightLostDisplay = document.getElementById('weight-lost-display');
    const nextPalierDisplay = document.getElementById('next-palier-display');

    const MAX_PALIER_LEVEL = 5;

    // --- Core Functions ---
    function updateButtonColor(level) {
        for (let i = 1; i <= MAX_PALIER_LEVEL; i++) {
            dictateBtn.classList.remove(`palier-level-${i}`);
        }
        if (level > 0) {
            const levelClass = `palier-level-${Math.min(level, MAX_PALIER_LEVEL)}`;
            dictateBtn.classList.add(levelClass);
        }
    }

    function checkPalierReached(previousWeight, newWeight) {
        if (!appData.palierStep || appData.palierStep <= 0 || !previousWeight || newWeight >= previousWeight) {
            return;
        }

        const palierStep = appData.palierStep;
        const paliersCrossed = Math.floor(previousWeight / palierStep) - Math.floor(newWeight / palierStep);

        if (paliersCrossed > 0) {
            appData.palierLevel += paliersCrossed;
            updateButtonColor(appData.palierLevel);

            dictateBtn.classList.add('button-celebrate');
            setTimeout(() => {
                dictateBtn.classList.remove('button-celebrate');
            }, 1500); // Animation duration
        }
    }

    function updateNextPalierDisplay() {
        if (appData.palierStep > 0 && appData.entries.length > 0) {
            const latestWeight = appData.entries[appData.entries.length - 1].weight;
            const palierStep = appData.palierStep;

            let targetPalierWeight;
            let kilosToReachPalier;

            // Calculate the palier that is immediately below or at the current weight
            targetPalierWeight = Math.floor(latestWeight / palierStep) * palierStep;

            // If the current weight is exactly on a palier, the target palier is the one below it.
            if (latestWeight === targetPalierWeight) {
                targetPalierWeight -= palierStep;
            }

            kilosToReachPalier = latestWeight - targetPalierWeight;

            if (kilosToReachPalier > 0) {
                nextPalierDisplay.textContent = `Prochain palier : ${targetPalierWeight.toFixed(1)} kg (encore ${kilosToReachPalier.toFixed(1)} kg)`;
            } else {
                // This case should ideally not be reached if logic is correct,
                // but as a fallback, it means the weight is below the calculated targetPalierWeight.
                nextPalierDisplay.textContent = 'Palier atteint ! 🎉';
            }
        } else {
            nextPalierDisplay.textContent = '';
        }
    }

    function updateWeightLostDisplay() {
        if (appData.startWeight && appData.entries.length > 0) {
            const latestWeight = appData.entries[appData.entries.length - 1].weight;
            const weightLost = appData.startWeight - latestWeight;
            if (weightLost > 0) {
                weightLostDisplay.textContent = `Poids perdu : ${weightLost.toFixed(1)} kg`;
            } else if (weightLost < 0) {
                weightLostDisplay.textContent = `Poids gagné : ${Math.abs(weightLost).toFixed(1)} kg`;
            } else {
                weightLostDisplay.textContent = `Aucun changement de poids.`;
            }
        } else {
            weightLostDisplay.textContent = '';
        }
    }

    function toggleConfigLock(locked) {
        startDateInput.disabled = locked;
        startWeightInput.disabled = locked;
        goalWeightInput.disabled = locked;
        palierStepInput.disabled = locked;
        saveSetupBtn.style.display = locked ? 'none' : 'inline-block';
        editSetupBtn.style.display = locked ? 'inline-block' : 'none';
    }

    function saveData() {
        localStorage.setItem('weightTrackerData', JSON.stringify(appData));
        updateWeightLostDisplay();
        updateNextPalierDisplay();
    }

    function updateChart() {
        if (!progressChart && !document.getElementById('tab-graph').classList.contains('active')) {
            return; // Don't render chart if its tab is not visible
        }

        const labels = appData.entries.map(entry => new Date(entry.date).toLocaleDateString());
        const weights = appData.entries.map(entry => entry.weight);

        if (weights.length === 0) {
            return; // Don't do anything if there is no data
        }

        const minWeight = Math.min(...weights);
        const maxWeight = Math.max(...weights);
        const padding = 4; // 4kg padding

        const newMin = minWeight - padding;
        const newMax = maxWeight + padding;

        const newDatasets = [{
            label: 'Mon Poids (kg)',
            data: weights,
            borderColor: '#457b9d',
            backgroundColor: '#457b9d',
            tension: 0.1,
            fill: false
        }];

        if (appData.goalWeight) {
            newDatasets.push({
                label: 'Poids souhaité (kg)',
                data: Array(labels.length).fill(appData.goalWeight),
                borderColor: '#e63946',
                backgroundColor: '#e63946',
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0 // No points on the goal line
            });
        }

        // Add paliers
        if (appData.palierStep > 0) {
            const palierStep = appData.palierStep;
            const firstPalier = Math.ceil(minWeight / palierStep) * palierStep;
            const lastPalier = Math.floor(maxWeight / palierStep) * palierStep;

            for (let p = firstPalier; p <= lastPalier; p += palierStep) {
                if (p > minWeight && p < maxWeight) { // Only show paliers within the weight range
                    newDatasets.push({
                        label: `Palier (${p} kg)`,
                        data: Array(labels.length).fill(p),
                        borderColor: '#a8dadc',
                        backgroundColor: '#a8dadc',
                        borderDash: [3, 3],
                        fill: false,
                        pointRadius: 0
                    });
                }
            }
        }

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                y: { 
                    beginAtZero: false,
                    min: newMin,
                    max: newMax,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + ' kg';
                        }
                    }
                } 
            },
            plugins: { legend: { display: true } }
        };

        if (progressChart) {
            progressChart.data.labels = labels;
            progressChart.data.datasets = newDatasets;
            progressChart.options.scales.y.min = newMin;
            progressChart.options.scales.y.max = newMax;
            progressChart.update();
        } else {
            progressChart = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: newDatasets
                },
                options: chartOptions
            });
        }
    }

    function setTodayDate() {
        currentDateInput.value = new Date().toISOString().split('T')[0];
    }

    function addWeightEntry(date, weight) {
        if (!date || !weight || weight <= 0) {
            alert('Veuillez entrer une date et un poids valides.');
            return false;
        }

        const previousWeight = appData.entries.length > 0 ? appData.entries[appData.entries.length - 1].weight : null;
        const existingEntryIndex = appData.entries.findIndex(entry => entry.date === date);

        if (existingEntryIndex !== -1) {
            appData.entries[existingEntryIndex].weight = weight;
        } else {
            appData.entries.push({ date, weight });
        }

        appData.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        checkPalierReached(previousWeight, weight);
        saveData();
        return true;
    }

    // --- Tab Navigation ---
    function switchTab(targetTabId) {
        tabContents.forEach(tab => tab.classList.remove('active'));
        tabButtons.forEach(button => button.classList.remove('active'));

        const newActiveTab = document.getElementById(targetTabId);
        const newActiveButton = document.querySelector(`.tab-button[data-tab="${targetTabId}"]`);

        if (newActiveTab) newActiveTab.classList.add('active');
        if (newActiveButton) newActiveButton.classList.add('active');

        if (targetTabId === 'tab-graph') {
            setTimeout(updateChart, 0); // Update chart when tab is shown
        }
    }

    tabNav.addEventListener('click', (e) => {
        const button = e.target.closest('.tab-button');
        if (button && !button.disabled) {
            switchTab(button.dataset.tab);
        }
    });

    // --- Speech Recognition ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';

        dictateBtn.addEventListener('click', () => recognition.start());

        recognition.onstart = () => dictateBtn.classList.add('listening');
        recognition.onend = () => dictateBtn.classList.remove('listening');
        recognition.onerror = (event) => {
            dictateBtn.classList.remove('listening');
            alert(`Erreur de reconnaissance: ${event.error}`);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const match = transcript.match(/\d+(\s*[,.]\s*\d+)?/);

            if (match) {
                const weightStr = match[0].replace(/\s/g, '');
                const weight = parseFloat(weightStr.replace(',', '.'));
                const date = currentDateInput.value;
                
                if (addWeightEntry(date, weight)) {
                    alert(`Poids de ${weight}kg enregistré pour le ${new Date(date).toLocaleDateString()}.`);
                }
            } else {
                alert("Aucun poids détecté. Essayez à nouveau.");
            }
        };
    } else {
        dictateBtn.style.display = 'none';
    }

    // --- Data Import/Export ---
    saveWeightBtn.addEventListener('click', () => {
        const weight = parseFloat(manualWeightInput.value);
        const date = currentDateInput.value;

        if (addWeightEntry(date, weight)) {
            alert(`Poids de ${weight}kg enregistré pour le ${new Date(date).toLocaleDateString()}.`);
            manualWeightInput.value = ''; // Clear input field
        }
    });

    exportBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(appData);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sauvegarde-poids.json';
        link.click();
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => importFileInput.click());

    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && importedData.entries) {
                    appData = importedData;
                    saveData();
                    initApp(true); // Re-initialize the app state
                    updateWeightLostDisplay();
                    alert('Données importées avec succès !');
                } else {
                    alert('Fichier de sauvegarde invalide.');
                }
            } catch (error) {
                alert('Erreur lors de la lecture du fichier.');
            }
        };
        reader.readAsText(file);
        importFileInput.value = '';
    });

    // --- App Initialization ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeCheckbox.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            themeCheckbox.checked = false;
        }
    }

    themeCheckbox.addEventListener('change', () => {
        appData.theme = themeCheckbox.checked ? 'dark' : 'light';
        applyTheme(appData.theme);
        saveData();
    });

    function initApp(isConfigured) {
        applyTheme(appData.theme || 'light');

        if (isConfigured) {
            startDateInput.value = appData.startDate;
            startWeightInput.value = appData.startWeight;
            goalWeightInput.value = appData.goalWeight;
            palierStepInput.value = appData.palierStep || 5;
            updateButtonColor(appData.palierLevel);
            tabButtons.forEach(b => b.disabled = false);
            switchTab('tab-home');
            toggleConfigLock(true);
        } else {
            tabButtons.forEach(b => {
                if (b.dataset.tab !== 'tab-config') b.disabled = true;
            });
            switchTab('tab-config');
            toggleConfigLock(false);
        }
        setTodayDate();
        updateChart();
        updateWeightLostDisplay();
        updateNextPalierDisplay();
    }

    editSetupBtn.addEventListener('click', () => {
        toggleConfigLock(false);
    });

    saveSetupBtn.addEventListener('click', () => {
        const start = parseFloat(startWeightInput.value);
        const goal = parseFloat(goalWeightInput.value);
        const startDate = startDateInput.value;
        const palierStep = parseFloat(palierStepInput.value);

        if (start > 0 && goal > 0 && startDate && palierStep > 0) {
            appData.startWeight = start;
            appData.goalWeight = goal;
            appData.startDate = startDate;
            appData.palierStep = palierStep;

            // Add the starting weight to the entries if it's not already there
            const existingEntryIndex = appData.entries.findIndex(entry => entry.date === startDate);
            if (existingEntryIndex !== -1) {
                appData.entries[existingEntryIndex].weight = start;
            } else {
                appData.entries.push({ date: startDate, weight: start });
            }

            appData.entries.sort((a, b) => new Date(a.date) - new Date(b.date));

            saveData();
            initApp(true);
        } else {
            alert('Veuillez entrer une date de début, un poids de départ et un poids souhaité valides.');
        }
    });

    const savedData = localStorage.getItem('weightTrackerData');
    if (savedData) {
        appData = JSON.parse(savedData);
        initApp(appData.startWeight && appData.goalWeight);
    } else {
        initApp(false);
    }
});