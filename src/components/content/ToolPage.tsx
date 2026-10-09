import type { Metadata } from "next";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata, webAppJsonLd } from "@/lib/seo";
import { toolById, type ToolId } from "@/lib/tools";
import { TOOL_CONTENT } from "@/content/tool-content";
import { guidesForTool } from "@/content/guides/meta";
import { JsonLd } from "@/components/JsonLd";
import { Prose } from "@/components/Prose";
import { FaqList, GuideCards, SectionHeading, Steps, ToolCards } from "./ContentBlocks";

export function toolMetadata(id: ToolId): Metadata {
  const t = toolById(id);
  return pageMetadata({ title: t.seoTitle, description: t.description, path: t.href, og: id });
}

/** A tool page: the interactive tool, then server-rendered guidance, FAQs and links. */
export function ToolPage({ id, children }: { id: ToolId; children: React.ReactNode }) {
  const t = toolById(id);
  const c = TOOL_CONTENT[id];
  const guides = guidesForTool(id);
  return (
    <>
      {children}
      <JsonLd
        data={[
          webAppJsonLd({ name: `Exifo ${t.label}`, path: t.href, description: t.description, features: c.features }),
          breadcrumbJsonLd([
            { name: "Exifo", path: "/" },
            { name: t.label, path: t.href },
          ]),
          faqJsonLd(c.faqs),
        ]}
      />
      <article aria-labelledby="about-tool" className="mt-8 flex flex-col gap-12 border-t border-line pt-10">
        <section className="flex flex-col gap-4">
          <SectionHeading id="about-tool">{c.heading}</SectionHeading>
          <Prose>
            {c.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </Prose>
        </section>

        <section className="flex flex-col gap-5">
          <SectionHeading>{c.stepsHeading}</SectionHeading>
          <Steps steps={c.steps} />
        </section>

        {c.sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-4">
            <SectionHeading>{s.heading}</SectionHeading>
            <Prose>{s.body}</Prose>
          </section>
        ))}

        <section className="flex flex-col gap-5">
          <SectionHeading>Questions about {t.label}</SectionHeading>
          <FaqList faqs={c.faqs} />
        </section>

        {guides.length > 0 && (
          <section className="flex flex-col gap-5">
            <SectionHeading>Guides</SectionHeading>
            <GuideCards guides={guides} />
          </section>
        )}

        <section className="flex flex-col gap-5">
          <SectionHeading>Related tools</SectionHeading>
          <ToolCards ids={c.related} />
        </section>
      </article>
    </>
  );
}
