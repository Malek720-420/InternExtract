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

// Global variables for Firebase and state management
let db;
let auth;
let userId;
let lastExtractedData = null; // Store the last extracted data to be saved

// Helper function to display a custom modal message
function showMessage(message) {
    modalMessage.textContent = message;
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
function renderSavedData(documents) {
    if (documents.length === 0) {
        savedDataContainer.innerHTML = '<p class="text-gray-500">No saved job offers yet.</p>';
        return;
    }

    let html = documents.map(doc => {
        const timestamp = doc.timestamp ? new Date(doc.timestamp.seconds * 1000).toLocaleString() : 'N/A';
        return `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4 hover:shadow-md transition-shadow">
                <p class="font-bold text-gray-800">${doc.data.jobTitle || 'Untitled Job'}</p>
                <p class="text-sm text-gray-600">${doc.data.company || 'N/A'} - ${doc.data.location || 'N/A'}</p>
                <p class="text-xs text-gray-400 mt-2">Saved on: ${timestamp}</p>
            </div>
        `;
    }).join('');

    savedDataContainer.innerHTML = html;
}

// Initialize Firebase and set up auth listener
const initFirebase = async () => {
    try {
        const app = firebase.initializeApp(firebaseConfig);
        db = firebase.getFirestore(app);
        auth = firebase.getAuth(app);
        
        // Sign in anonymously
        await firebase.signInAnonymously(auth);

        firebase.onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("Firebase authenticated. User ID:", userId);
                // Listen for real-time updates to the saved data
                const userDocsRef = firebase.collection(db, `users/${userId}/extracted_data`);
                firebase.onSnapshot(userDocsRef, (snapshot) => {
                    const savedDocuments = [];
                    snapshot.forEach(doc => {
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
    saveDataButton.disabled = true; // Disable save button
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
    lastExtractedData = data; // Store the extracted data

    if (data) {
        const hasData = Object.values(data).some(value => (Array.isArray(value) && value.length > 0) || (typeof value === 'string' && value !== "Not specified"));

        if (hasData) {
            let outputHtml = '';
            for (const key in data) {
                if (Object.hasOwnProperty.call(data, key)) {
                    const value = data[key];
                    const keyTitle = key.replace(/([A-Z])/g, ' $1').trim();

                    outputHtml += `<p class="mb-2"><strong>${keyTitle}:</strong></p>`;
                    if (Array.isArray(value)) {
                        if (value.length > 0) {
                            outputHtml += `<ul class="list-disc list-inside ml-4 mb-4">`;
                            outputHtml += value.map(item => `<li>${item}</li>`).join('');
                            outputHtml += `</ul>`;
                        } else {
                            outputHtml += `<p class="text-gray-500 ml-4 mb-4">Not specified</p>`;
                        }
                    } else {
                        outputHtml += `<p class="ml-4 mb-4">${value}</p>`;
                    }
                }
            }
            extractedDataOutput.innerHTML = outputHtml;
            extractedDataOutput.classList.add('fade-in-slide-up');
            exportPdfButton.disabled = false;
            saveDataButton.disabled = false; // Enable save button on successful extraction
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
    const inputText = jobOfferInput.value.trim();
    
    if (!inputText) {
        showMessage('No data to export. Please extract data first.');
        exportPdfButton.disabled = false;
        return;
    }
    
    const data = lastExtractedData; // Use the last extracted data
    if (data) {
        exportExtractedDataToPdf(data);
    } else {
        showMessage('No valid data to export. Please try extracting again.');
    }
    exportPdfButton.disabled = false;
});

// Event listener for the "Save Data" button click
saveDataButton.addEventListener('click', async () => {
    if (!lastExtractedData) {
        showMessage('No data to save. Please extract a job offer first.');
        return;
    }

    if (!userId) {
        showMessage('Authentication failed. Cannot save data.');
        return;
    }
    
    saveDataButton.disabled = true;
    const buttonText = saveDataButton.querySelector('span'); // Assuming a span for text
    const originalText = buttonText ? buttonText.textContent : 'Save Extracted Data';
    if(buttonText) buttonText.textContent = 'Saving...';
    
    try {
        const userDocsRef = firebase.collection(db, `users/${userId}/extracted_data`);
        
        await firebase.addDoc(userDocsRef, {
            data: lastExtractedData,
            timestamp: firebase.serverTimestamp(),
        });
        
        showMessage('Data saved successfully!');
        lastExtractedData = null; // Clear the data after saving
    } catch (error) {
        console.error("Error saving document: ", error);
        showMessage('Failed to save data. Please try again.');
    } finally {
        saveDataButton.disabled = false;
        if(buttonText) buttonText.textContent = originalText;
    }
});

// Event listeners for the modal
closeModalButton.addEventListener('click', () => {
    messageModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === messageModal) {
        messageModal.style.display = 'none';
    }
});

// Start Firebase initialization
window.addEventListener('load', initFirebase);
