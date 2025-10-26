/*
  # DeepSpectrum Analytics Database Schema

  ## Overview
  Creates the complete database structure for the AI-enabled multispectral tricorder app including
  user profiles, devices, measurements, spectral data, AI models, and sync operations.

  ## New Tables

  ### `profiles`
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `company_name` (text) - Company affiliation
  - `biometric_enabled` (boolean) - Whether biometric auth is enabled
  - `theme_preference` (text) - User's theme preference (light/dark/auto)
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `devices`
  - `id` (uuid, primary key) - Device unique identifier
  - `user_id` (uuid, foreign key) - Owner of the device
  - `device_name` (text) - Device display name
  - `device_type` (text) - Type of spectrometer
  - `serial_number` (text) - Hardware serial number
  - `firmware_version` (text) - Current firmware version
  - `wifi_ssid` (text) - WiFi AP SSID
  - `wifi_password` (text) - WiFi AP password (encrypted)
  - `last_connected` (timestamptz) - Last connection time
  - `battery_level` (int) - Battery percentage
  - `signal_strength` (int) - WiFi signal strength
  - `status` (text) - Device status (online/offline/error)
  - `created_at` (timestamptz) - Registration timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `measurements`
  - `id` (uuid, primary key) - Measurement unique identifier
  - `device_id` (uuid, foreign key) - Device that performed measurement
  - `user_id` (uuid, foreign key) - User who initiated measurement
  - `measurement_type` (text) - Type of measurement
  - `parameters` (jsonb) - Selected measurement parameters
  - `status` (text) - Measurement status (pending/processing/completed/failed)
  - `created_at` (timestamptz) - Measurement start time
  - `completed_at` (timestamptz) - Measurement completion time

  ### `spectral_data`
  - `id` (uuid, primary key) - Spectral data record identifier
  - `measurement_id` (uuid, foreign key) - Related measurement
  - `wavelength_data` (jsonb) - Raw wavelength readings
  - `intensity_data` (jsonb) - Intensity values
  - `calibration_applied` (boolean) - Whether calibration was applied
  - `data_quality_score` (numeric) - Quality metric (0-100)
  - `created_at` (timestamptz) - Data capture timestamp

  ### `ai_models`
  - `id` (uuid, primary key) - Model identifier
  - `model_name` (text) - Model name
  - `version` (text) - Model version
  - `model_type` (text) - Type of analysis (color/quality/contamination)
  - `model_url` (text) - Cloud storage URL for model
  - `model_size` (bigint) - Model file size in bytes
  - `accuracy_metric` (numeric) - Model accuracy score
  - `is_active` (boolean) - Whether model is currently active
  - `created_at` (timestamptz) - Model creation timestamp
  - `updated_at` (timestamptz) - Model update timestamp

  ### `analysis_results`
  - `id` (uuid, primary key) - Analysis result identifier
  - `measurement_id` (uuid, foreign key) - Related measurement
  - `ai_model_id` (uuid, foreign key) - AI model used
  - `color_analysis` (jsonb) - Color detection results
  - `state_analysis` (jsonb) - Material state analysis
  - `quality_score` (numeric) - Quality rating (0-100)
  - `contamination_level` (numeric) - Contamination percentage
  - `composition` (jsonb) - Material composition breakdown
  - `confidence_score` (numeric) - AI confidence (0-100)
  - `created_at` (timestamptz) - Analysis timestamp

  ### `sync_operations`
  - `id` (uuid, primary key) - Sync operation identifier
  - `user_id` (uuid, foreign key) - User who initiated sync
  - `device_id` (uuid, foreign key) - Device being synced
  - `sync_type` (text) - Type of sync (data/model/full)
  - `status` (text) - Sync status (pending/in_progress/completed/failed)
  - `items_synced` (int) - Number of items synced
  - `total_items` (int) - Total items to sync
  - `error_message` (text) - Error details if failed
  - `started_at` (timestamptz) - Sync start time
  - `completed_at` (timestamptz) - Sync completion time

  ### `calibration_data`
  - `id` (uuid, primary key) - Calibration record identifier
  - `device_id` (uuid, foreign key) - Device being calibrated
  - `calibration_type` (text) - Type of calibration
  - `reference_values` (jsonb) - Reference calibration values
  - `correction_factors` (jsonb) - Correction coefficients
  - `is_active` (boolean) - Whether calibration is currently active
  - `performed_by` (uuid, foreign key) - User who performed calibration
  - `created_at` (timestamptz) - Calibration timestamp
  - `expires_at` (timestamptz) - Calibration expiration

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Users can only access their own data
  - Device owners can access device-related data
  - Secure policies for all operations

  ## Indexes
  - Add indexes on foreign keys for performance
  - Add indexes on frequently queried timestamp fields
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  company_name text DEFAULT 'DeepSpectrum Analytics Private Limited',
  biometric_enabled boolean DEFAULT false,
  theme_preference text DEFAULT 'dark',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  device_name text NOT NULL,
  device_type text DEFAULT 'ESP32-Spectrometer',
  serial_number text UNIQUE NOT NULL,
  firmware_version text,
  wifi_ssid text,
  wifi_password text,
  last_connected timestamptz,
  battery_level int DEFAULT 100,
  signal_strength int DEFAULT 0,
  status text DEFAULT 'offline',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ai_models table (must be created before analysis_results)
CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  version text NOT NULL,
  model_type text NOT NULL,
  model_url text,
  model_size bigint DEFAULT 0,
  accuracy_metric numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create measurements table
CREATE TABLE IF NOT EXISTS measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  measurement_type text NOT NULL,
  parameters jsonb DEFAULT '{}',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create spectral_data table
CREATE TABLE IF NOT EXISTS spectral_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid REFERENCES measurements(id) ON DELETE CASCADE NOT NULL,
  wavelength_data jsonb NOT NULL,
  intensity_data jsonb NOT NULL,
  calibration_applied boolean DEFAULT false,
  data_quality_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid REFERENCES measurements(id) ON DELETE CASCADE NOT NULL,
  ai_model_id uuid REFERENCES ai_models(id),
  color_analysis jsonb,
  state_analysis jsonb,
  quality_score numeric DEFAULT 0,
  contamination_level numeric DEFAULT 0,
  composition jsonb,
  confidence_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create sync_operations table
CREATE TABLE IF NOT EXISTS sync_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE,
  sync_type text NOT NULL,
  status text DEFAULT 'pending',
  items_synced int DEFAULT 0,
  total_items int DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create calibration_data table
CREATE TABLE IF NOT EXISTS calibration_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  calibration_type text NOT NULL,
  reference_values jsonb NOT NULL,
  correction_factors jsonb NOT NULL,
  is_active boolean DEFAULT true,
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectral_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for devices
CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
  ON devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for measurements
CREATE POLICY "Users can view own measurements"
  ON measurements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own measurements"
  ON measurements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own measurements"
  ON measurements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for spectral_data
CREATE POLICY "Users can view spectral data from own measurements"
  ON spectral_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM measurements
      WHERE measurements.id = spectral_data.measurement_id
      AND measurements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert spectral data for own measurements"
  ON spectral_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM measurements
      WHERE measurements.id = measurement_id
      AND measurements.user_id = auth.uid()
    )
  );

-- RLS Policies for analysis_results
CREATE POLICY "Users can view analysis from own measurements"
  ON analysis_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM measurements
      WHERE measurements.id = analysis_results.measurement_id
      AND measurements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert analysis for own measurements"
  ON analysis_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM measurements
      WHERE measurements.id = measurement_id
      AND measurements.user_id = auth.uid()
    )
  );

-- RLS Policies for ai_models (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view AI models"
  ON ai_models FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for sync_operations
CREATE POLICY "Users can view own sync operations"
  ON sync_operations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync operations"
  ON sync_operations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync operations"
  ON sync_operations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for calibration_data
CREATE POLICY "Users can view calibration for own devices"
  ON calibration_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = calibration_data.device_id
      AND devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calibration for own devices"
  ON calibration_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = device_id
      AND devices.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_measurements_user_id ON measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_device_id ON measurements(device_id);
CREATE INDEX IF NOT EXISTS idx_measurements_created_at ON measurements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spectral_data_measurement_id ON spectral_data(measurement_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_measurement_id ON analysis_results(measurement_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_user_id ON sync_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_device_id ON sync_operations(device_id);
CREATE INDEX IF NOT EXISTS idx_calibration_data_device_id ON calibration_data(device_id);

-- Insert default AI models
INSERT INTO ai_models (model_name, version, model_type, accuracy_metric, is_active)
VALUES 
  ('Color Detection Model', 'v1.0', 'color', 95.5, true),
  ('Quality Assessment Model', 'v1.0', 'quality', 92.3, true),
  ('Contamination Detection Model', 'v1.0', 'contamination', 94.7, true),
  ('Material Composition Model', 'v1.0', 'composition', 89.2, true)
ON CONFLICT DO NOTHING;