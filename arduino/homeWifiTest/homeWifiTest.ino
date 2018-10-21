/*

 This example connects to an unencrypted Wifi network.
 Then it prints the  MAC address of the Wifi shield,
 the IP address obtained, and other network details.

 Circuit:
 * WiFi shield attached

 created 13 July 2010
 by dlf (Metodo2 srl)
 modified 31 May 2012
 by Tom Igoe
 */

#include <SPI.h>
#include <WiFi.h>

// Enter your network SSID (name) and network password
//char ssid[] = "Alex's Iphone seven";
//char pass[] = "alexwashere131";
char ssid[] = "Windows Phone7348";
char pass[] = "E069$3y3";

WiFiServer server(23);
int status = WL_IDLE_STATUS;      // the Wifi radio's status
boolean alreadyConnected = false; // whether or not the client was connected previously

void setup()
{
  // Disable SD card
  pinMode(4, OUTPUT);
  digitalWrite(4, HIGH);

  Serial.begin(9600); // Initialize serial and wait for port to open:
  while (!Serial);    // Wait for serial port to connect. Needed for Leonardo only!

  // Attempt to connect to Wifi network:
  int tryCount = 1;
  while ( status != WL_CONNECTED) {
    Serial.print("Attempting to connect ");
    Serial.print(tryCount++);
    Serial.print("to WPA SSID: ");
    Serial.println(ssid);
    // Connect to WPA/WPA2 network:
    status = WiFi.begin(ssid, pass);

    delay(10000); // wait 10 seconds for connection:
  }
  server.begin();
  printWifiStatus();

  // you're connected now, so print out the data:
  Serial.print("You're connected to the network");
  printCurrentNet();
  printWifiData();
}

long rssi = 1.1;
long last = 1.1;
long delta = 1.1;

void loop()
{
  long rssi = WiFi.RSSI(); // wait for a new client:
  delta = last - rssi;
  last = rssi;

  Serial.println(String(rssi) + " dbm\t\t" + String(delta));

  WiFiClient client = server.available();
  // when the client sends the first byte, say hello:
  if (client) {
    if (!alreadyConnected) {
      // clead out the input buffer:
      client.flush();
      Serial.println("We have a new client");
      client.println("Hello, client!");
      alreadyConnected = true;
    }

    if (client.available() > 0) {
      char thisChar = client.read(); // read the bytes incoming from the client:
      server.write(thisChar);        // echo the bytes back to the client:
      Serial.write(thisChar);        // echo the bytes to the server as well:
    }
  }

  delay(1000); // check the network connection once every 1 second
}

void printWifiData()
{
  // print your WiFi shield's IP address:
  IPAddress ip = WiFi.localIP();
  Serial.print("IP Address: ");
  Serial.println(ip);
  Serial.println(ip);

  // print your MAC address:
  byte mac[6];
  WiFi.macAddress(mac);
  Serial.print("MAC address: ");
  Serial.print(mac[5], HEX);
  Serial.print(":");
  Serial.print(mac[4], HEX);
  Serial.print(":");
  Serial.print(mac[3], HEX);
  Serial.print(":");
  Serial.print(mac[2], HEX);
  Serial.print(":");
  Serial.print(mac[1], HEX);
  Serial.print(":");
  Serial.println(mac[0], HEX);
}

void printCurrentNet()
{
  // print the SSID of the network you're attached to:
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  // print the MAC address of the router you're attached to:
  byte bssid[6];
  WiFi.BSSID(bssid);
  Serial.print("BSSID: ");
  Serial.print(bssid[5], HEX);
  Serial.print(":");
  Serial.print(bssid[4], HEX);
  Serial.print(":");
  Serial.print(bssid[3], HEX);
  Serial.print(":");
  Serial.print(bssid[2], HEX);
  Serial.print(":");
  Serial.print(bssid[1], HEX);
  Serial.print(":");
  Serial.println(bssid[0], HEX);

  // print the received signal strength:
  long rssi = WiFi.RSSI();
  Serial.print("signal strength (RSSI):");
  Serial.println(rssi);

  // print the encryption type:
  byte encryption = WiFi.encryptionType();
  Serial.print("Encryption Type:");
  Serial.println(encryption, HEX);
  Serial.println();
}

void printWifiStatus()
{
  // print the SSID of the network you're attached to:
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  // print your WiFi shield's IP address:
  IPAddress ip = WiFi.localIP();
  Serial.print("IP Address: ");
  Serial.println(ip);

  // print the received signal strength:
  long rssi = WiFi.RSSI();
  Serial.print("signal strength (RSSI):");
  Serial.print(rssi);
  Serial.println(" dBm");
}
