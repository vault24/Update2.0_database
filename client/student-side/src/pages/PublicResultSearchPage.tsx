/**
 * Public Result Search — anyone can look up a BTEB roll number, no login.
 *
 * Serves the whole imported national dataset: every institute in every
 * imported official BTEB result PDF. Mobile-first (the student portal is an
 * installable PWA and this page is a likely entry point from search/shares).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ResultHistory } from '@/components/results/ResultHistory';
import resultService, { RollSearchResponse } from '@/services/resultService';

export default function PublicResultSearchPage() {
  const [roll, setRoll] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<RollSearchResponse | null>(null);

  const search = async () => {
    const trimmed = roll.trim();
    if (!/^\d{4,10}$/.test(trimmed)) {
      setError('Enter a valid numeric board roll number.');
      return;
    }
    setError('');
    setSearching(true);
    try {
      setData(await resultService.searchRoll(trimmed));
    } catch {
      setError('Search is temporarily unavailable. Please try again in a minute.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/30">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">BTEB Result Search</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Enter your board roll number to see your complete Diploma result
            history — every semester, GPA, CGPA and referred subjects.
          </p>
        </div>

        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={roll}
                onChange={(event) => setRoll(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && search()}
                placeholder="Board roll number, e.g. 612120"
                inputMode="numeric"
                className="h-11 text-base"
                aria-label="Board roll number"
              />
              <Button onClick={search} disabled={searching} className="h-11 sm:px-6">
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-1.5">Search</span>
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>

        {data && <ResultHistory data={data} />}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Results are imported from official BTEB result notices. For
          corrections contact your institute.{' '}
          <Link to="/" className="text-emerald-600 hover:underline">
            Student portal
          </Link>
        </p>
      </div>
    </div>
  );
}
