import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ManualInputFormProps {
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  contentLabel?: string;
  contentDescription?: string;
}

export function ManualInputForm({
  title,
  content,
  onTitleChange,
  onContentChange,
  titlePlaceholder = "Ex: Login com autenticação OAuth",
  contentPlaceholder = "Cole aqui a descrição da funcionalidade, requisitos, critérios de aceite ou qualquer informação relevante...",
  contentLabel = "Descrição / Requisitos",
  contentDescription = "Informe os detalhes da funcionalidade, critérios de aceite, regras de negócio ou qualquer contexto relevante"
}: ManualInputFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Entrada Manual</CardTitle>
        <CardDescription>
          Informe os dados manualmente para gerar o conteúdo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="manual-title">Título da Funcionalidade</Label>
          <Input
            id="manual-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={titlePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual-content">{contentLabel}</Label>
          <p className="text-xs text-muted-foreground">
            {contentDescription}
          </p>
          <Textarea
            id="manual-content"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={contentPlaceholder}
            className="min-h-[200px] resize-y"
          />
        </div>
      </CardContent>
    </Card>
  );
}
