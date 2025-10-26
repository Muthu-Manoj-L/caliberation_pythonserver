const { withAppBuildGradle, withProjectBuildGradle, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to add Chaquopy (Python for Android) support
 */
const withChaquopy = (config) => {
  // Add Chaquopy to project-level build.gradle
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    
    // Add maven repository for Chaquopy
    if (!contents.includes('chaquo.com/maven')) {
      contents = contents.replace(
        /repositories\s*{/,
        `repositories {
        maven { url "https://chaquo.com/maven" }`
      );
    }
    
    // Add Chaquopy gradle plugin dependency
    if (!contents.includes('com.chaquo.python:gradle')) {
      contents = contents.replace(
        /dependencies\s*{/,
        `dependencies {
        classpath 'com.chaquo.python:gradle:15.0.1'`
      );
    }
    
    config.modResults.contents = contents;
    return config;
  });

  // Add Chaquopy to app-level build.gradle
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    
    // Apply Chaquopy plugin at the top after other plugins
    if (!contents.includes('apply plugin: "com.chaquo.python"')) {
      // Add after the apply plugin lines
      const pluginRegex = /(apply plugin: ["']com\.android\.application["'])/;
      if (pluginRegex.test(contents)) {
        contents = contents.replace(
          pluginRegex,
          `$1\napply plugin: "com.chaquo.python"`
        );
      }
    }
    
    // Add Chaquopy configuration in android block
    if (!contents.includes('chaquopy {')) {
      const chaquopyConfig = `\n    chaquopy {\n        defaultConfig {\n            version "3.8"\n            pip {\n                install "numpy==1.19.5"\n                install "opencv-python-headless==4.5.3.56"\n                install "Pillow==8.4.0"\n                install "scipy==1.5.4"\n            }\n            pyc {\n                src false\n            }\n        }\n        sourceSets {\n            main {\n                srcDirs = ["src/main/python", "../../python"]\n            }\n        }\n    }`;
      
      // Insert before the last closing brace of android block
      const androidBlockEnd = contents.lastIndexOf('}');
      if (androidBlockEnd > 0) {
        contents = contents.substring(0, androidBlockEnd) + chaquopyConfig + '\n' + contents.substring(androidBlockEnd);
      }
    }
    
    config.modResults.contents = contents;
    return config;
  });
  
  return config;
};

module.exports = withChaquopy;
