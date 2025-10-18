import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Star, MapPin, Award, Edit2, Save, X, Camera, Loader2, MessageSquare, User } from 'lucide-react';
import { toast } from 'sonner';
import { RatingDialog } from '@/components/RatingDialog';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import type { Database } from '@/integrations/supabase/types';

// Component to show "Leave Review" button on other people's profiles
const LeaveReviewSection = ({ 
  profileId, 
  currentUserId,
  profileName,
  onReviewSuccess 
}: { 
  profileId: string; 
  currentUserId: string;
  profileName: string;
  onReviewSuccess: () => void;
}) => {
  const [matchedConversations, setMatchedConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showServices, setShowServices] = useState(false);

  const fetchMatchedConversations = async () => {
    setLoading(true);
    try {
      // Get all conversations between current user and profile user where the offer is completed
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('*, offers!inner(*)')
        .not('offers.completed_at', 'is', null)
        .or(`and(creator_id.eq.${currentUserId},participant_id.eq.${profileId}),and(creator_id.eq.${profileId},participant_id.eq.${currentUserId})`);

      if (error) throw error;

      // Check which ones haven't been reviewed yet
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('offer_id')
        .eq('reviewer_id', currentUserId)
        .eq('reviewee_id', profileId);

      const reviewedOfferIds = new Set(existingReviews?.map(r => r.offer_id) || []);
      
      const unreviewed = (conversations || [])
        .filter(conv => !reviewedOfferIds.has(conv.offer_id))
        .map(conv => ({
          id: conv.offer_id,
          skill: conv.offers?.skill,
          conversationId: conv.id
        }));

      setMatchedConversations(unreviewed);
      setShowServices(true);
      
      if (unreviewed.length === 0) {
        toast.info("You need to complete a service with this user before leaving a review");
      }
    } catch (error) {
      console.error('Error fetching completed services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleClickReviewButton = () => {
    if (!showServices) {
      fetchMatchedConversations();
    }
  };

  const handleOpenReview = (service: any) => {
    setSelectedService(service);
    setRatingDialogOpen(true);
  };

  const handleReviewSuccess = () => {
    fetchMatchedConversations();
    onReviewSuccess();
    setRatingDialogOpen(false);
  };

  return (
    <>
      <Card className="mb-6 animate-fade-in shadow-lg border-yellow-500/30 bg-yellow-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <CardTitle className="text-xl">Leave a Review</CardTitle>
            </div>
            {!showServices && (
              <Button
                onClick={handleClickReviewButton}
                disabled={loading}
                className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4" />
                    Review {profileName}
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Have you worked with {profileName}? Share your experience!
          </p>
        </CardHeader>
        {showServices && matchedConversations.length > 0 && (
          <CardContent>
            <div className="space-y-3">
              {matchedConversations.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 bg-background rounded-lg border border-yellow-500/20 hover:border-yellow-500/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-lg">{service.skill}</p>
                    <p className="text-sm text-muted-foreground">
                      How was your experience?
                    </p>
                  </div>
                  <Button
                    onClick={() => handleOpenReview(service)}
                    size="sm"
                    className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <Star className="h-4 w-4" />
                    Leave Review
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {selectedService && (
        <RatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          offerId={selectedService.id}
          revieweeId={profileId}
          revieweeName={profileName}
          onSuccess={handleReviewSuccess}
        />
      )}
    </>
  );
};

type Profile = Database['public']['Tables']['profiles']['Row'];
type Review = Database['public']['Tables']['reviews']['Row'] & {
  reviewer: Profile;
  offers?: { skill: string };
};

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<Profile>>({});
  const [newInterest, setNewInterest] = useState('');
  const [servicesToReview, setServicesToReview] = useState<any[]>([]);
  const [selectedServiceForReview, setSelectedServiceForReview] = useState<any>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');

  const isOwnProfile = user?.id === id;

  // Wait for auth to load before redirecting
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchProfile();
      fetchReviews();
      if (isOwnProfile) {
        fetchServicesToReview();
      }
    }
  }, [id, user, isOwnProfile]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      // Fetch both barter-based and offer-based reviews (top 3 most recent)
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(*), offers(skill)')
        .eq('reviewee_id', id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setReviews(data as Review[]);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchServicesToReview = async () => {
    if (!user) return;
    
    try {
      // Get all conversations user participated in
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*, offers(*)')
        .or(`creator_id.eq.${user.id},participant_id.eq.${user.id}`);

      if (convError) throw convError;
      if (!conversations) return;

      // Filter to completed offers only (removed matching requirement)
      const completedOffers = conversations
        .filter(conv => conv.offers?.completed_at)
        .map(conv => ({
          ...conv.offers,
          other_user_id: conv.creator_id === user.id ? conv.participant_id : conv.creator_id,
        }));

      // Check which ones user hasn't reviewed yet
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('offer_id')
        .eq('reviewer_id', user.id);

      const reviewedOfferIds = new Set(existingReviews?.map(r => r.offer_id) || []);
      
      // Get the other user's profile for each service
      const needsReview = await Promise.all(
        completedOffers
          .filter(offer => !reviewedOfferIds.has(offer.id))
          .map(async (offer) => {
            const { data: otherUser } = await supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .eq('id', offer.other_user_id)
              .single();
            
            return {
              ...offer,
              other_user: otherUser,
            };
          })
      );

      setServicesToReview(needsReview.filter(s => s.other_user));
    } catch (error) {
      console.error('Error fetching services to review:', error);
    }
  };

  const handleOpenReviewDialog = (service: any) => {
    setSelectedServiceForReview(service);
    setRatingDialogOpen(true);
  };

  const handleReviewSuccess = () => {
    fetchServicesToReview();
    fetchReviews();
    if (selectedServiceForReview?.other_user_id) {
      // Refetch the profile to update the rating
      fetchProfile();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (10MB before crop)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a valid image file (JPG, PNG, or WebP)');
      return;
    }

    // Create preview URL and open crop dialog
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!user) return;
    
    setCropDialogOpen(false);
    setUploadingImage(true);

    try {
      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload cropped avatar
      const fileName = `${user.id}/avatar-${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile!, avatar_url: publicUrl });
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      setImageToCrop('');
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editedProfile.name,
          bio: editedProfile.bio,
          phone: editedProfile.phone,
          city: editedProfile.city,
          zip: editedProfile.zip,
          interests: editedProfile.interests,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      setProfile(editedProfile as Profile);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile as Profile);
    setIsEditing(false);
  };

  const addInterest = () => {
    if (newInterest.trim() && editedProfile.interests) {
      setEditedProfile({
        ...editedProfile,
        interests: [...editedProfile.interests, newInterest.trim()],
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    if (editedProfile.interests) {
      setEditedProfile({
        ...editedProfile,
        interests: editedProfile.interests.filter(i => i !== interest),
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.round(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Only redirect after auth has loaded
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Fetching profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="animate-fade-in">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">Profile not found</p>
              <Button onClick={() => navigate('/')}>Back to Home</Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6 animate-fade-in shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl transition-transform hover-scale">
                    <AvatarImage src={profile.avatar_url || ''} alt={profile.name} />
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        ) : (
                          <Camera className="h-6 w-6 text-white" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <Input
                      value={editedProfile.name || ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, name: e.target.value })
                      }
                      className="mb-2 max-w-xs text-2xl font-bold"
                      placeholder="Your name"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold">{profile.name}</h1>
                  )}
                  {profile.rating > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        {renderStars(profile.rating)}
                        <span className="text-sm font-semibold ml-1">
                          {profile.rating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({profile.reviews_count} {profile.reviews_count === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {isOwnProfile && !isEditing && (
                <Button onClick={() => setIsEditing(true)} size="sm" className="gap-2">
                  <Edit2 className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button onClick={handleCancel} size="sm" variant="outline" className="gap-2">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location Info */}
            {(profile.city || profile.zip || isEditing) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                {isEditing ? (
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      value={editedProfile.city || ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, city: e.target.value })
                      }
                      placeholder="City"
                      className="max-w-[200px]"
                    />
                    <Input
                      value={editedProfile.zip || ''}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, zip: e.target.value })
                      }
                      placeholder="ZIP"
                      className="max-w-[100px]"
                    />
                  </div>
                ) : (
                  <span>
                    {profile.city}
                    {profile.city && profile.zip && ', '}
                    {profile.zip}
                  </span>
                )}
              </div>
            )}

            {/* Bio */}
            <div>
              <h3 className="font-semibold mb-2 text-lg">About</h3>
              {isEditing ? (
                <Textarea
                  value={editedProfile.bio || ''}
                  onChange={(e) =>
                    setEditedProfile({ ...editedProfile, bio: e.target.value })
                  }
                  placeholder="Tell others about yourself..."
                  rows={4}
                  className="resize-none"
                />
              ) : (
                <p className="text-muted-foreground leading-relaxed">
                  {profile.bio || 'No bio added yet.'}
                </p>
              )}
            </div>

            {/* Interests/Skills */}
            {((profile.interests && profile.interests.length > 0) || isEditing) && (
              <div>
                <h3 className="font-semibold mb-3 text-lg">Interests & Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {(isEditing ? editedProfile.interests : profile.interests)?.map(
                    (interest) => (
                      <Badge 
                        key={interest} 
                        variant="secondary" 
                        className="text-sm px-3 py-1 hover-scale"
                      >
                        {interest}
                        {isEditing && (
                          <button
                            onClick={() => removeInterest(interest)}
                            className="ml-2 hover:text-destructive transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </Badge>
                    )
                  )}
                  {isEditing && (
                    <div className="flex gap-2 w-full mt-2">
                      <Input
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        placeholder="Add interest or skill"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                        className="max-w-xs"
                      />
                      <Button onClick={addInterest} size="sm">
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            {profile.completed_swaps > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Award className="h-5 w-5 text-primary" />
                <span className="font-medium">{profile.completed_swaps} completed swaps</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leave Review Button - Show on other people's profiles if you've matched */}
        {!isOwnProfile && user && (
          <LeaveReviewSection 
            profileId={id!} 
            currentUserId={user.id}
            profileName={profile.name}
            onReviewSuccess={fetchReviews}
          />
        )}

        {/* Services to Review - Only show on own profile */}
        {isOwnProfile && servicesToReview.length > 0 && (
          <Card className="animate-fade-in shadow-lg border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Services to Review</CardTitle>
                <Badge variant="default" className="ml-2">{servicesToReview.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Leave a review for these completed services
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {servicesToReview.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-background">
                        <AvatarImage src={service.other_user?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {service.other_user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{service.skill}</p>
                        <p className="text-sm text-muted-foreground">
                          with {service.other_user?.name}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleOpenReviewDialog(service)}
                      size="sm"
                      className="gap-2"
                    >
                      <Star className="h-4 w-4" />
                      Leave Review
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews Section */}
        <Card className="animate-fade-in shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                Reviews
              </CardTitle>
              {profile.reviews_count > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">{profile.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({profile.reviews_count} {profile.reviews_count === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <div key={review.id} className="animate-fade-in">
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar 
                            className="h-12 w-12 ring-2 ring-background shadow-md cursor-pointer hover-scale"
                            onClick={() => navigate(`/profile/${review.reviewer_id}`)}
                          >
                            <AvatarImage
                              src={review.reviewer?.avatar_url || ''}
                              alt={review.reviewer?.name}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {review.reviewer?.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-base">{review.reviewer?.name}</p>
                            {review.offers?.skill && (
                              <p className="text-xs text-muted-foreground">
                                for <span className="font-medium">{review.offers.skill}</span>
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1.5">
                              {renderStars(review.stars)}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-muted-foreground ml-15 leading-relaxed bg-muted/30 rounded-lg p-4 border">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Star className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  {isOwnProfile ? 'You have no reviews yet' : 'No reviews yet for this user'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Dialog */}
        {selectedServiceForReview && (
          <RatingDialog
            open={ratingDialogOpen}
            onOpenChange={setRatingDialogOpen}
            offerId={selectedServiceForReview.id}
            revieweeId={selectedServiceForReview.other_user.id}
            revieweeName={selectedServiceForReview.other_user.name}
            onSuccess={handleReviewSuccess}
          />
        )}

        {/* Image Crop Dialog */}
        <ImageCropDialog
          open={cropDialogOpen}
          imageUrl={imageToCrop}
          onClose={() => {
            setCropDialogOpen(false);
            setImageToCrop('');
          }}
          onCropComplete={handleCroppedImage}
          aspectRatio={1}
          title="Crop Profile Picture"
        />
      </div>
    </Layout>
  );
};

export default Profile;
