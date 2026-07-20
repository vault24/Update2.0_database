/**
 * Rotating motivational quote card for the Board Results page.
 *
 * Passed students see the "strive" verse; referred students additionally see
 * the "change yourselves" verse first — encouragement, not judgement. Slides
 * auto-rotate with a soft fade and can be switched with the dots.
 */
import { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';

export interface MotivationQuote {
  bangla: string;
  english: string;
  reference: string;
}

export const QUOTE_STRIVE: MotivationQuote = {
  bangla: 'মানুষ তাই পায়, যার জন্য সে চেষ্টা করে।',
  english: 'And that there is not for man except that for which he strives.',
  reference: 'Surah An-Najm (53:39)',
};

export const QUOTE_CHANGE: MotivationQuote = {
  bangla:
    'নিশ্চয়ই আল্লাহ কোনো জাতির অবস্থা পরিবর্তন করেন না, যতক্ষণ না তারা নিজেরা নিজেদের অবস্থা পরিবর্তন করে।',
  english:
    'Indeed, Allah will not change the condition of a people until they change what is within themselves.',
  reference: 'Surah Ar-Ra‘d (13:11)',
};

const ROTATE_MS = 8000;

export function MotivationSlide({ quotes }: { quotes: MotivationQuote[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (quotes.length <= 1) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % quotes.length),
      ROTATE_MS,
    );
    return () => clearInterval(timer);
  }, [quotes.length]);

  if (quotes.length === 0) return null;
  const quote = quotes[Math.min(index, quotes.length - 1)];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50/60 p-5 dark:border-amber-800/40 dark:from-amber-950/40 dark:to-orange-950/20">
      <Quote className="absolute -right-2 -top-2 h-16 w-16 rotate-12 text-amber-200/60 dark:text-amber-800/30" />
      {/* key= re-mounts on change so the fade-in animation replays */}
      <div key={index} className="animate-in fade-in space-y-2 duration-700">
        <p className="text-base font-semibold leading-relaxed text-amber-900 dark:text-amber-100">
          {quote.bangla}
        </p>
        <p className="text-sm italic text-amber-800/90 dark:text-amber-200/80">
          “{quote.english}”
        </p>
        <p className="text-xs font-medium text-amber-700/80 dark:text-amber-300/70">
          — {quote.reference}
        </p>
      </div>
      {quotes.length > 1 && (
        <div className="mt-3 flex gap-1.5">
          {quotes.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              aria-label={`Show quote ${dotIndex + 1}`}
              onClick={() => setIndex(dotIndex)}
              className={`h-1.5 rounded-full transition-all ${
                dotIndex === index
                  ? 'w-5 bg-amber-500'
                  : 'w-1.5 bg-amber-300/70 hover:bg-amber-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
