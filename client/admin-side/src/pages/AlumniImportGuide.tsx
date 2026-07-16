import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet, Copy, Check, ArrowLeft, Search, AlertTriangle, CheckCircle2,
  Link2, Upload, Eye, ListChecks, Loader2, Building2, Info, XCircle, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { alumniService, type ImportSchema } from '@/services/alumniService';
import departmentService, { type Department } from '@/services/departmentService';

/**
 * Alumni Import Guide (Bangla) — the how-to for the Import feature.
 *
 * The field table is rendered from the server's import schema
 * (apps/alumni/import_config.py), never hardcoded, so the guide cannot drift
 * from what the importer actually accepts. Departments are fetched live for
 * the same reason: the acceptable values ARE whatever is in the database.
 */

/** Ordered walkthrough shown at the top of the page. */
const STEPS = [
  {
    icon: ListChecks,
    title: 'কলাম হেডার ঠিক করুন',
    body: 'নিচের “কলাম টেমপ্লেট কপি করুন” বাটনে ক্লিক করে Excel-এর ১ নম্বর সারিতে (header row) পেস্ট করুন। যেসব তথ্য আপনার কাছে নেই, সেই কলামগুলো মুছে ফেলতে পারেন — শুধু Name আর Department থাকা বাধ্যতামূলক।',
  },
  {
    icon: FileSpreadsheet,
    title: 'তথ্য পূরণ করুন',
    body: 'প্রতিটি সারিতে একজন অ্যালামনাইয়ের তথ্য লিখুন। তারিখ, সেশন ও ক্যাটাগরি কলামগুলোর ফরম্যাট নিচের নিয়ম অনুযায়ী দিন।',
  },
  {
    icon: Upload,
    title: 'ফাইল আপলোড করুন',
    body: 'Alumni Requests পেজে “Import” বাটনে ক্লিক করে .xlsx / .csv ফাইল আপলোড করুন, অথবা Google Sheet-এর লিংক দিন।',
  },
  {
    icon: Eye,
    title: 'প্রিভিউ দেখে নিশ্চিত করুন',
    body: 'ইম্পোর্টের আগে সিস্টেম দেখাবে কোন কলাম কোথায় ম্যাচ করেছে, কতটি সারি পাওয়া গেছে এবং কোন সারিতে সমস্যা আছে। সব ঠিক থাকলে Import চাপুন।',
  },
];

/** Format/category rules that admins get wrong most often. */
const FORMAT_RULES = [
  {
    label: 'Session (সেশন)',
    accepted: '2022-23',
    wrong: '2022-2023, 2022/23',
    note: 'দুই সংখ্যার শেষ অংশসহ হাইফেন দিয়ে লিখুন।',
  },
  {
    label: 'Shift (শিফট)',
    accepted: 'Morning · Day · Evening',
    wrong: '1st shift, সকাল',
    note: 'Morning = ১ম শিফট, Day = ২য় শিফট।',
  },
  {
    label: 'Date of Birth (জন্ম তারিখ)',
    accepted: '1998-05-21',
    wrong: '21 May 98',
    note: '21/05/1998 বা 21-05-1998 এবং Excel-এর আসল date সেলও চলবে।',
  },
  {
    label: 'Gender (লিঙ্গ)',
    accepted: 'Male · Female · Other',
    wrong: 'M, F, পুরুষ',
    note: 'ছোট হাতের male / female লিখলেও গ্রহণ করা হবে।',
  },
  {
    label: 'Graduation Year (পাসের সাল)',
    accepted: '2023',
    wrong: '২০২৩, 2023 সাল',
    note: 'শুধু ইংরেজি চার সংখ্যার সাল।',
  },
  {
    label: 'CGPA / GPA',
    accepted: '3.75',
    wrong: '0.75/4.00',
    note: '০.০০ – ৫.০০ এর মধ্যে শুধু সংখ্যা।',
  },
  {
    label: 'Mobile (মোবাইল)',
    accepted: '01712345678',
    wrong: '+8801712345678',
    note: '১১ ডিজিট, দেশের কোড ছাড়া।',
  },
  {
    label: 'Alumni Type',
    accepted: 'recent · established',
    wrong: 'নতুন, পুরাতন',
    note: 'না দিলে established ধরা হবে।',
  },
];

function SectionHeading({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function AlumniImportGuide() {
  const navigate = useNavigate();
  const [schema, setSchema] = useState<ImportSchema | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    alumniService.getImportSchema().then(setSchema).catch(() => setSchema(null));
    departmentService
      .getDepartments({ page_size: 100 })
      .then((res) => setDepartments(res.results || []))
      .catch(() => setDepartments([]));
  }, []);

  const copyTemplate = async () => {
    if (!schema) return;
    try {
      // Tab-separated: pastes straight across Excel's header row.
      await navigator.clipboard.writeText(schema.columnTemplate.join('\t'));
      setCopied(true);
      toast.success('কলাম টেমপ্লেট কপি হয়েছে', {
        description: 'Excel-এর ১ নম্বর সারিতে পেস্ট করুন।',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('ক্লিপবোর্ড ব্যবহার করা যায়নি');
    }
  };

  const groups = useMemo(() => {
    if (!schema) return [];
    const term = query.trim().toLowerCase();
    const match = (f: ImportSchema['fields'][number]) =>
      !term ||
      f.label.toLowerCase().includes(term) ||
      f.recommended.toLowerCase().includes(term) ||
      f.aliases.some((a) => a.toLowerCase().includes(term));

    const byGroup = new Map<string, ImportSchema['fields']>();
    schema.fields.filter(match).forEach((f) => {
      const list = byGroup.get(f.group) || [];
      list.push(f);
      byGroup.set(f.group, list);
    });
    return [...byGroup.entries()];
  }, [schema, query]);

  const requiredFields = schema?.fields.filter((f) => f.required) ?? [];

  return (
    <div className="space-y-6 pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white md:p-8">
        <FileSpreadsheet className="absolute -right-6 -top-6 h-40 w-40 opacity-10" />
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/alumni-requests')}
            className="mb-4 border-0 bg-white/15 text-white hover:bg-white/25"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Alumni Requests এ ফিরে যান
          </Button>
          <h1 className="text-2xl font-bold md:text-3xl">অ্যালামনাই ইম্পোর্ট গাইড</h1>
          <p className="mt-1 max-w-2xl text-white/85">
            Excel, CSV বা Google Sheet থেকে একসাথে অনেক অ্যালামনাইয়ের তথ্য যোগ করার নিয়ম।
            কোন কলামের নাম কী দিতে হবে, কোন মান গ্রহণযোগ্য — সব এখানে উদাহরণসহ দেওয়া আছে।
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={copyTemplate} disabled={!schema} className="gap-2 bg-white text-emerald-700 hover:bg-white/90">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              কলাম টেমপ্লেট কপি করুন
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/alumni-requests')}
              className="gap-2 border-0 bg-white/15 text-white hover:bg-white/25"
            >
              <Upload className="h-4 w-4" /> ইম্পোর্ট শুরু করুন
            </Button>
          </div>
        </div>
      </div>

      {/* Required-fields callout */}
      <Card className="border-l-4 border-l-warning">
        <CardContent className="p-5">
          <SectionHeading
            icon={AlertTriangle}
            title="যে দুটি কলাম অবশ্যই লাগবে"
            subtitle="বাকি সব কলাম ঐচ্ছিক — না থাকলেও ইম্পোর্ট কাজ করবে।"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {requiredFields.map((f) => (
              <div key={f.key} className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-warning/15 px-2 py-0.5 font-mono text-sm font-bold text-warning-foreground">
                    {f.recommended}
                  </code>
                  <Badge variant="outline" className="border-destructive/30 text-destructive">আবশ্যক</Badge>
                </div>
                {f.noteBn && <p className="mt-2 text-sm text-muted-foreground">{f.noteBn}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  উদাহরণ: <span className="font-medium text-foreground">{f.example}</span>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              কোনো সারিতে Name বা Department খালি থাকলে শুধু ঐ সারিটি বাদ পড়বে — বাকি সারিগুলো
              ঠিকভাবে ইম্পোর্ট হবে, এবং কোন সারিতে কী সমস্যা তা রিপোর্টে দেখানো হবে।
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardContent className="p-5">
          <SectionHeading icon={ListChecks} title="ধাপে ধাপে নিয়ম" />
          <ol className="grid gap-3 md:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3 rounded-xl border border-border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <div>
                  <p className="flex items-center gap-1.5 font-semibold">
                    <step.icon className="h-4 w-4 text-primary" /> {step.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Departments (live from the database) */}
      <Card>
        <CardContent className="p-5">
          <SectionHeading
            icon={Building2}
            title="Department কলামে যা লিখতে পারবেন"
            subtitle="পুরো নাম অথবা কোড — যেকোনো একটি দিলেই হবে।"
          />
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> বিভাগের তালিকা লোড হচ্ছে…
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">পুরো নাম (গ্রহণযোগ্য)</th>
                    <th className="py-2">কোড (গ্রহণযোগ্য)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 pr-4 font-medium">{d.name}</td>
                      <td className="py-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{d.code}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            এই তালিকার বাইরের কোনো নাম দিলে ঐ সারিতে “does not match any department” ত্রুটি দেখাবে।
          </p>
        </CardContent>
      </Card>

      {/* Format rules */}
      <Card>
        <CardContent className="p-5">
          <SectionHeading
            icon={CheckCircle2}
            title="ফরম্যাট ও ক্যাটাগরির নিয়ম"
            subtitle="এই কলামগুলোতে ভুল ফরম্যাট দিলে সারিটি বাদ পড়বে।"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {FORMAT_RULES.map((rule) => (
              <div key={rule.label} className="rounded-xl border border-border p-3">
                <p className="font-semibold">{rule.label}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="font-mono text-success">{rule.accepted}</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <span className="font-mono text-muted-foreground line-through">{rule.wrong}</span>
                  </p>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{rule.note}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Example sheet */}
      <Card>
        <CardContent className="p-5">
          <SectionHeading
            icon={FileSpreadsheet}
            title="উদাহরণ: একটি সঠিক শিট"
            subtitle="কলামের নাম হুবহু এক না হলেও চলবে — নিচের “বিকল্প নাম” দেখুন।"
          />
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="bg-muted/60">
                <tr className="text-left">
                  {['Name', 'Department', 'Session', 'Graduation Year', 'Mobile', 'Company', 'Position'].map((h) => (
                    <th key={h} className="px-3 py-2 font-mono text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2">Md Mahadi Hasan</td>
                  <td className="px-3 py-2">Computer Science &amp; Technology</td>
                  <td className="px-3 py-2">2019-20</td>
                  <td className="px-3 py-2">2023</td>
                  <td className="px-3 py-2">01712345678</td>
                  <td className="px-3 py-2">Acme Ltd</td>
                  <td className="px-3 py-2">Software Engineer</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Zunaiyed Hafiz</td>
                  <td className="px-3 py-2">CST</td>
                  <td className="px-3 py-2">2020-21</td>
                  <td className="px-3 py-2">2024</td>
                  <td className="px-3 py-2">01812345678</td>
                  <td className="px-3 py-2">Beta Inc</td>
                  <td className="px-3 py-2">Data Analyst</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <span>
              লক্ষ্য করুন: প্রথম সারিতে বিভাগের পুরো নাম, দ্বিতীয় সারিতে কোড (CST) — দুটোই কাজ করে।
              Company ও Position কলাম দুটি Alumni টেবিলে, বাকিগুলো Student টেবিলে সংরক্ষিত হয়।
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Google Sheets */}
      <Card>
        <CardContent className="p-5">
          <SectionHeading icon={Link2} title="Google Sheet থেকে ইম্পোর্ট" />
          <ol className="ml-5 list-decimal space-y-1.5 text-sm text-muted-foreground">
            <li>Google Sheet খুলে ডান পাশে <strong className="text-foreground">Share</strong> বাটনে ক্লিক করুন।</li>
            <li>
              General access এ <strong className="text-foreground">“Anyone with the link”</strong> এবং
              ভিউয়ার (Viewer) সিলেক্ট করুন।
            </li>
            <li>ব্রাউজারের অ্যাড্রেস বার থেকে লিংকটি কপি করে Import ডায়ালগের “Google Sheet” ট্যাবে পেস্ট করুন।</li>
          </ol>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              শিট পাবলিক না করলে Google আমাদের সার্ভারকে ডেটা দেবে না — তখন “sheet is probably not
              shared publicly” বার্তা দেখাবে। শুধু প্রথম ট্যাব (first sheet) পড়া হয়।
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Full column reference (generated from the server schema) */}
      <Card>
        <CardContent className="p-5">
          <SectionHeading
            icon={BookOpen}
            title="সব কলামের তালিকা"
            subtitle="প্রস্তাবিত নাম, বিকল্প নাম (alias) ও উদাহরণ। কলামের নাম ইংরেজিতেই লিখতে হবে।"
          />
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ফিল্ড বা কলামের নাম খুঁজুন…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {!schema ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map(([group, fields]) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group === 'Alumni record' ? 'Alumni টেবিলে সংরক্ষিত হয়' : 'Student টেবিলে সংরক্ষিত হয়'}
                    <span className="ml-1 font-normal normal-case">({fields.length}টি কলাম)</span>
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr className="text-left text-xs uppercase text-muted-foreground">
                          <th className="px-3 py-2">ফিল্ড</th>
                          <th className="px-3 py-2">প্রস্তাবিত কলাম</th>
                          <th className="px-3 py-2">বিকল্প নাম</th>
                          <th className="px-3 py-2">উদাহরণ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {fields.map((f) => (
                          <tr key={f.key} className={cn(f.required && 'bg-warning/5')}>
                            <td className="px-3 py-2 align-top">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">{f.label}</span>
                                {f.required && (
                                  <Badge variant="outline" className="border-destructive/30 text-[10px] text-destructive">
                                    আবশ্যক
                                  </Badge>
                                )}
                              </div>
                              {f.noteBn && <p className="mt-0.5 text-xs text-muted-foreground">{f.noteBn}</p>}
                              {f.choices.length > 0 && (
                                <p className="mt-0.5 text-xs">
                                  <span className="text-muted-foreground">গ্রহণযোগ্য: </span>
                                  <span className="font-mono text-primary">{f.choices.join(' · ')}</span>
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                                {f.recommended}
                              </code>
                            </td>
                            <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                              {f.aliases.length ? f.aliases.join(', ') : '—'}
                            </td>
                            <td className="px-3 py-2 align-top text-xs">{f.example || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  “{query}” এর সাথে মিলে এমন কোনো ফিল্ড নেই।
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardContent className="p-5">
          <SectionHeading icon={Info} title="সাধারণ প্রশ্ন" />
          <div className="space-y-3 text-sm">
            {[
              {
                q: 'আমার শিটে বাড়তি কলাম আছে যেগুলো সিস্টেমে নেই — সমস্যা হবে?',
                a: 'না। অচেনা কলাম নিরাপদে উপেক্ষা করা হয় এবং প্রিভিউতে দেখিয়ে দেওয়া হয় কোনগুলো বাদ পড়ল।',
              },
              {
                q: 'একই রোল নম্বর দুইবার থাকলে কী হবে?',
                a: 'আগে থেকে থাকা বা ফাইলের ভেতরে ডুপ্লিকেট রোল/রেজিস্ট্রেশন পেলে ঐ সারিটি Skip করা হয় — ডুপ্লিকেট রেকর্ড তৈরি হয় না।',
              },
              {
                q: 'Roll বা Registration কলাম না দিলে?',
                a: 'সিস্টেম স্বয়ংক্রিয়ভাবে একটি ইউনিক রোল ও রেজিস্ট্রেশন তৈরি করে দেবে।',
              },
              {
                q: 'ইম্পোর্ট করলে কি Student টেবিলের তথ্যও যোগ হয়?',
                a: 'হ্যাঁ। বাবার নাম, ঠিকানা, বোর্ড রোলের মতো কলামগুলো Student রেকর্ডে এবং Graduation Year, Company, Position ইত্যাদি Alumni রেকর্ডে — একই ইম্পোর্টেই দুই টেবিলে সংরক্ষিত হয়।',
              },
              {
                q: 'কিছু সারিতে ভুল থাকলে পুরো ইম্পোর্ট বাতিল হবে?',
                a: 'না। শুধু ভুল সারিগুলো বাদ যাবে, বাকিগুলো ইম্পোর্ট হবে। শেষে কোন সারিতে কী সমস্যা তা নম্বরসহ দেখানো হবে।',
              },
            ].map((item) => (
              <div key={item.q} className="rounded-xl border border-border p-3">
                <p className="font-semibold text-foreground">{item.q}</p>
                <p className="mt-1 text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={() => navigate('/alumni-requests')} className="gradient-primary gap-2 text-primary-foreground">
          <Upload className="h-4 w-4" /> ইম্পোর্ট পেজে যান
        </Button>
      </div>
    </div>
  );
}
