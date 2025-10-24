document.addEventListener('DOMContentLoaded', () => {
    // App state
    let appData = {
        startDate: null,
        startWeight: null,
        goalWeight: null,
        entries: []
    };
    let progressChart;

    // DOM Elements
    const chartCanvas = document.getElementById('progress-chart');
    const currentDateInput = document.getElementById('current-date');
    const startDateInput = document.getElementById('start-date');
    const startWeightInput = document.getElementById('start-weight');
    const goalWeightInput = document.getElementById('goal-weight');
    const saveSetupBtn = document.getElementById('save-setup');
    const editSetupBtn = document.getElementById('edit-setup');
    const dictateBtn = document.getElementById('dictate-btn-large');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');
    const tabNav = document.querySelector('.tab-nav');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('.tab-button');

    // --- Core Functions ---
    function toggleConfigLock(locked) {
        startDateInput.disabled = locked;
        startWeightInput.disabled = locked;
        goalWeightInput.disabled = locked;
        saveSetupBtn.style.display = locked ? 'none' : 'inline-block';
        editSetupBtn.style.display = locked ? 'inline-block' : 'none';
    }

    function saveData() {
        localStorage.setItem('weightTrackerData', JSON.stringify(appData));
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

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                y: { 
                    beginAtZero: false,
                    min: newMin,
                    max: newMax
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
            const match = transcript.match(/\d+([,.]\d+)?/);

            if (match) {
                const weight = parseFloat(match[0].replace(',', '.'));
                const date = currentDateInput.value;
                const existingEntryIndex = appData.entries.findIndex(entry => entry.date === date);

                if (existingEntryIndex !== -1) {
                    appData.entries[existingEntryIndex].weight = weight;
                } else {
                    appData.entries.push({ date, weight });
                }
                appData.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
                saveData();
                alert(`Poids de ${weight}kg enregistré pour le ${new Date(date).toLocaleDateString()}.`);
            } else {
                alert("Aucun poids détecté. Essayez à nouveau.");
            }
        };
    } else {
        dictateBtn.style.display = 'none';
    }

    // --- Data Import/Export ---
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
    function initApp(isConfigured) {
        if (isConfigured) {
            startDateInput.value = appData.startDate;
            startWeightInput.value = appData.startWeight;
            goalWeightInput.value = appData.goalWeight;
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
    }

    editSetupBtn.addEventListener('click', () => {
        toggleConfigLock(false);
    });

    saveSetupBtn.addEventListener('click', () => {
        const start = parseFloat(startWeightInput.value);
        const goal = parseFloat(goalWeightInput.value);
        const startDate = startDateInput.value;

        if (start > 0 && goal > 0 && startDate) {
            appData.startWeight = start;
            appData.goalWeight = goal;
            appData.startDate = startDate;

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