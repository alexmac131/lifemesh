// wifi
#include <SPI.h>
#include <WiFi.h>

// bmp085
#include <Wire.h>
#include <Adafruit_BMP085.h>

// MQ135 has no #include prerequisites

uint32_t sensor_reading_delay = 5000; // milliseconds between sensor readings

// Location
char latitude[] = "43.451028";
char longitude[] = "-80.4963671";

// WIFI: network SSID (name) and network password
//char wifi_ssid[] = "Alex's Iphone seven";
//char wifi_pass[] = "alexwashere131";
char wifi_ssid[] = "Windows Phone7348";
char wifi_pass[] = "E069$3y3";

char server[] = "api.lifemesh.io";

void setup()
{
  Serial.begin(9600); // Initialize serial and wait for port to open
  while (!Serial);    // Wait for serial port to connect. Needed for Leonardo only!

  wifi_setup();
  bmp085_setup();
  // MQ has no setup() requirement
}

WiFiClient wifi_client;

void wifi_setup()
{
  // Check if the shield is present
  if (WiFi.status() == WL_NO_SHIELD) {
    Serial.println("WiFi shield not present");
    while (true); // don't continue
  }

  // Disable SD card
  pinMode(4, OUTPUT);
  digitalWrite(4, HIGH);

  // Attempt to connect to Wifi network
  int tryCount = 1;
  int wifi_status = WL_IDLE_STATUS;
  while (wifi_status != WL_CONNECTED) {
    Serial.print("Attempt (");
    Serial.print(tryCount++);
    Serial.print(") to connect to WPA SSID: ");
    Serial.println(wifi_ssid);
    // Connect to WPA/WPA2 network
    wifi_status = WiFi.begin(wifi_ssid, wifi_pass);

    delay(5000); // wait 5 seconds for connection
  }
  Serial.println("You're connected to the network!");
  wifi_println();

  Serial.print("Starting connection to: ");
  Serial.println(server);
  if (wifi_client.connect(server, 80)) {
    Serial.print("Connected to: ");
    Serial.println(server);
  }
}

// Connect VCC of the BMP085 sensor to 3.3V
// Connect GND to Ground
// Connect SCL to i2c clock - on '168/'328 Arduino Uno/Duemilanove/etc thats Analog 5
// Connect SDA to i2c data - on '168/'328 Arduino Uno/Duemilanove/etc thats Analog 4

Adafruit_BMP085 bmp085;
  
void bmp085_setup()
{
  if (!bmp085.begin())
    Serial.println("Could not find a valid BMP085 sensor, check wiring!");
}
  
long loop_counter = 0;

void loop()
{
  Serial.print("\nloop_counter=");
  Serial.println(loop_counter++);

  wifi_read();

  // If the server is disconnected then stop the client.
  if (!wifi_client.connected()) {
    Serial.println("\nDisconnected from server!");
    wifi_client.stop();
    while (true); // don't continue
  }

  bmp085_println();
  mq_println();

  delay(sensor_reading_delay);
}

void trim_leading_spaces(char *str)
{
  char *p = str; 
  while (*p == ' ')
    p++;
  if (*p) {
    for(; *p; p++, str++)
      *str = *p;
  } else {
      *str = *p;
  }
}

void wifi_read()
{
  if (wifi_client.available()) {
    while (wifi_client.available()) {
      char c = wifi_client.read();
//      Serial.write(c);
    }
//    Serial.println();
  }
}

void wifi_post(char *content)
{
  wifi_client.println("POST /collector HTTP/1.1");
  wifi_client.println("Host: api.lifemesh.io:80");
  wifi_client.println("Accept: */*");
  wifi_client.print("Content-Length: ");
  wifi_client.println(strlen(content));
  wifi_client.println("Connection: keep-alive");
  wifi_client.println("Content-Type: application/json");
  wifi_client.println();
  wifi_client.println(content);

  Serial.print("POSTed: ");
  Serial.println(content);

  wifi_read(); // display response to POST
}

void wifi_println()
{
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  Serial.print("Signal strength (RSSI):");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  Serial.print("Encryption Type:");
  Serial.println(WiFi.encryptionType(), HEX);
  Serial.println();
}

void bmp085_println()
{
  char buf_main[200];
  char buf_float[16]; // 15+trailing NUL

  dtostrf(bmp085.readTemperature(), 6, 2, buf_float);
  trim_leading_spaces(buf_float);
  sprintf(buf_main, "{\"latitude\":\"%s\",\"longitude\":\"%s\",\"temperature\":\"%s C\"}", latitude, longitude, buf_float);
  wifi_post(buf_main);

  sprintf(buf_main, "{\"latitude\":\"%s\",\"longitude\":\"%s\",\"pressure\":\"%d Pa\"}", latitude, longitude, bmp085.readPressure());
  wifi_post(buf_main);

  dtostrf(bmp085.readAltitude(), 8, 2, buf_float);
  trim_leading_spaces(buf_float);
  sprintf(buf_main, "{\"latitude\":\"%s\",\"longitude\":\"%s\",\"altitude\":\"%s m\"}", latitude, longitude, buf_float);
  wifi_post(buf_main);
}

void mq_println()
{
  char buf_main[200];

  int value = analogRead(0); // read analog input pin 0
  sprintf(buf_main, "{\"latitude\":\"%s\",\"longitude\":\"%s\",\"air_quality\":\"%d PPM\"}", latitude, longitude, value);
  wifi_post(buf_main);
}
