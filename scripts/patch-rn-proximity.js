const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', 'node_modules', 'react-native-proximity', 'android', 'build.gradle');
const backup = target + '.bak';

if (!fs.existsSync(target)) {
  console.log('react-native-proximity android build.gradle not found, skipping patch.');
  process.exit(0);
}

const patched = `apply plugin: 'com.android.library'

android {
    compileSdkVersion 36
    buildToolsVersion "36.0.0"

    defaultConfig {
        minSdkVersion 24
        targetSdkVersion 36
        versionCode 1
        versionName "1.0"
    }
    lintOptions {
        abortOnError false
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'com.facebook.react:react-native:+'
}
`;

try {
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(target, backup);
  }
  fs.writeFileSync(target, patched, 'utf8');
  console.log('Patched react-native-proximity android/build.gradle');
} catch (err) {
  console.error('Failed to patch react-native-proximity:', err);
  process.exit(1);
}

// Also patch java source to replace android.support.annotation with androidx.annotation
try {
  const javaPath = path.resolve(__dirname, '..', 'node_modules', 'react-native-proximity', 'android', 'src', 'main', 'java');
  const walk = (dir) => {
    fs.readdirSync(dir).forEach((file) => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) return walk(full);
      if (full.endsWith('.java')) {
        let content = fs.readFileSync(full, 'utf8');
        const replaced = content.replace(/import android\.support\.annotation\./g, 'import androidx.annotation.');
        if (replaced !== content) {
          fs.writeFileSync(full + '.bak', content, 'utf8');
          fs.writeFileSync(full, replaced, 'utf8');
          console.log('Patched', full);
        }
      }
    });
  };
  walk(javaPath);
} catch (e) {
  // non-fatal
}
