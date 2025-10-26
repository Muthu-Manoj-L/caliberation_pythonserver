const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

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
    
    // Apply Chaquopy plugin after React plugin
    if (!contents.includes('apply plugin: "com.chaquo.python"')) {
      // Find the line with React plugin
      const reactPluginRegex = /apply plugin:\s*["']com\.facebook\.react["']/;
      if (reactPluginRegex.test(contents)) {
        contents = contents.replace(
          reactPluginRegex,
          `apply plugin: "com.facebook.react"\napply plugin: "com.chaquo.python"`
        );
      }
    }
    
    // Add Chaquopy configuration in android block
    if (!contents.includes('chaquopy {')) {
      const chaquopyConfig = `
    chaquopy {
        defaultConfig {
            version "3.8"
            
            pip {
                install "opencv-python-headless==4.5.5.64"
                install "numpy==1.19.5"
                install "scipy==1.7.3"
                install "Pillow==9.5.0"
            }
            
            pyc {
                src false
            }
        }
        
        sourceSets {
            main {
                srcDirs = ["src/main/python", "../../python"]
            }
        }
    }
`;
      
      // Insert Chaquopy config inside android block, after defaultConfig
      const androidBlockRegex = /(android\s*{[\s\S]*?defaultConfig\s*{[\s\S]*?})/;
      if (androidBlockRegex.test(contents)) {
        contents = contents.replace(
          androidBlockRegex,
          `$1\n${chaquopyConfig}`
        );
      }
    }
    
    config.modResults.contents = contents;
    return config;
  });
  
  return config;
};

module.exports = withChaquopy;
