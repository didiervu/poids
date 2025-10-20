document.addEventListener('DOMContentLoaded', () => {
    const setupDiv = document.getElementById('setup');
    const mainContentDiv = document.getElementById('main-content');
    const saveSetupBtn = document.getElementById('save-setup');
    const addWeightBtn = document.getElementById('add-weight');
    const currentDateInput = document.getElementById('current-date');

    const startWeightInput = document.getElementById('start-weight');
    const goalWeightInput = document.getElementById('goal-weight');
    const currentWeightInput = document.getElementById('current-weight');

    const chartCanvas = document.getElementById('progress-chart');
    let progressChart;

    let appData = {
        startWeight: null,
        goalWeight: null,
        entries: [] // { date: 'YYYY-MM-DD', weight: 75 }
    };

    function saveData() {
        localStorage.setItem('weightTrackerData', JSON.stringify(appData));
    }

    function loadData() {
        const savedData = localStorage.getItem('weightTrackerData');
        if (savedData) {
            appData = JSON.parse(savedData);
            if (appData.startWeight && appData.goalWeight) {
                setupDiv.classList.add('hidden');
                mainContentDiv.classList.remove('hidden');
                updateChart();
            }
        }
    }

    function updateChart() {
        const labels = appData.entries.map(entry => entry.date);
        const weights = appData.entries.map(entry => entry.weight);

        const newDatasets = [{
            label: 'Mon Poids (kg)',
            data: weights,
            borderColor: '#457b9d',
            backgroundColor: '#457b9d',
            tension: 0.1
        }];

        if (progressChart) {
            // If chart exists, just update data and refresh
            progressChart.data.labels = labels;
            progressChart.data.datasets = newDatasets;
            progressChart.update();
        } else {
            // If chart doesn't exist, create it
            progressChart = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: newDatasets
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    },
                    plugins: {
                        legend: {
                            display: true
                        }
                    }
                }
            });
        }
    }

    function setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        currentDateInput.value = today;
    }

    function addWeightEntry(date, weight) {
        if (weight > 0 && date) {
            const existingEntryIndex = appData.entries.findIndex(entry => entry.date === date);
            if (existingEntryIndex !== -1) {
                appData.entries[existingEntryIndex].weight = weight;
            } else {
                appData.entries.push({ date, weight });
            }

            appData.entries.sort((a, b) => new Date(a.date) - new Date(b.date));

            saveData();
            updateChart();
            currentWeightInput.value = ''; 
        } else {
            alert('Veuillez entrer une date et un poids valides.');
        }
    }

    saveSetupBtn.addEventListener('click', () => {
        const start = parseFloat(startWeightInput.value);
        const goal = parseFloat(goalWeightInput.value);

        if (start > 0 && goal > 0) {
            appData.startWeight = start;
            appData.goalWeight = goal;
            saveData();
            setupDiv.classList.add('hidden');
            mainContentDiv.classList.remove('hidden');
            updateChart();
        } else {
            alert('Veuillez entrer un poids de départ et un poids souhaité valides.');
        }
    });

    addWeightBtn.addEventListener('click', () => {
        const weight = parseFloat(currentWeightInput.value);
        const date = currentDateInput.value;
        addWeightEntry(date, weight);
    });

    const dictateBtn = document.getElementById('dictate-btn');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';

        dictateBtn.addEventListener('click', () => {
            dictateBtn.textContent = '🎤 Écoute en cours...';
            recognition.start();
        });

        recognition.onend = () => {
            dictateBtn.textContent = '🎤 Dicter le poids';
        };

        recognition.onerror = (event) => {
            alert("Erreur de reconnaissance vocale: " + event.error);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const numberRegex = /\d+([,.]\d+)?/;
            const match = transcript.match(numberRegex);

            if (match) {
                const weight = parseFloat(match[0].replace(',', '.'));
                const date = currentDateInput.value;
                
                // Explicitly perform save and update logic here
                const existingEntryIndex = appData.entries.findIndex(entry => entry.date === date);
                if (existingEntryIndex !== -1) {
                    appData.entries[existingEntryIndex].weight = weight;
                } else {
                    appData.entries.push({ date, weight });
                }
                appData.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
                saveData();
                setTimeout(() => {
                    updateChart();
                }, 0); // Defer update to fix timing issue
                currentWeightInput.value = '';

            } else {
                alert("Aucun poids n'a été détecté dans votre phrase. Essayez à nouveau.");
            }
        };

    } else {
        dictateBtn.style.display = 'none';
        console.log('Reconnaissance vocale non supportée par ce navigateur.');
    }

    // Initial load
    loadData();
    setTodayDate();
});
