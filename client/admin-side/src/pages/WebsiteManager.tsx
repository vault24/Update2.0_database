/**
 * Website Manager — centralized management of the public website
 * (ac.spisg.gov.bd). One place for site settings plus every CMS collection.
 *
 * Architecture: each collection is described by a small field schema and
 * rendered by the generic <CrudSection> (table + create/edit dialog + delete).
 * Everything talks to /api/website/manage/* (Principal / Dept Head only) and
 * changes appear on the public site within a minute (60s public cache).
 */
import { useEffect, useMemo, useState } from 'react';
import { Globe, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/* Field schema                                                        */
/* ------------------------------------------------------------------ */
type FieldType = 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'file' | 'image' | 'date' | 'datetime' | 'email' | 'url';

interface Field {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
}

interface Collection {
  key: string;            // tab key
  label: string;          // tab label
  endpoint: string;       // manage endpoint segment
  titleField: string;     // column shown as the row title
  fields: Field[];
  extraColumns?: { label: string; render: (row: Record<string, unknown>) => string }[];
}

const publishFields: Field[] = [
  { name: 'is_published', label: 'Published', type: 'checkbox' },
  { name: 'order', label: 'Order (lower shows first)', type: 'number' },
];

const COLLECTIONS: Collection[] = [
  {
    key: 'hero', label: 'Hero Banner', endpoint: 'hero', titleField: 'headline_en',
    fields: [
      { name: 'headline_en', label: 'Headline (English)', type: 'text', required: true },
      { name: 'headline_bn', label: 'Headline (Bangla)', type: 'text' },
      { name: 'subtitle_en', label: 'Subtitle (English)', type: 'text' },
      { name: 'subtitle_bn', label: 'Subtitle (Bangla)', type: 'text' },
      { name: 'image', label: 'Background image', type: 'image', required: true },
      { name: 'cta_label_en', label: 'Button label', type: 'text' },
      { name: 'cta_url', label: 'Button link', type: 'text' },
      ...publishFields,
    ],
  },
  {
    key: 'events', label: 'Events', endpoint: 'events', titleField: 'title_en',
    fields: [
      { name: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { name: 'title_bn', label: 'Title (Bangla)', type: 'text' },
      { name: 'description_en', label: 'Description (English)', type: 'textarea' },
      { name: 'description_bn', label: 'Description (Bangla)', type: 'textarea' },
      {
        name: 'category', label: 'Category', type: 'select',
        options: ['academic', 'cultural', 'sports', 'seminar', 'workshop', 'notice', 'other'].map((c) => ({ value: c, label: c })),
      },
      { name: 'venue', label: 'Venue', type: 'text' },
      { name: 'start_at', label: 'Starts', type: 'datetime', required: true },
      { name: 'end_at', label: 'Ends', type: 'datetime' },
      { name: 'cover_image', label: 'Cover image', type: 'image' },
      { name: 'is_featured', label: 'Featured', type: 'checkbox' },
      ...publishFields,
    ],
    extraColumns: [{ label: 'Starts', render: (r) => String(r.start_at ?? '').slice(0, 10) }],
  },
  {
    key: 'news', label: 'News', endpoint: 'news', titleField: 'title_en',
    fields: [
      { name: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { name: 'title_bn', label: 'Title (Bangla)', type: 'text' },
      { name: 'excerpt_en', label: 'Excerpt (English)', type: 'textarea' },
      { name: 'body_en', label: 'Body (English)', type: 'textarea' },
      { name: 'body_bn', label: 'Body (Bangla)', type: 'textarea' },
      { name: 'cover_image', label: 'Cover image', type: 'image' },
      { name: 'published_at', label: 'Publish date', type: 'datetime' },
      ...publishFields,
    ],
  },
  {
    key: 'albums', label: 'Gallery · Albums', endpoint: 'gallery-albums', titleField: 'title_en',
    fields: [
      { name: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { name: 'title_bn', label: 'Title (Bangla)', type: 'text' },
      { name: 'description_en', label: 'Description', type: 'textarea' },
      { name: 'cover_image', label: 'Cover image', type: 'image' },
      ...publishFields,
    ],
    extraColumns: [{ label: 'Photos', render: (r) => String(r.image_count ?? 0) }],
  },
  {
    key: 'images', label: 'Gallery · Photos', endpoint: 'gallery-images', titleField: 'caption_en',
    fields: [
      { name: 'album', label: 'Album', type: 'select', required: true, options: [] /* filled at runtime */ },
      { name: 'image', label: 'Photo', type: 'image', required: true },
      { name: 'caption_en', label: 'Caption (English)', type: 'text' },
      { name: 'caption_bn', label: 'Caption (Bangla)', type: 'text' },
      { name: 'video_url', label: 'Video URL (optional)', type: 'url', hint: 'YouTube/Vimeo link for video items' },
      ...publishFields,
    ],
  },
  {
    key: 'downloads', label: 'Downloads', endpoint: 'downloads', titleField: 'title_en',
    fields: [
      { name: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { name: 'title_bn', label: 'Title (Bangla)', type: 'text' },
      { name: 'description_en', label: 'Description', type: 'text' },
      {
        name: 'category', label: 'Category', type: 'select',
        options: ['form', 'prospectus', 'calendar', 'syllabus', 'routine', 'policy', 'other'].map((c) => ({ value: c, label: c })),
      },
      { name: 'file', label: 'File', type: 'file', required: true },
      ...publishFields,
    ],
    extraColumns: [{ label: 'Category', render: (r) => String(r.category ?? '') }],
  },
  {
    key: 'library', label: 'Library', endpoint: 'library', titleField: 'title_en',
    fields: [
      { name: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { name: 'title_bn', label: 'Title (Bangla)', type: 'text' },
      { name: 'description_en', label: 'Description', type: 'textarea' },
      { name: 'resource_url', label: 'External link', type: 'url' },
      { name: 'file', label: 'File (optional)', type: 'file' },
      { name: 'cover_image', label: 'Cover image', type: 'image' },
      ...publishFields,
    ],
  },
  {
    key: 'clubs', label: 'Clubs', endpoint: 'clubs', titleField: 'name_en',
    fields: [
      { name: 'name_en', label: 'Name (English)', type: 'text', required: true },
      { name: 'name_bn', label: 'Name (Bangla)', type: 'text' },
      { name: 'description_en', label: 'Description', type: 'textarea' },
      { name: 'moderator', label: 'Moderator', type: 'text' },
      { name: 'contact_email', label: 'Contact email', type: 'email' },
      { name: 'logo', label: 'Logo', type: 'image' },
      ...publishFields,
    ],
  },
  {
    key: 'sports', label: 'Sports', endpoint: 'sports', titleField: 'title_en',
    fields: [
      { name: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { name: 'title_bn', label: 'Title (Bangla)', type: 'text' },
      { name: 'description_en', label: 'Description', type: 'textarea' },
      { name: 'image', label: 'Image', type: 'image' },
      ...publishFields,
    ],
  },
  {
    key: 'achievements', label: 'Achievements', endpoint: 'achievements', titleField: 'title_en',
    fields: [
      { name: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { name: 'title_bn', label: 'Title (Bangla)', type: 'text' },
      { name: 'description_en', label: 'Description', type: 'textarea' },
      {
        name: 'category', label: 'Category', type: 'select',
        options: ['institute', 'student', 'teacher', 'department'].map((c) => ({ value: c, label: c })),
      },
      { name: 'achieved_on', label: 'Date', type: 'date' },
      { name: 'image', label: 'Image', type: 'image' },
      ...publishFields,
    ],
  },
  {
    key: 'research', label: 'Research', endpoint: 'research', titleField: 'title_en',
    fields: [
      { name: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { name: 'abstract_en', label: 'Abstract', type: 'textarea' },
      { name: 'authors', label: 'Authors (comma separated)', type: 'text' },
      {
        name: 'status', label: 'Status', type: 'select',
        options: ['ongoing', 'completed', 'published'].map((c) => ({ value: c, label: c })),
      },
      { name: 'year', label: 'Year', type: 'text' },
      { name: 'link', label: 'External link', type: 'url' },
      { name: 'file', label: 'Paper (optional)', type: 'file' },
      ...publishFields,
    ],
  },
  {
    key: 'testimonials', label: 'Testimonials', endpoint: 'testimonials', titleField: 'name_en',
    fields: [
      { name: 'name_en', label: 'Name (English)', type: 'text', required: true },
      { name: 'role_en', label: 'Role (e.g. Alumnus, CMT 2019)', type: 'text' },
      { name: 'quote_en', label: 'Quote (English)', type: 'textarea', required: true },
      { name: 'quote_bn', label: 'Quote (Bangla)', type: 'textarea' },
      { name: 'photo', label: 'Photo', type: 'image' },
      ...publishFields,
    ],
  },
  {
    key: 'faq', label: 'FAQ', endpoint: 'faq', titleField: 'question_en',
    fields: [
      { name: 'question_en', label: 'Question (English)', type: 'text', required: true },
      { name: 'question_bn', label: 'Question (Bangla)', type: 'text' },
      { name: 'answer_en', label: 'Answer (English)', type: 'textarea', required: true },
      { name: 'answer_bn', label: 'Answer (Bangla)', type: 'textarea' },
      ...publishFields,
    ],
  },
  {
    key: 'pages', label: 'Pages', endpoint: 'pages', titleField: 'key',
    fields: [
      { name: 'key', label: 'Key (privacy / terms / …)', type: 'text', required: true },
      { name: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { name: 'title_bn', label: 'Title (Bangla)', type: 'text' },
      { name: 'body_en', label: 'Body (English)', type: 'textarea' },
      { name: 'body_bn', label: 'Body (Bangla)', type: 'textarea' },
      { name: 'is_published', label: 'Published', type: 'checkbox' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function WebsiteManager() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Website Manager</h1>
          <p className="text-sm text-muted-foreground">
            Content for the public website (ac.spisg.gov.bd). Changes go live within a minute.
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="settings">Site Settings</TabsTrigger>
          {COLLECTIONS.map((c) => (
            <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="settings">
          <SettingsForm />
        </TabsContent>
        {COLLECTIONS.map((c) => (
          <TabsContent key={c.key} value={c.key}>
            <CrudSection collection={c} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Site settings form                                                  */
/* ------------------------------------------------------------------ */
const SETTINGS_FIELDS: { section: string; fields: Field[] }[] = [
  {
    section: 'About the Institute',
    fields: [
      { name: 'about_short_en', label: 'Short intro (home page)', type: 'textarea' },
      { name: 'about_full_en', label: 'Full about text', type: 'textarea' },
      { name: 'history_en', label: 'History', type: 'textarea' },
      { name: 'mission_en', label: 'Mission', type: 'textarea' },
      { name: 'vision_en', label: 'Vision', type: 'textarea' },
      { name: 'established_year', label: 'Established year', type: 'text' },
    ],
  },
  {
    section: "Principal's Message",
    fields: [
      { name: 'principal_name_en', label: 'Name', type: 'text' },
      { name: 'principal_designation_en', label: 'Designation', type: 'text' },
      { name: 'principal_message_en', label: 'Message', type: 'textarea' },
      { name: 'principal_photo', label: 'Photo', type: 'image' },
    ],
  },
  {
    section: 'Contact & Social',
    fields: [
      { name: 'contact_address_en', label: 'Address', type: 'textarea' },
      { name: 'contact_phone', label: 'Phone', type: 'text' },
      { name: 'contact_email', label: 'Email', type: 'email' },
      { name: 'map_embed_url', label: 'Google Maps embed URL', type: 'url' },
      { name: 'facebook_url', label: 'Facebook', type: 'url' },
      { name: 'youtube_url', label: 'YouTube', type: 'url' },
      { name: 'linkedin_url', label: 'LinkedIn', type: 'url' },
    ],
  },
  {
    section: 'Banners',
    fields: [
      { name: 'announcement_enabled', label: 'Show announcement bar', type: 'checkbox' },
      { name: 'announcement_en', label: 'Announcement text', type: 'text' },
      { name: 'announcement_link', label: 'Announcement link', type: 'url' },
      { name: 'emergency_notice_enabled', label: 'Show EMERGENCY notice', type: 'checkbox' },
      { name: 'emergency_notice_en', label: 'Emergency text', type: 'text' },
    ],
  },
];

function SettingsForm() {
  const { toast } = useToast();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get<Record<string, unknown>>('website/manage/settings/')
      .then(setData)
      .catch(() => toast({ title: 'Failed to load settings', variant: 'destructive' }));
  }, [toast]);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const fd = new FormData();
      for (const group of SETTINGS_FIELDS) {
        for (const f of group.fields) {
          if (f.type === 'image' || f.type === 'file') {
            if (files[f.name]) fd.append(f.name, files[f.name]);
          } else if (f.type === 'checkbox') {
            fd.append(f.name, data[f.name] ? 'true' : 'false');
          } else {
            fd.append(f.name, String(data[f.name] ?? ''));
          }
        }
      }
      const updated = await apiClient.patch<Record<string, unknown>>('website/manage/settings/', fd);
      setData(updated);
      setFiles({});
      toast({ title: 'Website settings saved' });
    } catch (e: unknown) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <Card><CardContent className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {SETTINGS_FIELDS.map((group) => (
        <Card key={group.section}>
          <CardHeader className="pb-3"><CardTitle className="text-base">{group.section}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((f) => (
              <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <FieldInput
                  field={f}
                  value={data[f.name]}
                  fileName={files[f.name]?.name}
                  onChange={(v) => setData((d) => ({ ...(d as object), [f.name]: v }))}
                  onFile={(file) => setFiles((prev) => ({ ...prev, [f.name]: file }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generic collection CRUD                                             */
/* ------------------------------------------------------------------ */
function CrudSection({ collection }: { collection: Collection }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [albumOptions, setAlbumOptions] = useState<{ value: string; label: string }[]>([]);

  const endpoint = `website/manage/${collection.endpoint}/`;

  const load = useMemo(
    () => async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<Record<string, unknown>[]>(endpoint);
        setRows(Array.isArray(res) ? res : []);
      } catch {
        toast({ title: `Failed to load ${collection.label}`, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    },
    [endpoint, collection.label, toast],
  );

  useEffect(() => { load(); }, [load]);

  // The gallery-photos tab needs the live album list for its select.
  useEffect(() => {
    if (collection.key !== 'images') return;
    apiClient.get<Record<string, unknown>[]>('website/manage/gallery-albums/').then((albums) => {
      setAlbumOptions((Array.isArray(albums) ? albums : []).map((a) => ({ value: String(a.id), label: String(a.title_en) })));
    }).catch(() => undefined);
  }, [collection.key, dialogOpen]);

  const fields = useMemo(
    () =>
      collection.fields.map((f) =>
        f.name === 'album' ? { ...f, options: albumOptions } : f,
      ),
    [collection.fields, albumOptions],
  );

  const remove = async (row: Record<string, unknown>) => {
    if (!window.confirm(`Delete "${String(row[collection.titleField] ?? row.id)}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`${endpoint}${row.id}/`);
      toast({ title: 'Deleted' });
      load();
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{collection.label}</CardTitle>
          <CardDescription>{rows.length} item{rows.length === 1 ? '' : 's'}</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nothing here yet — click “Add” to create the first entry.</p>
        ) : (
          <div className="divide-y divide-border rounded-md border">
            {rows.map((row) => (
              <div key={String(row.id)} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{String(row[collection.titleField] ?? '—')}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {'is_published' in row && (
                      <Badge variant={row.is_published ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px]">
                        {row.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    )}
                    {collection.extraColumns?.map((c) => (
                      <span key={c.label}>{c.label}: {c.render(row)}</span>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(row); setDialogOpen(true); }} aria-label="Edit">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(row)} aria-label="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <EntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        collection={collection}
        fields={fields}
        editing={editing}
        endpoint={endpoint}
        onSaved={() => { setDialogOpen(false); load(); }}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Create / edit dialog                                                */
/* ------------------------------------------------------------------ */
function EntryDialog({
  open, onClose, collection, fields, editing, endpoint, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  collection: Collection;
  fields: Field[];
  editing: Record<string, unknown> | null;
  endpoint: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === 'file' || f.type === 'image') continue;
      const v = editing?.[f.name];
      if (f.type === 'checkbox') initial[f.name] = v ?? (f.name === 'is_published');
      else if (f.type === 'datetime' && typeof v === 'string') initial[f.name] = v.slice(0, 16);
      else initial[f.name] = v ?? (f.type === 'number' ? 0 : '');
    }
    setForm(initial);
    setFiles({});
  }, [open, editing, fields]);

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      for (const f of fields) {
        if (f.type === 'file' || f.type === 'image') {
          if (files[f.name]) fd.append(f.name, files[f.name]);
          continue;
        }
        const v = form[f.name];
        if (f.type === 'checkbox') fd.append(f.name, v ? 'true' : 'false');
        else if ((f.type === 'datetime' || f.type === 'date') && !v) continue; // omit empty dates
        else fd.append(f.name, String(v ?? ''));
      }
      if (editing) {
        await apiClient.patch(`${endpoint}${editing.id}/`, fd);
      } else {
        await apiClient.post(endpoint, fd);
      }
      toast({ title: editing ? 'Updated' : 'Created' });
      onSaved();
    } catch (e: unknown) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : 'Check required fields.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit' : 'Add'} — {collection.label}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {fields.map((f) => (
            <FieldInput
              key={f.name}
              field={f}
              value={form[f.name]}
              fileName={files[f.name]?.name}
              currentFileUrl={editing ? (editing[f.name] as string | undefined) : undefined}
              onChange={(v) => setForm((prev) => ({ ...prev, [f.name]: v }))}
              onFile={(file) => setFiles((prev) => ({ ...prev, [f.name]: file }))}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* One schema-driven input                                             */
/* ------------------------------------------------------------------ */
function FieldInput({
  field, value, onChange, onFile, fileName, currentFileUrl,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  onFile: (f: File) => void;
  fileName?: string;
  currentFileUrl?: string;
}) {
  const id = `wm-${field.name}`;

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
        <Label htmlFor={id} className="text-sm">{field.label}</Label>
        <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </Label>
      {field.type === 'textarea' ? (
        <Textarea id={id} rows={4} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'select' ? (
        <select
          id={id}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— select —</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : field.type === 'file' || field.type === 'image' ? (
        <div className="space-y-1">
          <Input
            id={id}
            type="file"
            accept={field.type === 'image' ? 'image/*' : undefined}
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {fileName ? (
            <p className="text-xs text-muted-foreground">Selected: {fileName}</p>
          ) : currentFileUrl ? (
            <p className="truncate text-xs text-muted-foreground">Current: {String(currentFileUrl).split('/').pop()}</p>
          ) : null}
        </div>
      ) : (
        <Input
          id={id}
          type={field.type === 'datetime' ? 'datetime-local' : field.type}
          value={String(value ?? '')}
          onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
        />
      )}
      {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
    </div>
  );
}
