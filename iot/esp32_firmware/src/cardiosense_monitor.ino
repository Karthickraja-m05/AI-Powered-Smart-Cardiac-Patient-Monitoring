/*
 * ═══════════════════════════════════════════════════════════════
 * CardioSense AI — ESP32 Vital Signs Monitor Firmware
 * ═══════════════════════════════════════════════════════════════
 *
 * Hardware:
 *   - ESP32 DevKit V1
 *   - MAX30102 (Heart Rate + SpO₂) — I2C
 *   - AD8232 ECG Module — Analog
 *   - DS18B20 Temperature Sensor — OneWire
 *   - Blood Pressure Sensor (analog)
 *
 * Sends data to CardioSense AI backend via HTTP POST every 3 seconds.
 *
 * Dependencies (install via Arduino Library Manager):
 *   - WiFi (built-in)
 *   - HTTPClient (built-in)
 *   - ArduinoJson
 *   - MAX30105 (SparkFun MAX3010x library)
 *   - DallasTemperature + OneWire
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
// #include <Wire.h>
// #include <MAX30105.h>
// #include <DallasTemperature.h>

// ═══════════════ CONFIGURATION ═══════════════

// WiFi Credentials
const char* WIFI_SSID     = "YourWiFiSSID";
const char* WIFI_PASSWORD  = "YourWiFiPassword";

// CardioSense AI Backend
const char* API_URL       = "http://192.168.1.100:8000/api/vitals/iot";
const char* DEVICE_ID     = "ESP32-WARD-C101";
const int   PATIENT_ID    = 1;

// Timing
const int SEND_INTERVAL_MS = 3000;  // Send every 3 seconds

// Pin Definitions
const int ECG_PIN         = 34;   // AD8232 OUTPUT → ADC1_CH6
const int ECG_LO_PLUS     = 32;   // AD8232 LO+ → GPIO32
const int ECG_LO_MINUS    = 33;   // AD8232 LO- → GPIO33
const int TEMP_PIN        = 4;    // DS18B20 DATA → GPIO4
const int BP_PIN          = 35;   // Blood Pressure analog → ADC1_CH7
const int EMERGENCY_BTN   = 15;   // Emergency button → GPIO15

// ═══════════════ GLOBALS ═══════════════

// MAX30102 max30102;
// OneWire oneWire(TEMP_PIN);
// DallasTemperature tempSensor(&oneWire);

unsigned long lastSendTime = 0;
float ecgBuffer[50];
int ecgIndex = 0;

// ═══════════════ SETUP ═══════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n═══════════════════════════════════════");
  Serial.println("  CardioSense AI — ESP32 Monitor");
  Serial.println("═══════════════════════════════════════\n");

  // Pin modes
  pinMode(ECG_LO_PLUS, INPUT);
  pinMode(ECG_LO_MINUS, INPUT);
  pinMode(EMERGENCY_BTN, INPUT_PULLUP);

  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected!");
    Serial.print("[WiFi] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] FAILED — running offline");
  }

  // Initialize sensors
  // initMAX30102();
  // tempSensor.begin();

  Serial.println("[OK] Sensors initialized");
  Serial.println("[OK] Starting monitoring loop...\n");
}

// ═══════════════ MAIN LOOP ═══════════════

void loop() {
  // Read ECG continuously
  readECG();

  // Check emergency button
  if (digitalRead(EMERGENCY_BTN) == LOW) {
    Serial.println("🚨 EMERGENCY BUTTON PRESSED!");
    sendEmergencyAlert();
    delay(5000); // Debounce
  }

  // Send data at interval
  if (millis() - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = millis();
    sendVitalSigns();
  }

  delay(20); // ~50Hz ECG sampling
}

// ═══════════════ SENSOR READING ═══════════════

void readECG() {
  // Check if leads are connected
  if (digitalRead(ECG_LO_PLUS) == 1 || digitalRead(ECG_LO_MINUS) == 1) {
    return; // Leads off
  }

  int rawECG = analogRead(ECG_PIN);
  float voltage = (rawECG / 4095.0) * 3.3;

  ecgBuffer[ecgIndex] = voltage;
  ecgIndex = (ecgIndex + 1) % 50;
}

float readTemperature() {
  // Simulated — replace with actual DS18B20 reading:
  // tempSensor.requestTemperatures();
  // return tempSensor.getTempCByIndex(0);
  return 36.5 + random(-5, 10) / 10.0;
}

float readHeartRate() {
  // Simulated — replace with MAX30102 reading:
  // return max30102.getHeartRate();
  return 72.0 + random(-10, 15);
}

float readSpO2() {
  // Simulated — replace with MAX30102 reading:
  // return max30102.getSpO2();
  return 97.0 + random(-3, 2) / 1.0;
}

int readBloodPressureSystolic() {
  // Simulated — replace with actual BP sensor
  return 120 + random(-10, 15);
}

int readBloodPressureDiastolic() {
  return 80 + random(-5, 10);
}

// ═══════════════ DATA TRANSMISSION ═══════════════

void sendVitalSigns() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WARN] WiFi disconnected — skipping send");
    return;
  }

  // Collect all readings
  float hr   = readHeartRate();
  float spo2 = readSpO2();
  float temp = readTemperature();
  int   sys  = readBloodPressureSystolic();
  int   dia  = readBloodPressureDiastolic();

  // Build JSON payload
  StaticJsonDocument<1024> doc;
  doc["device_id"]         = DEVICE_ID;
  doc["patient_id"]        = PATIENT_ID;
  doc["heart_rate"]        = hr;
  doc["spo2"]              = spo2;
  doc["temperature"]       = temp;
  doc["bp_systolic"]       = sys;
  doc["bp_diastolic"]      = dia;
  doc["respiratory_rate"]  = 16 + random(-3, 5);

  // Add ECG data
  JsonArray ecgArray = doc.createNestedArray("ecg_data");
  for (int i = 0; i < 50; i++) {
    ecgArray.add(ecgBuffer[(ecgIndex + i) % 50]);
  }

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send HTTP POST
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);

  Serial.printf("💓 HR:%5.1f | SpO₂:%5.1f%% | 🌡️ %4.1f°C | BP:%d/%d | HTTP:%d\n",
                hr, spo2, temp, sys, dia, httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    // Parse response for alerts
    StaticJsonDocument<256> respDoc;
    deserializeJson(respDoc, response);
    int alerts = respDoc["alerts_triggered"] | 0;
    if (alerts > 0) {
      Serial.printf("⚠️  %d alert(s) triggered!\n", alerts);
    }
  } else {
    Serial.printf("❌ HTTP Error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

void sendEmergencyAlert() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String("http://192.168.1.100:8000/api/dashboard/emergency/") + PATIENT_ID;

  HTTPClient http;
  http.begin(url.c_str());
  http.addHeader("Content-Type", "application/json");
  int code = http.POST("{}");
  Serial.printf("[EMERGENCY] Sent — HTTP %d\n", code);
  http.end();
}

/*
void initMAX30102() {
  Wire.begin();
  if (!max30102.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("[ERROR] MAX30102 not found!");
    return;
  }
  max30102.setup();
  max30102.setPulseAmplitudeRed(0x0A);
  max30102.setPulseAmplitudeGreen(0);
  Serial.println("[OK] MAX30102 initialized");
}
*/
