
const SERVER_URL = "http://localhost:3001";

export const getImageUploadUrl = async (cleanFileName) => {
  const response =  await fetch(`${SERVER_URL}/api/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: cleanFileName }),
      });
  if (response.ok) {
    const url = await response.json();
    return url;
  } else {
    const errDetails = await response.text();
    throw errDetails;
  }
};

export const uploadImageToSignedUrl = async (uploadURL, fileBlob) => {
  const response = await fetch(uploadURL, {
    method: "PUT",
    body: fileBlob,
  });
  return response;
};