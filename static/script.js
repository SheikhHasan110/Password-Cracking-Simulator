// script.js - Modified for Flask Backend Integration

        // Matrix background animation (kept for visual effect)
        function createMatrixEffect() {
            const container = document.getElementById('matrix-code');
            const characters = "01"; // Simpler binary code for effect
            const cols = Math.floor(window.innerWidth / 20);

            for (let i = 0; i < cols; i++) {
                const col = document.createElement('div');
                col.className = 'matrix-column';
                container.appendChild(col);

                const charCount = 30; // Number of characters in a column
                for (let j = 0; j < charCount; j++) {
                    const char = document.createElement('div');
                    char.className = 'matrix-character';
                    char.textContent = Math.random() > 0.5 ? '0' : '1'; // Binary characters
                    char.style.left = '0'; // All characters start at left=0 within their column
                    char.style.top = (j * 20) + 'px'; // Position vertically
                    char.style.animationDuration = (Math.random() * 5 + 5) + 's'; // Randomize speed
                    char.style.animationDelay = (Math.random() * 5) + 's'; // Randomize delay
                    col.appendChild(char);
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            createMatrixEffect(); // Initialize matrix effect

            // --- DOM Elements ---
            const generateHashBtn = document.getElementById('generate-hash-btn');
            const startAttackBtn = document.getElementById('start-attack-btn');
            const stopAttackBtn = document.getElementById('stop-attack-btn');
            const attackTypeSelect = document.getElementById('attack-type');
            const bruteForceOptions = document.getElementById('brute-force-options');
            const consoleOutput = document.getElementById('console-output');
            const progressBar = document.getElementById('progress-bar');
            const statusIndicator = document.getElementById('status-indicator');

            // New DOM elements for speed and estimated time
            const totalPossibleAttemptsEl = document.getElementById('total-possible-attempts');
            const attackSpeedEl = document.getElementById('attack-speed');
            const estimatedTimeRemainingEl = document.getElementById('estimated-time-remaining');


            let attackInterval; // To store setInterval ID for status updates
            let targetHashForAttack;
            let saltForAttack;
            let totalPossibleAttempts = 0; // Global variable to store total possible attempts

            // --- Console Simulation ---
            function addConsoleMessage(message, type = '') {
                const line = document.createElement('div');
                line.className = `console-line ${type}`;
                line.textContent = `> ${message}`;
                consoleOutput.appendChild(line);
                consoleOutput.scrollTop = consoleOutput.scrollHeight; // Auto-scroll to bottom
            }

            // --- Password Strength Meter ---
            const updatePasswordStrength = (e) => {
                const pass = e.target.value;
                let strength = 0;
                const strengthMeter = document.getElementById('password-strength');
                const strengthLabel = document.getElementById('password-strength-label');

                if (pass.length === 0) {
                    strengthMeter.className = '';
                    strengthLabel.textContent = '';
                    return;
                }

                // Simple strength calculation
                if (pass.length >= 8) strength++;
                if (pass.length >= 12) strength++;
                if (pass.match(/[a-z]/)) strength++;
                if (pass.match(/[A-Z]/)) strength++;
                if (pass.match(/[0-9]/)) strength++;
                if (pass.match(/[^a-zA-Z0-9]/)) strength++;

                // Set strength class and text
                const strengths = [
                    { class: 'very-weak', text: 'VERY WEAK' },
                    { class: 'weak', text: 'WEAK' },
                    { class: 'medium', text: 'MEDIUM' },
                    { class: 'strong', text: 'STRONG' },
                    { class: 'very-strong', text: 'VERY STRONG' }
                ];

                const level = Math.min(strength, strengths.length - 1);
                strengthMeter.className = strengths[level].class;
                strengthLabel.textContent = strengths[level].text;
            };

            // --- Hash Generation ---
            const generateHash = async () => {
                const password = document.getElementById('password').value;
                if (!password) {
                    addConsoleMessage("Error: Please enter a password to hash", "error");
                    alert("Please enter a password to hash.");
                    return;
                }

                const algorithm = document.getElementById('algorithm').value;
                const use_salt = document.getElementById('use-salt').checked;

                generateHashBtn.disabled = true;
                generateHashBtn.textContent = 'GENERATING...';
                addConsoleMessage(`Generating ${algorithm} hash for password...`);

                try {
                    const response = await fetch('/hash', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password, algorithm, use_salt })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Server responded with status: ${response.status} - ${errorData.error || 'Unknown error'}`);
                    }

                    const data = await response.json();

                    document.getElementById('hashed-password').textContent = data.hashed_password;
                    document.getElementById('salt-value').textContent = data.salt || 'No salt used';
                    targetHashForAttack = data.hashed_password;
                    saltForAttack = data.salt;
                    startAttackBtn.disabled = false; // Enable attack button only on success

                    addConsoleMessage(`Hash generated successfully: ${data.hashed_password.substring(0, 20)}...`);
                    addConsoleMessage(`Salt: ${data.salt || 'None'}`);
                    addConsoleMessage("Target ready for attack simulation");

                } catch (error) {
                    console.error('Error generating hash:', error);
                    document.getElementById('hashed-password').textContent = 'ERROR';
                    document.getElementById('salt-value').textContent = 'ERROR';
                    addConsoleMessage("Hash generation failed! Check console.", "error");
                    alert('Failed to generate hash. Please ensure the backend server is running and check console.');
                } finally {
                    generateHashBtn.disabled = false;
                    generateHashBtn.textContent = 'GENERATE HASH';
                }
            };

            // --- ATTACK SIMULATION ---
            const startAttack = async () => {
                if (!targetHashForAttack) {
                    addConsoleMessage("Error: Please generate a hash first", "error");
                    alert("Please generate a hash first.");
                    return;
                }

                startAttackBtn.disabled = true;
                stopAttackBtn.disabled = false;
                document.getElementById('attack-result').style.display = 'none';
                document.getElementById('attack-status').textContent = 'RUNNING...';
                statusIndicator.className = 'status-indicator status-running';

                // Reset progress display
                document.getElementById('attack-attempts').textContent = '0';
                document.getElementById('attack-time').textContent = '0s';
                document.getElementById('current-attempt').textContent = 'Starting...';
                totalPossibleAttemptsEl.textContent = 'N/A'; // Reset total possible attempts
                attackSpeedEl.textContent = '0'; // Reset speed
                estimatedTimeRemainingEl.textContent = 'N/A'; // Reset estimated time
                progressBar.style.width = '0%';
                addConsoleMessage("Attack sequence started");

                const attack_type = attackTypeSelect.value;
                const algorithm = document.getElementById('algorithm').value;
                const payload = {
                    attack_type,
                    hash: targetHashForAttack,
                    algorithm,
                    salt: saltForAttack,
                };

                if (attack_type === 'brute-force') {
                    payload.charset = {
                        lowercase: document.getElementById('charset-lower').checked,
                        uppercase: document.getElementById('charset-upper').checked,
                        numbers: document.getElementById('charset-nums').checked,
                        special: document.getElementById('charset-special').checked,
                    };
                    payload.max_length = document.getElementById('max-length').value;
                }

                addConsoleMessage(`Initiating ${attack_type} attack...`);
                addConsoleMessage(`Target hash: ${targetHashForAttack.substring(0, 20)}...`);
                addConsoleMessage(`Algorithm: ${algorithm}`);

                try {
                    const response = await fetch('/start-attack', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Server responded with status: ${response.status} - ${errorData.error || 'Unknown error'}`);
                    }

                    const data = await response.json(); // Get the response to retrieve total_possible_attempts
                    totalPossibleAttempts = data.total_possible_attempts || 0; // Store total possible attempts
                    totalPossibleAttemptsEl.textContent = totalPossibleAttempts.toLocaleString(); // Display total

                    addConsoleMessage("Attack command sent to server.");
                    // Start polling for status updates
                    attackInterval = setInterval(updateAttackStatus, 500); // Poll every 500ms

                } catch (error) {
                    console.error('Error starting attack:', error);
                    alert('Failed to start attack. Is the backend server running?');
                    startAttackBtn.disabled = false;
                    stopAttackBtn.disabled = true;
                    document.getElementById('attack-status').textContent = 'ERROR';
                    statusIndicator.className = 'status-indicator status-idle';
                    addConsoleMessage("Attack initiation failed!", "error");
                }
            };

            const stopAttack = async () => {
                clearInterval(attackInterval); // Stop polling immediately
                document.getElementById('attack-status').textContent = 'ABORTING...';
                statusIndicator.className = 'status-indicator status-idle'; // Set to idle immediately

                try {
                    await fetch('/stop-attack', { method: 'POST' });
                    addConsoleMessage("Attack stop command sent.");
                } catch (error) {
                    console.error('Error sending stop command:', error);
                    addConsoleMessage("Failed to send stop command.", "error");
                } finally {
                    // The /attack-status endpoint will eventually report 'running: false'
                    // and trigger the final status update. For now, just disable buttons.
                    stopAttackBtn.disabled = true;
                    startAttackBtn.disabled = false;
                }
            };

            const updateAttackStatus = async () => {
                try {
                    const response = await fetch('/attack-status');
                    const data = await response.json();

                    const statusEl = document.getElementById('attack-status');
                    const attemptsEl = document.getElementById('attack-attempts');
                    const timeEl = document.getElementById('attack-time');
                    const currentEl = document.getElementById('current-attempt');

                    // Update new elements
                    attackSpeedEl.textContent = data.results.speed ? data.results.speed.toLocaleString() : '0';
                    estimatedTimeRemainingEl.textContent = data.results.estimated_time_remaining || 'N/A';
                    if (data.results.total_possible_attempts && totalPossibleAttempts === 0) {
                        totalPossibleAttempts = data.results.total_possible_attempts; // Update if not set yet
                        totalPossibleAttemptsEl.textContent = totalPossibleAttempts.toLocaleString();
                    }


                    // Update progress display
                    attemptsEl.textContent = data.results.attempts ? data.results.attempts.toLocaleString() : '0';
                    timeEl.textContent = `${data.results.time_elapsed || 0}s`;
                    currentEl.textContent = data.results.current_guess || 'N/A';

                    // Real progress bar calculation
                    let progress = 0;
                    if (totalPossibleAttempts > 0) {
                        progress = (data.results.attempts / totalPossibleAttempts) * 100;
                    }
                    progressBar.style.width = Math.min(100, progress) + '%';


                    if (!data.running) {
                        clearInterval(attackInterval); // Stop polling
                        statusEl.textContent = data.results.password_found ? 'SUCCESS!' : 'FAILED';
                        stopAttackBtn.disabled = true;
                        startAttackBtn.disabled = false;
                        totalPossibleAttemptsEl.textContent = data.results.total_attempts.toLocaleString(); // Final total attempts

                        if (data.results.password_found) {
                            document.getElementById('attack-result').style.display = 'block';
                            document.getElementById('found-password').textContent = data.results.password;
                            document.getElementById('total-time').textContent = `${data.results.total_time}s`;
                            document.getElementById('total-attempts').textContent = data.results.total_attempts.toLocaleString();
                            addConsoleMessage("!!! PASSWORD FOUND !!!", "success");
                            addConsoleMessage(`Cracked Password: ${data.results.password}`, "success");
                            addConsoleMessage(`Total Time: ${data.results.total_time}s`, "success");
                            addConsoleMessage(`Total Attempts: ${data.results.total_attempts.toLocaleString()}`, "success");
                            statusIndicator.className = 'status-indicator status-success';
                        } else {
                            document.getElementById('attack-result').style.display = 'none'; // Hide success message
                            addConsoleMessage("Attack finished: Password not found within given parameters.", "error");
                            statusIndicator.className = 'status-indicator status-idle';
                        }
                    } else {
                        statusEl.textContent = 'RUNNING...';
                        statusIndicator.className = 'status-indicator status-running';
                    }
                } catch (error) {
                    console.error('Error fetching attack status:', error);
                    clearInterval(attackInterval);
                    document.getElementById('attack-status').textContent = 'ERROR FETCHING STATUS';
                    statusIndicator.className = 'status-indicator status-idle';
                    startAttackBtn.disabled = false;
                    stopAttackBtn.disabled = true;
                    addConsoleMessage("Error fetching attack status!", "error");
                }
            };


            // --- Event Listeners ---
            generateHashBtn.addEventListener('click', generateHash);
            startAttackBtn.addEventListener('click', startAttack);
            stopAttackBtn.addEventListener('click', stopAttack);
            attackTypeSelect.addEventListener('change', () => {
                bruteForceOptions.style.display = (attackTypeSelect.value === 'brute-force') ? 'block' : 'none';
            });
            document.getElementById('password').addEventListener('input', updatePasswordStrength);

            // Initial console messages
            addConsoleMessage("System initialized");
            addConsoleMessage("Ready for hash generation");
            addConsoleMessage("WARNING: This tool is for educational purposes only. Do not misuse.");
        });