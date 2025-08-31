from flask import Flask, request, jsonify, send_file, after_this_request
from flask_cors import CORS
import os
import tempfile
import uuid
import json
from werkzeug.utils import secure_filename
import librosa
import soundfile as sf
import numpy as np
from datetime import datetime
import logging
import multiprocessing
import zipfile
from io import BytesIO


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'm4a', 'ogg'}


os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

RETENTION_MINUTES = int(os.environ.get('RETENTION_MINUTES', '120'))  
HQ_TIMEOUT_SECONDS = int(os.environ.get('HQ_TIMEOUT_SECONDS', '120'))  

def cleanup_old_sessions(retention_minutes: int = RETENTION_MINUTES) -> None:
    
    try:
        now = datetime.now().timestamp()
        max_age_seconds = retention_minutes * 60

        for file_name in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, file_name)
            try:
                if not os.path.isfile(file_path):
                    continue
                age = now - os.path.getmtime(file_path)
                if age > max_age_seconds:
                    os.remove(file_path)
            except Exception:
                
                pass

       
        for session_dir in os.listdir(OUTPUT_FOLDER):
            dir_path = os.path.join(OUTPUT_FOLDER, session_dir)
            try:
                if not os.path.isdir(dir_path):
                    continue
                
                dir_mtime = os.path.getmtime(dir_path)
                for root, _, files in os.walk(dir_path):
                    for f in files:
                        file_mtime = os.path.getmtime(os.path.join(root, f))
                        if file_mtime > dir_mtime:
                            dir_mtime = file_mtime
                age = now - dir_mtime
                if age > max_age_seconds:
                    import shutil
                    shutil.rmtree(dir_path, ignore_errors=True)
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"Cleanup skipped: {e}")



def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def detect_instruments(audio_path):
    
    try:
    
        y, sr = librosa.load(audio_path, sr=None)
        
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
        
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        tempo = float(tempo)
        
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        
        harmonic_energy = float(np.sum(y_harmonic**2))
        percussive_energy = float(np.sum(y_percussive**2))
        total_energy = float(np.sum(y**2))
        
        instruments = []
        
        vocal_confidence = min(0.95, harmonic_energy / total_energy * 1.5)
        if vocal_confidence > 0.3:
            instruments.append({
                "name": "Vocals",
                "confidence": round(vocal_confidence, 2),
                "sub_parts": ["Lead", "Tenors"]
            })
        
        drum_confidence = min(0.95, percussive_energy / total_energy * 1.2)
        if drum_confidence > 0.2:
            instruments.append({
                "name": "Drums",
                "confidence": round(drum_confidence, 2),
                "sub_parts": ["Kick", "Snare", "Hi-hats", "Crash"]
            })
        
        mel_spectrogram = librosa.feature.melspectrogram(y=y_harmonic, sr=sr, n_mels=128)
        low_freq_bins = mel_spectrogram[:8, :]
        bass_energy = float(np.sum(low_freq_bins**2))
        bass_confidence = min(0.95, bass_energy / total_energy * 2.0)
        if bass_confidence > 0.15:
            instruments.append({
                "name": "Bass",
                "confidence": round(bass_confidence, 2),
                "sub_parts": ["Electric Bass", "Synth Bass"]
            })
        
        other_confidence = min(0.95, (harmonic_energy - bass_energy) / total_energy * 1.8)
        if other_confidence > 0.1:
            instruments.append({
                "name": "Other",
                "confidence": round(other_confidence, 2),
                "sub_parts": ["Guitar", "Piano", "Wind", "Strings"]
            })
        
        instruments.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            "instruments": instruments,
            "tempo": round(tempo, 1),
            "duration": round(len(y) / sr, 2),
            "sample_rate": sr
        }
        
    except Exception as e:
        logger.error(f"Error detecting instruments: {str(e)}")
        logger.error(f"Audio file path: {audio_path}")
        logger.error(f"File exists: {os.path.exists(audio_path)}")
        raise RuntimeError(f"Detection failed: {str(e)}")

def separate_audio(audio_path, selected_instruments):
    try:
        session_id = str(uuid.uuid4())
        output_dir = os.path.join(OUTPUT_FOLDER, session_id)
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"Starting fast audio separation for session {session_id}")
        y, sr = librosa.load(audio_path, sr=None)
        duration = len(y) / sr
        separated_tracks = []
        for instrument in selected_instruments:
            instrument_name = instrument['name']
            if instrument_name == 'Vocals':
                y_filtered = librosa.effects.harmonic(librosa.effects.preemphasis(y, coef=0.95), margin=8.0)
            elif instrument_name == 'Drums':
                y_filtered = librosa.effects.percussive(y, margin=3.0)
            elif instrument_name == 'Bass':
                n_fft = 2048
                hop_length = 512
                S = librosa.stft(y, n_fft=n_fft, hop_length=hop_length)
                freqs = librosa.fft_frequencies(sr=sr, n_fft=n_fft)
                cutoff_hz = 250.0
                bass_band = freqs <= cutoff_hz
                S_filtered = S.copy()
                S_filtered[~bass_band, :] *= 0.05
                y_filtered = librosa.istft(S_filtered, hop_length=hop_length)
            else:
                y_filtered = librosa.effects.harmonic(y, margin=5.0)
            y_filtered = librosa.util.normalize(y_filtered)
            file_path = os.path.join(output_dir, f"{instrument_name.lower().replace(' ', '_')}.wav")
            sf.write(file_path, y_filtered, sr)
            separated_tracks.append({
                'name': instrument_name,
                'file_path': file_path,
                'duration': round(duration, 2),
                'sample_rate': sr,
                'sub_parts': instrument.get('sub_parts', [])
            })
        logger.info(f"Audio separation completed for session {session_id}")
        return separated_tracks, session_id
        
    except Exception as e:
        logger.error(f"Error separating audio: {str(e)}")
        raise e

@app.route('/app-check', methods=['GET'])
def app_check():

    cleanup_old_sessions()
    return jsonify({"status": "healthy", "service": "audio-separation"})

@app.route('/detect-instruments', methods=['POST'])
def detect_instruments_endpoint():
    try:
        cleanup_old_sessions()
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400
        
        filename = secure_filename(file.filename)
        session_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_FOLDER, f"{session_id}_{filename}")
        file.save(file_path)
        
        result = detect_instruments(file_path)
        result['session_id'] = session_id
        result['original_file'] = filename
        
        logger.info(f"Instrument detection completed for {filename}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in detection: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/separate-audio', methods=['POST'])
def separate_audio_endpoint():
    try:
        cleanup_old_sessions()
        data = request.get_json()
        
        if not data or 'session_id' not in data or 'selected_instruments' not in data:
            return jsonify({"error": "Missing data"}), 400
        
        session_id = data['session_id']
        selected_instruments = data['selected_instruments']
        
        original_file = None
        for file in os.listdir(UPLOAD_FOLDER):
            if file.startswith(session_id):
                original_file = file
                break
        
        if not original_file:
            return jsonify({"error": "Original file not found"}), 404
        
        file_path = os.path.join(UPLOAD_FOLDER, original_file)
        
        separated_tracks, output_session_id = separate_audio(file_path, selected_instruments)
        
        result = {
            "session_id": output_session_id,
            "tracks": []
        }
        
        for track in separated_tracks:
            result["tracks"].append({
                "name": track["name"],
                "duration": track["duration"],
                "sample_rate": track["sample_rate"],
                "sub_parts": track["sub_parts"],
                "download_url": f"/download/{output_session_id}/{track['name'].lower()}"
            })
        
        logger.info(f"Audio separation completed: {session_id}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in separate-audio: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/download/<session_id>/<instrument>', methods=['GET'])
def download_track(session_id, instrument):
    try:
        cleanup_old_sessions()

        output_dir = os.path.join(OUTPUT_FOLDER, session_id)
        if not os.path.exists(output_dir):
            return jsonify({"error": "Session not found"}), 404
        instrument_key = instrument.lower()
        candidate = os.path.join(output_dir, f"{instrument_key}.wav")

        if not os.path.exists(candidate):
            for file in os.listdir(output_dir):
                if file.startswith(instrument_key) and file.endswith('.wav'):
                    candidate = os.path.join(output_dir, file)
                    break

        if not os.path.exists(candidate):
            return jsonify({"error": "Track not found"}), 404

        delete_after = request.args.get('delete') in ('1', 'true', 'yes')

        if delete_after:
            @after_this_request
            def remove_files(response):
                try:
                    import shutil
                    shutil.rmtree(output_dir, ignore_errors=True)
                    for file in os.listdir(UPLOAD_FOLDER):
                        if file.startswith(session_id):
                            os.remove(os.path.join(UPLOAD_FOLDER, file))
                except Exception:
                    pass
                return response

        return send_file(candidate, as_attachment=True, download_name=f"{instrument_key}.wav")

    except Exception as e:
        logger.error(f"Error downloading: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/cleanup/<session_id>', methods=['DELETE'])
def cleanup_session(session_id):
    try:
        for file in os.listdir(UPLOAD_FOLDER):
            if file.startswith(session_id):
                os.remove(os.path.join(UPLOAD_FOLDER, file))
        
        output_dir = os.path.join(OUTPUT_FOLDER, session_id)
        if os.path.exists(output_dir):
            import shutil
            shutil.rmtree(output_dir)
        
        return jsonify({"message": "Session cleaned up successfully"})
        
    except Exception as e:
        logger.error(f"Error cleaning up session: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/download-all/<session_id>', methods=['GET'])

def download_all(session_id):
    try:
        cleanup_old_sessions()

        output_dir = os.path.join(OUTPUT_FOLDER, session_id)
        if not os.path.isdir(output_dir):
            return jsonify({"error": "Session not found"}), 404

        wav_files = []
        for root, _, files in os.walk(output_dir):
            for f in files:
                if f.lower().endswith('.wav'):
                    wav_files.append(os.path.join(root, f))

        if not wav_files:
            return jsonify({"error": "No available tracks"}), 404

        mem_zip = BytesIO()
        with zipfile.ZipFile(mem_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
            for fpath in wav_files:
                arcname = os.path.basename(fpath)
                zf.write(fpath, arcname=arcname)
        mem_zip.seek(0)

        download_name = f"{session_id}_tracks.zip"
        return send_file(mem_zip, as_attachment=True, download_name=download_name, mimetype='application/zip')
    except Exception as e:
        logger.error(f"Error creating zip {session_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
