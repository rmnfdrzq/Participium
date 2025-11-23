import axiosInstance from "./axiosInstance.js";

// Get image upload URL
export const getImageUploadUrl = async (cleanFileName) => {
  return await axiosInstance.post("/api/upload-url", {
    filename: cleanFileName
  });
};

// Upload image to signed URL
// uploadURL: Upload URL (obtained from getImageUploadUrl)
// fileBlob: Image file blob
export const uploadImageToSignedUrl = async (uploadURL, fileBlob) => {
  // Use direct fetch for S3 upload, as this is not our API endpoint
  const response = await fetch(uploadURL, {
    method: "PUT",
    body: fileBlob,
  });
  
  if (!response.ok) {
    throw new Error("Failed to upload image");
  }
  
  return response;
};

