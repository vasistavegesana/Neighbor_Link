import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Check, Star } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { RatingDialog } from '@/components/RatingDialog';

type Message = Database['public']['Tables']['messages']['Row'] & {
  profiles?: Database['public']['Tables']['profiles']['Row'];
};
type Conversation = Database['public']['Tables']['conversations']['Row'];
type Offer = Database['public']['Tables']['offers']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

const Chat = () => {
  const { conversationId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messageOffset, setMessageOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMatchedRef = useRef<boolean>(false);
  const isNearBottomRef = useRef(true);

  const MESSAGES_PER_PAGE = 50;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && conversationId) {
      initializeChat();
    }
  }, [user, conversationId]);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      const unsubMessages = subscribeToMessages();
      const unsubConversation = subscribeToConversation();
      return () => {
        unsubMessages();
        unsubConversation();
      };
    }
  }, [conversation]);

  useEffect(() => {
    // Only auto-scroll if user is near the bottom
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Watch for when both users match
  useEffect(() => {
    if (conversation && conversation.matched && !prevMatchedRef.current) {
      toast.success("🎉 Amazing! You've both matched! You can now leave reviews after completing the service.", {
        duration: 5000,
      });
    }
    prevMatchedRef.current = conversation?.matched || false;
  }, [conversation?.matched]);

  // Check if user already reviewed the other user
  useEffect(() => {
    if (user && conversation && otherUserProfile) {
      checkExistingReview();
    }
  }, [user, conversation, otherUserProfile]);

  const checkExistingReview = async () => {
    if (!user || !conversation || !otherUserProfile) return;
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('reviewee_id', otherUserProfile.id)
        .eq('offer_id', conversation.offer_id)
        .maybeSingle();

      if (error) throw error;
      setHasExistingReview(!!data);
    } catch (error) {
      console.error('Error checking existing review:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    isNearBottomRef.current = isNearBottom;
  };

  const initializeChat = async () => {
    try {
      // Fetch the conversation by ID
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId!)
        .single();

      if (convError) throw convError;
      
      // Verify user is part of this conversation
      if (convData.creator_id !== user!.id && convData.participant_id !== user!.id) {
        toast.error('You are not authorized to view this conversation');
        navigate('/messages');
        return;
      }

      setConversation(convData);

      // Determine the other user
      const otherUserId = convData.creator_id === user!.id 
        ? convData.participant_id 
        : convData.creator_id;

      // Fetch both the offer and other user's profile in parallel
      const [offerResult, profileResult] = await Promise.all([
        supabase
          .from('offers')
          .select('*')
          .eq('id', convData.offer_id)
          .single(),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single()
      ]);

      if (offerResult.error) throw offerResult.error;
      if (profileResult.error) throw profileResult.error;

      setOffer(offerResult.data);
      setOtherUserProfile(profileResult.data);
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to load chat');
      navigate('/messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (loadMore = false) => {
    try {
      const offset = loadMore ? messageOffset : 0;
      
      // Get total count first
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversation!.id);

      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles!messages_sender_id_fkey(*)')
        .eq('conversation_id', conversation!.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + MESSAGES_PER_PAGE - 1);

      if (error) throw error;

      const reversedData = (data || []).reverse();
      
      if (loadMore) {
        setMessages(prev => [...reversedData, ...prev]);
        setMessageOffset(offset + MESSAGES_PER_PAGE);
      } else {
        setMessages(reversedData);
        setMessageOffset(MESSAGES_PER_PAGE);
      }

      setHasMoreMessages((count || 0) > offset + MESSAGES_PER_PAGE);

      // Mark messages as read
      const unreadMessages = data?.filter(
        (msg) => msg.sender_id !== user!.id && !msg.is_read
      );
      if (unreadMessages && unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(m => m.id));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const loadMoreMessages = async () => {
    setLoadingMore(true);
    await fetchMessages(true);
    setLoadingMore(false);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation!.id}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToConversation = () => {
    const channel = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversation!.id}`,
        },
        (payload) => {
          setConversation(payload.new as Conversation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleMatch = async () => {
    if (!conversation || !user || !offer) return;
    
    setIsMatching(true);
    try {
      const currentMatchedBy = conversation.matched_by || [];
      const hasUserMatched = currentMatchedBy.includes(user.id);
      
      let updatedMatchedBy: string[];
      if (hasUserMatched) {
        // Remove user from matched_by
        updatedMatchedBy = currentMatchedBy.filter(id => id !== user.id);
      } else {
        // Add user to matched_by
        updatedMatchedBy = [...currentMatchedBy, user.id];
      }
      
      // Check if both users have matched
      const bothMatched = updatedMatchedBy.length === 2;
      
      // Update conversation
      const { error: convError } = await supabase
        .from('conversations')
        .update({ 
          matched_by: updatedMatchedBy,
          matched: bothMatched
        })
        .eq('id', conversation.id);
      
      if (convError) throw convError;

      // If both matched, update offer status to 'matched' to remove from public listings
      if (bothMatched) {
        const { error: offerError } = await supabase
          .from('offers')
          .update({ status: 'matched' })
          .eq('id', offer.id);
        
        if (offerError) throw offerError;
        setOffer({ ...offer, status: 'matched' });
      }
      
      // Update local state
      setConversation({
        ...conversation,
        matched_by: updatedMatchedBy,
        matched: bothMatched
      });
      
      if (bothMatched) {
        // Don't show toast here, the useEffect will handle it
      } else if (hasUserMatched) {
        toast.info("Match removed");
      } else {
        toast.success("Match sent! Waiting for the other user to match.");
      }
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Failed to update match status');
    } finally {
      setIsMatching(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: user!.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (authLoading || !user) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Loading chat...</p>
        </div>
      </Layout>
    );
  }

  if (!offer || !conversation || !otherUserProfile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Chat not found</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </Layout>
    );
  }

  const otherUserName = otherUserProfile.name || 'User';
  const matchedBy = conversation.matched_by || [];
  const hasUserMatched = matchedBy.includes(user.id);
  const bothMatched = conversation.matched;
  const isOfferCompleted = offer.completed_at !== null;
  // Allow reviews only if offer is completed
  const canLeaveReview = isOfferCompleted;

  const handleReviewSuccess = () => {
    setRatingDialogOpen(false);
    setHasExistingReview(true);
    toast.success('Review submitted successfully!');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/post/${offer.id}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Offer
        </Button>

        <Card className="flex flex-col shadow-xl rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
                <AvatarImage src={otherUserProfile.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {otherUserName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-lg">{offer.skill}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Chatting with <span className="font-medium">{otherUserName}</span>
                </p>
                {bothMatched && (
                  <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 animate-fade-in">
                    <Check className="h-3 w-3 mr-1" />
                    You've both agreed to work together!
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {canLeaveReview && (
                  <Button
                    onClick={() => setRatingDialogOpen(true)}
                    disabled={hasExistingReview}
                    variant={hasExistingReview ? "secondary" : "default"}
                    size="sm"
                    className={hasExistingReview 
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" 
                      : "bg-yellow-500 hover:bg-yellow-600 text-white border-0"
                    }
                  >
                    {hasExistingReview ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Reviewed ✅
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-1" />
                        Leave Review
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1" onScrollCapture={handleScroll}>
              <div className="p-6 space-y-4">
                {hasMoreMessages && (
                  <div className="text-center mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMoreMessages}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load earlier messages'}
                    </Button>
                  </div>
                )}
                {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 animate-fade-in ${
                    message.sender_id === user.id ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {message.sender_id !== user.id && (
                    <Avatar className="h-9 w-9 mt-1 ring-2 ring-background shadow-sm">
                      <AvatarImage src={message.profiles?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {message.profiles?.name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`flex flex-col max-w-[75%] ${
                      message.sender_id === user.id ? 'items-end' : 'items-start'
                    }`}
                  >
                    {message.sender_id !== user.id && message.profiles && (
                      <p className="text-xs font-semibold text-muted-foreground mb-1 px-2">
                        {message.profiles.name}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-sm hover-scale ${
                        message.sender_id === user.id
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-card border rounded-tl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">{message.content}</p>
                      <p className={`text-[10px] mt-1.5 ${
                        message.sender_id === user.id ? 'opacity-80' : 'text-muted-foreground'
                      }`}>
                        {new Date(message.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t bg-background/95 backdrop-blur p-4 shadow-lg">
              <form onSubmit={sendMessage} className="flex gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-muted/50 border-none focus-visible:ring-2"
                />
                <Button type="submit" size="icon" className="rounded-full shrink-0 h-10 w-10">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <RatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          offerId={offer.id}
          revieweeId={otherUserProfile.id}
          revieweeName={otherUserName}
          onSuccess={handleReviewSuccess}
        />
      </div>
    </Layout>
  );
};

export default Chat;
