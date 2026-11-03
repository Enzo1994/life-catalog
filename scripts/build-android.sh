#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${JAVA_HOME:-}" ]]; then
  if /usr/libexec/java_home -v 21 >/dev/null 2>&1; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
  else
    catalog_jdk="$(find "$HOME/Library/Caches/life-catalog-build/java" -maxdepth 4 -type d -path '*/Contents/Home' -print -quit 2>/dev/null || true)"
    if [[ -z "$catalog_jdk" ]]; then
      echo '需要 JDK 21；请安装后设置 JAVA_HOME。' >&2
      exit 1
    fi
    export JAVA_HOME="$catalog_jdk"
  fi
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
node scripts/verify-model.mjs
npm run build
npx cap sync android
(cd android && ./gradlew :app:assembleDebug --console=plain)
mkdir -p artifacts
cp android/app/build/outputs/apk/debug/app-debug.apk artifacts/life-catalog-0.2.0-debug.apk
shasum -a 256 artifacts/life-catalog-0.2.0-debug.apk > artifacts/life-catalog-0.2.0-debug.apk.sha256
printf 'APK: %s/artifacts/life-catalog-0.2.0-debug.apk\n' "$PWD"
