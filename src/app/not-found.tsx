import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Container, PageIntro } from "@/components/site/Container";
import { ToolCards } from "@/components/content/ContentBlocks";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Container className="flex flex-col gap-10 py-14">
          <PageIntro eyebrow="404" title="Page not found" lead="This page does not exist. Your files are still on your device." />
          <div className="flex flex-wrap gap-3">
            <Link href="/" className={buttonVariants({ variant: "primary", className: "no-underline hover:text-primary-fg" })}>
              Go to the home page
            </Link>
            <Link href="/clean/" className={buttonVariants({ variant: "secondary", className: "no-underline hover:text-ink" })}>
              Clean images
            </Link>
          </div>
          <ToolCards ids={["clean", "inspect", "check", "compress", "convert", "resize"]} />
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
