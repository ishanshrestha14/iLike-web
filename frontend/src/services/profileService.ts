import type { AxiosResponse } from "axios";
import api from "@/services/api";

export interface ProfileData {
  name: string;
  gender: string;
  location: string;
  intentions: string[];
  age: number;
  bio: string;
  interests: string[];
  height: string;
  photoUrls: string[];
  profilePictureUrl: string | null;
  preferences?: {
    minAge?: number;
    maxAge?: number;
    genders?: string[];
    maxDistance?: number;
  };
  id?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface SetupProfileData {
  name: string;
  gender: string;
  location: string;
  intentions: string[];
  age: number;
  bio: string;
  interests: string[];
  height: string;
  photos?: File[];
}

export const setupProfile = async (profileData: SetupProfileData) => {
  const formData = new FormData();

  // Add basic fields
  formData.append("name", profileData.name);
  formData.append("gender", profileData.gender);
  formData.append("location", profileData.location);
  formData.append("intentions", JSON.stringify(profileData.intentions));
  formData.append("age", profileData.age.toString());
  formData.append("bio", profileData.bio);
  formData.append("interests", JSON.stringify(profileData.interests));
  formData.append("height", profileData.height);

  // Add photos if they exist
  if (profileData.photos && profileData.photos.length > 0) {
    profileData.photos.forEach((photo) => {
      formData.append("photos", photo);
    });
  }

  const response = await api.post("/profile/setup", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getProfile = async (): Promise<ApiResponse<ProfileData>> => {
  try {
    const response: AxiosResponse<ApiResponse<ProfileData>> = await api.get(
      "/profile/me"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch profile",
    };
  }
};

export const updateProfile = async (
  profileData: Partial<ProfileData> & { photos?: File[] }
) => {
  const formData = new FormData();

  // Append all non-null/undefined fields to formData
  Object.entries(profileData).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (key === "interests" || key === "intentions" || key === "photoUrls") {
        formData.append(key, JSON.stringify(value));
      } else if (key === "photos" && Array.isArray(value)) {
        (value as File[]).forEach((photo) => {
          formData.append("photos", photo);
        });
      } else {
        formData.append(key, value.toString());
      }
    }
  });

  const response = await api.put("/profile/update", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

// Function to convert base64 strings to Files
export const base64ToFile = async (
  base64String: string,
  filename: string
): Promise<File> => {
  const response = await fetch(base64String);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
};

export const uploadProfilePicture = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await api.put<{
    success: boolean;
    data: { profilePictureUrl: string };
  }>("/profile/picture", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!response.data.success) {
    throw new Error("Failed to update profile picture");
  }

  return response.data.data.profilePictureUrl;
};
