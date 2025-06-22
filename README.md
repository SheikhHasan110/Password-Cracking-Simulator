# Password Cracking Simulator

A web-based application that simulates password hashing and cracking techniques, designed for educational purposes to demonstrate common vulnerabilities and the importance of strong passwords and proper hashing practices.

## 🚀 Features

* **Hash Generation Module:**
    * Generate hashes for passwords using various algorithms: MD5, SHA-1, and SHA-256.
    * Option to enable salting for enhanced security demonstration.
    * Real-time password strength indicator.
* **Attack Simulation Module:**
    * **Dictionary Attack:** Attempts to crack hashes using a predefined list of common words (from `sample_dictionary.txt`).
    * **Brute-Force Attack:** Systematically tries all possible character combinations for a given length and character set (lowercase, uppercase, numbers, special characters).
* **Real-time Attack Progress:**
    * Dynamic progress bar showing completion percentage.
    * Displays current attempts, cracking speed (attempts/second), and estimated time remaining.
    * Shows the current password guess during the attack.
* **Interactive User Interface:**
    * Clean, terminal-like design.
    * Console output provides real-time logs of actions and attack status.
    * "Matrix" background effect for an immersive feel.

## 🛠️ Technologies Used

* **Backend:** Python (Flask)
    * Handles hash generation.
    * Manages attack simulations (dictionary and brute-force logic).
    * Provides real-time attack status updates to the frontend.
* **Frontend:**
    * HTML5 (Structure)
    * CSS3 (Styling, animations, responsiveness)
    * JavaScript (Client-side logic, API calls, DOM manipulation, UI effects)

## 📦 Setup and Installation

Follow these steps to get the project up and running on your local machine.

### Prerequisites

* Python 3.x installed (Download from [python.org](https://www.python.org/downloads/))
* `pip` (Python package installer, usually comes with Python)

### Steps

1.  **Download the Project Files:**
    Save all the provided files (`app.py`, `index.html`, `script.js`, `styles.css`, and `sample_dictionary.txt`) into a single folder on your computer.

2.  **Navigate to the Project Directory:**
    Open your terminal or command prompt and change your directory to the folder where you saved the project files.
    ```bash
    cd path/to/your/project/folder
    ```

3.  **Create a `static` directory:**
    The Flask app expects a `static` folder for your CSS and JS files.
    ```bash
    mkdir static
    ```
    Then, move `styles.css` and `script.js` into this newly created `static` folder.
    ```bash
    mv styles.css static/
    mv script.js static/
    ```
    *(Note: If you are on Windows, use `move` instead of `mv`)*

4.  **Install Flask:**
    Install the Flask web framework using pip:
    ```bash
    pip install Flask
    ```

5.  **Run the Flask Application:**
    Execute the `app.py` file to start the backend server:
    ```bash
    python app.py
    ```
    You should see output similar to this:
    ```
     * Serving Flask app 'app'
     * Debug mode: on
    ...
     * Running on [http://127.0.0.1:5000](http://127.0.0.1:5000)
    ```

6.  **Access the Application:**
    Open your web browser and go to the address displayed in your terminal (usually `http://127.0.0.1:5000`).

## 💻 Usage

1.  **Generate a Hash:**
    * Enter a password in the "TARGET PASSWORD" field.
    * Select an "ENCRYPTION ALGORITHM" (MD5, SHA-1, SHA-256).
    * Choose whether to "ENABLE SALTING".
    * Click "GENERATE HASH". The generated hash and salt (if used) will appear below.

2.  **Initiate an Attack:**
    * Ensure a hash has been generated.
    * Select an "ATTACK VECTOR" (Dictionary Attack or Brute-Force Attack).
    * If "Brute-Force Attack" is selected, customize the "CHARACTER SET" and "MAX LENGTH".
    * Click "INITIATE ATTACK".

3.  **Monitor Progress:**
    * Observe the "ATTACK PROGRESS" section for real-time updates on attempts, speed, estimated time, and the current guess.
    * The progress bar will visually represent the attack's advancement.

4.  **Stop Attack:**
    * Click the "ABORT" button at any time to stop the ongoing attack simulation.

5.  **View Results:**
    * If the password is found, an "ATTACK SUCCESSFUL!" message will appear with the cracked password, total duration, and attempts made.

## ⚠️ Disclaimer

**This tool is strictly for educational purposes only.** It demonstrates how password hashing and cracking mechanisms work. **DO NOT USE THIS TOOL FOR ANY MALICIOUS ACTIVITIES.** Unauthorized access to computer systems or data is illegal and unethical. The creators of this simulator are not responsible for any misuse.