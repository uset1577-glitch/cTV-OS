#!/usr/bin/env bash
set -euo pipefail

KEYSTORE_FILE="${1:-cgamestv-release.jks}"
KEY_ALIAS="${2:-cgamestv}"

if [ -f "$KEYSTORE_FILE" ]; then
  echo "El archivo $KEYSTORE_FILE ya existe. Elimínalo o indica otro nombre para no sobrescribir tu llave persistente."
  exit 1
fi

echo "Generando keystore persistente para CgamesTV Launcher ($KEYSTORE_FILE)..."
read -rsp "Contraseña del keystore (ANDROID_KEYSTORE_PASSWORD): " STORE_PASS
echo
read -rsp "Contraseña de la llave (ANDROID_KEY_PASSWORD): " KEY_PASS
echo

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=CgamesTV Launcher, OU=TV, O=CgamesTV, L=Local, ST=Local, C=ES"

echo ""
echo "=== CONFIGURA ESTOS 4 SECRETS EN GITHUB (Settings > Secrets and variables > Actions) ==="
echo "ANDROID_KEY_ALIAS      = $KEY_ALIAS"
echo "ANDROID_KEYSTORE_PASSWORD = (la contraseña que ingresaste)"
echo "ANDROID_KEY_PASSWORD      = (la contraseña de llave que ingresaste)"
echo "ANDROID_KEYSTORE_BASE64   ="
base64 -w 0 "$KEYSTORE_FILE" 2>/dev/null || base64 -i "$KEYSTORE_FILE" | tr -d '\n'
echo ""
echo "Guarda $KEYSTORE_FILE en un lugar seguro (NO lo subas al repositorio Git)."
