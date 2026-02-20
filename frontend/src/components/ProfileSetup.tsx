import { useState, useRef } from "react";
import {
  Camera,
  ArrowLeft,
  Loader2,
  Check,
  MapPin,
  // Ruler,
  // Heart,
} from "lucide-react";
import { setupProfile, base64ToFile } from "@/services/profileService";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import type { User } from "@/context/auth.types";

interface ProfileData {
  name: string;
  gender: string;
  location: string;
  intentions: string[];
  age: number;
  bio: string;
  interests: string[];
  height: string;
  photoUrls: string[];
}

const ProfileSetup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    gender: "",
    location: "",
    intentions: [],
    age: 18,
    bio: "",
    interests: [],
    height: "",
    photoUrls: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const genderOptions = ["Male", "Female", "Non-binary", "Other"];
  const heightOptions = Array.from({ length: 61 }, (_, i) => {
    const feet = Math.floor((i + 48) / 12);
    const inches = (i + 48) % 12;
    return `${feet}'${inches}"`;
  });
  const intentionOptions = [
    "Long-term relationship",
    "Short-term relationship",
    "Friendship",
    "Casual dating",
    "Marriage minded",
  ];
  const interestOptions = [
    "Music",
    "Movies",
    "Sports",
    "Travel",
    "Food",
    "Art",
    "Gaming",
    "Reading",
    "Fitness",
    "Technology",
    "Nature",
    "Photography",
    "Dancing",
    "Cooking",
    "Fashion",
    "Science",
    "Pets",
    "Outdoors",
    "Yoga",
    "Writing",
    "Languages",
  ];

  const { user: currentUser, setUser } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Convert base64 images to Files
      const photos: File[] = await Promise.all(
        profileData.photoUrls.map((base64String, index) =>
          base64ToFile(base64String, `photo-${index}.jpg`)
        )
      );

      const setupData = {
        ...profileData,
        photos,
      };

      const result = await setupProfile(setupData);

      if (result.success) {
        if (!currentUser) {
          throw new Error("No current user found");
        }

        const updatedUser = {
          ...currentUser,
          hasCompletedProfile: true,
          profile: {
            ...currentUser.profile,
            ...result.data,
          },
        } as User;

        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        toast.success("Profile setup completed successfully!");

        setTimeout(() => {
          navigate("/home");
        }, 1000);
      } else {
        toast.error(result.message || "Failed to setup profile");
      }
    } catch (error) {
      console.error("Profile setup error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred during profile setup"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newPhotos.push(dataUrl);
      } catch (error) {
        console.error("Error reading file:", error);
        toast.error("Error uploading image");
      }
    }

    setProfileData((prev) => {
      const combined = [...prev.photoUrls, ...newPhotos];
      if (combined.length > 6) {
        toast.warning(`Only 6 photos allowed — ${combined.length - 6} photo(s) were not added`);
      }
      return { ...prev, photoUrls: combined.slice(0, 6) };
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: // Name & Age
        return profileData.name.length >= 2 && profileData.age >= 18;
      case 2: // Gender
        return profileData.gender !== "";
      case 3: // Location
        return profileData.location.length >= 2;
      case 4: // Height
        return profileData.height !== "";
      case 5: // Intentions
        return profileData.intentions.length > 0;
      case 6: // Interests
        return profileData.interests.length >= 3;
      case 7: // Bio
        return profileData.bio.length >= 20;
      case 8: // Photos
        return profileData.photoUrls.length > 0;
      case 9: // Review
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: // Name & Age
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What's your name and age?
              </h2>
              <p className="text-gray-600">
                This is how you'll appear on iLike
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your name"
                value={profileData.name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full p-3 rounded-lg border border-gray-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
              <input
                type="number"
                min="18"
                max="100"
                value={profileData.age}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    age: parseInt(e.target.value) || 18,
                  }))
                }
                className="w-full p-3 rounded-lg border border-gray-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>
        );

      case 2: // Gender
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What's your gender?
              </h2>
              <p className="text-gray-600">
                This helps us show you relevant matches
              </p>
            </div>
            <div className="space-y-3">
              {genderOptions.map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() =>
                    setProfileData((prev) => ({ ...prev, gender }))
                  }
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    profileData.gender === gender
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>
        );

      case 3: // Location
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Where are you located?
              </h2>
              <p className="text-gray-600">Help us find matches in your area</p>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Enter your city"
                value={profileData.location}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                className="w-full pl-10 p-3 rounded-lg border border-gray-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>
        );

      case 4: // Height
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What's your height?
              </h2>
              <p className="text-gray-600">
                This helps create a more complete profile
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {heightOptions.map((height) => (
                <button
                  key={height}
                  type="button"
                  onClick={() =>
                    setProfileData((prev) => ({ ...prev, height }))
                  }
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    profileData.height === height
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {height}
                </button>
              ))}
            </div>
          </div>
        );

      case 5: // Intentions
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What are you looking for?
              </h2>
              <p className="text-gray-600">Select all that apply</p>
            </div>
            <div className="space-y-3">
              {intentionOptions.map((intention) => (
                <button
                  key={intention}
                  type="button"
                  onClick={() =>
                    setProfileData((prev) => ({
                      ...prev,
                      intentions: prev.intentions.includes(intention)
                        ? prev.intentions.filter((i) => i !== intention)
                        : [...prev.intentions, intention],
                    }))
                  }
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    profileData.intentions.includes(intention)
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {intention}
                </button>
              ))}
            </div>
          </div>
        );

      case 6: // Interests
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What are your interests?
              </h2>
              <p className="text-gray-600">
                Choose at least 3 to help find compatible matches
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() =>
                    setProfileData((prev) => ({
                      ...prev,
                      interests: prev.interests.includes(interest)
                        ? prev.interests.filter((i) => i !== interest)
                        : [...prev.interests, interest],
                    }))
                  }
                  className={`p-3 rounded-xl border-2 transition-all ${
                    profileData.interests.includes(interest)
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        );

      case 7: // Bio
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Write your bio
              </h2>
              <p className="text-gray-600">
                Tell potential matches about yourself
              </p>
            </div>
            <div className="space-y-2">
              <textarea
                value={profileData.bio}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Share something interesting about yourself..."
                className="w-full h-40 p-3 rounded-lg border border-gray-300 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
              <p className="text-sm text-gray-500 text-right">
                {profileData.bio.length}/500 characters
              </p>
            </div>
          </div>
        );

      case 8: // Photos
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Add your photos
              </h2>
              <p className="text-gray-600">
                Add photos to showcase your personality
              </p>
            </div>

            {/* Photos Grid */}
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="aspect-square relative rounded-lg border-2 border-dashed border-gray-300 hover:border-pink-500 transition-all"
                >
                  {profileData.photoUrls[index] ? (
                    <div className="relative w-full h-full">
                      <img
                        src={profileData.photoUrls[index]}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() =>
                          setProfileData((prev) => ({
                            ...prev,
                            photoUrls: prev.photoUrls.filter(
                              (_, i) => i !== index
                            ),
                          }))
                        }
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <Camera className="w-8 h-8 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>
        );

      case 9: // Review
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Review your profile
              </h2>
              <p className="text-gray-600">Make sure everything looks good</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Name</p>
                  <p>{profileData.name}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Age</p>
                  <p>{profileData.age}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Gender</p>
                  <p>{profileData.gender}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Location</p>
                  <p>{profileData.location}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Height</p>
                  <p>{profileData.height}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">Looking for</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.intentions.map((intention) => (
                    <span
                      key={intention}
                      className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
                    >
                      {intention}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">Interests</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profileData.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">Bio</p>
                <p className="mt-2">{profileData.bio}</p>
              </div>
              {/* Photos */}
              {profileData.photoUrls.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Photos</p>
                  <div className="grid grid-cols-3 gap-4">
                    {profileData.photoUrls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-pink-500 rounded-full transition-all"
              style={{ width: `${(currentStep / 9) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-center text-sm text-gray-500">
            Step {currentStep} of 9
          </div>
        </div>

        {/* Content */}
        {renderStep()}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
          )}
          <div className="flex-1" />
          {currentStep < 9 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`px-6 py-2 rounded-full font-medium ${
                canProceed()
                  ? "bg-pink-500 text-white hover:bg-pink-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-full bg-pink-500 text-white font-medium hover:bg-pink-600 disabled:bg-pink-300 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Complete
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
