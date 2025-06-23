import os
import hashlib
import secrets
import string
import time
import math # Import math for pow function
from flask import Flask, request, jsonify, send_from_directory, render_template
from threading import Thread, Event

# Initialize Flask app, specifying the static folder
app = Flask(__name__, static_folder='static', static_url_path='/static')

# Global variables for attack status
attack_running = False
stop_attack_event = Event()
attack_results = {}
current_attack_status = {}

# Load dictionary from file
DICTIONARY = []
DICTIONARY_PATH = os.path.join(os.path.dirname(__file__), "sample_dictionary.txt")
if os.path.exists(DICTIONARY_PATH):
    with open(DICTIONARY_PATH, "r", encoding="utf-8") as f:
        DICTIONARY = [line.strip() for line in f if line.strip()]
else:
    # Fallback if file not found
    DICTIONARY = [
        "password", "123456", "qwerty", "admin", "welcome", "secret",
        "dragon", "computer", "network", "security", "test", "hello",
        "world", "master", "access", "user", "guest", "pakistan"
    ]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/hash', methods=['POST'])
def generate_hash_endpoint():
    data = request.get_json()
    password = data.get('password')
    algorithm = data.get('algorithm', 'sha256')
    use_salt = data.get('use_salt', False)

    if not password:
        return jsonify({"error": "Password is required"}), 400

    salt = None
    if use_salt:
        salt = secrets.token_hex(16)

    hashed_password = hash_password(password, salt, algorithm)
    return jsonify({
        "hashed_password": hashed_password,
        "salt": salt
    })

def hash_password(password, salt, algorithm):
    """Hashes the password using the specified algorithm and salt."""
    salted_password = (password + (salt or "")).encode('utf-8')

    if algorithm == 'md5':
        return hashlib.md5(salted_password).hexdigest()
    elif algorithm == 'sha1':
        return hashlib.sha1(salted_password).hexdigest()
    elif algorithm == 'sha256':
        return hashlib.sha256(salted_password).hexdigest()
    else:
        raise ValueError("Unsupported hashing algorithm. Use 'md5', 'sha1', or 'sha256'.")

@app.route('/start-attack', methods=['POST'])
def start_attack_endpoint():
    global attack_running, stop_attack_event, attack_results, current_attack_status

    if attack_running:
        return jsonify({"message": "Attack already in progress"}), 409

    data = request.get_json()
    target_hash = data.get('hash')
    algorithm = data.get('algorithm')
    salt = data.get('salt')
    attack_type = data.get('attack_type')

    if not all([target_hash, algorithm, attack_type]):
        return jsonify({"error": "Missing attack parameters"}), 400

    attack_running = True
    stop_attack_event.clear()
    attack_results = {
        "password_found": False,
        "password": None,
        "total_time": 0,
        "total_attempts": 0
    }
    current_attack_status = {
        "status": "Running",
        "attempts": 0,
        "time_elapsed": 0,
        "current_guess": "N/A",
        "total_possible_attempts": 0, # New: Total possible attempts
        "speed": 0, # New: Attempts per second
        "estimated_time_remaining": "N/A" # New: Estimated time remaining
    }

    if attack_type == 'dictionary':
        current_attack_status["total_possible_attempts"] = len(DICTIONARY)
        attack_thread = Thread(target=run_dictionary_attack, args=(target_hash, algorithm, salt))
    elif attack_type == 'brute-force':
        charset_config = data.get('charset', {})
        max_length = int(data.get('max_length', 4))

        charset_chars = ""
        if charset_config.get('lowercase'):
            charset_chars += string.ascii_lowercase
        if charset_config.get('uppercase'):
            charset_chars += string.ascii_uppercase
        if charset_config.get('numbers'):
            charset_chars += string.digits
        if charset_config.get('special'):
            charset_chars += string.punctuation

        total_combinations = 0
        if charset_chars:
            for length in range(1, max_length + 1):
                total_combinations += math.pow(len(charset_chars), length)
        current_attack_status["total_possible_attempts"] = int(total_combinations) # Calculate total combinations
        attack_thread = Thread(target=run_brute_force_attack, args=(target_hash, algorithm, salt, charset_config, max_length))
    else:
        attack_running = False
        return jsonify({"error": "Invalid attack type"}), 400

    attack_thread.start()
    return jsonify({"message": "Attack started", "total_possible_attempts": current_attack_status["total_possible_attempts"]})

@app.route('/stop-attack', methods=['POST'])
def stop_attack_endpoint():
    global attack_running, stop_attack_event
    if attack_running:
        stop_attack_event.set()
        attack_running = False
        return jsonify({"message": "Attack stopping initiated"})
    return jsonify({"message": "No attack is currently running"}), 400

@app.route('/attack-status', methods=['GET'])
def get_attack_status():
    global attack_running, attack_results, current_attack_status
    return jsonify({
        "running": attack_running,
        "results": attack_results if not attack_running else current_attack_status
    })

def run_dictionary_attack(target_hash, algorithm, salt):
    global attack_running, stop_attack_event, attack_results, current_attack_status

    start_time = time.time()
    attempts = 0
    password_found = False
    found_password = None
    total_words = len(DICTIONARY)

    for word in DICTIONARY:
        if stop_attack_event.is_set():
            break

        attempts += 1
        elapsed_time = time.time() - start_time

        current_attack_status['attempts'] = attempts
        current_attack_status['time_elapsed'] = round(elapsed_time, 1)
        current_attack_status['current_guess'] = word

        if elapsed_time > 0:
            current_attack_status['speed'] = round(attempts / elapsed_time, 2)
            remaining_attempts = total_words - attempts
            if current_attack_status['speed'] > 0:
                estimated_remaining_time = remaining_attempts / current_attack_status['speed']
                current_attack_status['estimated_time_remaining'] = format_time(estimated_remaining_time)
            else:
                current_attack_status['estimated_time_remaining'] = "Calculating..."
        else:
            current_attack_status['speed'] = 0
            current_attack_status['estimated_time_remaining'] = "Calculating..."


        hashed_word = hash_password(word, salt, algorithm)
        if hashed_word == target_hash:
            password_found = True
            found_password = word
            break

    attack_running = False
    total_time = round(time.time() - start_time, 1)

    attack_results['password_found'] = password_found
    attack_results['password'] = found_password
    attack_results['total_time'] = total_time
    attack_results['total_attempts'] = attempts
    current_attack_status['status'] = "Finished"
    current_attack_status['speed'] = round(attempts / total_time, 2) if total_time > 0 else 0 # Final speed
    current_attack_status['estimated_time_remaining'] = "0s" # Attack finished


def run_brute_force_attack(target_hash, algorithm, salt, charset_config, max_length):
    global attack_running, stop_attack_event, attack_results, current_attack_status

    charset_chars = ""
    if charset_config.get('lowercase'):
        charset_chars += string.ascii_lowercase
    if charset_config.get('uppercase'):
        charset_chars += string.ascii_uppercase
    if charset_config.get('numbers'):
        charset_chars += string.digits
    if charset_config.get('special'):
        charset_chars += string.punctuation

    if not charset_chars:
        attack_running = False
        attack_results['password_found'] = False
        attack_results['password'] = None
        attack_results['total_time'] = 0
        attack_results['total_attempts'] = 0
        current_attack_status['status'] = "Error: No character set selected"
        return

    start_time = time.time()
    attempts = 0
    password_found = False
    found_password = None

    # Calculate total possible attempts dynamically for progress
    total_possible_attempts_calculated = 0
    for length_calc in range(1, max_length + 1):
        total_possible_attempts_calculated += math.pow(len(charset_chars), length_calc)
    current_attack_status["total_possible_attempts"] = int(total_possible_attempts_calculated)

    # Define attempts per second based on the algorithm (for simulation speed)
    # THESE VALUES ARE SIGNIFICANTLY INCREASED FOR FASTER SIMULATION
    attempts_per_second_limit = {
        'md5': 3_000_000_000,   # Increased to 3 Billion attempts/second
        'sha1': 2_000_000_000,  # Increased to 2 Billion attempts/second
        'sha256': 1_000_000_000 # Increased to 1 Billion attempts/second
    }.get(algorithm, 1_000_000_000) # Default to 1 Billion if algorithm is not specified or unknown

    delay_per_attempt = 1.0 / attempts_per_second_limit

    def generate_combinations(chars, length):
        if length == 0:
            yield ""
        else:
            for char in chars:
                for suffix in generate_combinations(chars, length - 1):
                    yield char + suffix

    for length in range(1, max_length + 1):
        if stop_attack_event.is_set():
            break

        for guess in generate_combinations(charset_chars, length):
            if stop_attack_event.is_set():
                break

            attempts += 1
            elapsed_time = time.time() - start_time

            # Apply speed limit
            # Only sleep if we are processing more than the allowed attempts per second
            if attempts % attempts_per_second_limit == 0:
                expected_time_for_attempts = attempts * delay_per_attempt
                sleep_time = expected_time_for_attempts - elapsed_time
                if sleep_time > 0:
                    time.sleep(sleep_time)

            current_attack_status['attempts'] = attempts
            current_attack_status['time_elapsed'] = round(elapsed_time, 1)
            current_attack_status['current_guess'] = guess

            if elapsed_time > 0:
                current_attack_status['speed'] = round(attempts / elapsed_time, 2)
                remaining_attempts = current_attack_status["total_possible_attempts"] - attempts
                if current_attack_status['speed'] > 0:
                    estimated_remaining_time = remaining_attempts / current_attack_status['speed']
                    current_attack_status['estimated_time_remaining'] = format_time(estimated_remaining_time)
                else:
                    current_attack_status['estimated_time_remaining'] = "Calculating..."
            else:
                current_attack_status['speed'] = 0
                current_attack_status['estimated_time_remaining'] = "Calculating..."

            hashed_guess = hash_password(guess, salt, algorithm)
            if hashed_guess == target_hash:
                password_found = True
                found_password = guess
                break
        if password_found:
            break

    attack_running = False
    total_time = round(time.time() - start_time, 1)

    attack_results['password_found'] = password_found
    attack_results['password'] = found_password
    attack_results['total_time'] = total_time
    attack_results['total_attempts'] = attempts
    current_attack_status['status'] = "Finished"
    current_attack_status['speed'] = round(attempts / total_time, 2) if total_time > 0 else 0 # Final speed
    current_attack_status['estimated_time_remaining'] = "0s" # Attack finished

def format_time(seconds):
    """Formats seconds into human-readable Hh Mm Ss format."""
    if seconds is None or seconds < 0:
        return "N/A"
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    remaining_seconds = seconds % 60

    parts = []
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if remaining_seconds > 0 or not parts: # Ensure "0s" is shown if time is 0
        parts.append(f"{remaining_seconds}s")
    return " ".join(parts)


if __name__ == '__main__':
    if not os.path.exists('static'):
        os.makedirs('static')

    app.run(debug=True, port=5000)