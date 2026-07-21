import { Link } from "react-router-dom";
import { Hammer, ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

/**
 * Placeholder for pages arriving in later phases, so the full navigation IA is
 * present from day one without dead links. Each page will replace this stub.
 */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <Container>
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Hammer className="h-8 w-8" />
        </span>
        <h1 className="heading-serif mt-6 text-3xl text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          This section is being crafted and will be available soon. Meanwhile, explore the rest of the site.
        </p>
        <Link to="/" className="mt-8">
          <Button variant="primary"><ArrowLeft className="h-4 w-4" /> Back to Home</Button>
        </Link>
      </div>
    </Container>
  );
}
