import { apiModel } from '../models/apiModel.js';
import { firebaseConfig } from '../models/firebaseConfig.js';

// Get DOM elements
const jobOfferInput = document.getElementById('jobOfferInput');
const pdfUploadInput = document.getElementById('pdfUploadInput');
const extractButton = document.getElementById('extractButton');
const exportPdfButton = document.getElementById('exportPdfButton');
const extractedDataOutput = document.getElementById('extractedDataOutput');
const buttonText = document.getElementById('buttonText');
const buttonIcon = document.getElementById('buttonIcon');
const processingIndicator = document.getElementById('processingIndicator');
const messageModal = document.getElementById('messageModal');
const modalMessage = document.getElementById('modalMessage');
const closeModalButton = document.querySelector('.close-button');
const saveDataButton = document.getElementById('saveDataButton');
const savedDataContainer = document.getElementById('savedDataContainer');
const searchSavedData = document.getElementById('searchSavedData');
const savedCount = document.getElementById('savedCount');
const modalButtons = document.getElementById('modalButtons');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

// Sidebar navigation elements
const navExtractionBtn = document.getElementById('nav-extraction');
const navSavedJobsBtn = document.getElementById('nav-saved-jobs');
const navComparisonBtn = document.getElementById('nav-comparison');
const resetAppBtn = document.getElementById('reset-app-button');

// Main content sections
const extractionView = document.getElementById('extraction-view');
const savedJobsView = document.getElementById('saved-jobs-view');
const comparisonView = document.getElementById('comparison-view');

// Comparison view elements
const runAnalysisBtn = document.getElementById('run-analysis-button');
const analysisButtonText = document.getElementById('analysisButtonText');
const analysisSpinner = document.getElementById('analysisSpinner');
const analysisOutput = document.getElementById('analysis-output');
const comparisonChartCanvas = document.getElementById('comparisonChart');
const aiConclusion = document.getElementById('aiConclusion');
let comparisonChart;

// Global variables for Firebase and state management
let db;
let auth;
let userId;
let savedDocuments = []; // Store the full list of documents
let lastExtractedData = null; // Store the last extracted data to be saved

// Helper function to display a custom modal message
function showMessage(message, showButtons = false) {
    modalMessage.textContent = message;
    modalButtons.classList.toggle('hidden', !showButtons);
    messageModal.style.display = 'flex';
}

// Function to convert PDF to text
async function pdfToText(pdfFile) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = async (event) => {
            try {
                const typedArray = new Uint8Array(event.target.result);
                const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + ' ';
                }
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(pdfFile);
    });
}

// Function to export extracted data to a PDF
function exportExtractedDataToPdf(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(`Extracted Job Offer Details`, 14, 20);
    doc.setFontSize(12);

    let y = 30;
    const padding = 10;
    const lineSpacing = 8;
    const pageWidth = doc.internal.pageSize.getWidth();

    for (const key in data) {
        if (Object.hasOwnProperty.call(data, key)) {
            const value = data[key];

            if (y > doc.internal.pageSize.getHeight() - padding) {
                doc.addPage();
                y = padding;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`${key.replace(/([A-Z])/g, ' $1').trim()}:`, 14, y);
            y += lineSpacing;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    value.forEach(item => {
                        const lines = doc.splitTextToSize(item, pageWidth - 28);
                        lines.forEach(line => {
                            if (y > doc.internal.pageSize.getHeight() - padding) {
                                doc.addPage();
                                y = padding;
                            }
                            doc.text(`- ${line}`, 14, y);
                            y += lineSpacing;
                        });
                    });
                } else {
                    doc.text("Not specified", 14, y);
                    y += lineSpacing;
                }
            } else {
                const lines = doc.splitTextToSize(value, pageWidth - 28);
                lines.forEach(line => {
                    if (y > doc.internal.pageSize.getHeight() - padding) {
                        doc.addPage();
                        y = padding;
                    }
                    doc.text(line, 14, y);
                    y += lineSpacing;
                });
            }
            y += lineSpacing;
        }
    }
    doc.save('extracted_job_offer.pdf');
}

// Function to render the saved data in the UI
function renderSavedData(documents, searchTerm = '') {
    const filteredDocuments = documents.filter(doc => {
        const docData = doc.data;
        const searchString = searchTerm.toLowerCase();
        // Check jobTitle, company, and location
        return (docData.jobTitle && docData.jobTitle.toLowerCase().includes(searchString)) ||
               (docData.company && docData.company.toLowerCase().includes(searchString)) ||
               (docData.location && docData.location.toLowerCase().includes(searchString));
    });

    savedCount.textContent = `(${filteredDocuments.length} saved)`;

    if (filteredDocuments.length === 0) {
        savedDataContainer.innerHTML = '<p class="text-gray-500">No matching job offers found.</p>';
        return;
    }

    let html = filteredDocuments.map(doc => {
        const timestamp = doc.timestamp ? new Date(doc.timestamp.seconds * 1000).toLocaleString() : 'N/A';
        const docId = doc.id;
        return `
            <div class="bg-gray-100 p-4 rounded-lg shadow-sm border border-gray-200 mb-4 hover:shadow-md transition-shadow flex justify-between items-center" data-doc-id="${docId}">
                <div>
                    <p class="font-bold text-gray-800 text-lg">${doc.data.jobTitle || 'Untitled Job'}</p>
                    <p class="text-sm text-gray-600">${doc.data.company || 'N/A'} - ${doc.data.location || 'N/A'}</p>
                    <p class="text-xs text-gray-400 mt-2">Saved on: ${timestamp}</p>
                </div>
                <button class="delete-doc-btn text-red-500 hover:text-red-700 transition-colors" data-doc-id="${docId}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    }).join('');

    savedDataContainer.innerHTML = html;
}

// Render extracted data with editable fields
function renderEditableData(data) {
    let outputHtml = '';
    for (const key in data) {
        if (Object.hasOwnProperty.call(data, key)) {
            const value = data[key];
            const keyTitle = key.replace(/([A-Z])/g, ' $1').trim();
            const inputId = `editable-${key}`;

            outputHtml += `<div class="mb-4">`;
            outputHtml += `<label for="${inputId}" class="block font-semibold text-gray-700 mb-1">${keyTitle}:</label>`;

            if (Array.isArray(value)) {
                // For arrays, use a textarea with each item on a new line
                const arrayValue = value.join('\n');
                outputHtml += `<textarea id="${inputId}" class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 resize-y">${arrayValue}</textarea>`;
            } else {
                // For single strings, use a simple input field
                outputHtml += `<input type="text" id="${inputId}" class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200" value="${value}">`;
            }
            outputHtml += `</div>`;
        }
    }
    extractedDataOutput.innerHTML = outputHtml;
    extractedDataOutput.classList.add('fade-in-slide-up');
}

// Function to get the edited data from the UI
function getEditedData() {
    const editedData = {};
    const inputFields = extractedDataOutput.querySelectorAll('input, textarea');
    inputFields.forEach(field => {
        const key = field.id.replace('editable-', '');
        let value = field.value;
        if (field.tagName === 'TEXTAREA') {
            // Convert textarea value back to an array of strings
            value = value.split('\n').map(item => item.trim()).filter(item => item.length > 0);
        }
        editedData[key] = value;
    });
    return editedData;
}

// --- View Switching Logic ---
const showView = (viewId) => {
    extractionView.classList.add('hidden');
    savedJobsView.classList.add('hidden');
    comparisonView.classList.add('hidden');

    navExtractionBtn.classList.remove('bg-purple-600', 'text-white', 'hover:bg-purple-700');
    navExtractionBtn.classList.add('text-gray-600', 'hover:bg-gray-200');
    navSavedJobsBtn.classList.remove('bg-purple-600', 'text-white', 'hover:bg-purple-700');
    navSavedJobsBtn.classList.add('text-gray-600', 'hover:bg-gray-200');
    navComparisonBtn.classList.remove('bg-purple-600', 'text-white', 'hover:bg-purple-700');
    navComparisonBtn.classList.add('text-gray-600', 'hover:bg-gray-200');

    if (viewId === 'extraction-view') {
        extractionView.classList.remove('hidden');
        navExtractionBtn.classList.add('bg-purple-600', 'text-white', 'hover:bg-purple-700');
        navExtractionBtn.classList.remove('text-gray-600', 'hover:bg-gray-200');
    } else if (viewId === 'saved-jobs-view') {
        savedJobsView.classList.remove('hidden');
        navSavedJobsBtn.classList.add('bg-purple-600', 'text-white', 'hover:bg-purple-700');
        navSavedJobsBtn.classList.remove('text-gray-600', 'hover:bg-gray-200');
    } else if (viewId === 'comparison-view') {
        comparisonView.classList.remove('hidden');
        navComparisonBtn.classList.add('bg-purple-600', 'text-white', 'hover:bg-purple-700');
        navComparisonBtn.classList.remove('text-gray-600', 'hover:bg-gray-200');
    }
};

// --- API Calls and Logic ---
async function handleCompatibilityAnalysis() {
    if (!savedDocuments || savedDocuments.length < 2) {
        showMessage('You need to save at least two job offers to run a comparison.');
        return;
    }

    runAnalysisBtn.disabled = true;
    analysisButtonText.textContent = 'Analyzing...';
    analysisSpinner.classList.remove('hidden');
    
    // Create a simple, clean representation of the saved jobs for the AI
    const jobsForAnalysis = savedDocuments.map(doc => ({
        id: doc.id,
        jobTitle: doc.data.jobTitle || 'N/A',
        company: doc.data.company || 'N/A',
        location: doc.data.location || 'N/A',
        responsibilitiesCount: doc.data.responsibilities?.length || 0,
        requirementsCount: doc.data.requirements?.length || 0,
        benefitsCount: doc.data.benefits?.length || 0,
    }));

    const prompt = `You are a career advisor. Based on the following job offers, provide a compatibility analysis.
    First, generate a JSON object with two properties: "chartData" and "conclusion".
    The "chartData" property should contain a Chart.js-compatible data object for a radar chart. The labels should be the job titles. The datasets should compare the jobs based on "Responsibilities Count", "Requirements Count", and "Benefits Count". The data should be normalized to a scale of 0 to 10 for better comparison.
    The "conclusion" property should be a detailed paragraph of text summarizing the analysis and suggesting which job might be the best fit and why.
    
    Job Offers to analyze (as a JSON array):
    ${JSON.stringify(jobsForAnalysis)}
    `;

    try {
        const apiKey = 'AIzaSyC6tU_rS94I7ul-yz-470v9b3lEBLSQGSk'; // Use the platform-provided API key by leaving the string empty.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        // FIX: The `responseSchema` for chartData was too generic. This is a more detailed schema
        // that guides the model to produce a valid Chart.js data object, which should prevent the 400 error.
        const structuredResponseSchema = {
            type: "OBJECT",
            properties: {
                "chartData": { 
                    type: "OBJECT",
                    properties: {
                        "labels": { type: "ARRAY", items: { type: "STRING" } },
                        "datasets": {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    "label": { type: "STRING" },
                                    "data": { type: "ARRAY", items: { type: "NUMBER" } },
                                    "backgroundColor": { type: "STRING" },
                                    "borderColor": { type: "STRING" },
                                    "borderWidth": { type: "NUMBER" }
                                }
                            }
                        }
                    }
                },
                "conclusion": { "type": "STRING" }
            },
            "propertyOrdering": ["chartData", "conclusion"]
        };

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: structuredResponseSchema,
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const jsonText = result.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(jsonText);

        renderComparisonChart(parsedData.chartData);
        aiConclusion.innerHTML = `<p>${parsedData.conclusion}</p>`;
        analysisOutput.classList.remove('hidden');

    } catch (error) {
        console.error('Compatibility Analysis Error:', error);
        aiConclusion.innerHTML = `<p class="text-red-500">Failed to run analysis. Please try again. Error: ${error.message}</p>`;
        analysisOutput.classList.remove('hidden');
    } finally {
        runAnalysisBtn.disabled = false;
        analysisButtonText.textContent = 'Run Compatibility Analysis';
        analysisSpinner.classList.add('hidden');
    }
}

function renderComparisonChart(chartData) {
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    const ctx = comparisonChartCanvas.getContext('2d');
    comparisonChart = new Chart(ctx, {
        type: 'radar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { display: false },
                    suggestedMin: 0,
                    suggestedMax: 10,
                    pointLabels: {
                        font: { size: 12, weight: 'bold' }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.raw !== null) {
                                label += new Intl.NumberFormat('en-US').format(context.raw);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

async function handleResetApp() {
    if (!userId) {
        showMessage('Authentication failed. Cannot reset app.');
        return;
    }
    
    // Show a confirmation modal
    showMessage('Are you sure you want to reset the application? This will delete all your saved job offers and cannot be undone.', true);
    
    modalConfirmBtn.onclick = async () => {
        try {
            const collectionRef = firebase.collection(db, `users/${userId}/extracted_data`);
            const querySnapshot = await firebase.getDocs(collectionRef);
            
            const batch = firebase.writeBatch(db);
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            showMessage('All saved data has been deleted. The app is reset.');
            setTimeout(() => {
                window.location.reload(); // Refresh the app to reset the UI
            }, 2000);

        } catch (error) {
            console.error("Error resetting app:", error);
            showMessage('Failed to reset the app. Please try again.');
        } finally {
            modalButtons.classList.add('hidden');
        }
    };

    modalCancelBtn.onclick = () => {
        messageModal.style.display = 'none';
        modalButtons.classList.add('hidden');
    };
}

// Initialize Firebase and set up auth listener
const initFirebase = async () => {
    try {
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.getFirestore(app);
        auth = firebase.getAuth(app);
        
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialAuthToken) {
            await firebase.signInWithCustomToken(auth, initialAuthToken);
        } else {
            await firebase.signInAnonymously(auth);
        }

        firebase.onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("Firebase authenticated. User ID:", userId);
                // Listen for real-time updates to the saved data
                const userDocsRef = firebase.collection(db, `users/${userId}/extracted_data`);
                firebase.onSnapshot(userDocsRef, (snapshot) => {
                    savedDocuments = [];
                    snapshot.forEach(doc => {
                        // Store the full document data, including ID
                        savedDocuments.push({ id: doc.id, ...doc.data() });
                    });
                    renderSavedData(savedDocuments);
                }, (error) => {
                    console.error("Error listening to Firestore:", error);
                    savedDataContainer.innerHTML = '<p class="text-red-500">Failed to load saved data.</p>';
                });
            } else {
                console.log("No user is signed in.");
                savedDataContainer.innerHTML = '<p class="text-red-500">Please authenticate to see saved data.</p>';
            }
        });
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        showMessage('Failed to initialize Firebase. Please check your firebaseConfig.js file and network connection.');
    }
};

// Event listener for PDF file selection
pdfUploadInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        try {
            jobOfferInput.value = 'Converting PDF to text... Please wait.';
            jobOfferInput.disabled = true;
            const textContent = await pdfToText(file);
            jobOfferInput.value = textContent;
        } catch (error) {
            console.error('Error converting PDF:', error);
            showMessage('Failed to convert PDF to text. Please check the file and try again.');
            jobOfferInput.value = '';
        } finally {
            jobOfferInput.disabled = false;
        }
    } else if (file) {
        showMessage('Please select a valid PDF file.');
        pdfUploadInput.value = '';
    }
});

// Event listener for the "Extract Data" button click
extractButton.addEventListener('click', async () => {
    extractButton.disabled = true;
    exportPdfButton.disabled = true;
    saveDataButton.disabled = true;
    buttonText.textContent = 'Processing...';
    buttonIcon.classList.add('hidden');
    processingIndicator.classList.remove('hidden');
    extractedDataOutput.innerHTML = '';

    const inputText = jobOfferInput.value.trim();

    if (inputText.length === 0) {
        showMessage('Please paste text or upload a PDF before extracting data.');
        buttonText.textContent = 'Extract Data';
        buttonIcon.classList.remove('hidden');
        processingIndicator.classList.add('hidden');
        extractButton.disabled = false;
        return;
    }

    const data = await apiModel.extractData(inputText);
    lastExtractedData = data;

    if (data) {
        const hasData = Object.values(data).some(value => (Array.isArray(value) && value.length > 0) || (typeof value === 'string' && value !== "Not specified"));

        if (hasData) {
            renderEditableData(data); // Render the new editable UI
            exportPdfButton.disabled = false;
            saveDataButton.disabled = false;
        } else {
            extractedDataOutput.innerHTML = '<p class="text-red-500">No data extracted or empty response from AI.</p>';
        }
    } else {
        extractedDataOutput.innerHTML = '<p class="text-red-500">An error occurred during data extraction. Please try again later.</p>';
        showMessage('An error occurred during data extraction. Please check your network connection or try again later.');
    }

    buttonText.textContent = 'Extract Data';
    buttonIcon.classList.remove('hidden');
    processingIndicator.classList.add('hidden');
    extractButton.disabled = false;
});

// Event listener for the "Export PDF" button click
exportPdfButton.addEventListener('click', async () => {
    exportPdfButton.disabled = true;
    
    // Get the edited data from the UI instead of the stored variable
    const data = getEditedData();
    if (data) {
        exportExtractedDataToPdf(data);
    } else {
        showMessage('No valid data to export. Please try extracting again.');
    }
    exportPdfButton.disabled = false;
});

// Event listener for the "Save Data" button click
saveDataButton.addEventListener('click', async () => {
    if (!userId) {
        showMessage('Authentication failed. Cannot save data.');
        return;
    }
    
    saveDataButton.disabled = true;
    const buttonTextSpan = saveDataButton.querySelector('span');
    const originalText = buttonTextSpan ? buttonTextSpan.textContent : 'Save Extracted Data';
    if(buttonTextSpan) buttonTextSpan.textContent = 'Saving...';
    
    try {
        const editedData = getEditedData(); // Get the edited data
        const userDocsRef = firebase.collection(db, `users/${userId}/extracted_data`);
        
        await firebase.addDoc(userDocsRef, {
            data: editedData,
            timestamp: firebase.serverTimestamp(),
        });
        
        showMessage('Data saved successfully!');
        lastExtractedData = null; // Clear the data after saving
    } catch (error) {
        console.error("Error saving document: ", error);
        showMessage('Failed to save data. Please try again.');
    } finally {
        saveDataButton.disabled = false;
        if(buttonTextSpan) buttonTextSpan.textContent = originalText;
    }
});

// Event listener for deleting a saved document
savedDataContainer.addEventListener('click', async (event) => {
    const target = event.target;
    // Check if the clicked element or its parent is the delete button
    const deleteButton = target.closest('.delete-doc-btn');
    if (deleteButton) {
        const docId = deleteButton.dataset.docId;
        if (!docId) {
            console.error("No document ID found for deletion.");
            return;
        }

        if (!userId) {
            showMessage('Authentication failed. Cannot delete data.');
            return;
        }

        // Use a custom modal for confirmation
        showMessage("Are you sure you want to delete this saved job offer? This action cannot be undone.", true);
        
        modalConfirmBtn.onclick = async () => {
            try {
                const docRef = firebase.doc(db, `users/${userId}/extracted_data`, docId);
                await firebase.deleteDoc(docRef);
                showMessage('Job offer deleted successfully!');
            } catch (error) {
                console.error("Error deleting document:", error);
                showMessage('Failed to delete job offer.');
            } finally {
                messageModal.style.display = 'none';
            }
        };

        modalCancelBtn.onclick = () => {
            messageModal.style.display = 'none';
        };
    }
});

// Event listener for searching saved data
searchSavedData.addEventListener('input', (event) => {
    const searchTerm = event.target.value.trim();
    renderSavedData(savedDocuments, searchTerm);
});

// Sidebar Navigation Event Listeners
navExtractionBtn.addEventListener('click', () => showView('extraction-view'));
navSavedJobsBtn.addEventListener('click', () => showView('saved-jobs-view'));
navComparisonBtn.addEventListener('click', () => showView('comparison-view'));

// Compatibility Analysis button listener
runAnalysisBtn.addEventListener('click', handleCompatibilityAnalysis);

// Reset App button listener
resetAppBtn.addEventListener('click', handleResetApp);

// Event listeners for the modal
closeModalButton.addEventListener('click', () => {
    messageModal.style.display = 'none';
    modalButtons.classList.add('hidden');
});

window.addEventListener('click', (event) => {
    if (event.target === messageModal) {
        messageModal.style.display = 'none';
        modalButtons.classList.add('hidden');
    }
});

// Start Firebase initialization
window.addEventListener('load', initFirebase);
