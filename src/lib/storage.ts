import { FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to a specified path in Firebase Storage.
 *
 * @param storage The Firebase Storage instance.
 * @param path The full path in storage where the file should be saved (e.g., 'raports/nis/filename.pdf').
 * @param file The file object to upload.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadFile = async (storage: FirebaseStorage, path: string, file: File): Promise<string> => {
  const storageRef = ref(storage, path);
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("File upload error:", error);
    // Depending on requirements, you might want to throw a more specific error
    // or handle it differently.
    throw new Error('Gagal mengunggah file.');
  }
};
