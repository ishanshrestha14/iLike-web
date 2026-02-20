import { useState, useEffect } from "react";
import MainLayout from "@/layouts/MainLayout";
import {
  getProfile,
  updateProfile,
  type ProfileData,
} from "@/services/profileService";
import {
  Camera,
  Edit2,
  Save,
  X,
  MapPin,
  Calendar,
  User,
  Heart,
  Settings,
} from "lucide-react";
import { toast } from "react-toastify";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import { HoverExpand } from "@/components/ui/hover-expand";

const ProfilePage = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setEditedProfile(response.data);
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error: unknown) {
      console.error("Profile loading error:", error);
      toast.error("Error loading profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile(profile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile);
  };

  const handleSave = async () => {
    if (!editedProfile) return;

    setIsSaving(true);
    try {
      const response = await updateProfile(editedProfile);
      if (response.success) {
        setProfile(response.data);
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      } else {
        toast.error(response.message || "Failed to update profile");
      }
    } catch (error: unknown) {
      console.error("Profile update error:", error);
      toast.error("Error updating profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    field: keyof ProfileData,
    value: string | number | string[] | File[]
  ) => {
    if (!editedProfile) return;
    setEditedProfile({ ...editedProfile, [field]: value });
  };

  const handleProfilePictureUpdate = (url: string) => {
    if (!editedProfile) return;
    setEditedProfile({ ...editedProfile, profilePictureUrl: url });
    if (!isEditing) {
      setProfile({ ...profile!, profilePictureUrl: url });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Profile not found
          </h3>
          <p className="text-gray-600">Unable to load your profile</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-pink-500 to-red-500 rounded-3xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={
                    profile.profilePictureUrl ||
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
                  }
                  alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white/20"
                />
                {isEditing && (
                  <div className="absolute -bottom-1 -right-1">
                    <ProfilePictureUpload
                      currentPictureUrl={profile.profilePictureUrl || null}
                      onUploadSuccess={handleProfilePictureUpdate}
                    />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{profile.name}</h1>
                <div className="flex items-center gap-4 text-white/90">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {profile.age} years old
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit/Save/Cancel Buttons */}
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center px-4 py-2 bg-white text-pink-600 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Photos */}
          <div className="lg:col-span-2">
            {/* Photos Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <Camera className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-800">Photos</h2>
              </div>

              {/* Interactive Photo Showcase */}
              {profile.photoUrls && profile.photoUrls.length > 0 ? (
                <div className="mb-6">
                  <HoverExpand
                    images={profile.photoUrls}
                    initialSelectedIndex={0}
                    maxThumbnails={6}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No photos uploaded yet</p>
                </div>
              )}

              {/* Photo Management (Edit Mode) */}
              {isEditing && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Manage Photos
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {profile.photoUrls?.map((url, index) => (
                      <div
                        key={index}
                        className="aspect-square relative rounded-xl overflow-hidden group"
                      >
                        <img
                          src={url}
                          alt={`Profile photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            if (!editedProfile?.photoUrls) return;
                            const newPhotos = [...editedProfile.photoUrls];
                            newPhotos.splice(index, 1);
                            handleChange("photoUrls", newPhotos);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(!profile.photoUrls || profile.photoUrls.length < 6) && (
                      <button
                        className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-pink-500 hover:bg-pink-50 transition-colors"
                        onClick={() => {
                          toast.info("Photo upload feature coming soon!");
                        }}
                      >
                        <Camera className="w-8 h-8 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bio Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  About Me
                </h2>
              </div>

              {isEditing ? (
                <textarea
                  value={editedProfile?.bio || ""}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Tell others about yourself..."
                />
              ) : (
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Basic Info
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile?.name || ""}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profile.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Age
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedProfile?.age || ""}
                      onChange={(e) =>
                        handleChange("age", parseInt(e.target.value))
                      }
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">
                      {profile.age} years old
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Gender
                  </label>
                  {isEditing ? (
                    <select
                      value={editedProfile?.gender || ""}
                      onChange={(e) => handleChange("gender", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-800 font-medium">
                      {profile.gender}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Height
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile?.height || ""}
                      onChange={(e) => handleChange("height", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., 5'10"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">
                      {profile.height || "Not specified"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Location
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProfile?.location || ""}
                      onChange={(e) => handleChange("location", e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">
                      {profile.location}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Looking for
                  </label>
                  {isEditing ? (
                    <div className="space-y-2">
                      {["Long-term", "Short-term", "Friendship", "Casual"].map(
                        (intention) => (
                          <label key={intention} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={
                                editedProfile?.intentions?.includes(
                                  intention
                                ) || false
                              }
                              onChange={(e) => {
                                const currentIntentions =
                                  editedProfile?.intentions || [];
                                const newIntentions = e.target.checked
                                  ? [...currentIntentions, intention]
                                  : currentIntentions.filter(
                                      (i) => i !== intention
                                    );
                                handleChange("intentions", newIntentions);
                              }}
                              className="mr-2 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="text-sm text-gray-700">
                              {intention}
                            </span>
                          </label>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.intentions?.map((intention, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
                        >
                          {intention}
                        </span>
                      )) || (
                        <span className="text-gray-500">Not specified</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interests */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Heart className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Interests
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {profile.interests?.map((interest, index) => (
                  <span
                    key={index}
                    className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
