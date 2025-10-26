import { Camera } from 'expo-camera';
import { Paths, Directory, File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface StoredImage {
  id: string;
  uri: string;
  fileName: string;
  timestamp: number;
  size: number;
}

let cameraDirectory: Directory | null = null;

/**
 * Get or initialize camera storage directory
 */
const getCameraDirectory = (): Directory => {
  if (!cameraDirectory) {
    cameraDirectory = new Directory(Paths.document, 'camera_images');
  }
  return cameraDirectory;
};

/**
 * Initialize camera storage directory
 */
export const initializeCameraStorage = async (): Promise<void> => {
  try {
    const dir = getCameraDirectory();
    // Try to create the directory if it doesn't exist
    if (!dir.exists) {
      await dir.create();
      console.log('Camera storage directory created');
    }
  } catch (error) {
    // Directory might already exist, which is fine
    console.log('Camera storage directory initialized');
  }
};

/**
 * Request camera permissions
 */
export const requestCameraPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
    return false;
  }
};

/**
 * Save captured image to local storage and phone gallery
 */
export const saveCapturedImage = async (imageUri: string): Promise<StoredImage | null> => {
  try {
    await initializeCameraStorage();

    const timestamp = Date.now();
    const fileName = `IMG_${timestamp}.jpg`;
    const dir = getCameraDirectory();
    const destinationFile = new File(dir, fileName);

    // Copy the image from cache to app documents
    const sourceFile = new File(imageUri);
    await sourceFile.copy(destinationFile);

    // Save to phone's gallery (MediaLibrary)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        // Save to gallery
        await MediaLibrary.saveToLibraryAsync(imageUri);
        console.log('Image saved to phone gallery');
      } else {
        console.warn('Media library permission not granted, image saved to app storage only');
      }
    } catch (galleryError) {
      console.error('Error saving to gallery:', galleryError);
      // Continue even if gallery save fails - image is still in app storage
    }

    const storedImage: StoredImage = {
      id: timestamp.toString(),
      uri: destinationFile.uri,
      fileName,
      timestamp,
      size: 0, // Size calculation would need to be done separately if needed
    };

    console.log('Image saved successfully:', storedImage);
    return storedImage;
  } catch (error) {
    console.error('Error saving captured image:', error);
    return null;
  }
};

/**
 * Get all stored images
 */
export const getStoredImages = async (): Promise<StoredImage[]> => {
  try {
    await initializeCameraStorage();

    const dir = getCameraDirectory();
    const contents = dir.list();
    const images: StoredImage[] = [];

    for (const item of contents) {
      if (item instanceof File) {
        const fileName = item.name;
        if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
          // Extract timestamp from filename (IMG_timestamp.jpg)
          const timestampStr = fileName.replace('IMG_', '').replace(/\.[^/.]+$/, '');
          const timestamp = parseInt(timestampStr, 10);

          images.push({
            id: timestamp.toString(),
            uri: item.uri,
            fileName,
            timestamp,
            size: 0,
          });
        }
      }
    }

    // Sort by timestamp descending (newest first)
    images.sort((a, b) => b.timestamp - a.timestamp);
    return images;
  } catch (error) {
    console.error('Error getting stored images:', error);
    return [];
  }
};

/**
 * Delete a stored image
 */
export const deleteStoredImage = async (imageId: string): Promise<boolean> => {
  try {
    const images = await getStoredImages();
    const imageToDelete = images.find(img => img.id === imageId);

    if (imageToDelete) {
      const file = new File(imageToDelete.uri);
      await file.delete();
      console.log('Image deleted successfully:', imageToDelete.fileName);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};
