import { Link } from "react-router-dom";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container>
      <div className="flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
        <p className="heading-serif text-8xl font-bold text-primary/20">404</p>
        <h1 className="heading-serif mt-2 text-3xl text-foreground">Page not found</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The page you are looking for doesn't exist or has moved.
        </p>
        <Link to="/" className="mt-8">
          <Button variant="primary">Back to Home</Button>
        </Link>
      </div>
    </Container>
  );
}
