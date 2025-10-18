import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Search, Star } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Offer = Database['public']['Tables']['offers']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'offer' | 'request'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOffers();
    }
  }, [user, filterType]);

  const fetchOffers = async () => {
    try {
      let query = supabase
        .from('offers')
        .select('*, profiles(*)')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOffers(data as Offer[]);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = offers.filter(offer =>
    offer.skill.toLowerCase().includes(searchQuery.toLowerCase()) ||
    offer.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Discover Skills Near You
          </h1>
          <p className="text-lg text-muted-foreground">Connect with neighbors and swap skills locally</p>
        </div>

        <div className="mb-8 space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for skills, people, or services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base shadow-sm"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className="shadow-sm"
            >
              All Posts
            </Button>
            <Button
              variant={filterType === 'offer' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('offer')}
              className="shadow-sm"
            >
              Skills Offered
            </Button>
            <Button
              variant={filterType === 'request' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('request')}
              className="shadow-sm"
            >
              Skills Needed
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading offers...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => (
              <Card
                key={offer.id}
                className="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 animate-fade-in group overflow-hidden border-2"
                onClick={() => navigate(`/post/${offer.id}`)}
              >
                <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <Badge 
                      variant={offer.type === 'offer' ? 'default' : 'secondary'} 
                      className="shadow-sm px-3 py-1"
                    >
                      {offer.type}
                    </Badge>
                    {offer.profiles && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-background/60 rounded-full px-2.5 py-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="font-medium">{offer.zip}</span>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                    {offer.skill}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                    {offer.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  {offer.profiles && (
                    <div 
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${offer.user_id}`);
                      }}
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                        <AvatarImage src={offer.profiles.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {offer.profiles.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{offer.profiles.name}</p>
                        {offer.profiles.rating > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{offer.profiles.rating.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({offer.profiles.reviews_count})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredOffers.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="bg-muted/30 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Search className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-xl font-semibold mb-2">No offers found</p>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? 'Try a different search term' : 'Be the first to post!'}
            </p>
            <Button onClick={() => navigate('/post/new')} size="lg" className="shadow-md">
              Create Your First Post
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
