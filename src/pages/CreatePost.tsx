import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageCropDialog } from '@/components/ImageCropDialog';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

const CreatePost = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const [imageFile, setImageFile] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    type: 'offer' as 'offer' | 'request',
    skill: '',
    description: '',
    zip: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
    setCropDialogOpen(false);
    setImageFile(croppedBlob);
    
    // Create preview
    const previewUrl = URL.createObjectURL(croppedBlob);
    setImagePreview(previewUrl);
    setImageToCrop('');
    
    toast.success('Image ready to upload!');
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        setUploadingImage(true);
        const fileName = `${user.id}/offer-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('offer-images')
          .upload(fileName, imageFile, { 
            upsert: true,
            contentType: 'image/jpeg'
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('offer-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
        setUploadingImage(false);
      }

      const { error } = await supabase.from('offers').insert({
        user_id: user.id,
        type: formData.type,
        skill: formData.skill,
        description: formData.description,
        zip: formData.zip,
        status: 'open',
        image_url: imageUrl,
      });

      if (error) throw error;

      toast.success('Post created successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create a Post</CardTitle>
            <CardDescription>Share what you can offer or what you need</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={formData.type === 'offer' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, type: 'offer' })}
                    className="flex-1"
                  >
                    I can offer
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === 'request' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, type: 'request' })}
                    className="flex-1"
                  >
                    I need help
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skill">Skill</Label>
                <Input
                  id="skill"
                  value={formData.skill}
                  onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                  placeholder="e.g., Gardening, Piano lessons, Web design"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what you're offering or looking for..."
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  placeholder="12345"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Service Image (Optional)</Label>
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-border">
                      <img
                        src={imagePreview}
                        alt="Service preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-32 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload service image
                        </span>
                      </div>
                    </Button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || uploadingImage}>
                {uploadingImage ? 'Uploading image...' : loading ? 'Creating...' : 'Create Post'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Image Crop Dialog */}
        <ImageCropDialog
          open={cropDialogOpen}
          imageUrl={imageToCrop}
          onClose={() => {
            setCropDialogOpen(false);
            setImageToCrop('');
          }}
          onCropComplete={handleCroppedImage}
          aspectRatio={16 / 9}
          title="Crop Service Image"
        />
      </div>
    </Layout>
  );
};

export default CreatePost;
