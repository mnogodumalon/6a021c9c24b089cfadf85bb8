import { useDashboardData } from '@/hooks/useDashboardData';
import type { Testeingabe } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { TesteingabeDialog } from '@/components/dialogs/TesteingabeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatCard } from '@/components/StatCard';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSearch, IconUsers,
  IconCalendar, IconMail, IconPhone, IconUser,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a021c9c24b089cfadf85bb8';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    testeingabe,
    loading, error, fetchAll,
  } = useDashboardData();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Testeingabe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Testeingabe | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return testeingabe;
    return testeingabe.filter(r => {
      const { vorname, nachname, email, telefon, bemerkungen } = r.fields;
      return [vorname, nachname, email, telefon, bemerkungen]
        .some(v => v && v.toLowerCase().includes(s));
    });
  }, [testeingabe, search]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return testeingabe.filter(r => r.fields.datum?.startsWith(ym)).length;
  }, [testeingabe]);

  const withEmail = useMemo(() => testeingabe.filter(r => r.fields.email).length, [testeingabe]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleCreate = async (fields: Testeingabe['fields']) => {
    await LivingAppsService.createTesteingabeEntry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: Testeingabe['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateTesteingabeEntry(editRecord.record_id, fields);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteTesteingabeEntry(deleteTarget.record_id);
    fetchAll();
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Einträge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{testeingabe.length} Einträge gesamt</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} className="shrink-0">
          <IconPlus size={16} className="mr-2 shrink-0" />
          Neuer Eintrag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Gesamt"
          value={String(testeingabe.length)}
          description="Alle Einträge"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Diesen Monat"
          value={String(thisMonthCount)}
          description="Neue Einträge"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Mit E-Mail"
          value={String(withEmail)}
          description="Einträge mit E-Mail"
          icon={<IconMail size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
        <Input
          placeholder="Suchen nach Name, E-Mail, Telefon..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contact Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl border-2 border-dashed border-border">
          <IconUser size={48} className="text-muted-foreground" stroke={1.5} />
          <div className="text-center">
            <p className="font-medium text-foreground">
              {search ? 'Keine Einträge gefunden' : 'Noch keine Einträge'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Versuche eine andere Suchanfrage.' : 'Erstelle den ersten Eintrag.'}
            </p>
          </div>
          {!search && (
            <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
              <IconPlus size={16} className="mr-2 shrink-0" />
              Ersten Eintrag erstellen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(record => (
            <ContactCard
              key={record.record_id}
              record={record}
              onEdit={() => { setEditRecord(record); setDialogOpen(true); }}
              onDelete={() => setDeleteTarget(record)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TesteingabeDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Testeingabe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Testeingabe']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Soll der Eintrag von ${deleteTarget?.fields.vorname ?? ''} ${deleteTarget?.fields.nachname ?? ''} wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ContactCard({
  record,
  onEdit,
  onDelete,
}: {
  record: Testeingabe;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { vorname, nachname, email, telefon, datum, bemerkungen } = record.fields;
  const initials = [vorname, nachname]
    .filter(Boolean)
    .map(s => s![0].toUpperCase())
    .join('') || '?';

  const fullName = [vorname, nachname].filter(Boolean).join(' ') || 'Unbekannt';

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Card Header */}
      <div className="p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{fullName}</p>
          {datum && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <IconCalendar size={12} className="shrink-0" />
              {formatDate(datum)}
            </p>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-5 pb-4 space-y-2 flex-1">
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-w-0"
          >
            <IconMail size={14} className="shrink-0 text-primary/70" />
            <span className="truncate">{email}</span>
          </a>
        )}
        {telefon && (
          <a
            href={`tel:${telefon}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconPhone size={14} className="shrink-0 text-primary/70" />
            <span className="truncate">{telefon}</span>
          </a>
        )}
        {bemerkungen && (
          <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border/50">
            {bemerkungen}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 px-4 pb-4">
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
          <IconPencil size={15} className="shrink-0" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
          <IconTrash size={15} className="shrink-0" />
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-10 w-72 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
