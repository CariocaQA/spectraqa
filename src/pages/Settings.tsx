import { Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm">Personalize sua experiência</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <CardDescription>
            Configure suas preferências de geração
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="bdd-lang">Idioma do BDD em Português</Label>
              <p className="text-sm text-muted-foreground">
                Usar keywords Gherkin em português (Dado/Quando/Então)
              </p>
            </div>
            <Switch id="bdd-lang" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-copy">Copiar automaticamente</Label>
              <p className="text-sm text-muted-foreground">
                Copiar artefato gerado para área de transferência
              </p>
            </div>
            <Switch id="auto-copy" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
