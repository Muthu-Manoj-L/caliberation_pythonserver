#!/usr/bin/env node
/**
 * Pre-Build Verification Script
 * Checks if the project is ready for Expo dev build with Chaquopy
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Chaquopy Setup for Expo Dev Build\n');

const checks = [];
const errors = [];
const warnings = [];

// 1. Check app.json has Chaquopy plugin
console.log('1️⃣ Checking app.json configuration...');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  if (appJson.expo.plugins.includes('./plugins/withChaquopy')) {
    checks.push('✅ Chaquopy plugin registered in app.json');
  } else {
    errors.push('❌ Chaquopy plugin NOT registered in app.json');
  }
  
  if (appJson.expo.android?.package) {
    checks.push(`✅ Android package: ${appJson.expo.android.package}`);
  } else {
    errors.push('❌ Android package not configured');
  }
} catch (e) {
  errors.push('❌ Could not read app.json');
}

// 2. Check Chaquopy plugin exists
console.log('2️⃣ Checking Chaquopy plugin file...');
if (fs.existsSync('plugins/withChaquopy.js')) {
  const pluginContent = fs.readFileSync('plugins/withChaquopy.js', 'utf8');
  if (pluginContent.includes('com.chaquo.python')) {
    checks.push('✅ Chaquopy plugin file exists and configured');
  } else {
    errors.push('❌ Chaquopy plugin file incomplete');
  }
  
  if (pluginContent.includes('scipy')) {
    checks.push('✅ SciPy included in dependencies');
  } else {
    warnings.push('⚠️ SciPy not included (needed for spectral analysis)');
  }
} else {
  errors.push('❌ plugins/withChaquopy.js not found');
}

// 3. Check Python files
console.log('3️⃣ Checking Python source files...');
if (fs.existsSync('python/spectral_processor.py')) {
  const pythonContent = fs.readFileSync('python/spectral_processor.py', 'utf8');
  if (pythonContent.includes('def process(self, force_analysis: bool = False)')) {
    checks.push('✅ Python processor supports force_analysis parameter');
  } else {
    errors.push('❌ Python processor missing force_analysis parameter');
  }
  
  if (pythonContent.includes('import cv2') && 
      pythonContent.includes('import numpy') && 
      pythonContent.includes('from scipy')) {
    checks.push('✅ Python dependencies imported correctly');
  } else {
    errors.push('❌ Python missing required imports (cv2, numpy, scipy)');
  }
} else {
  errors.push('❌ python/spectral_processor.py not found');
}

// 4. Check native modules
console.log('4️⃣ Checking native modules...');
if (fs.existsSync('native-modules/SpectralProcessorModule.kt')) {
  const nativeContent = fs.readFileSync('native-modules/SpectralProcessorModule.kt', 'utf8');
  if (nativeContent.includes('options: ReadableMap?') && 
      nativeContent.includes('forceAnalysis')) {
    checks.push('✅ Native module supports forceAnalysis parameter');
  } else {
    errors.push('❌ Native module missing forceAnalysis support');
  }
  
  if (nativeContent.includes('com.chaquo.python')) {
    checks.push('✅ Native module imports Chaquopy');
  } else {
    errors.push('❌ Native module missing Chaquopy import');
  }
} else {
  errors.push('❌ native-modules/SpectralProcessorModule.kt not found');
}

// 5. Check TypeScript bridge
console.log('5️⃣ Checking TypeScript bridge...');
if (fs.existsSync('lib/pythonBridge.ts')) {
  const bridgeContent = fs.readFileSync('lib/pythonBridge.ts', 'utf8');
  if (bridgeContent.includes('processCalibrationImage') && 
      bridgeContent.includes('processAnalysisImage')) {
    checks.push('✅ TypeScript bridge has calibration & analysis functions');
  } else {
    errors.push('❌ TypeScript bridge missing required functions');
  }
  
  if (bridgeContent.includes('isNativeAvailable')) {
    checks.push('✅ Native availability check implemented');
  } else {
    errors.push('❌ Missing native availability check');
  }
} else {
  errors.push('❌ lib/pythonBridge.ts not found');
}

// 6. Check calibration screen
console.log('6️⃣ Checking calibration screen...');
if (fs.existsSync('app/spectral-calibration.tsx')) {
  const calibContent = fs.readFileSync('app/spectral-calibration.tsx', 'utf8');
  if (calibContent.includes('processCalibrationImage')) {
    checks.push('✅ Calibration screen uses Chaquopy bridge');
  } else {
    warnings.push('⚠️ Calibration screen may not use Chaquopy bridge');
  }
} else {
  errors.push('❌ app/spectral-calibration.tsx not found');
}

// 7. Check widget
console.log('7️⃣ Checking spectral widget...');
if (fs.existsSync('components/ColorSpectrumWidget.tsx')) {
  const widgetContent = fs.readFileSync('components/ColorSpectrumWidget.tsx', 'utf8');
  if (widgetContent.includes('processAnalysisImage')) {
    checks.push('✅ Widget uses Chaquopy bridge');
  } else {
    errors.push('❌ Widget not using Chaquopy bridge (still using direct HTTP)');
  }
} else {
  errors.push('❌ components/ColorSpectrumWidget.tsx not found');
}

// 8. Check eas.json
console.log('8️⃣ Checking EAS build configuration...');
if (fs.existsSync('eas.json')) {
  const easContent = fs.readFileSync('eas.json', 'utf8');
  const easJson = JSON.parse(easContent);
  if (easJson.build?.development || easJson.build?.production) {
    checks.push('✅ EAS build profiles configured');
  } else {
    warnings.push('⚠️ EAS build profiles may need configuration');
  }
} else {
  warnings.push('⚠️ eas.json not found (needed for EAS builds)');
}

// 9. Check dependencies
console.log('9️⃣ Checking package dependencies...');
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'expo-dev-client',
    'expo-image-manipulator',
    'expo-file-system',
    'react-native'
  ];
  
  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
  );
  
  if (missingDeps.length === 0) {
    checks.push('✅ All required dependencies present');
  } else {
    errors.push(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
  }
} else {
  errors.push('❌ package.json not found');
}

// Print results
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION RESULTS\n');

if (checks.length > 0) {
  console.log('✅ PASSED CHECKS:');
  checks.forEach(check => console.log('  ' + check));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(warning => console.log('  ' + warning));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS (must fix before build):');
  errors.forEach(error => console.log('  ' + error));
  console.log('');
}

console.log('='.repeat(60));

if (errors.length === 0) {
  console.log('\n🎉 ✅ PROJECT IS READY FOR EXPO DEV BUILD!\n');
  console.log('Next steps:');
  console.log('1. Run: npx expo install --check');
  console.log('2. Run: npx expo prebuild --clean');
  console.log('3. Run: npx expo run:android');
  console.log('   OR');
  console.log('   Run: eas build --platform android --profile development\n');
  process.exit(0);
} else {
  console.log('\n⚠️  PROJECT HAS ISSUES - Please fix errors before building\n');
  process.exit(1);
}
