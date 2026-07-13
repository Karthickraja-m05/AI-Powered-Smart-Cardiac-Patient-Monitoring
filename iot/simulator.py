# -*- coding: utf-8 -*-
"""
IoT Vital Signs Simulator
==========================
Simulates ESP32 + MAX30102 + AD8232 sensor data and sends to the backend.
Generates realistic vital sign patterns with circadian rhythm, noise, and
occasional abnormal events for demo purposes.
"""

import time
import math
import random
import requests
import argparse
from datetime import datetime

# ── Configuration ──
API_URL = "http://localhost:8000/api/vitals/iot"
INTERVAL_SECONDS = 3  # How often to send data


class VitalSimulator:
    """Generates realistic vital sign data for a patient."""

    def __init__(self, patient_id: int, device_id: str = "ESP32-SIM-001"):
        self.patient_id = patient_id
        self.device_id = device_id
        self.tick = 0

        # Base values (patient-specific variation)
        self.base_hr = random.randint(65, 85)
        self.base_spo2 = random.uniform(96, 99)
        self.base_temp = random.uniform(36.4, 37.0)
        self.base_sys = random.randint(115, 135)
        self.base_dia = random.randint(70, 85)
        self.base_resp = random.randint(14, 18)

        # ECG simulation parameters
        self.ecg_phase = 0

    def generate(self) -> dict:
        """Generate one reading of vital signs."""
        self.tick += 1
        t = self.tick * INTERVAL_SECONDS

        # Circadian rhythm factor (subtle variation over "day")
        circadian = math.sin(t / 3600 * math.pi / 12)  # 24-hour cycle compressed

        # Simulate occasional events (1% chance per tick)
        event = random.random()
        event_multiplier = 1.0
        if event < 0.01:  # Stress event
            event_multiplier = 1.3
        elif event < 0.005:  # Mild anomaly
            event_multiplier = 0.7

        # ── Heart Rate ──
        hr = self.base_hr + (
            circadian * 5 +
            random.gauss(0, 3) +
            (event_multiplier - 1) * 30
        )
        hr = max(40, min(180, hr))

        # ── SpO₂ ──
        spo2 = self.base_spo2 + random.gauss(0, 0.5)
        if event_multiplier < 1:
            spo2 -= random.uniform(3, 8)
        spo2 = max(80, min(100, spo2))

        # ── Temperature ──
        temp = self.base_temp + circadian * 0.3 + random.gauss(0, 0.15)
        temp = max(35.0, min(42.0, round(temp, 1)))

        # ── Blood Pressure ──
        sys_bp = self.base_sys + circadian * 8 + random.gauss(0, 5) + (event_multiplier - 1) * 25
        dia_bp = self.base_dia + circadian * 4 + random.gauss(0, 3)
        sys_bp = max(70, min(220, int(sys_bp)))
        dia_bp = max(40, min(140, int(dia_bp)))

        # ── Respiratory Rate ──
        resp = self.base_resp + circadian * 2 + random.gauss(0, 1.5)
        resp = max(6, min(40, round(resp, 1)))

        # ── ECG Data (simplified waveform) ──
        ecg = self._generate_ecg_segment()

        return {
            "device_id": self.device_id,
            "patient_id": self.patient_id,
            "heart_rate": round(hr, 1),
            "spo2": round(spo2, 1),
            "temperature": temp,
            "bp_systolic": sys_bp,
            "bp_diastolic": dia_bp,
            "respiratory_rate": resp,
            "ecg_data": ecg,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def _generate_ecg_segment(self, num_points: int = 50) -> list:
        """Generate a simplified ECG waveform segment (PQRST)."""
        ecg = []
        for i in range(num_points):
            self.ecg_phase += 0.15
            t = self.ecg_phase

            # P wave
            p = 0.15 * math.exp(-((t % (2 * math.pi) - 0.5) ** 2) / 0.02)
            # QRS complex
            q = -0.1 * math.exp(-((t % (2 * math.pi) - 1.0) ** 2) / 0.005)
            r = 1.0 * math.exp(-((t % (2 * math.pi) - 1.1) ** 2) / 0.003)
            s = -0.15 * math.exp(-((t % (2 * math.pi) - 1.2) ** 2) / 0.005)
            # T wave
            tw = 0.3 * math.exp(-((t % (2 * math.pi) - 1.8) ** 2) / 0.03)

            value = p + q + r + s + tw + random.gauss(0, 0.02)
            ecg.append(round(value, 4))

        return ecg


def run_simulator(patient_id: int, device_id: str, interval: int):
    """Main simulation loop."""
    sim = VitalSimulator(patient_id, device_id)

    print("=" * 60)
    print(f"  IoT Vital Signs Simulator")
    print(f"  Patient ID: {patient_id}")
    print(f"  Device: {device_id}")
    print(f"  Interval: {interval}s")
    print(f"  Target: {API_URL}")
    print("=" * 60)
    print()

    tick = 0
    while True:
        try:
            tick += 1
            data = sim.generate()

            # Send to backend
            try:
                resp = requests.post(API_URL, json=data, timeout=5)
                status = resp.status_code
                result = resp.json() if resp.ok else resp.text
            except requests.ConnectionError:
                status = 0
                result = "Connection refused — is the backend running?"

            # Display
            hr = data["heart_rate"]
            spo2 = data["spo2"]
            temp = data["temperature"]
            bp = f"{data['bp_systolic']}/{data['bp_diastolic']}"

            hr_icon = "💚" if 60 <= hr <= 100 else "🔴"
            spo2_icon = "💚" if spo2 >= 95 else ("🟡" if spo2 >= 90 else "🔴")

            print(
                f"  [{tick:04d}] {hr_icon} HR: {hr:5.1f} bpm | "
                f"{spo2_icon} SpO₂: {spo2:5.1f}% | "
                f"🌡️ {temp}°C | 🩺 BP: {bp} | "
                f"📡 HTTP {status}"
            )

            if status != 201 and status != 0:
                print(f"         ⚠️  {result}")

            time.sleep(interval)

        except KeyboardInterrupt:
            print("\n\n[STOP] Simulator stopped by user.")
            break


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IoT Vital Signs Simulator")
    parser.add_argument("--patient-id", type=int, default=1, help="Patient ID")
    parser.add_argument("--device-id", type=str, default="ESP32-SIM-001", help="Device ID")
    parser.add_argument("--interval", type=int, default=3, help="Seconds between readings")
    parser.add_argument("--api-url", type=str, default=API_URL, help="Backend API URL")
    args = parser.parse_args()

    API_URL = args.api_url
    run_simulator(args.patient_id, args.device_id, args.interval)
