import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, User, ArrowLeft, MessageCircle, CheckCircle, Star } from 'lucide-react';
import { RatingDialog } from '@/components/RatingDialog';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Offer = Database['public']['Tables']['offers']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

type Review = Database['public']['Tables']['reviews']['Row'] & {
  reviewer: Database['public']['Tables']['profiles']['Row'];
};

const PostDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchOffer();
      checkUserReview();
      fetchReviews();
    }
  }, [user, id]);

  const fetchOffer = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOffer(data as Offer);
    } catch (error) {
      console.error('Error fetching offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(*)')
        .eq('offer_id', id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setReviews(data as Review[]);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkUserReview = async () => {
    if (!user || !id) return;
    
    try {
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('offer_id', id)
        .eq('reviewer_id', user.id)
        .single();
      
      setHasUserReviewed(!!data);
    } catch (error) {
      // No review found, that's okay
    }
  };

  const handleCompleteOffer = async () => {
    if (!offer || !user) return;
    
    setCompleting(true);
    try {
      const { error } = await supabase
        .from('offers')
        .update({ 
          completed_at: new Date().toISOString(),
          status: 'completed' 
        })
        .eq('id', offer.id);

      if (error) throw error;

      toast.success('Offer marked as completed!');
      fetchOffer();
    } catch (error: any) {
      console.error('Error completing offer:', error);
      toast.error('Failed to complete offer');
    } finally {
      setCompleting(false);
    }
  };

  const handleStartConversation = async () => {
    if (!offer || !user) return;

    setMessaging(true);
    try {
      // Check if conversation already exists
      const { data: existingConvs, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('offer_id', offer.id)
        .or(`creator_id.eq.${user.id},participant_id.eq.${user.id}`);

      if (convError) throw convError;

      if (existingConvs && existingConvs.length > 0) {
        // Navigate to existing conversation
        navigate(`/chat/${existingConvs[0].id}`);
      } else {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            offer_id: offer.id,
            creator_id: user.id,
            participant_id: offer.user_id,
          })
          .select()
          .single();

        if (createError) {
          // Handle race condition - another user might have created it
          if (createError.code === '23505') {
            const { data: retryConv } = await supabase
              .from('conversations')
              .select('*')
              .eq('offer_id', offer.id)
              .or(`creator_id.eq.${user.id},participant_id.eq.${user.id}`)
              .single();
            
            if (retryConv) {
              navigate(`/chat/${retryConv.id}`);
            }
          } else {
            throw createError;
          }
        } else {
          navigate(`/chat/${newConv.id}`);
        }
      }
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setMessaging(false);
    }
  };

  if (authLoading || !user) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!offer) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Post not found</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </Layout>
    );
  }

  const isOwner = user?.id === offer?.user_id;
  const isCompleted = !!offer?.completed_at;
  const canRate = isCompleted && !isOwner && !hasUserReviewed;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 hover-scale"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Feed
        </Button>

        <Card className="shadow-xl rounded-2xl overflow-hidden animate-fade-in">
          <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant={offer.type === 'offer' ? 'default' : 'secondary'} className="text-base px-4 py-1.5">
                  {offer.type}
                </Badge>
                {isCompleted && (
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 px-4 py-1.5 text-base">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{offer.city || offer.zip}</span>
              </div>
            </div>
            <CardTitle className="text-4xl mb-3 font-bold">{offer.skill}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {offer.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {offer.profiles && (
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border shadow-sm">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover-scale"
                  onClick={() => navigate(`/profile/${offer.user_id}`)}
                >
                  <div className="bg-primary/10 p-2 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{offer.profiles.name}</p>
                    {offer.profiles.rating > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{offer.profiles.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({offer.profiles.reviews_count} reviews)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {user && user.id !== offer.user_id && (
                    <Button 
                      onClick={handleStartConversation} 
                      disabled={messaging}
                      className="shadow-md"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {messaging ? 'Loading...' : 'Message'}
                    </Button>
                  )}
                  {isOwner && !isCompleted && (
                    <Button 
                      onClick={handleCompleteOffer} 
                      disabled={completing}
                      variant="outline"
                      className="shadow-md border-green-500/50 hover:bg-green-500/10"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {completing ? 'Completing...' : 'Mark Complete'}
                    </Button>
                  )}
                  {canRate && (
                    <Button 
                      onClick={() => setRatingDialogOpen(true)}
                      variant="outline"
                      className="shadow-md"
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Rate
                    </Button>
                  )}
                </div>
              </div>
            )}

            {offer.tags && offer.tags.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {offer.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="px-3 py-1.5 hover-scale">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Posted on {new Date(offer.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                {isCompleted && (
                  <p className="text-muted-foreground">
                    Completed on {new Date(offer.completed_at!).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <Card className="mt-6 shadow-xl rounded-2xl animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                Recent Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-background">
                        <AvatarImage src={review.reviewer.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {review.reviewer.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{review.reviewer.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < review.stars
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed ml-13">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {offer && (
          <RatingDialog
            open={ratingDialogOpen}
            onOpenChange={setRatingDialogOpen}
            offerId={offer.id}
            revieweeId={offer.user_id}
            revieweeName={offer.profiles?.name || 'User'}
            onSuccess={() => {
              checkUserReview();
              fetchReviews();
              toast.success('Thank you for your feedback!');
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default PostDetail;
