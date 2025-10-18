import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Offer = Database['public']['Tables']['offers']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

type ConversationWithDetails = {
  id: string;
  offer_id: string;
  creator_id: string;
  participant_id: string;
  created_at: string;
  updated_at: string;
  offer?: Offer;
  other_user?: Profile;
  last_message?: Message;
  unread_count?: number;
};

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      subscribeToMessages();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`creator_id.eq.${user!.id},participant_id.eq.${user!.id}`);

      if (convError) throw convError;

      const conversationsWithDetails = await Promise.all(
        (convData || []).map(async (conv) => {
          const otherUserId = conv.creator_id === user!.id ? conv.participant_id : conv.creator_id;

          const [offerResult, profileResult, messagesResult, unreadResult] = await Promise.all([
            supabase.from('offers').select('*').eq('id', conv.offer_id).single(),
            supabase.from('profiles').select('*').eq('id', otherUserId).single(),
            supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1),
            supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('is_read', false)
              .neq('sender_id', user!.id)
          ]);

          return {
            ...conv,
            offer: offerResult.data || undefined,
            other_user: profileResult.data || undefined,
            last_message: messagesResult.data?.[0] || undefined,
            unread_count: unreadResult.count || 0,
          };
        })
      );

      // Sort by last message timestamp (most recent first)
      const sorted = conversationsWithDetails.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(sorted);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('new-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (authLoading || !user) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Messages</h1>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-xl">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Messages</h1>
              <p className="text-sm text-muted-foreground">
                {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
              </p>
            </div>
          </div>
        </div>

        {conversations.length === 0 ? (
          <Card className="animate-fade-in shadow-lg border-2 border-dashed">
            <CardContent className="py-20 text-center">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-28 h-28 mx-auto mb-6 flex items-center justify-center shadow-inner">
                <MessageCircle className="h-14 w-14 text-primary/60" />
              </div>
              <h3 className="text-xl font-bold mb-3">No messages yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                Start a conversation by messaging someone about their offer. Browse the feed to find interesting skills!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className="hover:shadow-xl hover:scale-[1.01] transition-all duration-200 cursor-pointer animate-fade-in group border-l-4 border-l-transparent hover:border-l-primary"
                onClick={() => navigate(`/chat/${conv.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 ring-2 ring-background shadow-lg group-hover:ring-primary/50 transition-all">
                        <AvatarImage src={conv.other_user?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-xl">
                          {conv.other_user?.name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {conv.unread_count! > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs rounded-full shadow-lg animate-scale-in"
                        >
                          {conv.unread_count! > 9 ? '9+' : conv.unread_count}
                        </Badge>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-lg truncate">
                          {conv.other_user?.name || 'Unknown User'}
                        </h3>
                        {conv.last_message && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                            {new Date(conv.last_message.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>

                      {conv.offer && (
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
                            {conv.offer.skill}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2.5 py-1">
                            {conv.offer.type}
                          </Badge>
                        </div>
                      )}

                      {conv.last_message ? (
                        <p className={`text-sm truncate leading-relaxed ${
                          conv.unread_count! > 0 && conv.last_message.sender_id !== user.id
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground'
                        }`}>
                          {conv.last_message.sender_id === user.id && (
                            <span className="font-medium text-muted-foreground">You: </span>
                          )}
                          {conv.last_message.content}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Messages;
