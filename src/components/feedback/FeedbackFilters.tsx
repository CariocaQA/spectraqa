import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { FeedbackType, FeedbackArea, FeedbackStatus, FEEDBACK_TYPE_LABELS, FEEDBACK_STATUS_LABELS, FEEDBACK_AREAS } from '@/types/feedback';

interface FeedbackFiltersProps {
  filters: {
    tipo?: FeedbackType;
    area?: FeedbackArea;
    status?: FeedbackStatus;
    ordenacao: 'recentes' | 'votados';
  };
  onFiltersChange: (filters: FeedbackFiltersProps['filters']) => void;
}

export function FeedbackFilters({ filters, onFiltersChange }: FeedbackFiltersProps) {
  const hasActiveFilters = filters.tipo || filters.area || filters.status;

  const clearFilters = () => {
    onFiltersChange({ ordenacao: filters.ordenacao });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.tipo || 'all'}
        onValueChange={(value) => 
          onFiltersChange({ 
            ...filters, 
            tipo: value === 'all' ? undefined : value as FeedbackType 
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {Object.entries(FEEDBACK_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.area || 'all'}
        onValueChange={(value) => 
          onFiltersChange({ 
            ...filters, 
            area: value === 'all' ? undefined : value as FeedbackArea 
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Área" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as áreas</SelectItem>
          {FEEDBACK_AREAS.map((area) => (
            <SelectItem key={area} value={area}>{area}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => 
          onFiltersChange({ 
            ...filters, 
            status: value === 'all' ? undefined : value as FeedbackStatus 
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {Object.entries(FEEDBACK_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="h-6 w-px bg-border mx-2" />

      <Select
        value={filters.ordenacao}
        onValueChange={(value) => 
          onFiltersChange({ ...filters, ordenacao: value as 'recentes' | 'votados' })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recentes">Mais recentes</SelectItem>
          <SelectItem value="votados">Mais votados</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
