import { useState, useCallback } from 'react';
import { Upload, FileText, File, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    const validExtensions = ['.pdf', '.txt', '.md'];
    
    const isValidType = validTypes.includes(selectedFile.type) || 
      validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast({
        title: 'Formato inválido',
        description: 'Use arquivos PDF, TXT ou MD.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione um arquivo e insira um título.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Não autenticado');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('tags', tags);

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({ success: true });
            } else {
              resolve({ success: false, error: response.error || 'Erro no upload' });
            }
          } catch {
            reject(new Error('Erro ao processar resposta'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Erro de rede'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelado'));
        });

        xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kb-upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.send(formData);
      });

      const result = await uploadPromise;

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: 'Upload realizado!',
        description: 'O documento está sendo processado.',
      });

      setFile(null);
      setTitle('');
      setTags('');
      setUploadProgress(0);
      onUploadComplete();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-8 h-8 text-muted-foreground" />;
    if (file.name.endsWith('.pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    return <File className="w-8 h-8 text-blue-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${file ? 'bg-muted/50' : ''}
            `}
            onClick={() => !isUploading && document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            
            <div className="flex flex-col items-center gap-2">
              {getFileIcon()}
              {file ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{file.name}</span>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Arraste um arquivo ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, TXT ou MD (máx. 10MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Enviando...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título do documento *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Guia de Testes BDD"
              disabled={isUploading}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: bdd, testes, automação"
              disabled={isUploading}
            />
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || !title.trim() || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Enviar documento
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
