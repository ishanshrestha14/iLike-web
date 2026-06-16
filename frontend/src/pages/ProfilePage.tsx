import { useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Edit2,
  Save,
  X,
  MapPin,
  Calendar,
  Heart,
  Settings,
  Camera,
  UserRound,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";

import MainLayout from "@/layouts/MainLayout";
import {
  getProfile,
  updateProfile,
  type ProfileData,
} from "@/services/profileService";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import { PhotoGallery } from "@/components/profile/PhotoGallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const INTENTION_OPTIONS = ["Long-term", "Short-term", "Friendship", "Casual"];

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setEditedProfile(response.data);
      } else {
        toast.error("Failed to load profile");
      }
    } catch {
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
    } catch {
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
    if (!isEditing) setProfile({ ...profile!, profilePictureUrl: url });
  };

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-4xl">
          <Skeleton className="mb-8 h-40 rounded-3xl" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  /* ── Empty / error ───────────────────────────────────────────────────── */
  if (!profile) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <div className="grid size-20 place-items-center rounded-full bg-accent">
            <UserRound className="size-10 text-brand" />
          </div>
          <h3 className="mt-5 font-display text-2xl font-bold">
            We couldn't load your profile
          </h3>
          <p className="mt-2 max-w-xs text-muted-foreground">
            Complete your profile to start matching, or try again.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={loadProfile}>
              <RefreshCw className="size-4" /> Try again
            </Button>
            <Button variant="brand" onClick={() => navigate("/setup-profile")}>
              Complete your profile
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const data = isEditing ? editedProfile! : profile;

  return (
    <MainLayout>
      <motion.div
        className="mx-auto max-w-4xl"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div
          layout
          variants={fadeInUp}
          className="mb-8 overflow-hidden rounded-3xl bg-gradient-brand p-6 text-white shadow-brand sm:p-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar
                  src={profile.profilePictureUrl}
                  name={profile.name}
                  size="lg"
                  className="[&>div]:size-20 [&>div]:ring-4 [&>div]:ring-white/30"
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
                <h1 className="font-display text-3xl font-bold">
                  {profile.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-4" />
                    {profile.age} years old
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-4" />
                    {profile.location}
                  </span>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-2"
                >
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="bg-white/20 text-white hover:bg-white/30 hover:text-white"
                  >
                    <X className="size-4" /> Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-white text-brand hover:bg-white/90"
                  >
                    <Save className="size-4" /> {isSaving ? "Saving…" : "Save"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="viewing"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    variant="ghost"
                    onClick={handleEdit}
                    className="bg-white/20 text-white hover:bg-white/30 hover:text-white"
                  >
                    <Edit2 className="size-4" /> Edit Profile
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            <motion.div layout variants={fadeInUp}>
              <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <Camera className="size-5 text-brand" />
                  <CardTitle>Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <PhotoGallery photos={data.photoUrls ?? []} alt={profile.name} />

                  {isEditing && (
                    <div className="mt-6 border-t border-border pt-6">
                      <h3 className="mb-4 font-display text-base font-medium">
                        Manage Photos
                      </h3>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {editedProfile?.photoUrls?.map((url, index) => (
                          <div
                            key={index}
                            className="group relative aspect-square overflow-hidden rounded-xl"
                          >
                            <img
                              src={url}
                              alt={`Profile photo ${index + 1}`}
                              className="size-full object-cover"
                            />
                            <button
                              onClick={() => {
                                if (!editedProfile?.photoUrls) return;
                                const next = [...editedProfile.photoUrls];
                                next.splice(index, 1);
                                handleChange("photoUrls", next);
                              }}
                              aria-label={`Remove photo ${index + 1}`}
                              className="absolute right-2 top-2 grid size-7 cursor-pointer place-items-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity hover:bg-destructive/90 group-hover:opacity-100"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                        {(editedProfile?.photoUrls?.length ?? 0) < 6 && (
                          <button
                            onClick={() =>
                              toast.info("Photo upload feature coming soon!")
                            }
                            aria-label="Add photo"
                            className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-brand hover:bg-accent hover:text-brand"
                          >
                            <Camera className="size-8" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div layout variants={fadeInUp}>
              <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <UserRound className="size-5 text-brand" />
                  <CardTitle>About Me</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedProfile?.bio || ""}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      rows={4}
                      placeholder="Tell others about yourself…"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                      {profile.bio || (
                        <span className="text-muted-foreground">
                          No bio yet.
                        </span>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <motion.div layout variants={fadeInUp}>
              <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <Settings className="size-5 text-brand" />
                  <CardTitle>Basic Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="Name">
                    {isEditing ? (
                      <Input
                        value={editedProfile?.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                      />
                    ) : (
                      <ViewValue>{profile.name}</ViewValue>
                    )}
                  </InfoRow>

                  <InfoRow label="Age">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedProfile?.age || ""}
                        onChange={(e) =>
                          handleChange("age", parseInt(e.target.value) || 0)
                        }
                      />
                    ) : (
                      <ViewValue>{profile.age} years old</ViewValue>
                    )}
                  </InfoRow>

                  <InfoRow label="Gender">
                    {isEditing ? (
                      <select
                        value={editedProfile?.gender || ""}
                        onChange={(e) => handleChange("gender", e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <ViewValue>{profile.gender}</ViewValue>
                    )}
                  </InfoRow>

                  <InfoRow label="Height">
                    {isEditing ? (
                      <Input
                        value={editedProfile?.height || ""}
                        onChange={(e) => handleChange("height", e.target.value)}
                        placeholder="e.g., 5'10&quot;"
                      />
                    ) : (
                      <ViewValue>
                        {profile.height || "Not specified"}
                      </ViewValue>
                    )}
                  </InfoRow>

                  <InfoRow label="Location">
                    {isEditing ? (
                      <Input
                        value={editedProfile?.location || ""}
                        onChange={(e) =>
                          handleChange("location", e.target.value)
                        }
                      />
                    ) : (
                      <ViewValue>{profile.location}</ViewValue>
                    )}
                  </InfoRow>

                  <InfoRow label="Looking for">
                    {isEditing ? (
                      <div className="space-y-2">
                        {INTENTION_OPTIONS.map((intention) => {
                          const checked =
                            editedProfile?.intentions?.includes(intention) ||
                            false;
                          return (
                            <label
                              key={intention}
                              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const current =
                                    editedProfile?.intentions || [];
                                  handleChange(
                                    "intentions",
                                    e.target.checked
                                      ? [...current, intention]
                                      : current.filter((i) => i !== intention)
                                  );
                                }}
                                className="size-4 rounded border-input text-brand accent-[hsl(var(--brand))] focus-visible:ring-2 focus-visible:ring-ring"
                              />
                              {intention}
                            </label>
                          );
                        })}
                      </div>
                    ) : profile.intentions?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.intentions.map((intention) => (
                          <Badge key={intention} variant="secondary">
                            {intention}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <ViewValue muted>Not specified</ViewValue>
                    )}
                  </InfoRow>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div layout variants={fadeInUp}>
              <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <Heart className="size-5 text-brand" />
                  <CardTitle>Interests</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.interests?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest) => (
                        <Badge key={interest} variant="brand">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <ViewValue muted>No interests added yet.</ViewValue>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </MainLayout>
  );
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ViewValue({
  children,
  muted,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <p className={muted ? "text-muted-foreground" : "font-medium text-foreground"}>
      {children}
    </p>
  );
}

export default ProfilePage;
