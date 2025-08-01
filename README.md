InternExtract: AI-Powered Job Offer Data Extractor
InternExtract is a desktop application built with Electron that intelligently extracts key information from job and internship offers. It uses the Gemini API to parse unstructured text and PDFs, presenting the data in a structured format. The application also provides a seamless way to save extracted data to a personal Firestore database and export it as a PDF document.

✨ Features
Intelligent Data Extraction: Utilizes the Google Gemini API to identify and extract key fields from job offers, such as jobTitle, company, location, responsibilities, requirements, and more.

PDF & Text Support: Accepts both pasted text and uploaded PDF files as input.

Firestore Database Integration: Saves all extracted data to a personal Firestore database, allowing you to build a history of job offers you've analyzed.

Anonymous Authentication: Securely saves data on a per-user basis using Firebase's Anonymous Authentication, so no login is required.

PDF Export: Converts the extracted, structured data into a neatly formatted PDF for easy sharing or offline storage.

Responsive UI: A clean and modern user interface built with Tailwind CSS.

🚀 Technologies Used
Desktop Framework: Electron.js

Backend & AI: Google Gemini API

Database: Google Cloud Firestore

PDF Libraries: PDF.js (for reading PDFs) and jsPDF (for generating PDFs)

Styling: Tailwind CSS

Package Management: npm

⚙️ Prerequisites
To run this application, you need to have the following installed:

Node.js (which includes npm)

A Firebase Project with Firestore and Anonymous Authentication enabled.

A Gemini API key.

🛠️ Setup and Installation
Follow these steps to get the application running on your local machine:

Clone the repository:

git clone <https://github.com/Malek720-420/InternExtract.git>
cd <your-app-directory>

Install dependencies:

npm install

Configure Firebase and Gemini API Keys:

Firebase: You need to create a Firebase project and enable Firestore and Anonymous Authentication.

Open the file models/firebaseConfig.js.

Replace the placeholder values with your actual Firebase project configuration found in your Firebase console under Project settings > General.

Gemini API: You need to get an API key from Google AI Studio.

Open the file models/apiModel.js.

Replace the placeholder const apiKey = ''; with your key like const apiKey = 'YOUR_GEMINI_API_KEY';.

Run the application:

npm start

🖥️ Usage
Input a Job Offer: Paste the text of a job offer into the text area, or click "Upload PDF" to select a file.

Extract Data: Click the "Extract Data" button to send the content to the Gemini API. The extracted information will be displayed in the output panel.

Save Data: After a successful extraction, the "Save Extracted Data" button will become active. Click it to store the current job offer's details in your Firestore database.

Export Data: Use the "Export as PDF" button to download the extracted information as a PDF document.

📄 License
This project is licensed under the ISC License. See the package.json file for details.