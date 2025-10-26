package com.muthumanoj.spectralapp

import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.facebook.react.bridge.*
import org.json.JSONObject
import org.json.JSONArray
import java.io.File

class SpectralProcessorModule(reactContext: ReactApplicationContext) 
    : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        const val NAME = "SpectralProcessor"
    }
    
    override fun getName() = NAME
    
    /**
     * Initialize Python interpreter (only once)
     */
    private fun ensurePythonStarted() {
        if (!Python.isStarted()) {
            Python.start(AndroidPlatform(reactApplicationContext))
        }
    }
    
    /**
     * Process image using Python spectral_processor.py
     * 
     * @param imagePath Absolute path to the image file
     * @param options Processing options (optional):
     *   - forceAnalysis: Boolean - if true, always return analysis mode (for widget)
     * @param promise React Native promise for async result
     */
    @ReactMethod
    fun processImage(imagePath: String, options: ReadableMap?, promise: Promise) {
        try {
            // Initialize Python if needed
            ensurePythonStarted()
            
            // Validate input file exists
            val imageFile = File(imagePath)
            if (!imageFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "Image file not found: $imagePath")
                return
            }
            
            // Extract options
            val forceAnalysis = options?.getBoolean("forceAnalysis") ?: false
            
            // Get Python instance
            val py = Python.getInstance()
            
            // Import the spectral_processor module
            val module = py.getModule("spectral_processor")
            
            // Create SpectralProcessor instance
            val processorClass = module["SpectralProcessor"]
            val processor = processorClass?.call(imagePath)
            
            if (processor == null) {
                promise.reject("PYTHON_ERROR", "Failed to create SpectralProcessor instance")
                return
            }
            
            // Call the process() method with force_analysis parameter
            // Python signature: process(force_analysis: bool = False)
            val result = processor.callAttr("process", forceAnalysis)
            
            if (result == null) {
                promise.reject("PROCESSING_ERROR", "Processing returned null")
                return
            }
            
            // Convert Python dict to JSON string using json module
            val jsonModule = py.getModule("json")
            val jsonString = jsonModule.callAttr("dumps", result).toString()
            
            // Convert JSON string to React Native map
            val resultMap = convertPythonResultToMap(jsonString)
            
            // Resolve promise with results
            promise.resolve(resultMap)
            
        } catch (e: Exception) {
            promise.reject("PROCESSING_ERROR", "Error processing image: ${e.message}", e)
        }
    }
    
    /**
     * Get available Python modules (for debugging)
     */
    @ReactMethod
    fun getPythonInfo(promise: Promise) {
        try {
            ensurePythonStarted()
            
            val py = Python.getInstance()
            val sysModule = py.getModule("sys")
            val version = sysModule["version"]?.toString() ?: "Unknown"
            
            val info = Arguments.createMap()
            info.putString("pythonVersion", version)
            info.putBoolean("isStarted", Python.isStarted())
            
            // Check if our module is available
            try {
                py.getModule("spectral_processor")
                info.putBoolean("spectralProcessorAvailable", true)
            } catch (e: Exception) {
                info.putBoolean("spectralProcessorAvailable", false)
                info.putString("moduleError", e.message)
            }
            
            promise.resolve(info)
            
        } catch (e: Exception) {
            promise.reject("PYTHON_INFO_ERROR", e.message, e)
        }
    }
    
    /**
     * Check if a Python package is installed
     */
    @ReactMethod
    fun checkPackage(packageName: String, promise: Promise) {
        try {
            ensurePythonStarted()
            
            val py = Python.getInstance()
            val importlibModule = py.getModule("importlib")
            
            try {
                importlibModule.callAttr("import_module", packageName)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
            
        } catch (e: Exception) {
            promise.reject("CHECK_PACKAGE_ERROR", e.message, e)
        }
    }
    
    /**
     * Convert Python result string (JSON) to React Native WritableMap
     */
    private fun convertPythonResultToMap(jsonString: String): WritableMap {
        val json = JSONObject(jsonString)
        return convertJsonToMap(json)
    }
    
    /**
     * Recursively convert JSONObject to WritableMap
     */
    private fun convertJsonToMap(jsonObject: JSONObject): WritableMap {
        val map = Arguments.createMap()
        val iterator = jsonObject.keys()
        
        while (iterator.hasNext()) {
            val key = iterator.next()
            val value = jsonObject.get(key)
            
            when (value) {
                is JSONObject -> map.putMap(key, convertJsonToMap(value))
                is JSONArray -> map.putArray(key, convertJsonToArray(value))
                is String -> map.putString(key, value)
                is Int -> map.putInt(key, value)
                is Double -> map.putDouble(key, value)
                is Boolean -> map.putBoolean(key, value)
                JSONObject.NULL -> map.putNull(key)
                else -> map.putString(key, value.toString())
            }
        }
        
        return map
    }
    
    /**
     * Recursively convert JSONArray to WritableArray
     */
    private fun convertJsonToArray(jsonArray: JSONArray): WritableArray {
        val array = Arguments.createArray()
        
        for (i in 0 until jsonArray.length()) {
            val value = jsonArray.get(i)
            
            when (value) {
                is JSONObject -> array.pushMap(convertJsonToMap(value))
                is JSONArray -> array.pushArray(convertJsonToArray(value))
                is String -> array.pushString(value)
                is Int -> array.pushInt(value)
                is Double -> array.pushDouble(value)
                is Boolean -> array.pushBoolean(value)
                JSONObject.NULL -> array.pushNull()
                else -> array.pushString(value.toString())
            }
        }
        
        return array
    }
}
